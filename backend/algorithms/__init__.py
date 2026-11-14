from algorithms import bfs, dfs, astar, greedy

ALGORITHMS = {'bfs': bfs.search, 'dfs': dfs.search, 'astar': astar.search, 'greedy': greedy.search}


def find_path(grid, start, goal, algorithm='astar', extra=()):
    if algorithm not in ALGORITHMS:
        raise ValueError(f'Unknown algorithm: {algorithm}')
    return ALGORITHMS[algorithm](grid, tuple(start), tuple(goal), extra=extra)


def benchmark(grid, start, goal, repetitions=5):
    results = {}
    for name in ALGORITHMS:
        first = None
        samples = []
        for _ in range(repetitions):
            value = find_path(grid, start, goal, name)
            if first is None: first = value
            samples.append(value['timeMs'])
        results[name] = {**first, 'timeMs': sum(samples) / len(samples)}
    return results
