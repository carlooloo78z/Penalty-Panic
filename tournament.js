(function(root){
  'use strict';
  const Field=typeof module!=='undefined'?require('./field.js'):root.Panic;
  // New campaigns are single-elimination. Earlier league-stage saves remain readable.
  const leagueClubs=[
    {name:'Harbour City',badge:'HC',color:'#54bac0',style:'balanced',hint:'They mix their finishes. Read the feet before diving.'},
    {name:'Crimson Rovers',badge:'CR',color:'#dc6479',style:'power',hint:'Fast, low penalties. Be ready after the kick.'},
    {name:'Alpine FC',badge:'AF',color:'#9bbbd7',style:'low',hint:'Their keeper favours low finishes. Try the top corners.'},
    {name:'Solar United',badge:'SU',color:'#ebbd63',style:'left',hint:'They favour your left. Stay alert for a change.'},
    {name:'Violet Athletic',badge:'VA',color:'#ab93dc',style:'balanced',hint:'Change your placement and watch their run-up.'},
    {name:'Emerald Town',badge:'ET',color:'#62b88d',style:'low',hint:'A compact keeper. A controlled high finish can beat them.'},
    {name:'Royal Comets',badge:'RC',color:'#e3d1a4',style:'power',hint:'Powerful shots and an aggressive keeper. Timing matters.'}
  ];
  const copy=v=>JSON.parse(JSON.stringify(v));
  function leagueClub(c,id){
    if(id===0)return {name:c.team.name,badge:c.team.shortName,color:c.team.home.primary,style:'balanced'};
    const draw=[0,1,2,3,4,5,6];let seed=c.seed;
    for(let i=6;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[draw[i],draw[j]]=[draw[j],draw[i]];}
    return leagueClubs[draw[id-1]];
  }
  function leagueSchedule(){
    const ring=[0,1,2,3,4,5,6,7],fixtures=[];
    for(let r=0;r<3;r++){
      for(let i=0;i<4;i++)fixtures.push({key:`L${r+1}-${i}`,home:ring[i],away:ring[7-i],round:r+1});
      ring.splice(1,0,ring.pop());
    }
    return fixtures;
  }
  function leagueTable(c){
    const rows=Array.from({length:8},(_,id)=>({id,played:0,wins:0,gf:0,ga:0,points:0}));
    for(const r of c.results.filter(r=>r.key.startsWith('L'))){
      const h=rows[r.home],a=rows[r.away];h.played++;a.played++;h.gf+=r.h;a.gf+=r.a;h.ga+=r.a;a.ga+=r.h;
      const winner=r.h>r.a?h:a;winner.wins++;winner.points+=3;
    }
    return rows.sort((a,b)=>b.points-a.points||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.id-b.id);
  }
  const winner=r=>r.h>r.a?r.home:r.away;
  const quarters=()=>Array.from({length:4},(_,i)=>({key:`Q${i+1}`,home:i,away:7-i}));
  function knockoutState(c){
    const quarter=quarters(),qs=quarter.map(f=>c.results.find(r=>r.key===f.key));
    const semi=qs.every(Boolean)?[0,1].map(i=>({key:`S${i+1}`,home:winner(qs[i*2]),away:winner(qs[i*2+1])})):[];
    const ss=semi.map(f=>c.results.find(r=>r.key===f.key));
    const final=ss.length===2&&ss.every(Boolean)?{key:'F1',home:winner(ss[0]),away:winner(ss[1])}:null;
    const played=c.results.find(r=>r.key==='F1'),lost=c.results.some(r=>[r.home,r.away].includes(0)&&winner(r)!==0);
    const stage=played?(winner(played)===0?'champion':'eliminated'):lost?'eliminated':!semi.length?'quarter':!final?'semi':'final';
    const fixtures=stage==='quarter'?quarter:stage==='semi'?semi:stage==='final'?[final]:[];
    return {quarter,semi,final,table:[],rank:0,round:stage==='quarter'?0:stage==='semi'?1:2,stage,
      fixture:fixtures.find(f=>f.home===0||f.away===0)||null,champion:played?winner(played):null,done:!!played||lost,
      label:stage==='quarter'?'QUARTER-FINAL':stage==='semi'?'SEMI-FINAL':stage==='final'?'THE FINAL':stage==='champion'?'CHAMPIONS':'ELIMINATED'};
  }
  function leagueState(c){
    if(!c)return null;
    if(c.format==='knockout')return knockoutState(c);
    const table=leagueTable(c),rank=table.findIndex(t=>t.id===0)+1;
    const round=Math.floor(c.results.filter(r=>r.key.startsWith('L')).length/4);
    const schedule=leagueSchedule(),semi=round===3?[{key:'S1',home:table[0].id,away:table[3].id},{key:'S2',home:table[1].id,away:table[2].id}]:[];
    const semis=semi.map(f=>c.results.find(r=>r.key===f.key)),final=semis.length===2&&semis.every(Boolean)?{key:'F1',home:winner(semis[0]),away:winner(semis[1])}:null;
    const playedFinal=c.results.find(r=>r.key==='F1');
    const mine=f=>f.home===0||f.away===0;
    const stage=playedFinal?(winner(playedFinal)===0?'champion':'eliminated'):round<3?'league':semis.every(Boolean)?'final':'semi';
    const fixture=stage==='league'?schedule.filter(f=>f.round===round+1).find(mine):stage==='semi'?semi.find(mine):stage==='final'&&final&&mine(final)?final:null;
    return {table,rank,round,stage,fixture,semi,final,champion:playedFinal?winner(playedFinal):null,done:!!playedFinal,
      label:stage==='league'?`LEAGUE MATCHDAY ${round+1}`:stage==='semi'?'SEMI-FINAL':stage==='final'?'THE FINAL':stage==='champion'?'CHAMPIONS':'CAMPAIGN COMPLETE'};
  }
  function createLeague(team,difficulty='normal',id,seed=Date.now()>>>0){
    return {version:1,id:id||root.crypto?.randomUUID?.()||`cup-${Date.now()}`,seed:seed>>>0,difficulty,team:copy(team),results:[],format:'knockout'};
  }
  function leagueMatch(c){
    const state=leagueState(c);if(!state?.fixture||state.done)return null;
    const f=state.fixture,level=['easy','normal','hard'].indexOf(c.difficulty),knockout=['semi','final'].includes(state.stage);
    return {id:`${c.id}/${f.key}`,opponent:copy(leagueClub(c,f.home===0?f.away:f.home)),team:copy(c.team),
      difficulty:['easy','normal','hard'][Math.min(2,level+Number(knockout))],
      keeperLevel:['rookie','club','elite'][Math.min(2,level+Number(state.stage==='final'))],
      league:{id:c.id,key:f.key,stage:state.stage,label:state.label}};
  }
  function simulateFixture(c,f){
    let seed=c.seed;for(const ch of f.key)seed=(Math.imul(seed,31)+ch.charCodeAt(0))>>>0;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    let h=0,a=0,hk=0,ak=0;
    const timed=['five-minute','knockout'].includes(c.format);
    if(timed)for(let minute=0;minute<5;minute++){h+=Number(random()<.48);a+=Number(random()<.48);}
    const regulation=[h,a];
    if(h!==a&&timed)return {key:f.key,home:f.home,away:f.away,h,a,regulation,penalties:null};
    if(timed){h=0;a=0;}
    const result=()=>({key:f.key,home:f.home,away:f.away,h,a,...(timed?{regulation,penalties:[h,a]}:{})});
    const clinched=()=>h>a+5-ak||a>h+5-hk;
    for(let i=0;i<5;i++){
      h+=Number(random()<.69);hk++;if(clinched())return result();
      a+=Number(random()<.69);ak++;if(clinched())return result();
    }
    for(let i=0;h===a&&i<100;i++){h+=Number(random()<.69);a+=Number(random()<.69);}
    if(h===a)h++;
    return result();
  }
  function applyLeagueResult(c,g){
    const spec=leagueMatch(c);
    if(!spec||g.id!==spec.id||g.league?.id!==c.id||g.league?.key!==spec.league.key||!g.complete||!['win','loss'].includes(g.result))return null;
    if(!Array.isArray(g.a)||!Array.isArray(g.b))return null;
    const [ours,theirs]=Field.matchScores(g);
    if(ours===theirs||(ours>theirs)!==(g.result==='win'))return null;
    const before=leagueState(c),f=before.fixture,coinLines=[],xpLines=[];
    const played={key:f.key,home:f.home,away:f.away,h:f.home===0?ours:theirs,a:f.home===0?theirs:ours};
    if(g.field){played.regulation=f.home===0?[...g.field.score]:[...g.field.score].reverse();played.penalties=g.field.pensStarted?[played.h,played.a]:null;}
    const fixtures=before.stage==='quarter'?before.quarter:before.stage==='league'?leagueSchedule().filter(x=>x.round===before.round+1):before.stage==='semi'?before.semi:[f];
    c.results.push(...fixtures.map(x=>x.key===f.key?played:simulateFixture(c,x)));
    let after=leagueState(c);
    if(before.stage==='quarter'&&g.result==='win'){coinLines.push(['Reached the semi-finals',80]);xpLines.push(['Reached the semi-finals',60]);}
    if(before.stage==='quarter'&&g.result==='loss'){
      c.results.push(...after.semi.map(x=>simulateFixture(c,x)));after=leagueState(c);c.results.push(simulateFixture(c,after.final));
    }
    if(before.stage==='league'&&after.round===3){
      if(after.rank<=4){coinLines.push(['Knockout qualification',80]);xpLines.push(['Knockout qualification',60]);}
      else {c.results.push(...after.semi.map(x=>simulateFixture(c,x)));after=leagueState(c);c.results.push(simulateFixture(c,after.final));}
    }
    if(before.stage==='semi'){
      if(g.result==='win'){coinLines.push(['Reached the final',100]);xpLines.push(['Reached the final',75]);}
      else c.results.push(simulateFixture(c,after.final));
    }
    if(before.stage==='final'){
      coinLines.push([g.result==='win'?'Champions League trophy':'Champions League runner-up',g.result==='win'?350:75]);
      xpLines.push([g.result==='win'?'Champions League trophy':'Champions League runner-up',g.result==='win'?250:50]);
    }
    after=leagueState(c);
    return {coinLines,xpLines,champion:after.stage==='champion',finished:after.done,firstMatch:before.round===0&&['league','quarter'].includes(before.stage),stage:before.stage};
  }
  function validLeague(c){
    if(c?.format!==undefined&&!['five-minute','knockout'].includes(c.format))return false;
    if(!c||c.version!==1||typeof c.id!=='string'||!c.id.length||c.id.length>80||!Number.isInteger(c.seed)||c.seed<0||c.seed>4294967295||!['easy','normal','hard'].includes(c.difficulty)||!c.team||typeof c.team.name!=='string'||!Array.isArray(c.results)||!(c.format==='knockout'?[0,4,6,7]:[0,4,8,12,14,15]).includes(c.results.length))return false;
    const schedule=leagueSchedule(),seen=new Set();
    for(const r of c.results){
      if(!r||typeof r.key!=='string'||seen.has(r.key)||![r.home,r.away].every(n=>Number.isInteger(n)&&n>=0&&n<8)||r.home===r.away||![r.h,r.a].every(n=>Number.isInteger(n)&&n>=0&&n<=1000)||r.h===r.a)return false;
      seen.add(r.key);
      if(r.regulation!==undefined){
        if(!Array.isArray(r.regulation)||r.regulation.length!==2||r.regulation.some(n=>!Number.isInteger(n)||n<0||n>1000))return false;
        if(r.penalties!==null&&(!Array.isArray(r.penalties)||r.penalties.length!==2||r.penalties[0]!==r.h||r.penalties[1]!==r.a))return false;
        if(c.format==='knockout'&&(r.penalties===null?(r.h!==r.regulation[0]||r.a!==r.regulation[1]):r.regulation[0]!==r.regulation[1]))return false;
      }
    }
    if(c.format==='knockout'){
      const state=knockoutState(c),expected=[...state.quarter,...state.semi,...(state.final?[state.final]:[])];
      if(c.results.some((r,i)=>!expected[i]||r.key!==expected[i].key||r.home!==expected[i].home||r.away!==expected[i].away))return false;
      return c.results.length===7||!state.done;
    }
    for(let i=0;i<Math.min(12,c.results.length);i++){const r=c.results[i],f=schedule[i];if(r.key!==f.key||r.home!==f.home||r.away!==f.away)return false;}
    if(c.results.length>=12){
      const state=leagueState(c);
      for(let i=12;i<c.results.length;i++){const r=c.results[i],f=i===14?state.final:state.semi[i-12];if(!f||r.key!==f.key||r.home!==f.home||r.away!==f.away)return false;}
      if(c.results.length<15&&!state.fixture)return false;
    }
    return true;
  }
  function validLeagueTag(g){
    if(g.mode!=='league')return g.league==null;
    const l=g.league;return !!l&&typeof l.id==='string'&&l.id.length>0&&l.id.length<=80&&typeof l.key==='string'&&['quarter','league','semi','final'].includes(l.stage)&&typeof l.label==='string'&&l.label.length<40&&
      (l.stage==='quarter'?/^Q[1-4]$/:l.stage==='league'?/^L[123]-[0-3]$/:l.stage==='semi'?/^S[12]$/:/^F1$/).test(l.key)&&g.id===`${l.id}/${l.key}`;
  }
  const api={leagueClubs,leagueClub,leagueSchedule,leagueTable,leagueState,createLeague,leagueMatch,applyLeagueResult,validLeague,validLeagueTag};
  Object.assign(root.Panic||={},api);if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
