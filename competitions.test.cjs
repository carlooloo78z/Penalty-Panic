'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P={...require('./progression.js'),...require('./simulation.js')},{harness}=require('./test-dom.cjs');
const clone=v=>JSON.parse(JSON.stringify(v));
function season(kind='champions',seed=42){const s=P.fresh();s.competitions[kind]=P.createCompetition(kind,s.club,'easy',seed,`season-${kind}-${seed}`);return s;}
function fixture(s,kind='champions'){return new P.Simulation(s,'competition',{kind,regulation:true});}
function end(sim,score=[2,0]){const f=sim.g.field;f.score=[...score];f.elapsed=P.fieldDuration(f);f.state='ended';f.finished=true;f.shotPending=0;f.celebration=null;sim.finishRegulation();}
function result(s,kind,score){const sim=fixture(s,kind);end(sim,score);assert.ok(P.reward(s,sim.g));return sim;}
function run(sim,seconds){for(let i=0;i<Math.round(seconds*120);i++)sim.step(1/120);}
function clear(g){P.fieldStart(g);const f=g.field;for(const p of f.players){p.x=p.team?650:350;p.y=540;p.vx=p.vy=0;p.target={x:p.x,y:p.y};p.cooldown=0;}for(const id of [0,5])Object.assign(f.players[id],{x:id?957:43,y:300,target:{x:id?957:43,y:300}});f.think=0;return f;}

