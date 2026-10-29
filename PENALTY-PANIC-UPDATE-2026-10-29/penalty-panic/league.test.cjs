'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P={...require('./progression.js'),...require('./simulation.js')}, {penaltyHarness:harness}=require('./test-dom.cjs');
const clone=v=>JSON.parse(JSON.stringify(v));
const knockout=(difficulty='normal',seed=42)=>{const s=P.fresh();s.league=P.createLeague(s.club,difficulty,'knockout-campaign',seed);return s;};
function fresh(difficulty='normal',seed=42){const s=P.fresh();s.league=P.createLeague(s.club,difficulty,'test-campaign',seed);s.league.format='five-minute';return s;}
function finish(s,win=true){
  const g=new P.Simulation(s,'league').g;
  Object.assign(g,{a:[win,win,win],b:[!win,!win,!win],goals:win?3:0,misses:win?0:3,saves:win?3:0,conceded:win?0:3,round:6,complete:true,result:win?'win':'loss',score:win?'3 - 0':'0 - 3'});
  const rewards=P.reward(s,g);assert.ok(rewards);s.lastResult={...g,rewards};return {g,rewards};
}
function advance(sim,condition){for(let i=0;i<1200&&!condition();i++)sim.step(1/120);assert.ok(condition(),'The simulation must reach its next phase');}
function fullFixture(s){
  const sim=new P.Simulation(s,'league'),g=sim.g;
  for(let kicks=0;kicks<40&&!g.complete;kicks++){
    if(g.role==='shoot'){sim.aim(755,185);sim.charge();g.power=.65;sim.release();}
    else{g.incoming.target={x:372,y:320};advance(sim,()=>g.phase==='flight');sim.dive(372,320);}
    advance(sim,()=>g.phase==='feedback');assert.equal(g.a.length+g.b.length,g.round);
    if(!g.complete)sim.next();
  }
  assert.equal(g.result,'win');assert.ok(g.a.length>=3);assert.ok(g.b.length>=2);
  const rewards=P.reward(s,g);assert.ok(rewards);s.lastResult={...sim.snapshot(),rewards};return g;
}
function uiWin(h){
  h.click('[data-action="league-play"]');const g=h.app.sim.g;
  Object.assign(g,{a:[true,true,true],b:[false,false],goals:3,saves:2,round:5});h.app.sim.next();g.incoming.target={x:372,y:320};
  for(let i=0;i<240&&g.phase!=='flight';i++)h.frame();h.app.sim.dive(372,320);
  for(let i=0;i<240&&!g.complete;i++)h.frame();assert.equal(g.result,'win');assert.ok(h.app.victory);return g;
}

test('the draw has eight clubs and three distinct opponents per club, stable for a saved seed',()=>{
  const c=fresh().league,schedule=P.leagueSchedule();assert.equal(schedule.length,12);
  for(let id=0;id<8;id++){
    const fixtures=schedule.filter(f=>[f.home,f.away].includes(id));assert.equal(fixtures.length,3);
    assert.equal(new Set(fixtures.map(f=>f.home===id?f.away:f.home)).size,3);
  }
  const names=Array.from({length:8},(_,id)=>P.leagueClub(c,id).name);assert.equal(new Set(names).size,8);
  assert.deepEqual(names,Array.from({length:8},(_,id)=>P.leagueClub(clone(c),id).name));
  const next=fresh('normal',56).league;assert.notDeepEqual(names,Array.from({length:8},(_,id)=>P.leagueClub(next,id).name));
});

test('five fully simulated shootouts progress from the league to a trophy with the real score rules',()=>{
  let s=fresh();const phases=[];
  for(let i=0;i<5;i++){
    const g=fullFixture(s);phases.push(g.league.stage);
    assert.equal(g.result,P.outcome(g.a,g.b));assert.ok(P.validLeague(s.league));
    assert.ok(P.validResult(s.lastResult));s=P.load(JSON.stringify(s));assert.ok(s.league);
  }
  assert.deepEqual(phases,['league','league','league','semi','final']);
  assert.equal(P.leagueState(s.league).stage,'champion');assert.equal(s.league.results.length,15);
  assert.equal(s.leagueHonours.length,1);assert.ok(s.owned.includes('3-3'));assert.equal(s.stats.matches,5);
  assert.equal(P.leagueMatch(s.league),null);assert.equal(s.career,0);
});

