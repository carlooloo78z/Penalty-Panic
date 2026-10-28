(function(root) {
  'use strict';
  const D=typeof module!=='undefined'?{...require('./catalog.js'),...require('./field.js'),...require('./tournament.js'),...require('./competitions.js'),...require('./roster.js')}:root.Panic;
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const integer=(n,fallback=0,max=1e9)=>Number.isFinite(n)?clamp(Math.floor(n),0,max):fallback;
  const level=s=>1+Math.floor(s.xp/250);
  const facilityPrice=n=>90+n*60;
  function buyFacility(s,key,expectedLevel){
    if(!Object.hasOwn(D.facilities,key))return false;
    const n=s.facilities[key];
    if(!Number.isInteger(n)||n<0||n>=3||n!==expectedLevel||s.coins<facilityPrice(n))return false;
    s.coins-=facilityPrice(n);s.facilities[key]++;return true;
  }
  const title=s=>s.career>=5?'Penalty legend':level(s)>=8?'All-star specialist':level(s)>=5?'Spot specialist':level(s)>=3?'Club prospect':'Rookie specialist';
  const cleanText=(v,fallback,max)=>typeof v==='string'?Array.from(v.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,'').replace(/\s+/g,' ').trim()).slice(0,max).join('')||fallback:fallback;
  function normalizeClub(value={}) {
    const d=value&&typeof value==='object'?value:{};
    const defaults={home:{primary:'#4d91ff',secondary:'#f3f5ee',pattern:'plain'},away:{primary:'#f3f5ee',secondary:'#254d85',pattern:'sash'},keeper:{primary:'#56844f',secondary:'#f6df86',pattern:'halves'}};
    const club={name:cleanText(d.name,'Panic FC',24),shortName:cleanText(typeof d.shortName==='string'?d.shortName.toUpperCase():null,'PFC',4),shirtName:cleanText(typeof d.shirtName==='string'?d.shirtName.toUpperCase():null,'PANIC',12),number:integer(d.number,10,99),crest:['shield','round','diamond'].includes(d.crest)?d.crest:'shield',custom:d.custom===true,activeKit:d.activeKit==='away'?'away':'home'};
    for(const key of ['home','away','keeper']) {
      const k=d[key]||{},base=defaults[key];
      club[key]={primary:/^#[\da-f]{6}$/i.test(k.primary)?k.primary.toLowerCase():base.primary,secondary:/^#[\da-f]{6}$/i.test(k.secondary)?k.secondary.toLowerCase():base.secondary,pattern:D.kitPatterns.some(([p])=>p===k.pattern)?k.pattern:base.pattern};
    }
    club.playerGender=D.playerGender(d);
    club.squads={boys:D.squadNames({...d,shirtName:club.shirtName},'boys'),girls:D.squadNames({...d,shirtName:club.shirtName},'girls')};
    club.squadGender=club.playerGender;club.squad=[...club.squads[club.playerGender]];return club;
  }
  function objectiveProgress(s,objective) {
    const ranks=['easy','normal','hard'],allowed=ranks.slice(Math.max(0,ranks.indexOf(objective.minimumDifficulty)));
    const records=objective.stat==='rush'?s.rushRecords:s.records;
    const value=['rush','keeperRecord'].includes(objective.stat)?Math.max(...allowed.map(d=>records[d]||0)):objective.stat==='career'?s.career:s.stats[objective.stat]||0;
    return Math.min(objective.target,value);
  }
  function recordClubRun(s,m) {
    const stats=s.stats,shootout=['match','career','league','competition'].includes(m.mode),win=m.result==='win';
    if(shootout){
      stats.currentWinStreak=win?stats.currentWinStreak+1:0;
      stats.bestWinStreak=Math.max(stats.bestWinStreak,stats.currentWinStreak);
      if(win){
        const a=Array.isArray(m.a)?m.a:[],b=Array.isArray(m.b)?m.b:[];
        if(a.length>=3&&a.every(v=>v===true))stats.clinicalWins++;
        if(m.conceded+(m.field?.score[1]||0)===0&&m.saves>=3)stats.cleanSheetWins++;
        if(m.difficulty==='hard'&&m.keeperLevel==='elite')stats.eliteWins++;
        if(a.length>5&&a.length===b.length)stats.suddenDeathWins++;
        let ours=m.field?.score[0]||0,theirs=m.field?.score[1]||0,trailed=ours<theirs;
        for(let i=0;i<Math.min(a.length,b.length);i++){ours+=Number(a[i]===true);theirs+=Number(b[i]===true);if(ours<theirs)trailed=true;}
        if(trailed)stats.comebackWins++;
        if(m.mode==='career'&&m.stage===D.stages.length-1&&m.difficulty==='hard'&&m.keeperLevel==='elite')stats.legendWins++;
      }
    }
    if(m.mode==='challenge'&&m.difficulty==='hard')stats.hardSaveStreak=Math.max(stats.hardSaveStreak,m.best);
    if(m.mode==='rush'){stats.rushHits+=m.rush.hits;stats.rushBestCombo=Math.max(stats.rushBestCombo,m.rush.bestCombo);}
    if(m.mode==='crossbar'){
      stats.barHits+=m.crossbar.hits;stats.barPrecisionBest=Math.max(stats.barPrecisionBest,m.crossbar.precision);stats.barBestCombo=Math.max(stats.barBestCombo,m.crossbar.bestCombo);
      if(m.difficulty==='hard')stats.barHardBest=Math.max(stats.barHardBest,m.crossbar.points);
    }
    if(m.mode==='survival'){
      stats.survivalBest=Math.max(stats.survivalBest,m.saves);
      if(m.difficulty==='hard')stats.survivalHardBest=Math.max(stats.survivalHardBest,m.saves);
    }
  }
  function fresh() {
    return {version:2,coins:120,xp:0,career:0,history:[],achievements:[],claimed:[],levelRewards:[],club:normalizeClub(),clubGoals:[],league:null,leagueHonours:[],competitions:{champions:null,premier:null},competitionHonours:[],facilities:{passing:0,fitness:0,keeping:0},
      stats:{matches:0,wins:0,goals:0,saves:0,best:0,shootingAttempts:0,keeperAttempts:0,challenges:0,rushRuns:0,clinicalWins:0,cleanSheetWins:0,eliteWins:0,suddenDeathWins:0,comebackWins:0,currentWinStreak:0,bestWinStreak:0,hardSaveStreak:0,rushBestCombo:0,rushHits:0,legendWins:0,crossbarRuns:0,barHits:0,barPrecisionBest:0,barBestCombo:0,barHardBest:0,survivalRuns:0,survivalBest:0,survivalHardBest:0},records:{easy:0,normal:0,hard:0},rushRecords:{easy:0,normal:0,hard:0},crossbarRecords:{easy:0,normal:0,hard:0},survivalRecords:{easy:0,normal:0,hard:0},
      owned:D.items.filter(i=>!i.price&&!i.level&&!i.unlock).map(i=>i.id),equipped:Object.fromEntries(D.categories.map((c,i)=>[c,`${i}-0`])),upgrades:Object.fromEntries(Object.keys(D.upgrades).map(k=>[k,0])),
      settings:{master:.6,sfx:.7,commentaryVolume:.8,commentary:true,commentaryCaptions:true,mute:false,difficulty:'normal',keeperLevel:'rookie',targets:true,assistance:'exact',controlPreset:'chords',reducedMotion:false,autoAdvance:false,trainingSpeed:1,penaltyRule:'tied',matchAssists:true},tutorialDone:false,active:null,lastResult:null};
  }
  function decode(raw) {
    const s=fresh();if(!raw)return {save:s,status:'new'};
    let d;try{d=typeof raw==='string'?JSON.parse(raw):raw;}catch{return {save:s,status:'invalid'};}
    if(!d||typeof d!=='object')return {save:s,status:'invalid'};
    if(![0,1,2].includes(d.version))return {save:s,status:'unsupported'};
    s.coins=integer(d.coins,120);s.xp=integer(d.xp);s.career=integer(d.career,0,D.stages.length);
    s.club=normalizeClub(d.club);
    for(const kind of ['champions','premier'])if(D.validCompetition(d.competitions?.[kind])&&d.competitions[kind].kind===kind)s.competitions[kind]={...d.competitions[kind],team:normalizeClub(d.competitions[kind].team)};
    s.competitionHonours=Array.isArray(d.competitionHonours)?d.competitionHonours.filter((h,i,a)=>h&&['champions','premier'].includes(h.kind)&&typeof h.id==='string'&&h.id.length<=80&&typeof h.date==='string'&&a.findIndex(x=>x?.id===h.id)===i).slice(-50).map(h=>({id:h.id,kind:h.kind,date:h.date.slice(0,40),team:normalizeClub(h.team)})):[];
    for(const key of Object.keys(D.facilities))s.facilities[key]=integer(d.facilities?.[key],0,3);
    if(D.validLeague(d.league))s.league={...d.league,team:normalizeClub(d.league.team)};
    const inLegacyShootout=d.active?.mode==='league'&&d.active.league?.id===s.league?.id&&(!d.active.field||d.active.field.pensStarted);
    const convertUnplayed=s.league&&s.league.format!=='knockout'&&s.league.results.length===0&&!inLegacyShootout;
    if(convertUnplayed)s.league.format='knockout';
    s.leagueHonours=Array.isArray(d.leagueHonours)?d.leagueHonours.filter((h,i,a)=>h&&typeof h.id==='string'&&h.id.length<=80&&a.findIndex(x=>x?.id===h.id)===i&&['easy','normal','hard'].includes(h.difficulty)&&typeof h.score==='string'&&h.score.length<40).slice(-50).map(h=>({id:h.id,difficulty:h.difficulty,score:h.score,date:typeof h.date==='string'?h.date.slice(0,40):'',team:normalizeClub(h.team)})):[];
    s.clubGoals=Array.isArray(d.clubGoals)?[...new Set(d.clubGoals.filter(id=>D.clubObjectives.some(o=>o.id===id)))]:[];
    for(const k of Object.keys(s.stats))s.stats[k]=integer(d.stats?.[k]);
    for(const k of Object.keys(s.records))s.records[k]=integer(d.records?.[k],0,10);
    for(const k of Object.keys(s.rushRecords))s.rushRecords[k]=integer(d.rushRecords?.[k]);
    for(const mode of ['crossbarRecords','survivalRecords'])for(const k of Object.keys(s[mode]))s[mode][k]=integer(d[mode]?.[k]);
    s.claimed=Array.isArray(d.claimed)?[...new Set(d.claimed.filter(x=>typeof x==='string'&&x.length<120))].slice(-500):[];
    s.achievements=Array.isArray(d.achievements)?[...new Set(d.achievements.filter(x=>D.achievements.some(a=>a[0]===x)))]:[];
    s.owned=[...new Set([...s.owned,...(Array.isArray(d.owned)?d.owned.filter(id=>D.items.some(i=>i.id===id)):[])])];
    for(const c of D.categories)if(s.owned.includes(d.equipped?.[c])&&D.items.some(i=>i.id===d.equipped[c]&&i.category===c))s.equipped[c]=d.equipped[c];
    for(const k of Object.keys(s.upgrades))s.upgrades[k]=integer(d.upgrades?.[k],0,5);
    for(const k of ['master','sfx','commentaryVolume'])if(Number.isFinite(d.settings?.[k]))s.settings[k]=clamp(d.settings[k],0,1);
    for(const k of ['mute','targets','reducedMotion','autoAdvance','matchAssists','commentary','commentaryCaptions'])if(typeof d.settings?.[k]==='boolean')s.settings[k]=d.settings[k];
    for(const [k,choices]of Object.entries({difficulty:Object.keys(D.difficulties),keeperLevel:Object.keys(D.keeperLevels),assistance:['exact','direction','off'],controlPreset:['chords','confirm'],trainingSpeed:[.65,.85,1]}))if(choices.includes(d.settings?.[k]))s.settings[k]=d.settings[k];
    s.tutorialDone=d.tutorialDone===true;
    // All new matches use tied-only penalties; completed results keep their recorded rule.
    s.history=Array.isArray(d.history)?d.history.filter(h=>h&&['win','loss','draw','complete'].includes(h.result)&&typeof h.mode==='string'&&typeof h.score==='string').slice(0,20).map(h=>({mode:h.mode.slice(0,30),result:h.result,score:h.score.slice(0,40),date:typeof h.date==='string'?h.date.slice(0,40):'',opponent:typeof h.opponent==='string'?h.opponent.slice(0,40):'Panic FC',difficulty:Object.hasOwn(D.difficulties,h.difficulty)?h.difficulty:'normal',keeperLevel:Object.hasOwn(D.keeperLevels,h.keeperLevel)?h.keeperLevel:'rookie',team:normalizeClub(h.team||s.club)})):[];
    if(d.version===2&&d.active&&typeof d.active==='object')s.active=d.active;
    if(convertUnplayed&&s.active?.mode==='league'&&s.active.league?.id===s.league.id&&s.active.league.key==='L1-0'){
      s.active={...s.active,id:`${s.league.id}/Q1`,league:{id:s.league.id,key:'Q1',stage:'quarter',label:'QUARTER-FINAL'}};
    }
    if(d.version===2&&validResult(d.lastResult))s.lastResult={...d.lastResult,team:normalizeClub(d.lastResult.team||s.club)};
    s.levelRewards=Array.isArray(d.levelRewards)?d.levelRewards.filter(x=>D.items.some(i=>i.level&&i.id===x)):[];
    unlockLevels(s);return {save:s,status:d.version===2?'loaded':'migrated'};
  }
  const load=raw=>decode(raw).save;
  function validResult(r) {
    if(!r||typeof r.id!=='string'||!['win','loss','draw','complete'].includes(r.result)||typeof r.score!=='string'||!r.rewards||!r.opponent||typeof r.opponent.name!=='string')return false;
    if(!['match','career','league','competition','challenge','rush','crossbar','survival'].includes(r.mode)||!Object.hasOwn(D.difficulties,r.difficulty)||!Object.hasOwn(D.keeperLevels,r.keeperLevel)||!D.validArcade(r)||!D.validLeagueTag(r)||!D.validCompetitionTag(r))return false;
    if(r.field&&(!D.validField(r.field)||!r.field.finished))return false;
    if(r.mode==='rush'&&(!r.rush||['points','hits','combo','bestCombo'].some(k=>!Number.isInteger(r.rush[k])||r.rush[k]<0)))return false;
    if(['stage','goals','saves','misses','conceded','aiMisses','blocked','wide','posts','best'].some(k=>!Number.isFinite(r[k])||r[k]<0))return false;
    const reward=r.rewards;
    if(['coins','xp','beforeLevel','afterLevel','beforeXp'].some(k=>!Number.isFinite(reward[k])||reward[k]<0))return false;
    if(['unlocked','cosmetics'].some(k=>!Array.isArray(reward[k])||reward[k].some(v=>typeof v!=='string')))return false;
    if(reward.clubGoals!==undefined&&(!Array.isArray(reward.clubGoals)||reward.clubGoals.some(id=>!D.clubObjectives.some(o=>o.id===id))))return false;
    if(['coinLines','xpLines'].some(k=>!Array.isArray(reward[k])||reward[k].some(v=>!Array.isArray(v)||typeof v[0]!=='string'||!Number.isFinite(v[1])||v[1]<0)))return false;
    return reward.medal==null||['Gold','Silver','Bronze','Keep training'].includes(reward.medal);
  }
  function unlockLevels(s) {
    const unlocked=[];
    for(const item of D.items.filter(i=>i.level&&i.level<=level(s))){if(!s.owned.includes(item.id)){s.owned.push(item.id);unlocked.push(item.name);}if(!s.levelRewards.includes(item.id))s.levelRewards.push(item.id);}
    return unlocked;
  }
  function outcome(a,b) {
    const n=a.length,m=b.length,as=a.filter(Boolean).length,bs=b.filter(Boolean).length;
    if(n<=5&&m<=5){if(as>bs+5-m)return 'win';if(bs>as+5-n)return 'loss';}
    if(n>=5&&m>=5&&n===m&&as!==bs)return as>bs?'win':'loss';return null;
  }
  function matchOutcome(g){
    if(!g.field||g.field.rule==='tied')return outcome(g.a,g.b);
    const [a,b]=D.matchScores(g),n=g.a.length,m=g.b.length;
    if(n<=5&&m<=5){if(a>b+5-m)return 'win';if(b>a+5-n)return 'loss';}
    if(n>=5&&m>=5&&n===m&&a!==b)return a>b?'win':'loss';return null;
  }
  function matchPressure(g){
    if(!g.field)return pressure(g.a,g.b,g.role);
    if(g.a.length>=5&&g.b.length>=5)return 'SUDDEN DEATH · TOTAL SCORE DECIDES';
    if(g.role==='shoot'&&matchOutcome({...g,a:[...g.a,true]})==='win')return 'SCORE TO WIN · TOTAL SCORE';
    if(g.role==='keep'&&matchOutcome({...g,b:[...g.b,true]})==='loss')return 'SAVE TO STAY IN · TOTAL SCORE';
    return `PENALTY ${Math.min(5,(g.role==='shoot'?g.a.length:g.b.length)+1)} OF 5 · ${g.field.rule==='always'?'TOTAL SCORE':'SHOOTOUT'}`;
  }
  function pressure(a,b,role) {
    if(a.length>=5&&b.length>=5)return 'SUDDEN DEATH · EVERY KICK COUNTS';
    if(role==='shoot'&&outcome([...a,true],b)==='win')return 'SCORE TO WIN';
    if(role==='keep'&&outcome(a,[...b,true])==='loss')return 'SAVE TO STAY IN';
    if(role==='keep'&&outcome(a,[...b,false])==='win')return 'SAVE TO WIN';
    return `KICK ${Math.min(5,(role==='shoot'?a.length:b.length)+1)} OF 5`;
  }
  function purchase(s,id) {
    const item=D.items.find(i=>i.id===id);
    if(!item||item.level||item.unlock||s.owned.includes(id)||s.coins<item.price)return false;
    s.coins-=item.price;s.owned.push(id);return true;
  }
  const upgradePrice=n=>90+n*65;
  function upgrade(s,key) {
    if(!Object.hasOwn(D.upgrades,key)||s.upgrades[key]>=5||s.coins<upgradePrice(s.upgrades[key]))return false;
    s.coins-=upgradePrice(s.upgrades[key]);s.upgrades[key]++;return true;
  }
  function reward(s,m) {
    if(!m.complete||m.mode.startsWith('practice')||m.mode==='tutorial'||s.claimed.includes(m.id)||!D.validArcade(m)||!D.validLeagueTag(m))return null;
    if(m.field&&(!D.validField(m.field)||!m.field.finished))return null;
    if(!D.validCompetitionTag(m))return null;
    const competition=m.mode==='competition'?D.applyCompetitionResult(s.competitions[m.competition.kind],m):null;
    if(m.mode==='competition'&&!competition)return null;
    const league=m.mode==='league'?D.applyLeagueResult(s.league,m):null;
    if(m.mode==='league'&&!league)return null;
    const beforeLevel=level(s),beforeXp=s.xp,win=m.result==='win',challenge=m.mode==='challenge',rush=m.mode==='rush',crossbar=m.mode==='crossbar',survival=m.mode==='survival';
    const coinLines=[['Run completed',20],['Goals',m.goals*(crossbar?0:rush?2:8)],['Saves',m.saves*12]],xpLines=[['Run completed',35],['Goals',m.goals*(crossbar?0:rush?4:12)],['Saves',m.saves*16]];
    if(m.field){coinLines.push(['Match goals',m.field.score[0]*8]);xpLines.push(['Match played',50],['Match goals',m.field.score[0]*12]);}
    if(m.field?.manualSaves){coinLines.push(['Your goalkeeper saves',m.field.manualSaves*12]);xpLines.push(['Your goalkeeper saves',m.field.manualSaves*16]);s.stats.saves+=m.field.manualSaves;}
    if(m.field?.manualAttempts)s.stats.keeperAttempts+=m.field.manualAttempts;
    if(win){coinLines.push([m.field?'Match victory':'Shootout victory',60]);xpLines.push([m.field?'Match victory':'Shootout victory',65]);}
    if(challenge||survival){s.stats[survival?'survivalRuns':'challenges']++;const milestones=Math.floor(m.best/3);if(milestones){coinLines.push(['Save streak milestones',milestones*15]);xpLines.push(['Save streak milestones',milestones*10]);}}
    else if(rush){s.stats.rushRuns++;coinLines.push(['Target hits',m.rush.hits*6]);xpLines.push(['Target hits',m.rush.hits*12]);}
    else if(crossbar){s.stats.crossbarRuns++;coinLines.push(['Crossbar hits',m.crossbar.hits*4],['Gold-zone bonuses',m.crossbar.precision*8]);xpLines.push(['Crossbar hits',m.crossbar.hits*8],['Gold-zone bonuses',m.crossbar.precision*12]);}
    else{s.stats.matches++;s.stats.wins+=Number(win);}
    s.stats.goals+=(crossbar?0:m.goals)+(m.field?.score[0]||0);s.stats.saves+=m.saves;s.stats.best=Math.max(s.stats.best,m.best);
    if(!crossbar)s.stats.shootingAttempts+=m.goals+m.misses;s.stats.keeperAttempts+=m.saves+m.conceded+m.aiMisses;
    recordClubRun(s,m);
    const personalBest=crossbar?m.crossbar.points>s.crossbarRecords[m.difficulty]:survival?m.saves>s.survivalRecords[m.difficulty]:rush?m.rush.points>s.rushRecords[m.difficulty]:challenge&&m.saves>s.records[m.difficulty];if(challenge)s.records[m.difficulty]=Math.max(s.records[m.difficulty],m.saves);
    if(rush)s.rushRecords[m.difficulty]=Math.max(s.rushRecords[m.difficulty],m.rush.points);
    if(crossbar)s.crossbarRecords[m.difficulty]=Math.max(s.crossbarRecords[m.difficulty],m.crossbar.points);
    if(survival)s.survivalRecords[m.difficulty]=Math.max(s.survivalRecords[m.difficulty],m.saves);
    let bonus=0,cosmetics=[];
    if(competition){
      coinLines.push(...competition.coinLines);xpLines.push(...competition.xpLines);
      if(competition.champion){
        s.competitionHonours.push({id:m.competition.id,kind:m.competition.kind,team:normalizeClub(m.team),date:new Date().toLocaleDateString()});s.competitionHonours=s.competitionHonours.slice(-50);
        if(m.competition.kind==='champions')for(const gift of D.items.filter(i=>i.unlock==='league'))if(!s.owned.includes(gift.id)){s.owned.push(gift.id);cosmetics.push(gift.name);}
      }
    }
    if(league){
      coinLines.push(...league.coinLines);xpLines.push(...league.xpLines);
      if(league.champion){
        s.leagueHonours.push({id:s.league.id,team:normalizeClub(m.team),difficulty:s.league.difficulty,score:m.score,date:new Date().toLocaleDateString()});s.leagueHonours=s.leagueHonours.slice(-50);
        for(const gift of D.items.filter(i=>i.unlock==='league'))if(!s.owned.includes(gift.id)){s.owned.push(gift.id);cosmetics.push(gift.name);}
      }
    }
    if(m.mode==='career'&&win&&m.stage===s.career){const stage=D.stages[s.career++];bonus=stage.bonus;coinLines.push(['First career victory',bonus]);if(stage.gift&&!s.owned.includes(stage.gift)){s.owned.push(stage.gift);cosmetics.push(D.items.find(i=>i.id===stage.gift).name);}}
    const unlocked=[],checks=[true,s.stats.goals>=1,s.stats.saves>=1,s.stats.wins>=3,s.stats.best>=3,s.career===5];
    D.achievements.forEach(([id],i)=>{if(checks[i]&&!s.achievements.includes(id)){s.achievements.push(id);unlocked.push(id);}});
    if(unlocked.length){coinLines.push(['New achievements',unlocked.length*25]);xpLines.push(['New achievements',unlocked.length*20]);}
    const clubGoals=[];
    for(const o of D.clubObjectives)if(!s.clubGoals.includes(o.id)&&objectiveProgress(s,o)>=o.target){
      s.clubGoals.push(o.id);clubGoals.push(o.id);coinLines.push([`Club challenge: ${o.name}`,o.coins]);xpLines.push([`Club challenge: ${o.name}`,o.xp]);
    }
    const coins=coinLines.reduce((n,l)=>n+l[1],0),xp=xpLines.reduce((n,l)=>n+l[1],0);
    s.coins+=coins;s.xp+=xp;cosmetics.push(...unlockLevels(s));s.claimed.push(m.id);s.claimed=s.claimed.slice(-500);
    s.history.unshift({mode:m.mode,result:m.result,score:m.score,date:new Date().toLocaleDateString(),opponent:m.opponent.name,difficulty:m.difficulty,keeperLevel:m.keeperLevel,team:normalizeClub(m.team||s.club)});s.history=s.history.slice(0,20);
    return {coins,xp,coinLines,xpLines,unlocked,cosmetics,clubGoals,bonus,personalBest,beforeLevel,afterLevel:level(s),beforeXp,medal:crossbar?(m.crossbar.precision>=8?'Gold':m.crossbar.precision>=5?'Silver':m.crossbar.precision>=3?'Bronze':'Keep training'):survival?(m.saves>=20?'Gold':m.saves>=10?'Silver':m.saves>=5?'Bronze':'Keep training'):rush?(m.rush.points>=2500?'Gold':m.rush.points>=1200?'Silver':m.rush.points>=500?'Bronze':'Keep training'):challenge?(m.saves>=8?'Gold':m.saves>=5?'Silver':m.saves>=3?'Bronze':'Keep training'):null};
  }
  const api={...D,clamp,integer,level,title,fresh,load,decode,validResult,outcome,matchOutcome,pressure,matchPressure,purchase,upgrade,upgradePrice,facilityPrice,buyFacility,reward,normalizeClub,objectiveProgress};
  Object.assign(root.Panic ||= {},api);if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