test('Premier League schedules 380 fixtures, 38 rounds and home/away against every club',()=>{
  const rounds=P.competitionSchedule('premier',42);assert.equal(rounds.length,38);
  for(const round of rounds){assert.equal(round.fixtures.length,10);assert.equal(new Set(round.fixtures.flatMap(f=>[f.home,f.away])).size,20);}
  const all=rounds.flatMap(r=>r.fixtures);assert.equal(all.length,380);assert.equal(new Set(all.map(f=>`${f.home}-${f.away}`)).size,380);
  for(let id=0;id<20;id++){assert.equal(all.filter(f=>f.home===id).length,19);assert.equal(all.filter(f=>f.away===id).length,19);}
});
test('Champions draw gives every club eight unique opponents, four home/away, two from every pot',()=>{
  for(const seed of [1,42,99,4294967295]){
    const rounds=P.competitionSchedule('champions',seed),all=rounds.flatMap(r=>r.fixtures);assert.equal(rounds.length,8);assert.equal(all.length,144);
    for(const r of rounds)assert.equal(new Set(r.fixtures.flatMap(f=>[f.home,f.away])).size,36);
    for(let id=0;id<36;id++){
      const home=all.filter(f=>f.home===id),away=all.filter(f=>f.away===id);assert.equal(home.length,4);assert.equal(away.length,4);
      assert.equal(new Set([...home.map(f=>f.away),...away.map(f=>f.home)]).size,8);
      assert.deepEqual(home.map(f=>Math.floor(f.away/9)).sort(),[0,1,2,3]);assert.deepEqual(away.map(f=>Math.floor(f.home/9)).sort(),[0,1,2,3]);
    }
  }
  assert.notDeepEqual(P.competitionSchedule('champions',1),P.competitionSchedule('champions',99));
});
test('league draws award one point, never start penalties, and persist as draws in results/history',()=>{
  for(const kind of ['champions','premier']){
    const s=season(kind),sim=fixture(s,kind);end(sim,[2,2]);assert.equal(sim.g.result,'draw');assert.equal(sim.g.field.pensStarted,false);assert.equal(sim.g.complete,true);
    const rewards=P.reward(s,sim.g);assert.ok(rewards);assert.equal(rewards.coinLines.some(([n])=>n==='Match victory'),false);
    s.lastResult={...sim.snapshot(),rewards};assert.equal(P.competitionTable(s.competitions[kind]).find(t=>t.id===0).points,1);
    const loaded=P.load(JSON.stringify(s));assert.equal(loaded.history[0].result,'draw');assert.equal(loaded.lastResult.result,'draw');assert.ok(loaded.competitions[kind]);
  }
});
test('full Premier League season produces a title once, and losses can produce relegation',()=>{
  for(const win of [true,false]){
    const s=season('premier');let played=0,last;
    while(P.competitionMatch(s.competitions.premier)){last=result(s,'premier',win?[5,0]:[0,5]);played++;assert.ok(P.validCompetition(s.competitions.premier));}
    assert.equal(played,38);const c=s.competitions.premier,table=P.competitionTable(c);assert.ok(c.finished);assert.equal(c.results.length,380);
    assert.equal(table.find(t=>t.id===0).points,win?114:0);assert.equal(s.competitionHonours.length,win?1:0);assert.equal(table.findIndex(t=>t.id===0),win?0:19);
    const coins=s.coins;assert.equal(P.reward(s,last.g),null);assert.equal(s.coins,coins);
    s.claimed=[];assert.equal(P.reward(s,last.g),null,'The fixture ledger also blocks repeat claims');
    assert.ok(P.load(JSON.stringify(s)).competitions.premier.finished);
  }
});
test('Champions top eight skip play-offs, play home/away knockouts and win the final prize',()=>{
  const s=season(),stages=[];let last;
  while(P.competitionMatch(s.competitions.champions)){const spec=P.competitionMatch(s.competitions.champions);stages.push([spec.competition.stage,spec.competition.leg]);last=result(s,'champions',[8,0]);assert.ok(P.validCompetition(s.competitions.champions));}
  assert.equal(stages.length,15);assert.equal(stages.some(([s])=>s==='playoff'),false);
  for(const stage of ['last16','quarter','semi'])assert.deepEqual(stages.filter(([s])=>s===stage).map(([,l])=>l),[1,2]);
  assert.deepEqual(stages.at(-1),['final',1]);assert.equal(s.competitions.champions.champion,0);assert.equal(s.competitionHonours.length,1);assert.ok(s.owned.includes('3-3'));
  assert.equal(P.reward(s,last.g),null);assert.ok(P.load(JSON.stringify(s)).competitions.champions.finished);
});
test('league-phase elimination finishes the competition without a fake next fixture',()=>{
  const s=season();for(let i=0;i<8;i++)result(s,'champions',[0,8]);const c=s.competitions.champions;
  assert.ok(c.finished);assert.notEqual(c.champion,0);assert.equal(P.competitionMatch(c),null);assert.ok(P.validCompetition(c));assert.equal(s.competitionHonours.length,0);
});
test('9th–24th enter two-legged play-offs and can progress to the round of 16',()=>{
  let found;
  for(let seed=1;seed<30&&!found;seed++){
    const s=season('champions',seed);for(let i=0;i<8;i++)result(s,'champions',i<3?[3,0]:i<5?[1,1]:[0,2]);
    if(P.competitionMatch(s.competitions.champions)?.competition.stage==='playoff')found=s;
  }
  assert.ok(found);const rank=P.competitionTable(found.competitions.champions).findIndex(t=>t.id===0)+1;assert.ok(rank>=9&&rank<=24);
  assert.equal(P.competitionChallenge(P.competitionMatch(found.competitions.champions).competition).level,9);
  result(found,'champions',[4,0]);assert.equal(P.competitionMatch(found.competitions.champions).competition.leg,2);assert.equal(P.competitionChallenge(P.competitionMatch(found.competitions.champions).competition).level,10);result(found,'champions',[1,0]);
  assert.equal(P.competitionMatch(found.competitions.champions).competition.stage,'last16');
  assert.equal(P.competitionChallenge(P.competitionMatch(found.competitions.champions).competition).level,11);
});
test('a drawn first leg stands; aggregate decides leg two even if that leg is lost',()=>{
  const s=season();for(let i=0;i<8;i++)result(s,'champions',[6,0]);
  const draw=result(s,'champions',[1,1]);assert.equal(draw.g.result,'draw');assert.equal(draw.g.field.duration,undefined);
  let sim=fixture(s);end(sim,[2,0]);assert.equal(sim.g.result,'win');assert.ok(P.reward(s,sim.g));
  result(s,'champions',[4,0]);sim=fixture(s);end(sim,[0,1]);assert.equal(sim.g.result,'win');assert.equal(sim.g.field.pensStarted,false);assert.ok(P.reward(s,sim.g));
});
test('aggregate tie gets both extra-time halves and pens, with no away-goals shortcut',()=>{
  const s=season();for(let i=0;i<8;i++)result(s,'champions',[6,0]);result(s,'champions',[2,1]);
  const sim=fixture(s);end(sim,[1,2]);assert.equal(sim.g.complete,false);assert.equal(sim.g.field.duration,122.5);assert.equal(sim.g.field.state,'ready');assert.ok(P.validSnapshot(sim.g));
  end(sim,[2,2]);assert.equal(sim.g.field.duration,140);assert.equal(sim.g.complete,false,'Both halves must be played even after taking the lead');
  const restored=P.Simulation.restore(sim.snapshot());assert.ok(restored);end(restored,[2,3]);assert.equal(restored.g.phase,'interval');
  restored.next();assert.equal(restored.g.field.pensStarted,true);assert.equal(restored.g.phase,'aim');assert.ok(P.validSnapshot(restored.g));
  const g=restored.g;g.a=[true,true,true,true,true];g.b=[true,true,true,true,true];assert.equal(P.matchOutcome(g),null);g.a.push(true);assert.equal(P.matchOutcome(g),null);g.b.push(false);assert.equal(P.matchOutcome(g),'win');
  g.complete=true;g.result='win';g.score='6 : 5';assert.ok(P.reward(s,g));assert.equal(s.competitions.champions.results.find(r=>r.key===g.competition.key).extra,true);
});
test('winning in extra time advances directly without a shootout',()=>{
  const s=season();for(let i=0;i<8;i++)result(s,'champions',[6,0]);result(s,'champions',[0,0]);const sim=fixture(s);end(sim,[0,0]);end(sim,[1,0]);end(sim,[1,0]);
  assert.equal(sim.g.result,'win');assert.equal(sim.g.field.pensStarted,false);assert.ok(P.reward(s,sim.g));
});
test('corrupt, stale and cross-competition saves cannot overwrite a campaign or claim a result',()=>{
  const s=season();s.competitions.premier=P.createCompetition('premier',s.club,'hard',77,'pl');const sim=fixture(s);assert.ok(P.validSnapshot(sim.g));
  const wrong=sim.snapshot();wrong.competition.aggregate=[99,0];end(sim,[3,0]);const before=clone(s);assert.equal(P.applyCompetitionResult(s.competitions.premier,sim.g),null);assert.deepEqual(s,before);
  assert.ok(P.reward(s,sim.g));const corrupt=clone(s);corrupt.competitions.champions.rounds[0].fixtures[0].home=99;assert.equal(P.load(corrupt).competitions.champions,null);assert.ok(P.load(corrupt).competitions.premier);
  const dup=clone(s.competitions.champions);dup.results.push(dup.results[0]);assert.equal(P.validCompetition(dup),false);
});
test('both competition cards, difficulty, kickoff, resume and draw results work through production controls',()=>{
  const h=harness();assert.ok(h.doc.querySelector('[data-action="champions"]'));assert.ok(h.doc.querySelector('[data-action="premier"]'));
  h.click('[data-action="premier"]');h.doc.querySelector('#competition-level').value='hard';h.click('[data-action="competition-new"]');assert.equal(h.app.save.competitions.premier.difficulty,'hard');
  h.click('[data-action="competition-play"]');assert.equal(h.app.sim.g.mode,'competition');assert.equal(h.app.sim.g.keeperLevel,'elite');h.click('[data-action="field-start"]');h.frames(20);h.app.pause();
  const reloaded=harness(JSON.parse(h.memory.get('penalty-panic-v1')));reloaded.click('[data-action="premier"]');reloaded.click('[data-action="competition-play"]');assert.equal(reloaded.app.paused,true);reloaded.click('[data-action="resume"]');
  end(reloaded.app.sim,[1,1]);reloaded.app.process();reloaded.app.next();assert.equal(reloaded.app.page,'result');assert.ok(reloaded.doc.querySelector('#screen').innerHTML.includes('HONOURS EVEN'));reloaded.click('[data-action="premier"]');
  assert.equal(reloaded.app.save.competitions.premier.round,1);reloaded.click('[data-action="champions"]');reloaded.click('[data-action="competition-new"]');assert.ok(reloaded.app.save.competitions.champions);assert.equal(reloaded.app.save.competitions.premier.round,1);
});
test('campaign reset keeps the other competition and rejects an old interrupted fixture',()=>{
  const h=harness(season());h.app.save.competitions.premier=P.createCompetition('premier',h.app.save.club,'easy',5,'other');h.app.navigate('champions');h.click('[data-action="competition-play"]');const stale=h.app.sim.snapshot();h.app.pause();h.click('[data-action="leave"]');h.click('[data-action="champions"]');
  h.click('[data-action="competition-new"]');assert.equal(h.app.modalKind,'competition-reset');h.click('[data-action="close-dialog"]');assert.equal(h.app.save.competitions.champions.id,stale.competition.id);
  h.click('[data-action="competition-new"]');h.click('[data-action="confirm-competition"]');assert.equal(h.app.save.competitions.premier.id,'other');h.app.save.active=stale;h.app.resumeSaved();assert.equal(h.app.sim,null);assert.equal(h.app.page,'champions');
});
test('preview uses live launch and gravity and shows actual defenders, with a long-range shot map',()=>{
  const h=harness();h.app.start('match');const g=h.app.sim.g,f=clear(g),shooter=f.players[3];Object.assign(shooter,{x:500,y:300});Object.assign(f.players[8],{x:650,y:300});Object.assign(f.ball,{owner:3,x:516,y:300});P.fieldCharge(g);P.fieldShoot(g);P.fieldFinishAim(g,500,350);
  const a=P.fieldShotPreview(f),spec=P.fieldShotSpec(f),project=P.fieldProject(f,{x:1000,y:300});assert.equal(project.x,500);assert.ok(project.y>250&&project.y<350);assert.equal(a.distance,53);
  const copy=clone(f);assert.deepEqual(P.fieldShotPreview(f),a);assert.deepEqual(clone(f),copy,'Prediction must not mutate the game');
  const ids=[],old=h.app.renderer.matchPlayer;h.app.renderer.matchPlayer=(...args)=>ids.push(args.at(-1));h.app.renderer.draw(g,h.app.save,0);h.app.renderer.matchPlayer=old;assert.ok(ids.includes(8));assert.equal(ids.includes(3),false);
  const labels=[];h.app.renderer.ctx.fillText=t=>labels.push(t);h.app.renderer.draw(g,h.app.save,0);assert.ok(labels.includes('SHOT MAP / EXPECTED PATH'));
  run(h.app.sim,P.FIELD.finishDuration);assert.equal(f.ball.vx,spec.vx);assert.equal(f.ball.vz,spec.vz);assert.equal(f.ball.z,3);
  const b={...spec};P.advanceBall(b,P.FIELD.step);h.app.sim.step(P.FIELD.step);assert.equal(f.ball.z,b.z);assert.equal(f.ball.vz,b.vz);
});
test('preview distinguishes clear, physically blocked, wide and over-bar shots',()=>{
  const s=P.fresh(),sim=new P.Simulation(s,'match',{regulation:true}),g=sim.g,f=clear(g);Object.assign(f.players[3],{x:800,y:300});f.ball.owner=3;P.fieldCharge(g);P.fieldShoot(g);P.fieldFinishAim(g,500,350);
  Object.assign(f.players[8],{x:920,y:300});let preview=P.fieldShotPreview(f);assert.equal(preview.blocker,8);
  f.players[8].y=500;preview=P.fieldShotPreview(f);assert.equal(preview.blocker,null);assert.equal(preview.onTarget,true);
  P.fieldFinishAim(g,830,320);assert.equal(P.fieldShotPreview(f).onTarget,false);P.fieldFinishAim(g,500,115);assert.equal(P.fieldShotPreview(f).onTarget,false);
});
test('every outfielder and keeper can be the named scorer, including the opposing team',()=>{
  for(let id=0;id<10;id++){
    const s=P.fresh(),sim=new P.Simulation(s,'match',{regulation:true}),g=sim.g,f=clear(g),team=Math.floor(id/5);
    Object.assign(f.ball,{owner:null,x:team?2:998,y:300,z:2,vx:team?-600:600,vy:0,vz:0,lock:.2,lastTouch:team,lastPlayer:id,shot:true});sim.step(1/120);
    assert.equal(f.celebration.scorer,id);assert.equal(f.celebration.team,team);assert.equal(f.score[team],1);assert.ok(P.validSnapshot(g));const elapsed=f.elapsed;run(sim,1);assert.equal(f.elapsed,elapsed);
    const restored=P.Simulation.restore(sim.snapshot());assert.ok(restored);assert.equal(P.fieldSkipCelebration(restored.g),true);run(restored,.9);assert.equal(restored.g.field.state,'live');assert.equal(restored.g.field.score[team],1);
  }
});
test('goal cutscene pauses, survives reload and skips with touch or keyboard without another reward',()=>{
  const h=harness();h.app.start('match');const f=clear(h.app.sim.g);Object.assign(f.ball,{owner:null,x:998,y:300,z:2,vx:600,vy:0,vz:0,lock:.2,lastTouch:0,lastPlayer:4,shot:true});h.frame();assert.ok(h.doc.querySelector('[data-action="skip-goal"]'));
  const time=f.celebration.elapsed;h.app.pause();h.frames(60);assert.equal(f.celebration.elapsed,time);
  const again=harness(JSON.parse(h.memory.get('penalty-panic-v1')));again.click('[data-action="resume-save"]');again.click('[data-action="resume"]');again.click('[data-action="skip-goal"]');again.frames(60);assert.equal(again.app.sim.g.field.celebration,null);assert.equal(again.app.save.coins,120);
  h.click('[data-action="resume"]');h.event('keydown','Space');h.frames(60);assert.equal(f.celebration,null);assert.equal(f.score[0],1);
});
test('keepers run out to collect reachable loose balls throughout their own box, then clear upfield',()=>{
  for(const team of [0,1]){
    const s=P.fresh(),sim=new P.Simulation(s,'match',{regulation:true}),g=sim.g,f=clear(g),keeper=f.players[team*5];
    Object.assign(f.ball,{owner:null,x:team?875:125,y:425,z:0,vx:0,vy:0,vz:0,lock:0,lastTouch:1-team,shot:false});
    let gathered=false;for(let i=0;i<360;i++){sim.step(1/120);if(f.ball.owner===keeper.id){gathered=true;break;}}
    assert.ok(gathered);assert.ok(keeper.y>375);assert.ok(team?keeper.x<915:keeper.x>85);assert.ok(P.validSnapshot(g));run(sim,.85);assert.equal(f.ball.owner,keeper.id);run(sim,1.2);assert.equal(f.ball.owner,null);assert.ok(f.ball.vx*(team?-1:1)>300);assert.ok(f.ball.z>0);
  }
});
test('keepers cannot collect by hand outside their penalty area',()=>{
  const s=P.fresh(),sim=new P.Simulation(s,'match',{regulation:true}),g=sim.g,f=clear(g);Object.assign(f.players[0],{x:150,y:300});
  Object.assign(f.ball,{owner:null,x:170,y:300,z:0,vx:0,vy:0,vz:0,lock:0,lastTouch:1,shot:false});run(sim,.02);assert.notEqual(f.ball.owner,0);
});
test('new scenes render at desktop and phone sizes with reduced motion and no state mutations',()=>{
  const h=harness();h.app.start('match');const g=h.app.sim.g,f=clear(g);Object.assign(f.players[3],{x:500,y:300});f.ball.owner=3;P.fieldCharge(g);P.fieldShoot(g);
  for(const [width,height]of [[1000,620],[360,380]])for(const reduced of [false,true]){
    h.doc.querySelector('#stadium').getBoundingClientRect=()=>({width,height,left:0,top:0});h.app.renderer.resize();h.app.save.settings.reducedMotion=reduced;
    const before=JSON.stringify(g);h.app.renderer.draw(g,h.app.save,1);assert.equal(JSON.stringify(g),before);
    const scene={...g,field:{...f,finish:null,celebration:{team:1,scorer:7,elapsed:1.2}}};h.app.renderer.draw(scene,h.app.save,1);
  }
});


