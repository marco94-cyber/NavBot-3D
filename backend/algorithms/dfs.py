"""Depth-First Search: stack (LIFO), valid path; not necessarily shortest."""
from time import perf_counter
from algorithms.common import reconstruct, result, validate


def search(grid, start, goal, extra=()):
    t0 = perf_counter()
    bad = validate(grid, start, goal, 'dfs', t0)
    if bad: return bad
    stack = [start]
    discovered = {start}
    parents = {}
    visited = []
    while stack:
        current = stack.pop()
        visited.append(current)
        if current == goal:
            return result('dfs', t0, reconstruct(parents, goal), visited)
        for neighbor in reversed(grid.neighbors(current, extra)):
            if neighbor not in discovered:
                discovered.add(neighbor)
                parents[neighbor] = current
                stack.append(neighbor)
    return result('dfs', t0, [], visited)
