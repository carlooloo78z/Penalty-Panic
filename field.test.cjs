'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P={...require('./progression.js'),...require('./simulation.js')},{harness}=require('./test-dom.cjs');
const clone=v=>JSON.parse(JSON.stringify(v));
function incoming(sim,team=0,y=250){
  clearLane(sim);const f=sim.g.field,p=f.players[team*5];
  Object.assign(p,{x:team?957:43,y:300,cooldown:0,target:{x:team?957:43,y:300}});
  Object.assign(f.ball,{owner:null,x:team?850:150,y,z:0,vx:team?600:-600,vy:0,vz:0,lock:0,lastTouch:1-team,shot:true});return p;
}
function game(rule='tied',difficulty='normal'){const s=P.fresh();s.settings.difficulty=difficulty;const sim=new P.Simulation(s,'match',{regulation:true,seed:42});sim.g.field.rule=rule;return {s,sim};}
function run(sim,seconds,dt=1/60){for(let i=0;i<Math.round(seconds/dt);i++)sim.step(dt);}
function fullTime(sim,score=[0,0]){const f=sim.g.field;f.score=[...score];f.state='live';f.elapsed=104.99;sim.step(1/60);assert.equal(f.elapsed,105);}
function clearLane(sim){
  const f=sim.g.field;P.fieldStart(sim.g);f.think=1;
  for(const p of f.players){p.x=p.team?700:300;p.y=500;p.target={x:p.x,y:p.y};p.cooldown=0;p.vx=p.vy=0;}
  Object.assign(f.players[0],{x:43,y:365,target:{x:43,y:365}});Object.assign(f.players[5],{x:957,y:365,target:{x:957,y:365}});
  Object.assign(f.players[3],{x:810,y:240,dx:1,dy:0,target:{x:810,y:240}});Object.assign(f.ball,{owner:3,x:826,y:240,lastTouch:0,shot:false});f.aim={x:1015,y:240};
}

test('Quick Play, Career and Champions League start on the pitch through their real menu actions',()=>{
  const h=harness();h.click('[data-action="play"]');assert.equal(h.app.sim.g.phase,'field');assert.equal(h.app.sim.g.field.players.length,10);assert.ok(h.doc.body.classList.contains('on-pitch'));
  h.app.navigate('career');h.click('[data-action="stage"][data-stage="0"]');assert.equal(h.app.sim.g.phase,'field');
  h.app.navigate('league');h.click('[data-action="league-new"]');h.click('[data-action="league-play"]');assert.equal(h.app.sim.g.phase,'field');
  h.app.start('practice-shoot');assert.equal(h.app.sim.g.phase,'aim');h.app.start('challenge');assert.equal(h.app.sim.g.phase,'read');h.app.start('crossbar');assert.equal(h.app.sim.g.phase,'aim');
});

test('the clock counts 105 active seconds, waits for kickoff and pauses during goals',()=>{
  const {sim}=game('always'),f=sim.g.field;run(sim,15);assert.equal(f.elapsed,0);P.fieldStart(sim.g);run(sim,2);assert.ok(Math.abs(f.elapsed-2)<1e-8);
  f.state='goal';f.wait=1;const before=f.elapsed;run(sim,.5);assert.equal(f.elapsed,before);run(sim,1.5);assert.ok(f.elapsed>before&&f.elapsed<before+.3);
  for(let i=0;i<36000&&sim.g.phase==='field';i++){if(sim.g.field.state==='restart')P.fieldRestart(sim.g);sim.step(1/60);}
  assert.equal(f.elapsed,105);assert.equal(sim.g.phase,'interval');assert.equal(sim.g.complete,false);
  const saved=clone(f);run(sim,10);assert.deepEqual(sim.g.field,saved,'Full time waits for the player to start penalties');
  sim.next();assert.equal(sim.g.phase,'aim');assert.equal(f.pensStarted,true);assert.ok(P.validSnapshot(sim.g));
});

test('fixed-step movement and game time agree at 30, 60 and 144 frames per second',()=>{
  const snapshots=[];
  for(const fps of [30,60,144]){const {sim}=game();P.fieldStart(sim.g);P.fieldMove(sim.g,0,1,true);run(sim,4,1/fps);snapshots.push(sim.g.field);}
  for(const f of snapshots.slice(1)){assert.ok(Math.abs(f.elapsed-snapshots[0].elapsed)<1e-8);f.players.forEach((p,i)=>{assert.ok(Math.abs(p.x-snapshots[0].players[i].x)<1e-7);assert.ok(Math.abs(p.y-snapshots[0].players[i].y)<1e-7);});}
});

test('keyboard movement, sprint, passing, switching and a charged shot work through real handlers',()=>{
  const h=harness();h.click('[data-action="play"]');h.click('[data-action="field-start"]');const f=h.app.sim.g.field,p=f.players[f.controlled],y=p.y;
  h.event('keydown','KeyW');h.event('keydown','ShiftLeft');h.frames(20);h.event('keyup','KeyW');h.event('keyup','ShiftLeft');assert.ok(p.y<y-30);assert.ok(p.stamina<1);
  h.event('keydown','KeyQ');h.event('keyup','KeyQ');assert.equal(f.passes[0],1);assert.equal(f.ball.owner,null);assert.notEqual(f.controlled,p.id);
  const selected=f.controlled;h.event('keydown','KeyE');assert.notEqual(f.controlled,selected);h.event('keyup','KeyE');
  clearLane(h.app.sim);h.event('keydown','Space');h.frames(24);h.event('keyup','Space');assert.ok(f.finish);assert.equal(f.shots[0],0);h.frames(P.FIELD.finishDuration*60);assert.equal(f.shots[0],1);assert.equal(f.ball.owner,null);assert.ok(f.ball.vx>400);
  h.frames(40);assert.equal(f.score[0],1);assert.equal(h.doc.querySelector('#field-score').textContent,'1 : 0');
});

test('passes can be received, correctly positioned tackles win possession and distant tackles miss',()=>{
  const {sim}=game(),g=sim.g,f=g.field;clearLane(sim);Object.assign(f.players[4],{x:870,y:285,vx:0,vy:0,target:{x:870,y:285}});f.aim={x:870,y:285};
  assert.equal(P.fieldPass(g),true);assert.equal(f.controlled,4);run(sim,.4);assert.equal(f.ball.owner,4);
  f.controlled=3;Object.assign(f.players[3],{x:600,y:300,cooldown:0});Object.assign(f.players[8],{x:800,y:300,cooldown:0});f.ball.owner=8;
  assert.equal(P.fieldTackle(g),false);assert.equal(f.ball.owner,8);
  f.players[3].cooldown=0;f.players[3].x=770;assert.equal(P.fieldTackle(g),true);assert.equal(f.ball.owner,3);assert.equal(f.tackles,1);
});