function campaignPair(difficulty='easy'){
  const s=season();s.competitions.champions.difficulty=difficulty;const early=clone(s);
  while(P.competitionMatch(s.competitions.champions).competition.stage!=='final')result(s,'champions',[8,0]);
  return [early,s];
}
test('Champions opponents grow every fixture on every base difficulty, including after reload',()=>{
  for(const difficulty of ['easy','normal','hard']){
    let s=season();s.competitions.champions.difficulty=difficulty;const levels=[];
    while(P.competitionMatch(s.competitions.champions)){
      const sim=fixture(s),challenge=P.competitionChallenge(sim.g.competition);levels.push(challenge.level);
      assert.equal(sim.g.difficulty,difficulty);assert.equal(s.settings.difficulty,'normal');assert.ok(challenge.intensity>=0&&challenge.intensity<=1);
      s.active=sim.snapshot();s=P.load(JSON.stringify(s));const restored=P.Simulation.restore(s.active);assert.ok(restored);assert.deepEqual(P.competitionChallenge(restored.g.competition),challenge);
      result(s,'champions',[8,0]);
    }
    assert.deepEqual(levels,[1,2,3,4,5,6,7,8,11,12,13,14,15,16,17]);
  }
  const s=season('premier');for(let i=0;i<38;i++){const sim=fixture(s,'premier');assert.equal(P.competitionChallenge(sim.g.competition).intensity,0);assert.equal(sim.g.difficulty,'easy');result(s,'premier',[8,0]);}
  assert.equal(P.competitionChallenge().intensity,0);
});
test('later Champions opponents and keepers run faster without changing player movement',()=>{
  for(const difficulty of ['easy','normal','hard']){
    const speeds=campaignPair(difficulty).map(s=>{const sim=fixture(s),f=clear(sim.g);f.think=5;
      Object.assign(f.players[6],{x:650,y:180,target:{x:750,y:180}});Object.assign(f.players[5],{y:250,target:{x:957,y:350}});
      Object.assign(f.players[3],{x:500,y:300});Object.assign(f.ball,{owner:3,x:516,y:300});P.fieldMove(sim.g,1,0);sim.step(1/120);
      return [f.players[6].vx,f.players[5].vy,f.players[3].vx];});
    assert.ok(speeds[1][0]>speeds[0][0]*1.1);assert.ok(speeds[1][1]>speeds[0][1]*1.08);assert.equal(speeds[1][2],speeds[0][2]);
  }
});
test('later Champions strikers place real shots nearer the corners with less scatter and the same save time',()=>{
  for(const difficulty of ['easy','normal','hard']){
    const samples=campaignPair(difficulty).map(s=>{
      const placements=[];
      for(let seed=1;seed<=60;seed++){
        const sim=fixture(s),f=clear(sim.g);f.seed=seed*977;Object.assign(f.players[8],{x:200,y:245,dx:-1,dy:0});Object.assign(f.ball,{owner:8,x:184,y:245,lastTouch:1,lastPlayer:8});sim.step(1/120);
        assert.ok(f.saveWindow);assert.equal(f.saveWindow.remaining,1.45);
        const b=f.saveWindow.start,target=b.y+b.vy/b.vx*(-15-b.x);placements.push(Math.abs(target-300));
      }
      const mean=placements.reduce((a,b)=>a+b)/placements.length,variance=placements.reduce((a,b)=>a+(b-mean)**2,0)/placements.length;
      return {mean,variance};
    });
    assert.ok(samples[1].mean>samples[0].mean,difficulty);assert.ok(samples[1].variance<samples[0].variance,difficulty);
  }
});
test('Champions keepers react earlier to physical pitch shots and shootout shots in later rounds',()=>{
  for(const difficulty of ['easy','normal','hard']){
    const timings=campaignPair(difficulty).map(s=>{
      const sim=fixture(s),f=clear(sim.g);f.think=5;Object.assign(f.ball,{owner:null,x:700,y:350,z:5,vx:600,vy:0,vz:0,lastTouch:0,lastPlayer:3,shot:true,lock:1});
      let frames=0;while(!f.players[5].dive&&frames<60){sim.step(1/120);frames++;}assert.ok(f.players[5].dive);
      const pens=new P.Simulation(s,'competition',{kind:'champions',seed:42});pens.g.seed=42;pens.aim(755,250);pens.charge();pens.g.power=.7;pens.release();
      let ticks=0;while(!pens.g.dive&&ticks++<300)pens.step(1/120);assert.ok(pens.g.dive);return [frames,pens.g.dive.started-pens.g.shot.started];
    });
    assert.ok(timings[1][0]<timings[0][0],difficulty+' field');assert.ok(timings[1][1]<timings[0][1],difficulty+' penalties');
  }
});
test('Champions penalty placement improves while every round keeps 1.45 seconds to save',()=>{
  const means=campaignPair('hard').map(s=>{
    let placement=0,scatter=0;
    for(let seed=1;seed<=60;seed++){
      const sim=new P.Simulation(s,'competition',{kind:'champions'});sim.g.seed=seed*977;sim.g.a.push(true);sim.next();const incoming=sim.g.incoming;
      assert.equal(sim.g.role,'keep');assert.equal(incoming.duration,1.45);placement+=Math.abs(incoming.hint.x-500);
      if(incoming.target.x>200&&incoming.target.x<800)scatter+=Math.abs(incoming.target.x-incoming.hint.x);
    }
    return {placement,scatter};
  });
  assert.ok(means[1].placement>means[0].placement);assert.ok(means[1].scatter<means[0].scatter);
});
test('the Champions fixture card shows the current level and preserves it through pause and resume',()=>{
  const s=campaignPair('normal')[1],h=harness(s);h.app.navigate('champions');
  assert.ok(h.doc.querySelector('#screen').innerHTML.includes('OPPONENT LEVEL 17 / 17'));assert.equal(h.doc.querySelector('progress').getAttribute('value'),'17');
  h.click('[data-action="competition-play"]');assert.equal(h.P.competitionChallenge(h.app.sim.g.competition).level,17);h.click('[data-action="field-start"]');h.frames(5);h.app.pause();
  const reload=harness(JSON.parse(h.memory.get('penalty-panic-v1')));reload.click('[data-action="resume-save"]');assert.equal(reload.app.paused,true);assert.equal(reload.P.competitionChallenge(reload.app.sim.g.competition).level,17);
  assert.equal(reload.app.sim.g.field.elapsed,h.app.sim.g.field.elapsed);
});
