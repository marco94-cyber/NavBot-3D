import * as THREE from 'three'
import {OrbitControls} from 'three/addons/controls/OrbitControls.js'
import {createWarehouse,createRobotModel,makeRouteLine} from './Warehouse.js'
export class SceneView {
 constructor(container,sim){this.sim=sim;this.container=container;this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x0c1721);this.scene.fog=new THREE.Fog(0x0c1721,45,95)
  this.camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,150);this.camera.position.set(30,32,37)
  this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.setSize(innerWidth,innerHeight);this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.17;container.append(this.renderer.domElement)
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.target.set(0,0,0);this.controls.maxPolarAngle=Math.PI*.48;this.controls.minDistance=10;this.controls.maxDistance=76
  this.scene.add(new THREE.HemisphereLight(0xc9eaff,0x34394a,2.4));const sun=new THREE.DirectionalLight(0xffead2,3.0);sun.position.set(-14,23,14);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-23;sun.shadow.camera.right=23;sun.shadow.camera.top=23;sun.shadow.camera.bottom=-23;this.scene.add(sun)
  for(const [x,z,c] of [[-12,-9,0xffa851],[9,9,0x5b9dff]]){const l=new THREE.PointLight(c,15,33);l.position.set(x,8,z);this.scene.add(l)}
  // Moving forklift visual (its occupied grid cell is controlled by Simulation).
  this.forkliftVisual=new THREE.Group()
  const amber=new THREE.MeshStandardMaterial({color:0xeea348,metalness:.35,roughness:.48})
  const darkFork=new THREE.MeshStandardMaterial({color:0x253744,metalness:.35})
  const chassis=new THREE.Mesh(new THREE.BoxGeometry(.9,.5,1.35),amber);chassis.position.y=.45;chassis.castShadow=true;this.forkliftVisual.add(chassis)
  const cab=new THREE.Mesh(new THREE.BoxGeometry(.8,.65,.6),darkFork);cab.position.set(0,.95,-.2);cab.castShadow=true;this.forkliftVisual.add(cab)
  for(const side of [-1,1]){const prong=new THREE.Mesh(new THREE.BoxGeometry(.12,.08,.55),darkFork);prong.position.set(side*.26,.17,.82);this.forkliftVisual.add(prong)}
  this.scene.add(this.forkliftVisual);this.forkliftVisual.visible=false
  this.world=createWarehouse(this.scene);this.robotMeshes=new Map();this.routes=new Map();this.selection=null;this.replayFrame=null;this.exploredMesh=null;this.comparisonLine=null;this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.editor=false;this.onGroundClick=null
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(36,36),new THREE.MeshBasicMaterial({visible:false,side:THREE.DoubleSide}));plane.rotation.x=-Math.PI/2;plane.position.y=-.08;this.scene.add(plane);this.pickPlane=plane
  this.renderer.domElement.addEventListener('click',e=>{if(!this.editor)return;const bounds=this.renderer.domElement.getBoundingClientRect();this.pointer.set((e.clientX-bounds.left)/bounds.width*2-1,-(e.clientY-bounds.top)/bounds.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);const hit=this.raycaster.intersectObject(this.pickPlane)[0];if(hit)this.onGroundClick?.(Math.round(hit.point.x),Math.round(hit.point.z))})
  addEventListener('resize',()=>this.resize());this.resize()
 }
 resize(){const w=this.container.clientWidth||innerWidth,h=this.container.clientHeight||innerHeight;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h)}
 setEditor(value){this.editor=value;this.renderer.domElement.style.cursor=value?'crosshair':'grab'}
 sync(){this.world.updateObstacles(this.sim.map)
  const f=this.sim.forklift;this.forkliftVisual.visible=f.enabled;this.forkliftVisual.position.set(f.x,0,f.z);this.forkliftVisual.rotation.y=f.direction===1?Math.PI/2:-Math.PI/2
  for(const r of this.sim.robots){let model=this.robotMeshes.get(r.id);if(!model){model=createRobotModel(r.color);this.robotMeshes.set(r.id,model);this.scene.add(model.root)}
   const replay=this.replayFrame?.robots?.find(p=>p.id===r.id)
   const next=replay?null:r.route[r.routeIndex+1];let x=replay?replay.x:r.x,z=replay?replay.z:r.z
   if(next&&r.progress>0){x+=(next.x-r.x)*r.progress;z+=(next.z-r.z)*r.progress;model.root.rotation.y=Math.atan2(next.x-r.x,next.z-r.z)}
   if(!model.initialized){model.root.position.set(x,0,z);model.initialized=true}else{model.root.position.lerp(new THREE.Vector3(x,0,z),.21)}model.cargo.visible=replay?replay.carrying:r.carrying;model.scanner.rotation.y+=.045
   if(model.lastRouteRef!==r.route||model.lastRouteIndex!==r.routeIndex){
    const previous=this.routes.get(r.id);if(previous){this.scene.remove(previous);previous.geometry.dispose();previous.material.dispose()}
    const route=makeRouteLine(r.route.slice(r.routeIndex),r.color);if(route){this.scene.add(route);this.routes.set(r.id,route)}else this.routes.delete(r.id)
    model.lastRouteRef=r.route;model.lastRouteIndex=r.routeIndex
   }
  }
 }
 showSearch(result){
  this.clearSearch()
  if(!result?.found)return
  const sampled=result.visitedOrder.slice(0,650)
  const geometry=new THREE.BoxGeometry(.84,.012,.84)
  const material=new THREE.MeshBasicMaterial({color:0x43dce9,transparent:true,opacity:.32,depthWrite:false})
  const mesh=new THREE.InstancedMesh(geometry,material,sampled.length)
  const helper=new THREE.Object3D()
  sampled.forEach((p,i)=>{helper.position.set(p.x,-.052,p.z);helper.updateMatrix();mesh.setMatrixAt(i,helper.matrix)})
  mesh.count=0;mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false
  this.scene.add(mesh);this.exploredMesh=mesh
  this.comparisonLine=makeRouteLine(result.path,0x8fffbc)
  if(this.comparisonLine)this.scene.add(this.comparisonLine)
 }
 clearSearch(){if(this.exploredMesh){this.scene.remove(this.exploredMesh);this.exploredMesh.geometry.dispose();this.exploredMesh.material.dispose();this.exploredMesh=null}
  if(this.comparisonLine){this.scene.remove(this.comparisonLine);this.comparisonLine.geometry.dispose();this.comparisonLine.material.dispose();this.comparisonLine=null}}
 render(){if(this.exploredMesh)this.exploredMesh.count=Math.min(this.exploredMesh.instanceMatrix.count,this.exploredMesh.count+5);this.controls.update();this.renderer.render(this.scene,this.camera)}
 setReplay(frame){this.replayFrame=frame}
 focusRobot(id){const r=this.sim.robots.find(r=>r.id===id);if(!r)return;this.controls.target.set(r.x,0,r.z);this.camera.position.set(r.x+12,14,r.z+16)}
 overview(){this.controls.target.set(0,0,0);this.camera.position.set(30,32,37)}
}