test('the same ball physics resolve a goal, keeper save, wide shot and side-board rebound',()=>{
  const goal=game().sim;clearLane(goal);P.fieldCharge(goal.g);goal.g.field.power=.7;assert.equal(P.fieldShoot(goal.g),true);run(goal,P.FIELD.finishDuration+.6);assert.equal(goal.g.field.score[0],1);
  const save=game().sim;clearLane(save);const f=save.g.field;Object.assign(f.players[5],{y:300,target:{x:957,y:300}});Object.assign(f.ball,{owner:null,x:900,y:300,z:0,vx:600,vy:0,vz:0,lock:0,lastTouch:0,shot:true});run(save,.12);assert.equal(f.ball.owner,5);assert.equal(f.saves[1],1);assert.equal(f.score[0],0);
  const miss=game().sim;clearLane(miss);Object.assign(miss.g.field.ball,{owner:null,x:990,y:170,z:0,vx:600,vy:0,vz:0,lock:1,shot:true});run(miss,.05);assert.equal(miss.g.field.score[0],0);assert.ok(miss.g.field.ball.vx<0);
  Object.assign(miss.g.field.ball,{x:500,y:2,vx:0,vy:-400,lock:1});run(miss,.03);assert.ok(miss.g.field.ball.vy>0);
});

test('AI moves, passes and shoots over a full match, and difficulty changes pursuit speed',()=>{
  for(const difficulty of ['easy','normal','hard']){
    const {sim}=game('always',difficulty);P.fieldStart(sim.g);const f=sim.g.field;
    for(let i=0;i<36000&&sim.g.phase==='field';i++){if(sim.g.field.state==='restart')P.fieldRestart(sim.g);if(f.saveWindow&&!f.saveWindow.dive&&!f.saveWindow.result){const target=P.fieldSavePoint(f.saveWindow.end);sim.fieldDive(target.x,target.y);}sim.step(1/60);if(i%600===0&&sim.g.phase==='field')assert.ok(P.validSnapshot(sim.g));}
    assert.ok(f.shots[1]>0);assert.ok(f.passes[1]>0);assert.ok(f.saves[0]>0);assert.equal(f.elapsed,105);
  }
  const slow=game('always','easy').sim,fast=game('always','hard').sim;
  for(const sim of [slow,fast]){P.fieldStart(sim.g);sim.g.field.think=1;sim.g.field.players[6].target={x:100,y:300};run(sim,.3);}
  assert.ok(Math.abs(fast.g.field.players[6].vx)>Math.abs(slow.g.field.players[6].vx));
});

test('the aggregate shootout includes match goals and handles a tied total with paired sudden death',()=>{
  const {sim}=game('always');fullTime(sim,[2,0]);sim.next();const g=sim.g;
  g.a=[false,false,false,false,false];g.b=[true,true,false,false,false];assert.equal(P.matchOutcome(g),null);
  g.a.push(true);assert.equal(P.matchOutcome(g),null);g.b.push(false);assert.equal(P.matchOutcome(g),'win');assert.deepEqual(P.matchScores(g),[3,2]);
  g.a=[false,false,false];g.b=[true,true,true];assert.equal(P.matchOutcome(g),null,'The two regulation goals must keep the shootout alive');
  g.a=[false,false,false,false,false];g.b=[true,true,true];assert.equal(P.matchOutcome(g),'loss');
});

test('the tied-only setting completes a leading match immediately and sends a draw to penalties',()=>{
  const a=game('tied');fullTime(a.sim,[2,1]);assert.equal(a.sim.g.complete,true);assert.equal(a.sim.g.result,'win');assert.equal(a.sim.g.field.pensStarted,false);assert.deepEqual(P.matchScores(a.sim.g),[2,1]);
  const b=game('tied');fullTime(b.sim,[1,1]);assert.equal(b.sim.g.phase,'interval');b.sim.next();assert.equal(b.sim.g.field.pensStarted,true);
  b.sim.g.a=[true,true,true];b.sim.g.b=[false,false,false];assert.equal(P.matchOutcome(b.sim.g),'win');assert.deepEqual(P.matchScores(b.sim.g),[3,0]);
});

test('pause, hidden tabs, save/reload and resume retain the clock, score and player positions',()=>{
  const h=harness();h.click('[data-action="play"]');h.click('[data-action="field-start"]');h.event('keydown','KeyW');h.frames(40);h.app.pause();
  const f=h.app.sim.g.field,paused=JSON.stringify(f);h.frames(100);assert.equal(JSON.stringify(f),paused);assert.equal(f.input.y,0);
  const again=harness(JSON.parse(h.memory.get('penalty-panic-v1')));again.click('[data-action="resume-save"]');assert.equal(again.app.paused,true);assert.deepEqual(JSON.parse(JSON.stringify(again.app.sim.g.field)),JSON.parse(paused));
  again.click('[data-action="resume"]');again.frames(10);assert.ok(again.app.sim.g.field.elapsed>f.elapsed);
  again.doc.hidden=true;again.doc.emit('visibilitychange');const elapsed=again.app.sim.g.field.elapsed;again.frames(40);assert.equal(again.app.sim.g.field.elapsed,elapsed);
});

test('touch movement and shooting support two pointers and rotate controls with the phone camera',()=>{
  const h=harness();h.app.start('match');const canvas=h.doc.querySelector('#stadium');canvas.getBoundingClientRect=()=>({left:0,top:0,width:360,height:510});h.app.renderer.resize();
  h.click('[data-action="field-start"]');const f=h.app.sim.g.field,p=f.players[f.controlled],x=p.x;
  h.doc.emit('pointerdown',{target:h.doc.querySelector('[data-field-move="0,-1"]'),pointerId:7});h.frames(15);assert.ok(p.x>x+20,'Up on a portrait screen attacks up the pitch');
  h.doc.emit('pointerup',{pointerId:8});assert.equal(h.app.input.fieldPointers.size,1);
  h.doc.emit('pointerdown',{target:h.doc.querySelector('[data-field-hold="shoot"]'),pointerId:9});h.frames(15);h.doc.emit('pointerup',{pointerId:9});assert.ok(f.finish);assert.equal(h.app.input.fieldPointers.size,1);h.frames(P.FIELD.finishDuration*60);assert.equal(f.shots[0],1);assert.equal(h.app.input.fieldPointers.size,0,'Camera entry clears held movement');
  h.doc.emit('pointercancel');assert.equal(h.app.input.fieldPointers.size,0);assert.equal(f.input.x,0);
  const point=h.P.fieldPoint(h.app.renderer,{clientX:180,clientY:35});assert.ok(point.x>900);assert.ok(Math.abs(point.y-300)<1);
});

