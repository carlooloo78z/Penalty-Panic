'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{penaltyHarness:harness}=require('./test-dom.cjs');
const edit=(h,selector,value)=>{const el=h.doc.querySelector(selector);assert.ok(el,selector);if(el.type==='checkbox')el.checked=value;else el.value=String(value);h.doc.emit('input',{target:el});};
test('the run-up alternates steps, plants the support foot and brings the boot into the ball',()=>{
  const h=harness();h.app.start('practice-shoot');h.app.sim.charge();h.app.sim.release();const g=h.app.sim.g,at=g.shot.started;
  const poseAt=time=>{g.time=time;const motion=h.P.strikerMotion(g);return h.P.strikerPose(motion.kick,motion);};
  const ready=poseAt(0),first=poseAt(.2),second=poseAt(.42),backswing=poseAt(at-.1242),contact=poseAt(at),follow=poseAt(at+.21);
  assert.ok(contact.rig.pelvis.z-ready.rig.pelvis.z>45,'The hips move forward through the approach');
  assert.deepEqual(first.legs[0].foot,ready.legs[0].foot,'The first support foot stays grounded');assert.ok(first.legs[1].foot.y<ready.legs[1].foot.y-10);
  assert.deepEqual(poseAt(.35).legs[1].foot,second.legs[1].foot,'The right step lands before the left strides forward');assert.ok(second.legs[0].foot.y<first.legs[0].foot.y-10);
  assert.ok(backswing.rig.legs[1].foot.y>backswing.rig.legs[1].knee.y,'The heel folds above the knee during the backswing');
  for(const time of [at-.08,at,at+.1,at+.3,at+.55])assert.deepEqual(poseAt(time).legs[0].foot,contact.legs[0].foot,'The support foot must not slide through the kick');
  assert.ok(Math.abs(contact.rig.pelvis.x-contact.rig.legs[0].foot.x)<5,'The body weight stays over the support foot at contact');
  const place=h.P.strikerPlacement();
  assert.ok(Math.abs(place.x+contact.contact.x*place.scale-h.P.G.ballX)<1e-8);
  assert.ok(Math.abs(place.y+contact.contact.y*place.scale-h.P.G.ballY)<1e-8,'The instep reaches the ball at launch');
  const before=poseAt(at-.0001).rig.legs[1].foot.z,after=poseAt(at+.0001).rig.legs[1].foot.z;
  assert.ok((after-before)/.0002>100,'The kicking foot must travel through contact without stopping at the keyframe');
  assert.ok(Math.abs((after-contact.rig.legs[1].foot.z)/.0001-(contact.rig.legs[1].foot.z-before)/.0001)<2,'The swing must not change speed abruptly at contact');
  assert.ok(follow.rig.legs[1].foot.z>contact.rig.legs[1].foot.z+25,'The kicking foot follows forward through the ball');
  assert.equal(poseAt(at+.5).rig.legs[1].foot.y,4.5,'The striking leg lands after the follow-through');
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
  const extended=h.P.strikerPose(.72,{inMatch:true,approach:1}).rig.legs[1];
  assert.ok(distance(extended.hip,extended.foot)>52,'The follow-through extends the leg forward instead of holding a raised knee');
  let previous=ready;for(let i=1;i<=1300;i++){const pose=poseAt(i/1000);assert.ok(Math.hypot(pose.body.x-previous.body.x,pose.body.y-previous.body.y)<.3);
    pose.legs.forEach((leg,j)=>{for(const joint of ['hip','knee','foot'])assert.ok(Math.hypot(leg[joint].x-previous.legs[j][joint].x,leg[joint].y-previous.legs[j][joint].y)<1.5);});
    pose.rig.legs.forEach(leg=>{assert.ok(Math.abs(distance(leg.hip,leg.knee)-29)<1e-8);assert.ok(Math.abs(distance(leg.knee,leg.foot)-28)<1e-8);});
    pose.rig.arms.forEach((arm,j)=>{assert.ok(Math.abs(distance(arm.shoulder,arm.elbow)-17)<1e-8);assert.ok(Math.abs(distance(arm.elbow,arm.hand)-16)<1e-8);assert.ok(distance(arm.hand,previous.rig.arms[j].hand)<1.5);});previous=pose;}
  assert.deepEqual(h.P.strikerPose(0,{time:1,reduced:true}).body,h.P.strikerPose(0,{time:2,reduced:true}).body);
  assert.notEqual(h.P.strikerPose(0,{time:1}).body.y,h.P.strikerPose(0,{time:2}).body.y);
});
test('the opponent winds up before contact and its body pose is continuous when the ball launches',()=>{
  const h=harness();h.app.start('practice-keep');const g=h.app.sim.g,at=g.phaseStart+g.readDuration;
  g.time=at-.1;const windup=h.P.strikerMotion(g);assert.ok(windup.kick>0&&windup.kick<.5);
  g.time=at-.000001;const beforeMotion=h.P.strikerMotion(g),before=h.P.strikerPose(beforeMotion.kick,beforeMotion);
  g.shot={...g.incoming,runUp:g.readDuration,started:at};g.phase='flight';g.phaseStart=at;g.time=at+.000001;const afterMotion=h.P.strikerMotion(g),after=h.P.strikerPose(afterMotion.kick,afterMotion);
  assert.ok(Math.abs(before.body.x-after.body.x)<.001);assert.ok(Math.abs(before.body.angle-after.body.angle)<.001);assert.ok(Math.abs(before.legs[1].foot.x-after.legs[1].foot.x)<.001);
  h.app.pause();const snapshot=JSON.stringify(h.P.strikerMotion(g));h.frames(30);assert.equal(JSON.stringify(h.P.strikerMotion(g)),snapshot);
  g.time=at+.45;const settling=h.P.strikerMotion(g);assert.ok(settling.kick>.9&&settling.kick<1);
  g.time=at+.5;assert.equal(h.P.strikerMotion(g).kick,1);
});
test('pausing a released penalty freezes the run-up and resumes into a single kick',()=>{
  const h=harness();h.app.start('practice-shoot');h.event('keydown','Space');h.frames(25);h.event('keyup','Space');h.frames(12);
  const g=h.app.sim.g;assert.equal(g.phase,'kick');h.app.pause();const before=JSON.stringify(h.P.strikerMotion(g));h.frames(90);assert.equal(JSON.stringify(h.P.strikerMotion(g)),before);
  h.click('[data-action="resume"]');h.frames(40);assert.equal(g.phase,'flight');
  for(let i=0;i<180&&g.phase!=='feedback';i++)h.frame();assert.equal(g.round,1);h.frames(30);assert.equal(g.round,1);
});
test('the full run-up fits the portrait canvas camera',()=>{
  const h=harness(),canvas=h.doc.querySelector('#stadium');canvas.getBoundingClientRect=()=>({left:0,top:0,width:360,height:350});const renderer=new h.P.Renderer(canvas),v=renderer.view;
  h.app.start('practice-shoot');h.app.sim.charge();h.app.sim.release();const g=h.app.sim.g,place=h.P.strikerPlacement();
  for(let time=0;time<1.3;time+=.02){g.time=time;const motion=h.P.strikerMotion(g),pose=h.P.strikerPose(motion.kick,motion);
    for(const foot of pose.legs.map(l=>l.foot)){const x=v.x+(place.x+foot.x*place.scale)*v.scale,y=v.y+(place.y+(foot.y+5)*place.scale)*v.scale;assert.ok(x>0&&x<360&&y>0&&y<350);}
    assert.ok(v.y+(place.y+(pose.head.y-11)*place.scale)*v.scale>0);
  }
});
test('accessories can be equipped, purchased, removed and reloaded through the shop',()=>{
  const h=harness();h.click('[data-action="club"]');edit(h,'[data-club="name"]','Accessory FC');h.click('[data-action="accessories"]');assert.equal(h.app.save.club.name,'Accessory FC');assert.equal(h.app.shopTab,'Headband');
  h.click('[data-action="item"][data-id="8-1"]');assert.equal(h.app.save.equipped.Headband,'8-1');assert.equal(h.app.save.coins,120);
  h.click('[data-action="item"][data-id="8-2"]');assert.equal(h.app.save.coins,50);assert.equal(h.app.save.equipped.Headband,'8-2');assert.equal(h.doc.querySelector('[data-action="item"][data-id="8-3"]').disabled,true);
  const balance=h.app.save.coins;h.click('[data-action="item"][data-id="8-2"]');assert.equal(h.app.save.coins,balance);
  h.click('[data-action="item"][data-id="8-0"]');assert.equal(h.app.save.equipped.Headband,'8-0');h.click('[data-action="item"][data-id="8-2"]');assert.equal(h.app.save.coins,balance);
  const restored=harness(JSON.parse(h.memory.get('penalty-panic-v1')));assert.equal(restored.app.save.equipped.Headband,'8-2');assert.equal(restored.app.save.coins,50);
});
test('every accessory preview and equipped striker/keeper render through the production renderer',()=>{
  const h=harness(),canvas=h.doc.createElement('canvas');canvas.width=300;canvas.height=150;
  for(const item of h.P.items.filter(i=>i.accessory)){h.P.preview(canvas,h.app.save,item);h.app.save.equipped[item.category]=item.id;for(const mode of ['practice-shoot','practice-keep']){h.app.start(mode);h.frame();}}
  const context=h.doc.querySelector('#stadium').getContext('2d'),fills=[];context.fill=()=>fills.push(context.fillStyle);context.stroke=()=>fills.push(context.strokeStyle);
  h.app.save.equipped.Headband='8-3';h.app.save.equipped.Undersleeves='10-2';h.app.start('practice-shoot');h.frame();assert.ok(fills.includes('#f2c65b'));assert.ok(fills.includes('#bdedf1'));
});
test('challenge filters preserve kit drafts and display all 30 objectives by mode',()=>{
  const h=harness();h.click('[data-action="club-challenges"]');assert.equal(h.doc.querySelectorAll('[data-objective]').length,30);
  const input=h.doc.querySelector('[data-club="name"]');edit(h,'[data-club="name"]','Still editing');
  h.click('[data-action="challenge-filter"][data-value="Goalkeeping"]');assert.equal(h.doc.querySelectorAll('[data-objective]').length,5);assert.equal(h.doc.querySelector('[data-club="name"]'),input);assert.equal(h.app.clubDraft.name,'Still editing');assert.equal(h.app.save.club.name,'Panic FC');
  h.click('[data-action="challenge-filter"][data-value="Completed"]');assert.equal(h.doc.querySelectorAll('[data-objective]').length,0);
  h.app.save.clubGoals=['finisher'];h.app.save.stats.goals=10;h.app.navigate('club');assert.equal(h.doc.querySelectorAll('[data-objective]').length,1);assert.ok(h.doc.querySelector('#screen').innerHTML.includes('Previous target completed'));assert.equal(h.doc.querySelector('[data-action="challenge-play"][data-id="finisher"]'),null);
});
test('challenge play buttons select actual difficulty and respect career unlocks',()=>{
  const h=harness();h.click('[data-action="club-challenges"]');h.click('[data-action="challenge-play"][data-id="elite-opposition"]');assert.equal(h.app.sim.g.mode,'match');assert.equal(h.app.sim.g.difficulty,'hard');assert.equal(h.app.sim.g.keeperLevel,'elite');
  h.app.navigate('club');h.click('[data-action="challenge-play"][data-id="hard-rush"]');assert.equal(h.app.sim.g.mode,'rush');assert.equal(h.app.sim.g.difficulty,'hard');assert.equal(h.app.sim.g.rush.target.r,28);
  h.app.navigate('club');h.click('[data-action="challenge-play"][data-id="defend-crown"]');assert.equal(h.app.page,'career');assert.equal(h.app.sim,null);
  h.app.save.career=4;h.app.navigate('club');h.click('[data-action="challenge-play"][data-id="defend-crown"]');assert.equal(h.app.sim.g.stage,4);assert.equal(h.app.sim.g.difficulty,'hard');assert.equal(h.app.sim.g.keeperLevel,'elite');
});
test('club editor saves a free custom kit, starts it in a match and survives reload',()=>{
  const h=harness();h.click('[data-action="club"]');assert.equal(h.app.page,'club');
  edit(h,'[data-club="name"]','Northbridge FC');edit(h,'[data-club="shortName"]','NFC');edit(h,'[data-club="shirtName"]','RIVERA');edit(h,'[data-club="number"]',0);
  h.click('[data-action="club-preset"][data-index="1"]');edit(h,'[data-kit="primary"]','#8c253e');
  assert.equal(h.app.save.club.name,'Panic FC');assert.equal(h.app.clubDraft.custom,true);assert.equal(h.doc.querySelector('#club-name-preview').textContent,'Northbridge FC');
  h.click('[data-action="club-kit"][data-value="away"]');h.click('[data-action="club-preset"][data-index="5"]');
  h.click('[data-action="club-play"]');assert.equal(h.app.page,'game');assert.equal(h.app.sim.g.team.name,'Northbridge FC');assert.equal(h.app.sim.g.team.activeKit,'away');assert.equal(h.app.save.coins,120);
  assert.ok(h.doc.querySelector('#hud').innerHTML.includes('Northbridge FC'));h.frames(2);
  const saved=JSON.parse(h.memory.get('penalty-panic-v1'));const restored=harness(saved);
  assert.equal(restored.app.save.club.number,0);assert.equal(restored.app.save.club.home.primary,'#8c253e');assert.equal(restored.app.save.club.away.primary,'#dbeff1');assert.equal(restored.app.save.club.shirtName,'RIVERA');
  restored.click('[data-action="resume-save"]');assert.equal(restored.app.sim.g.team.name,'Northbridge FC');
});
test('club editor rejects blank names and invalid shirt numbers without writing or losing the draft',()=>{
  const h=harness();h.click('[data-action="club"]');edit(h,'[data-club="name"]','  ');h.click('[data-action="save-club"]');assert.equal(h.app.save.club.name,'Panic FC');assert.ok(h.doc.querySelector('#club-error').textContent);
  edit(h,'[data-club="name"]','My FC');for(const n of ['',100,-1,1.5]){edit(h,'[data-club="number"]',n);h.click('[data-action="club-play"]');assert.equal(h.app.page,'club');assert.equal(h.app.save.club.name,'Panic FC');}
  edit(h,'[data-club="number"]',99);h.click('[data-action="save-club"]');assert.equal(h.app.save.club.name,'My FC');assert.equal(h.app.save.club.number,99);
});
test('locker shirts remain equippable and custom designs can be restored without a purchase',()=>{
  const h=harness();h.click('[data-action="club"]');h.click('[data-action="club-preset"][data-index="3"]');h.click('[data-action="save-club"]');
  h.app.shopTab='Player kit';h.app.previewId='3-0';h.app.navigate('shop');const button=h.doc.querySelector('[data-action="item"][data-id="3-0"]');assert.equal(button.disabled,false);button.click();assert.equal(h.app.save.club.custom,false);assert.equal(h.app.save.club.home.primary,'#202d47');
  h.click('[data-action="club"]');edit(h,'[data-club="custom"]',true);h.click('[data-action="save-club"]');assert.equal(h.app.save.club.custom,true);assert.equal(h.app.save.coins,120);
});
test('club user text stays escaped and every shirt pattern renders for both roles',()=>{
  const h=harness();h.click('[data-action="club"]');edit(h,'[data-club="name"]','<img src=x onerror=1>');edit(h,'[data-club="shortName"]','<>&"');h.click('[data-action="save-club"]');
  assert.ok(h.doc.querySelector('#screen').innerHTML.includes('&lt;img'));assert.equal(h.doc.querySelector('img'),null);
  for(const [pattern]of h.P.kitPatterns){h.app.save.club.custom=true;h.app.save.club.home.pattern=pattern;h.app.save.club.keeper.pattern=pattern;h.app.start('practice-shoot');h.frame();h.app.start('practice-keep');h.frame();}
  h.app.navigate('club');h.click('[data-action="club-kit"][data-value="keeper"]');h.frame();
});
test('all screens and preview types render through the production application',()=>{const h=harness();for(const name of ['menu','career','practice','profile','upgrades','shop']){h.app.navigate(name);h.frame();}for(const category of h.P.categories){h.app.shopTab=category;h.app.previewId=h.P.items.find(i=>i.category===category).id;h.app.navigate('shop');h.frame();}h.app.openDialog('help');h.app.openDialog('settings');assert.equal(h.app.modal.open,true);});
test('aim stays locked when moving from the goal to the shoot button',()=>{const h=harness();h.app.start('practice-shoot');const c=h.doc.querySelector('#stadium');c.emit('pointerdown',{clientX:740,clientY:185});c.emit('pointerup');c.emit('pointermove',{clientX:500,clientY:600});assert.equal(h.app.sim.g.aim.x,740);assert.equal(h.app.sim.g.aim.y,185);assert.equal(h.app.sim.g.aimLocked,true);});
test('restart closes the modal, clears held keys and starts an interactive run',()=>{const h=harness();h.app.start('match');h.event('keydown','ArrowLeft');h.app.pause();assert.equal(h.app.modal.open,true);h.click('[data-action="restart"]');assert.equal(h.app.modal.open,false);assert.equal(h.app.paused,false);assert.equal(h.app.input.keys.size,0);h.event('keydown','Space');h.frames(55);h.event('keyup','Space');h.frames(90);assert.equal(h.app.sim.g.round,1);});
test('Escape works from a focused settings select and restores gameplay focus',()=>{const h=harness();h.app.start('match');h.app.openDialog('settings');const select=h.doc.querySelector('[data-setting="controlPreset"]');select.focus();h.event('keydown','Escape',select);assert.equal(h.app.modal.open,false);assert.equal(h.app.paused,false);assert.equal(h.doc.activeElement.id,'stadium');});
test('chords and short dives retain both key orders, and confirm mode waits for Space',()=>{const h=harness();for(const pair of [['KeyS','KeyD'],['KeyD','KeyS'],['KeyS','KeyQ']]){h.app.start('practice-keep');h.event('keydown',pair[0]);assert.equal(h.app.sim.g.dive,null);h.event('keydown',pair[1]);assert.equal(h.app.sim.g.dive.y,320);assert.equal(h.app.sim.g.dive.x,pair.includes('KeyQ')?372:755);}h.app.save.settings.controlPreset='confirm';h.app.start('practice-keep');h.event('keydown','KeyS');h.event('keydown','KeyE');assert.equal(h.app.sim.g.dive,null);h.event('keyup','KeyS');h.event('keyup','KeyE');h.event('keydown','Space');assert.equal(h.app.sim.g.dive.x,628);});
test('pointer charging belongs to one finger and a second release cannot kick',()=>{const h=harness();h.app.start('practice-shoot');const shoot=h.doc.querySelector('#shoot');h.doc.emit('pointerdown',{target:shoot,pointerId:7});h.frames(20);h.doc.emit('pointerup',{pointerId:8});assert.equal(h.app.sim.g.charging,true);h.doc.emit('pointerup',{pointerId:7});assert.equal(h.app.sim.g.phase,'kick');});
test('keyboard curl updates its visible selector',()=>{const h=harness();h.app.start('practice-shoot');h.event('keydown','KeyE');assert.equal(h.app.sim.g.curl,1);assert.equal(h.doc.querySelector('#curl').value,'1');});
test('the deciding kick saves coins before opening the results screen',()=>{const h=harness();h.app.start('match');const g=h.app.sim.g;g.a=[true,true,true];g.b=[false,false];g.goals=3;h.app.sim.next();g.incoming.target={x:372,y:320};while(g.phase!=='flight')h.frames(1);h.app.sim.dive(372,320);while(!g.complete)h.frames(1);assert.equal(h.app.page,'game');assert.ok(h.app.save.coins>120);const stored=JSON.parse(h.memory.get('penalty-panic-v1'));assert.equal(stored.lastResult.result,'win');assert.equal(stored.active,null);const fresh=harness(stored);assert.equal(fresh.app.save.coins,stored.coins);fresh.click('[data-action="last-result"]');fresh.frame();assert.equal(fresh.app.page,'result');assert.equal(fresh.app.save.coins,stored.coins);});
test('save and resume restores the phase and starts paused',()=>{const h=harness();h.app.start('practice-shoot');h.app.sim.aim(735,190);h.app.checkpoint();h.app.navigate('menu');h.click('[data-action="resume-save"]');assert.equal(h.app.paused,true);assert.equal(h.app.modal.open,true);assert.equal(h.app.sim.g.aim.x,735);h.click('[data-action="resume"]');assert.equal(h.app.paused,false);});
test('shop transactions and upgrades apply through actual click handlers',()=>{const h=harness();h.app.navigate('shop');h.click('[data-action="item"][data-id="0-1"]');assert.equal(h.app.save.coins,40);assert.equal(h.app.save.equipped.Football,'0-1');h.app.save.coins=200;h.app.navigate('upgrades');h.click('[data-action="upgrade"][data-key="reach"]');assert.equal(h.app.save.upgrades.reach,1);assert.equal(h.app.save.coins,110);});
test('gravity flight and feedback render without missing canvas methods',()=>{const h=harness();h.app.start('practice-shoot');h.event('keydown','Space');h.frames(55);h.event('keyup','Space');h.frames(120);assert.equal(h.app.sim.g.phase,'feedback');h.app.repeat();assert.equal(h.app.sim.g.phase,'aim');});
test('Target Rush launches from the menu, pauses its clock, saves results and rematches',()=>{
  const h=harness();h.click('[data-action="rush"]');assert.equal(h.app.sim.g.mode,'rush');h.frames(20);assert.equal(h.app.sim.g.rush.remaining,60);
  h.event('keydown','Space');h.frames(20);h.app.pause();const remaining=h.app.sim.g.rush.remaining;h.frames(40);assert.equal(h.app.sim.g.rush.remaining,remaining);
  h.click('[data-action="resume"]');h.app.sim.g.rush.remaining=.01;h.frames(2);assert.equal(h.app.save.lastResult.mode,'rush');const coins=h.app.save.coins;
  h.frames(110);assert.equal(h.app.page,'result');h.click('[data-action="rematch"]');assert.equal(h.app.sim.g.rush.remaining,60);assert.equal(h.app.save.coins,coins);
});
