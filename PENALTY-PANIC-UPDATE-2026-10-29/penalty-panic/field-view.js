(function(root){
  'use strict';
  const P=root.Panic;
  const line=(c,x,y,xx,yy,color,width=1)=>{c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.stroke();};
  const oval=(c,x,y,rx,ry,color)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();};
  const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  function camera(r){
    const portrait=r.width<650&&r.height>r.width*.85;
    const scale=Math.min(r.width/(portrait?740:1140),r.height/(portrait?1140:740));
    return {portrait,scale,x:r.width/2,y:r.height/2};
  }
  function project(v,x,y){return v.portrait?{x:v.x+(y-300)*v.scale,y:v.y-(x-500)*v.scale}:{x:v.x+(x-500)*v.scale,y:v.y+(y-300)*v.scale};}
  function fieldPoint(r,e){const v=camera(r),b=r.canvas.getBoundingClientRect(),x=(e.clientX-b.left-v.x)/v.scale,y=(e.clientY-b.top-v.y)/v.scale;return v.portrait?{x:500-y,y:300+x}:{x:500+x,y:300+y};}
  function fieldVector(r,x,y){return camera(r).portrait?{x:-y,y:x}:{x,y};}
  function world(c,v){c.translate(v.x,v.y);if(v.portrait)c.rotate(-Math.PI/2);c.scale(v.scale,v.scale);c.translate(-500,-300);}
  function pitch(c,v,theme=0){
    c.save();world(c,v);rect(c,-100,-100,1200,800,theme===1?'#3c3543':theme===2?'#143c35':'#112631');
    for(const y of [-61,661]){
      rect(c,-65,y-11,1130,24,'#1a3548');
      for(let i=0;i<138;i++){const x=i*8-45;line(c,x,y,x+1,y+5,['#687b85','#867d64','#638885','#786883'][i%4],3);oval(c,x,y-2,1.9,2,'#b6a38c');}
    }
    const grass=c.createLinearGradient(0,0,0,600);grass.addColorStop(0,'#367451');grass.addColorStop(.5,'#41845a');grass.addColorStop(1,'#295c43');c.fillStyle=grass;c.fillRect(0,0,1000,600);
    for(let i=0;i<10;i++)if(i%2===0)rect(c,i*100,0,100,600,'#b4d7a710');
    for(let i=0;i<530;i++){const x=i*83%1000,y=i*137%600;line(c,x,y,x+1.4,y-3,i%2?'#cde8bb13':'#0d392026',.75);}
    const glow=c.createRadialGradient(500,280,10,500,280,620);glow.addColorStop(0,'#dcf4c719');glow.addColorStop(1,'#0b263a25');c.fillStyle=glow;c.fillRect(0,0,1000,600);
    const chalk='#eff6debb';c.strokeStyle=chalk;c.lineWidth=2.1;c.strokeRect(0,0,1000,600);line(c,500,0,500,600,chalk,2.1);
    c.beginPath();c.arc(500,300,78,0,Math.PI*2);c.stroke();oval(c,500,300,3.2,3.2,chalk);
    for(const side of [0,1]){
      const x=side?1000:0,d=side?-1:1;
      line(c,x,125,x+d*155,125,chalk,2);line(c,x+d*155,125,x+d*155,475,chalk,2);line(c,x+d*155,475,x,475,chalk,2);
      line(c,x,220,x+d*57,220,chalk,2);line(c,x+d*57,220,x+d*57,380,chalk,2);line(c,x+d*57,380,x,380,chalk,2);
      oval(c,x+d*108,300,3,3,chalk);
      c.beginPath();c.arc(x+d*108,300,78,side?Math.PI-.92:-.92,side?Math.PI+.92:.92);c.stroke();
      rect(c,side?1000:-35,220,35,160,'#b7dbe22b');
      for(let yy=220;yy<=380;yy+=10)line(c,x,yy,x-d*35,yy,'#d7e9eb55',.8);
      for(let xx=0;xx<=35;xx+=8)line(c,x-d*xx,220,x-d*xx,380,'#d7e9eb55',.8);
      line(c,x-d*35,220,x-d*35,380,'#8fa4ae',2);line(c,x,220,x-d*35,220,'#dce6e4',3);line(c,x,380,x-d*35,380,'#dce6e4',3);
      line(c,x,220,x,380,'#f6f8ec',4);
    }
    for(const x of [0,1000])for(const y of [0,600]){line(c,x,y,x,y-15,'#f8efbc',2);rect(c,x,y-20,x? -10:10,6,'#d8b765');}
    for(const y of [-29,620]){
      rect(c,-25,y,1050,10,'#243e66');for(let i=0;i<7;i++){c.fillStyle=i%2?'#d5c081':'#a8bcd8';c.font='700 6px Arial';c.textAlign='center';c.fillText(i%2?'PENALTY PANIC':'ONE TEAM. ALL HEART.',i*155+45,y+7);}
    }
    for(const x of [-35,1035])for(const y of [-35,635]){
      const light=c.createRadialGradient(x,y,0,x,y,170);light.addColorStop(0,'#f5efb126');light.addColorStop(1,'#f5efb100');oval(c,x,y,170,170,light);
    }
    // Gold paint marks the attacking end, even when the phone camera rotates.
    line(c,1007,225,1007,375,'#f5cf7955',12);c.restore();
  }
  function divingKeeper(c,p,point,v,look){
    const pose=P.fieldKeeperPose(p),w=pose.weight,s=v.scale*1.3;
    const d=v.portrait?{x:pose.dir.y,y:-pose.dir.x}:pose.dir,n={x:-d.y,y:d.x};
    const at=(x,y,along,across=0)=>({x:x*(1-w)+(d.x*along+n.x*across)/1.3*w,y:y*(1-w)+((d.y*along+n.y*across)/1.3-3)*w});
    const hip=at(0,-12,0),shoulder=at(0,-24,8),head=at(0,-35,15);
    const stroke=(a,b,color,width)=>line(c,a.x,a.y,b.x,b.y,color,width);
    c.save();c.translate(point.x,point.y);c.scale(s,s);
    oval(c,1,2,12+w*7,4+w*4,'#061a244a');
    for(const side of [-1,1]){
      const knee=at(side*4,-7,-8,side*4),foot=at(side*4,0,-18,side*5);
      stroke(hip,knee,look.short,6);stroke(knee,foot,look.sock,3.8);line(c,foot.x-2,foot.y,foot.x+2,foot.y,look.boot,3.4);
      const elbow=at(side*10,-20,14,side*6),hand=at(side*10,-18,22,side*4);
      stroke(shoulder,elbow,look.kit,5);stroke(elbow,hand,look.kit,3.2);
      c.save();c.translate(hand.x,hand.y);c.rotate(Math.atan2(d.y,d.x)*w);
      c.beginPath();c.moveTo(-3,-2);c.quadraticCurveTo(1,-4,4,-2);c.lineTo(4,1);c.quadraticCurveTo(1,3,-2,2);c.lineTo(-4,3);c.lineTo(-4,1);c.closePath();c.fillStyle=look.gloves;c.fill();line(c,-3,-1,-3,2,look.trim,1.1);c.restore();
    }
    stroke(hip,shoulder,look.kit,13);stroke(hip,shoulder,look.trim,1.2);
    stroke(shoulder,head,look.skin,3);
    c.save();c.translate(head.x,head.y);c.rotate((Math.atan2(d.y,d.x)+Math.PI/2)*w);c.scale(.56,.56);
    P.drawPlayerHead(c,0,0,false,look.headband?{variant:1,color:look.headband}:null,look,p.id);c.restore();
    c.fillStyle='#fff9df';c.font='800 7px Arial';c.textAlign='center';c.fillText('1',(hip.x+shoulder.x)/2,(hip.y+shoulder.y)/2+2);
    c.restore();
  }
  function footballer(c,p,point,v,look,selected,number){
    if(p.keeper&&p.dive){divingKeeper(c,p,point,v,look);return;}
    const s=v.scale*1.3,run=Math.min(1,Math.hypot(p.vx,p.vy)/110),step=Math.sin(p.anim)*run,kick=p.kick>0?Math.sin(p.kick/.24*Math.PI):0;
    const vx=v.portrait?p.vy:p.vx,vy=v.portrait?-p.vx:p.vy;
    c.save();c.translate(point.x,point.y);c.scale(s,s);
    oval(c,2,2,12,4,'#061a244a');
    if(selected){c.strokeStyle='#f2d287';c.lineWidth=1.5;c.beginPath();c.ellipse(0,2,15,6,0,0,Math.PI*2);c.stroke();}
    const tilt=P.clamp(vx/190,-.8,.8),hipY=-14;
    for(const side of [-1,1]){
      const kneeX=side*4+step*side*2,kneeY=-7+step*side*2,footX=side*4+step*side*4+kick*(side>0?8:0),footY=step*side*3-kick*(side>0?4:0);
      line(c,side*4,hipY,kneeX,kneeY,look.short,6);line(c,kneeX,kneeY,footX,footY,look.sock,3.8);
      line(c,footX-1,footY,footX+3,footY+1,look.boot,3.2);
    }
    c.save();c.translate(tilt,-20);c.rotate(tilt*.09);
    for(const side of [-1,1]){
      const handX=side*10+step*side*2,handY=2-step*side*5-kick*side*2;
      line(c,side*7,-4,side*10,0,look.kit,5);line(c,side*10,0,handX,handY,p.keeper?look.kit:look.skin,3);
      if(p.keeper){oval(c,handX,handY,2.8,3.3,look.gloves);}else oval(c,handX,handY,1.8,2.3,look.skin);
    }
    const shade=c.createLinearGradient(-8,-7,8,8);shade.addColorStop(0,look.kit);shade.addColorStop(.5,look.kit);shade.addColorStop(1,'#223448');
    c.beginPath();c.moveTo(-7,-7);c.quadraticCurveTo(0,-10,7,-7);c.quadraticCurveTo(9,0,6,9);c.quadraticCurveTo(0,11,-6,9);c.quadraticCurveTo(-9,0,-7,-7);c.fillStyle=shade;c.fill();
    line(c,-5,-5,5,-5,look.trim,1.5);
    if(look.pattern==='sash')line(c,-5,-4,5,8,look.trim,2.6);
    if(look.pattern==='stripes')for(const x of [-4,0,4])line(c,x,-5,x,8,look.trim,1.2);
    if(look.pattern==='hoops')for(const y of [-2,3,7])line(c,-6,y,6,y,look.trim,1.2);
    if(look.pattern==='halves')line(c,3,-4,3,7,look.trim,4);
    c.fillStyle='#fff9df';c.font='800 7px Arial';c.textAlign='center';c.fillText(String(number),0,5);
    line(c,0,-9,0,-13,look.skin,3.5);
    c.save();c.translate(0,-15);c.scale(.56,.56);
    P.drawPlayerHead(c,0,0,vy<0,look.headband?{variant:1,color:look.headband}:null,look,p.id);c.restore();
    c.restore();
    if(selected){c.fillStyle='#f3d28a';c.beginPath();c.moveTo(0,-40);c.lineTo(-4,-46);c.lineTo(4,-46);c.closePath();c.fill();}
    c.restore();
  }
  function drawField(r,g,save,clock){
    const c=r.ctx;if(!r.width)return;const v=camera(r),f=g.field,reduced=save.settings.reducedMotion||root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const theme=P.items.find(i=>i.id===save.equipped.Stadium).variant;
    c.setTransform(r.dpr,0,0,r.dpr,0,0);rect(c,0,0,r.width,r.height,theme===1?'#352b3c':theme===2?'#102f2c':'#0b1c28');
    const key=`${r.width}:${r.height}:${r.dpr}:${theme}`;
    if(root.document?.createElement){
      if(r.fieldLayerKey!==key){const layer=root.document.createElement('canvas');layer.width=r.canvas.width;layer.height=r.canvas.height;const ctx=layer.getContext('2d');ctx.setTransform(r.dpr,0,0,r.dpr,0,0);pitch(ctx,v,theme);r.fieldLayer=layer;r.fieldLayerKey=key;}
      c.drawImage(r.fieldLayer,0,0,r.width,r.height);
    }else pitch(c,v,theme);
    const club=g.team||save.club,item=category=>P.items.find(i=>i.id===save.equipped[category]);
    const kit=item('Player kit'),keeper=item('Keeper kit'),design=club.custom?club[club.activeKit]:kit.design||{primary:kit.color,secondary:'#d9e6ee',pattern:'plain'};
    const friendly=design.primary.toLowerCase()===g.opponent.color.toLowerCase()?{...design,primary:'#e5edf1',secondary:'#204a69'}:design;
    const ball=f.ball,b=project(v,ball.x,ball.y),s=v.scale;let ballDrawn=false;
    const drawBall=()=>{
      oval(c,b.x+2*s,b.y+2*s,7*s,3*s,'#061d2b60');const yy=b.y-ball.z*s*.65,rr=5.3*s;
      oval(c,b.x,yy,rr,rr,item('Football').color);oval(c,b.x,yy,rr*.35,rr*.35,'#213c4c');
      for(let i=0;i<5;i++){const a=i*Math.PI*.4+g.time*3;oval(c,b.x+Math.cos(a)*rr*.75,yy+Math.sin(a)*rr*.75,rr*.2,rr*.2,'#2e3e4c');}ballDrawn=true;
    };
    for(const p of [...f.players].sort((a,b)=>project(v,a.x,a.y).y-project(v,b.x,b.y).y)){
      if(!ballDrawn&&ball.z<35&&b.y<project(v,p.x,p.y).y)drawBall();
      const d=p.team?{primary:p.keeper?'#d1b86b':g.opponent.color,secondary:'#e5ebef',pattern:'plain'}:p.keeper?club.custom?club.keeper:{primary:keeper.color,secondary:'#e8d888',pattern:'plain'}:friendly;
      const look={kit:d.primary,trim:d.secondary,pattern:d.pattern,short:p.team?'#223748':d.primary,sock:d.secondary,skin:['#c7997a','#a37555','#e1b18b','#86583c','#bc8b6c'][p.id%5],hair:p.id%3===0?'#594738':'#20282b',boot:p.team?'#202a35':item('Boots').color,gloves:p.team?'#e5e9df':item('Gloves').color,headband:!p.team&&item('Headband').variant?item('Headband').color:null};
      look.gender=P.playerGender(club);
      footballer(c,p,project(v,p.x,p.y),v,look,p.id===f.controlled,p.keeper?1:p.id===3?club.number:[1,4,7,10,11][p.id%5]);
      const spot=project(v,p.x,p.y),name=P.playerName(g,p.id).split(' ').at(-1).slice(0,14),selected=p.id===f.controlled;
      c.font=`${selected?'bold ':''}${Math.max(9,10*s)}px Arial`;c.textAlign='center';c.fillStyle=selected?'#ffe5a0':'#e9f0e7';c.fillText(name.toUpperCase(),P.clamp(spot.x,42,r.width-42),spot.y+18*s);
    }
    if(!ballDrawn)drawBall();
    if(f.state==='live'&&ball.owner===5&&f.keeperHold>0){
      const k=project(v,f.players[5].x,f.players[5].y),x=P.clamp(k.x,55,r.width-55),y=Math.max(18,k.y-55*s);
      rect(c,x-48,y-13,96,19,'#102837ed');c.fillStyle='#f2d589';c.font='bold 9px Arial';c.textAlign='center';c.fillText('CLOSE DOWN / X',x,y);
    }
    if(f.aim&&f.state==='live'){const a=project(v,f.aim.x,f.aim.y);c.setLineDash([3,5]);line(c,b.x,b.y,a.x,a.y,'#f7d69a55',1);c.setLineDash([]);c.strokeStyle='#e9cc8a';c.lineWidth=1.5;c.beginPath();c.arc(a.x,a.y,9,0,Math.PI*2);c.stroke();}
    if(f.charging){const p=project(v,f.players[f.controlled].x,f.players[f.controlled].y);rect(c,p.x-18,p.y+14,36,4,'#14293d');rect(c,p.x-18,p.y+14,36*f.power,4,f.power>.9?'#f4a37a':'#efcf88');}
    if(f.state==='goal'){
      c.fillStyle='#071c34c9';c.fillRect(0,r.height*.39,r.width,r.height*.2);c.fillStyle='#f3d698';c.font=`900 ${Math.min(40,r.width*.08)}px Arial`;c.textAlign='center';c.fillText(f.ball.lastTouch===0?'GOAL!':'THEY SCORE',r.width/2,r.height*.51);
      if(!reduced)for(let i=0;i<18;i++){const x=(i*73+clock*30)%r.width,y=r.height*.25+Math.sin(i+clock*3)*30;oval(c,x,y,2,3,i%2?'#eed28c':'#ecf4e5');}
    }
    if(f.state==='foul'){
      const spot=project(v,f.foul.spot.x,f.foul.spot.y);c.strokeStyle='#f4d07c';c.lineWidth=2;c.beginPath();c.arc(spot.x,spot.y,23,0,Math.PI*2);c.stroke();
      rect(c,0,r.height*.4,r.width,r.height*.15,'#0c2138df');c.fillStyle='#f4d07c';c.font=`900 ${Math.min(28,r.width*.065)}px Arial`;c.textAlign='center';c.fillText(f.foul.kind==='penalty'?'FOUL / PENALTY!':'FOUL / FREE KICK',r.width/2,r.height*.49);
    }
  }
  Object.assign(P,{drawField,fieldPoint,fieldVector});
})(window);