test('full-time controls start the shootout and a completed match awards field and penalty rewards once',()=>{
  const h=harness();h.click('[data-action="play"]');fullTime(h.app.sim,[1,1]);h.app.process();assert.ok(h.doc.querySelector('[data-action="field-pens"]'));
  h.click('[data-action="field-pens"]');assert.equal(h.app.sim.g.phase,'aim');assert.equal(h.doc.body.classList.contains('on-pitch'),false);assert.ok(h.doc.querySelector('#shoot'));
  const g=h.app.sim.g;Object.assign(g,{a:[true,true,true],b:[false,false],goals:3,saves:2,round:5});h.app.sim.next();g.incoming.target={x:372,y:320};
  for(let i=0;i<240&&g.phase!=='flight';i++)h.frame();h.app.sim.dive(372,320);for(let i=0;i<240&&!g.complete;i++)h.frame();
  assert.equal(g.result,'win');assert.ok(h.app.victory);assert.equal(h.app.save.lastResult.field.elapsed,105);assert.equal(h.app.save.active,null);
  const rewards=h.app.save.lastResult.rewards;assert.ok(rewards.coinLines.some(([name,n])=>name==='Match goals'&&n===8));
  const coins=h.app.save.coins;h.click('[data-action="skip-victory"]');assert.ok(h.doc.querySelector('#screen').innerHTML.includes('REGULATION MATCH'));
  h.app.save.claimed.includes(g.id);assert.equal(h.P.reward(h.app.save,g),null);assert.equal(h.app.save.coins,coins);
  h.click('[data-action="rematch"]');assert.equal(h.app.sim.g.phase,'field');assert.equal(h.app.sim.g.field.elapsed,0);
});

test('tied-only normal-time wins save results, show the cutscene and advance Champions League',()=>{
  const h=harness();h.app.save.settings.penaltyRule='tied';h.app.save.league=h.P.createLeague(h.app.save.club,'normal','field-league',42);
  h.app.start('league');fullTime(h.app.sim,[2,0]);h.app.process();assert.equal(h.app.save.league.results.length,4);assert.ok(h.app.victory);h.frames(60);
  h.click('[data-action="skip-victory"]');assert.equal(h.app.page,'result');assert.ok(h.doc.querySelector('#screen').innerHTML.includes('No shootout needed'));
  const stored=JSON.parse(h.memory.get('penalty-panic-v1'));assert.ok(h.P.validResult(stored.lastResult));const again=harness(stored);assert.ok(again.app.save.lastResult);
});

test('old saves still restore and invalid field state is rejected without losing coins',()=>{
  const {s,sim}=game();s.active=sim.snapshot();s.coins=999;assert.ok(P.validSnapshot(s.active));
  const premature=sim.snapshot();premature.phase='aim';assert.equal(P.validSnapshot(premature),false);
  for(const mutate of [f=>f.elapsed=301,f=>f.players[0].x=Infinity,f=>f.ball.owner=99,f=>f.score[0]=-2,f=>f.finished=true,f=>f.players.pop()]){
    const snap=sim.snapshot();mutate(snap.field);assert.equal(P.validSnapshot(snap),false);
  }
  delete s.settings.penaltyRule;assert.equal(P.load(s).settings.penaltyRule,'tied');assert.equal(P.load(s).coins,999);
  const old=new P.Simulation(P.fresh(),'match').snapshot();assert.equal(old.field,undefined);assert.ok(P.Simulation.restore(old));
});

test('both camera orientations render the pitch, animated players and score without mutating gameplay',()=>{
  const h=harness();h.app.start('match');h.P.fieldStart(h.app.sim.g);h.event('keydown','KeyD');h.frames(15);h.event('keyup','KeyD');
  const g=h.app.sim.g,before=JSON.stringify(g),saved=JSON.stringify(h.app.save),canvas=h.doc.querySelector('#stadium');
  for(const [width,height]of [[1000,620],[360,510]]){canvas.getBoundingClientRect=()=>({width,height,left:0,top:0});h.app.renderer.resize();h.app.renderer.draw(g,h.app.save,4);}
  assert.equal(JSON.stringify(g),before);assert.equal(JSON.stringify(h.app.save),saved);
});

test('match assists migrate existing progress and can be disabled and restored through Settings',()=>{
  const old=P.fresh();delete old.settings.matchAssists;delete old.facilities;old.coins=321;old.xp=456;
  const h=harness(old);assert.equal(h.app.save.settings.matchAssists,true);assert.equal(h.app.save.coins,321);assert.equal(h.app.save.xp,456);
  h.click('[data-action="play"]');h.app.openDialog('settings');
  const toggle=h.doc.querySelector('[data-setting="matchAssists"]');assert.ok(toggle);toggle.checked=false;h.doc.emit('change',{target:toggle});
  assert.equal(h.app.sim.g.field.assists,false);assert.ok(h.app.paused);
  const again=harness(JSON.parse(h.memory.get('penalty-panic-v1')));again.click('[data-action="resume-save"]');assert.equal(again.app.sim.g.field.assists,false);
  assert.equal(again.app.save.settings.matchAssists,false);assert.equal(again.app.save.coins,321);
});

test('assists slow defenders, preserve sprint stamina and make a quick tap shoot toward the open corner',()=>{
  const assisted=game().sim,standard=game().sim;standard.g.field.assists=false;
  for(const sim of [assisted,standard]){P.fieldStart(sim.g);sim.g.field.think=1;sim.g.field.players[6].target={x:100,y:300};P.fieldMove(sim.g,0,-1,true);run(sim,.3);}
  assert.ok(Math.abs(assisted.g.field.players[6].vx)<Math.abs(standard.g.field.players[6].vx)*.81);
  assert.ok(assisted.g.field.players[3].stamina>standard.g.field.players[3].stamina);
  clearLane(assisted);assisted.g.field.aim=null;P.fieldCharge(assisted.g);P.fieldShoot(assisted.g);run(assisted,P.FIELD.finishDuration);
  assert.ok(Math.hypot(assisted.g.field.ball.vx,assisted.g.field.ball.vy)>530);run(assisted,.6);assert.equal(assisted.g.field.score[0],1);
  clearLane(standard);standard.g.field.aim={x:1015,y:170};P.fieldCharge(standard.g);P.fieldShoot(standard.g);run(standard,P.FIELD.finishDuration+.8);assert.equal(standard.g.field.score[0],0,'Manual aim can still miss');
});

test('ball control grace prevents instant steals and close tackles are automatic only with assists',()=>{
  const {sim}=game();clearLane(sim);const f=sim.g.field,p=f.players[3],enemy=f.players[8];
  Object.assign(enemy,{x:p.x-24,y:p.y,cooldown:0,target:{x:p.x-24,y:p.y}});f.possessionGrace=.6;
  P.fieldStep(sim.g,1/120,()=>{});assert.equal(f.ball.owner,3);
  f.possessionGrace=0;P.fieldStep(sim.g,1/120,()=>{});assert.equal(f.ball.owner,8);
  for(const help of [false,true]){
    const other=game().sim;clearLane(other);const field=other.g.field;field.assists=help;
    Object.assign(field.players[8],{x:775,y:240,cooldown:0,target:{x:775,y:240}});field.ball.owner=8;
    P.fieldStep(other.g,1/120,()=>{});assert.equal(field.ball.owner,help?3:8);assert.equal(field.tackles,help?1:0);
  }
});

