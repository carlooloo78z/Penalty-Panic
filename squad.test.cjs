'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P={...require('./progression.js'),...require('./simulation.js')},{harness}=require('./test-dom.cjs'),recorder=require('./qa/canvas-recorder.cjs');
const clone=x=>JSON.parse(JSON.stringify(x));
const edit=(h,key,value)=>{const el=h.doc.querySelector(`[data-club="${key}"]`);assert.ok(el);el.value=value;h.doc.emit('change',{target:el});};
const select=(s,gender)=>s.club=P.normalizeClub({...s.club,playerGender:gender});

test('legacy and damaged squad data migrate safely; switching preserves each saved squad',()=>{
  const legacy=P.fresh();delete legacy.club.playerGender;delete legacy.club.squadGender;delete legacy.club.squads;
  legacy.club.squad[1]='Robin Vale';const s=P.load(legacy);assert.equal(s.club.playerGender,'boys');
  const boys=clone(s.club.squad);select(s,'girls');assert.deepEqual(s.club.squad,[...P.girlsSquad]);
  s.club.squad[1]='Lily Vale';select(s,'boys');assert.deepEqual(s.club.squad,boys);
  select(s,'girls');assert.equal(P.load(s).club.squad[1],'Lily Vale');
  const bad=P.normalizeClub({playerGender:'invalid',squad:'broken',squads:{boys:'wrong',girls:42}});
  assert.equal(bad.playerGender,'boys');assert.deepEqual(bad.squad,[...P.defaultSquad]);
  assert.deepEqual(bad.squads.girls,[...P.girlsSquad]);
});

test('all opposing clubs have stable girl names and distinct squads, while home names remain fixed',()=>{
  const s=P.fresh();select(s,'girls');const c=P.createCompetition('champions',s.club),squads=[];
  for(let id=1;id<=35;id++){
    const club=P.competitionClub(c,id),girls=P.opponentNames(club,'girls'),boys=P.opponentNames(club,'boys');
    assert.equal(new Set(girls).size,5);assert.deepEqual(girls,P.opponentNames(club,'girls'));
    girls.forEach((name,i)=>{assert.notEqual(name.split(' ')[0],boys[i].split(' ')[0]);assert.equal(name.split(' ')[1],boys[i].split(' ')[1]);});
    assert.deepEqual(P.buildRoster(s.club,club),[...P.girlsSquad,...girls]);squads.push(girls.join('|'));
  }
  assert.equal(new Set(squads).size,35);
});

test('My Club previews both options, preserves focus and custom shirt name, and persists the selection',()=>{
  const h=harness();h.app.navigate('club');const input=h.doc.querySelector('[data-club="name"]'),choice=h.doc.querySelector('[data-club="playerGender"]');
  choice.focus();edit(h,'playerGender','girls');assert.equal(h.doc.activeElement,choice);assert.equal(h.doc.querySelector('[data-club="name"]'),input);
  assert.match(h.doc.querySelector('#club-squad').innerHTML,/Sophie Hart/);assert.match(h.doc.querySelector('#squad-preview').getAttribute('aria-label'),/Girls/);
  assert.equal(h.app.save.club.playerGender,'boys','Preview is not a save');
  edit(h,'shirtName','SKYE');h.click('[data-action="save-club"]');assert.equal(h.app.save.club.playerGender,'girls');
  assert.equal(h.P.squadNames(h.app.save.club)[3],'SKYE');
  const reloaded=harness(JSON.parse(h.memory.get('penalty-panic-v1')));assert.equal(reloaded.app.save.club.playerGender,'girls');
  reloaded.app.start('match');assert.equal(reloaded.app.sim.g.roster[0],'Sophie Hart');assert.equal(reloaded.app.sim.g.roster[3],'SKYE');
  reloaded.app.checkpoint();reloaded.app.navigate('club');edit(reloaded,'playerGender','boys');reloaded.click('[data-action="save-club"]');
  assert.equal(reloaded.app.save.club.squad[0],'Jamie Hart');assert.equal(reloaded.app.save.club.shirtName,'SKYE');
  edit(reloaded,'playerGender','girls');reloaded.click('[data-action="save-club"]');assert.equal(reloaded.app.save.club.squad[0],'Sophie Hart');
});

test('saving the preference updates an interrupted match without changing score, clock, positions or rewards',()=>{
  const h=harness();h.app.start('match',{seed:42});h.P.fieldStart(h.app.sim.g);h.frames(30);h.app.checkpoint();
  const field=clone(h.app.save.active.field),id=h.app.save.active.id,coins=h.app.save.coins,xp=h.app.save.xp;
  h.app.navigate('club');edit(h,'playerGender','girls');h.click('[data-action="save-club"]');
  assert.equal(h.app.save.active.team.playerGender,'girls');assert.equal(h.app.save.active.roster[0],'Sophie Hart');
  assert.deepEqual(clone(h.app.save.active.field),field);assert.equal(h.app.save.active.id,id);
  h.app.resumeSaved();assert.equal(h.app.sim.g.team.playerGender,'girls');assert.equal(h.app.sim.g.roster[0],'Sophie Hart');
  assert.match(h.doc.querySelector('#lineups').innerHTML,/Sophie Hart/);assert.equal(h.app.save.coins,coins);assert.equal(h.app.save.xp,xp);
});