test('qualification, finalist and champion bonuses are paid once, with an exclusive kit',()=>{
  const s=fresh();assert.equal(s.owned.includes('3-3'),false);assert.equal(P.purchase(s,'3-3'),false);
  finish(s);finish(s);const qualified=finish(s);assert.ok(qualified.rewards.coinLines.some(([n,v])=>n==='Knockout qualification'&&v===80));
  const semi=finish(s);assert.ok(semi.rewards.coinLines.some(([n,v])=>n==='Reached the final'&&v===100));
  const final=finish(s),balance=s.coins,xp=s.xp,table=JSON.stringify(s.league);
  assert.ok(final.rewards.coinLines.some(([n,v])=>n==='Champions League trophy'&&v===350));
  assert.ok(final.rewards.cosmetics.includes('Champions Night'));assert.equal(P.reward(s,final.g),null);
  s.claimed=[];assert.equal(P.reward(s,final.g),null,'The finished bracket also rejects a stale fixture');
  assert.equal(s.coins,balance);assert.equal(s.xp,xp);assert.equal(JSON.stringify(s.league),table);assert.equal(s.leagueHonours.length,1);
});

test('league elimination completes the AI bracket and leaves match rewards intact',()=>{
  const s=fresh();finish(s,false);finish(s,false);const result=finish(s,false),state=P.leagueState(s.league);
  assert.equal(state.stage,'eliminated');assert.ok(state.rank>4);assert.ok(state.champion>0);
  assert.equal(s.league.results.length,15);assert.ok(P.validLeague(s.league));assert.equal(s.leagueHonours.length,0);
  assert.equal(s.owned.includes('3-3'),false);assert.ok(result.rewards.coins>=20);assert.equal(P.leagueMatch(s.league),null);
});

test('a semi-final loss ends the campaign, and a final loss earns the runner-up bonus',()=>{
  for(const loseAt of ['semi','final']){
    const s=fresh();finish(s);finish(s);finish(s);if(loseAt==='final')finish(s);
    const r=finish(s,false);assert.equal(P.leagueState(s.league).stage,'eliminated');assert.ok(P.validLeague(s.league));
    assert.equal(s.leagueHonours.length,0);assert.equal(s.owned.includes('3-3'),false);
    assert.equal(r.rewards.coinLines.some(([n,v])=>n==='Champions League runner-up'&&v===75),loseAt==='final');
  }
});

test('standings reconcile every result and use points, goal difference, goals and initial seed',()=>{
  const s=fresh();finish(s);finish(s);finish(s);const c=s.league,table=P.leagueTable(c);
  assert.equal(table.reduce((n,t)=>n+t.points,0),36);assert.ok(table.every(t=>t.played===3));
  assert.equal(table.reduce((n,t)=>n+t.gf,0),table.reduce((n,t)=>n+t.ga,0));assert.equal(table[0].id,0);
  const zero=fresh().league;assert.deepEqual(P.leagueTable(zero).map(t=>t.id),[0,1,2,3,4,5,6,7]);
  for(let i=1;i<table.length;i++){const a=table[i-1],b=table[i];assert.ok(a.points>b.points||a.points===b.points&&(a.gf-a.ga>b.gf-b.ga||a.gf-a.ga===b.gf-b.ga&&(a.gf>b.gf||a.gf===b.gf&&a.id<b.id)));}
});

test('tournament difficulty affects gameplay and ramps in knockouts without changing global settings',()=>{
  const easy=fresh('easy'),hard=fresh('hard');
  const a=new P.Simulation(easy,'league'),b=new P.Simulation(hard,'league');
  assert.equal(a.g.difficulty,'easy');assert.equal(a.g.keeperLevel,'rookie');assert.equal(b.g.difficulty,'hard');assert.equal(b.g.keeperLevel,'elite');
  a.g.a.push(true);b.g.a.push(true);a.next();b.next();assert.equal(a.g.incoming.duration,1.45);assert.equal(b.g.incoming.duration,1.45);assert.ok(a.g.readDuration>b.g.readDuration);
  finish(easy);finish(easy);finish(easy);assert.equal(P.leagueMatch(easy.league).difficulty,'normal');finish(easy);
  assert.equal(P.leagueMatch(easy.league).keeperLevel,'club');assert.equal(easy.settings.difficulty,'normal');
});