test('keepers dive toward real shots, save within reach, recover and retain their motion after reload',()=>{
  const {sim}=game(),keeper=incoming(sim);run(sim,.1);assert.ok(keeper.dive);assert.ok(keeper.y<300);
  const restored=P.Simulation.restore(sim.snapshot());assert.ok(restored);assert.deepEqual(restored.g.field.players[0].dive,keeper.dive);
  run(sim,.3);run(restored,.3);assert.equal(sim.g.field.saves[0],1);assert.equal(sim.g.field.ball.owner,0);assert.deepEqual(restored.g.field,sim.g.field);
  run(sim,1);assert.equal(keeper.dive,null);assert.ok(P.validSnapshot(sim.g));
  const away=game().sim,opponent=incoming(away,1);run(away,.1);assert.ok(opponent.dive);assert.ok(opponent.y<300);
  run(away,.5);assert.equal(away.g.field.score[0],1,'A corner outside the diving keeper reach is a goal');
});

test('dives have continuous movement and render during reach, landing and recovery in both cameras',()=>{
  const h=harness();h.app.start('match');const keeper=incoming(h.app.sim);h.app.sim.step(1/120);
  let previous={x:keeper.x,y:keeper.y};
  for(let i=0;i<80;i++){
    h.app.sim.step(1/120);assert.ok(Math.hypot(keeper.x-previous.x,keeper.y-previous.y)<3);previous={x:keeper.x,y:keeper.y};
    if([12,34,65].includes(i))for(const [width,height]of [[1000,620],[360,510]]){
      const before=JSON.stringify(h.app.sim.g),canvas=h.doc.querySelector('#stadium');canvas.getBoundingClientRect=()=>({width,height,left:0,top:0});h.app.renderer.resize();h.app.renderer.draw(h.app.sim.g,h.app.save,1);assert.equal(JSON.stringify(h.app.sim.g),before);
    }
  }
  const bad=h.app.sim.snapshot();bad.field.players[0].dive.to.y=Infinity;assert.equal(P.validSnapshot(bad),false);
  const legacy=game().sim.snapshot();delete legacy.field.facilities;delete legacy.field.assists;delete legacy.field.possessionGrace;legacy.field.players.forEach(p=>delete p.dive);assert.ok(P.Simulation.restore(legacy));
});

test('Clubhouse purchases use real coins, reject repeated tiers and insufficient funds, and persist',()=>{
  const h=harness();h.click('[data-action="clubhouse"]');assert.ok(h.doc.querySelector('[data-action="facility"][data-key="passing"]'));
  h.click('[data-action="facility"][data-key="passing"]');assert.equal(h.app.save.facilities.passing,1);assert.equal(h.app.save.coins,30);
  assert.equal(h.P.buyFacility(h.app.save,'passing',0),false);assert.equal(h.app.save.coins,30);
  h.click('[data-action="facility"][data-key="fitness"]');assert.equal(h.app.save.facilities.fitness,0);assert.equal(h.app.save.coins,30);
  const again=harness(JSON.parse(h.memory.get('penalty-panic-v1')));assert.equal(again.app.save.facilities.passing,1);assert.equal(again.app.save.coins,30);
  again.click('[data-action="clubhouse"]');again.click('[data-action="play"]');assert.equal(again.app.sim.g.field.facilities.passing,1);
  const s=P.fresh();s.coins=1000;for(let i=0;i<3;i++)assert.equal(P.buyFacility(s,'keeping',i),true);
  assert.equal(s.coins,550);assert.equal(P.buyFacility(s,'keeping',3),false);assert.equal(P.buyFacility(s,'unknown',0),false);assert.equal(s.coins,550);
  assert.deepEqual(P.decode(s).save.facilities,s.facilities);
});

test('each facility improves its advertised match behavior and existing fixtures keep their captured levels',()=>{
  const s=P.fresh(),base=new P.Simulation(s,'match',{regulation:true,seed:42});s.facilities={passing:3,fitness:3,keeping:3};const trained=new P.Simulation(s,'match',{regulation:true,seed:42});
  for(const sim of [base,trained]){clearLane(sim);Object.assign(sim.g.field.players[4],{x:870,y:285,vx:0,vy:0,target:{x:870,y:285}});sim.g.field.aim={x:870,y:285};P.fieldPass(sim.g);}
  const speed=sim=>Math.hypot(sim.g.field.ball.vx,sim.g.field.ball.vy);
  assert.ok(Math.abs(speed(trained)-speed(base)-30)<1e-8);
  for(const sim of [base,trained]){run(sim,.4);assert.equal(sim.g.field.ball.owner,4);}
  assert.ok(trained.g.field.possessionGrace>base.g.field.possessionGrace+.4);
  for(const sim of [base,trained]){P.fieldMove(sim.g,0,-1,true);run(sim,.3);}
  assert.ok(trained.g.field.players[4].stamina>base.g.field.players[4].stamina);
  const first=incoming(base,0,225),second=incoming(trained,0,225);base.step(1/120);trained.step(1/120);
  assert.equal(first.dive.to.y-second.dive.to.y,12);assert.equal(base.g.field.facilities.keeping,0);
});

function dribbleLane(sim,x=974,y=240,direction=1){
  clearLane(sim);const f=sim.g.field,p=f.players[f.controlled];
  Object.assign(p,{x,y,dx:direction,dy:0,vx:0,vy:0,target:{x,y}});
  Object.assign(f.ball,{x:x+direction*16,y,owner:p.id,lastTouch:p.team});return f;
}

test('keyboard and portrait touch movement can dribble into the net without shooting',()=>{
  for(const touch of [false,true]){
    const h=harness();h.click('[data-action="play"]');const f=dribbleLane(h.app.sim);
    if(touch){
      h.doc.querySelector('#stadium').getBoundingClientRect=()=>({width:360,height:510,left:0,top:0});h.app.renderer.resize();
      h.doc.emit('pointerdown',{target:h.doc.querySelector('[data-field-move="0,-1"]'),pointerId:5});
    }else h.event('keydown','KeyD');
    h.frames(24);
    assert.equal(f.score[0],1);assert.equal(f.shots[0],0);assert.equal(f.state,'goal');assert.equal(f.ball.owner,null);
    assert.equal(h.doc.querySelector('#field-score').textContent,'1 : 0');assert.ok(h.P.validSnapshot(h.app.sim.g));
    h.frames(24);assert.equal(f.score[0],1,'Holding movement must not award the same goal again');
    if(touch)h.doc.emit('pointerup',{pointerId:5});else h.event('keyup','KeyD');
    h.app.pause();const reloaded=harness(JSON.parse(h.memory.get('penalty-panic-v1')));reloaded.click('[data-action="resume-save"]');
    assert.equal(reloaded.app.sim.g.field.score[0],1);reloaded.click('[data-action="resume"]');reloaded.frames(220);
    assert.equal(reloaded.app.sim.g.field.score[0],1);assert.equal(reloaded.app.sim.g.field.state,'live');
  }
});

