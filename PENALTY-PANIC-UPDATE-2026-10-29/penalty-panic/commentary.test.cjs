'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P={...require('./progression.js'),...require('./simulation.js')},{harness}=require('./test-dom.cjs');
const clone=x=>JSON.parse(JSON.stringify(x));
function speech(h){h.eval(`window.spoken=[];window.cancelled=0;window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};window.speechSynthesis={getVoices:()=>[{name:'Cloud',lang:'en-GB',localService:false},{name:'Local',lang:'en-GB',localService:true}],speak(u){spoken.push({text:u.text,volume:u.volume,voice:u.voice.name});},cancel(){cancelled++;}};`);}
function goal(h,team=0,scorer=4){const f=h.app.sim.g.field;P.fieldStart(h.app.sim.g);Object.assign(f.ball,{owner:null,x:team?2:998,y:300,z:2,vx:team?-600:600,vy:0,vz:0,lock:.5,lastTouch:team,lastPlayer:scorer,shot:true});h.frame();return f;}

test('home names persist across opponents, reloads and club edits; each opposing club has its own squad',()=>{
  const s=P.fresh();s.club.shirtName='ACE';s.club.squad[1]='Robin Vale';const loaded=P.load(s),home=P.squadNames(loaded.club),rosters=[];
  assert.equal(home[1],'Robin Vale');assert.equal(home[3],'ACE');assert.equal(new Set(home).size,5);
  const c=P.createCompetition('champions',loaded.club);
  for(let id=1;id<=35;id++){const opponent=P.competitionClub(c,id),names=P.buildRoster(loaded.club,opponent);assert.deepEqual(names.slice(0,5),home);assert.equal(new Set(names).size,10);assert.deepEqual(P.opponentNames(opponent),names.slice(5));rosters.push(names.slice(5).join('|'));}
  assert.equal(new Set(rosters).size,35);loaded.club.home.primary='#112233';assert.deepEqual(P.normalizeClub(loaded.club).squad,home);
  const sim=new P.Simulation(loaded,'match',{regulation:true});assert.deepEqual(P.Simulation.restore(sim.snapshot()).g.roster,sim.g.roster);
  const old=sim.snapshot();delete old.roster;assert.deepEqual(P.Simulation.restore(old).g.roster,sim.g.roster);
  const bad=sim.snapshot();bad.roster[0]='';assert.equal(P.Simulation.restore(bad),null);
});
test('team sheets, selected-player labels and the club page show escaped real player names',()=>{
  const s=P.fresh();s.club.squad[0]='<img onerror=alert(1)>';const h=harness(s);h.app.start('match');
  const html=h.doc.querySelector('#lineups').innerHTML;assert.ok(html.includes('&lt;img'));assert.equal(h.doc.querySelector('#lineups').querySelector('img'),null);assert.ok(html.includes('Theo Brooks'));
  assert.ok(h.doc.querySelector('#selected-player-name'));h.P.fieldSwitch(h.app.sim.g);h.P.UI.updateField(h.app);assert.equal(h.doc.querySelector('#selected-player-name').textContent,h.P.playerName(h.app.sim.g,h.app.sim.g.field.controlled));
  h.app.navigate('club');assert.ok(h.doc.querySelector('#screen').innerHTML.includes('YOUR STARTING FIVE'));assert.ok(h.doc.querySelector('#screen').innerHTML.includes('Jamie Hart')===false);
});
test('an actual goal names the scorer in captions, the celebration and the local spoken commentary',()=>{
  const h=harness();speech(h);h.app.start('match');goal(h,0,4);
  assert.ok(h.doc.querySelector('#commentary-text').textContent.includes('Theo Brooks scores!'));assert.ok(h.eval('spoken.at(-1).text').includes('Theo Brooks'));assert.equal(h.eval('spoken.at(-1).voice'),'Local');
  assert.ok(Math.abs(h.eval('spoken.at(-1).volume')-.48)<1e-9);
  const labels=[];h.app.renderer.ctx.fillText=t=>labels.push(t);h.app.renderer.draw(h.app.sim.g,h.app.save,0);assert.ok(labels.includes('THEO BROOKS'));
  const count=h.eval('spoken.length');h.app.sim.events.push({type:'field-goal',team:0,scorer:4});h.app.process();assert.equal(h.eval('spoken.length'),count);
});
test('opponent goals call the opposing scorer, and own goals do not blame the credited scorer',()=>{
  const h=harness();h.app.start('match');const name=h.P.playerName(h.app.sim.g,9);goal(h,1,9);assert.ok(h.doc.querySelector('#commentary-text').textContent.includes(name+' scores!'));
  h.app.start('match');goal(h,1,2);assert.ok(h.doc.querySelector('#commentary-text').textContent.startsWith('An own goal!'));
});
test('passes, tackles, saves, fouls and shootout outcomes use the correct player identity',()=>{
  const h=harness();h.app.start('match');const g=h.app.sim.g;P.fieldStart(g);h.app.commentary.observe(g);g.time=5;assert.equal(h.app.passField(),true);assert.ok(h.doc.querySelector('#commentary-text').textContent.includes('Alex Mercer plays the pass'));
  g.time=10;g.field.tackles++;g.field.controlled=2;h.app.commentary.observe(g);assert.ok(h.doc.querySelector('#commentary-text').textContent.includes('Kai Morgan wins the ball'));
  g.time=15;g.field.saves[1]++;h.app.commentary.event({type:'field-save',team:1},g);assert.ok(h.doc.querySelector('#commentary-text').textContent.includes(P.playerName(g,5)));
  g.time=20;g.field.foul={kind:'penalty',taker:4};g.field.fouls[1]++;h.app.commentary.event({type:'field-foul'},g);assert.ok(h.doc.querySelector('#commentary-text').textContent.includes('Penalty! Theo Brooks'));
  g.time=25;g.role='keep';g.round=2;h.app.commentary.event({type:'resolved',event:'save'},g);assert.ok(h.doc.querySelector('#commentary-text').textContent.includes('Jamie Hart stops '+P.playerName(g,8)));
});
test('commentary interrupts for goals, throttles routine play and never queues stale speech',()=>{
  const h=harness();speech(h);h.app.start('match');const c=h.app.commentary;
  for(let i=0;i<20;i++)c.line('Passing the ball '+i,1,'pass'+i);assert.equal(h.eval('spoken.length'),1);
  c.clock=5;c.line('A routine pass.',1,'routine');assert.equal(h.eval('spoken.length'),1,'Routine speech is dropped while the intro is still speaking');
  goal(h);assert.equal(h.eval('spoken.length'),2);assert.ok(h.eval('cancelled')>0);h.frames(30);assert.equal(h.eval('spoken.length'),2);
});
test('speech stops on pause, mute, hidden tabs and leaving; resuming does not replay old commentary',()=>{
  const h=harness();speech(h);h.app.start('match');h.app.pause();assert.equal(h.eval('cancelled'),1);const count=h.eval('spoken.length');h.click('[data-action="resume"]');h.frames(2);assert.equal(h.eval('spoken.length'),count);
  goal(h);h.doc.hidden=true;h.doc.emit('visibilitychange');assert.equal(h.app.paused,true);assert.equal(h.app.commentary.utterance,null);h.doc.hidden=false;h.click('[data-action="resume"]');
  h.app.start('match');h.click('[data-action="mute"]');assert.equal(h.app.commentary.utterance,null);assert.equal(h.app.save.settings.mute,true);assert.ok(h.doc.querySelector('#commentary-text').textContent);
  const saved=JSON.parse(h.memory.get('penalty-panic-v1')),reloaded=harness(saved);speech(reloaded);reloaded.click('[data-action="resume-save"]');assert.equal(reloaded.eval('spoken.length'),0);
  h.app.navigate('menu');assert.equal(h.app.commentary.utterance,null);assert.equal(h.doc.querySelector('#commentary').hidden,true);
});
test('commentary settings persist and local captions work without a speech service',()=>{
  const h=harness();h.app.start('match');goal(h);assert.ok(h.doc.querySelector('#commentary-text').textContent);h.app.openDialog('settings');
  const voice=h.doc.querySelector('[data-setting="commentary"]');voice.checked=false;h.doc.emit('change',{target:voice});
  const volume=h.doc.querySelector('[data-setting="commentaryVolume"]');volume.value='.35';h.doc.emit('input',{target:volume});
  const captions=h.doc.querySelector('[data-setting="commentaryCaptions"]');captions.checked=false;h.doc.emit('change',{target:captions});assert.equal(h.doc.querySelector('#commentary').hidden,true);
  const loaded=P.load(JSON.parse(h.memory.get('penalty-panic-v1')));assert.equal(loaded.settings.commentary,false);assert.equal(loaded.settings.commentaryVolume,.35);assert.equal(loaded.settings.commentaryCaptions,false);
  const old=P.fresh();delete old.settings.commentary;delete old.settings.commentaryVolume;delete old.settings.commentaryCaptions;delete old.club.squad;const migrated=P.load(old);assert.equal(migrated.settings.commentary,true);assert.equal(migrated.club.squad.length,5);
  speech(h);h.eval("speechSynthesis.getVoices=()=>[{name:'Remote',lang:'en-US',localService:false}]");h.app.save.settings.commentary=true;h.app.save.settings.commentaryCaptions=true;h.app.commentary.clock=30;h.app.commentary.line('What a save!',4,'fallback');assert.equal(h.eval('spoken.length'),0);assert.equal(h.doc.querySelector('#commentary-text').textContent,'What a save!');
});
test('new matches use 105 active seconds in every competition and still allow the final shot to finish',()=>{
  const s=P.fresh();s.league=P.createLeague(s.club);for(const kind of ['champions','premier'])s.competitions[kind]=P.createCompetition(kind,s.club);
  for(const [mode,kind]of [['match'],['career'],['league'],['competition','champions'],['competition','premier']]){
    const sim=new P.Simulation(s,mode,{kind,regulation:true});assert.equal(P.fieldDuration(sim.g.field),105);assert.ok(P.validSnapshot(sim.g));
  }
  const h=harness();h.app.start('match');assert.ok(h.doc.querySelector('#hud').innerHTML.includes('1:45'));
  const f=h.app.sim.g.field;P.fieldStart(h.app.sim.g);f.elapsed=104.99;Object.assign(f.ball,{owner:null,x:998,y:300,z:3,vx:600,vy:0,vz:0,lock:.5,lastTouch:0,lastPlayer:3,shot:true});f.shotPending=3;h.frame();assert.equal(f.score[0],1);assert.equal(h.app.sim.g.complete,false);
});
test('older five-minute saves migrate proportionally to 1:45 without losing score, names or extra-time state',()=>{
  const s=P.fresh(),sim=new P.Simulation(s,'match',{regulation:true});P.fieldStart(sim.g);const old=sim.snapshot();delete old.roster;delete old.field.regulationDuration;old.field.elapsed=150;old.field.score=[2,1];
  const restored=P.Simulation.restore(old);assert.ok(restored);assert.equal(restored.g.field.elapsed,52.5);assert.equal(P.fieldDuration(restored.g.field),105);assert.deepEqual(restored.g.field.score,[2,1]);assert.equal(restored.g.roster.length,10);assert.ok(P.validSnapshot(restored.g));
  for(const [duration,elapsed,expected]of [[350,325,122.5],[400,375,140]]){const extra=clone(old);extra.field.duration=duration;extra.field.elapsed=elapsed;const r=P.Simulation.restore(extra);assert.ok(r);assert.equal(r.g.field.duration,expected);assert.ok(P.validSnapshot(r.g));}
});
