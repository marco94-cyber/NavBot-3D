import pytest
from core.grid import Grid, ZONES
from algorithms import find_path, benchmark

ALGORITHMS = ('astar','bfs','dfs','greedy')
CASES = [
    (ZONES['Pickup A'], ZONES['Delivery A']),
    (ZONES['Pickup B'], ZONES['Delivery C']),
    (ZONES['Pickup C'], ZONES['Delivery B']),
    (ZONES['Inbound Dock'], ZONES['Outbound Dock']),
    (ZONES['Delivery C'], ZONES['Delivery C']),
]


@pytest.mark.parametrize('algorithm', ALGORITHMS)
@pytest.mark.parametrize('start,goal', CASES)
def test_paths_are_valid(start,goal,algorithm):
    grid=Grid()
    result=find_path(grid,start,goal,algorithm)
    assert result['found'], (algorithm, start, goal)
    path=[(p['x'],p['z']) for p in result['path']]
    assert path[0]==start and path[-1]==goal
    assert result['pathLength']==len(path)-1
    assert result['explored']==len(result['visitedOrder'])
    assert all(not grid.blocked(p) for p in path)
    assert all(abs(a[0]-b[0])+abs(a[1]-b[1])==1 for a,b in zip(path,path[1:]))


@pytest.mark.parametrize('start,goal', CASES)
def test_astar_bfs_optimality(start,goal):
    g=Grid()
    assert find_path(g,start,goal,'astar')['cost']==find_path(g,start,goal,'bfs')['cost']


@pytest.mark.parametrize('algorithm', ALGORITHMS)
def test_blocked_goal(algorithm):
    g=Grid()
    goal=next(iter(g.static))
    result=find_path(g, ZONES['Pickup A'], goal,algorithm)
    assert not result['found']


def test_blocked_corridor_no_path():
    g=Grid()
    # Surround a reachable goal with dynamically blocked cardinal neighbors.
    goal=(0,0)
    g.obstacles.update({(1,0),(-1,0),(0,1),(0,-1)})
    for algo in ALGORITHMS:
        assert not find_path(g, (-5,-5), goal,algo)['found']


def test_benchmark_is_repeatable_path_cost():
    g=Grid()
    results=benchmark(g,ZONES['Pickup A'],ZONES['Delivery A'],repetitions=3)
    assert set(results)==set(ALGORITHMS)
    assert results['astar']['cost']==results['bfs']['cost']
    assert all(value['timeMs']>=0 for value in results.values())
