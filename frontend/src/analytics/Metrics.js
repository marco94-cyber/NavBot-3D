export function downloadText(name,text,type='text/plain'){
  const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500)
}
export function exportTasksCsv(sim){
  const lines=['id,pickup,delivery,priority,status,robotId,createdAt,completedAt']
  for(const t of sim.tasks.items)lines.push([t.id,`"${t.pickup.join(',')}"`,`"${t.delivery.join(',')}"`,t.priority,t.status,t.robotId||'',t.createdAt,t.completedAt??''].join(','))
  return lines.join('\n')
}
