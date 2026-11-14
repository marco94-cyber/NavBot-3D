"""Breadth-First Search: queue (FIFO), shortest path on unit-cost grid."""
from collections import deque
from time import perf_counter
from algorithms.common import reconstruct, result, validate


def search(grid, start, goal, extra=()):
    t0 = perf_counter()
    bad = validate(grid, start, goal, 'bfs', t0)
    if bad: return bad
    queue = deque([start])
    discovered = {start}
    parents = {}
    visited = []
    while queue:
        current = queue.popleft()
        visited.append(current)
        if current == goal:
            return result('bfs', t0, reconstruct(parents, goal), visited)
        for neighbor in grid.neighbors(current, extra):
            if neighbor not in discovered:
                discovered.add(neighbor)
                parents[neighbor] = current
                queue.append(neighbor)
    return result('bfs', t0, [], visited)
