'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{penaltyHarness:harness}=require('./test-dom.cjs');

// Play the deciding kick through the real flight, contact, outcome and reward code.
function win(h,mode='match',stage=0){
  h.app.start(mode,{stage,seed:42});const g=h.app.sim.g;
  Object.assign(g,{a:[true,true,true],b:[false,false],goals:3,saves:2,round:5,streak:2,best:2});
  h.app.sim.next();g.incoming.target={x:372,y:320};
  for(let i=0;i<200&&g.phase!=='flight';i++)h.frame();
  h.app.sim.dive(372,320);
  for(let i=0;i<200&&!g.complete;i++)h.frame();
  assert.equal(g.event,'save');assert.equal(g.result,'win');assert.ok(h.app.victory);return g;
}
const money=h=>[h.app.save.coins,h.app.save.xp,h.app.save.claimed.length,h.app.save.stats.wins];

test('a deciding save opens a skippable celebration after the result and rewards are stored',()=>{
  const h=harness(),g=win(h),stored=JSON.parse(h.memory.get('penalty-panic-v1'));
  assert.equal(h.app.page,'game');assert.equal(stored.active,null);assert.equal(stored.lastResult.id,g.id);
  assert.equal(stored.lastResult.result,'win');assert.ok(stored.coins>120);assert.ok(stored.xp>0);
  assert.equal(h.doc.querySelector('#victory-overlay').hidden,false);
  assert.equal(h.doc.querySelector('#hud').hidden,true);assert.equal(h.doc.querySelector('#controls').hidden,true);
  assert.equal(h.doc.activeElement.dataset.action,'skip-victory');assert.equal(h.app.input.active(),false);
  assert.equal(h.doc.querySelector('#victory-score').textContent,g.score);
  const time=g.time;h.frames(45);assert.equal(g.time,time,'The finished match must not keep stepping');
  assert.equal(h.doc.querySelector('#victory-caption').classList.contains('visible'),true);
});

test('Skip works immediately and repeat completion events or result buttons cannot award twice',()=>{
  const h=harness();win(h);const before=money(h),scene=h.app.victory;
  h.app.sim.emit('complete');h.app.process();assert.equal(h.app.victory,scene);assert.deepEqual(money(h),before);
  h.click('[data-action="skip-victory"]');assert.equal(h.app.page,'result');assert.equal(h.app.victory,null);
  assert.equal(h.doc.querySelector('#victory-overlay').hidden,true);assert.equal(h.doc.activeElement.dataset.action,'rematch');
  h.app.finishVictory();h.click('[data-action="skip-victory"]');assert.deepEqual(money(h),before);
});

test('a winning goal celebrates, but a sudden-death goal waits for the opponent paired kick',()=>{
  for(const sudden of [false,true]){
    const h=harness();h.app.start('match',{seed:42});const g=h.app.sim.g;
    Object.assign(g,sudden?{a:Array(5).fill(true),b:Array(5).fill(true),goals:5,conceded:5,round:10}:
      {a:[true,true,true],b:[true,false,false],goals:3,conceded:1,round:6});
    h.app.sim.next();h.app.sim.aim(755,185);h.app.sim.charge();g.power=.65;h.app.sim.release();
    for(let i=0;i<250&&g.phase!=='feedback';i++)h.frame();
    assert.equal(g.event,'goal');
    if(sudden){
      assert.equal(g.complete,false);assert.equal(h.app.victory,null);assert.equal(h.app.save.coins,120);
      h.app.next();g.incoming.target={x:372,y:320};
      for(let i=0;i<200&&g.phase!=='flight';i++)h.frame();h.app.sim.dive(372,320);
      for(let i=0;i<200&&!g.complete;i++)h.frame();
    }
    assert.equal(g.result,'win');assert.ok(h.app.victory);assert.equal(g.score,sudden?'6 \u2013 5':'4 \u2013 1');
  }
});

test('Space, Enter and Escape skip, while repeating a held key does not skip a new scene',()=>{
  for(const code of ['Space','Enter','Escape']){
    const h=harness();win(h);
    h.doc.emit('keydown',{code,repeat:true,target:h.doc.activeElement});assert.ok(h.app.victory);
    h.event('keydown',code,h.doc.activeElement);assert.equal(h.app.page,'result');
    h.event('keyup',code);assert.equal(h.app.sim,null);
  }
});

test('a full celebration ends automatically and rematch restores playable controls',()=>{
  const h=harness();win(h);const before=money(h);h.frames(390);
  assert.equal(h.app.page,'result');assert.deepEqual(money(h),before);
  assert.equal(h.doc.body.classList.contains('celebrating'),false);
  h.click('[data-action="rematch"]');assert.equal(h.app.sim.g.mode,'match');assert.equal(h.app.victory,null);
  assert.equal(h.doc.querySelector('#hud').hidden,false);assert.equal(h.doc.querySelector('#controls').hidden,false);
  assert.equal(h.doc.querySelector('#stadium').getAttribute('tabindex'),'0');
  assert.ok(h.doc.querySelector('#stadium').getAttribute('aria-label').startsWith('Goal aiming'));
  h.event('keydown','Space');h.frames(20);h.event('keyup','Space');assert.equal(h.app.sim.g.phase,'kick');
});

