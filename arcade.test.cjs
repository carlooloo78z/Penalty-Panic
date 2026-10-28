'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('./progression.js'),S=require('./simulation.js'),{penaltyHarness:harness}=require('./test-dom.cjs');
function until(sim,predicate){for(let i=0;i<1500&&!predicate(sim.g);i++)sim.step(1/120);assert.ok(predicate(sim.g),'Expected phase was not reached');}
function barShot(sim,power=.65,gold=true){sim.charge();sim.g.power=power;const x=S.crossbarTarget(sim.g);sim.aim(gold?x:x<500?780:220,140);sim.release();until(sim,g=>g.phase==='feedback');}
function keepShot(sim,save=true,wide=false){const point={x:wide?830:save?372:755,y:wide||!save?185:320};sim.g.incoming.target={...point};sim.g.incoming.hint={...point};until(sim,g=>g.phase==='flight');if(save&&!wide)sim.dive(point.x,point.y);until(sim,g=>g.phase==='feedback');}

test('older saves gain arcade records without changing coins, equipment or completed objectives',()=>{
  const old=P.fresh();old.coins=913;old.clubGoals=['finisher'];old.equipped.Football='0-1';old.owned.push('0-1');delete old.crossbarRecords;delete old.survivalRecords;delete old.stats.barHits;
  const save=P.load(JSON.stringify(old));assert.equal(save.coins,913);assert.equal(save.equipped.Football,'0-1');assert.deepEqual(save.clubGoals,['finisher']);assert.equal(save.crossbarRecords.hard,0);assert.equal(save.survivalRecords.normal,0);assert.equal(save.stats.barHits,0);
});
test('Crossbar Circuit freezes its moving zone on release and scores controlled gold hits',()=>{
  const sim=new S.Simulation(P.fresh(),'crossbar',{seed:31});const start=S.crossbarTarget(sim.g);sim.step(.2);assert.notEqual(S.crossbarTarget(sim.g),start);
  sim.charge();sim.g.power=.65;sim.aim(S.crossbarTarget(sim.g),300);assert.equal(sim.g.aim.y,S.G.top);sim.release();const locked=sim.g.crossbar.locked;
  sim.step(.25);assert.equal(S.crossbarTarget(sim.g),locked);assert.equal(sim.g.dive,null);until(sim,g=>g.phase==='feedback');
  assert.equal(sim.g.event,'post');assert.equal(sim.g.crossbar.hits,1);assert.equal(sim.g.crossbar.precision,1);assert.equal(sim.g.crossbar.points,100);assert.equal(sim.g.crossbar.combo,1);assert.deepEqual(sim.g.a,[]);
  sim.next();barShot(sim);assert.equal(sim.g.crossbar.points,225);assert.equal(sim.g.crossbar.combo,2);
});
test('off-zone hits and poor power reset the gold combo while woodwork and misses stay distinct',()=>{
  const sim=new S.Simulation(P.fresh(),'crossbar');barShot(sim);sim.next();barShot(sim,.4);assert.equal(sim.g.crossbar.points,140);assert.equal(sim.g.crossbar.combo,0);assert.equal(sim.g.crossbar.precision,1);
  sim.next();barShot(sim,.65,false);assert.equal(sim.g.crossbar.points,180);assert.equal(sim.g.event,'post');
  sim.next();sim.g.shotType='driven';barShot(sim,1);assert.equal(sim.g.event,'wide');assert.equal(sim.g.crossbar.hits,3);assert.equal(sim.g.crossbar.points,180);
});
test('ten Crossbar Circuit shots end once, save records and pay the listed rewards once',()=>{
  const save=P.fresh(),sim=new S.Simulation(save,'crossbar',{seed:51});for(let i=0;i<10;i++){barShot(sim);if(i<9){assert.equal(sim.g.complete,false);sim.next();}}
  assert.equal(sim.g.complete,true);assert.equal(sim.g.round,10);assert.equal(sim.g.crossbar.points,1750);assert.equal(sim.events.filter(e=>e.type==='complete').length,1);
  sim.next();sim.step(.2);assert.equal(sim.g.round,10);
  const before=save.coins,rewards=P.reward(save,sim.g);assert.deepEqual(rewards.coinLines.find(l=>l[0]==='Crossbar hits'),['Crossbar hits',40]);assert.deepEqual(rewards.coinLines.find(l=>l[0]==='Gold-zone bonuses'),['Gold-zone bonuses',80]);
  assert.equal(save.coins-before,rewards.coins);assert.equal(save.stats.matches,0);assert.equal(save.stats.shootingAttempts,0);assert.equal(save.stats.crossbarRuns,1);assert.equal(save.crossbarRecords.normal,1750);assert.equal(rewards.medal,'Gold');
  assert.ok(rewards.clubGoals.includes('bar-eight'));assert.ok(rewards.clubGoals.includes('bar-combo'));
  save.lastResult={...sim.snapshot(),rewards};assert.ok(P.validResult(save.lastResult));const restored=P.load(JSON.stringify(save)),balance=restored.coins;
  assert.equal(restored.lastResult.mode,'crossbar');assert.equal(restored.crossbarRecords.normal,1750);assert.equal(P.reward(restored,sim.g),null);assert.equal(restored.coins,balance);
});
test('Crossbar difficulty changes zone size and motion, and the circuit narrows later targets',()=>{
  const sims=['easy','normal','hard'].map(d=>{const save=P.fresh();save.settings.difficulty=d;const sim=new S.Simulation(save,'crossbar');sim.g.crossbar.offset=0;sim.step(.2);return sim;});
  assert.ok(sims[0].g.crossbar.radius>sims[1].g.crossbar.radius&&sims[1].g.crossbar.radius>sims[2].g.crossbar.radius);
  assert.ok(S.crossbarTarget(sims[0].g)<S.crossbarTarget(sims[1].g)&&S.crossbarTarget(sims[1].g)<S.crossbarTarget(sims[2].g));
  const sim=sims[1],radius=sim.g.crossbar.radius;for(let i=0;i<3;i++){barShot(sim);sim.next();}assert.ok(sim.g.crossbar.radius<radius);
});
test('Survival ends on the third concession and never treats misses as lost lives',()=>{
  const sim=new S.Simulation(P.fresh(),'survival');keepShot(sim,false,true);assert.equal(sim.g.survival.lives,3);sim.finishSurvival();assert.equal(sim.g.complete,false);
  for(let i=0;i<3;i++){sim.next();keepShot(sim,false);assert.equal(sim.g.survival.lives,2-i);assert.equal(sim.g.complete,i===2);}
  assert.equal(sim.g.round,4);assert.equal(sim.g.aiMisses,1);assert.equal(sim.g.conceded,3);assert.deepEqual(sim.g.b,[]);sim.finishSurvival();assert.equal(sim.events.filter(e=>e.type==='complete').length,1);
});
test('Survival speeds up each wave, banks between shots and pays records without shootout wins',()=>{
  const save=P.fresh(),sim=new S.Simulation(save,'survival'),read=sim.g.readDuration,flight=sim.g.incoming.duration;
  sim.finishSurvival();assert.equal(sim.g.complete,false);
  for(let i=0;i<5;i++){keepShot(sim);sim.next();}assert.equal(sim.g.saves,5);assert.ok(sim.g.readDuration<read);assert.ok(sim.g.incoming.duration<flight);
  sim.finishSurvival();assert.equal(sim.g.complete,false,'A run cannot be banked during a pending shot');keepShot(sim);sim.finishSurvival();assert.equal(sim.g.complete,true);assert.equal(sim.g.survival.lives,3);
  const rewards=P.reward(save,sim.g);assert.equal(save.survivalRecords.normal,6);assert.equal(save.stats.matches,0);assert.equal(save.stats.survivalRuns,1);assert.equal(save.stats.saves,6);assert.equal(rewards.medal,'Bronze');
  assert.deepEqual(rewards.coinLines.find(l=>l[0]==='Saves'),['Saves',72]);assert.deepEqual(rewards.coinLines.find(l=>l[0]==='Save streak milestones'),['Save streak milestones',30]);
  save.lastResult={...sim.snapshot(),rewards};assert.ok(P.validResult(save.lastResult));const restored=P.load(JSON.stringify(save));assert.equal(restored.survivalRecords.normal,6);assert.equal(restored.lastResult.survival.lives,3);assert.equal(P.reward(restored,sim.g),null);
});
test('Hard survival objectives require a completed Hard run and remain earnable at later waves',()=>{
  const save=P.fresh();save.settings.difficulty='hard';const sim=new S.Simulation(save,'survival');for(let i=0;i<20;i++){keepShot(sim);if(i<19)sim.next();}
  assert.equal(P.reward(save,sim.g),null);sim.finishSurvival();const r=P.reward(save,sim.g);assert.equal(sim.g.saves,20);assert.ok(r.clubGoals.includes('survival-hard'));assert.ok(r.clubGoals.includes('survival-ten'));assert.equal(save.stats.survivalHardBest,20);assert.equal(r.medal,'Gold');
});
test('arcade snapshots restore pending shots and reject malformed mode state',()=>{
  const bar=new S.Simulation(P.fresh(),'crossbar');bar.charge();bar.g.power=.65;bar.aim(S.crossbarTarget(bar.g),140);bar.release();bar.step(.2);const restored=S.Simulation.restore(bar.snapshot());assert.ok(restored);assert.equal(S.crossbarTarget(restored.g),S.crossbarTarget(bar.g));
  until(bar,g=>g.phase==='feedback');until(restored,g=>g.phase==='feedback');assert.deepEqual(restored.g.crossbar,bar.g.crossbar);
  for(const [key,value]of [['points',-1],['offset',Infinity],['locked',null],['radius',500]]){const bad=bar.snapshot();bad.crossbar[key]=value;assert.equal(S.Simulation.restore(bad),null);}
  const survival=new S.Simulation(P.fresh(),'survival');keepShot(survival);assert.ok(S.Simulation.restore(survival.snapshot()));const bad=survival.snapshot();bad.survival.lives=2;assert.equal(S.Simulation.restore(bad),null);
});
test('arcade menu buttons, difficulty records and all six objective launches work through the UI',()=>{
  const h=harness();assert.ok(h.doc.querySelector('[data-action="crossbar"]'));assert.ok(h.doc.querySelector('[data-action="survival"]'));
  h.app.save.crossbarRecords.hard=550;h.app.save.survivalRecords.hard=12;const select=h.doc.querySelector('[data-setting="difficulty"]');select.value='hard';h.doc.emit('change',{target:select});assert.match(h.doc.querySelector('#crossbar-best').textContent,/550/);assert.match(h.doc.querySelector('#survival-best').textContent,/12/);
  h.click('[data-action="crossbar"]');assert.equal(h.app.sim.g.mode,'crossbar');assert.match(h.doc.querySelector('#hud').innerHTML,/CROSSBAR CIRCUIT/);assert.match(h.doc.querySelector('#controls').innerHTML,/crossbar-power/);h.frame();
  h.app.navigate('menu');h.click('[data-action="survival"]');assert.equal(h.app.sim.g.role,'keep');h.frame();
  h.app.navigate('club');h.click('[data-action="challenge-filter"][data-value="Arcade"]');assert.equal(h.doc.querySelectorAll('[data-objective]').length,6);
  for(const objective of h.P.clubObjectives.filter(o=>o.group==='Arcade')){h.app.navigate('club');h.click(`[data-action="challenge-play"][data-id="${objective.id}"]`);assert.equal(h.app.sim.g.mode,objective.play.mode);if(objective.play.difficulty)assert.equal(h.app.sim.g.difficulty,objective.play.difficulty);}
});
test('Crossbar keyboard shooting, pause and saved resume keep the same frozen gold zone',()=>{
  const h=harness();h.click('[data-action="crossbar"]');h.event('keydown','Space');h.frames(55);const x=h.P.crossbarTarget(h.app.sim.g),canvas=h.doc.querySelector('#stadium');canvas.emit('pointerdown',{clientX:x,clientY:150});canvas.emit('pointerup');h.event('keyup','Space');
  const locked=h.app.sim.g.crossbar.locked;h.frames(10);h.app.pause();const time=h.app.sim.g.time;h.frames(50);assert.equal(h.app.sim.g.time,time);assert.equal(h.P.crossbarTarget(h.app.sim.g),locked);
  const reloaded=harness(JSON.parse(h.memory.get('penalty-panic-v1')));reloaded.click('[data-action="resume-save"]');assert.equal(reloaded.app.paused,true);assert.equal(reloaded.app.sim.g.crossbar.locked,locked);reloaded.click('[data-action="resume"]');reloaded.frames(100);assert.equal(reloaded.app.sim.g.crossbar.precision,1);assert.match(reloaded.doc.querySelector('#controls').innerHTML,/Gold zone/);
});
test('a complete Crossbar Circuit opens its own results, keeps rewards on reload and rematches',()=>{
  const h=harness();h.click('[data-action="crossbar"]');for(let i=0;i<10;i++){barShot(h.app.sim);h.app.process();if(i<9)h.click('[data-action="next"]');}
  const coins=h.app.save.coins,stored=JSON.parse(h.memory.get('penalty-panic-v1'));assert.equal(stored.lastResult.mode,'crossbar');assert.equal(stored.active,null);assert.equal(stored.crossbarRecords.normal,1750);
  h.click('[data-action="next"]');assert.equal(h.app.page,'result');assert.match(h.doc.querySelector('#screen').innerHTML,/MAKE THE FRAME RING/);h.click('[data-action="rematch"]');assert.equal(h.app.sim.g.crossbar.points,0);assert.equal(h.app.sim.g.round,0);
  const reload=harness(stored);reload.click('[data-action="last-result"]');assert.equal(reload.app.save.coins,coins);assert.match(reload.doc.querySelector('#screen').innerHTML,/GOLD HITS/);reload.click('[data-action="shop"]');assert.equal(reload.app.page,'shop');
});
test('banking Survival saves rewards immediately, opens its results and rematches with three lives',()=>{
  const h=harness();h.click('[data-action="survival"]');keepShot(h.app.sim);h.app.process();h.frame();assert.ok(h.doc.querySelector('[data-action="bank-survival"]'));
  h.click('[data-action="bank-survival"]');const coins=h.app.save.coins,stored=JSON.parse(h.memory.get('penalty-panic-v1'));assert.equal(stored.lastResult.mode,'survival');assert.equal(stored.active,null);assert.equal(stored.survivalRecords.normal,1);
  h.click('[data-action="next"]');assert.equal(h.app.page,'result');assert.match(h.doc.querySelector('#screen').innerHTML,/KNOW WHEN TO BANK/);assert.equal(h.app.save.coins,coins);
  h.click('[data-action="rematch"]');assert.equal(h.app.sim.g.mode,'survival');assert.equal(h.app.sim.g.survival.lives,3);assert.equal(h.app.sim.g.round,0);
  const reload=harness(stored);reload.click('[data-action="last-result"]');assert.equal(reload.app.save.coins,coins);assert.match(reload.doc.querySelector('#screen').innerHTML,/Keeper Survival|KEEPER SURVIVAL/);
});
