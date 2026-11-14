import {ZONES} from '../core/GridMap.js'
import {exportTasksCsv,downloadText} from '../analytics/Metrics.js'
const optionList=(names)=>names.map(name=>`<option value="${name}">${name}</option>`).join('')
const pickups=['Inbound Dock','Pickup A','Pickup B','Pickup C'];const deliveries=['Delivery A','Delivery B','Delivery C','Outbound Dock']
export class Dashboard{
 constructor(sim,scene){this.sim=sim;this.scene=scene;this.lastEventCount=0
  document.querySelector('#app').innerHTML=`
  <div id="scene-container"></div>
  <header class="topbar glass"><div class="brand"><span class="brandmark">N<span>•</span></span><div><strong>NAVBOT <em>3D</em></strong><small>PYTHON AI · WAREHOUSE INTELLIGENCE</small></div></div><div class="top-center"><span class="overline">WORKSPACE</span><b>Warehouse Alpha</b><span class="topline"></span><span class="online"><i></i> SYSTEM ONLINE</span></div><div class="righttop"><span class="clockbox">SIMULATION TIME <b id="clock">00:00</b></span><button id="focusBtn" class="icon-btn" title="Focus mode (F)">⛶</button></div></header>
  <aside class="sidebar glass"><div class="section-overline">CONTROL CENTER <span>PY 4.0</span></div><nav class="nav"><button class="nav-btn active" data-scroll="simControls">◈ <span>Overview</span></button><button class="nav-btn" data-scroll="taskControls">▤ <span>Tasks</span></button><button class="nav-btn" data-scroll="aiControls">⌘ <span>Algorithms</span></button><button class="nav-btn" data-scroll="worldControls">▦ <span>Map & Scenes</span></button></nav>
  <div class="sections" id="sections">
   <section id="simControls"><div class="section-title">SIMULATION CONTROL</div><div class="robot-line"><div class="robot-icon">▣</div><div><b>ROBOT FLEET</b><small id="robotStatus">Ready</small></div><div class="live-led"></div></div>
    <div class="button-grid"><button id="startBtn" class="btn primary">▶ Start</button><button id="pauseBtn" class="btn secondary">Ⅱ Pause</button><button id="resetBtn" class="btn secondary">↻ Reset</button><button id="demoBtn" class="btn secondary">▷ Demo tasks</button></div><label class="small-label">Simulation speed</label><div class="speed-options"><button data-speed="0.5">0.5×</button><button class="selected" data-speed="1">1×</button><button data-speed="2">2×</button><button data-speed="4">4×</button></div>
    <label class="small-label" for="robotSelect">Focus robot</label><select id="robotSelect"><option value="">All robots</option><option value="R-01">R-01</option><option value="R-02">R-02</option><option value="R-03">R-03</option></select></section>
   <section id="taskControls"><div class="section-title">MISSION PLANNER</div><label class="small-label" for="pickupSelect">Pickup zone</label><select id="pickupSelect">${optionList(pickups)}</select><div class="connector">↓ &nbsp; DELIVERY ROUTE</div><label class="small-label" for="deliverySelect">Drop-off zone</label><select id="deliverySelect">${optionList(deliveries)}</select><div class="two"><select id="prioritySelect"><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select><button id="addTaskBtn" class="btn primary">＋ Add Task</button></div><div class="queue-head"><b>Task queue</b><small id="taskSummary">0 pending · 0 done</small></div><div id="taskList" class="task-list"></div></section>
   <section id="aiControls"><div class="section-title">AI PATHFINDING</div><label class="small-label" for="algorithm">Search algorithm</label><select id="algorithm"><option value="astar">A* Search</option><option value="bfs">Breadth-First Search</option><option value="dfs">Depth-First Search</option><option value="greedy">Greedy Best-First Search</option></select><button id="benchmarkBtn" class="btn secondary full">▥ Run Algorithm Benchmark</button><button id="clearSearchBtn" class="btn secondary full">✕ Clear exploration overlay</button><label class="small-label" for="compareStart">Compare from</label><select id="compareStart">${optionList(Object.keys(ZONES).filter(k=>!k.startsWith('Charger')))}</select><label class="small-label" for="compareGoal">Compare to</label><select id="compareGoal">${optionList(Object.keys(ZONES).filter(k=>!k.startsWith('Charger')))}</select></section>
   <section id="worldControls"><div class="section-title">WAREHOUSE EDITOR</div><button id="editBtn" class="btn secondary full">▦ Click-to-place obstacles: OFF</button><button id="obstacleBtn" class="btn secondary full">＋ Add demo obstacle</button><button id="forkliftBtn" class="btn secondary full">↝ Moving forklift: OFF</button><button id="clearBtn" class="btn secondary full">✕ Clear custom obstacles</button><p class="note">Editor: click on the floor to add / remove obstacles. Fixed shelves and work zones are protected.</p><div class="section-title">SCENARIO LAB</div><select id="scenarioSelect"><option value="normal">Normal operations</option><option value="rush">Rush hour (8 tasks)</option><option value="emergency">Emergency orders</option><option value="blocked">Blocked aisle</option><option value="lowbattery">Low battery fleet</option></select><button id="scenarioBtn" class="btn primary full">▷ Load & run scenario</button><button id="heatmapBtn" class="btn secondary full">▥ Traffic heatmap: OFF</button><div class="section-title">REPLAY & EXPORT</div><button id="replayBtn" class="btn secondary full">◀ Replay recorded movement</button><div id="replayControls" hidden><input id="replaySlider" type="range" min="0" max="0" value="0" style="width:100%"><small id="replayTime" class="small-label">—</small><button id="liveBtn" class="btn secondary full">↪ Return to live view</button></div><button id="exportBtn" class="btn secondary full">↓ Export task report (.csv)</button></section>
  </div><footer class="side-footer"><i></i> PYTHON AI ENGINE <span>FASTAPI</span></footer></aside>
  <div class="viewport-hud"><span class="view-chip">● &nbsp; LIVE WAREHOUSE VIEW</span><div class="bottom-hud"><span>Drag: rotate &nbsp; • &nbsp; Scroll: zoom &nbsp; • &nbsp; Right-drag: pan</span><span class="legend"><i class="cyan"></i> Route &nbsp; <i class="orange"></i> Delivery &nbsp; <i class="red"></i> Obstacle</span></div></div>
  <aside class="insights glass"><div class="right-heading"><div><span class="overline">OPERATIONS ANALYTICS</span><h2>Live telemetry</h2></div><span class="live-label"><i></i> LIVE</span></div>
   <div class="health"><div class="health-top"><b>Fleet battery</b><strong id="batteryText">100%</strong></div><div class="battery-track"><div id="batteryFill"></div></div><small>Average battery across all robots</small></div>
   <div class="metric-grid"><div class="metric"><label>PATH LENGTH</label><strong id="pathLength">—</strong><small>Latest search route</small></div><div class="metric"><label>NODES EXPLORED</label><strong id="nodes">—</strong><small>Visited cells</small></div><div class="metric"><label>SEARCH TIME</label><strong id="searchTime">—</strong><small>Measured runtime</small></div><div class="metric"><label>DELIVERED</label><strong id="completedCount">0</strong><small>Finished tasks</small></div></div>
   <div class="right-section"><div class="right-caption"><b>WAREHOUSE RADAR</b><small>TOP VIEW</small></div><canvas id="minimap" width="480" height="250"></canvas><div class="map-key"><i class="cyan"></i> Robots <i class="orange"></i> Delivery <i class="red"></i> Blocked</div></div>
   <div class="right-section"><div class="right-caption"><b>ROBOT STATUS</b><small>3 UNITS</small></div><div id="fleet" class="fleet-list"></div></div>
   <div class="right-section"><div class="right-caption"><b>EVENT ACTIVITY</b><small>RECENT</small></div><div id="eventFeed" class="event-feed"></div></div>
   <div id="benchmarkResults" class="benchmark-results" hidden></div>
  </aside><div id="toast" class="toast" role="status"></div>`
  // attach() is called after the Three.js view has been constructed.
 }
 el(id){return document.getElementById(id)}
 toast(text){const t=this.el('toast');t.textContent=text;t.classList.add('visible');clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>t.classList.remove('visible'),3500)}
 attach(){
  const safe=async (callback)=>{try{await callback()}catch(e){this.toast(e.message||String(e))}}
  this.el('startBtn').onclick=()=>safe(async()=>{await this.sim.start();this.toast('Simulation started')})
  this.el('pauseBtn').onclick=()=>safe(async()=>{await this.sim.pause();this.toast('Simulation paused')})
  this.el('resetBtn').onclick=()=>safe(async()=>{await this.sim.reset();this.scene.overview();this.scene.clearSearch();this.scene.setReplay(null);this.el('replayControls').hidden=true;this.el('benchmarkResults').hidden=true;this.toast('Simulation reset')})
  this.el('demoBtn').onclick=()=>safe(async()=>{await this.sim.addDemoTasks();this.toast('3 demonstration tasks started')})
  this.el('addTaskBtn').onclick=()=>safe(async()=>{const pickup=this.el('pickupSelect').value,delivery=this.el('deliverySelect').value;await this.sim.addTask(pickup,delivery,this.el('prioritySelect').value);this.toast('Mission created in Python backend')})
  this.el('clearSearchBtn').onclick=()=>this.scene.clearSearch()
  this.el('algorithm').onchange=e=>safe(async()=>{await this.sim.setAlgorithm(e.target.value);this.toast(`Python ${e.target.selectedOptions[0].text} selected`)})
  this.el('robotSelect').onchange=e=>e.target.value?this.scene.focusRobot(e.target.value):this.scene.overview()
  this.el('benchmarkBtn').onclick=()=>safe(async()=>{
    const out=await this.sim.compare(this.el('compareStart').value,this.el('compareGoal').value)
    const names={astar:'A*',bfs:'BFS',dfs:'DFS',greedy:'Greedy'}
    const d=this.el('benchmarkResults');d.hidden=false
    d.innerHTML=`<div class="right-caption"><b>PYTHON ALGORITHM ARENA</b><small>SAME MAP</small></div>${Object.entries(out).map(([k,r])=>`<div class="bench-row"><b>${names[k]}</b><span>${r.found?r.pathLength+'m':'NO PATH'}</span><small>${r.explored} nodes</small><small>${r.timeMs.toFixed(2)} ms avg</small></div>`).join('')}`
    this.scene.showSearch(out[this.el('algorithm').value]);this.toast('Python benchmark complete')
  })
  this.el('focusBtn').onclick=()=>document.body.classList.toggle('focus-mode')
  addEventListener('keydown',e=>{if(e.key.toLowerCase()==='f'&&!['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))document.body.classList.toggle('focus-mode')})
  for(const nav of document.querySelectorAll('.nav-btn'))nav.onclick=()=>{document.querySelectorAll('.nav-btn').forEach(n=>n.classList.remove('active'));nav.classList.add('active');this.el(nav.dataset.scroll).scrollIntoView({behavior:'smooth',block:'start'})}
  for(const b of document.querySelectorAll('[data-speed]'))b.onclick=()=>safe(async()=>{await this.sim.setSpeed(Number(b.dataset.speed));document.querySelectorAll('[data-speed]').forEach(n=>n.classList.remove('selected'));b.classList.add('selected')})
  this.el('editBtn').onclick=()=>{this.scene.setEditor(!this.scene.editor);this.el('editBtn').textContent=`▦ Click-to-place obstacles: ${this.scene.editor?'ON':'OFF'}`;this.toast(this.scene.editor?'Click floor to toggle obstacles':'Editor disabled')}
  this.scene.onGroundClick=(x,z)=>safe(async()=>{await this.sim.obstacle(x,z);this.toast(`Obstacle toggled at ${x}, ${z}`)})
  this.el('forkliftBtn').onclick=()=>safe(async()=>{await this.sim.toggleForklift();this.el('forkliftBtn').textContent=`↝ Moving forklift: ${this.sim.forklift.enabled?'ON':'OFF'}`;this.toast('Forklift state updated')})
  this.el('obstacleBtn').onclick=()=>safe(async()=>{const slots=[[0,0],[0,-6],[2,3],[-4,0],[8,2],[-7,8]];let ok=false;for(const [x,z] of slots){if(this.sim.map.isFree(x,z)){await this.sim.obstacle(x,z);ok=true;break}}this.toast(ok?'Obstacle placed and routes checked':'No free demo location')})
  this.el('clearBtn').onclick=()=>safe(async()=>{await this.sim.clearObstacles();this.toast('Custom obstacles cleared')})
  this.el('scenarioBtn').onclick=()=>safe(async()=>{await this.sim.loadScenario(this.el('scenarioSelect').value);this.scene.overview();this.scene.clearSearch();this.scene.setReplay(null);this.el('replayControls').hidden=true;this.toast('Scenario loaded into Python simulation')})
  this.heatmap=false;this.el('heatmapBtn').onclick=()=>{this.heatmap=!this.heatmap;this.el('heatmapBtn').textContent=`▥ Traffic heatmap: ${this.heatmap?'ON':'OFF'}`}
  this.el('replayBtn').onclick=()=>safe(async()=>{await this.sim.pause();await this.sim.loadHistory();if(!this.sim.history.length){this.toast('Run a scenario first');return}this.el('replayControls').hidden=false;const slider=this.el('replaySlider');slider.max=String(this.sim.history.length-1);slider.value='0';this.scene.setReplay(this.sim.history[0]);this.el('replayTime').textContent='Recorded time '+this.sim.history[0].time.toFixed(1)+' s'})
  this.el('replaySlider').oninput=e=>{const frame=this.sim.history[Number(e.target.value)];if(!frame)return;this.scene.setReplay(frame);this.el('replayTime').textContent='Recorded time '+frame.time.toFixed(1)+' s'}
  this.el('liveBtn').onclick=()=>{this.scene.setReplay(null);this.el('replayControls').hidden=true;this.toast('Live view')}
  this.el('exportBtn').onclick=()=>downloadText('navbot_tasks.csv',exportTasksCsv(this.sim),'text/csv')
 }

 update(){const sim=this.sim,stats=sim.stats();this.el('clock').textContent=`${String(Math.floor(stats.time/60)).padStart(2,'0')}:${String(Math.floor(stats.time%60)).padStart(2,'0')}`
  const active=sim.robots.filter(r=>r.task).length;this.el('robotStatus').textContent=`${active} active / 3 online`;
  this.el('taskSummary').textContent=`${stats.pending} pending · ${stats.completed} done`;this.el('completedCount').textContent=String(stats.completed)
  const latest=sim.latestSearch;if(latest){this.el('pathLength').textContent=latest.found?`${latest.pathLength} m`:'No path';this.el('nodes').textContent=String(latest.explored);this.el('searchTime').textContent=`${latest.timeMs.toFixed(2)} ms`}
  const bat=sim.robots.reduce((s,r)=>s+r.battery,0)/sim.robots.length;this.el('batteryText').textContent=`${Math.round(bat)}%`;this.el('batteryFill').style.width=`${bat}%`;this.el('batteryFill').classList.toggle('low',bat<30)
  this.el('taskList').innerHTML=sim.tasks.items.slice(-8).reverse().map(t=>`<div class="task-item ${t.priority}"><span class="task-led ${t.status}"></span><span><b>${t.id}</b><small>${t.status.toUpperCase()} · ${t.priority}${t.robotId?' · '+t.robotId:''}</small></span></div>`).join('')||'<p class="note">No tasks yet. Add a mission or run Demo.</p>'
  this.el('fleet').innerHTML=sim.robots.map(r=>`<div class="fleet-row"><i style="background:#${r.color.toString(16).padStart(6,'0')}"></i><b>${r.id}</b><span>${r.mode}</span><strong>${Math.round(r.battery)}%</strong></div>`).join('')
  this.el('eventFeed').innerHTML=sim.events.events.slice(0,7).map(e=>`<div class="event"><i></i><span>${e.message}<small>${Math.floor(e.seconds/60)}:${String(Math.floor(e.seconds%60)).padStart(2,'0')} · ${e.type.toUpperCase()}</small></span></div>`).join('')
  this.drawMinimap()
 }
 drawMinimap(){const c=this.el('minimap'),ctx=c.getContext('2d'),sim=this.sim,w=c.width,h=c.height
  ctx.fillStyle='#0b1a26';ctx.fillRect(0,0,w,h);const sx=w/36,sz=h/36;const px=x=>(x+18)*sx,pz=z=>(z+18)*sz
  ctx.strokeStyle='rgba(75,110,130,.18)';ctx.lineWidth=.75;for(let n=-18;n<=18;n+=3){ctx.beginPath();ctx.moveTo(px(n),0);ctx.lineTo(px(n),h);ctx.stroke();ctx.beginPath();ctx.moveTo(0,pz(n));ctx.lineTo(w,pz(n));ctx.stroke()}
  if(this.heatmap){const max=Math.max(1,...sim.visits.values());for(const [key,count] of sim.visits){const [x,z]=key.split(',').map(Number);ctx.fillStyle=`rgba(255,107,62,${(count/max*.7+.08).toFixed(3)})`;ctx.fillRect(px(x)-sx/2,pz(z)-sz/2,sx,sz)}}
  ctx.fillStyle='#3e5a6a';for(const key of sim.map.staticBlocked){const [x,z]=key.split(',').map(Number);ctx.fillRect(px(x)-sx/2,pz(z)-sz/2,sx,sz)}
  ctx.fillStyle='#ff5469';for(const o of sim.map.obstacles.values())ctx.fillRect(px(o.x)-sx/2,pz(o.z)-sz/2,sx,sz)
  if(sim.forklift.enabled){ctx.fillStyle='#f7a153';ctx.fillRect(px(sim.forklift.x)-sx/2,pz(sim.forklift.z)-sz/2,sx,sz)}
  for(const [name,[x,z]] of Object.entries(ZONES)){ctx.fillStyle=name.startsWith('Charger')?'#45ddaa':name.startsWith('Delivery')||name==='Outbound Dock'?'#f5b563':'#49ddec';ctx.fillRect(px(x)-2,pz(z)-2,4,4)}
  for(const r of sim.robots){if(r.route.length){ctx.strokeStyle='#'+r.color.toString(16).padStart(6,'0');ctx.lineWidth=2;ctx.beginPath();r.route.slice(r.routeIndex).forEach((p,i)=>i?ctx.lineTo(px(p.x),pz(p.z)):ctx.moveTo(px(p.x),pz(p.z)));ctx.stroke()}
   ctx.fillStyle='#'+r.color.toString(16).padStart(6,'0');ctx.beginPath();ctx.arc(px(r.x),pz(r.z),4.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#09212e';ctx.lineWidth=1;ctx.stroke()}
 }
}
