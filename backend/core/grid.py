"""Shared, authoritative navigation map for the 3-D warehouse."""
from dataclasses import dataclass, field

WIDTH = 36
ZONES = {
    'Inbound Dock': (-14, -14), 'Pickup A': (-5, -5), 'Pickup B': (-5, 6),
    'Pickup C': (5, -5), 'Delivery A': (5, 6), 'Delivery B': (14, 13),
    'Delivery C': (-14, 13), 'Outbound Dock': (14, -11),
    'Charger A': (-14, 0), 'Charger B': (14, 0),
}
RACKS = [{'x': x, 'z': z, 'w': 3.6, 'd': 2.1} for z in (-10, -3, 4, 11) for x in (-10, 10)] + [
    {'x': x, 'z': z, 'w': 3, 'd': 2.2} for x in (-5, 5) for z in (-11, 11)
]
BASE_OBSTACLES = [{'x': 3, 'z': -3, 'w': 2, 'd': 2, 'type': 'hazard'}]


def key(p):
    return f'{p[0]},{p[1]}'


def manhattan(a, b):
    return abs(a[0] - b[0]) + abs(a[1] - b[1])


def rect_cells(obj, padding=0):
    import math
    x, z, w, d = obj['x'], obj['z'], obj['w'], obj['d']
    for i in range(math.ceil(x-w/2-padding), math.floor(x+w/2+padding)+1):
        for j in range(math.ceil(z-d/2-padding), math.floor(z+d/2+padding)+1):
            if -17 <= i <= 17 and -17 <= j <= 17:
                yield (i, j)


@dataclass
class Grid:
    static: set = field(default_factory=set)
    obstacles: set = field(default_factory=set)
    dynamic: set = field(default_factory=set)

    def __post_init__(self):
        if not self.static:
            for rack in RACKS:
                self.static.update(rect_cells(rack, .55))
            for hazard in BASE_OBSTACLES:
                self.static.update(rect_cells(hazard, .35))

    def inside(self, node):
        x, z = node
        return isinstance(x, int) and isinstance(z, int) and -17 <= x <= 17 and -17 <= z <= 17

    def blocked(self, node):
        return not self.inside(node) or node in self.static or node in self.obstacles or node in self.dynamic

    def neighbors(self, node, extra=()):
        x, z = node
        banned = set(extra)
        return [p for p in ((x+1,z),(x-1,z),(x,z+1),(x,z-1)) if not self.blocked(p) and p not in banned]

    def toggle_obstacle(self, x, z):
        p = (round(x), round(z))
        if p in self.obstacles:
            self.obstacles.remove(p)
            return True
        if self.blocked(p) or p in ZONES.values():
            return False
        self.obstacles.add(p)
        return True

    def snapshot(self):
        return {
            'width': WIDTH,
            'staticBlocked': [key(p) for p in sorted(self.static)],
            'obstacles': [key(p) for p in sorted(self.obstacles)],
            'dynamicBlocked': [key(p) for p in sorted(self.dynamic)],
        }
