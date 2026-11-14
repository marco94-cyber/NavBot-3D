import './style.css'
import {RemoteSimulation} from './core/RemoteSimulation.js'
import {Dashboard} from './ui/Dashboard.js'
import {SceneView} from './world/SceneView.js'

const sim=new RemoteSimulation()
const dashboard=new Dashboard(sim,null)
const view=new SceneView(document.getElementById('scene-container'),sim)
dashboard.scene=view
dashboard.attach()
let lastUI=0
function animate(now){
  requestAnimationFrame(animate)
  view.sync()
  view.render()
  if(now-lastUI>180){lastUI=now;dashboard.update()}
}
requestAnimationFrame(animate)

// Server state is authoritative. Never calculate routes or advance tasks on the client.
let online=true
async function sync(){
  try{
    await sim.refresh()
    if(!online){online=true;dashboard.toast('Python AI backend reconnected')}
  }catch(e){
    if(online){online=false;dashboard.toast('Python backend unavailable. Start START_WINDOWS.bat or see README.')}
    document.getElementById('robotStatus').textContent='Python backend offline'
  }
}
sync()
setInterval(sync,110)