test('the current choice applies to all modes and existing competitions, without resetting fixtures',()=>{
  const s=P.fresh();s.competitions.champions=P.createCompetition('champions',s.club,'easy',42,'girls-cl');
  s.competitions.premier=P.createCompetition('premier',s.club,'easy',42,'girls-pl');s.league=P.createLeague(s.club,'easy','legacy',42);
  const campaigns=clone([s.competitions,s.league]);select(s,'girls');
  for(const [mode,options]of [['match',{}],['career',{}],['challenge',{}],['practice-shoot',{}],['practice-keep',{}],['rush',{}],['crossbar',{}],['survival',{}],['competition',{kind:'champions'}],['competition',{kind:'premier'}],['league',{}]]){
    const sim=new P.Simulation(s,mode,options),g=sim.g;assert.equal(g.team.playerGender,'girls',mode);
    assert.deepEqual(g.roster,[...P.girlsSquad,...P.opponentNames(g.opponent,'girls')]);assert.deepEqual(P.Simulation.restore(sim.snapshot()).g.roster,g.roster);
  }
  assert.deepEqual([s.competitions,s.league],campaigns);
});

test('boys and girls have identical shot, keeper, AI and field physics with the same inputs',()=>{
  const boys=P.fresh(),girls=P.fresh();select(girls,'girls');
  const a=new P.Simulation(boys,'match',{seed:77}),b=new P.Simulation(girls,'match',{seed:77});
  for(let kick=0;kick<6;kick++){
    for(const sim of [a,b]){if(sim.g.role==='shoot'){sim.aim(735,198);sim.charge();sim.g.power=.68;sim.release();}else sim.dive(372,320);}
    for(let frame=0;frame<500&&a.g.phase!=='feedback';frame++){a.step(1/120);b.step(1/120);}
    for(const key of ['shot','dive','event','a','b','goals','saves','seed'])assert.deepEqual(a.g[key],b.g[key],key);
    if(a.g.complete)break;a.next();b.next();
  }
  const x=new P.Simulation(boys,'match',{seed:42,regulation:true}),y=new P.Simulation(girls,'match',{seed:42,regulation:true});
  for(const sim of [x,y]){P.fieldStart(sim.g);P.fieldMove(sim.g,1,-.3,true);}
  for(let i=0;i<900;i++){x.step(1/120);y.step(1/120);}assert.deepEqual(x.g.field,y.g.field);assert.deepEqual(x.g.attributes,y.g.attributes);
});

test('shared heads and all ten pitch players use the selected appearance, including diving keepers',()=>{
  const h=harness(),heads=[],original=h.P.drawPlayerHead;h.P.drawPlayerHead=(...args)=>{heads.push({gender:args[5].gender,id:args[6]});return original(...args);};
  select(h.app.save,'girls');h.app.start('match',{seed:42});const g=h.app.sim.g;
  heads.length=0;h.app.renderer.draw(g,h.app.save,0);assert.equal(heads.length,10);assert.ok(heads.every(h=>h.gender==='girls'));assert.equal(new Set(heads.map(h=>h.id)).size,10);
  for(const id of [0,5]){const k=g.field.players[id];k.dive={elapsed:.15,from:{x:k.x,y:k.y},to:{x:k.x+20,y:k.y+40}};}
  heads.length=0;h.app.renderer.draw(g,h.app.save,0);assert.equal(heads.length,10);assert.ok(heads.every(h=>h.gender==='girls'));
  // Exercise the real close-up artwork for front, back and all five hair profiles.
  for(let id=0;id<10;id++)for(const back of [false,true]){
    const boy=recorder(),girl=recorder();original(boy.c,0,0,back,null,{gender:'boys'},id);original(girl.c,0,0,back,null,{gender:'girls'},id);
    assert.notDeepEqual(girl.records,boy.records);assert.ok(girl.records.flatMap(r=>r.points||[]).flat().every(Number.isFinite));
  }
});

test('menus, penalties, keeper drills, celebrations and cosmetic previews render distinct girls artwork',()=>{
  const h=harness(),s=P.fresh();
  function draw(gender,scene){
    select(s,gender);const {c,records}=recorder();c.drawImage=()=>{};const canvas={width:1000,height:620,getContext:()=>c,getBoundingClientRect:()=>({width:1000,height:620})};
    if(scene==='squad')h.P.squadPreview(canvas,s,s.club);
    else if(scene==='headband')h.P.preview(canvas,s,P.items.find(i=>i.category==='Headband'&&i.variant));
    else{const r=new h.P.Renderer(canvas),g=scene==='menu'?null:new P.Simulation(s,scene==='keeper'?'practice-keep':'practice-shoot',{seed:42}).g;
      if(scene==='celebration')r.matchPlayer(500,500,3,{gender,kit:'#4d91ff',variant:0,boots:'#123456'},10,1,3);else r.draw(g,s,0);
    }
    return records.filter(r=>r.kind!=='text');
  }
  for(const scene of ['squad','headband','menu','penalty','keeper','celebration'])assert.notDeepEqual(draw('boys',scene),draw('girls',scene),scene);
});
