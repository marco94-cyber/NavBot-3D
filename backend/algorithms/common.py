"""Utilities shared by BFS, DFS, A*, and Greedy Best-First Search."""
from time import perf_counter
from core.grid import manhattan


def reconstruct(parents, current):
    path = [current]
    while current in parents:
        current = parents[current]
        path.append(current)
    return list(reversed(path))


def result(algorithm, t0, path, visited):
    return {
        'algorithm': algorithm,
        'found': bool(path),
        'path': [{'x': x, 'z': z} for x, z in path],
        'pathLength': max(0, len(path) - 1) if path else 0,
        'cost': max(0, len(path) - 1) if path else None,
        'explored': len(visited),
        'visitedOrder': [{'x': x, 'z': z} for x, z in visited],
        'timeMs': (perf_counter() - t0) * 1000,
    }


def validate(grid, start, goal, algorithm, t0):
    if grid.blocked(start) or grid.blocked(goal):
        return result(algorithm, t0, [], [])
    if start == goal:
        return result(algorithm, t0, [start], [start])
    return None
