(function(root){
  'use strict';
  const names=['Harbour City','Crimson Rovers','Alpine FC','Solar United','Violet Athletic','Emerald Town','Royal Comets','Northbridge','Eastport City','Riverside Athletic','Oakwell United','Kingsford','Southbank','Ironvale','Westhaven','Meadow Park','Stonebridge','Redwood Rovers','Seabrook','Aurora Milan','Porto Azul','Montclair','Berlin Aurora','Madrid Sol','Lisbon Mariners','Prague Stars','Amsterdam Waves','Vienna Crown','Copenhagen North','Bruges Blue','Athens Olympia','Zagreb City','Basel Peaks','Oslo Lights','Lyon Lumiere'];
  const colors=['#54bac0','#dc6479','#9bbbd7','#ebbd63','#ab93dc','#62b88d','#e3d1a4'];
  const labels={league:'League phase',season:'Premier League',playoff:'Knockout play-offs',last16:'Round of 16',quarter:'Quarter-finals',semi:'Semi-finals',final:'Final'};
  // An eight-round factorisation: two opponents from each nine-club pot,
  // one home and one away. Shuffle clubs within pots for each saved draw.
  const draw=[[[35,0],[1,5],[31,15],[21,25],[16,11],[6,27],[22,26],[2,32],[18,12],[7,28],[13,17],[3,33],[29,23],[10,14],[20,30],[4,8],[34,9],[24,19]],[[25,0],[5,15],[10,20],[31,35],[30,4],[1,11],[26,21],[16,27],[22,6],[12,32],[7,2],[33,28],[17,18],[13,23],[29,3],[8,19],[24,9],[14,34]],[[5,0],[4,14],[35,20],[15,10],[31,25],[30,34],[24,8],[27,11],[1,21],[6,26],[12,16],[22,32],[28,2],[7,17],[33,18],[3,23],[9,19],[29,13]],[[0,4],[35,10],[30,14],[25,20],[24,34],[11,15],[31,5],[27,21],[6,1],[16,26],[28,32],[8,9],[19,29],[3,7],[13,33],[23,17],[12,22],[18,2]],[[0,10],[30,24],[20,4],[14,9],[19,3],[13,7],[34,8],[29,33],[23,18],[15,25],[5,35],[11,21],[27,31],[16,1],[32,26],[2,6],[28,22],[17,12]],[[0,20],[14,24],[4,34],[8,29],[9,3],[19,13],[25,10],[35,30],[21,15],[11,5],[1,31],[26,27],[23,7],[33,17],[2,12],[18,28],[22,16],[32,6]],[[0,30],[10,4],[15,35],[20,24],[14,8],[3,13],[9,29],[5,25],[21,31],[26,11],[27,1],[32,16],[12,6],[17,28],[2,22],[7,18],[23,33],[34,19]],[[15,0],[26,1],[17,2],[8,3],[4,24],[21,5],[6,16],[33,7],[9,13],[10,30],[11,31],[28,12],[20,14],[18,22],[19,23],[25,35],[32,27],[34,29]]];
  const copy=v=>JSON.parse(JSON.stringify(v));
  const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const hash=text=>Array.from(text).reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,7);
  const challenges=Array.from({length:18},(_,level)=>Object.freeze({level,intensity:Math.max(0,level-1)/16}));
  function competitionChallenge(tag){
    if(tag?.kind!=='champions')return challenges[0];
    // Derived from the fixture, so both legs, byes and old saved campaigns agree.
    const league=/^L([1-8])-/.exec(tag.key||'');
    const first={playoff:9,last16:11,quarter:13,semi:15,final:17}[tag.stage];
    const level=tag.stage==='league'?Number(league?.[1]||1):first+(tag.stage!=='final'&&tag.leg===2?1:0);
    return challenges[level]||challenges[0];
  }
  function competitionClub(c,id){return id===0?{id,name:c.team.name,badge:c.team.shortName,color:c.team.home.primary,style:'balanced'}:{id,name:names[id-1],badge:names[id-1].split(' ').map(w=>w[0]).join('').slice(0,3),color:colors[(id-1)%colors.length],style:['balanced','power','low','left'][id%4]};}
  function competitionSchedule(kind,seed=1){
    let rounds;
    if(kind==='premier'){
      const ring=Array.from({length:20},(_,i)=>i);rounds=[];
      for(let r=0;r<19;r++){const pairs=[];for(let i=0;i<10;i++){const pair=[ring[i],ring[19-i]];pairs.push((r+i)%2?pair.reverse():pair);}rounds.push(pairs);ring.splice(1,0,ring.pop());}
      rounds.push(...rounds.map(pairs=>pairs.map(([h,a])=>[a,h])));
    }else{
      const random=rng(seed),ids=Array.from({length:36},(_,i)=>i);
      for(let pot=0;pot<4;pot++)for(let i=8;i>0;i--){const a=pot*9+i,b=pot*9+Math.floor(random()*(i+1));[ids[a],ids[b]]=[ids[b],ids[a]];}
      rounds=draw.map(pairs=>pairs.map(([h,a])=>[ids[h],ids[a]]));
    }
    return rounds.map((pairs,i)=>({key:`L${i+1}`,label:`Matchday ${i+1} / ${kind==='premier'?38:8}`,stage:kind==='premier'?'season':'league',leg:0,fixtures:pairs.map(([home,away],j)=>({key:`L${i+1}-${j}`,home,away}))}));
  }
  function createCompetition(kind,team,difficulty='normal',seed=Math.floor(Math.random()*4294967296),id){
    if(!['champions','premier'].includes(kind))throw Error('Unknown competition');
    return {version:1,kind,id:id||root.crypto?.randomUUID?.()||`${Date.now()}-${seed}`,team:copy(team),difficulty,seed:seed>>>0,round:0,rounds:competitionSchedule(kind,seed),results:[],finished:false,champion:null};
  }
  function competitionTable(c){
    const table=Array.from({length:c.kind==='premier'?20:36},(_,id)=>({id,played:0,wins:0,draws:0,losses:0,gf:0,ga:0,awayGoals:0,awayWins:0,points:0,opponents:[]}));
    for(const r of c.results.filter(r=>r.key.startsWith('L'))){
      const h=table[r.home],a=table[r.away];h.played++;a.played++;h.gf+=r.h;h.ga+=r.a;a.gf+=r.a;a.ga+=r.h;a.awayGoals+=r.a;h.opponents.push(a.id);a.opponents.push(h.id);
      if(r.h===r.a){h.points++;a.points++;h.draws++;a.draws++;}else{const w=r.h>r.a?h:a,l=r.h>r.a?a:h;w.points+=3;w.wins++;l.losses++;if(w===a)a.awayWins++;}
    }
    const opponents=(t,k)=>t.opponents.reduce((sum,id)=>sum+(k==='gd'?table[id].gf-table[id].ga:table[id][k]),0);
    const head=(a,b)=>{let points=0,away=0;for(const r of c.results){if(r.home===a.id&&r.away===b.id){points+=r.h>r.a?3:r.h<r.a?-3:0;away-=r.a;}if(r.home===b.id&&r.away===a.id){points+=r.a>r.h?3:r.a<r.h?-3:0;away+=r.a;}}return [-points,-away];};
    return [...table].sort((a,b)=>b.points-a.points||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||
      (c.kind==='champions'?b.awayGoals-a.awayGoals||b.wins-a.wins||b.awayWins-a.awayWins||opponents(b,'points')-opponents(a,'points')||opponents(b,'gd')-opponents(a,'gd')||opponents(b,'gf')-opponents(a,'gf'):head(a,b)[0]||head(a,b)[1])||a.id-b.id);
  }
  function aggregate(c,fixture){
    const totals=[0,0];if(!fixture.tie)return totals;
    for(const r of c.results.filter(r=>r.tie===fixture.tie)){totals[0]+=r.home===fixture.home?r.h:r.a;totals[1]+=r.home===fixture.home?r.a:r.h;}return totals;
  }
  function addKnockout(c,stage,pairs){
    const legs=stage==='final'?1:2,table=competitionTable(c).map(t=>t.id);
    const seeded=pairs.map(([a,b])=>table.indexOf(a)<table.indexOf(b)?[a,b]:[b,a]);
    for(let leg=1;leg<=legs;leg++)c.rounds.push({key:`${stage}-${leg}`,label:`${labels[stage]}${legs===2?' / Leg '+leg:''}`,stage,leg,fixtures:seeded.map(([strong,weak],i)=>({key:`${stage}-${i}-${leg}`,tie:`${stage}-${i}`,home:leg===1&&legs===2?weak:strong,away:leg===1&&legs===2?strong:weak}))});
  }
  function tieWinners(c,stage){
    const round=c.rounds.find(r=>r.stage===stage&&r.leg===(stage==='final'?1:2));
    return round.fixtures.map(f=>{const a=aggregate(c,f),r=c.results.find(r=>r.key===f.key);return a[0]===a[1]?(r.ph>r.pa?f.home:f.away):a[0]>a[1]?f.home:f.away;});
  }
  function advanceRound(c){
    const current=c.rounds[c.round];if(!current.fixtures.every(f=>c.results.some(r=>r.key===f.key)))return;
    c.round++;
    if(c.round<c.rounds.length)return;
    if(c.kind==='premier'){c.finished=true;c.champion=competitionTable(c)[0].id;return;}
    const ranks=competitionTable(c).map(t=>t.id);
    if(current.stage==='league')addKnockout(c,'playoff',Array.from({length:8},(_,i)=>[ranks[8+i],ranks[23-i]]));
    else if(current.stage==='playoff'){
      const w=tieWinners(c,'playoff');addKnockout(c,'last16',[0,7,3,4,1,6,2,5].map(i=>[ranks[i],w[7-i]]));
    }else if(current.stage==='final'){c.finished=true;c.champion=tieWinners(c,'final')[0];}
    else{const w=tieWinners(c,current.stage),next={last16:'quarter',quarter:'semi',semi:'final'}[current.stage];addKnockout(c,next,w.filter((_,i)=>i%2===0).map((a,i)=>[a,w[i*2+1]]));}
  }
  function simulateFixture(c,round,f){
    const random=rng(c.seed+hash(f.key)),goals=id=>{let n=0;const strength=.22+(35-id)/180;for(let i=0;i<6;i++)if(random()<strength)n++;return n;};
    const r={...f,h:goals(f.home),a:goals(f.away),ph:null,pa:null,extra:false};
    if(round.leg===2||round.stage==='final'){
      const agg=aggregate(c,f);if(r.h+agg[0]===r.a+agg[1]){r.extra=true;r.h+=random()<.3?1:0;r.a+=random()<.3?1:0;if(r.h+agg[0]===r.a+agg[1]){r.ph=random()<.5?5:4;r.pa=r.ph===5?4:5;}}
    }return r;
  }
  function settleCompetition(c){
    // Simulate a round only when the user's fixture is resolved, or they have a bye.
    while(!c.finished){const round=c.rounds[c.round];if(round.fixtures.some(f=>(f.home===0||f.away===0)&&!c.results.some(r=>r.key===f.key)))break;
      for(const f of round.fixtures)if(!c.results.some(r=>r.key===f.key))c.results.push(simulateFixture(c,round,f));advanceRound(c);
    }
  }
  function competitionMatch(c){
    if(!c||c.finished)return null;
    const round=c.rounds[c.round],f=round.fixtures.find(f=>(f.home===0||f.away===0)&&!c.results.some(r=>r.key===f.key));if(!f)return null;
    const home=f.home===0,agg=aggregate(c,f);if(!home)agg.reverse();
    const opponent=competitionClub(c,home?f.away:f.home),deciding=round.leg===2||round.stage==='final';
    return {id:`${c.id}/${f.key}`,team:copy(c.team),opponent:{...opponent,hint:deciding?'The aggregate score decides this tie.':'Build your attack. Every goal matters.'},difficulty:c.difficulty,keeperLevel:c.difficulty==='hard'?'elite':c.difficulty==='normal'?'club':'rookie',competition:{id:c.id,kind:c.kind,key:f.key,label:round.label,stage:round.stage,leg:round.leg,home,aggregate:agg,deciding}};
  }
  function validCompetitionTag(g){
    const t=g.competition;if(g.mode!=='competition')return t==null;
    return !!t&&['champions','premier'].includes(t.kind)&&typeof t.id==='string'&&t.id.length<=80&&typeof t.key==='string'&&t.key.length<50&&g.id===`${t.id}/${t.key}`&&Object.hasOwn(labels,t.stage)&&typeof t.label==='string'&&t.label.length<100&&[0,1,2].includes(t.leg)&&typeof t.home==='boolean'&&typeof t.deciding==='boolean'&&t.deciding===(t.leg===2||t.stage==='final')&&Array.isArray(t.aggregate)&&t.aggregate.length===2&&t.aggregate.every(n=>Number.isInteger(n)&&n>=0&&n<10000);
  }
  function applyCompetitionResult(c,g){
    const spec=competitionMatch(c);if(!spec||!validCompetitionTag(g)||g.id!==spec.id||JSON.stringify(g.competition)!==JSON.stringify(spec.competition)||!g.complete||!g.field?.finished)return null;
    const round=c.rounds[c.round],f=round.fixtures.find(f=>f.key===spec.competition.key),home=f.home===0,score=g.field.score,pens=g.field.pensStarted;
    const agg=spec.competition.aggregate,delta=score[0]+agg[0]-score[1]-agg[1];
    if(pens&&(!spec.competition.deciding||delta!==0)||spec.competition.deciding&&delta===0&&!pens)return null;
    const expected=pens?(g.a.filter(Boolean).length>g.b.filter(Boolean).length?'win':'loss'):spec.competition.deciding?(delta>0?'win':'loss'):score[0]>score[1]?'win':score[0]<score[1]?'loss':'draw';
    if(g.result!==expected||pens&&g.a.filter(Boolean).length===g.b.filter(Boolean).length)return null;
    c.results.push({...f,h:score[home?0:1],a:score[home?1:0],ph:pens?(home?g.a:g.b).filter(Boolean).length:null,pa:pens?(home?g.b:g.a).filter(Boolean).length:null,extra:(g.field.duration||g.field.regulationDuration||300)>(g.field.regulationDuration||300)});
    settleCompetition(c);
    const champion=c.finished&&c.champion===0,advance=spec.competition.deciding&&g.result==='win';
    return {champion,coinLines:champion?[[c.kind==='premier'?'Premier League title':'Champions League title',c.kind==='premier'?750:500]]:advance?[['Knockout qualification',80]]:[],xpLines:champion?[['Competition champion',300]]:advance?[['Knockout qualification',50]]:[]};
  }
  function validCompetition(c){
    if(!c||c.version!==1||!['champions','premier'].includes(c.kind)||typeof c.id!=='string'||c.id.length>80||!Number.isInteger(c.seed)||c.seed<0||c.seed>4294967295||!['easy','normal','hard'].includes(c.difficulty)||!c.team||typeof c.team.name!=='string'||typeof c.team.shortName!=='string'||!/^#[\da-f]{6}$/i.test(c.team.home?.primary)||!Array.isArray(c.results)||c.results.length>400||!Array.isArray(c.rounds)||c.rounds.length>38)return false;
    try{
      const check=createCompetition(c.kind,c.team,c.difficulty,c.seed,c.id),pending=[...c.results];
      while(pending.length){const round=check.rounds[check.round];if(!round)return false;
        for(const f of round.fixtures){const i=pending.findIndex(r=>r.key===f.key);if(i<0)continue;const r=pending.splice(i,1)[0];
          if(r.home!==f.home||r.away!==f.away||r.tie!==f.tie||!['h','a'].every(k=>Number.isInteger(r[k])&&r[k]>=0&&r[k]<=10000)||typeof r.extra!=='boolean')return false;
          const agg=aggregate(check,f),deciding=round.leg===2||round.stage==='final',tied=r.h+agg[0]===r.a+agg[1];
          if(deciding&&tied){if(![r.ph,r.pa].every(n=>Number.isInteger(n)&&n>=0&&n<1000)||r.ph===r.pa||!r.extra)return false;}else if(r.ph!==null||r.pa!==null)return false;
          if(!deciding&&r.extra)return false;check.results.push(copy(r));
        }
        const before=check.round;advanceRound(check);if(check.round===before){if(pending.length)return false;break;}
      }
      return c.round===check.round&&c.finished===check.finished&&c.champion===check.champion&&JSON.stringify(c.rounds)===JSON.stringify(check.rounds);
    }catch{return false;}
  }
  const api={createCompetition,competitionClub,competitionSchedule,competitionTable,competitionMatch,competitionChallenge,applyCompetitionResult,validCompetition,validCompetitionTag,competitionLabels:labels};
  Object.assign(root.Panic||={},api);if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
