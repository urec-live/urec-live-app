const {Client}=require('@stomp/stompjs');
const SockJS=require('sockjs-client');
const origin=process.env.UREC_MAP_SMOKE_ORIGIN || 'http://localhost:8080';
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) throw Error('This smoke test only runs against the isolated local demo');
const base=origin+'/api';
async function api(path,token,body,method=body?'POST':'GET') {
 const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});
 if(!r.ok)throw Error(`${method} ${path}: ${r.status}`);return r.json();
}
(async()=>{
 const member=await api('/auth/login',null,{username:'mapmember',password:'MapDemo2026!'});
 const admin=await api('/auth/login',null,{username:'mapadmin',password:'MapDemo2026!'});
 const gym=await api('/users/me/gym',member.accessToken);
 const machines=await api('/machines',member.accessToken);
 const m=machines.find(m=>m.name==='Treadmill 1');
 const events=[];
 const client=new Client({webSocketFactory:()=>new SockJS(origin+'/ws'),connectHeaders:{Authorization:`Bearer ${member.accessToken}`},reconnectDelay:0});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('STOMP connect timeout')),10000);client.onConnect=()=>{client.subscribe(`/topic/gyms/${gym.id}/machines`,e=>events.push(JSON.parse(e.body)));clearTimeout(timer);resolve();};client.onStompError=f=>reject(Error(f.body));client.activate();});
 for(const status of ['In Use','Available','Reserved','Out of Order','Available']){
   const startIndex=events.length;
   await api(`/admin/equipment/${m.id}`,admin.accessToken,{status},'PUT');
   await new Promise((resolve,reject)=>{const started=Date.now();const timer=setInterval(()=>{if(events.slice(startIndex).some(e=>e.id===m.id&&e.status===status)){clearInterval(timer);resolve();}else if(Date.now()-started>5000){clearInterval(timer);reject(Error(`No ${status} broadcast`));}},50);});
   const read=await api(`/machines/${m.id}`,member.accessToken);if(read.status!==status)throw Error('Snapshot mismatch');
   console.log(`Verified member WebSocket and snapshot: ${status}`);
 }
 await client.deactivate();console.log(`PASS: ${machines.length} equipment, gym ${gym.id}, all status transitions received`);
})().catch(e=>{console.error(e.message);process.exit(1);});