test('save migration keeps earlier progress and rejects malformed or out-of-order tournament data',()=>{
  const old=P.fresh();delete old.league;delete old.leagueHonours;old.coins=730;old.career=3;old.equipped.Football='0-1';old.owned.push('0-1');
  const migrated=P.load(old);assert.equal(migrated.coins,730);assert.equal(migrated.career,3);assert.equal(migrated.equipped.Football,'0-1');assert.equal(migrated.league,null);
  const s=fresh();finish(s);finish(s);const good=clone(s.league);assert.ok(P.validLeague(good));
  for(const mutate of [c=>c.results.reverse(),c=>c.results[0].h=-1,c=>c.results[0].away=0,c=>c.results[0].a=c.results[0].h,c=>c.results[1].key=c.results[0].key,c=>c.seed=-1,c=>c.results.pop()]){
    const c=clone(good);mutate(c);assert.equal(P.validLeague(c),false);assert.equal(P.load({...s,league:c}).league,null);
  }
  assert.ok(P.load(s).league);
});

test('a pending shot restores with the same tournament identity, opponent and power',()=>{
  const s=fresh(),sim=new P.Simulation(s,'league');sim.aim(755,185);sim.charge();sim.g.power=.7;sim.release();sim.step(.2);
  const restored=P.Simulation.restore(sim.snapshot());assert.ok(restored);assert.deepEqual(restored.g,sim.g);
  assert.equal(P.leagueMatch(s.league).id,restored.g.id);advance(restored,()=>restored.g.phase==='feedback');
  const bad=sim.snapshot();bad.league.key='F1';assert.equal(P.validSnapshot(bad),false);
});

test('menu entry, choosing difficulty, match start, pausing and reload resume use the actual UI',()=>{
  const h=harness();h.app.navigate('league');assert.equal(h.app.page,'league');
  h.doc.querySelector('#league-level').value='easy';h.click('[data-action="league-new"]');assert.equal(h.app.save.league.difficulty,'easy');
  h.click('[data-action="league-play"]');assert.equal(h.app.sim.g.mode,'league');
  h.event('keydown','Space');h.frames(25);h.event('keyup','Space');h.frames(12);h.app.pause();
  const saved=JSON.parse(h.memory.get('penalty-panic-v1')),again=harness(saved);again.click('[data-action="league"]');again.click('[data-action="league-play"]');
  assert.equal(again.app.paused,true);assert.equal(again.app.sim.g.phase,'kick');assert.equal(again.app.sim.g.id,saved.active.id);
  again.click('[data-action="resume"]');again.frames(120);assert.equal(again.app.sim.g.phase,'feedback');assert.equal(again.app.sim.g.a.length,1);
});

test('three UI wins update the knockout board, play the trophy cutscene and equip the saved prize',()=>{
  const h=harness();h.app.navigate('league');h.doc.querySelector('#league-level').value='normal';h.click('[data-action="league-new"]');
  for(let i=0;i<3;i++){
    uiWin(h);const stored=JSON.parse(h.memory.get('penalty-panic-v1'));assert.equal(stored.active,null);
    assert.equal(stored.league.results.length,[4,6,7][i]);
    if(i===2){assert.equal(h.doc.querySelector('#victory-title').textContent,'CHAMPIONS');h.frames(170);}
    h.click('[data-action="skip-victory"]');assert.equal(h.app.page,'result');h.click('[data-action="league"]');
  }
  assert.equal(h.app.save.leagueHonours.length,1);assert.ok(h.doc.querySelector('#screen').innerHTML.includes('Champions of the night.'));
  h.click('[data-action="trophies"]');assert.equal(h.doc.querySelectorAll('.trophy-case').length,6);
  h.app.shopTab='Player kit';h.app.previewId='3-3';h.app.navigate('shop');h.click('[data-action="item"][data-id="3-3"]');
  assert.equal(h.app.save.equipped['Player kit'],'3-3');assert.equal(h.app.save.club.custom,false);
  const again=harness(JSON.parse(h.memory.get('penalty-panic-v1')));assert.equal(again.app.save.leagueHonours.length,1);assert.equal(again.app.save.equipped['Player kit'],'3-3');
});

