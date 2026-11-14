"""Greedy Best-First Search: f(n) = Manhattan(n, goal), no optimality guarantee."""
from heapq import heappush, heappop
from itertools import count
from time import perf_counter
from core.grid import manhattan
from algorithms.common import reconstruct, result, validate


def search(grid, start, goal, extra=()):
    t0 = perf_counter()
    bad = validate(grid, start, goal, 'greedy', t0)
    if bad: return bad
    serial = count()
    queue = [(manhattan(start, goal), next(serial), start)]
    parents = {}
    seen = {start}
    visited = []
    while queue:
        _, _, current = heappop(queue)
        visited.append(current)
        if current == goal:
            return result('greedy', t0, reconstruct(parents, goal), visited)
        for neighbor in grid.neighbors(current, extra):
            if neighbor not in seen:
                seen.add(neighbor)
                parents[neighbor] = current
                heappush(queue, (manhattan(neighbor, goal), next(serial), neighbor))
    return result('greedy', t0, [], visited)