test('dribble goals respect both goal lines, the posts and the fixed-step simulation',()=>{
  for(const fps of [30,60,144])for(const direction of [-1,1]){
    const {sim}=game(),f=dribbleLane(sim,direction>0?974:26,240,direction);P.fieldMove(sim.g,direction,0);run(sim,.5,1/fps);
    assert.deepEqual(f.score,direction>0?[1,0]:[0,1]);assert.equal(f.shots[0],0);
    assert.equal(sim.events.filter(e=>e.type==='field-goal').length,1);assert.ok(P.validSnapshot(sim.g));
  }
  for(const y of [170,225,375,430]){
    const {sim}=game(),f=dribbleLane(sim,980,y);P.fieldMove(sim.g,1,0);run(sim,.5);
    assert.deepEqual(f.score,[0,0]);assert.ok(f.players[3].x<=982);assert.ok(f.ball.x<=1000);assert.ok(P.validSnapshot(sim.g));
  }
});

test('a beaten keeper cannot steal the ball from behind, but can still gather a dribble into his hands',()=>{
  const {sim}=game(),f=dribbleLane(sim,984,300),keeper=f.players[5];
  Object.assign(keeper,{x:957,y:300,cooldown:0,target:{x:957,y:300}});P.fieldMove(sim.g,1,0);run(sim,.2);
  assert.equal(f.score[0],1);assert.equal(f.saves[1],0);
  const blocked=game().sim,b=dribbleLane(blocked,919,300);Object.assign(b.players[5],{x:957,y:300,cooldown:0,target:{x:957,y:300}});
  P.fieldMove(blocked.g,1,0);run(blocked,.1);assert.equal(b.ball.owner,5);assert.equal(b.score[0],0);
});

test('all competitive matches now finish immediately when not tied and only level games go to penalties',()=>{
  for(const mode of ['match','career','league'])for(const score of [[2,1],[1,2],[2,2]]){
    const s=P.fresh();s.settings.penaltyRule='always';s.league=P.createLeague(s.club,'easy','tied-cup',42);
    const sim=new P.Simulation(s,mode,{regulation:true,seed:42});assert.equal(sim.g.field.rule,'tied');fullTime(sim,score);
    if(score[0]===score[1]){assert.equal(sim.g.complete,false);assert.equal(sim.g.phase,'interval');sim.next();assert.equal(sim.g.phase,'aim');assert.equal(sim.g.field.pensStarted,true);}
    else{assert.equal(sim.g.complete,true);assert.equal(sim.g.result,score[0]>score[1]?'win':'loss');assert.equal(sim.g.field.pensStarted,false);assert.equal(sim.g.round,0);}
  }
  assert.equal(P.load({...P.fresh(),settings:{penaltyRule:'always'}}).settings.penaltyRule,'tied');
});

test('saved matches adopt tied-only penalties while a shootout already underway keeps its score rules',()=>{
  const {s,sim}=game('always');s.active=sim.snapshot();const restored=P.Simulation.restore(s.active);assert.equal(restored.g.field.rule,'tied');fullTime(restored,[2,0]);assert.equal(restored.g.complete,true);
  const waiting=game('always').sim;fullTime(waiting,[2,0]);const resumed=P.Simulation.restore(waiting.snapshot());assert.equal(resumed.g.phase,'interval');resumed.next();assert.equal(resumed.g.complete,true);assert.equal(resumed.g.field.pensStarted,false);
  const underway=game('always').sim;fullTime(underway,[2,0]);underway.next();underway.g.a=[true];underway.next();
  const continuing=P.Simulation.restore(underway.snapshot());assert.equal(continuing.g.field.rule,'always');assert.deepEqual(P.matchScores(continuing.g),[3,0]);
  s.active=waiting.snapshot();const h=harness(s);h.click('[data-action="resume-save"]');h.click('[data-action="resume"]');
  assert.ok(h.doc.querySelector('#controls').innerHTML.includes('VIEW MATCH RESULT'));assert.ok(!h.doc.querySelector('#controls').innerHTML.includes('START PENALTY SHOOTOUT'));
  h.click('[data-action="field-pens"]');assert.ok(h.app.victory);assert.equal(h.app.save.lastResult.field.pensStarted,false);
});

test('normal-time cup results advance through three rounds or eliminate immediately through production UI',()=>{
  for(const win of [true,false]){
    const h=harness();h.app.navigate('league');h.click('[data-action="league-new"]');
    for(let round=0;round<(win?3:1);round++){
      h.click('[data-action="league-play"]');const g=h.app.sim.g;assert.equal(g.field.rule,'tied');fullTime(h.app.sim,win?[2,1]:[1,2]);h.app.process();
      assert.equal(g.complete,true);assert.equal(g.field.pensStarted,false);assert.equal(h.app.save.active,null);
      if(win)h.click('[data-action="skip-victory"]');else h.app.next();
      h.click('[data-action="league"]');
    }
    assert.equal(h.P.leagueState(h.app.save.league).stage,win?'champion':'eliminated');assert.equal(h.P.leagueMatch(h.app.save.league),null);
    assert.equal(h.app.save.leagueHonours.length,win?1:0);assert.ok(h.P.validLeague(h.app.save.league));
    const again=harness(JSON.parse(h.memory.get('penalty-panic-v1')));again.click('[data-action="league"]');assert.equal(again.doc.querySelector('[data-action="league-play"]'),null);
  }
});

function lateChallenge(sim,x=875,y=300,team=0){
  clearLane(sim);const f=sim.g.field,carrier=f.players[team?8:3],defender=f.players[team?3:8],direction=team?-1:1;
  Object.assign(carrier,{x,y,dx:direction,dy:0,vx:direction*100,vy:0,cooldown:0});Object.assign(defender,{x:x-direction*24,y,vx:direction*250,vy:0,cooldown:0});
  Object.assign(f.ball,{owner:carrier.id,x:x+direction*16,y,lastTouch:team});f.possessionGrace=0;
  return {f,carrier,defender};
}

