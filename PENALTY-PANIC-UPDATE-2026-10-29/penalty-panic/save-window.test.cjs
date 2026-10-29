'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P={...require('./progression.js'),...require('./simulation.js'),...require('./player-motion.js')},{harness}=require('./test-dom.cjs');
const clone=v=>JSON.parse(JSON.stringify(v));
function run(sim,seconds,fps=120){for(let i=0;i<Math.round(seconds*fps);i++)sim.step(1/fps);}
function empty(sim){const f=sim.g.field;P.fieldStart(sim.g);for(const p of f.players){Object.assign(p,{x:p.team?650:500,y:540,vx:0,vy:0,cooldown:0,target:{x:p.team?650:500,y:540}});}Object.assign(f.players[0],{x:43,y:300,target:{x:43,y:300}});Object.assign(f.players[5],{x:957,y:300,target:{x:957,y:300}});f.think=1;return f;}
function incoming(sim,y=245){const f=empty(sim);Object.assign(f.ball,{owner:null,x:250,y,z:3,vx:-550,vy:0,vz:60,lastTouch:1,lastPlayer:8,shot:true,lock:0});f.shots[1]++;assert.ok(P.beginFieldSave(f));sim.step(1/120);return f;}
function match(){const s=P.fresh(),sim=new P.Simulation(s,'match',{regulation:true,seed:42});return {s,sim};}
function uiIncoming(){const h=harness();h.app.start('match');incoming(h.app.sim);h.app.process();h.frame();return h;}

