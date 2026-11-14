# NavBot 3D — Python AI Edition v4.0

A university AI warehouse simulator with a **Python-authoritative simulation engine**, four independent **Python search algorithms**, and the familiar **Three.js 3D warehouse + dashboard** from the previous edition.

## Requirements

- Python 3.10+ (Windows launcher uses the `py` Python launcher)
- Node.js 20+ and npm
- Internet connection for the first `pip install` and `npm install`
- A current desktop browser supporting WebGL

## Quick start (Windows)

1. Extract the project to a regular folder.
2. Double-click **`START_WINDOWS.bat`** (or launch `START_BACKEND.bat` and `START_FRONTEND.bat` separately).
3. Keep both terminal windows open.
4. Visit **http://127.0.0.1:5173**.
5. If the dashboard says **Python backend offline**, inspect the Python terminal window; `http://127.0.0.1:8000/api/health` should show a JSON response.

## Manual start

**Terminal 1 (Python API):**

```powershell
cd backend
py -m pip install -r requirements.txt
py -m uvicorn main:app --host 127.0.0.1 --port 8000
```

**Terminal 2 (Three.js frontend):**

```powershell
cd frontend
npm install
npm run dev
```

**Browser:** http://127.0.0.1:5173

Vite proxies `/api` to local FastAPI. The browser does not compute AI routes. Run **both services**. GitHub Pages alone cannot run the Python backend; public deployment requires Python hosting or a running tunnel.

## Python AI code — for your defense

- `backend/algorithms/bfs.py`: breadth-first search via `deque` (FIFO).
- `backend/algorithms/dfs.py`: depth-first search via `list` stack (LIFO).
- `backend/algorithms/astar.py`: A* via `heapq`, `f(n)=g(n)+h(n)`.
- `backend/algorithms/greedy.py`: Greedy Best-First via `heapq` and `h(n)`.
- `backend/core/grid.py`: map, shelf occupancy, restricted regions, zones.
- `backend/core/simulation.py`: tasks, robot movement, priorities, congestion handling, battery, charging, forklift, scenarios, replay.
- `backend/main.py`: FastAPI endpoints receiving UI commands and exposing state.

All four algorithms use four-neighbor movement and unit step costs. A* uses Manhattan distance, and BFS and A* must match on shortest route cost for these settings. DFS and Greedy are not guaranteed to find a shortest path.

## Preserved functionality

- Three colored robots, industrial warehouse racks, cartons, chargers and forklift.
- Pickup and drop-off missions with normal/high/urgent priorities.
- Urgent work interrupts **only pre-pickup** missions when no idle robot is free, to avoid pretending two packages can be carried at once.
- Interactive obstacle placement; moving forklift; route replanning.
- Traffic-yield / pull-over logic for many head-on conflicts, subject to availability of a free side bay. **Not a complete multi-agent pathfinding guarantee.**
- Battery drain by unit move and gradual charging.
- Algorithm comparison on the same map, live telemetry, minimap and event log.
- Scenario lab, history replay, heatmap, CSV export, simulation speed, focus mode.
- All front-end decisions (paths/tasks/movement/charge) come from Python. JS only renders and sends commands.

## Verification / tests

```powershell
cd backend
py -m pytest -q
```

Or double-click `RUN_TESTS_WINDOWS.bat` after installing Python dependencies.

Tests cover all four pathfinders, blocked/unreachable goals, BFS/A* optimality, three-robot task scenarios across all four algorithms, interruption, collision, obstacle replanning, charging, forklift, resets, scenarios, and FastAPI integration. Python tests can run without the Three.js browser.

Build the frontend (after npm installation):

```powershell
cd frontend
npm run build
```

## Limitations / integrity

- Model treats the warehouse as a 2D occupancy grid for navigation while Three.js draws it in 3D.
- Algorithm timing measured on Python backend CPU, not WebGL animation time; absolute timing varies with hardware.
- Charging and battery use an educational model, not physical robot specifications.
- Pull-over works when a side cell is reachable; arbitrarily congested corridor/deadlock layouts need a more advanced global traffic planner.
- This package has been Python-unit/API-tested. Frontend browser behavior and `npm run build` must also be checked on your computer: package installation was unavailable in the build sandbox.

## Useful API endpoints

- `GET /api/health`
- `GET /api/state`
- `POST /api/command` with JSON e.g. `{"action":"demo"}` or `{"action":"algorithm","algorithm":"astar"}`
- `POST /api/benchmark` with `{"start":"Pickup A","goal":"Delivery A"}`
- `GET /api/history`

**Architecture principle:** no duplicate JS algorithm implementation. Python is the single authoritative source for all route calculations.
