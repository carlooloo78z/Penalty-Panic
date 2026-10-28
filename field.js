(function(root){
  'use strict';
  const F=Object.freeze({width:1000,height:600,goalTop:220,goalBottom:380,duration:105,finishDuration:2.5,saveDuration:1.45,step:1/120});
  const fieldRegulation=f=>f?.regulationDuration??300;
  const fieldDuration=f=>f?.duration||fieldRegulation(f);
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const norm=(x,y)=>{const d=Math.hypot(x,y)||1;return {x:x/d,y:y/d};};
  const outfield=(f,team)=>f.players.filter(p=>p.team===team&&!p.keeper);
  const insidePosts=y=>y>F.goalTop+5&&y<F.goalBottom-5;
  const inKeeperBox=(team,b)=>b.y>=125&&b.y<=475&&(team?b.x>=845&&b.x<=1000:b.x>=0&&b.x<=155);
  function containPlayer(p){
    p.y=clamp(p.y,p.keeper?130:18,p.keeper?470:582);
    // Let the ball carrier reach the line inside the goal mouth, keeping boards elsewhere.
    const edge=insidePosts(p.y)?4:18;
    p.x=clamp(p.x,p.keeper?p.team?850:20:edge,p.keeper?p.team?980:150:1000-edge);
  }
  function goalCrossing(f,previous,emit){
    const b=f.ball;if(b.x>=0&&b.x<=1000)return false;
    const line=b.x<0?0:1000,dx=b.x-previous.x,t=dx?clamp((line-previous.x)/dx,0,1):1;
    const y=previous.y+(b.y-previous.y)*t;
    if(!insidePosts(y)||b.z>=58)return false;
    const team=b.x>1000?0:1;
    const last=b.owner??b.lastPlayer,ownGoal=Number.isInteger(last)&&f.players[last].team!==team;
    const scorer=Number.isInteger(last)&&!ownGoal?last:team*5+3;
    f.celebration={team,scorer,ownGoal,elapsed:0,duration:2.5};
    f.score[team]++;f.state='goal';f.wait=2.5;b.owner=null;b.lastTouch=team;b.x=line;b.y=y;b.vx=b.vy=b.vz=0;f.charging=false;f.shotPending=0;f.setPiece=null;
    f.message=team===0?'GOAL! A brilliant finish.':'They found the net. Win the ball back.';emit('field-goal',{team,scorer});emit('field-view');return true;
  }
  function matchScores(g){
    const a=g.a.filter(Boolean).length,b=g.b.filter(Boolean).length;
    if(!g.field)return [a,b];
    return g.field.rule==='always'||!g.field.pensStarted?[g.field.score[0]+a,g.field.score[1]+b]:[a,b];
  }
  const assisted=f=>f.assists!==false;
  const facility=(f,key)=>f.facilities?.[key]||0;
  const championsIntensity=g=>root.Panic?.competitionChallenge?.(g.competition).intensity||0;
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  function fieldKeeperPose(p){
    if(!p.dive)return null;
    const d=p.dive,weight=smooth(d.elapsed/.26)*(1-smooth((d.elapsed-.48)/.47));
    const dx=d.to.x-d.from.x,dy=d.to.y-d.from.y,dir=norm(dx,dy);
    return {weight,dir,hands:[-1,1].map(side=>({x:p.x+dir.x*22*weight-dir.y*side*4,y:p.y+dir.y*22*weight+dir.x*side*4}))};
  }
  function tryKeeperDive(g,p){
    const f=g.field,b=f.ball;
    if(p.dive||p.cooldown>0||p.team===0&&b.manualSave||b.owner!==null||!b.shot||b.lastTouch===p.team||Math.abs(b.vx)<40)return;
    const arrival=(p.x-b.x)/b.vx;
    const window=p.team===0?(assisted(f)?.56:.42):(({rookie:.34,club:.4,elite:.46})[g.keeperLevel]+championsIntensity(g)*.055)*(assisted(f)?.85:1);
    const y=b.y+b.vy*arrival;
    if(arrival<0||arrival>window||y<210||y>390||Math.abs(y-p.y)<12)return;
    const reach=p.team===0?(assisted(f)?60:48)+facility(f,'keeping')*4:assisted(f)?32:44;
    p.dive={elapsed:0,from:{x:p.x,y:p.y},to:{x:clamp(p.x+(p.team?-7:7),20,980),y:clamp(p.y+clamp(y-p.y,-reach,reach),130,470)}};
  }
  function keeperContact(p,b){
    const pose=fieldKeeperPose(p);
    return pose?dist(p,b)<18||pose.hands.some(h=>dist(h,b)<11):dist(p,b)<25;
  }
  function createField(g,rule='tied',assists=true,facilities={}){
    const players=[];
    for(let team=0;team<2;team++)for(let i=0;i<5;i++)players.push({id:team*5+i,team,keeper:i===0,x:0,y:0,vx:0,vy:0,dx:team?-1:1,dy:0,stamina:1,cooldown:0,anim:0,kick:0,target:{x:0,y:0}});
    const f={version:1,elapsed:0,state:'ready',wait:0,score:[0,0],shots:[0,0],saves:[0,0],passes:[0,0],tackles:0,players,controlled:3,ball:{x:500,y:300,z:0,vx:0,vy:0,vz:0,owner:3,lock:0,lastTouch:0,shot:false},seed:g.seed>>>0,aim:null,charging:false,power:.45,input:{x:0,y:0,sprint:false},think:0,message:'One minute forty-five. Your team. Your match.',rule:rule==='tied'?'tied':'always',pensStarted:false,finished:false};
    f.regulationDuration=F.duration;f.assists=assists!==false;f.possessionGrace=0;
    f.finish=null;f.saveWindow=null;f.manualSaves=0;f.manualAttempts=0;f.foul=null;f.setPiece=null;f.shotPending=0;f.fouls=[0,0];f.penalties=[0,0];
    f.facilities=Object.fromEntries(['passing','fitness','keeping'].map(k=>[k,clamp(Math.floor(facilities?.[k]||0),0,3)]));
    kickoff(f,0);f.state='ready';return f;
  }
  function kickoff(f,team){
    f.finish=null;f.saveWindow=null;f.foul=null;f.setPiece=null;f.shotPending=0;f.celebration=null;f.ball.manualSave=false;f.keeperHold=0;
    const layout=[[38,300],[235,300],[390,145],[465,300],[390,455]];
    for(const p of f.players){const slot=p.id%5,[x,y]=layout[slot];p.x=p.team?1000-x:x;p.y=y;p.vx=p.vy=0;p.dx=p.team?-1:1;p.dy=0;p.cooldown=.5;p.dive=null;p.target={x:p.x,y:p.y};}
    for(const p of f.players)if(p.team!==team&&!p.keeper){p.x=team?Math.min(p.x,340):Math.max(p.x,660);p.target.x=p.x;}
    const taker=f.players[team*5+3];taker.x=team?510:490;taker.y=300;
    Object.assign(f.ball,{x:taker.x,y:300,z:0,vx:0,vy:0,vz:0,owner:taker.id,lock:.3,lastTouch:team,lastPlayer:taker.id,shot:false});
    f.possessionGrace=assisted(f)&&team===0?1.8:0;
    f.controlled=3;f.charging=false;f.aim=null;f.input={x:0,y:0,sprint:false};f.state='kickoff';f.wait=.8;
  }
  function fieldStart(g){if(g.phase==='field'&&g.field.state==='ready'){g.field.state='live';g.field.message='Play on. Attack the highlighted goal.';return true;}return false;}
  function fieldExtraPeriod(f){kickoff(f,0);f.state='ready';}
  function fieldMove(g,x,y,sprint=false){const f=g.field;if(g.phase!=='field'||!f||f.finish||f.saveWindow||f.setPiece)return;if(f.state==='ready'&&(x||y))fieldStart(g);const n=Math.max(1,Math.hypot(x,y));f.input={x:x/n,y:y/n,sprint:!!sprint};}
  function fieldSwitch(g){
    const f=g.field;if(g.phase!=='field'||!f||f.finish||f.saveWindow||f.setPiece)return;
    const options=outfield(f,0).filter(p=>p.id!==f.controlled).sort((a,b)=>dist(a,f.ball)-dist(b,f.ball));if(options.length)f.controlled=options[0].id;
    f.charging=false;f.aim=null;
  }
  function takeBall(f,p){Object.assign(f.ball,{owner:p.id,x:p.x+p.dx*16,y:p.y+p.dy*16,z:0,vx:0,vy:0,vz:0,lock:.25,lastTouch:p.team,lastPlayer:p.id,shot:false,manualSave:false});f.keeperHold=p.keeper?1.8:0;f.possessionGrace=p.team===0?(assisted(f)?1.2:0)+facility(f,'passing')*.15:0;if(p.team===0&&!p.keeper)f.controlled=p.id;}
  function kick(f,p,target,power,shot=false){
    const d=norm(target.x-p.x,target.y-p.y),speed=shot?390+power*270:Math.min(420,180+dist(p,target)*.65)+(p.team===0?(assisted(f)?35:0)+facility(f,'passing')*10:0);
    Object.assign(f.ball,{owner:null,x:p.x+d.x*20,y:p.y+d.y*20,z:3,vx:d.x*speed,vy:d.y*speed,vz:shot?40+power*50:15,lock:shot?.015:.15,lastTouch:p.team,lastPlayer:p.id,shot,manualSave:false});
    p.dx=d.x;p.dy=d.y;p.kick=.24;p.cooldown=.55;f.charging=false;f.keeperHold=0;
    f.shotPending=shot?3:0;
    if(shot)f.shots[p.team]++;else f.passes[p.team]++;
    if(shot&&p.team===1)beginFieldSave(f);
  }
  function beginFieldSave(f){
    const b=f.ball,k=f.players[0];if(f.saveWindow||b.owner!==null||!b.shot||b.lastTouch!==1||b.vx>=0)return false;
    const start=Object.fromEntries(['x','y','z','vx','vy','vz'].map(key=>[key,b[key]])),end={...start};
    const plane=clamp(k.x,4,Math.max(4,b.x-2));let flightTime=0;
    do{advanceBall(end,F.step);flightTime+=F.step;}while(end.x>plane&&flightTime<4&&end.y>=0&&end.y<=600);
    f.saveWindow={duration:F.saveDuration,elapsed:0,remaining:F.saveDuration,flightTime,physicsTime:0,start,end,origin:{x:k.x,y:k.y},dive:null,preview:{x:500,y:320},result:null,feedback:0,announced:false};
    f.manualAttempts=(f.manualAttempts||0)+1;
    f.shotPending=3;
    b.manualSave=true;k.dive=null;k.cooldown=0;f.charging=false;f.input={x:0,y:0,sprint:false};
    f.players.forEach(p=>{p.vx=p.vy=0;});f.message=`YOUR SAVE! ${F.saveDuration} seconds. Click the ball target or choose a dive.`;return true;
  }
  function fieldCharge(g){const f=g.field;if(g.phase!=='field'||f.finish||f.saveWindow||f.setPiece)return false;if(f.state==='ready'){fieldStart(g);return false;}if(f.state!=='live'||f.ball.owner!==f.controlled)return false;f.charging=true;f.power=.18;return true;}
  function beginFinish(g,power){
    const f=g.field,corner=f.players[5].y>=300?245:355,y=f.aim?.y??corner;
    f.finish={remaining:F.finishDuration,aim:{x:clamp(200+(y-220)/160*600,170,830),y:310},power:clamp(power,.25,1),taker:f.controlled,announced:false};
    f.charging=false;f.input={x:0,y:0,sprint:false};f.players.forEach(p=>{p.vx=p.vy=0;});
    f.message=`Pick your finish. The shot fires in ${F.finishDuration} seconds.`;
  }
  function fieldFinishAim(g,x,y){if(g.phase!=='field'||!g.field.finish)return false;g.field.finish.aim={x:clamp(x,170,830),y:clamp(y,115,365)};return true;}
  // One launch solution and fixed-step integrator power both the preview and live ball.
  function fieldShotSpec(f){
    const s=f.finish,p=f.players[s.taker],target={x:1000,y:220+(s.aim.x-200)/600*160};
    const d=norm(target.x-p.x,target.y-p.y),speed=390+s.power*270,distance=Math.max(1,dist(p,target)-20);
    const flight=clamp(-Math.log(Math.max(.01,1-.12*distance/speed))/.12,.09,3),height=(350-s.aim.y)/210*58;
    return {x:p.x+d.x*20,y:p.y+d.y*20,z:3,vx:d.x*speed,vy:d.y*speed,vz:clamp((height-3)/flight+130*flight,-100,450)};
  }
  function advanceBall(b,dt){
    b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;b.vz-=260*dt;
    if(b.z<0){b.z=0;b.vz=Math.abs(b.vz)>22?-b.vz*.24:0;}
    const friction=Math.exp(-dt*(b.z>1?.12:.6));b.vx*=friction;b.vy*=friction;
  }
  function fieldShotPreview(f){
    if(!f.finish)return null;
    const b=fieldShotSpec(f),points=[{...b}],taker=f.finish.taker;
    let landing=null,crossing=null,blocker=null;
    for(let i=1;i<=720;i++){
      const previous={...b};advanceBall(b,F.step);
      if(i%8===0)points.push({x:b.x,y:b.y,z:b.z});
      if(!landing&&b.z===0&&previous.vz<0)landing={x:b.x,y:b.y,z:0};
      if(blocker===null&&i*F.step>=.015)blocker=f.players.find(p=>!p.keeper&&p.id!==taker&&p.cooldown<=i*F.step&&b.z<=26&&dist(p,b)<18)?.id??null;
      if(b.x>=1000){const t=(1000-previous.x)/(b.x-previous.x);crossing={x:1000,y:previous.y+(b.y-previous.y)*t,z:previous.z+(b.z-previous.z)*t};break;}
      if(b.y<0||b.y>600||Math.hypot(b.vx,b.vy)<8)break;
    }
    const end=crossing||landing||{x:b.x,y:b.y,z:b.z};
    return {points,landing,crossing,end,blocker,distance:Math.round((1000-f.players[taker].x)*.105),onTarget:!!crossing&&insidePosts(crossing.y)&&crossing.z<58&&crossing.z>=0};
  }
  // Camera at the shooter's eyes. The angle bisector keeps both posts in view;
  // close-range FOV widens without moving the camera away from the player.
  function fieldCamera(f){
    const shooter=f.players[f.finish.taker],p={x:Math.min(998,shooter.x),y:shooter.y},left=norm(1000-p.x,220-p.y),right=norm(1000-p.x,380-p.y),forward=norm(left.x+right.x,left.y+right.y);
    const posts=[220,380].map(y=>({depth:(1000-p.x)*forward.x+(y-p.y)*forward.y,side:(y-p.y)*forward.x-(1000-p.x)*forward.y}));
    const near=Math.max(1,Math.min(...posts.map(p=>p.depth))),angle=Math.max(...posts.map(p=>Math.abs(p.side)/Math.max(1,p.depth)));
    return {x:p.x,y:p.y,fx:forward.x,fy:forward.y,eye:34,horizon:250,focal:Math.min(640,270/Math.max(.01,angle),190*near/34,110*near/24)};
  }
  function fieldProject(f,p,camera=fieldCamera(f)){
    const dx=p.x-camera.x,dy=p.y-camera.y,depth=dx*camera.fx+dy*camera.fy,zScale=camera.focal/Math.max(2,depth);
    return {x:500+(dy*camera.fx-dx*camera.fy)*zScale,y:camera.horizon+camera.eye*zScale,zScale,scale:zScale/(210/58),depth,visible:depth>=2};
  }
  function fieldAimPoint(f,x,y){
    const c=fieldCamera(f),side=(x-500)/c.focal,dx=c.fx-c.fy*side,dy=c.fy+c.fx*side;
    if(dx<=0)return null;
    const depth=(1000-c.x)/dx;if(depth<2)return null;
    const lateral=c.y+dy*depth,height=c.eye-(y-c.horizon)*depth/c.focal;
    return {x:200+(lateral-220)*600/160,y:350-height*210/58};
  }
  function fieldSkipCelebration(g){const f=g.field;if(g.phase!=='field'||f?.state!=='goal'||!f.celebration)return false;f.wait=0;return true;}
  function launchFinish(g){
    const f=g.field,s=f.finish,p=f.players[s.taker],target={x:1000,y:220+(s.aim.x-200)/600*160},spec=fieldShotSpec(f);
    kick(f,p,target,s.power,true);
    Object.assign(f.ball,spec);
    if(f.setPiece){f.setPiece.flight=true;f.setPiece.remaining=4;f.state='live';}
    f.finish=null;f.message='Shot away!';
  }
  function fieldShoot(g){
    const f=g.field;if(g.phase!=='field'||f.state!=='live'||f.finish||f.saveWindow||f.setPiece||!f.charging)return false;
    const p=f.players[f.controlled];if(f.ball.owner!==p.id){f.charging=false;return false;}
    beginFinish(g,assisted(f)?Math.max(.55,f.power):f.power);return true;
  }
  function fieldPass(g){
    const f=g.field;if(g.phase!=='field')return false;
    const freeKick=f.state==='restart'&&f.setPiece?.kind==='free-kick'&&f.setPiece.team===0&&!f.setPiece.flight;
    if(!freeKick&&(f.state!=='live'||f.finish||f.saveWindow||f.setPiece))return false;
    const p=f.players[f.controlled];if(f.ball.owner!==p.id)return false;
    const mates=outfield(f,0).filter(m=>m.id!==p.id);
    const aim=f.aim||{x:p.x+p.dx*250,y:p.y+p.dy*250};
    // Without a manual target, prefer an open forward pass with a clear lane.
    const passCost=m=>{
      if(!assisted(f)||f.aim)return dist(m,aim);
      const dx=m.x-p.x,dy=m.y-p.y,length=dx*dx+dy*dy;
      const clearance=Math.min(...outfield(f,1).map(o=>{
        const t=clamp(((o.x-p.x)*dx+(o.y-p.y)*dy)/Math.max(1,length),0,1);
        return Math.hypot(o.x-p.x-dx*t,o.y-p.y-dy*t);
      }));
      return dist(p,m)*.35-(m.x-p.x)*.55+Math.max(0,65-clearance)*5;
    };
    mates.sort((a,b)=>passCost(a)-passCost(b));const receiver=mates[0];
    if(freeKick){
      f.finish=null;f.setPiece=null;f.state='live';f.input={x:0,y:0,sprint:false};
      for(const mate of mates)mate.cooldown=0;
      f.message='Free kick played short. Build your attack.';
    }
    kick(f,p,{x:receiver.x+receiver.vx*.2,y:receiver.y+receiver.vy*.2},.5);f.controlled=receiver.id;f.aim=null;return true;
  }
  function fieldTackle(g){
    const f=g.field;if(g.phase!=='field'||f.state!=='live'||f.finish||f.saveWindow||f.setPiece)return false;
    const p=f.players[f.controlled];if(p.cooldown>0)return false;p.cooldown=assisted(f)?.45:.75;p.kick=.2;
    const owner=f.ball.owner===null?null:f.players[f.ball.owner];
    if(owner&&owner.team!==p.team&&dist(p,owner)<(assisted(f)?58:48)){if(fieldContactFoul(g,p,owner,true))return true;takeBall(f,p);owner.cooldown=.8;owner.dive=null;f.tackles++;f.message=owner.keeper?'Keeper dispossessed! The goal is open.':'Clean tackle. Build your attack.';return true;}
    f.message='Tackle within reach of the ball carrier.';return false;
  }
  function fieldContactFoul(g,defender,carrier,manual=false){
    const f=g.field,d=dist(defender,carrier);if(f.foul||f.setPiece||carrier.keeper||defender.keeper||defender.team===carrier.team||d>58)return false;
    const bx=carrier.x+carrier.dx*16,by=carrier.y+carrier.dy*16;
    const behind=(defender.x-carrier.x)*carrier.dx+(defender.y-carrier.y)*carrier.dy;
    const closing=((carrier.x-defender.x)*(defender.vx-carrier.vx)+(carrier.y-defender.y)*(defender.vy-carrier.vy))/Math.max(1,d);
    if(behind>=5||Math.hypot(defender.x-bx,defender.y-by)<=29||(!manual&&closing<60))return false;
    const penalty=(carrier.team===0?carrier.x>=845:carrier.x<=155)&&carrier.y>=125&&carrier.y<=475;
    f.foul={team:carrier.team,taker:carrier.id,defender:defender.id,kind:penalty?'penalty':'free-kick',spot:{x:carrier.x,y:carrier.y},announced:false};
    f.fouls||=[0,0];f.penalties||=[0,0];f.fouls[defender.team]++;if(penalty)f.penalties[carrier.team]++;
    f.state='foul';f.wait=1;f.charging=false;f.finish=null;f.input={x:0,y:0,sprint:false};f.players.forEach(p=>{p.vx=p.vy=0;});defender.kick=.2;
    f.message=`${penalty?'PENALTY!':'FREE KICK!'} Late challenge ${penalty?'inside':'outside'} the box.`;return true;
  }
  function setupRestart(f){
    const foul=f.foul,team=foul.team,p=f.players[foul.taker],spot=foul.kind==='penalty'?{x:team?108:892,y:300}:foul.spot;
    for(const player of f.players){
      player.vx=player.vy=0;player.dive=null;player.cooldown=.4;
      if(player.keeper){player.x=player.team?957:43;player.y=300;player.cooldown=0;}
      else if(player!==p){
        if(foul.kind==='penalty')player.x=team?Math.max(185,player.x):Math.min(815,player.x);
        else if(dist(player,spot)<110){player.x=clamp(spot.x+(team?120:-120),20,980);player.y=clamp(spot.y+(player.id%2?75:-75),25,575);}
      }
      player.target={x:player.x,y:player.y};
    }
    Object.assign(p,{x:spot.x,y:spot.y,dx:team?-1:1,dy:0});takeBall(f,p);Object.assign(f.ball,{x:p.x+p.dx*16,y:p.y});
    f.setPiece={kind:foul.kind,team,taker:p.id,flight:false,remaining:team?1.2:0};f.foul=null;f.state='restart';f.power=.65;f.aim=null;
    f.message=team===0?(f.setPiece.kind==='penalty'?'Your penalty. Press Space or Take penalty when ready.':'Your free kick. Space to shoot, or Q to pass. Tap a teammate on the pitch to choose the pass.'):'Opponent set piece. Your goalkeeper is ready.';
  }
  function fieldRestart(g){const f=g.field;if(g.phase!=='field'||f.state!=='restart'||f.setPiece?.team!==0||f.finish)return false;beginFinish(g,.65);return true;}
  function keeperClear(f,p){
    const mates=outfield(f,p.team).sort((a,b)=>p.team?a.x-b.x:b.x-a.x),receiver=mates[0],direction=p.team?-1:1;
    const target={x:clamp(p.x+direction*560,80,920),y:receiver.y},d=norm(target.x-p.x,target.y-p.y),distance=dist(p,target),flight=1.35;
    const speed=distance*.12/(1-Math.exp(-.12*flight));kick(f,p,target,.7);
    Object.assign(f.ball,{vx:d.x*speed,vy:d.y*speed,vz:260*flight/2,lock:.3});p.kick=.24;p.cooldown=.7;
    if(p.team===0)f.controlled=receiver.id;f.message='The goalkeeper kicks long. Chase the second ball.';
  }
  function random(f){f.seed=(Math.imul(f.seed,1664525)+1013904223)>>>0;return f.seed/4294967296;}
  function aiTargets(g){
    const f=g.field,b=f.ball,owner=b.owner===null?null:f.players[b.owner],intensity=championsIntensity(g);
    for(const team of [0,1]){
      const mates=outfield(f,team),direction=team?-1:1,have=owner?.team===team;
      const chase=mates.filter(p=>p.id!==f.controlled).sort((a,b)=>dist(a,f.ball)-dist(b,f.ball))[0];
      for(const p of mates){
        const slot=p.id%5,baseY=[300,300,115,300,485][slot];
        if(p.id===b.owner){p.target={x:team?130:870,y:clamp(p.y+(300-p.y)*.2,180,420)};continue;}
        if(!have&&p===chase){const lead=.15+(team===1?intensity*.15:0);p.target={x:b.x+(owner?owner.vx*lead:0),y:b.y+(owner?owner.vy*lead:0)};continue;}
        let progress=have?b.x+direction*(slot===1?-135:145):b.x-direction*(slot===1?180:100);
        p.target={x:clamp(progress,team?115:90,team?910:885),y:clamp(baseY+(b.y-300)*.24,55,545)};
      }
      const keeper=f.players[team*5],danger=team?b.x>620:b.x<380,goalX=team?957:43;
      const canRead=team===0||!assisted(f)||b.x>({rookie:810,club:770,elite:730})[g.keeperLevel]-intensity*45;
      const toward=canRead&&b.owner===null&&b.shot&&(team?b.vx>0:b.vx<0),time=toward?clamp((goalX-b.x)/b.vx,0,1):0;
      keeper.target={x:goalX,y:clamp(toward?b.y+b.vy*time:300+(b.y-300)*(danger?.75:.3),235,365)};
      // Come off the line for a loose ball in our penalty area. Travel to it;
      // possession still requires real contact and a reachable ball height.
      if(b.owner===null&&inKeeperBox(team,b)&&!keeper.dive){
        const lead=clamp(dist(keeper,b)/180,0,.35),future={x:b.x+b.vx*lead,y:b.y+b.vy*lead};
        if(inKeeperBox(team,future)&&(!b.shot||Math.abs(b.vx)<240))keeper.target={x:clamp(future.x,team?850:20,team?980:150),y:clamp(future.y,130,470)};
      }
    }
    if(!owner||owner.id===f.controlled||owner.cooldown>0||owner.dive)return;
    const toGoal=owner.team?owner.x:1000-owner.x,pressure=Math.min(...f.players.filter(p=>p.team!==owner.team&&!p.keeper).map(p=>dist(p,owner)));
    if(owner.keeper){if(f.keeperHold>0)return;keeperClear(f,owner);return true;}
    if(pressure<43&&random(f)<.75){
      const mates=outfield(f,owner.team).filter(p=>p.id!==owner.id).sort((a,b)=>(owner.team?a.x-b.x:b.x-a.x));
      if(mates.length){const m=mates[Math.floor(random(f)*Math.min(2,mates.length))];kick(f,owner,m,.6);return true;}
    }
    if(toGoal<({easy:235,normal:285,hard:330})[g.difficulty]&&Math.abs(owner.y-300)<185){
      const boost=owner.team===1?intensity:0,baseOffset={easy:18,normal:43,hard:60}[g.difficulty];
      const error={easy:50,normal:25,hard:10}[g.difficulty]*(1-.45*boost),offset=baseOffset+(72-baseOffset)*.45*boost,y=300+(random(f)<.5?-offset:offset)+(random(f)-.5)*error;
      const power=(assisted(f)&&owner.team===1?.5+random(f)*.15:.68+random(f)*.2)+.07*boost;
      kick(f,owner,{x:owner.team?-15:1015,y},power,true);return true;
    }
  }
  function fieldStep(g,dt,emit){
    const f=g.field;if(f.finished||f.state==='ready'||f.saveWindow)return;
    if(f.finish){
      if(!f.finish.announced){f.finish.announced=true;emit('field-view');}
      f.finish.remaining=Math.max(0,f.finish.remaining-dt);
      if(f.finish.remaining<1e-8){launchFinish(g);emit('field-kick');emit('field-view');}return;
    }
    if(f.state==='foul'){
      if(!f.foul.announced){f.foul.announced=true;emit('field-foul');emit('field-view');}
      f.wait=Math.max(0,f.wait-dt);if(!f.wait){setupRestart(f);emit('field-view');}return;
    }
    if(f.state==='restart'){
      const s=f.setPiece;
      if(s.team===1){s.remaining=Math.max(0,s.remaining-dt);if(!s.remaining){const p=f.players[s.taker];kick(f,p,{x:0,y:300+(random(f)-.5)*120},.65,true);s.flight=true;s.remaining=4;f.state='live';emit('field-kick');emit('field-view');}}
      return;
    }
    if(f.setPiece?.flight){f.setPiece.remaining=Math.max(0,f.setPiece.remaining-dt);if(!f.setPiece.remaining){f.setPiece=null;emit('field-view');}}
    if(f.shotPending)f.shotPending=Math.max(0,f.shotPending-dt);
    const help=assisted(f),intensity=championsIntensity(g);
    if(f.possessionGrace===undefined)f.possessionGrace=help&&f.ball.owner!==null&&f.players[f.ball.owner].team===0?1.2:0;
    if(f.state!=='live'){
      if(f.celebration)f.celebration.elapsed=Math.min(f.celebration.duration,f.celebration.elapsed+dt);
      f.wait=Math.max(0,f.wait-dt);if(!f.wait){if(f.state==='goal'){kickoff(f,1-f.ball.lastTouch);emit('field-view');}else f.state='live';}return;
    }
    const duration=fieldDuration(f),beforeClock=f.elapsed,remaining=duration-f.elapsed;if(!f.setPiece){dt=Math.min(dt,remaining);f.elapsed=Math.min(duration,f.elapsed+dt);}
    f.possessionGrace=Math.max(0,f.possessionGrace-dt);
    if(f.keeperHold>0&&f.ball.owner!==null&&!f.players[f.ball.owner].dive)f.keeperHold=Math.max(0,f.keeperHold-dt);
    f.think-=dt;if(f.think<=0){if(aiTargets(g))emit('field-kick');f.think=.13;}
    if(f.saveWindow){f.elapsed=beforeClock;return;}
    if(f.charging)f.power=Math.min(1,f.power+dt*.75);
    const owner=f.ball.owner===null?null:f.players[f.ball.owner];
    for(const p of f.players){
      p.cooldown=Math.max(0,p.cooldown-dt);p.kick=Math.max(0,p.kick-dt);
      if(f.setPiece&&!p.keeper){p.vx=p.vy=0;continue;}
      if(p.keeper){
        tryKeeperDive(g,p);
        if(p.dive){
          const d=p.dive;d.elapsed=Math.min(.95,d.elapsed+dt);const travel=smooth(d.elapsed/.32);
          p.x=d.from.x+(d.to.x-d.from.x)*travel;p.y=d.from.y+(d.to.y-d.from.y)*travel;p.vx=p.vy=0;
          if(d.elapsed>=.95){p.dive=null;p.target={x:p.x,y:p.y};}
          continue;
        }
      }
      const controlled=p.id===f.controlled,d=controlled?f.input:norm(p.target.x-p.x,p.target.y-p.y);
      const moving=controlled?Math.hypot(d.x,d.y)>.01:dist(p,p.target)>5;
      const sprint=controlled&&f.input.sprint&&p.stamina>.05;
      const base=p.keeper?(p.team===0?(help?220:175)+g.attributes.reaction*3:({rookie:135,club:160,elite:185})[g.keeperLevel]*(help?.8:1)):p.team===0?(help&&controlled?162:150):({easy:123,normal:143,hard:158})[g.difficulty]*(help?.8:1);
      const speed=(moving?base:0)*(p.team===1?1+intensity*(p.keeper?.10:.14):1)*(sprint?1.4:1)*(owner===p?.91:1)*(f.charging&&controlled?(help?.95:.8):1);
      const fitness=p.team===0?facility(f,'fitness')*.1:0;
      p.stamina=clamp(p.stamina+dt*(sprint?(help?-.12:-.21)*(1-fitness):(help?.18:.12)*(1+fitness)),0,1);
      const blend=1-Math.exp(-dt*11);p.vx+=(d.x*speed-p.vx)*blend;p.vy+=(d.y*speed-p.vy)*blend;
      if(moving){p.dx=d.x;p.dy=d.y;}p.x+=p.vx*dt;p.y+=p.vy*dt;containPlayer(p);p.anim+=Math.hypot(p.vx,p.vy)*dt/16;
    }
    // Resolve body overlap while leaving enough room to dribble and tackle.
    if(!f.setPiece)for(let i=0;i<10;i++)for(let j=i+1;j<10;j++){
      const a=f.players[i],b=f.players[j],d=dist(a,b);if(d>0&&d<23){const n=(23-d)*.5/d,dx=(a.x-b.x)*n,dy=(a.y-b.y)*n;a.x+=dx;a.y+=dy;b.x-=dx;b.y-=dy;containPlayer(a);containPlayer(b);}
    }
    const b=f.ball;b.lock=Math.max(0,b.lock-dt);
    if(b.owner!==null){
      const previous={x:b.x,y:b.y};
      const carrier=f.players[b.owner];b.x=carrier.x+carrier.dx*16;b.y=carrier.y+carrier.dy*16;b.z=0;
      if(carrier.dive){const hands=fieldKeeperPose(carrier).hands;b.x=(hands[0].x+hands[1].x)/2;b.y=(hands[0].y+hands[1].y)/2;}
      if(!goalCrossing(f,previous,emit)){
        const protectedBall=carrier.team===0&&f.possessionGrace>0;
        const tackler=outfield(f,1-carrier.team).find(p=>(p.id!==f.controlled||help)&&p.cooldown===0&&dist(p,carrier)<(help?(p.id===f.controlled?40:p.team===1?25:31):31));
        if(tackler&&!protectedBall&&carrier.cooldown===0){
          if(fieldContactFoul(g,tackler,carrier)){f.elapsed=beforeClock;return;}
          const selected=tackler.id===f.controlled;takeBall(f,tackler);tackler.cooldown=.65;carrier.cooldown=.8;if(selected)f.tackles++;f.message=tackler.team?'Possession lost. E to switch, X to tackle.':'Ball won. Take your time and build an attack.';f.charging=false;
        }
        const goalie=f.players[(1-carrier.team)*5];
        if(b.owner===carrier.id&&inKeeperBox(goalie.team,b)&&!goalie.dive&&goalie.cooldown===0&&keeperContact(goalie,b)){takeBall(f,goalie);goalie.cooldown=.7;carrier.cooldown=.8;f.charging=false;f.message='The keeper gathers. Build the next attack.';}
        // A carried ball outside the posts remains behind the boards.
        b.x=clamp(b.x,0,1000);b.y=clamp(b.y,0,600);
      }
    }else{
      const previous={x:b.x,y:b.y};advanceBall(b,dt);
      // Goal-line crossing uses the swept path, preventing fast shots tunnelling.
      if(b.x<0||b.x>1000){
        if(!goalCrossing(f,previous,emit)){b.x=clamp(b.x,4,996);b.vx*=-.62;b.shot=false;f.shotPending=0;if(f.setPiece){f.setPiece=null;emit('field-view');}f.message='Off the boards. Play on.';}
      }
      if(b.y<0||b.y>600){b.y=clamp(b.y,4,596);b.vy*=-.65;b.shot=false;}
      if(f.state==='live'&&b.lock===0){
        for(const p of f.players){
          if(f.setPiece&&!p.keeper||p.keeper&&p.team===0&&b.manualSave&&b.shot||p.keeper&&!inKeeperBox(p.team,b)||b.z>(p.keeper?p.dive?55:45:26))continue;
          if(p.cooldown>0||(p.keeper?!keeperContact(p,b):dist(p,b)>18))continue;
          if(b.shot&&p.team!==b.lastTouch&&p.keeper){f.saves[p.team]++;emit('field-save',{team:p.team});}
          takeBall(f,p);p.cooldown=p.keeper?.65:.35;f.shotPending=0;if(f.setPiece){f.setPiece=null;emit('field-view');}break;
        }
      }
    }
    if(f.elapsed>=duration-1e-8){if(f.shotPending>0||f.state==='goal')f.elapsed=duration-F.step;else{f.elapsed=duration;f.finished=true;f.state='ended';f.charging=false;f.input={x:0,y:0,sprint:false};emit('field-end');}}
  }
  function validField(f){
    const num=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
    const regulation=fieldRegulation(f),duration=fieldDuration(f),period=regulation/6;
    if(![105,300].includes(regulation)||f?.duration!==undefined&&![regulation,regulation+period,regulation+period*2].includes(f.duration))return false;
    if(!f||f.version!==1||!num(f.elapsed,0,duration)||!['ready','kickoff','live','goal','ended','foul','restart'].includes(f.state)||!num(f.wait,0,2.5)||!['always','tied'].includes(f.rule)||typeof f.finished!=='boolean'||typeof f.pensStarted!=='boolean'||f.finished!==(f.elapsed===duration)||f.pensStarted&&!f.finished)return false;
    if(f.celebration&&(![0,1].includes(f.celebration.team)||!Number.isInteger(f.celebration.scorer)||f.celebration.scorer<0||f.celebration.scorer>9||Math.floor(f.celebration.scorer/5)!==f.celebration.team||!num(f.celebration.elapsed,0,2.5)||f.celebration.duration!==2.5||f.state!=='goal'))return false;
    if((f.state==='ended')!==f.finished)return false;
    if(f.assists!==undefined&&typeof f.assists!=='boolean'||f.possessionGrace!==undefined&&!num(f.possessionGrace,0,2))return false;
    if(f.facilities!==undefined&&(!f.facilities||['passing','fitness','keeping'].some(k=>!Number.isInteger(f.facilities[k])||!num(f.facilities[k],0,3))))return false;
    if(Array.isArray(f.players)&&f.players.some(p=>p?.dive&&(!p.keeper||!num(p.dive.elapsed,0,.95)||['from','to'].some(k=>!p.dive[k]||!num(p.dive[k].x,15,985)||!num(p.dive[k].y,125,475)))))return false;
    if(!Number.isInteger(f.controlled)||![1,2,3,4].includes(f.controlled)||!Number.isInteger(f.seed)||!num(f.seed,0,4294967295)||!num(f.think,-1,1)||!num(f.power,0,1)||typeof f.charging!=='boolean'||typeof f.message!=='string'||f.message.length>200)return false;
    if(['score','shots','saves','passes'].some(key=>!Array.isArray(f[key])||f[key].length!==2||f[key].some(n=>!Number.isInteger(n)||!num(n,0,10000)))||!num(f.tackles,0,10000))return false;
    if(!Array.isArray(f.players)||f.players.length!==10||f.players.some((p,i)=>!p||p.id!==i||p.team!==Math.floor(i/5)||p.keeper!==(i%5===0)||!num(p.x,0,1000)||!num(p.y,0,600)||!num(p.vx,-400,400)||!num(p.vy,-400,400)||!num(p.dx,-1,1)||!num(p.dy,-1,1)||!num(p.stamina,0,1)||!num(p.cooldown,0,2)||!num(p.kick,0,1)||!num(p.anim,0,1e7)||!p.target||!num(p.target.x,-50,1050)||!num(p.target.y,-50,650)))return false;
    const b=f.ball;if(!b||!num(b.x,-30,1030)||!num(b.y,-30,630)||!num(b.z,0,500)||!num(b.vx,-1000,1000)||!num(b.vy,-1000,1000)||!num(b.vz,-500,500)||!num(b.lock,0,1)||![0,1].includes(b.lastTouch)||typeof b.shot!=='boolean'||b.owner!==null&&(!Number.isInteger(b.owner)||b.owner<0||b.owner>9))return false;
    if(b.lastPlayer!==undefined&&(!Number.isInteger(b.lastPlayer)||!num(b.lastPlayer,0,9)))return false;
    if(b.manualSave!==undefined&&typeof b.manualSave!=='boolean')return false;
    if(['manualSaves','manualAttempts'].some(key=>f[key]!==undefined&&(!Number.isInteger(f[key])||!num(f[key],0,10000)))||(f.manualSaves||0)>(f.manualAttempts||0))return false;
    if(f.saveWindow){
      const w=f.saveWindow,duration=w.duration??1,point=p=>p&&num(p.x,-30,1030)&&num(p.y,-30,630),screen=p=>p&&num(p.x,208,792)&&num(p.y,155,338);
      const ball=p=>point(p)&&num(p.z,0,500)&&num(p.vx,-1000,0)&&num(p.vy,-1000,1000)&&num(p.vz,-1100,500);
      if(![1,F.saveDuration].includes(duration)||f.state!=='live'||f.finish||f.foul||f.celebration||f.finished||!num(w.elapsed,0,duration)||!num(w.remaining,0,duration)||Math.abs(w.remaining+w.elapsed-duration)>1e-6||!num(w.flightTime,F.step,4.01)||!num(w.physicsTime,0,w.flightTime+.000001)||!ball(w.start)||!ball(w.end)||!point(w.origin)||!screen(w.preview)||!num(w.feedback,0,.5)||typeof w.announced!=='boolean'||![null,'save','miss','wide','block'].includes(w.result))return false;
      if(w.result===null&&(b.owner!==null||!b.shot||b.lastTouch!==1||!b.manualSave)||w.result!==null&&w.remaining!==0)return false;
      if(w.dive&&(!w.dive||!num(w.dive.x,-600,1600)||!num(w.dive.y,155,338)||!num(w.dive.started,0,duration)||w.dive.started>w.elapsed||!num(w.dive.duration,.15,duration+.1)))return false;
    }
    const taker=(id,team)=>Number.isInteger(id)&&id>team*5&&id<team*5+5;
    if(['fouls','penalties'].some(k=>f[k]!==undefined&&(!Array.isArray(f[k])||f[k].length!==2||f[k].some(n=>!Number.isInteger(n)||!num(n,0,10000)))))return false;
    if(f.shotPending!==undefined&&!num(f.shotPending,0,3))return false;
    if(f.keeperHold!==undefined&&!num(f.keeperHold,0,1.8))return false;
    if(f.finish&&(!['live','restart'].includes(f.state)||f.setPiece?.flight||!num(f.finish.remaining,0,Math.max(3,F.finishDuration))||!num(f.finish.power,.25,1)||!f.finish.aim||!num(f.finish.aim.x,170,830)||!num(f.finish.aim.y,115,365)||!taker(f.finish.taker,0)||f.controlled!==f.finish.taker||b.owner!==f.finish.taker||typeof f.finish.announced!=='boolean'))return false;
    if(f.foul){const q=f.foul;if(f.state!=='foul'||![0,1].includes(q.team)||!taker(q.taker,q.team)||b.owner!==q.taker||!taker(q.defender,1-q.team)||!['penalty','free-kick'].includes(q.kind)||!q.spot||!num(q.spot.x,0,1000)||!num(q.spot.y,0,600)||typeof q.announced!=='boolean')return false;}
    if(f.setPiece){const s=f.setPiece;if(!['restart','live'].includes(f.state)||![0,1].includes(s.team)||!taker(s.taker,s.team)||!['penalty','free-kick'].includes(s.kind)||typeof s.flight!=='boolean'||!num(s.remaining,0,4)||s.flight!==(f.state==='live')||!s.flight&&(b.owner!==s.taker||s.team===0&&f.controlled!==s.taker))return false;}
    if(f.state==='foul'&&!f.foul||f.state==='restart'&&!f.setPiece||f.finished&&(f.finish||f.foul||f.setPiece))return false;
    if(!f.input||!num(f.input.x,-1,1)||!num(f.input.y,-1,1)||typeof f.input.sprint!=='boolean')return false;
    return f.aim===null||f.aim&&num(f.aim.x,-20,1020)&&num(f.aim.y,0,600);
  }
  const api={FIELD:F,fieldRegulation,fieldDuration,createField,fieldStart,fieldMove,fieldSwitch,fieldCharge,fieldShoot,fieldPass,fieldTackle,fieldStep,fieldKeeperPose,fieldFinishAim,fieldRestart,fieldContactFoul,fieldShotSpec,fieldShotPreview,fieldCamera,fieldProject,fieldAimPoint,fieldSkipCelebration,fieldExtraPeriod,advanceBall,beginFieldSave,fieldTakeBall:takeBall,validField,matchScores};
  Object.assign(root.Panic||={},api);if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
