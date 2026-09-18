const A=[
 ["Sketcher","Balanced","Reliable crayon launcher"],
 ["Marker","Speed","Fast movement and quick reload"],
 ["Eraser","Utility","Removes enemy gadgets"],
 ["Sprayer","Control","Wide colorful crayon spread"],
 ["Highlighter","Recon","Briefly reveals opponents"],
 ["Crayonner","Heavy","Slow but powerful shots"]
];
const D=[
 ["Builder","Defense","Deploys a cover wall"],
 ["Sticker","Trap","Places a sticky slowing pad"],
 ["Sharpener","Control","Creates a defensive hazard"],
 ["Painter","Area","Covers ground with paint"],
 ["Glue","Control","Briefly immobilizes an enemy"],
 ["Doodler","Recon","Deploys a lookout camera"]
];
let ws=null,me="",room="",host=false,team="ATTACK",selected=0,inMatch=false,ammo=12;
let scene,camera,renderer,clock,keys=new Set(),yaw=0,pitch=0,objects=[],players=new Map(),lastSend=0,roundTime=180,phase="prep",timerStart=0;

function screen(id){document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));if(id)document.getElementById(id).classList.add("active")}
function connect(){if(ws&&ws.readyState<=1)return;const p=location.protocol==="https:"?"wss:":"ws:";ws=new WebSocket(`${p}//${location.host}`);ws.onmessage=e=>handle(JSON.parse(e.data))}
function send(o){if(ws?.readyState===1)ws.send(JSON.stringify(o))}
function handle(m){
 if(m.type==="connected")me=m.id;
 if(m.type==="room"){room=m.code;host=m.host;document.getElementById("code").textContent=room;renderLobby(m.players);if(m.settings){roundTime=m.settings.roundTime||180;document.getElementById("roundTime").value=roundTime}}
 if(m.type==="match"){phase=m.phase;document.getElementById("score").textContent=`${m.scores.ATTACK} - ${m.scores.DEFENSE}`;showClasses();startRoundTimer()}
 if(m.type==="round"){phase=m.phase;document.getElementById("score").textContent=`${m.scores.ATTACK} - ${m.scores.DEFENSE}`;showClasses();startRoundTimer()}
 if(m.type==="player_state")updateRemote(m);
 if(m.type==="shot")remoteShot(m);
 if(m.type==="error")alert(m.message)
}
function renderLobby(list){document.getElementById("list").innerHTML=list.map(p=>`<div class="player">${p.name} — ${p.team} ${p.ready?"✓":""}</div>`).join("")}
function showClasses(){
 screen("class");const data=team==="ATTACK"?A:D;const box=document.getElementById("classes");box.className="classgrid";
 box.innerHTML=data.map((c,i)=>`<div class="classcard ${i===selected?"selected":""}" data-i="${i}"><b>${i+1}. ${c[0]}</b><small>${c[1]}</small><small>${c[2]}</small></div>`).join("");
 box.querySelectorAll(".classcard").forEach(x=>x.onclick=()=>{selected=Number(x.dataset.i);showClasses()})
}
document.getElementById("create").onclick=()=>{connect();send({type:"create",name:"Player"}) ;screen("lobby")};
document.getElementById("join").onclick=()=>{const c=prompt("Room code?");if(!c)return;connect();send({type:"join",code:c,name:"Player"});screen("lobby")};
document.getElementById("ready").onclick=()=>send({type:"ready",value:true});
document.getElementById("start").onclick=()=>{if(!host)return alert("Only the host can start.");send({type:"settings",value:{rounds:+document.getElementById("rounds").value,roundTime:+document.getElementById("roundTime").value}});send({type:"start"})};
document.getElementById("enter").onclick=()=>{team=team||"ATTACK";screen(null);inMatch=true;init3D();requestPointer()};
document.getElementById("practice").onclick=()=>{team="ATTACK";showClasses()};
document.querySelectorAll(".back").forEach(b=>b.onclick=()=>screen("menu"));

addEventListener("keydown",e=>{keys.add(e.key.toLowerCase());if(e.key>="1"&&e.key<="6"){selected=+e.key-1;if(document.getElementById("class").classList.contains("active"))showClasses()}if(e.key.toLowerCase()==="r")ammo=12});
addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));
addEventListener("mousedown",e=>{if(inMatch&&e.button===0){if(document.pointerLockElement!==document.body){requestPointer();return}fire()}});
addEventListener("mousemove",e=>{if(document.pointerLockElement===document.body){yaw-=e.movementX*.0022;pitch-=e.movementY*.0022;pitch=Math.max(-1.45,Math.min(1.45,pitch))}});
function requestPointer(){document.body.requestPointerLock?.()}

