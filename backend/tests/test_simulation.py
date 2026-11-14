import pytest
from core.simulation import Simulation
from core.grid import ZONES, Grid


def run(sim, seconds=1500):
    for _ in range(int(seconds/.05)):
        sim.tick(.05)
        occupied=[(r['x'],r['z']) for r in sim.robots]
        assert len(set(occupied))==len(occupied), 'Two robots occupy one cell'


@pytest.mark.parametrize('algorithm', ('bfs','dfs','astar','greedy'))
def test_demo_delivery_all_algorithms(algorithm):
    sim=Simulation();sim.set_algorithm(algorithm);sim.demo();sim.running=True
    run(sim, 6000 if algorithm=='dfs' else 900)
    assert all(t['status']=='completed' for t in sim.tasks), [(t['id'],t['status']) for t in sim.tasks]


def test_urgent_interruption_when_not_carrying():
    sim=Simulation()
    # Assign tasks to all bots, then an urgent task interrupts suitable pickup-phase job.
    sim.add_task(ZONES['Pickup A'],ZONES['Delivery A'],'normal')
    sim.add_task(ZONES['Pickup B'],ZONES['Delivery B'],'normal')
    sim.add_task(ZONES['Pickup C'],ZONES['Delivery C'],'normal')
    sim.add_task(ZONES['Inbound Dock'],ZONES['Outbound Dock'],'urgent')
    sim.running=True
    run(sim, 1300)
    assert all(t['status']=='completed' for t in sim.tasks)


def test_low_battery_charges_gradually():
    sim=Simulation();r=sim.robots[0];r['battery']=22
    sim.running=True
    sim.tick(.05)
    assert r['mode'] in ('to-charge','charging')
    before=r['battery']
    run(sim,3)
    assert r['battery']<100 or r['mode']=='to-charge'
    assert r['battery']>=before-3


def test_reset_clears_obstacles_tasks_history():
    sim=Simulation();sim.add_task(ZONES['Pickup A'],ZONES['Delivery A']); assert sim.toggle_obstacle(0,0)
    sim.reset()
    assert len(sim.tasks)==0 and len(sim.map.obstacles)==0 and all(r['mode']=='idle' for r in sim.robots)


def test_head_on_yield_case():
    sim=Simulation()
    # Construct two opposing paths across a clear hallway and observe yield behaviour.
    a,b=sim.robots[:2]
    a.update(x=-2,z=0,mode='pickup',speed=2.1)
    b.update(x=2,z=0,mode='pickup',speed=2.1)
    sim.robots[2].update(x=0,z=13)
    sim.tasks=[]
    a['task']={'id':'T-A','pickup':[3,0],'delivery':[4,0],'priority':'normal','status':'active','stage':'pickup','pickups':0}
    b['task']={'id':'T-B','pickup':[-3,0],'delivery':[-4,0],'priority':'normal','status':'active','stage':'pickup','pickups':0}
    sim.plan(a);sim.plan(b);sim.running=True
    run(sim,100)
    assert sim.trafficDecisions>0
    assert a['task'] is None and b['task'] is None


def test_dynamic_obstacle_replans():
    sim=Simulation()
    sim.add_task(ZONES['Pickup A'],ZONES['Delivery A'])
    r=next(r for r in sim.robots if r['task'])
    previous=r['replans']
    assert sim.toggle_obstacle(0,0)
    assert r['replans']>previous


def test_moving_forklift_toggle():
    sim=Simulation()
    assert sim.toggle_forklift()
    sim.running=True
    run(sim,5)
    assert sim.forklift['enabled']
    assert (sim.forklift['x'],sim.forklift['z']) in sim.map.dynamic
    assert sim.toggle_forklift()
    assert not sim.map.dynamic


def test_scenarios_load_correct_counts():
    expected={'normal':3,'rush':8,'emergency':3,'blocked':3,'lowbattery':3}
    for name,count in expected.items():
        sim=Simulation();sim.scenario(name)
        assert len(sim.tasks)==count