test('first-person finishing lasts exactly 2.5 seconds, freezes the field, and fires once at every frame rate',()=>{
  for(const fps of [30,60,144]){
    const {sim}=game();clearLane(sim);const f=sim.g.field;P.fieldCharge(sim.g);P.fieldShoot(sim.g);
    const positions=f.players.map(p=>[p.x,p.y]),elapsed=f.elapsed;run(sim,1,1/fps);
    assert.ok(Math.abs(f.finish.remaining-1.5)<1e-7);assert.equal(f.elapsed,elapsed);assert.deepEqual(f.players.map(p=>[p.x,p.y]),positions);assert.equal(f.shots[0],0);
    assert.equal(P.fieldPass(sim.g),false);assert.equal(P.fieldShoot(sim.g),false);P.fieldMove(sim.g,1,1,true);assert.equal(f.input.x,0);
    P.fieldFinishAim(sim.g,245,320);run(sim,1.5,1/fps);assert.equal(f.finish,null);assert.equal(f.shots[0],1);assert.equal(f.ball.owner,null);
    assert.equal(sim.events.filter(e=>e.type==='field-kick').length,1);assert.equal(f.elapsed,elapsed);assert.ok(P.validSnapshot(sim.g));
  }
});

test('aiming view supports keyboard, touch targets and power through production controls',()=>{
  const h=harness();h.app.start('match');clearLane(h.app.sim);h.event('keydown','Space');h.frames(20);h.event('keyup','Space');h.frame();
  const f=h.app.sim.g.field;assert.ok(f.finish);assert.equal(h.doc.body.classList.contains('on-pitch'),false);assert.ok(h.doc.querySelector('#finish-clock'));
  const x=f.finish.aim.x;h.event('keydown','ArrowRight');h.frames(6);h.event('keyup','ArrowRight');assert.ok(f.finish.aim.x>x);
  h.click('[data-action="field-aim"][data-point="755,185"]');assert.deepEqual(clone(f.finish.aim),{x:755,y:185});
  const power=h.doc.querySelector('#field-shot-power');power.value='.8';h.doc.emit('input',{target:power});assert.equal(f.finish.power,.8);
  const canvas=h.doc.querySelector('#stadium'),labels=[],ctx=canvas.getContext('2d');ctx.fillText=t=>labels.push(t);
  for(const [width,height]of [[1000,620],[360,510]]){canvas.getBoundingClientRect=()=>({left:0,top:0,width,height});h.app.renderer.resize();h.app.renderer.draw(h.app.sim.g,h.app.save,1);}
  assert.ok(labels.includes('CHOOSE YOUR FINISH'));assert.ok(labels.includes('CLICK THE GOAL / ARROWS TO AIM'));
  h.frames(P.FIELD.finishDuration*60);assert.equal(f.finish,null);assert.equal(f.shots[0],1);assert.ok(h.doc.body.classList.contains('on-pitch'));
});

test('aiming countdown pauses and restores without firing twice or forgetting the target',()=>{
  const h=harness();h.app.start('match');clearLane(h.app.sim);h.event('keydown','Space');h.event('keyup','Space');h.frames(24);h.click('[data-action="field-aim"][data-point="245,185"]');h.app.pause();
  const remaining=h.app.sim.g.field.finish.remaining;h.frames(90);assert.equal(h.app.sim.g.field.finish.remaining,remaining);
  const again=harness(JSON.parse(h.memory.get('penalty-panic-v1')));again.click('[data-action="resume-save"]');assert.equal(again.app.sim.g.field.finish.remaining,remaining);assert.deepEqual(clone(again.app.sim.g.field.finish.aim),{x:245,y:185});
  again.click('[data-action="resume"]');again.frames(P.FIELD.finishDuration*60-22);assert.equal(again.app.sim.g.field.finish,null);assert.equal(again.app.sim.g.field.shots[0],1);again.frames(35);assert.equal(again.app.sim.g.field.shots[0],1);
});

test('high and low selections produce different physical trajectories and the last shot can settle before full time',()=>{
  const low=game().sim,high=game().sim;
  for(const [sim,y]of [[low,320],[high,185]]){clearLane(sim);P.fieldCharge(sim.g);P.fieldShoot(sim.g);P.fieldFinishAim(sim.g,245,y);run(sim,P.FIELD.finishDuration);}
  assert.ok(high.g.field.ball.vz>low.g.field.ball.vz+60);run(low,.6);run(high,.6);assert.equal(low.g.field.score[0],1);assert.equal(high.g.field.score[0],1);
  const last=game().sim;clearLane(last);last.g.field.elapsed=104.99;P.fieldCharge(last.g);P.fieldShoot(last.g);run(last,P.FIELD.finishDuration+.1);assert.equal(last.g.complete,false);assert.ok(P.validSnapshot(last.g));run(last,4);assert.equal(last.g.complete,true);assert.equal(last.g.result,'win');assert.deepEqual(last.g.field.score,[1,0]);
});

test('both goalkeepers kick a collected ball high and far upfield',()=>{
  for(const team of [0,1]){
    const {sim}=game();clearLane(sim);const f=sim.g.field,p=f.players[team*5],direction=team?-1:1;
    p.cooldown=0;f.think=0;Object.assign(f.ball,{owner:p.id,x:p.x,y:p.y,lastTouch:team,shot:false});
    sim.step(1/120);assert.equal(f.ball.owner,null);assert.ok(f.ball.vx*direction>350);assert.ok(f.ball.vz>150);assert.equal(f.passes[team],1);assert.equal(f.shots[team],0);
    const x=f.ball.x;run(sim,.65);assert.ok((f.ball.x-x)*direction>200);assert.ok(f.ball.z>45);assert.ok(P.validSnapshot(sim.g));
  }
});

test('late body-first contact causes a foul, with the penalty-area lines deciding the restart',()=>{
  for(const [x,y,team,kind]of [[875,300,0,'penalty'],[845,125,0,'penalty'],[844,300,0,'free-kick'],[900,124,0,'free-kick'],[125,300,1,'penalty'],[156,300,1,'free-kick']]){
    const {sim}=game(),{f,carrier,defender}=lateChallenge(sim,x,y,team);
    assert.equal(P.fieldContactFoul(sim.g,defender,carrier),true);assert.equal(f.foul.kind,kind);assert.equal(f.fouls[1-team],1);assert.equal(f.penalties[team],kind==='penalty'?1:0);
    assert.equal(P.fieldContactFoul(sim.g,defender,carrier),false);const elapsed=f.elapsed;run(sim,1.1);assert.equal(f.state,'restart');assert.equal(f.elapsed,elapsed);assert.ok(P.validSnapshot(sim.g));
    if(kind==='penalty'){assert.equal(carrier.x,team?108:892);assert.equal(carrier.y,300);assert.ok(f.players.filter(p=>!p.keeper&&p!==carrier).every(p=>team?p.x>=185:p.x<=815));}
  }
  const {sim}=game(),{f,carrier,defender}=lateChallenge(sim);defender.x=carrier.x+24;defender.vx=-200;assert.equal(P.fieldContactFoul(sim.g,defender,carrier),false);assert.equal(f.foul,null);
});

