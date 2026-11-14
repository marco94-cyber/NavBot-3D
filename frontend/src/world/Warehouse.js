import * as THREE from 'three'
import {RACKS,BASE_OBSTACLES,ZONES,WIDTH} from '../core/GridMap.js'
const mat=(hex,metal=0,rough=.7)=>new THREE.MeshStandardMaterial({color:hex,metalness:metal,roughness:rough})
const concrete=mat(0x344450,.04,.95),black=mat(0x13232f,.5),metal=mat(0x667781,.55),orange=mat(0xf08c33,.4),cardboards=[mat(0xac7847),mat(0xc49760),mat(0xd0ae80)],teal=mat(0x3fe7e6,.2),red=mat(0xff4e65,.15)
const add=(parent,geo,m,x,y,z,shadow=true)=>{const a=new THREE.Mesh(geo,m);a.position.set(x,y,z);a.castShadow=shadow;a.receiveShadow=true;parent.add(a);return a}
const cube=(p,m,x,y,z,w,h,d,sh=true)=>add(p,new THREE.BoxGeometry(w,h,d),m,x,y,z,sh)
export function createWarehouse(scene){
 const root=new THREE.Group();scene.add(root)
 const floor=add(root,new THREE.PlaneGeometry(WIDTH,WIDTH),concrete,0,-.12,0,false);floor.rotation.x=-Math.PI/2
 const seams=new THREE.LineBasicMaterial({color:0x60717c,transparent:true,opacity:.19});for(let n=-18;n<=18;n+=3){for(const points of [[[-18,-.101,n],[18,-.101,n]],[[n,-.10,-18],[n,-.10,18]]])root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),seams))}
 // Suspended yellow lane stripes, low enough not to obstruct path glows.
 const yellow=mat(0xd9a23a,.05,.6);for(const p of [-16,-8,0,8,16]){cube(root,yellow,0,-.083,p,34,.012,.065,false);cube(root,yellow,p,-.082,0,.065,.012,34,false)}
 const wall=mat(0x263848,.18,.88);cube(root,wall,0,2,-18.3,36.5,4,.4);cube(root,wall,-18.3,2,0,.4,4,36.5)
 const rackDeck=mat(0x526879,.4),tape=mat(0xe7cf97)
 function rack(s){const {x,z,w,d}=s,h=3.6
  for(const xx of [-1,1])for(const zz of [-1,1])cube(root,orange,x+xx*(w/2-.065),h/2,z+zz*(d/2-.065),.13,h,.13)
  for(let tier=0;tier<3;tier++){const y=.55+tier*1.02;cube(root,rackDeck,x,y,z,w-.13,.13,d-.14)
   for(let j=0;j<3;j++){const boxX=x+(j-1)*(w/3);const size=.54+((j+tier)%2)*.18;const box=cube(root,cardboards[(tier+j)%3],boxX,y+size*.5+.07,z,size,size,size*.9);cube(root,tape,boxX,y+size+.075,z,.085,.012,size*.9,false)}
   for(const zz of [-1,1])cube(root,metal,x,y-.065,z+zz*(d/2-.05),w,.095,.11)
  }
 }
 RACKS.forEach(rack)
 // Painted hazard area
 for(const o of BASE_OBSTACLES){const g=add(root,new THREE.PlaneGeometry(o.w,o.d),new THREE.MeshBasicMaterial({color:0xed3c59,transparent:true,opacity:.35,side:THREE.DoubleSide}),o.x,-.055,o.z,false);g.rotation.x=-Math.PI/2
  const ring=add(root,new THREE.RingGeometry(.7,.78,32),new THREE.MeshBasicMaterial({color:0xff6979,side:THREE.DoubleSide}),o.x,-.045,o.z,false);ring.rotation.x=-Math.PI/2}
 const markerColors={'Pickup A':0x3ce5ec,'Pickup B':0x3ce5ec,'Pickup C':0x3ce5ec,'Inbound Dock':0x3ce5ec,'Delivery A':0xffba61,'Delivery B':0xffba61,'Delivery C':0xffba61,'Outbound Dock':0xffba61,'Charger A':0x47eda8,'Charger B':0x47eda8}
 const markers=[]
 for(const [name,[x,z]] of Object.entries(ZONES)){
  const c=markerColors[name]
  const disc=add(root,new THREE.CylinderGeometry(.44,.44,.035,28),new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:.5,metalness:.2}),x,-.035,z,false)
  const halo=add(root,new THREE.RingGeometry(.51,.58,32),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.9,side:THREE.DoubleSide}),x,-.012,z,false);halo.rotation.x=-Math.PI/2
  markers.push(halo)
  if(name.startsWith('Charger')){cube(root,metal,x,.7,z-1,1.4,1.3,.4);cube(root,new THREE.MeshStandardMaterial({color:0x39f29f,emissive:0x25ee93,emissiveIntensity:1}),x,.8,z-.78,.85,.68,.06,false)}
 }
 const obstacles=new Map();const obstacleMaterial=mat(0xff4b67,.3)
 function updateObstacles(map){for(const [k,mesh] of obstacles){if(!map.obstacles.has(k)){root.remove(mesh);mesh.geometry.dispose();obstacles.delete(k)}}for(const [k,o] of map.obstacles){if(obstacles.has(k))continue;const mesh=cube(root,obstacleMaterial,o.x,.55,o.z,.88,1.1,.88);obstacles.set(k,mesh)}}
 // A couple of realistic loading bays
 for(const x of [-14,14]){const p=cube(root,black,x,-.05,14,3.4,.11,2,false);cube(root,orange,x,.24,14,2.8,.24,.15)}
 return {root,markers,updateObstacles,dispose(){scene.remove(root)}}
}
export function createRobotModel(color){const root=new THREE.Group();const white=mat(0xe4edf3,.2,.3),dark=mat(0x1b2c36,.35,.4)
 cube(root,white,0,.36,0,1.05,.42,1.22);cube(root,dark,0,.61,-.07,.8,.1,.9)
 const blue=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:1.15,metalness:.3,roughness:.22})
 cube(root,blue,0,.4,.65,.56,.075,.035,false);for(const x of [-.46,.46])for(const z of [-.43,.43]){
  const w=add(root,new THREE.CylinderGeometry(.17,.17,.12,16),dark,x,.18,z);w.rotation.z=Math.PI/2
  const hub=add(root,new THREE.CylinderGeometry(.065,.065,.125,12),blue,x*1.04,.18,z);hub.rotation.z=Math.PI/2
 }
 const scanner=add(root,new THREE.CylinderGeometry(.17,.17,.13,20),blue,0,.78,-.07)
 const cargo=cube(root,mat(0xc59459),0,.88,0,.45,.35,.5);cargo.visible=false
 return {root,scanner,cargo}
}
export function makeRouteLine(points,color){if(points.length<2)return null;const g=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(p.x,.08,p.z)));const m=new THREE.LineDashedMaterial({color,dashSize:.33,gapSize:.18,transparent:true,opacity:.85});const l=new THREE.Line(g,m);l.computeLineDistances();return l}