test('resetting a campaign requires confirmation, retains money and rejects a stale fixture',()=>{
  const h=harness();h.app.navigate('league');h.click('[data-action="league-new"]');h.click('[data-action="league-play"]');h.app.pause();h.click('[data-action="leave"]');
  const stale=clone(h.app.save.active),id=h.app.save.league.id,balance=h.app.save.coins;
  h.click('[data-action="league"]');h.click('[data-action="league-reset"]');h.click('[data-action="close-dialog"]');assert.equal(h.app.save.league.id,id);
  h.click('[data-action="league-reset"]');h.click('[data-action="confirm-league"]');assert.notEqual(h.app.save.league.id,id);assert.equal(h.app.save.coins,balance);assert.equal(h.app.save.active,null);
  h.app.save.active=stale;h.app.resumeSaved();assert.equal(h.app.page,'league');assert.equal(h.app.sim,null);assert.equal(h.app.save.active,null);
});

test('the trophy kit stays locked until earned, and league club names remain safely escaped',()=>{
  const h=harness();h.app.shopTab='Player kit';h.app.previewId='3-3';h.app.navigate('shop');
  assert.equal(h.doc.querySelector('[data-action="item"][data-id="3-3"]').disabled,true);
  h.app.save.club.name='<img src=x>';h.app.save.club.shortName='<>&';h.app.navigate('league');h.click('[data-action="league-new"]');
  assert.ok(h.doc.querySelector('#screen').innerHTML.includes('&lt;img'));assert.equal(h.doc.querySelector('img'),null);
  h.app.save.club.name='Renamed';h.click('[data-action="league-play"]');assert.equal(h.app.sim.g.team.name,'<img src=x>');
});

test('league graphics, trophy scene and champions kit render at desktop and portrait sizes',()=>{
  const h=harness();h.app.save.league=h.P.createLeague(h.app.save.club,'normal','render-cup',42);
  h.app.start('league');const canvas=h.doc.querySelector('#stadium'),c=canvas.getContext('2d'),fills=[],text=[];
  c.fill=()=>fills.push(c.fillStyle);c.fillText=value=>text.push(value);
  for(const [width,height]of [[1000,620],[360,420]]){
    canvas.getBoundingClientRect=()=>({width,height,left:0,top:0});h.app.renderer.resize();
    h.app.renderer.draw(h.app.sim.g,h.app.save,2);assert.ok(text.includes('CHAMPIONS LEAGUE'));
    const g={...h.app.sim.g,league:{...h.app.sim.g.league,stage:'final'}};h.app.renderer.drawVictory(g,h.app.save,4,true);
  }
  assert.ok(text.includes('CHAMPIONS'));h.app.save.equipped['Player kit']='3-3';h.app.save.club.custom=false;
  h.app.renderer.draw(h.app.sim.g,h.app.save,2);assert.ok(fills.includes('#20385e'));assert.ok(fills.includes('#e9c775'));
});

test('new cups are eight-club single elimination with three wins to the trophy',()=>{
  let s=knockout();assert.equal(s.league.format,'knockout');assert.equal(P.leagueState(s.league).stage,'quarter');
  assert.deepEqual(P.leagueState(s.league).quarter.flatMap(f=>[f.home,f.away]).sort((a,b)=>a-b),[0,1,2,3,4,5,6,7]);
  const phases=[];
  for(let i=0;i<3;i++){
    const g=fullFixture(s);phases.push(g.league.stage);assert.ok(P.validLeague(s.league));assert.ok(P.validResult(s.lastResult));
    assert.equal(s.league.results.length,[4,6,7][i]);s=P.load(JSON.stringify(s));
  }
  assert.deepEqual(phases,['quarter','semi','final']);assert.equal(P.leagueState(s.league).stage,'champion');assert.equal(P.leagueMatch(s.league),null);
  assert.equal(s.leagueHonours.length,1);assert.equal(s.stats.matches,3);assert.ok(s.owned.includes('3-3'));
});