test('an AI defender foul awards a playable penalty that scores in regulation and returns to open play',()=>{
  const h=harness();h.app.start('match');const {f,defender}=lateChallenge(h.app.sim);defender.target={x:920,y:300};h.frames(2);
  assert.equal(f.state,'foul');assert.equal(f.penalties[0],1);h.frames(65);assert.equal(f.state,'restart');
  h.click('[data-action="field-restart"]');h.frame();assert.ok(f.finish);assert.ok(h.doc.querySelector('#controls').innerHTML.includes('PENALTY KICK'));
  h.click('[data-action="field-aim"][data-point="245,320"]');const elapsed=f.elapsed;h.frames(P.FIELD.finishDuration*60+25);
  assert.equal(f.score[0],1);assert.equal(f.shots[0],1);assert.equal(f.setPiece,null);assert.equal(f.elapsed,elapsed);assert.equal(h.app.sim.g.a.length,0,'A foul penalty is not a shootout kick');
  h.frames(230);assert.equal(f.state,'live');assert.ok(f.elapsed>elapsed);assert.ok(h.P.validSnapshot(h.app.sim.g));
});

test('free kicks, opponent penalties and saving during a restart recover without locking the match',()=>{
  for(const [team,x]of [[0,700],[1,120]]){
    const {sim}=game(),{f,carrier,defender}=lateChallenge(sim,x,300,team);P.fieldContactFoul(sim.g,defender,carrier);run(sim,1.05);
    const restored=P.Simulation.restore(sim.snapshot());assert.ok(restored);assert.equal(restored.g.field.setPiece.kind,team?'penalty':'free-kick');
    if(team===0){P.fieldRestart(restored.g);P.fieldFinishAim(restored.g,500,320);}
    run(restored,7);assert.equal(restored.g.field.setPiece,null);assert.ok(['live','goal','kickoff'].includes(restored.g.field.state));assert.ok(P.validSnapshot(restored.g));
  }
});

test('malformed shot-window and foul saves are rejected, and older pitch saves remain compatible',()=>{
  const {sim}=game();clearLane(sim);P.fieldCharge(sim.g);P.fieldShoot(sim.g);
  for(const mutate of [f=>f.finish.remaining=5,f=>f.finish.aim.x=NaN,f=>f.finish.taker=9,f=>f.finish.power=-1]){const snap=sim.snapshot();mutate(snap.field);assert.equal(P.validSnapshot(snap),false);}
  const previousWindow=sim.snapshot();previousWindow.field.finish.remaining=3;const resumed=P.Simulation.restore(previousWindow);assert.ok(resumed);assert.equal(resumed.g.field.finish.remaining,2.5);
  const foul=game().sim,{carrier,defender}=lateChallenge(foul);P.fieldContactFoul(foul.g,defender,carrier);const bad=foul.snapshot();bad.field.foul.taker=99;assert.equal(P.validSnapshot(bad),false);
  const old=game().sim.snapshot();for(const key of ['finish','foul','setPiece','fouls','penalties','shotPending'])delete old.field[key];assert.ok(P.Simulation.restore(old));
});

function readyFreeKick(h){
  h.app.start('match');const {f,carrier,defender}=lateChallenge(h.app.sim,700,300);
  h.P.fieldContactFoul(h.app.sim.g,defender,carrier);h.frames(65);assert.equal(f.state,'restart');
  Object.assign(f.players[4],{x:820,y:350,vx:0,vy:0,target:{x:820,y:350}});
  return f;
}

test('free-kick pass button and Q use the chosen teammate and immediately resume playable football',()=>{
  for(const method of ['button','keyboard']){
    const h=harness(),f=readyFreeKick(h),canvas=h.doc.querySelector('#stadium');
    assert.ok(h.doc.querySelector('[data-action="field-pass"]'));assert.ok(h.doc.querySelector('[data-action="field-restart"]'));
    const box=canvas.getBoundingClientRect(),scale=Math.min(box.width/1140,box.height/740);
    canvas.emit('pointerdown',{clientX:box.left+box.width/2+320*scale,clientY:box.top+box.height/2+50*scale,pointerId:20});
    assert.ok(Math.abs(f.aim.x-820)<1e-6);const elapsed=f.elapsed;
    if(method==='button')h.click('[data-action="field-pass"]');else{h.event('keydown','KeyQ');h.event('keyup','KeyQ');}
    assert.equal(f.state,'live');assert.equal(f.setPiece,null);assert.equal(f.finish,null);assert.equal(f.passes[0],1);assert.equal(f.shots[0],0);assert.equal(f.controlled,4);
    assert.equal(f.ball.owner,null);assert.equal(f.ball.shot,false);assert.ok(h.doc.querySelector('[data-field-hold="shoot"]'));assert.ok(h.doc.body.classList.contains('on-pitch'));
    assert.equal(h.app.passField(),false,'A second press cannot pass a ball still in flight');assert.equal(f.passes[0],1);
    h.frames(45);assert.equal(f.ball.owner,4);assert.ok(f.elapsed>elapsed);assert.ok(h.P.validSnapshot(h.app.sim.g));
    h.event('keydown','KeyW');const y=f.players[4].y;h.frames(8);h.event('keyup','KeyW');assert.ok(f.players[4].y<y);
  }
});

test('passing during a free-kick aiming countdown cancels the shot and survives save/reload',()=>{
  const h=harness(),f=readyFreeKick(h);f.aim={x:820,y:350};h.click('[data-action="field-restart"]');h.frames(12);
  assert.ok(f.finish);assert.ok(h.doc.querySelector('#controls').innerHTML.includes('PASS INSTEAD / Q'));
  h.click('[data-action="field-pass"]');assert.equal(f.finish,null);assert.equal(f.setPiece,null);assert.equal(f.passes[0],1);assert.equal(f.shots[0],0);
  const again=harness(JSON.parse(h.memory.get('penalty-panic-v1')));again.click('[data-action="resume-save"]');
  assert.equal(again.app.sim.g.field.finish,null);assert.equal(again.app.sim.g.field.setPiece,null);assert.equal(again.app.sim.g.field.ball.owner,null);
  assert.equal(again.app.passField(),false,'Pause must block actions');again.click('[data-action="resume"]');again.frames(180);
  assert.equal(again.app.sim.g.field.shots[0],0);assert.equal(again.app.sim.g.field.passes[0],1);assert.ok(again.app.sim.g.field.elapsed>f.elapsed);
});

test('the free-kick pass option cannot bypass a penalty, opponent restart or ordinary shot countdown',()=>{
  const h=harness();h.app.start('match');const {carrier,defender}=lateChallenge(h.app.sim,875,300);
  h.P.fieldContactFoul(h.app.sim.g,defender,carrier);h.frames(65);
  assert.equal(h.doc.querySelector('[data-action="field-pass"]'),null);assert.equal(h.app.passField(),false);
  h.click('[data-action="field-restart"]');h.frame();assert.equal(h.doc.querySelector('[data-action="field-pass"]'),null);assert.equal(h.app.passField(),false);assert.ok(h.app.sim.g.field.finish);
  const away=game().sim,contact=lateChallenge(away,700,300,1);P.fieldContactFoul(away.g,contact.defender,contact.carrier);run(away,1.1);assert.equal(P.fieldPass(away.g),false);
  const shot=game().sim;clearLane(shot);P.fieldCharge(shot.g);P.fieldShoot(shot.g);assert.equal(P.fieldPass(shot.g),false);assert.ok(shot.g.field.finish);
});