test('pause, visibility and settings freeze the scene and restore focus to Skip',()=>{
  const h=harness();win(h);h.frames(60);const elapsed=h.app.victory.time;
  h.app.pause();h.frames(90);assert.equal(h.app.victory.time,elapsed);
  h.click('[data-action="resume"]');assert.equal(h.doc.activeElement.dataset.action,'skip-victory');h.frame();
  assert.ok(h.app.victory.time>elapsed);
  const settings=h.doc.querySelector('[data-action="settings"]');settings.focus();
  h.event('keydown','Enter',settings);assert.ok(h.app.victory,'Enter on another button must retain its native action');
  settings.click();const paused=h.app.victory.time;h.frames(15);assert.equal(h.app.victory.time,paused);
  h.event('keydown','Escape',h.doc.querySelector('[data-setting="controlPreset"]'));
  assert.ok(h.app.victory);assert.equal(h.app.modal.open,false);
  h.doc.hidden=true;h.doc.emit('visibilitychange');h.frames(30);assert.equal(h.app.victory.time,paused);
  h.doc.hidden=false;h.click('[data-action="resume"]');h.frame();assert.ok(h.app.victory.time>paused);
});

test('reloading during the celebration retains the win without replaying or paying again',()=>{
  const h=harness();win(h);const before=money(h),fresh=harness(JSON.parse(h.memory.get('penalty-panic-v1')));
  assert.equal(fresh.app.page,'menu');assert.equal(fresh.app.victory,null);assert.equal(fresh.app.save.active,null);
  assert.deepEqual(money(fresh),before);fresh.click('[data-action="last-result"]');fresh.frames(60);
  assert.equal(fresh.app.page,'result');assert.equal(fresh.app.victory,null);assert.deepEqual(money(fresh),before);
});

test('reduced motion uses a short still celebration and can be enabled mid-scene',()=>{
  for(const system of [false,true]){
    const h=harness();if(system)h.eval('window.matchMedia=()=>({matches:true})');else h.app.save.settings.reducedMotion=true;
    win(h);assert.equal(h.app.victory.reduced,true);assert.equal(h.app.victory.duration,2);
    const calls=[];h.app.renderer.drawVictory=(g,s,t,reduced)=>calls.push(reduced);h.frames(60);
    assert.ok(calls.length);assert.ok(calls.every(Boolean));h.frames(65);assert.equal(h.app.page,'result');
  }
  const h=harness();win(h);h.frames(90);h.app.openDialog('settings');
  const setting=h.doc.querySelector('[data-setting="reducedMotion"]');setting.checked=true;h.doc.emit('change',{target:setting});
  h.frame();assert.equal(h.app.victory.reduced,true);h.app.closeDialog();h.frames(125);assert.equal(h.app.page,'result');
});

test('career wins preserve club identity, unlock the next stage, and show Champions for the final',()=>{
  const h=harness();h.app.save.club.name='<My Club>';win(h,'career',0);
  assert.equal(h.doc.querySelector('#victory-club').textContent,'<My Club>');assert.equal(h.doc.querySelector('#victory-club').children.length,0);
  assert.equal(h.app.save.career,1);h.click('[data-action="skip-victory"]');h.click('[data-action="next-career"]');
  assert.equal(h.app.sim.g.stage,1);assert.equal(h.app.sim.g.team.name,'<My Club>');
  h.app.save.career=4;win(h,'career',4);assert.equal(h.app.save.career,5);
  assert.equal(h.doc.querySelector('#victory-title').textContent,'CHAMPIONS');
  assert.ok(h.app.save.owned.includes('6-1'));
});

test('losses have normal results, while leaving or restarting a win clears the overlay',()=>{
  const h=harness();h.app.start('match',{seed:42});const g=h.app.sim.g;
  Object.assign(g,{a:[false,false,false],b:[true,true],conceded:2,misses:3,round:5});h.app.sim.next();g.incoming.target={x:245,y:320};
  for(let i=0;i<240&&!g.complete;i++)h.frame();
  assert.equal(g.result,'loss');assert.equal(h.app.victory,null);h.frames(110);assert.equal(h.app.page,'result');
  win(h);h.app.pause();h.click('[data-action="leave"]');assert.equal(h.app.page,'menu');assert.equal(h.app.victory,null);
  win(h);h.app.pause();h.click('[data-action="restart"]');assert.equal(h.app.victory,null);assert.equal(h.app.sim.g.phase,'aim');
  assert.equal(h.doc.querySelector('#victory-overlay').hidden,true);
});

test('celebration rendering honors the match kit, works in both camera sizes and does not mutate saves',()=>{
  const h=harness();h.app.save.club.custom=true;h.app.save.club.home.primary='#bd3481';h.app.save.club.home.secondary='#ecc26a';
  const g=win(h),before=JSON.stringify(g),saved=JSON.stringify(h.app.save),c=h.app.renderer.ctx,fills=[];
  c.fill=()=>fills.push(c.fillStyle);
  for(const [width,height]of [[1000,620],[360,420]]){
    h.doc.querySelector('#stadium').getBoundingClientRect=()=>({width,height,left:0,top:0});h.app.renderer.resize();
    for(const reduced of [false,true])for(const time of [.1,.55,1.5,2.249,2.251,3.5,6.3])h.app.renderer.drawVictory(g,h.app.save,time,reduced);
  }
  assert.ok(fills.includes('#bd3481'));assert.equal(JSON.stringify(g),before);assert.equal(JSON.stringify(h.app.save),saved);
});
