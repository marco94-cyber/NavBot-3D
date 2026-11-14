/** Browser-side state mirror. Python is the single authority for simulation decisions. */
function parseCell(value){return value.split(',').map(Number)}
function mapFromState(raw){
  const obstacles=new Map(raw.obstacles.map(s=>{const [x,z]=parseCell(s);return [s,{x,z}]}))
  return {width:raw.width,staticBlocked:new Set(raw.staticBlocked),obstacles,
    dynamicBlocked:new Set(raw.dynamicBlocked),isFree(x,z){
      const k=`${x},${z}`;return Number.isInteger(x)&&Number.isInteger(z)&&x>=-17&&x<=17&&z>=-17&&z<=17&&!this.staticBlocked.has(k)&&!this.obstacles.has(k)&&!this.dynamicBlocked.has(k)
    }}
}
async function request(url,body){
  const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
  let data
  try{data=await res.json()}catch{throw new Error(`Server returned ${res.status}. Is Python running?`)}
  if(!res.ok)throw new Error(data.detail||`HTTP ${res.status}`)
  return data
}
export class RemoteSimulation{
  constructor(){
    this.ready=false;this.running=false;this.speed=1;this.time=0;this.algorithm='astar'
    this.robots=[];this.tasks={items:[]};this.events={events:[]};this.map=mapFromState({width:36,staticBlocked:[],obstacles:[],dynamicBlocked:[]})
    this.metrics={totalDistance:0,replans:0,collisionsAvoided:0};this.visits=new Map();this.history=[]
    this.forklift={enabled:false,x:0,z:-13,direction:1};this.latestSearch=null;this.latestBenchmark=null
    this._busy=false;this._seq=0;this._lastApplied=0;this._routeKeys=new Map()
  }
  apply(raw,seq=0){
    if(seq<this._lastApplied)return
    this._lastApplied=seq
    this.ready=true;this.running=raw.running;this.speed=raw.speed;this.time=raw.time;this.algorithm=raw.algorithm
    this.map=mapFromState(raw.map)
    this.robots=raw.robots.map(r=>{
      const signature=JSON.stringify(r.route)
      if(this._routeKeys.get(r.id)?.signature===signature){r.route=this._routeKeys.get(r.id).route}
      else this._routeKeys.set(r.id,{signature,route:r.route})
      return r
    })
    this.tasks={items:raw.tasks}
    this.events={events:raw.events}
    this.metrics=raw.metrics
    this.forklift=raw.forklift
    this.visits=new Map(Object.entries(raw.visits))
    if(raw.history)this.history=raw.history
    this.latestSearch=raw.latestSearch
    this.latestBenchmark=raw.latestBenchmark
  }
  async refresh(){
    if(this._busy)return
    this._busy=true
    const seq=++this._seq
    try{const res=await fetch('/api/state',{cache:'no-store'});if(!res.ok)throw new Error(`Backend returned HTTP ${res.status}`);this.apply(await res.json(),seq);return true}
    finally{this._busy=false}
  }
  async command(action,props={}){
    const seq=++this._seq
    const data=await request('/api/command',{action,...props})
    this.apply(data.state,seq)
    return data
  }
  async loadHistory(){
    const response=await fetch('/api/history',{cache:'no-store'});if(!response.ok)throw new Error('Could not load replay history');const data=await response.json();this.history=data.history;return this.history
  }
  async compare(start,goal){
    const out=await request('/api/benchmark',{start,goal})
    this.latestBenchmark=out
    return out
  }
  stats(){return {time:this.time,completed:this.tasks.items.filter(t=>t.status==='completed').length,pending:this.tasks.items.filter(t=>t.status==='pending').length,active:this.tasks.items.filter(t=>t.status==='active').length}}
  start(){return this.command('start')}
  pause(){return this.command('pause')}
  reset(){return this.command('reset')}
  setAlgorithm(algorithm){return this.command('algorithm',{algorithm})}
  setSpeed(speed){return this.command('speed',{speed})}
  addTask(pickup,delivery,priority){return this.command('add-task',{pickup,delivery,priority})}
  addDemoTasks(){return this.command('demo')}
  obstacle(x,z){return this.command('obstacle',{x,z})}
  clearObstacles(){return this.command('clear-obstacles')}
  toggleForklift(){return this.command('forklift')}
  loadScenario(name){return this.command('scenario',{name})}
}
