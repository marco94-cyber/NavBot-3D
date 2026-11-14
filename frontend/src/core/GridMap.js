// Visual-only warehouse constants matching backend/core/grid.py.
// No pathfinding is executed here. The backend sends authoritative occupancy.
export const WIDTH=36
export const ZONES=Object.freeze({
  'Inbound Dock':[-14,-14],'Pickup A':[-5,-5],'Pickup B':[-5,6],'Pickup C':[5,-5],
  'Delivery A':[5,6],'Delivery B':[14,13],'Delivery C':[-14,13],
  'Outbound Dock':[14,-11],'Charger A':[-14,0],'Charger B':[14,0]
})
export const RACKS=Object.freeze([
  ...[-10,-3,4,11].flatMap(z=>[-10,10].map(x=>({x,z,w:3.6,d:2.1}))),
  ...[-5,5].flatMap(x=>[-11,11].map(z=>({x,z,w:3,d:2.2})))
])
export const BASE_OBSTACLES=Object.freeze([{x:3,z:-3,w:2,d:2,type:'hazard'}])
