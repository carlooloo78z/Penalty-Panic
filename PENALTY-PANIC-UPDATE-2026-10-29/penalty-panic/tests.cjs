'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('./progression.js'),S=require('./simulation.js'),SaveStore=require('./storage.js');
const {createServer}=require('./server.cjs');
function runUntil(sim,condition,dt=1/60){for(let i=0;i<3000&&!condition(sim.g);i++)sim.step(dt);assert.ok(condition(sim.g),'Simulation did not reach the expected state');}
function keeperShot(sim,target,dive=true,dt=1/60){sim.g.incoming.target={...target};sim.g.incoming.hint={...target};runUntil(sim,g=>g.phase==='flight',dt);if(dive)sim.dive(target.x,target.y);runUntil(sim,g=>g.phase==='feedback',dt);}
function takeShot(sim,target={x:760,y:185},goal=true,dt=1/60){sim.aim(target.x,target.y);sim.charge();sim.g.power=.65;sim.release();sim.g.dive={x:goal?(target.x<500?755:245):target.x,y:185,started:sim.g.time,duration:.4};runUntil(sim,g=>g.phase==='feedback',dt);}
test('club identity migrates safely without changing existing coins or owned kits',()=>{
  const old=P.fresh();delete old.club;delete old.clubGoals;old.coins=777;old.equipped['Player kit']='3-1';old.owned.push('3-1');
  const migrated=P.load(JSON.stringify(old));assert.equal(migrated.club.name,'Panic FC');assert.equal(migrated.club.custom,false);assert.equal(migrated.coins,777);assert.equal(migrated.equipped['Player kit'],'3-1');
  const club=P.normalizeClub({name:'  River\n City  ',shirtName:'ß'.repeat(30),shortName:'abcdef',number:0,custom:true,crest:'script',activeKit:'away',home:{primary:'red; background:url(x)',secondary:'#AABBCC',pattern:'missing'}});
  assert.equal(club.name,'River City');assert.equal(club.shirtName.length,12);assert.equal(club.shortName,'ABCD');assert.equal(club.number,0);assert.equal(club.home.primary,'#4d91ff');assert.equal(club.home.secondary,'#aabbcc');assert.equal(club.home.pattern,'plain');assert.equal(club.crest,'shield');
  assert.equal(P.normalizeClub({number:Infinity}).number,10);assert.equal(P.normalizeClub(null).name,'Panic FC');
  const saved=P.load(JSON.stringify({...migrated,club,clubGoals:['finisher','finisher','unknown']}));assert.deepEqual(saved.club,club);assert.deepEqual(saved.clubGoals,['finisher']);
});
test('match identity survives a rename, a resume and saved match history',()=>{
  const save=P.fresh();save.club.name='First Team';save.club.custom=true;save.club.number=7;
  const sim=new S.Simulation(save);save.club.name='New Team';save.club.home.primary='#ffffff';
  const resumed=S.Simulation.restore(sim.snapshot());assert.equal(resumed.g.team.name,'First Team');assert.equal(resumed.g.team.home.primary,'#4d91ff');assert.equal(resumed.g.team.number,7);
  const m={...sim.snapshot(),complete:true,result:'loss',score:'0 – 3'};const rewards=P.reward(save,m);save.lastResult={...m,rewards};
  const restored=P.load(JSON.stringify(save));assert.equal(restored.club.name,'New Team');assert.equal(restored.history[0].team.name,'First Team');assert.equal(restored.lastResult.team.name,'First Team');
});
test('club challenges count earlier progress and pay exactly once after a completed run',()=>{
  const save=P.fresh();Object.assign(save.stats,{goals:29,saves:25,wins:10,matches:20});save.career=5;save.rushRecords.normal=3000;
  const before=save.coins;const loaded=P.load(JSON.stringify(save));assert.equal(loaded.coins,before);assert.equal(loaded.clubGoals.length,0);
  const m={...new S.Simulation(loaded).snapshot(),complete:true,result:'loss',score:'1 – 3',goals:1};
  const r=P.reward(loaded,m);assert.equal(r.clubGoals.length,6);assert.equal(loaded.clubGoals.length,6);
  const bonus=r.coinLines.filter(([name])=>name.startsWith('Club challenge:')).reduce((n,[,v])=>n+v,0);assert.equal(bonus,P.clubObjectives.filter(o=>r.clubGoals.includes(o.id)).reduce((n,o)=>n+o.coins,0));
  const state=JSON.stringify(loaded);assert.equal(P.reward(loaded,m),null);assert.equal(JSON.stringify(loaded),state);
  const reloaded=P.load(state);const next={...m,id:'next-club-match'};assert.deepEqual(P.reward(reloaded,next).clubGoals,[]);
  const practice=P.fresh();practice.stats.goals=10;assert.equal(P.reward(practice,{...m,id:'practice',mode:'practice-shoot'}),null);assert.deepEqual(practice.clubGoals,[]);
});
function clubRun(save,options={}){
  const mode=options.mode||'match';
  return {...new S.Simulation(save,mode,{stage:options.stage||0}).snapshot(),complete:true,result:mode==='match'||mode==='career'?'win':'complete',score:'3 – 0',a:[true,true,true],b:[false,false,false],goals:3,saves:3,conceded:0,...options};
}
test('old saves gain free removable accessories without losing existing equipment',()=>{
  const old=P.fresh();old.coins=500;old.owned=old.owned.filter(id=>Number(id.split('-')[0])<8);for(const c of P.categories.slice(8))delete old.equipped[c];old.equipped['Player kit']='3-1';old.owned.push('3-1');
  const save=P.load(JSON.stringify(old));assert.equal(save.coins,500);assert.equal(save.equipped['Player kit'],'3-1');assert.equal(P.items.filter(i=>i.accessory&&i.variant>0).length,15);
  for(const category of P.categories.slice(8)){
    const choices=P.items.filter(i=>i.category===category);assert.equal(choices.length,4);assert.equal(save.equipped[category],choices[0].id);assert.ok(save.owned.includes(choices[1].id));
    const s=P.fresh(),paid=choices[2];assert.ok(P.purchase(s,paid.id));const balance=s.coins;assert.equal(P.purchase(s,paid.id),false);assert.equal(s.coins,balance);assert.equal(P.purchase(s,choices[3].id),false);assert.ok(s.coins>=0);
  }
});
test('shorter keeper arms keep the hands on the dive target without expanding the body',()=>{
  for(const x of [245,500,755])for(const y of [185,320]){
    const sim=new S.Simulation(P.fresh(),'practice-keep');sim.dive(x,y);const pose=S.keeperPose(sim.g,sim.g.dive.duration);
    const centre={x:(pose.hands[0].x+pose.hands[1].x)/2,y:(pose.hands[0].y+pose.hands[1].y)/2};
    assert.ok(Math.abs(centre.x-x)<1e-8);assert.ok(Math.abs(centre.y-y)<1e-8);assert.equal(pose.body.rx,S.readyKeeperPose().body.rx);
    if(x!==500)assert.ok(Math.hypot(centre.x-pose.body.x,centre.y-pose.body.y)/S.G.keeperScale<62,'Hands should stay within a compact reach from the torso');
  }
});
test('the expanded board preserves earned rewards when the original targets increase',()=>{
  const old=P.fresh();old.coins=777;old.stats.goals=10;old.clubGoals=['finisher'];delete old.stats.currentWinStreak;delete old.stats.rushHits;
  const save=P.load(JSON.stringify(old));assert.equal(P.clubObjectives.length,30);assert.equal(save.coins,777);assert.equal(save.stats.currentWinStreak,0);assert.equal(save.stats.rushHits,0);
  const result=P.reward(save,clubRun(save,{result:'loss',goals:0,saves:0}));assert.ok(!result.clubGoals.includes('finisher'));assert.ok(save.clubGoals.includes('finisher'));
  assert.equal(P.clubObjectives.find(o=>o.id==='finisher').target,30);assert.equal(new Set(P.clubObjectives.map(o=>o.id)).size,30);
});
test('skill counters require qualifying wins, both difficulty settings and real saves',()=>{
  const save=P.fresh();
  P.reward(save,clubRun(save,{difficulty:'hard',keeperLevel:'rookie',saves:0,aiMisses:3}));
  assert.equal(save.stats.clinicalWins,1);assert.equal(save.stats.cleanSheetWins,0);assert.equal(save.stats.eliteWins,0);
  P.reward(save,clubRun(save,{difficulty:'normal',keeperLevel:'elite',a:[true,false,true,true],misses:1}));
  assert.equal(save.stats.clinicalWins,1);assert.equal(save.stats.eliteWins,0);
  const win=clubRun(save,{difficulty:'hard',keeperLevel:'elite'});P.reward(save,win);assert.equal(save.stats.eliteWins,1);assert.equal(save.stats.clinicalWins,2);assert.equal(save.stats.cleanSheetWins,2);
  const before=JSON.stringify(save.stats);assert.equal(P.reward(save,win),null);assert.equal(JSON.stringify(save.stats),before);
  P.reward(save,clubRun(save,{result:'loss',difficulty:'hard',keeperLevel:'elite'}));assert.equal(save.stats.eliteWins,1);assert.equal(save.stats.currentWinStreak,0);assert.equal(save.stats.bestWinStreak,3);
  const snapshot=JSON.stringify(save);assert.equal(P.reward(save,clubRun(save,{complete:false})),null);assert.equal(P.reward(save,clubRun(save,{mode:'practice-shoot'})),null);assert.equal(JSON.stringify(save),snapshot);
});
test('comebacks use paired rounds and sudden-death wins require extra kicks',()=>{
  const save=P.fresh();P.reward(save,clubRun(save));assert.equal(save.stats.comebackWins,0);assert.equal(save.stats.suddenDeathWins,0);
  P.reward(save,clubRun(save,{a:[false,true,true,true],b:[true,false,false,false],misses:1,conceded:1}));assert.equal(save.stats.comebackWins,1);
  P.reward(save,clubRun(save,{a:[true,false,true,false,true,true],b:[true,true,false,true,false,false],goals:4,misses:2,conceded:3}));
  assert.equal(save.stats.suddenDeathWins,1);assert.equal(save.stats.comebackWins,2);
  P.reward(save,clubRun(save,{result:'loss',a:[false,true,true],b:[true,true,true],conceded:3}));assert.equal(save.stats.comebackWins,2);
});
test('winning streaks survive other modes and reloads, but a loss breaks the current streak',()=>{
  let save=P.fresh();for(let i=0;i<4;i++)P.reward(save,clubRun(save));
  P.reward(save,clubRun(save,{mode:'challenge',saves:0,goals:0,conceded:10}));assert.equal(save.stats.currentWinStreak,4);
  save=P.load(JSON.stringify(save));const reward=P.reward(save,clubRun(save));assert.ok(reward.clubGoals.includes('five-wins'));assert.equal(save.stats.bestWinStreak,5);
  P.reward(save,clubRun(save,{result:'loss'}));P.reward(save,clubRun(save));assert.equal(save.stats.currentWinStreak,1);assert.equal(save.stats.bestWinStreak,5);
});
test('Hard keeper and Rush challenges cannot be satisfied by easier records',()=>{
  const save=P.fresh(),objective=id=>P.clubObjectives.find(o=>o.id===id);
  save.records.easy=10;save.records.normal=8;save.rushRecords.easy=9000;
  assert.equal(P.objectiveProgress(save,objective('keeper-eight')),8);assert.equal(P.objectiveProgress(save,objective('perfect-wall')),0);assert.equal(P.objectiveProgress(save,objective('hard-rush')),0);
  P.reward(save,clubRun(save,{mode:'challenge',difficulty:'normal',best:10,saves:10,goals:0}));assert.equal(save.stats.hardSaveStreak,0);
  const r=P.reward(save,clubRun(save,{mode:'challenge',difficulty:'hard',best:8,saves:8,conceded:2,goals:0}));assert.ok(r.clubGoals.includes('hard-streak'));assert.ok(!r.clubGoals.includes('perfect-wall'));
  const rush=clubRun(save,{mode:'rush',difficulty:'hard',goals:20,saves:0,rush:{remaining:0,started:true,points:5000,hits:20,combo:20,bestCombo:20}});
  const rr=P.reward(save,rush);assert.ok(rr.clubGoals.includes('hard-rush'));assert.ok(rr.clubGoals.includes('combo-twenty'));assert.equal(save.stats.rushHits,20);assert.equal(save.stats.rushBestCombo,20);
  P.reward(save,rush);assert.equal(save.stats.rushHits,20);assert.equal(P.load(JSON.stringify(save)).stats.rushBestCombo,20);
});
test('defending the crown requires the final career opponent and Elite keeper',()=>{
  const save=P.fresh();save.career=5;
  P.reward(save,clubRun(save,{mode:'match',stage:4,difficulty:'hard',keeperLevel:'elite'}));
  P.reward(save,clubRun(save,{mode:'career',stage:3,difficulty:'hard',keeperLevel:'elite'}));
  P.reward(save,clubRun(save,{mode:'career',stage:4,difficulty:'hard',keeperLevel:'club'}));assert.equal(save.stats.legendWins,0);
  let result;for(let i=0;i<3;i++)result=P.reward(save,clubRun(save,{mode:'career',stage:4,difficulty:'hard',keeperLevel:'elite'}));assert.equal(save.stats.legendWins,3);assert.ok(result.clubGoals.includes('defend-crown'));assert.equal(save.career,5);
});
test('five-kick rules end early only when caught scores are impossible',()=>{assert.equal(P.outcome([true,true,true],[false,false,false]),'win');assert.equal(P.outcome([true,true],[false,false]),null);assert.equal(P.outcome([false,false,false],[true,true,true]),'loss');});
test('sudden death always waits for the paired kick',()=>{const a=[true,false,true,false,true],b=[true,true,false,true,false];assert.equal(P.outcome(a,b),null);assert.equal(P.outcome([...a,true],b),null);assert.equal(P.outcome([...a,true],[...b,true]),null);assert.equal(P.outcome([...a,true,false],[...b,true,true]),'loss');});
test('real simulation completes ten tied kicks and then sudden death',()=>{
  const sim=new S.Simulation(P.fresh(),'match',{seed:42});const pattern=[true,false,true,false,true];
  for(let i=0;i<5;i++){
    takeShot(sim,pattern[i]?{x:760,y:185}:{x:835,y:190});assert.equal(sim.g.a[i],pattern[i]);sim.next();
    keeperShot(sim,{x:755,y:185},!pattern[i]);assert.equal(sim.g.b[i],pattern[i]);assert.equal(sim.g.complete,false);sim.next();
  }
  takeShot(sim);assert.equal(sim.g.complete,false);sim.next();keeperShot(sim,{x:372,y:320});assert.equal(sim.g.complete,true);assert.equal(sim.g.result,'win');assert.equal(sim.g.score,'4 – 3');
});
test('gravity is a parabola and the preview lands exactly at the target',()=>{
  const sim=new S.Simulation(P.fresh(),'practice-shoot');sim.g.aim={x:720,y:185};const shot=S.shotSpec(sim.g,.65),mid=S.trajectory(shot,.5),start=S.trajectory(shot,0),end=S.trajectory(shot,1);
  assert.equal(start.x,S.G.ballX);assert.equal(start.y,S.G.ballY);assert.ok(Math.abs(end.x-shot.target.x)<1e-9);assert.ok(Math.abs(end.y-shot.target.y)<1e-9);
  assert.ok(mid.y<(start.y+end.y)/2);const dt=.01,a=S.trajectory(shot,.5-dt),b=S.trajectory(shot,.5+dt);assert.ok(Math.abs((a.y-2*mid.y+b.y)/(dt*shot.duration)**2-shot.gravity)<1e-6);
  sim.g.shotType='driven';const driven=S.shotSpec(sim.g,.65);assert.ok(driven.duration<shot.duration);assert.ok(driven.gravity*driven.duration**2<shot.gravity*shot.duration**2);
});
test('power drift is deterministic, visible, and accuracy upgrades reduce it',()=>{const sim=new S.Simulation(P.fresh(),'practice-shoot');sim.g.aim={x:740,y:185};let bad=S.shotSpec(sim.g,1);assert.ok(bad.target.x>740);sim.g.attributes.accuracy=5;assert.ok(S.shotSpec(sim.g,1).target.x<bad.target.x);assert.equal(S.shotSpec(sim.g,.65).target.x,740);});
test('flight velocity matches the ball path and the shadow remains on the pitch',()=>{
  const sim=new S.Simulation(P.fresh(),'practice-shoot');sim.g.aim={x:720,y:185};sim.g.curl=1;
  const shot=S.shotSpec(sim.g,.75),dt=.00001;
  for(const t of [.2,.5,.8]){
    const a=S.trajectory(shot,t-dt),b=S.trajectory(shot,t+dt),v=S.flightVelocity(shot,t);
    assert.ok(Math.abs((b.x-a.x)/(2*dt*shot.duration)-v.x)<1e-5);
    assert.ok(Math.abs((b.y-a.y)/(2*dt*shot.duration)-v.y)<1e-5);
    assert.ok(S.trajectory(shot,t).groundY>S.trajectory(shot,t).y);
  }
  assert.equal(S.trajectory(shot,0).groundY,515);assert.equal(S.trajectory(shot,1).groundY,350);
});
test('post and crossbar rebounds reflect incoming momentum and stronger strikes travel farther',()=>{
  const sim=new S.Simulation(P.fresh(),'practice-shoot'),g=sim.g;
  const impact=(target,power)=>{g.shot={...S.shotSpec(g,power),target,started:0};g.event='post';return S.rebound(g,.2);};
  const soft=impact({x:800,y:220},.4),strong=impact({x:800,y:220},.8);
  assert.ok(strong.x<800);assert.ok(strong.groundY>soft.groundY);
  g.shot={...S.shotSpec(g,.8),target:{x:650,y:140},started:0};
  assert.ok(S.flightVelocity(g.shot).y<0);assert.ok(S.rebound(g,.02).y>140);
});
test('impacts begin at the flight endpoint, catches follow the hands, and body blocks deflect',()=>{
  const sim=new S.Simulation(P.fresh(),'practice-shoot'),g=sim.g;
  const h=S.readyKeeperPose().hands[0],target={x:h.x,y:h.y};
  g.shot={...S.shotSpec(g,.65),target,started:0};g.contactTime=g.shot.duration;g.event='save';g.contact={part:'gloves',point:target};
  const end=S.trajectory(g.shot,1),begin=S.rebound(g,0),caught=S.rebound(g,.4),pose=S.keeperPose(g,g.contactTime+.4);
  assert.deepEqual([begin.x,begin.y,begin.r,begin.spin],[end.x,end.y,end.r,end.spin]);
  assert.equal(caught.x,(pose.hands[0].x+pose.hands[1].x)/2);assert.equal(caught.y,(pose.hands[0].y+pose.hands[1].y)/2);
  const away=b=>Math.hypot(b.x-caught.x,b.y-caught.y)>10;
  g.contact.part='body';assert.ok(away(S.rebound(g,.4)));
  g.contact.part='gloves';g.shot.power=.9;assert.ok(away(S.rebound(g,.4)));
});
test('rebound gravity, friction and net bounds bring the ball to rest',()=>{
  const sim=new S.Simulation(P.fresh(),'practice-shoot'),g=sim.g;
  for(const event of ['goal','post','save','wide']){
    g.shot={...S.shotSpec(g,.85),target:{x:event==='post'?800:740,y:185},started:0};g.event=event;g.contact={part:'body',point:{...g.shot.target}};
    const end=S.trajectory(g.shot,1),begin=S.rebound(g,0);
    assert.equal(begin.x,end.x);assert.equal(begin.y,end.y);
    for(let i=1;i<=30;i++){
      const b=S.rebound(g,i*.1);assert.ok(Number.isFinite(b.x+b.y+b.spin));assert.ok(b.y+b.r<=b.groundY+1e-7);
      assert.ok(b.x>=45&&b.x<=955);if(event==='goal')assert.ok(b.x>=S.G.left+16&&b.x<=S.G.right-16);
    }
    const before=S.rebound(g,3.7),after=S.rebound(g,4);assert.ok(Math.hypot(after.x-before.x,after.y-before.y)<3,`${event} kept moving`);
  }
});
test('powerful shots keep gravity but reach high and low targets without dipping',()=>{
  const sim=new S.Simulation(P.fresh(),'practice-shoot');
  for(const type of ['placed','driven'])for(const power of [.65,.75,.82,1])for(const x of [245,755])for(const y of [155,250,320,375]){
    Object.assign(sim.g,{shotType:type,aim:{x,y},curl:0});const shot=S.shotSpec(sim.g,power);
    assert.equal(shot.gravity,S.G.gravity);let previous=S.trajectory(shot,0);
    for(let i=1;i<=100;i++){const p=S.trajectory(shot,i/100);assert.ok(p.y<previous.y,`${type} ${power} at ${x},${y} dipped`);previous=p;}
    assert.ok(Math.abs(previous.x-shot.target.x)<1e-8);assert.ok(Math.abs(previous.y-shot.target.y)<1e-8);
  }
  sim.g.aim={x:740,y:320};sim.g.shotType='placed';
  const soft=S.shotSpec(sim.g,.4),hard=S.shotSpec(sim.g,.75);
  const arc=s=>(S.G.ballY+s.target.y)/2-S.trajectory(s,.5).y;
  assert.ok(hard.duration<soft.duration*.55);assert.ok(arc(hard)<arc(soft)*.3);
  const original=hard.duration;sim.g.attributes.power=5;assert.ok(S.shotSpec(sim.g,.75).duration<original);
});
test('standing keeper blocks an on-body shot without a forced dive',()=>{const sim=new S.Simulation(P.fresh(),'practice-keep');keeperShot(sim,{x:500,y:305},false);assert.equal(sim.g.event,'save');assert.equal(sim.g.contact.part,'body');});
test('relaxed ready hands still save shots at their visible positions',()=>{
  for(const h of S.readyKeeperPose().hands){
    assert.ok(h.y>S.G.keeperY);
    const sim=new S.Simulation(P.fresh(),'practice-keep');keeperShot(sim,{x:h.x,y:h.y},false);
    assert.equal(sim.g.event,'save');assert.equal(sim.g.contact.part,'gloves');
  }
});
test('short and full dives reach high and low shots',()=>{for(const x of [245,372,628,755])for(const y of [185,320]){const sim=new S.Simulation(P.fresh(),'practice-keep');keeperShot(sim,{x,y});assert.equal(sim.g.event,'save',`${x},${y}`);assert.ok(sim.g.contactPose.hands.some(h=>Math.hypot(h.x-x,h.y-y)<=h.r+S.G.ballRadius));}});
test('wrong height and wrong direction fail with actionable feedback',()=>{const sim=new S.Simulation(P.fresh(),'practice-keep');sim.g.incoming.target={x:755,y:185};runUntil(sim,g=>g.phase==='flight');sim.dive(755,320);runUntil(sim,g=>g.phase==='feedback');assert.equal(sim.g.event,'goal');assert.match(sim.g.detail,/Wrong height/);});
test('early dives visibly land, late dives do not teleport',()=>{let sim=new S.Simulation(P.fresh(),'practice-keep');sim.g.difficulty='easy';sim.next();sim.g.incoming.target={x:755,y:185};sim.dive(755,185);runUntil(sim,g=>g.phase==='feedback');assert.equal(sim.g.event,'goal');assert.match(sim.g.detail,/Too early/);sim=new S.Simulation(P.fresh(),'practice-keep');sim.g.incoming.target={x:755,y:185};runUntil(sim,g=>g.phase==='flight'&&g.time-g.shot.started>g.shot.duration-.05);sim.dive(755,185);runUntil(sim,g=>g.phase==='feedback');assert.equal(sim.g.event,'goal');assert.match(sim.g.detail,/Too late/);});
test('fixed-step saves are consistent at 30, 60 and 144 fps',()=>{const results=[];for(const dt of [1/30,1/60,1/144]){const sim=new S.Simulation(P.fresh(),'practice-keep',{seed:100});keeperShot(sim,{x:628,y:320},true,dt);results.push([sim.g.event,sim.g.contactPose.hands[0].x]);}assert.equal(results[0][0],results[1][0]);assert.equal(results[1][0],results[2][0]);assert.ok(Math.abs(results[0][1]-results[2][1])<.01);});
test('dives flow from standing through arm reach and landing without position jumps',()=>{
  for(const x of [245,372,500,628,755])for(const y of [185,320]){
    const sim=new S.Simulation(P.fresh(),'practice-keep'),g=sim.g;
    g.shot={...g.incoming,target:{x,y},started:0};const standing=S.keeperPose(g,0);sim.dive(x,y);
    let previous=S.keeperPose(g,0);assert.ok(previous.body.angle===standing.body.angle);assert.deepEqual({...previous.body,angle:0},standing.body);assert.deepEqual(previous.hands,standing.hands);
    for(let i=1;i<=2000;i++){
      const pose=S.keeperPose(g,i/1000),before=[previous.body,...previous.hands],after=[pose.body,...pose.hands];
      after.forEach((p,j)=>assert.ok(Math.hypot(p.x-before[j].x,p.y-before[j].y)<2,`Dive to ${x},${y} jumps at ${i}ms`));
      assert.ok(Math.abs(pose.angle-previous.angle)<.02);previous=pose;
    }
    assert.equal(previous.state,'grounded');assert.equal(previous.body.y,x===500?S.G.keeperY+6:339);
    const early=S.keeperPose(g,g.dive.duration+.05),later=S.keeperPose(g,g.dive.duration+.3);
    assert.ok(later.body.y>early.body.y,'The keeper should keep descending after extending');
  }
});
test('low dives dip continuously and high dives descend immediately after reaching',()=>{
  for(const x of [245,372,628,755]){
    const low=new S.Simulation(P.fresh(),'practice-keep');low.dive(x,320);
    let lastY=S.G.keeperY;
    for(let i=0;i<=120;i++){
      const pose=S.keeperPose(low.g,i/120*1.1);
      assert.ok(pose.body.y>=lastY-1e-8,'A low dive must not bounce upward');lastY=pose.body.y;
    }
    const high=new S.Simulation(P.fresh(),'practice-keep');high.dive(x,185);
    const end=high.g.dive.duration,reach=S.keeperPose(high.g,end),fall=S.keeperPose(high.g,end+.2),ground=S.keeperPose(high.g,end+.6);
    assert.ok(fall.body.y>reach.body.y+15,'The keeper must fall instead of holding mid-air');
    assert.ok(fall.hands[0].y>reach.hands[0].y+15);
    assert.equal(ground.state,'grounded');assert.ok(Math.abs(ground.angle)>1.45);
  }
});
test('the continuous dive reaches the ball on each difficulty while preserving late-input misses',()=>{
  for(const difficulty of ['easy','normal','hard'])for(const delay of [0,.15,.3]){
    const save=P.fresh();save.settings.difficulty=difficulty;
    const sim=new S.Simulation(save,'practice-keep');sim.g.incoming.target={x:755,y:185};
    runUntil(sim,g=>g.phase==='flight'&&g.time-g.shot.started>=delay);sim.dive(755,185);
    const g=sim.g;assert.ok(Math.abs(g.dive.started+g.dive.duration-(g.shot.started+g.shot.duration-.04))<1e-8);
    runUntil(sim,g=>g.phase==='feedback');assert.equal(g.event,'save',`${difficulty} at ${delay}s`);
  }
});
test('body saves follow the visible rotated torso',()=>{
  const pose={hands:[],body:{x:500,y:300,rx:19,ry:32,angle:Math.PI/2}};
  assert.equal(S.contact({x:535,y:300},pose).part,'body');
  assert.equal(S.contact({x:500,y:335},pose).hit,false);
  pose.body.angle=0;assert.equal(S.contact({x:535,y:300},pose).hit,false);
  assert.equal(S.contact({x:500,y:335},pose).part,'body');
});
test('post and wide results are distinct and tracked',()=>{const sim=new S.Simulation(P.fresh(),'practice-shoot');takeShot(sim,{x:200,y:220});assert.equal(sim.g.event,'post');assert.equal(sim.g.posts,1);sim.next();takeShot(sim,{x:835,y:220});assert.equal(sim.g.event,'wide');assert.equal(sim.g.wide,1);});
test('keeper prediction uses observations and profiles have different reactions',()=>{const o={ball:{x:540,y:430},previous:{x:534,y:440},delta:.04,remaining:.6,hint:{x:650,y:185}};const a=S.predictKeeper(o,P.keeperLevels.rookie,()=>.5,'balanced'),b=S.predictKeeper(o,P.keeperLevels.elite,()=>.5,'balanced');assert.notEqual(a.x,b.x);assert.ok(a.duration>b.duration);assert.ok(P.keeperLevels.rookie.reaction>P.keeperLevels.elite.reaction);});
test('practice can repeat the exact incoming shot and never pays rewards',()=>{const save=P.fresh(),sim=new S.Simulation(save,'practice-keep',{seed:12}),shot=JSON.stringify(sim.g.incoming);runUntil(sim,g=>g.phase==='feedback');sim.next(true);assert.equal(JSON.stringify(sim.g.incoming),shot);sim.g.complete=true;sim.g.result='complete';assert.equal(P.reward(save,sim.g),null);assert.equal(save.coins,120);});
test('shooting drills score the selected target and repeat it on demand',()=>{const sim=new S.Simulation(P.fresh(),'practice-shoot',{seed:3,drill:'high'}),target={...sim.g.drillTarget};assert.equal(target.y,185);takeShot(sim,target);assert.equal(sim.g.drillHits,1);assert.equal(sim.g.drillAttempts,1);sim.next(true);assert.deepEqual(sim.g.drillTarget,target);takeShot(sim,{x:835,y:185});assert.equal(sim.g.drillHits,1);assert.equal(sim.g.drillAttempts,2);});
test('challenge counts saves, concessions and striker misses separately',()=>{const sim=new S.Simulation(P.fresh(),'challenge');for(let i=0;i<10;i++){keeperShot(sim,i<4?{x:372,y:320}:i<8?{x:755,y:185}:{x:830,y:185},i<4);if(i<9)sim.next();}assert.equal(sim.g.complete,true);assert.deepEqual([sim.g.saves,sim.g.conceded,sim.g.aiMisses],[4,4,2]);});
test('completed result rewards are immediate, accurate and idempotent',()=>{
  const save=P.fresh(),sim=new S.Simulation(save,'career',{seed:1});for(let i=0;i<3;i++){takeShot(sim);sim.next();keeperShot(sim,{x:372,y:320});if(i<2)sim.next();}
  assert.equal(sim.g.complete,true);const r=P.reward(save,sim.g);assert.equal(r.coins,20+24+36+60+100+100);assert.equal(save.career,1);assert.ok(save.owned.includes('0-1'));assert.equal(save.coins,120+r.coins);const before=JSON.stringify(save);assert.equal(P.reward(save,sim.g),null);assert.equal(JSON.stringify(save),before);
});
test('challenge records, medals and streak bonuses pay once per run',()=>{const save=P.fresh(),sim=new S.Simulation(save,'challenge');for(let i=0;i<10;i++){keeperShot(sim,{x:372,y:320});if(i<9)sim.next();}const r=P.reward(save,sim.g);assert.equal(r.medal,'Gold');assert.equal(r.personalBest,true);assert.equal(save.records.normal,10);assert.deepEqual(r.coinLines.find(l=>l[0]==='Save streak milestones'),['Save streak milestones',45]);assert.equal(save.stats.matches,0);assert.equal(save.stats.challenges,1);});
test('XP milestones unlock functional cosmetics without repeating grants',()=>{const save=P.fresh();save.xp=245;const m={...new S.Simulation(save).g,complete:true,result:'loss',score:'0 – 3',opponent:{name:'Test'}};const r=P.reward(save,m);assert.ok(save.owned.includes('0-2'));assert.ok(r.cosmetics.includes('Orbit mint'));assert.equal(P.load(JSON.stringify(save)).owned.filter(i=>i==='0-2').length,1);});
test('purchases and upgrades reject duplicates, insufficient coins and invalid keys',()=>{const save=P.fresh();assert.equal(P.purchase(save,'7-1'),false);assert.equal(P.purchase(save,'0-1'),true);assert.equal(P.purchase(save,'0-1'),false);assert.equal(P.purchase(save,'0-2'),false);assert.equal(save.coins,40);assert.equal(P.upgrade(save,'reach'),false);assert.equal(P.upgrade(save,'toString'),false);save.coins=10000;for(let i=0;i<5;i++)assert.equal(P.upgrade(save,'reach'),true);assert.equal(P.upgrade(save,'reach'),false);});
test('v1 saves migrate coins, purchases, equipment, career, settings and upgrades',()=>{const old={version:1,coins:987,xp:510,career:2,owned:['0-0','0-1'],equipped:{Football:'0-1'},upgrades:{reach:3},settings:{keeperLevel:'elite',mute:true},history:[{mode:'match',result:'win',score:'4–3',date:'Yesterday'}]};const d=P.decode(JSON.stringify(old));assert.equal(d.status,'migrated');assert.equal(d.save.coins,987);assert.equal(d.save.equipped.Football,'0-1');assert.equal(d.save.upgrades.reach,3);assert.equal(d.save.settings.keeperLevel,'elite');assert.equal(d.save.history.length,1);assert.ok(d.save.owned.includes('1-2'));});
test('malformed history and prototype difficulty names cannot crash a resumed game',()=>{const s=P.load(JSON.stringify({version:2,coins:-9,history:[{},null,{result:8}],settings:{difficulty:'toString',keeperLevel:'constructor'},upgrades:{reach:999}}));assert.deepEqual(s.history,[]);assert.equal(s.settings.difficulty,'normal');assert.equal(s.settings.keeperLevel,'rookie');assert.equal(s.upgrades.reach,5);assert.doesNotThrow(()=>new S.Simulation(s,'challenge'));});
test('save export/import round trips and unsupported saves are protected',()=>{const memory=new Map(),adapter={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};const store=new SaveStore(adapter);store.data.coins=400;assert.equal(store.write(),true);const exported=store.exportText();store.data.coins=0;store.importText(exported);assert.equal(store.data.coins,400);memory.set(store.key,'{"version":99,"coins":900}');const unsupported=new SaveStore(adapter);assert.equal(unsupported.write(),false);assert.equal(memory.get(store.key),'{"version":99,"coins":900}');assert.throws(()=>store.importText('{broken'));});
test('failed persistence is clearly identified as session-only',()=>{const store=new SaveStore({getItem(){throw Error('disabled');},setItem(){throw Error('full');}});assert.equal(store.write(),false);assert.match(store.label(),/Session only/);});
test('active simulations resume mid-flight without duplicating outcomes',()=>{const sim=new S.Simulation(P.fresh(),'practice-shoot');sim.charge();sim.g.power=.65;sim.release();runUntil(sim,g=>g.phase==='flight'&&g.time-g.shot.started>.1);const restored=S.Simulation.restore(sim.snapshot());assert.ok(restored);runUntil(sim,g=>g.phase==='feedback');runUntil(restored,g=>g.phase==='feedback');assert.equal(restored.g.event,sim.g.event);assert.equal(restored.g.round,1);assert.equal(S.Simulation.restore({schema:2,mode:'match'}),null);});
test('a queued run-up survives reload and launches exactly once at boot contact',()=>{
  const sim=new S.Simulation(P.fresh(),'practice-shoot');sim.charge();sim.g.power=.65;sim.release();const at=sim.g.shot.started;
  assert.equal(at-sim.g.time,S.G.runUp);sim.step(.25);const restored=S.Simulation.restore(sim.snapshot());assert.ok(restored);
  const legacy=sim.snapshot();delete legacy.shot.runUp;assert.ok(S.Simulation.restore(legacy));
  for(const value of [0,-1,Infinity,null,3]){const bad=sim.snapshot();bad.shot.runUp=value;assert.equal(S.Simulation.restore(bad),null);}
  for(const run of [sim,restored]){
    while(run.g.time+S.G.step<at){run.step(S.G.step);assert.equal(run.g.phase,'kick');assert.equal(run.events.filter(e=>e.type==='kick').length,0);}
    run.step(S.G.step);assert.equal(run.g.phase,'flight');assert.ok(run.g.time>=at&&run.g.time<at+S.G.step);
    runUntil(run,g=>g.phase==='feedback');assert.equal(run.events.filter(e=>e.type==='kick').length,1);assert.equal(run.g.round,1);
  }
  assert.equal(restored.g.event,sim.g.event);
});
test('control targets cover full dives, short dives, height and exact pointer positions',()=>{assert.deepEqual(S.keysToTarget(new Set(['KeyS','KeyD'])),{x:755,y:320});assert.deepEqual(S.keysToTarget(new Set(['KeyQ','KeyW'])),{x:372,y:185});assert.deepEqual(S.divePoint(511,267),{x:511,y:267});});
function rushShot(sim,target=sim.g.rush.target){sim.aim(target.x,target.y);sim.charge();sim.g.power=.65;sim.release();runUntil(sim,g=>g.phase==='feedback');}
test('Target Rush waits for the first charge, advances automatically, and scores accurate combos',()=>{
  const sim=new S.Simulation(P.fresh(),'rush',{seed:42});for(let i=0;i<20;i++)sim.step(.25);assert.equal(sim.g.rush.remaining,60);
  for(let i=0;i<3;i++){const old={...sim.g.rush.target};rushShot(sim);assert.equal(sim.g.role,'shoot');assert.equal(sim.g.dive,null);runUntil(sim,g=>g.phase==='aim');assert.notDeepEqual(sim.g.rush.target,old);}
  assert.equal(sim.g.rush.points,400);assert.equal(sim.g.rush.hits,3);assert.equal(sim.g.rush.bestCombo,3);
  rushShot(sim,{x:500,y:250});assert.equal(sim.g.rush.points,410);assert.equal(sim.g.rush.combo,0);
  runUntil(sim,g=>g.phase==='aim');rushShot(sim,{x:835,y:220});assert.equal(sim.g.rush.points,410);assert.equal(sim.g.wide,1);
});
test('Target Rush has real difficulty and smaller targets after successful shots',()=>{
  const easy=P.fresh(),hard=P.fresh();easy.settings.difficulty='easy';hard.settings.difficulty='hard';
  const sim=new S.Simulation(easy,'rush'),tough=new S.Simulation(hard,'rush');assert.ok(sim.g.rush.target.r>tough.g.rush.target.r);
  const radius=sim.g.rush.target.r;for(let i=0;i<5;i++){rushShot(sim);runUntil(sim,g=>g.phase==='aim');}assert.ok(sim.g.rush.target.r<radius);
});
test('the last released rush shot counts after the buzzer, while an unreleased charge does not',()=>{
  let sim=new S.Simulation(P.fresh(),'rush');sim.g.rush.remaining=.01;rushShot(sim);assert.equal(sim.g.complete,true);assert.equal(sim.g.rush.points,100);assert.equal(sim.g.rush.remaining,0);
  assert.equal(sim.events.filter(e=>e.type==='complete').length,1);for(let i=0;i<10;i++)sim.step(.1);assert.equal(sim.events.filter(e=>e.type==='complete').length,1);
  sim=new S.Simulation(P.fresh(),'rush');sim.g.rush.remaining=.01;sim.charge();sim.step(.1);assert.equal(sim.g.complete,true);assert.equal(sim.g.goals,0);assert.equal(sim.g.charging,false);
});
test('rush snapshots preserve the clock and reject malformed target data',()=>{
  const sim=new S.Simulation(P.fresh(),'rush');sim.charge();sim.step(.2);const restored=S.Simulation.restore(sim.snapshot());assert.ok(restored);assert.equal(restored.g.rush.remaining,sim.g.rush.remaining);
  const bad=sim.snapshot();bad.rush.target.r=null;assert.equal(S.Simulation.restore(bad),null);bad.rush.target.r=34;bad.rush.remaining=-1;assert.equal(S.Simulation.restore(bad),null);
});
test('rush rewards and records persist once without counting as a shootout',()=>{
  const save=P.fresh(),sim=new S.Simulation(save,'rush');rushShot(sim);runUntil(sim,g=>g.phase==='aim');sim.g.rush.remaining=.01;rushShot(sim);
  const rewards=P.reward(save,sim.g);assert.ok(rewards.personalBest);assert.deepEqual(rewards.coinLines.find(l=>l[0]==='Target hits'),['Target hits',12]);assert.deepEqual(rewards.coinLines.find(l=>l[0]==='Goals'),['Goals',4]);
  assert.equal(save.stats.rushRuns,1);assert.equal(save.stats.matches,0);assert.equal(save.rushRecords.normal,200);
  save.lastResult={...sim.snapshot(),rewards};assert.ok(P.validResult(save.lastResult));const restored=P.load(JSON.stringify(save));assert.equal(restored.rushRecords.normal,200);assert.equal(restored.lastResult.mode,'rush');
  const coins=save.coins;assert.equal(P.reward(save,sim.g),null);assert.equal(save.coins,coins);
});
test('a complete sixty-second Target Rush ends normally with one final result',()=>{
  const sim=new S.Simulation(P.fresh(),'rush',{seed:7});
  for(let i=0;i<3800&&!sim.g.complete;i++){
    if(sim.g.phase==='aim'){const target=sim.g.rush.target;sim.aim(target.x,target.y);sim.charge();sim.g.power=.65;sim.release();}
    sim.step(1/60);
  }
  assert.equal(sim.g.complete,true);assert.equal(sim.g.rush.remaining,0);assert.ok(sim.g.time>=60-1e-7&&sim.g.time<62);
  assert.ok(sim.g.rush.hits>20);assert.equal(sim.g.result,'complete');assert.equal(sim.events.filter(e=>e.type==='complete').length,1);
});
test('launcher server survives malformed URLs and prevents reading backups',async t=>{const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base=`http://127.0.0.1:${server.address().port}`;assert.equal((await fetch(base+'/%E0%A4%A')).status,400);assert.equal((await fetch(base+'/.backups/before-full-review.zip')).status,403);assert.equal((await fetch(base+'/health')).status,200);assert.equal((await (await fetch(base+'/health')).json()).version,2);assert.equal((await fetch(base+'/')).status,200);});
