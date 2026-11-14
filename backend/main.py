"""FastAPI API for Python-owned NavBot 3D simulation.

Start with: uvicorn main:app --reload --host 127.0.0.1 --port 8000
"""
import time
import threading
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from core.grid import ZONES
from core.simulation import Simulation
from algorithms import find_path

sim = Simulation()
_stop = threading.Event()


def run_simulation():
    last = time.perf_counter()
    while not _stop.is_set():
        now = time.perf_counter()
        sim.tick(min(0.05, now-last))
        last = now
        _stop.wait(.05)


@asynccontextmanager
async def lifespan(app):
    _stop.clear()
    thread = threading.Thread(target=run_simulation, daemon=True)
    thread.start()
    yield
    _stop.set()
    thread.join(timeout=2)


app = FastAPI(title='NavBot 3D — Python AI Engine', version='4.0', lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=['http://localhost:5173', 'http://127.0.0.1:5173'],
                   allow_credentials=False, allow_methods=['GET','POST'], allow_headers=['Content-Type'])


class Command(BaseModel):
    action: str
    pickup: str | None = None
    delivery: str | None = None
    priority: str = 'normal'
    algorithm: str | None = None
    speed: float | None = None
    x: int | None = None
    z: int | None = None
    name: str | None = None


class BenchmarkInput(BaseModel):
    start: str
    goal: str


@app.get('/api/health')
def health():
    return {'status':'ok', 'backend':'Python FastAPI', 'algorithms':['bfs','dfs','astar','greedy']}


@app.get('/api/state')
def state():
    return sim.state()


@app.get('/api/history')
def history():
    with sim.lock:
        return {'history': list(sim.history)}


@app.post('/api/command')
def command(data: Command):
    try:
        with sim.lock:
            action = data.action
            if action == 'start':
                sim.running = True
                sim.event('system','Simulation started')
            elif action == 'pause':
                sim.running = False
                sim.event('system','Simulation paused')
            elif action == 'reset':
                sim.reset()
            elif action == 'algorithm':
                sim.set_algorithm(data.algorithm)
            elif action == 'speed':
                if data.speed not in (.5, 1, 2, 4): raise ValueError('Speed must be 0.5, 1, 2, or 4')
                sim.speed = data.speed
            elif action == 'add-task':
                if data.pickup not in ZONES or data.delivery not in ZONES: raise ValueError('Unknown pickup or delivery')
                sim.add_task(ZONES[data.pickup], ZONES[data.delivery], data.priority)
            elif action == 'demo':
                sim.demo()
                sim.running = True
            elif action == 'obstacle':
                if data.x is None or data.z is None: raise ValueError('Obstacle coordinates missing')
                if not sim.toggle_obstacle(data.x,data.z): raise ValueError('Cannot toggle obstacle at this position')
            elif action == 'clear-obstacles':
                for x,z in list(sim.map.obstacles): sim.toggle_obstacle(x,z)
            elif action == 'forklift':
                if not sim.toggle_forklift(): raise ValueError('Forklift start is occupied')
            elif action == 'scenario':
                sim.scenario(data.name)
            else:
                raise ValueError(f'Unknown action {action}')
            return {'ok':True, 'state': sim.state()}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post('/api/benchmark')
def compare(data: BenchmarkInput):
    if data.start not in ZONES or data.goal not in ZONES:
        raise HTTPException(status_code=400, detail='Unknown zone')
    with sim.lock:
        return sim.compare(ZONES[data.start], ZONES[data.goal])