test('all ten players have a different stable celebration with bounded arm lengths',()=>{
  assert.equal(new Set(P.celebrationNames).size,10);const poses=[];
  for(let id=0;id<10;id++){
    const p=P.celebrationPose(id,1);assert.deepEqual(p,P.celebrationPose(id,1));poses.push(JSON.stringify([p.x,p.y,p.angle,p.arms,p.legs]));
    for(let frame=0;frame<=150;frame++){
      const a=P.celebrationPose(id,frame/60);for(const arm of a.arms){assert.ok(Math.abs(Math.hypot(arm.hand.x-arm.elbow.x,arm.hand.y-arm.elbow.y)-20)<1e-7);assert.ok(Math.abs(Math.hypot(arm.elbow.x-arm.shoulder.x,arm.elbow.y-arm.shoulder.y)-20)<1e-7);}
      if(frame){const b=P.celebrationPose(id,(frame-1)/60);assert.ok(Math.abs(a.x-b.x)<4);assert.ok(Math.abs(a.y-b.y)<4);assert.ok(Math.abs(a.angle-b.angle)<.05);}
    }
  }
  assert.equal(new Set(poses).size,10);
});
test('real AI strikes automatically open the save view and do not move the outfield during it',()=>{
  const h=harness();h.app.start('match');const f=empty(h.app.sim),p=f.players[8];Object.assign(p,{x:205,y:245,dx:-1,dy:0});Object.assign(f.ball,{owner:8,x:189,y:245,lastTouch:1,lastPlayer:8});f.think=0;h.frame();
  assert.ok(f.saveWindow);assert.equal(f.shots[1],1);assert.ok(h.doc.querySelector('#save-clock'));assert.ok(h.doc.body.classList.contains('aiming-field'));assert.ok(!h.doc.body.classList.contains('on-pitch'));
  const positions=f.players.slice(1).map(p=>[p.x,p.y]),elapsed=f.elapsed;h.frames(20);assert.deepEqual(f.players.slice(1).map(p=>[p.x,p.y]),positions);assert.equal(f.elapsed,elapsed);assert.equal(f.shots[1],1);
});
test('the reaction window is exactly 1.45 seconds at 30, 60 and 144 fps',()=>{
  const states=[];for(const fps of [30,60,144]){const {sim}=match(),f=incoming(sim),w=f.saveWindow;const before=(Math.floor(1.45*fps)-1)/fps;run(sim,before,fps);assert.ok(w.remaining>0);assert.equal(w.result,null);sim.step(1.45-before);assert.equal(w.remaining,0);assert.equal(w.elapsed,1.45);assert.equal(w.result,'miss');assert.equal(f.elapsed,0);states.push(clone(f));}
  for(const f of states.slice(1)){assert.deepEqual(f,states[0]);}
});
test('a correctly aimed dive saves, while wrong direction, wrong height, no dive and late input miss',()=>{
  for(const choice of ['correct','extended','wrong','height','none','late']){
    const {sim}=match(),f=incoming(sim),w=f.saveWindow,target=P.fieldSavePoint(w.end),saved=['correct','extended'].includes(choice);
    if(choice==='correct')assert.ok(sim.fieldDive(target.x,target.y));if(choice==='wrong')sim.fieldDive(755,320);if(choice==='height')sim.fieldDive(target.x,155);
    if(choice==='late'){run(sim,1.425);sim.fieldDive(target.x,target.y);run(sim,.025);}else if(choice==='extended'){run(sim,1.1);assert.ok(sim.fieldDive(target.x,target.y));run(sim,.35);}else run(sim,1.45);
    assert.equal(w.result,saved?'save':'miss',choice);assert.equal(f.saves[0],saved?1:0);assert.equal(f.manualSaves,saved?1:0);
    assert.equal(sim.fieldDive(target.x,target.y),false);assert.ok(P.validSnapshot(sim.g));
    run(sim,.7);assert.equal(f.saveWindow,null);assert.equal(f.saves[0],saved?1:0);
    if(!saved){assert.equal(f.score[1],1,'A missed manual dive cannot be undone by an automatic save');}
  }
});
test('choosing a dive twice cannot switch sides, and movement/pass/shoot controls cannot alter the save',()=>{
  const {sim}=match(),f=incoming(sim),initial=clone(f.input);assert.ok(sim.fieldDive(245,320));const dive=clone(f.saveWindow.dive);
  assert.equal(sim.fieldDive(755,185),false);assert.deepEqual(f.saveWindow.dive,dive);P.fieldMove(sim.g,1,1);assert.deepEqual(f.input,initial);
  assert.equal(P.fieldPass(sim.g),false);assert.equal(P.fieldCharge(sim.g),false);assert.equal(P.fieldShoot(sim.g),false);assert.equal(P.fieldTackle(sim.g),false);assert.equal(f.finish,null);
});
test('1.45-second save controls support both chord orders, short dives, touch buttons and canvas taps',()=>{
  for(const keys of [['KeyS','KeyD'],['KeyD','KeyS'],['KeyS','KeyE'],['KeyW','KeyA']]){const h=uiIncoming();for(const key of keys)h.event('keydown',key);const d=h.app.sim.g.field.saveWindow.dive;assert.ok(d);assert.equal(d.y,keys.includes('KeyW')?185:320);assert.equal(d.x,keys.includes('KeyA')?245:keys.includes('KeyE')?628:755);}
  const button=uiIncoming();button.click('[data-dive="372,320"]');assert.equal(button.app.sim.g.field.saveWindow.dive.x,372);
  const keyboard=uiIncoming();keyboard.event('keydown','KeyQ');assert.equal(keyboard.app.sim.g.field.saveWindow.dive,null);keyboard.event('keyup','KeyQ');assert.equal(keyboard.app.sim.g.field.saveWindow.dive.x,372);
  const pointer=uiIncoming(),r=pointer.app.renderer;pointer.doc.querySelector('#stadium').emit('pointerdown',{clientX:r.view.x+700*r.view.scale,clientY:r.view.y+315*r.view.scale});assert.ok(Math.abs(pointer.app.sim.g.field.saveWindow.dive.x-700)<1e-8);
});
test('pause and reload preserve the remaining time, shot and committed dive',()=>{
  const h=uiIncoming(),g=h.app.sim.g,w=g.field.saveWindow,target=h.P.fieldSavePoint(w.end);h.app.sim.fieldDive(target.x,target.y);h.frames(20);h.app.pause();const before=JSON.stringify(g.field);h.frames(90);assert.equal(JSON.stringify(g.field),before);
  const reloaded=harness(JSON.parse(h.memory.get('penalty-panic-v1')));reloaded.click('[data-action="resume-save"]');assert.equal(reloaded.app.paused,true);assert.equal(JSON.stringify(reloaded.app.sim.g.field),before);
  reloaded.click('[data-action="resume"]');reloaded.frames(120);assert.equal(reloaded.app.sim.g.field.manualSaves,1);assert.equal(reloaded.app.sim.g.field.saveWindow,null);
});
test('defenders can intercept the actual incoming flight during a save view',()=>{
  const {sim}=match(),f=incoming(sim);Object.assign(f.players[1],{x:170,y:245,cooldown:0});run(sim,1);assert.equal(f.manualSaves,0);assert.equal(f.score[1],0);assert.equal(f.ball.lastPlayer,1);assert.ok(P.validSnapshot(sim.g));
});
test('opponent set-piece penalties also hand goalkeeper control to the player',()=>{
  const {sim}=match(),f=empty(sim);Object.assign(f.players[8],{x:108,y:300});Object.assign(f.ball,{owner:8,x:92,y:300,lastTouch:1,lastPlayer:8});f.state='restart';f.setPiece={kind:'penalty',team:1,taker:8,flight:false,remaining:.01};run(sim,.03);
  assert.ok(f.saveWindow);assert.ok(f.setPiece.flight);assert.ok(P.validSnapshot(sim.g));const target=P.fieldSavePoint(f.saveWindow.end);sim.fieldDive(target.x,target.y);run(sim,2.1);assert.equal(f.saveWindow,null);assert.equal(f.setPiece,null);assert.equal(f.manualSaves,1);
});
test('the final opponent shot gets its full save window before full-time rewards',()=>{
  const {sim}=match(),f=incoming(sim);f.elapsed=104.999;run(sim,.9);assert.equal(sim.g.complete,false);assert.equal(f.elapsed,104.999);run(sim,5);assert.equal(sim.g.complete,true);assert.equal(sim.g.result,'loss');assert.equal(f.score[1],1);
});
test('manual saves earn coins and XP only once on match completion',()=>{
  const {s,sim}=match(),f=incoming(sim),target=P.fieldSavePoint(f.saveWindow.end);sim.fieldDive(target.x,target.y);run(sim,2.1);f.score=[1,0];f.elapsed=105;f.finished=true;f.state='ended';sim.finishRegulation();
  const reward=P.reward(s,sim.g);assert.ok(reward);assert.deepEqual(reward.coinLines.find(([name])=>name==='Your goalkeeper saves'),['Your goalkeeper saves',12]);assert.equal(s.stats.saves,1);assert.equal(s.stats.keeperAttempts,1);const coins=s.coins;assert.equal(P.reward(s,sim.g),null);assert.equal(s.coins,coins);
  const saved=P.load(s);assert.equal(saved.stats.saves,1);assert.equal(saved.coins,coins);
});
test('invalid save-window timers, vectors and dives are rejected safely',()=>{
  const {sim}=match();incoming(sim);
  for(const change of [g=>g.field.saveWindow.remaining=2,g=>g.field.saveWindow.start.vx=NaN,g=>g.field.saveWindow.end.y=99999,g=>g.field.saveWindow.dive={x:755,y:320,started:.9,duration:.3},g=>g.field.saveWindow.result='cheat']){const data=sim.snapshot();change(data);assert.equal(P.Simulation.restore(data),null);}
  const old=sim.snapshot();old.field.saveWindow=null;delete old.field.manualAttempts;delete old.field.manualSaves;delete old.field.ball.manualSave;assert.ok(P.Simulation.restore(old));
  const legacy=sim.snapshot();delete legacy.field.saveWindow.duration;legacy.field.saveWindow.remaining=1;
  const restored=P.Simulation.restore(legacy);assert.ok(restored);run(restored,1);assert.equal(restored.g.field.saveWindow.result,'miss');
});
test('competitive shootout shots also have exactly 1.45 seconds of flight',()=>{
  for(const difficulty of ['easy','normal','hard']){const s=P.fresh();s.settings.difficulty=difficulty;const sim=new P.Simulation(s,'match');sim.g.a.push(true);sim.next();assert.equal(sim.g.role,'keep');assert.equal(sim.g.incoming.duration,1.45);}
});
test('every scorer animation and the save view render on desktop and phone without mutating the match',()=>{
  const h=uiIncoming(),g=h.app.sim.g;for(const [width,height]of [[1000,620],[360,380]]){
    h.doc.querySelector('#stadium').getBoundingClientRect=()=>({width,height,left:0,top:0});h.app.renderer.resize();const before=JSON.stringify(g);h.app.renderer.draw(g,h.app.save,1);assert.equal(JSON.stringify(g),before);
    for(let id=0;id<10;id++)for(const reduced of [false,true]){h.app.save.settings.reducedMotion=reduced;const scene={...g,field:{score:[1,1],celebration:{team:Math.floor(id/5),scorer:id,elapsed:1.2}}},unchanged=JSON.stringify(scene);const labels=[];h.app.renderer.ctx.fillText=t=>labels.push(t);h.app.renderer.draw(scene,h.app.save,1);assert.equal(JSON.stringify(scene),unchanged);assert.ok(labels.includes(P.celebrationNames[id].toUpperCase()));}
  }
});
