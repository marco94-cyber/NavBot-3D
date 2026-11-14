"""Server-authoritative warehouse simulation. Python owns ALL decisions and routes.

The browser is only a visualization and command client. No browser-side pathfinder.
Movement is discrete with an interpolated progress fraction for smooth rendering.
"""
import copy
import threading
from core.grid import Grid, ZONES, manhattan, key
from algorithms import find_path, benchmark

COLORS = [0x4de1ed, 0xffbc65, 0xa798ff]
STARTS = [(-14, -2), (14, 2), (0, 13)]
CHARGERS = [ZONES['Charger A'], ZONES['Charger B']]
PRIORITIES = {'urgent': 0, 'high': 1, 'normal': 2}
MODES_MOVING = {'pickup', 'delivery', 'to-charge', 'yielding'}


class Simulation:
    def __init__(self):
        self.lock = threading.RLock()
        self.reset()

    def reset(self):
        with self.lock:
            self.map = Grid()
            self.robots = [dict(id=f'R-{i+1:02}', x=x, z=z, color=COLORS[i], battery=100.0,
                                mode='idle', task=None, route=[], routeIndex=0, progress=0.0,
                                speed=2.1, carrying=False, chargeTarget=None, chargeTime=0,
                                travelled=0.0, replans=0, waitTime=0, trafficYield=None,
                                search=None) for i, (x, z) in enumerate(STARTS)]
            self.tasks = []
            self.next_task_id = 1
            self.algorithm = 'astar'
            self.running = False
            self.speed = 1
            self.time = 0.0
            self.latestSearch = None
            self.latestBenchmark = None
            self.metrics = dict(totalDistance=0, replans=0, collisionsAvoided=0)
            self.visits = {}
            self.history = []
            self.lastRecording = 0
            self.events = []
            self.trafficDecisions = 0
            self.forklift = dict(enabled=False, x=0, z=-13, direction=1, nextMove=0)
            self.event('system', 'Python simulation initialized')

    def event(self, typ, message):
        self.events.insert(0, dict(type=typ, message=message, seconds=round(self.time, 2)))
        self.events = self.events[:90]

    def robot_at(self, cell, exclude=None):
        return next((r for r in self.robots if r['id'] != exclude and (r['x'], r['z']) == cell), None)

    @staticmethod
    def position(r):
        return (r['x'], r['z'])

    def target(self, robot):
        if robot['mode'] == 'to-charge': return tuple(robot['chargeTarget'])
        if robot['task']:
            t = robot['task']
            return tuple(t['pickup'] if t['stage'] == 'pickup' else t['delivery'])
        return None

    def plan(self, robot, avoid_robots=False):
        target = self.target(robot)
        if target is None: return False
        extra = {self.position(other) for other in self.robots if other is not robot and self.position(other) != target} if avoid_robots else ()
        mode = 'astar' if robot['mode'] == 'to-charge' else self.algorithm
        result = find_path(self.map, self.position(robot), target, mode, extra)
        self.latestSearch = result
        robot['search'] = result
        if not result['found']:
            robot['mode'] = 'blocked'
            robot['route'] = []
            self.event('warning', f"{robot['id']} route blocked")
            return False
        robot['route'] = result['path']
        robot['routeIndex'] = 0
        robot['progress'] = 0
        robot['replans'] += 1
        self.metrics['replans'] += 1
        return True

    def set_algorithm(self, value):
        if value not in ('astar', 'bfs', 'dfs', 'greedy'):
            raise ValueError('Unknown algorithm')
        self.algorithm = value
        for r in self.robots:
            if r['mode'] in ('pickup', 'delivery', 'to-charge'):
                self.plan(r)
        self.event('ai', f'Python algorithm selected: {value.upper()}')

    def add_task(self, pickup, delivery, priority='normal'):
        if priority not in PRIORITIES: raise ValueError('Invalid task priority')
        a, b = tuple(map(round, pickup)), tuple(map(round, delivery))
        if self.map.blocked(a) or self.map.blocked(b): raise ValueError('Pickup or delivery zone is blocked')
        if a == b: raise ValueError('Pickup and delivery cannot be the same')
        task = dict(id=f'T-{self.next_task_id:03}', pickup=list(a), delivery=list(b), priority=priority,
                    status='pending', createdAt=self.time, robotId=None, stage='pickup', pickups=0, completedAt=None)
        self.next_task_id += 1
        self.tasks.append(task)
        self.event('task', f"{task['id']} created ({priority})")
        if priority == 'urgent' and not any(r['mode'] == 'idle' and r['battery'] >= 22 for r in self.robots):
            # Do not interrupt a robot that is carrying a package.
            candidates = [r for r in self.robots if r['task'] and r['task']['stage'] == 'pickup'
                          and not r['carrying'] and PRIORITIES[r['task']['priority']] > PRIORITIES['urgent']]
            candidates.sort(key=lambda r: (manhattan(self.position(r), a), r['id']))
            if candidates:
                robot = candidates[0]
                interrupted = robot['task']
                interrupted['status'] = 'pending'
                interrupted['robotId'] = None
                robot['task'] = None
                robot['mode'] = 'idle'
                robot['route'] = []
                robot['routeIndex'] = 0
                robot['progress'] = 0
                self.event('task', f"{interrupted['id']} queued for urgent task")
        self.assign_tasks()
        return task

    def assign_tasks(self):
        available = [r for r in self.robots if r['mode'] == 'idle' and not r['task'] and r['battery'] >= 22]
        pending = sorted((t for t in self.tasks if t['status'] == 'pending'),
                         key=lambda t: (PRIORITIES[t['priority']], t['createdAt'], t['id']))
        for task in pending:
            if not available: break
            options = []
            for r in available:
                p = find_path(self.map, self.position(r), task['pickup'], self.algorithm)
                if p['found']: options.append((p['cost'], -r['battery'], r['id'], r))
            if not options: continue
            _, _, _, r = min(options, key=lambda x: x[:3])
            available.remove(r)
            r['task'] = task
            task['status'] = 'active'
            task['robotId'] = r['id']
            r['mode'] = 'pickup'
            self.plan(r)
            self.event('task', f"{task['id']} assigned to {r['id']}")

    def charging_station(self, robot):
        return min(CHARGERS, key=lambda p: manhattan(self.position(robot), p))

    def send_to_charge(self, robot):
        if robot['task'] and not robot['carrying']:
            robot['task']['status'] = 'pending'
            robot['task']['robotId'] = None
            robot['task'] = None
        robot['mode'] = 'to-charge'
        robot['chargeTarget'] = list(self.charging_station(robot))
        if self.plan(robot): self.event('battery', f"{robot['id']} going to charger")

    def reached(self, robot):
        mode = robot['mode']
        if mode == 'yielding':
            robot['mode'] = 'parked'
            robot['route'] = []
            robot['progress'] = 0
            if robot['trafficYield']:
                robot['trafficYield']['parkedUntil'] = self.time + 2
            self.event('traffic', f"{robot['id']} pulled over")
            return
        if mode == 'to-charge':
            robot['mode'] = 'charging'
            robot['route'] = []
            robot['progress'] = 0
            self.event('battery', f"{robot['id']} charging")
            return
        task = robot['task']
        if not task:
            robot['mode'] = 'idle'
            return
        if task['stage'] == 'pickup':
            robot['carrying'] = True
            task['stage'] = 'delivery'
            task['pickups'] += 1
            robot['mode'] = 'delivery'
            self.event('task', f"{robot['id']} collected {task['id']}")
            self.plan(robot)
        else:
            task['status'] = 'completed'
            task['completedAt'] = self.time
            robot['task'] = None
            robot['carrying'] = False
            robot['mode'] = 'idle'
            robot['route'] = []
            robot['progress'] = 0
            self.event('task', f"{robot['id']} delivered {task['id']}")

    def pullout_path(self, robot, blocker):
        """Find reachable side bay, avoiding robots and the oncoming robot's near path."""
        from collections import deque
        start = self.position(robot)
        banned = {self.position(r) for r in self.robots if r is not robot}
        reserved = set()
        if blocker:
            reserved.add(self.position(blocker))
            reserved.update((p['x'], p['z']) for p in blocker['route'][blocker['routeIndex']:blocker['routeIndex']+10])
        queue = deque([start])
        seen = {start}
        parent = {}
        while queue:
            node = queue.popleft()
            distance = manhattan(start, node)
            if distance > 10: break
            if distance > 0 and node not in reserved and len(self.map.neighbors(node)) >= 3 and all(manhattan(node, self.position(r)) >= 2 for r in self.robots if r is not robot):
                path = [node]
                while node in parent:
                    node = parent[node]
                    path.append(node)
                return list(reversed(path))
            for nex in self.map.neighbors(node, banned):
                if nex not in seen:
                    seen.add(nex)
                    parent[nex] = node
                    queue.append(nex)
        return None

    def yield_robot(self, robot, blocker):
        if robot['trafficYield'] or robot['mode'] in ('charging','to-charge','yielding','parked'):
            return False
        path = self.pullout_path(robot, blocker)
        if not path or len(path) <= 1: return False
        robot['trafficYield'] = dict(previousMode=robot['mode'], blockerId=blocker['id'] if blocker else None,
                                     parkedUntil=0, started=self.time)
        robot['mode'] = 'yielding'
        robot['route'] = [{'x':x,'z':z} for x,z in path]
        robot['routeIndex'] = 0
        robot['progress'] = 0
        robot['waitTime'] = 0
        self.trafficDecisions += 1
        self.event('traffic', f"{robot['id']} yielding to {blocker['id'] if blocker else 'traffic'}")
        return True

    def resolve_traffic(self, request, blocker):
        if blocker['mode'] == 'charging': return False
        if blocker['mode'] == 'idle' and not blocker['task']:
            return self.yield_robot(blocker, request)
        rank = lambda r: PRIORITIES[r['task']['priority']] if r['task'] else 99
        request_yields = rank(request) > rank(blocker) or (rank(request) == rank(blocker) and request['id'] > blocker['id'])
        first, second = (request, blocker) if request_yields else (blocker, request)
        if first['trafficYield'] or second['trafficYield']:
            return False
        return self.yield_robot(first, second) or self.yield_robot(second, first)

    def toggle_obstacle(self, x, z):
        p = (round(x), round(z))
        if self.robot_at(p): return False
        if not self.map.toggle_obstacle(*p): return False
        self.event('obstacle', f'Obstacle toggled at {p}')
        for r in self.robots:
            if r['mode'] in ('pickup', 'delivery', 'to-charge','blocked'):
                if r['mode'] == 'blocked': r['mode'] = 'delivery' if r['carrying'] else 'pickup'
                self.plan(r)
        return True

    def toggle_forklift(self):
        f = self.forklift
        if f['enabled']:
            f['enabled'] = False
            self.map.dynamic.discard((f['x'], f['z']))
        else:
            if self.robot_at((0,-13)): return False
            f.update(enabled=True, x=0, z=-13, direction=1, nextMove=self.time+1.3)
            self.map.dynamic.add((0,-13))
        for r in self.robots:
            if r['mode'] in ('pickup','delivery','to-charge'): self.plan(r)
        self.event('obstacle', 'Forklift enabled' if f['enabled'] else 'Forklift disabled')
        return True

    def update_forklift(self):
        f = self.forklift
        if not f['enabled'] or self.time < f['nextMove']: return
        f['nextMove'] = self.time + 1.3
        nx = f['x'] + f['direction']
        if abs(nx) > 9:
            f['direction'] *= -1
            return
        next_cell = (nx, f['z'])
        if self.robot_at(next_cell) or next_cell in self.map.static or next_cell in self.map.obstacles: return
        self.map.dynamic.discard((f['x'], f['z']))
        f['x'] = nx
        self.map.dynamic.add(next_cell)
        for r in self.robots:
            if r['mode'] in ('pickup','delivery','to-charge') and any((p['x'],p['z']) == next_cell for p in r['route'][r['routeIndex']:]):
                if self.plan(r): self.event('obstacle', f"{r['id']} replanned around forklift")

    def tick(self, dt):
        """Run one deterministic simulation step; lock is acquired by the server loop."""
        with self.lock:
            if not self.running: return
            dt = min(dt, .05) * self.speed
            self.time += dt
            self.update_forklift()
            for r in self.robots:
                if r['mode'] == 'charging':
                    r['battery'] = min(100, r['battery'] + 8*dt)
                    r['chargeTime'] += dt
                    if r['battery'] >= 99.999:
                        r['battery'] = 100
                        r['chargeTarget'] = None
                        if r['task'] and r['carrying']:
                            r['mode'] = 'delivery'
                            self.plan(r)
                        else: r['mode'] = 'idle'
                        self.event('battery', f"{r['id']} fully charged")
            for r in self.robots:
                if r['mode'] != 'parked' or not r['trafficYield']: continue
                y = r['trafficYield']
                blocker = next((b for b in self.robots if b['id'] == y['blockerId']), None)
                distant = not blocker or manhattan(self.position(r), self.position(blocker)) >= 3
                if self.time >= y['parkedUntil'] and (distant or self.time > y['started']+9):
                    r['mode'] = y['previousMode']
                    r['trafficYield'] = None
                    if r['task'] or r['mode'] == 'to-charge': self.plan(r)
                    else: r['mode'] = 'idle'
                    self.event('traffic', f"{r['id']} resumed")
            occupied = {self.position(r): r for r in self.robots}
            claimed = set()
            proposed = []
            for r in self.robots:
                if r['mode'] not in MODES_MOVING: continue
                if not r['route']:
                    if r['mode'] != 'yielding': self.plan(r)
                    continue
                if r['routeIndex'] >= len(r['route'])-1:
                    self.reached(r)
                    continue
                if r['battery'] <= 0:
                    r['mode'] = 'blocked'
                    self.event('battery', f"{r['id']} battery depleted")
                    continue
                nex = r['route'][r['routeIndex']+1]
                dest = (nex['x'], nex['z'])
                if self.map.blocked(dest):
                    if r['mode'] != 'yielding': self.plan(r)
                    continue
                if (dest in occupied and occupied[dest] is not r) or dest in claimed:
                    r['waitTime'] += dt
                    self.metrics['collisionsAvoided'] += 1
                    if r['waitTime'] >= 1.5:
                        blocker = occupied.get(dest)
                        if blocker and blocker is not r:
                            self.resolve_traffic(r, blocker)
                        elif r['mode'] != 'yielding':
                            self.plan(r, avoid_robots=True)
                        r['waitTime'] = 0
                    continue
                claimed.add(dest)
                proposed.append((r, dest))
                r['waitTime'] = 0
            for r, dest in proposed:
                r['progress'] += r['speed'] * dt
                if r['progress'] >= 1:
                    r['x'], r['z'] = dest
                    r['routeIndex'] += 1
                    r['progress'] = 0
                    r['travelled'] += 1
                    self.metrics['totalDistance'] += 1
                    r['battery'] = max(0, r['battery']-.12)
                    self.visits[key(dest)] = self.visits.get(key(dest), 0) + 1
                    if r['routeIndex'] >= len(r['route'])-1: self.reached(r)
            for r in self.robots:
                if r['mode'] == 'idle' and r['battery'] <= 28: self.send_to_charge(r)
                elif r['mode'] in ('pickup','delivery') and r['battery'] <= 18: self.send_to_charge(r)
                elif r['mode'] == 'blocked' and int(self.time*10) % 50 == 0:
                    # Recover previous phase rather than silently dropping a task.
                    if r['task']:
                        r['mode'] = 'delivery' if r['carrying'] else 'pickup'
                    elif r['chargeTarget']: r['mode'] = 'to-charge'
                    self.plan(r)
            self.assign_tasks()
            if self.time - self.lastRecording >= .5:
                self.lastRecording = self.time
                self.history.append(dict(time=round(self.time,2),robots=[dict(id=r['id'],x=r['x'],z=r['z'],carrying=r['carrying'],mode=r['mode']) for r in self.robots]))
                if len(self.history)>1800: self.history.pop(0)

    def compare(self, start, goal):
        value = benchmark(self.map, tuple(start), tuple(goal), 5)
        self.latestBenchmark = value
        self.event('ai', 'Benchmarked all four Python algorithms on identical map')
        return value

    def demo(self):
        self.add_task(ZONES['Pickup A'], ZONES['Delivery A'], 'normal')
        self.add_task(ZONES['Pickup B'], ZONES['Delivery B'], 'high')
        self.add_task(ZONES['Pickup C'], ZONES['Delivery C'], 'urgent')

    def scenario(self, name):
        self.reset()
        if name == 'normal': self.demo()
        elif name == 'rush':
            for i in range(4):
                self.add_task(ZONES['Pickup A'], ZONES['Delivery A'], 'high' if i%2 else 'normal')
                self.add_task(ZONES['Pickup B'], ZONES['Delivery B'], 'urgent' if i%3==0 else 'normal')
        elif name == 'emergency':
            self.add_task(ZONES['Pickup A'], ZONES['Delivery A'],'normal')
            self.add_task(ZONES['Pickup C'], ZONES['Delivery B'],'urgent')
            self.add_task(ZONES['Pickup B'], ZONES['Delivery C'],'urgent')
        elif name == 'blocked':
            self.demo()
            for p in ((0,0),(1,0),(0,1)): self.toggle_obstacle(*p)
        elif name == 'lowbattery':
            for i, r in enumerate(self.robots): r['battery'] = 22 + 2*i
            self.demo()
        else: raise ValueError('Unknown scenario')
        self.running = True
        self.event('system', f'Scenario loaded: {name}')

    def stats(self):
        return dict(tasks=len(self.tasks), completed=sum(t['status']=='completed' for t in self.tasks),
                    pending=sum(t['status']=='pending' for t in self.tasks),
                    active=sum(t['status']=='active' for t in self.tasks),
                    totalDistance=self.metrics['totalDistance'], replans=self.metrics['replans'], time=self.time)

    def state(self):
        with self.lock:
            robots = []
            for r in self.robots:
                item = {k:v for k,v in r.items() if k != 'task'}
                item['task'] = copy.deepcopy(r['task']) if r['task'] else None
                robots.append(item)
            return dict(running=self.running, speed=self.speed, time=self.time, algorithm=self.algorithm,
                        map=self.map.snapshot(), robots=robots, tasks=copy.deepcopy(self.tasks),
                        stats=self.stats(), latestSearch=({k:v for k,v in self.latestSearch.items() if k != 'visitedOrder'} if self.latestSearch else None),
                        latestBenchmark=copy.deepcopy(self.latestBenchmark), events=self.events[:],
                        forklift=self.forklift.copy(), visits=self.visits.copy(),
                        metrics=self.metrics.copy())