test('one defeat in any knockout round eliminates the player, completes the bracket and pays only once',()=>{
  for(const loseRound of [0,1,2]){
    const s=knockout();for(let i=0;i<loseRound;i++)finish(s);
    const last=finish(s,false),state=P.leagueState(s.league);
    assert.equal(state.stage,'eliminated');assert.equal(state.done,true);assert.ok(state.champion>0);assert.equal(s.league.results.length,7);
    assert.equal(P.leagueMatch(s.league),null);assert.ok(P.validLeague(s.league));assert.ok(last.rewards.coins>=20);
    assert.equal(s.leagueHonours.length,0);assert.equal(s.owned.includes('3-3'),false);
    const coins=s.coins;s.claimed=[];assert.equal(P.reward(s,last.g),null);assert.equal(s.coins,coins);
    assert.equal(last.rewards.coinLines.some(([name])=>name==='Champions League runner-up'),loseRound===2);
    const h=harness(s);h.click('[data-action="league"]');assert.ok(h.doc.querySelector('#screen').innerHTML.includes('YOU ARE ELIMINATED'));
    assert.equal(h.doc.querySelector('[data-action="league-play"]'),null);
  }
});

test('knockout bonuses, difficulty ramps and simulated tied-only penalties follow the new rules',()=>{
  const s=knockout('easy');assert.equal(P.leagueMatch(s.league).difficulty,'easy');
  const q=finish(s);assert.ok(q.rewards.coinLines.some(([name,n])=>name==='Reached the semi-finals'&&n===80));assert.equal(P.leagueMatch(s.league).difficulty,'normal');
  const semi=finish(s);assert.ok(semi.rewards.coinLines.some(([name,n])=>name==='Reached the final'&&n===100));assert.equal(P.leagueMatch(s.league).keeperLevel,'club');
  const f=finish(s);assert.ok(f.rewards.coinLines.some(([name,n])=>name==='Champions League trophy'&&n===350));
  let tied=0,decided=0;
  for(let seed=0;seed<24;seed++){
    const save=knockout('normal',seed);finish(save,false);
    for(const r of save.league.results.filter(r=>r.home!==0&&r.away!==0)){
      assert.ok(r.regulation);
      if(r.regulation[0]===r.regulation[1]){tied++;assert.deepEqual(r.penalties,[r.h,r.a]);assert.notEqual(r.h,r.a);}
      else{decided++;assert.equal(r.penalties,null);assert.deepEqual([r.h,r.a],r.regulation);}
    }
  }
  assert.ok(tied>0);assert.ok(decided>0);
});

test('knockout saves reject invalid brackets and upgrade an unplayed legacy fixture without losing its state',()=>{
  const s=knockout();finish(s);finish(s);assert.ok(P.validLeague(s.league));
  for(const mutate of [c=>c.results.reverse(),c=>c.results[4].home=c.results[4].away,c=>c.results[0].h=c.results[0].a,c=>c.results[1].key='S2',c=>c.results.pop(),c=>c.results[0].regulation=[1,0]]){
    const bad=clone(s.league);mutate(bad);assert.equal(P.validLeague(bad),false);
  }
  const old=fresh();old.coins=777;const sim=new P.Simulation(old,'league',{regulation:true});sim.g.field.elapsed=85;sim.g.field.score=[2,1];old.active=sim.snapshot();
  const loaded=P.load(old);assert.equal(loaded.league.format,'knockout');assert.equal(loaded.active.id,`${old.league.id}/Q1`);assert.equal(loaded.active.league.stage,'quarter');
  assert.equal(loaded.active.field.elapsed,85);assert.deepEqual(loaded.active.field.score,[2,1]);assert.equal(loaded.active.opponent.name,sim.g.opponent.name);assert.equal(loaded.coins,777);
  assert.ok(P.validSnapshot(loaded.active));assert.equal(P.leagueMatch(loaded.league).id,loaded.active.id);
  finish(old);const progressing=P.load(old);assert.equal(progressing.league.format,'five-minute');assert.deepEqual(progressing.league.results,old.league.results);
  const midPens=fresh(),pens=new P.Simulation(midPens,'league',{regulation:true});Object.assign(pens.g.field,{rule:'always',score:[2,0],elapsed:104.99,state:'live'});pens.step(1/60);pens.next();midPens.active=pens.snapshot();
  const preserved=P.load(midPens);assert.equal(preserved.league.format,'five-minute');assert.equal(preserved.active.id,pens.g.id);assert.ok(P.validSnapshot(preserved.active));
});
