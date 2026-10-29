(function(root){
  'use strict';
  const P=typeof module!=='undefined'?require('./progression.js'):root.Panic;
  const G=Object.freeze({left:200,right:800,top:140,bottom:350,ballX:500,ballY:515,keeperX:500,keeperY:284,keeperScale:1.3,keeperArmReach:56,runUp:.72,ballRadius:8,gravity:760,step:1/120});
  const copy=x=>JSON.parse(JSON.stringify(x));
  const mix=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>{t=P.clamp(t,0,1);return t*t*t*(t*(t*6-15)+10);};
  function random(g){g.seed=(Math.imul(g.seed,1664525)+1013904223)>>>0;return g.seed/4294967296;}
  function shotSpec(g,power=g.power){
    const driven=g.shotType==='driven',sweet=driven?[.55,.78]:[.35,.82];
    const error=power<sweet[0]?(sweet[0]-power)*95:power>sweet[1]?(power-sweet[1])*170:0;
    const drift=error/(1+g.attributes.accuracy*.16)*(driven?1.2:.65);
    const target={x:g.aim.x+drift*(g.aim.x<500?-1:1),y:g.aim.y-drift*.45};
    const loftedTime=driven?1.06-power*.29:1.36-power*.22;
    // A harder strike gives gravity less time to bend the flight. At 65%+
    // the ball is still rising at the goal plane, including for low targets.
    const noDipTime=Math.sqrt(2*Math.max(1,G.ballY-target.y)/G.gravity)*.8;
    const fastTime=Math.min(driven?.65-power*.16:.72-power*.18,noDipTime*(driven?.9:1));
    const duration=mix(loftedTime,fastTime,smooth((power-.35)/.3))*(1-g.attributes.power*.02);
    return {target,duration,
      gravity:G.gravity,curl:g.curl*(28+g.attributes.curl*6),power,type:g.shotType};
  }
  // The vertical term is a ballistic parabola: y = y0 + vy*t + gravity*t²/2.
  // Initial velocity is solved for the chosen target, so preview and flight agree.
  function trajectory(s,t){
    t=P.clamp(t,0,1);
    const seconds=t*s.duration,vy=(s.target.y-G.ballY)/s.duration-s.gravity*s.duration/2;
    return {x:mix(G.ballX,s.target.x,t)+Math.sin(t*Math.PI)*s.curl,y:G.ballY+vy*seconds+.5*s.gravity*seconds*seconds,r:mix(14,G.ballRadius,t),groundY:mix(G.ballY,G.bottom,t),spin:seconds*(4+s.power*8)};
  }
  function flightVelocity(s,t=1){
    t=P.clamp(t,0,1);
    return {x:(s.target.x-G.ballX+Math.PI*Math.cos(t*Math.PI)*s.curl)/s.duration,y:(s.target.y-G.ballY)/s.duration+s.gravity*s.duration*(t-.5)};
  }
  function rebound(g,elapsed){
    const s=g.shot,event=g.event,start=trajectory(s,1),v=flightVelocity(s);
    elapsed=P.clamp(elapsed,0,4);
    if(event==='save'&&g.contact?.part==='gloves'&&s.power<.73){
      const pose=keeperPose(g,(g.contactTime??s.started+s.duration)+elapsed),hands=pose.hands,f=smooth(elapsed/.09);
      return {...start,x:mix(start.x,(hands[0].x+hands[1].x)/2,f),y:mix(start.y,(hands[0].y+hands[1].y)/2,f)};
    }
    let x=start.x,y=start.y,groundY=Math.max(G.bottom,y+start.r),r=start.r,spin=start.spin,grounded=false;
    let vx=v.x*.65,vy=v.y*.65,depth=-30;
    const restitution=event==='goal'?.24:event==='post'?.52:.43;
    if(event==='goal'){vx=v.x*.07;vy=v.y*.12;depth=-16;}
    else if(event==='post'){
      const crossbar=Math.abs(s.target.y-G.top)<=G.ballRadius+3;
      if(crossbar)vy=-v.y*.58;else vx=-v.x*.65;
      depth=90+Math.hypot(v.x,v.y)*.08;
    }else if(event==='save'){
      const point=g.contact?.point||s.target,dx=x-point.x,dy=y-point.y,n=Math.max(1,Math.hypot(dx,dy));
      vx=v.x*.35+dx/n*(45+s.power*65);vy=-Math.abs(v.y)*.28-35+dy/n*35;
      depth=75+Math.hypot(v.x,v.y)*.09;
    }
    // Integrate the final partial step too, so a render frame never overshoots.
    for(let time=0;time<elapsed;){
      const dt=Math.min(G.step,elapsed-time);time+=dt;
      const damping=Math.exp(-(grounded?3.8:.65)*dt);vx*=damping;depth*=Math.exp(-(grounded?3:1.8)*dt);
      x+=vx*dt;groundY+=depth*dt;r=P.clamp(G.ballRadius+(groundY-G.bottom)*.03,7,14);
      if(grounded)y=groundY-r;
      else{
        y+=vy*dt+.5*G.gravity*dt*dt;vy+=G.gravity*dt;
        if(y+r>=groundY){
          y=groundY-r;const impact=Math.max(0,vy-depth);
          grounded=impact*restitution<28;vy=depth-impact*restitution;vx*=.76;
        }
      }
      if(event==='goal'&&(x<G.left+16||x>G.right-16)){x=P.clamp(x,G.left+16,G.right-16);vx*=-.25;}
      if(x<45||x>955){x=P.clamp(x,45,955);vx*=-.3;}
      spin+=(vx*.025+(grounded?0:Math.abs(vy-depth)*.005))*dt;
    }
    return {x,y,r,groundY,spin};
  }
  function readyKeeperPose(x=500,y=G.keeperY){
    const s=G.keeperScale;
    return {body:{x,y,rx:19*s,ry:32*s,angle:0,scale:s},hands:[{x:x-28*s,y:y+5*s,r:15},{x:x+28*s,y:y+5*s,r:15}],angle:0,progress:0,groundY:y+G.bottom-G.keeperY,state:'ready'};
  }
  function keeperPose(g,at=g.time){
    const standing=readyKeeperPose();
    if(!g.dive){
      if(g.event==='save'&&g.contact?.part==='gloves'&&g.shot?.power<.73){
        const close=smooth((at-(g.contactTime??g.shot.started+g.shot.duration))/.12);
        standing.hands[0].x=mix(500-28*G.keeperScale,492,close);standing.hands[1].x=mix(500+28*G.keeperScale,508,close);
        standing.hands.forEach(h=>{h.y=mix(G.keeperY+5*G.keeperScale,G.keeperY-5,close);});
      }
      return standing;
    }
    const d=g.dive,elapsed=Math.max(0,at-d.started),duration=d.duration;
    const f=smooth(elapsed/duration),side=Math.sign(d.x-500),height=P.clamp((320-d.y)/135,0,1);
    const fallTime=.36+height*.18+(g.role==='keep'?g.attributes.reaction*.03:0);
    const land=smooth((elapsed-duration)/fallTime),glide=side*18*land;
    const reachAngle=Math.atan2(G.keeperArmReach,mix(12,24,height));
    const angle=side*mix(reachAngle*smooth(elapsed/(duration*.85)),1.52,land);
    // Low saves dip straight down; high saves rise once and immediately fall.
    // The torso follows the hands, then slides onto its side without hovering.
    const reachY=side?d.y+mix(12,24,height)*G.keeperScale:Math.min(G.keeperY+5,d.y+G.keeperArmReach*G.keeperScale);
    const body={x:mix(500,d.x-side*G.keeperArmReach*G.keeperScale,f)+glide,y:mix(G.keeperY,reachY,f)-4*f*(1-f)*height*8,rx:19*G.keeperScale,ry:32*G.keeperScale,angle,scale:G.keeperScale};
    body.y=mix(body.y,side?339:G.keeperY+6,land);
    const hx=mix(500,d.x,f)+glide,hy=mix(mix(G.keeperY+5*G.keeperScale,d.y,f),side?337:G.keeperY+15,land);
    let extension=0,vertical=0;
    if(g.shot){
      // A small, visibly drawn final arm reach; upgrades never extend the body hitbox.
      const observed=trajectory(g.shot,(at-g.shot.started)/g.shot.duration),extra=g.role==='keep'?g.attributes.reach*2:0;
      const reach=smooth((f-.25)/.65)*(1-land);
      extension=P.clamp(observed.x-hx,-24-extra,24+extra)*reach;
      vertical=P.clamp(observed.y-hy,-10,10)*reach;
    }
    body.x+=extension*.75;body.y+=vertical*.4*height;
    // Open around the head during the push-off, then bring both palms to the ball.
    const spacing=(mix(28,9,f)+10*Math.sin(Math.PI*f)**2)*G.keeperScale;
    const hands=[-1,1].map(sign=>({x:hx+sign*spacing*Math.cos(angle)+extension,y:hy+sign*spacing*Math.sin(angle)+vertical,r:15}));
    return {body,hands,angle,progress:f,landing:land,groundY:350,state:land===1?'grounded':elapsed>=duration?'landing':'diving'};
  }
  function diveDuration(g,minimum){
    // Commit immediately and spread the push-off over the remaining flight.
    // A late input still cannot move faster than the keeper's minimum travel time.
    const remaining=g.phase==='flight'&&g.shot?g.shot.started+g.shot.duration-g.time:0;
    return Math.max(minimum,Math.min(1.35,remaining-.04));
  }
  function contact(ball,pose){
    for(const h of pose.hands)if(Math.hypot(ball.x-h.x,ball.y-h.y)<=h.r+G.ballRadius)return {hit:true,part:'gloves',point:{x:h.x,y:h.y}};
    const b=pose.body;
    const angle=b.angle||0,dx=ball.x-b.x,dy=ball.y-b.y;
    const localX=dx*Math.cos(angle)+dy*Math.sin(angle),localY=-dx*Math.sin(angle)+dy*Math.cos(angle);
    if((localX/(b.rx+G.ballRadius))**2+(localY/(b.ry+G.ballRadius))**2<=1)return {hit:true,part:'body',point:{x:ball.x,y:ball.y}};
    return {hit:false};
  }
  function predictKeeper(observation,profile,rng,style){
    const {ball,previous,delta,remaining,hint}=observation;
    const reading=rng()<profile.prediction;
    let x=reading?ball.x+(ball.x-previous.x)/delta*remaining:500+(rng()<.5?-1:1)*(65+rng()*180);
    let y=hint.y;
    x+=(rng()-.5)*profile.error*2;y+=(rng()-.5)*profile.error*.65;
    if(!reading&&rng()<.2)x=500;
    if(style==='low')y+=24;
    return {x:P.clamp(x,500-profile.travel,500+profile.travel),y:P.clamp(y,170,330),duration:profile.duration};
  }
  function aimPoint(x,y){return {x:P.clamp(x,G.left-35,G.right+35),y:P.clamp(y,G.top-25,G.bottom+25)};}
  function divePoint(x,y){return {x:P.clamp(x,G.left+8,G.right-8),y:P.clamp(y,G.top+15,G.bottom-12)};}
  const keysToTarget=keys=>({x:keys.has('KeyA')?245:keys.has('KeyD')?755:keys.has('KeyQ')?372:keys.has('KeyE')?628:500,y:keys.has('KeyS')?320:keys.has('KeyW')?185:250});
  const fieldSavePoint=b=>({x:200+(b.y-220)*3.75,y:350-b.z*210/58});
  function fieldSavePose(g){
    const w=g.field.saveWindow,offset=fieldSavePoint({y:w.origin.y,z:0}).x-500;
    const pose=keeperPose({time:w.elapsed+w.feedback,role:'keep',attributes:g.attributes,dive:w.dive?{...w.dive,x:w.dive.x-offset}:null});
    pose.body.x+=offset;pose.hands.forEach(h=>h.x+=offset);return pose;
  }
  function crossbarTarget(g){
    const c=g.crossbar,speed={easy:.8,normal:1.15,hard:1.5}[g.difficulty];
    return c.locked??500+Math.sin(c.offset+(g.time-g.phaseStart)*speed)*225;
  }
  class Simulation {
    constructor(save,mode='match',options={}){
      this.events=[];this.accumulator=0;
      const stage=P.stages[options.stage||0];
      const opponent=mode==='career'?{name:stage.opponent,badge:stage.badge,color:stage.color,style:stage.style,hint:stage.hint}:{name:'Panic Athletic',badge:'PA',color:'#ef8e9c',style:'balanced',hint:'Mix up your finishes. Stay composed.'};
      if(mode==='crossbar'){opponent.name='Crossbar Circuit';opponent.badge='CC';}
      if(mode==='survival'){opponent.name='Survival squad';opponent.badge='SS';}
      this.g={schema:2,id:options.id||root.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`,mode,stage:options.stage||0,difficulty:mode==='career'?stage.difficulty:save.settings.difficulty,keeperLevel:save.settings.keeperLevel,opponent,attributes:copy(save.upgrades),seed:options.seed??Math.floor(Math.random()*4294967296),time:0,phase:'aim',phaseStart:0,role:'shoot',a:[],b:[],round:0,goals:0,saves:0,misses:0,conceded:0,aiMisses:0,blocked:0,wide:0,posts:0,streak:0,best:0,complete:false,result:null,score:'',aim:{x:680,y:210},aimLocked:false,power:.6,charging:false,curl:0,shotType:'placed',shot:null,dive:null,incoming:null,lastIncoming:null,event:null,detail:'',feedback:'',drill:options.drill||'mixed',drillHits:0,drillAttempts:0,drillTarget:null,trainingSpeed:save.settings.trainingSpeed,tutorialStep:0,divePreview:null};
      this.g.team=P.normalizeClub(save.club);
      if(mode==='competition'){
        const campaign=save.competitions[options.kind],fixture=P.competitionMatch(campaign);
        if(!fixture)throw Error('No competition fixture is ready.');
        Object.assign(this.g,fixture);this.g.seed=(campaign.seed+campaign.results.length*977)>>>0;
      }
      if(mode==='league'){
        const fixture=P.leagueMatch(save.league);if(!fixture)throw Error('No Champions League fixture is ready.');
        Object.assign(this.g,fixture);this.g.seed=(save.league.seed+save.league.results.length*977)>>>0;
      }
      // Campaigns retain their club identity; the current squad preference applies everywhere.
      this.g.team=P.normalizeClub({...this.g.team,playerGender:P.playerGender(save.club)});
      this.g.roster=P.buildRoster(this.g.team,this.g.opponent);
      if(mode==='rush')this.g.rush={remaining:60,started:false,points:0,hits:0,combo:0,bestCombo:0,target:null};
      if(mode==='crossbar')this.g.crossbar={points:0,hits:0,precision:0,combo:0,bestCombo:0,offset:0,radius:48,locked:null};
      if(mode==='survival')this.g.survival={lives:3};
      if(options.regulation&&['match','career','league','competition'].includes(mode)){
        this.g.field=P.createField(this.g,'tied',save.settings.matchAssists,save.facilities);this.g.phase='field';this.emit('phase');
      }else this.next();
    }
    static restore(raw){
      if(!validSnapshot(raw))return null;
      const sim=Object.create(Simulation.prototype);sim.events=[];sim.accumulator=0;sim.g=copy(raw);if(sim.g.team)sim.g.team=P.normalizeClub(sim.g.team);sim.g.roster ||= P.buildRoster(sim.g.team,sim.g.opponent);sim.g.charging=false;if(sim.g.field){const f=sim.g.field;if(P.fieldRegulation(f)!==P.FIELD.duration){const ratio=P.FIELD.duration/P.fieldRegulation(f);f.elapsed*=ratio;if(f.duration!==undefined)f.duration=Math.round(f.duration*ratio*1000)/1000;f.regulationDuration=P.FIELD.duration;if(f.finished)f.elapsed=P.fieldDuration(f);}if(!sim.g.field.pensStarted)sim.g.field.rule='tied';if(sim.g.field.finish)sim.g.field.finish.remaining=Math.min(sim.g.field.finish.remaining,P.FIELD.finishDuration);sim.g.field.charging=false;sim.g.field.input={x:0,y:0,sprint:false};}sim.g.drillHits ||= 0;sim.g.drillAttempts ||= 0;return sim;
    }
    snapshot(){return copy(this.g);}
    emit(type,data={}){this.events.push({type,...data});}
    isPractice(){return this.g.mode.startsWith('practice');}
    next(repeat=false){
      const g=this.g;if(g.complete)return;
      if(g.phase==='field')return;
      if(g.phase==='interval'){
        if(g.mode!=='competition'&&g.field.rule==='tied'&&g.field.score[0]!==g.field.score[1]){this.finishRegulation();return;}
        g.field.pensStarted=true;g.phase='aim';
      }
      g.role=['challenge','survival','practice-keep'].includes(g.mode)||(g.mode==='tutorial'&&g.tutorialStep>0)?'keep':['practice-shoot','tutorial','rush','crossbar'].includes(g.mode)?'shoot':g.a.length>g.b.length?'keep':'shoot';
      g.phase=g.role==='keep'?'read':'aim';g.phaseStart=g.time;g.dive=null;g.shot=null;g.event=null;g.charging=false;g.power=.6;g.aimLocked=false;g.divePreview=null;
      if(g.role==='keep'){
        const d=P.difficulties[g.difficulty],intensity=P.competitionChallenge(g.competition).intensity,speedup=g.mode==='survival'?Math.min(.28,Math.floor(g.round/5)*.035):g.mode==='challenge'?Math.min(.15,g.round*.014):0;
        g.readDuration=d.read-speedup;
        if(!this.isPractice()&&/TO WIN|STAY IN/.test(P.pressure(g.a,g.b,'keep')))g.readDuration+=.22;
        if(repeat&&g.lastIncoming)g.incoming=copy(g.lastIncoming);
        else {
          let side=random(g)<(g.opponent.style==='left'?.75:.5)?-1:1;
          const heightRoll=random(g);
          let x=500+side*(75+random(g)*180+intensity*20),y=heightRoll<(g.opponent.style==='power'?.2:.35)?180+random(g)*25:heightRoll<.55?242+random(g)*18:308+random(g)*25;
          if(g.drill==='short')x=side<0?372:628;
          if(g.drill==='high')y=185;
          if(g.drill==='corners'){x=side<0?245:755;y=320;}
          if(g.mode==='tutorial'){x=g.tutorialStep===1?755:372;y=320;g.readDuration=1.7;}
          g.incoming={target:{x,y},hint:{x,y},duration:(d.flight-speedup)*(g.opponent.style==='power'?.9:1),gravity:G.gravity,curl:(random(g)-.5)*35,power:.55+random(g)*.25,type:'placed'};
          if(!this.isPractice()&&g.mode!=='tutorial'&&random(g)<d.miss*(1-.35*intensity))g.incoming.target.x=side<0?170:830;
          else {const error=d.error*(1-.45*intensity);g.incoming.target.x+=(random(g)-.5)*error;g.incoming.target.y+=(random(g)-.5)*error*.5;}
          if(g.mode==='tutorial'){g.incoming.target={x,y};g.incoming.duration=1.4;}
          if(['match','career','league','competition'].includes(g.mode))g.incoming.duration=P.FIELD.saveDuration;
          g.lastIncoming=copy(g.incoming);
        }
        g.feedback=g.survival?`Wave ${1+Math.floor(g.round/5)} · ${g.survival.lives} lives`:'Read the run-up';g.detail='Watch the striker. Dive after the kick.';
      }else {
        if(g.mode==='rush'){
          const spots=[{x:245,y:185},{x:755,y:185},{x:372,y:305},{x:628,y:305},{x:245,y:305},{x:755,y:305}];
          const available=spots.filter(p=>!g.rush.target||p.x!==g.rush.target.x||p.y!==g.rush.target.y);
          g.rush.target={...available[Math.floor(random(g)*available.length)],r:Math.max(22,({easy:40,normal:34,hard:28})[g.difficulty]-Math.floor(g.rush.hits/5)*2)};
        }
        if(g.mode==='practice-shoot'&&!repeat)g.drillTarget=['corners','high'].includes(g.drill)?{x:random(g)<.5?245:755,y:g.drill==='high'?185:320}:null;
        g.feedback='Choose your finish';g.detail='Click the goal to lock your target. Hold Space or Shoot, then release.';
        if(g.mode==='tutorial'){g.aim={x:730,y:200};g.detail='Step 1: click a corner, then hold and release Shoot in the green zone.';}
        if(g.crossbar){
          g.crossbar.offset=random(g)*Math.PI*2;g.crossbar.radius=({easy:64,normal:48,hard:34})[g.difficulty]-Math.floor(g.round/3)*3;g.crossbar.locked=null;
          g.aim={x:500,y:G.top};g.feedback='Time the gold zone';g.detail='Aim left or right. Release at 55–78% power as the gold zone reaches your aim.';
        }
      }
      this.emit('phase');
    }
    aim(x,y){if(this.g.phase!=='aim')return;this.g.aim=this.g.crossbar?{x:P.clamp(x,G.left+20,G.right-20),y:G.top}:aimPoint(x,y);this.g.aimLocked=true;}
    charge(){const g=this.g;if(g.phase!=='aim'||g.complete||g.charging)return;g.charging=true;g.power=.08;if(g.rush)g.rush.started=true;}
    release(){
      const g=this.g;if(!g.charging||g.phase!=='aim')return;
      if(g.crossbar)g.crossbar.locked=crossbarTarget(g);
      g.charging=false;g.shot={...shotSpec(g),runUp:G.runUp,started:g.time+G.runUp};g.shot.hint={x:Math.round(g.aim.x/130)*130,y:g.aim.y<250?190:315};
      g.phase='kick';g.phaseStart=g.time;g.feedback='Step in. Plant. Strike.';this.emit('phase');
    }
    dive(x,y){const g=this.g;if(g.role!=='keep'||g.dive||!['read','flight'].includes(g.phase))return;const p=divePoint(x,y);g.dive={...p,started:g.time,duration:diveDuration(g,.28+Math.abs(p.x-500)/1500)};this.emit('dive');}
    fieldDive(x,y){
      const g=this.g,w=g.field?.saveWindow;if(g.phase!=='field'||!w||w.result||w.dive||w.remaining<=0)return false;
      const p=divePoint(x,y),centre=fieldSavePoint({y:w.origin.y,z:0}).x,reach=270+g.attributes.reach*7+(g.field.facilities?.keeping||0)*6;
      w.preview=p;w.dive={x:P.clamp(p.x,centre-reach,centre+reach),y:p.y,started:w.elapsed,duration:Math.max(.22-g.attributes.reaction*.01,w.remaining-.035)};this.emit('dive');return true;
    }
    fieldSaveStep(dt){
      const g=this.g,f=g.field,w=f.saveWindow,b=f.ball,k=f.players[0];
      if(!w.announced){w.announced=true;this.emit('field-view');this.emit('field-save-ready');return;}
      if(w.result){
        w.feedback=Math.min(.5,w.feedback+dt);
        const pose=fieldSavePose(g);k.y=P.clamp(220+(pose.body.x-200)/3.75,130,470);
        if(w.feedback>=.5){f.saveWindow=null;k.dive=null;k.target={x:43,y:k.y};k.cooldown=.55;this.emit('field-view');}return;
      }
      const duration=w.duration??1;
      w.elapsed=Math.min(duration,w.elapsed+dt);if(w.elapsed>duration-1e-8)w.elapsed=duration;w.remaining=duration-w.elapsed;
      const physical=w.elapsed/duration*w.flightTime;
      while(w.physicsTime<physical-1e-10){
        const step=Math.min(P.FIELD.step,physical-w.physicsTime);P.advanceBall(b,step);w.physicsTime+=step;b.lock=Math.max(0,b.lock-step);
        // Outfield bodies still block the real flight; the cinematic never bypasses them.
        const blocker=!f.setPiece&&b.z<=26&&b.lock===0&&f.players.find(p=>!p.keeper&&p.id!==b.lastPlayer&&p.cooldown<=w.physicsTime&&Math.hypot(p.x-b.x,p.y-b.y)<18);
        if(blocker){P.fieldTakeBall(f,blocker);blocker.cooldown=.35;w.elapsed=duration;w.remaining=0;w.result='block';f.shotPending=0;f.message='Blocked by an outfield player. Play on.';return;}
      }
      const pose=fieldSavePose(g);k.y=P.clamp(220+(pose.body.x-200)/3.75,130,470);
      if(w.remaining>0)return;
      const point=fieldSavePoint(b),hit=w.start.x>=w.origin.x-12&&contact(point,pose).hit;
      if(hit){
        P.fieldTakeBall(f,k);Object.assign(b,{x:k.x,y:k.y});k.cooldown=.55;f.saves[0]++;f.manualSaves=(f.manualSaves||0)+1;f.setPiece=null;f.shotPending=0;w.result='save';f.message='SAVED! You met the ball with your dive.';this.emit('field-save',{team:0});
      }else{
        w.result=point.x<218||point.x>782||point.y<140?'wide':'miss';
        f.message=w.result==='wide'?'Off target. The ball stays live.':!w.dive?'No dive. The shot gets past you.':w.elapsed-w.dive.started<w.dive.duration*.7?'Too late to reach the ball.':'Your hands missed the ball. Match the height and direction.';
      }
      this.emit('field-save-result');
    }
    step(realDt){
      const g=this.g;if(g.complete&&g.phase!=='feedback')return;
      const speed=this.isPractice()?g.trainingSpeed:1;
      this.accumulator+=Math.min(realDt,.25)*speed;
      while(this.accumulator+1e-10>=G.step){this.tick(G.step);this.accumulator-=G.step;}
    }
    tick(dt){
      const g=this.g;g.time+=dt;
      if(g.phase==='field'){
        if(g.field.saveWindow){this.fieldSaveStep(dt);return;}
        P.fieldStep(g,dt,(type,data)=>this.emit(type,data));
        if(g.field.finished)this.finishRegulation();
        return;
      }
      if(g.phase==='interval')return;
      if(g.rush&&!g.complete&&g.rush.started){
        g.rush.remaining=Math.max(0,g.rush.remaining-dt);
        if(g.rush.remaining<1e-7)g.rush.remaining=0;
        if(!g.rush.remaining&&!['kick','flight'].includes(g.phase)){this.finishRush();return;}
        if(g.phase==='feedback'&&g.time-g.phaseStart>=.55){this.next();return;}
      }
      if(g.charging)g.power=Math.min(1,g.power+dt*.62);
      if(g.phase==='read'&&g.time-g.phaseStart>=g.readDuration){g.shot={...copy(g.incoming),runUp:g.readDuration,started:g.phaseStart+g.readDuration};g.phase='flight';g.phaseStart=g.shot.started;g.feedback='DIVE NOW';this.emit('kick');this.emit('phase');}
      if(g.phase==='kick'&&g.time>=g.shot.started){g.phase='flight';g.phaseStart=g.shot.started;this.emit('kick');this.emit('phase');}
      if(g.phase==='flight'){
        const s=g.shot,elapsed=g.time-s.started;
        if(g.role==='shoot'&&!g.dive&&!['rush','crossbar'].includes(g.mode)){
          const base=P.keeperLevels[g.keeperLevel],intensity=P.competitionChallenge(g.competition).intensity;
          const p={...base,reaction:base.reaction-intensity*.045,error:base.error*(1-.25*intensity),prediction:base.prediction+intensity*.1},reaction=p.reaction+(g.opponent.style==='early'?-.10:0);
          if(elapsed>=reaction){
            const at=Math.min(elapsed,s.duration-.01),delta=.04;
            const observation={ball:trajectory(s,at/s.duration),previous:trajectory(s,Math.max(0,at-delta)/s.duration),delta,remaining:s.duration-at,hint:s.hint};
            const decision=predictKeeper(observation,p,()=>random(g),g.opponent.style);
            g.dive={...decision,duration:diveDuration(g,decision.duration),started:g.time};
          }
        }
        if(elapsed>=s.duration)this.resolve(s.started+s.duration);
      }
    }
    finishRegulation(){
      const g=this.g,f=g.field;
      if(g.complete||!f?.finished)return;
      if(g.mode==='competition'){
        const tag=g.competition,agg=tag.aggregate,delta=f.score[0]+agg[0]-f.score[1]-agg[1];
        const regulation=P.fieldRegulation(f),period=regulation/6,second=f.duration===regulation+period;
        // Keep two equal extra-time periods, scaled to the match length.
        if(second||(tag.deciding&&delta===0&&P.fieldDuration(f)===regulation)){
          f.duration=regulation+period*(second?2:1);f.finished=false;P.fieldExtraPeriod(f);g.phase='field';
          f.message=`Extra time: ${second?'second':'first'} ${period}-second period.`;this.emit('phase');return;
        }
        if(tag.deciding&&delta===0){g.phase='interval';g.feedback='Extra time complete. Penalties.';g.detail='Aggregate still level. The shootout decides who advances.';this.emit('phase');return;}
        g.complete=true;g.result=tag.deciding?(delta>0?'win':'loss'):f.score[0]>f.score[1]?'win':f.score[0]<f.score[1]?'loss':'draw';
        g.score=f.score.join(' – ');g.phase='feedback';g.phaseStart=g.time;g.feedback='Full time';g.detail=tag.deciding?`Aggregate ${f.score[0]+agg[0]} : ${f.score[1]+agg[1]}.`:tag.leg===1?'First leg complete. The return leg decides the tie.':g.result==='draw'?'A point each. No shootout.':'League points awarded.';this.emit('complete');return;
      }
      if(f.rule==='tied'&&f.score[0]!==f.score[1]){
        g.complete=true;g.result=f.score[0]>f.score[1]?'win':'loss';g.score=f.score.join(' – ');g.phase='feedback';g.phaseStart=g.time;g.feedback='Full time';g.detail='Full time played.';this.emit('complete');
      }else{g.phase='interval';g.feedback='Full time. To the spot.';g.detail=f.rule==='always'?'Your match score carries into penalties.':'Scores level. Penalties decide the winner.';this.emit('phase');}
    }
    finishRush(){
      const g=this.g;if(g.complete)return;
      g.complete=true;g.result='complete';g.score=`${g.rush.points} pts`;g.charging=false;g.phase='feedback';g.phaseStart=g.time;
      g.feedback='Time!';g.detail=`${g.rush.hits} targets hit. Best combo: ${g.rush.bestCombo}.`;
      this.emit('complete');
    }
    finishSurvival(){
      const g=this.g;if(g.mode!=='survival'||g.complete||g.phase!=='feedback'||g.survival.lives>0&&g.saves===0)return;
      g.complete=true;g.result='complete';g.score=`${g.saves} saves · ${g.round} shots`;
      g.feedback=g.survival.lives?'Run banked!':'The wall comes down';g.detail=`${g.saves} saves. Best streak ${g.best}. Your rewards are ready.`;
      this.emit('complete');
    }
    resolve(at){
      const g=this.g,t=g.shot.target,pose=keeperPose(g,at);
      const frame=(Math.abs(t.x-G.left)<=G.ballRadius+3||Math.abs(t.x-G.right)<=G.ballRadius+3)&&t.y>=G.top-10&&t.y<=G.bottom+5||Math.abs(t.y-G.top)<=G.ballRadius+3&&t.x>=G.left-10&&t.x<=G.right+10;
      const inside=t.x>G.left&&t.x<G.right&&t.y>G.top&&t.y<G.bottom;
      const hit=inside&&!frame&&!['rush','crossbar'].includes(g.mode)?contact(t,pose):{hit:false};
      const event=frame?'post':!inside?'wide':hit.hit?'save':'goal';
      g.event=event;g.contact=hit;g.contactPose=pose;g.contactTime=at;g.round++;
      if(g.role==='shoot'){
        g.goals+=Number(event==='goal');g.misses+=Number(event!=='goal');g.blocked+=Number(event==='save');g.posts+=Number(event==='post');g.wide+=Number(event==='wide');
        if(['match','career','league','competition'].includes(g.mode))g.a.push(event==='goal');
      }else{
        g.saves+=Number(event==='save');g.conceded+=Number(event==='goal');g.aiMisses+=Number(['post','wide'].includes(event));
        g.streak=event==='save'?g.streak+1:0;g.best=Math.max(g.best,g.streak);
        if(['match','career','league','competition'].includes(g.mode))g.b.push(event==='goal');
      }
      const keeper=g.role==='keep';
      g.feedback=event==='goal'?(keeper?'They found the net':'What a finish!'):event==='save'?(keeper?'Safe hands!':'Keeper got a touch'):event==='post'?'Off the woodwork':'Wide of the mark';
      if(keeper&&event==='goal'){
        const elapsed=g.dive?at-g.dive.started:0;
        g.detail=!g.dive?'Commit to a dive after the kick.':elapsed<g.dive.duration*.6?'Too late — start your dive sooner.':pose.state==='grounded'?'Too early — you landed before the ball arrived.':Math.abs(t.y-g.dive.y)>45?'Wrong height — use W high or S low.':'Outside your hands — try Q/E for a short dive or click the exact spot.';
      }else g.detail=event==='save'?(keeper?(hit.part==='body'?'A solid body block.':'Your gloves met the ball.'):'The keeper got a touch. Try changing height or using a driven finish.') :event==='goal'?'Good placement and controlled power.':event==='post'?(keeper?'The woodwork comes to your rescue.':'Fine margins. Aim a little inside the frame.'):(keeper?'The striker missed the frame. Stay ready for the next one.':'Check the projected landing marker before releasing.');
      if(g.mode==='practice-shoot'&&g.drill!=='mixed'){
        g.drillAttempts++;
        const success=event==='goal'&&(g.drill==='power'?(g.shot.power>=.6&&g.shot.power<=.7):g.drillTarget&&Math.hypot(t.x-g.drillTarget.x,t.y-g.drillTarget.y)<35);
        g.drillHits+=Number(!!success);g.detail+=(success?' Drill target hit!':g.drill==='power'?' Training target: release between 60% and 70%.':' Find the highlighted training target.');
      }
      if(g.rush){
        const distance=Math.hypot(t.x-g.rush.target.x,t.y-g.rush.target.y),hit=event==='goal'&&distance<=g.rush.target.r;
        g.rush.hits+=Number(hit);g.rush.combo=hit?g.rush.combo+1:0;g.rush.bestCombo=Math.max(g.rush.bestCombo,g.rush.combo);
        const multiplier=1+Math.min(4,Math.floor(g.rush.combo/3)),bullseye=hit&&distance<=g.rush.target.r*.4;
        const points=hit?(bullseye?100:60)*multiplier:event==='goal'?10:0;g.rush.points+=points;
        g.feedback=hit?(bullseye?'Bullseye!':'Target hit!'):event==='goal'?'Goal. Find the target next time.':g.feedback;
        g.detail=`+${points} points · ${hit?`x${multiplier} multiplier · ${g.rush.combo} hit combo`:'Combo reset'} · Next ball is on its way.`;
      }
      if(g.crossbar){
        const c=g.crossbar,bar=event==='post'&&Math.abs(t.y-G.top)<=G.ballRadius+3&&t.x>G.left+12&&t.x<G.right-12;
        const gold=bar&&Math.abs(t.x-c.locked)<=c.radius&&g.shot.power>=.55&&g.shot.power<=.78;
        c.hits+=Number(bar);c.precision+=Number(gold);c.combo=gold?c.combo+1:0;c.bestCombo=Math.max(c.bestCombo,c.combo);
        const points=gold?100+25*Math.min(4,c.combo-1):bar?40:0;c.points+=points;
        g.feedback=gold?'Gold zone!':bar?'Crossbar!':'Over the bar';
        g.detail=`+${points} points · ${gold?`${c.combo} gold-hit combo`:bar?'Gold bonus needs the highlighted zone AND 55–78% power.':'Keep your power controlled.'} · ${10-g.round} balls left.`;
      }
      if(g.survival){g.survival.lives-=Number(event==='goal');g.detail+=` ${g.survival.lives} ${g.survival.lives===1?'life':'lives'} left.`;}
      g.phase='feedback';g.phaseStart=g.time;
      this.emit('resolved',{event,success:g.crossbar?event==='post':keeper?event==='save':event==='goal'});
      if(g.rush){if(!g.rush.remaining)this.finishRush();return;}
      if(g.survival){if(!g.survival.lives)this.finishSurvival();return;}
      if(g.crossbar){if(g.round===10){g.complete=true;g.result='complete';g.score=`${g.crossbar.points} pts`;this.emit('complete');}return;}
      if(g.mode==='tutorial'){
        if((!keeper&&event==='goal')||(keeper&&event==='save'))g.tutorialStep++;
        if(g.tutorialStep>=3){g.complete=true;g.result='complete';this.emit('complete');}
      }else if(g.mode==='challenge'&&g.round>=10){g.complete=true;g.result='complete';}
      else if(!this.isPractice()&&g.mode!=='challenge'){g.result=P.matchOutcome(g);g.complete=!!g.result;}
      if(g.complete&&g.mode!=='tutorial'){g.score=g.mode==='challenge'?`${g.saves} saves / 10`:P.matchScores(g).join(' – ');this.emit('complete');}
    }
  }
  function validSnapshot(g){
    if(!g||g.schema!==2||g.complete||!['match','career','league','competition','challenge','practice-shoot','practice-keep','tutorial','rush','crossbar','survival'].includes(g.mode)||!['field','interval','aim','read','kick','flight','feedback'].includes(g.phase)||!['shoot','keep'].includes(g.role)||typeof g.id!=='string'||!Object.hasOwn(P.difficulties,g.difficulty)||!Object.hasOwn(P.keeperLevels,g.keeperLevel))return false;
    if(g.roster!==undefined&&!P.validRoster(g.roster))return false;
    if(g.field&&(!['match','career','league','competition'].includes(g.mode)||!P.validField(g.field)))return false;
    if(g.field&&!['field','interval'].includes(g.phase)&&(!g.field.finished||!g.field.pensStarted))return false;
    if(['field','interval'].includes(g.phase)&&(!g.field||g.phase==='field'&&g.field.finished||g.phase==='interval'&&(!g.field.finished||g.field.pensStarted)))return false;
    if(!P.validLeagueTag(g)||!P.validCompetitionTag(g))return false;
    if(!P.validArcade(g))return false;
    if(!Number.isInteger(g.stage)||g.stage<0||g.stage>=P.stages.length||!g.opponent||typeof g.opponent.name!=='string')return false;
    for(const k of ['time','phaseStart','power','goals','saves','misses','round','conceded','aiMisses','best','streak','wide','posts','blocked'])if(!Number.isFinite(g[k])||g[k]<0||g[k]>1e8)return false;
    if(!Number.isInteger(g.seed)||g.seed<0||g.seed>4294967295)return false;
    for(const k of ['a','b'])if(!Array.isArray(g[k])||g[k].length>1000||g[k].some(v=>typeof v!=='boolean'))return false;
    const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<2000&&Math.abs(p.y)<2000;
    if(g.mode!=='rush'&&g.rush!=null)return false;
    if(g.mode==='rush'&&(!g.rush||!Number.isFinite(g.rush.remaining)||g.rush.remaining<0||g.rush.remaining>60||typeof g.rush.started!=='boolean'||!point(g.rush.target)||!Number.isFinite(g.rush.target.r)||g.rush.target.r<22||g.rush.target.r>40||['points','hits','combo','bestCombo'].some(k=>!Number.isInteger(g.rush[k])||g.rush[k]<0||g.rush[k]>1e7)))return false;
    if(!point(g.aim)||!g.attributes||Object.keys(P.upgrades).some(k=>!Number.isInteger(g.attributes[k])||g.attributes[k]<0||g.attributes[k]>5))return false;
    if(g.dive&&(!point(g.dive)||!Number.isFinite(g.dive.started)||!(g.dive.duration>0)))return false;
    const shot=s=>s&&point(s.target)&&s.duration>.1&&s.duration<5&&Number.isFinite(s.gravity)&&Number.isFinite(s.curl)&&Number.isFinite(s.power)&&(s.runUp===undefined||Number.isFinite(s.runUp)&&s.runUp>=.1&&s.runUp<=2);
    if(['kick','flight'].includes(g.phase)&&(!shot(g.shot)||!Number.isFinite(g.shot.started)||(g.role==='shoot'&&!point(g.shot.hint))))return false;
    if(g.phase==='read'&&(!shot(g.incoming)||!point(g.incoming.hint)||!Number.isFinite(g.readDuration)))return false;
    if(g.phase==='feedback'&&(!shot(g.shot)||!['save','goal','post','wide'].includes(g.event)||!g.contactPose||!point(g.contactPose.body)||!Array.isArray(g.contactPose.hands)||g.contactPose.hands.length!==2||g.contactPose.hands.some(h=>!point(h)||!Number.isFinite(h.r))))return false;
    if(g.drillTarget&&!point(g.drillTarget))return false;
    for(const k of ['drillHits','drillAttempts'])if(g[k]!==undefined&&(!Number.isInteger(g[k])||g[k]<0))return false;
    if(g.lastIncoming&&(!shot(g.lastIncoming)||!point(g.lastIncoming.hint)))return false;
    if(!['placed','driven'].includes(g.shotType)||![-1,0,1].includes(g.curl)||g.power>1||typeof g.feedback!=='string'||typeof g.detail!=='string')return false;
    if(!['mixed','corners','short','high','power'].includes(g.drill)||![.65,.85,1].includes(g.trainingSpeed))return false;
    return true;
  }
  const api={G,trajectory,flightVelocity,rebound,shotSpec,readyKeeperPose,keeperPose,contact,predictKeeper,aimPoint,divePoint,keysToTarget,Simulation,validSnapshot,crossbarTarget,fieldSavePoint,fieldSavePose};
  Object.assign(root.Panic ||= {},api);if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
