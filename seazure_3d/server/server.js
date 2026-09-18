import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const app=express();
const client=path.join(__dirname,"..","client");
app.use(express.static(client));
app.get("*",(_,res)=>res.sendFile(path.join(client,"index.html")));

const server=http.createServer(app);
const wss=new WebSocketServer({server});
const rooms=new Map();

function send(ws,o){if(ws.readyState===1)ws.send(JSON.stringify(o));}
function pub(p){return {id:p.id,name:p.name,team:p.team,classId:p.classId,ready:p.ready};}
function broadcast(room,o){for(const p of room.players)send(p.ws,o);}
function code(){let c;do c=Math.random().toString(36).slice(2,8).toUpperCase();while(rooms.has(c));return c;}

wss.on("connection",ws=>{
 const p={ws,id:crypto.randomUUID(),name:"Player",team:"ATTACK",classId:1,ready:false,room:null,x:0,y:1.6,z:0,rot:0};
 send(ws,{type:"connected",id:p.id});

 ws.on("message",raw=>{
  let m;try{m=JSON.parse(raw)}catch{return}
  if(m.type==="create"){
   const c=code();const room={code:c,host:p.id,players:[],settings:{rounds:5,roundTime:180,prepTime:30},round:1,phase:"lobby",scores:{ATTACK:0,DEFENSE:0}};
   rooms.set(c,room);p.room=c;p.name=String(m.name||"Player").slice(0,20);room.players.push(p);
   send(ws,{type:"room",code:c,host:true,players:room.players.map(pub),settings:room.settings});return;
  }
  if(m.type==="join"){
   const r=rooms.get(String(m.code||"").toUpperCase());
   if(!r||r.players.length>=10){send(ws,{type:"error",message:"Room unavailable or full."});return}
   p.room=r.code;p.name=String(m.name||"Player").slice(0,20);
   p.team=r.players.filter(x=>x.team==="ATTACK").length<=r.players.filter(x=>x.team==="DEFENSE").length?"ATTACK":"DEFENSE";
   r.players.push(p);broadcast(r,{type:"room",code:r.code,host:r.host===p.id,players:r.players.map(pub),settings:r.settings});return;
  }
  if(!p.room)return;const r=rooms.get(p.room);if(!r)return;
  if(m.type==="ready"){p.ready=!!m.value;broadcast(r,{type:"room",code:r.code,host:r.host===p.id,players:r.players.map(pub),settings:r.settings});}
  if(m.type==="settings"&&r.host===p.id){r.settings={...r.settings,...m.value};broadcast(r,{type:"room",code:r.code,host:true,players:r.players.map(pub),settings:r.settings});}
  if(m.type==="start"&&r.host===p.id){
   r.phase="prep";r.round=1;r.scores={ATTACK:0,DEFENSE:0};broadcast(r,{type:"match",phase:"prep",round:r.round,scores:r.scores,settings:r.settings});
  }
  if(m.type==="state"){
   p.x=Number(m.x)||0;p.y=Number(m.y)||1.6;p.z=Number(m.z)||0;p.rot=Number(m.rot)||0;
   broadcast(r,{type:"player_state",player:pub(p),x:p.x,y:p.y,z:p.z,rot:p.rot});
  }
  if(m.type==="fire"){broadcast(r,{type:"shot",player:p.id,x:p.x,y:p.y,z:p.z,rot:p.rot});}
  if(m.type==="round_end"&&r.host===p.id){
   const winner=m.winner==="DEFENSE"?"DEFENSE":"ATTACK";r.scores[winner]++;
   r.round++;r.phase="prep";
   broadcast(r,{type:"round",round:r.round,scores:r.scores,phase:"prep",winner});
  }
 });
 ws.on("close",()=>{
  if(!p.room)return;const r=rooms.get(p.room);if(!r)return;
  r.players=r.players.filter(x=>x.id!==p.id);
  if(!r.players.length)rooms.delete(r.code);else{if(r.host===p.id)r.host=r.players[0].id;broadcast(r,{type:"room",code:r.code,host:r.host===p.id,players:r.players.map(pub),settings:r.settings});}
 });
});
server.listen(Number(process.env.PORT||3000),()=>console.log("Seazure 3D server ready"));