function keeperPossession(sim,assists=false){
  clearLane(sim);const f=sim.g.field;f.assists=assists;f.think=0;
  Object.assign(f.players[3],{x:850,y:300,dx:1,dy:0,cooldown:0,target:{x:850,y:300}});
  const keeper=f.players[5];Object.assign(keeper,{x:957,y:300,dx:-1,dy:0,cooldown:.65,target:{x:957,y:300}});P.fieldTakeBall(f,keeper);return f;
}
test('keyboard and touch tackles can rob a keeper during the carrying window and lead to a goal',()=>{
  for(const touch of [false,true]){
    const h=harness();h.app.start('match');const f=keeperPossession(h.app.sim);h.event('keydown','KeyD');h.frames(35);h.event('keyup','KeyD');assert.equal(f.ball.owner,5);assert.ok(f.keeperHold>1);
    if(touch)h.click('[data-action="field-tackle"]');else{h.event('keydown','KeyX');h.event('keyup','KeyX');}
    assert.equal(f.ball.owner,3);assert.equal(f.tackles,1);assert.equal(f.keeperHold,0);assert.ok(f.message.includes('Keeper dispossessed'));assert.equal(f.ball.x,f.players[3].x+16);
    h.event('keydown','Space');h.event('keyup','Space');h.frame();h.click('[data-action="field-aim"][data-point="755,185"]');h.frames(180);
    assert.equal(f.score[0],1);assert.equal(f.tackles,1);assert.ok(P.validSnapshot(h.app.sim.g));
  }
});
test('distant keeper tackles fail, assists can steal nearby, and an unchallenged keeper still clears',()=>{
  const manual=game().sim,f=keeperPossession(manual);assert.equal(P.fieldTackle(manual.g),false);assert.equal(f.ball.owner,5);assert.equal(f.tackles,0);
  run(manual,1);assert.equal(f.ball.owner,5);assert.ok(f.keeperHold>0);run(manual,1.1);assert.equal(f.ball.owner,null);assert.ok(f.ball.vx< -300);assert.ok(f.ball.z>0);
  const assisted=game().sim,a=keeperPossession(assisted,true);Object.assign(a.players[3],{x:929,y:300});run(assisted,.75);assert.equal(a.ball.owner,3);assert.equal(a.tackles,1);assert.equal(a.keeperHold,0);
});
test('keeper carrying time pauses, survives reload and does not restart when resuming',()=>{
  const h=harness();h.app.start('match');keeperPossession(h.app.sim);h.frames(25);h.app.pause();const remaining=h.app.sim.g.field.keeperHold;h.frames(120);assert.equal(h.app.sim.g.field.keeperHold,remaining);
  const next=harness(JSON.parse(h.memory.get('penalty-panic-v1')));next.click('[data-action="resume-save"]');assert.equal(next.app.sim.g.field.keeperHold,remaining);next.click('[data-action="resume"]');next.frames(110);assert.equal(next.app.sim.g.field.ball.owner,null);assert.equal(next.app.sim.g.field.keeperHold,0);
  const invalid=game().sim;keeperPossession(invalid);const snapshot=invalid.snapshot();snapshot.field.keeperHold=99;assert.equal(P.validSnapshot(snapshot),false);delete snapshot.field.keeperHold;assert.ok(P.validSnapshot(snapshot));
});
test('the eye camera uses the shooter position, range and angle with reversible goal aiming',()=>{
  const {sim}=game();clearLane(sim);P.fieldCharge(sim.g);P.fieldShoot(sim.g);const f=sim.g.field,p=f.players[3];
  let farWidth,nearWidth;
  for(const x of [100,500,820,950,984])for(const y of [20,170,300,430,580]){
    Object.assign(p,{x,y});const camera=P.fieldCamera(f);assert.equal(camera.x,x);assert.equal(camera.y,y);assert.ok(camera.focal>0);
    const left=P.fieldProject(f,{x:1000,y:220}),right=P.fieldProject(f,{x:1000,y:380});assert.ok(right.x>left.x);assert.ok(left.visible&&right.visible);
    if(x===500&&y===300)farWidth=right.x-left.x;if(x===820&&y===300)nearWidth=right.x-left.x;
    if(y!==300)assert.ok(Math.abs(left.y-right.y)>.001,'Angled goals have different depths at each post');
    for(const ax of [170,245,500,755,830])for(const ay of [115,185,320,365]){
      const point={x:1000,y:220+(ax-200)/600*160,z:(350-ay)/210*58},projected=P.fieldProject(f,point);
      if(!projected.visible)continue;
      const aim=P.fieldAimPoint(f,projected.x,projected.y-point.z*projected.zScale);assert.ok(aim);assert.ok(Math.abs(aim.x-ax)<1e-7);assert.ok(Math.abs(aim.y-ay)<1e-7);
    }
  }
  assert.ok(nearWidth>farWidth*2);
});
test('clicking the visible goal in desktop and portrait views selects the matching physical shot',()=>{
  for(const [width,height]of [[1000,620],[360,380]])for(const lane of [150,450]){
    const h=harness();h.app.start('match');clearLane(h.app.sim);const f=h.app.sim.g.field;Object.assign(f.players[3],{x:820,y:lane});h.event('keydown','Space');h.event('keyup','Space');h.frame();
    const canvas=h.doc.querySelector('#stadium');canvas.getBoundingClientRect=()=>({left:0,top:0,width,height});h.app.renderer.resize();
    const before=JSON.stringify(f),labels=[];h.app.renderer.ctx.fillText=t=>labels.push(t);h.app.renderer.draw(h.app.sim.g,h.app.save,0);assert.equal(JSON.stringify(f),before);assert.ok(labels.some(t=>t.includes('PLAYER VIEW')));
    const world={x:1000,y:220+(755-200)/600*160,z:(350-185)/210*58},screen=P.fieldProject(f,world),view=h.app.renderer.view;
    canvas.emit('pointerdown',{clientX:view.x+screen.x*view.scale,clientY:view.y+(screen.y-world.z*screen.zScale)*view.scale});
    assert.ok(Math.abs(f.finish.aim.x-755)<1e-7);assert.ok(Math.abs(f.finish.aim.y-185)<1e-7);
    const shot=P.fieldShotSpec(f);h.frames(151);assert.equal(f.shots[0],1);assert.ok(f.ball.vx>0&&shot.vx>0);
  }
});
