"""A* graph search: f(n) = g(n) + Manhattan(n, goal)."""
from heapq import heappush, heappop
from itertools import count
from time import perf_counter
from core.grid import manhattan
from algorithms.common import reconstruct, result, validate


def search(grid, start, goal, extra=()):
    t0 = perf_counter()
    bad = validate(grid, start, goal, 'astar', t0)
    if bad: return bad
    serial = count()
    frontier = []
    heappush(frontier, (manhattan(start, goal), next(serial), start))
    scores = {start: 0}
    parents = {}
    closed = set()
    visited = []
    while frontier:
        _, _, current = heappop(frontier)
        if current in closed:
            continue
        closed.add(current)
        visited.append(current)
        if current == goal:
            return result('astar', t0, reconstruct(parents, goal), visited)
        for neighbor in grid.neighbors(current, extra):
            tentative_g = scores[current] + 1
            if tentative_g < scores.get(neighbor, float('inf')):
                scores[neighbor] = tentative_g
                parents[neighbor] = current
                heappush(frontier, (tentative_g + manhattan(neighbor, goal), next(serial), neighbor))
    return result('astar', t0, [], visited)