function init3D(){
 if(scene)return;
 scene=new THREE.Scene();scene.background=new THREE.Color(0x9edcff);
 camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.05,500);
 renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);document.body.appendChild(renderer.domElement);
 const amb=new THREE.HemisphereLight(0xffffff,0x887766,2.2);scene.add(amb);
 const sun=new THREE.DirectionalLight(0xffffff,2.5);sun.position.set(20,30,10);scene.add(sun);
 buildMap();clock=new THREE.Clock();camera.position.set(0,1.6,12);animate()
}
function mat(c){return new THREE.MeshStandardMaterial({color:c,roughness:.82})}
function cube(x,y,z,sx,sy,sz,c){const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat(c));m.position.set(x,y,z);scene.add(m);objects.push(m);return m}
function buildMap(){
 cube(0,-.25,0,44,.5,34,0xf0d29d);
 cube(0,2,-17,44,4,.5,0xd7b477);cube(-22,2,0,.5,4,34,0xd7b477);cube(22,2,0,.5,4,34,0xd7b477);
 cube(0,2,17,44,4,.5,0xd7b477);
 // interior walls with doors/openings
 cube(-9,2,-5,.5,4,16,0xbda4d6);cube(9,2,-5,.5,4,16,0xbda4d6);
 cube(0,2,-10,18,4,.5,0xbda4d6);
 cube(-14,2,7,10,4,.5,0xbda4d6);cube(14,2,7,10,4,.5,0xbda4d6);
 // objective
 const site=cube(0,.05,-4,5,.1,5,0xffdf55);site.userData.objective=true;
 for(let i=0;i<5;i++)cube(-8+i*4,.6,5,1,1.2,1,0xffffff);
 // breachable wall
 const breach=cube(0,2,2,8,4,.35,0x8cc7f0);breach.userData.breachable=true;
}
function animate(){
 requestAnimationFrame(animate);if(!scene)return;
 const dt=Math.min(clock.getDelta(),.05);
 if(inMatch)updatePlayer(dt);
 renderer.render(scene,camera);
}
function updatePlayer(dt){
 let speed=keys.has("shift")?7:4.5;let f=0,r=0;
 if(keys.has("w"))f++;if(keys.has("s"))f--;if(keys.has("d"))r++;if(keys.has("a"))r--;
 const len=Math.hypot(f,r)||1;f/=len;r/=len;
 const dx=(Math.sin(yaw)*f+Math.cos(yaw)*r)*speed*dt;
 const dz=(Math.cos(yaw)*f-Math.sin(yaw)*r)*speed*dt;
 camera.position.x+=dx;camera.position.z+=dz;
 camera.position.x=Math.max(-20,Math.min(20,camera.position.x));camera.position.z=Math.max(-15,Math.min(15,camera.position.z));
 camera.rotation.order="YXZ";camera.rotation.y=yaw;camera.rotation.x=pitch;
 lastSend+=dt;if(lastSend>.05){lastSend=0;send({type:"state",x:camera.position.x,y:1.6,z:camera.position.z,rot:yaw})}
}
function fire(){
 if(ammo<=0)return;ammo--;document.getElementById("ammo").textContent=ammo;send({type:"fire"});
 const dir=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
 const ball=new THREE.Mesh(new THREE.SphereGeometry(.12,10,8),mat(0xff5b72));ball.position.copy(camera.position);scene.add(ball);
 let life=0;const v=dir.multiplyScalar(35);const tick=()=>{ball.position.addScaledVector(v,.016);life+=.016;if(life<1.4){requestAnimationFrame(tick)}else scene.remove(ball)};tick();
 confetti(camera.position.x+dir.x*3,camera.position.y+dir.y*3,camera.position.z+dir.z*3);
}
function confetti(x,y,z){
 for(let i=0;i<18;i++){const m=cube(x,y,z,.08,.08,.08,new THREE.Color().setHSL(Math.random(),.85,.6).getHex());let t=0;const vy=.04+Math.random()*.08;const vx=(Math.random()-.5)*.12,vz=(Math.random()-.5)*.12;const q=()=>{m.position.x+=vx;m.position.y+=vy-.06*t;m.position.z+=vz;t+=.03;if(t<1)requestAnimationFrame(q);else scene.remove(m)};q()}
}
function remoteShot(m){if(m.player===me)return;const p=players.get(m.player);if(p)confetti(p.position.x,p.position.y,p.position.z)}
function updateRemote(m){
 if(m.player.id===me)return;
 let p=players.get(m.player.id);
 if(!p){p=new THREE.Mesh(new THREE.CapsuleGeometry(.35,.9,4,8),mat(m.player.team==="ATTACK"?0x5c6cff:0xff8c42));scene.add(p);players.set(m.player.id,p)}
 p.position.set(m.x,m.y-.55,m.z)
}
function startRoundTimer(){timerStart=performance.now();setInterval(()=>{if(!inMatch)return;const left=Math.max(0,roundTime-Math.floor((performance.now()-timerStart)/1000));document.getElementById("timer").textContent=`${String(Math.floor(left/60)).padStart(2,"0")}:${String(left%60).padStart(2,"0")}`},250)}
