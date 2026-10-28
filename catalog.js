(function(root) {
  'use strict';
  const categories=['Football','Gloves','Boots','Player kit','Keeper kit','Celebration','Stadium','Goal effect','Headband','Wrist tape','Undersleeves','Sock tape','Armband'];
  const names=[['Classic matchball','Solar flare','Orbit mint'],['Safe hands','Neon grip','Ice palms'],['Night runners','Solar speed','Pink lightning'],['Electric blue','Mint city','Captain stripes'],['Coral wall','Violet guardian','Emerald wall'],['Arms aloft','Victory spin','Star jump'],['Midnight arena','Sunset bowl','Northern lights'],['Paper party','Star shower','Electric rings']];
  const colors=[['#ffffff','#ffd23f','#57e4c1'],['#eaff62','#a2ff6b','#75e4ff'],['#192836','#ffd23f','#ff73b5'],['#4d91ff','#57e4c1','#ffffff'],['#ff7f69','#a88bff','#50cf99'],['#eaff62','#ffd23f','#75e4ff'],['#10263b','#ad527e','#146455'],['#eaff62','#ffd23f','#75e4ff']];
  const descriptions=[['The original black-and-white matchball.','Gold panels under the floodlights.','Mint panels.'],['Bright palms for confident hands.','A fluorescent green finish.','Ice blue gloves.'],['Dark boots with a white sole.','Golden boots with a racing stripe.','Pink boots with lightning details.'],['Blue shirt and matching shorts.','Mint green with a white stripe.','Navy stripes on white.'],['Coral shirt with dark shorts.','Violet with contrasting sleeves.','Emerald with a patterned chest.'],['Throw both hands up.','A full-body victory spin.','Jump and reach for the stars.'],['Deep blue sky and floodlights.','A rose and violet sunset.','Green aurora above the stands.'],['Coloured paper after your goals.','Golden stars burst from the net.','Expanding electric blue rings.']];
  names.push(['No headband','White match band','Midnight stripe','Solar headband'],['No wrist tape','Classic wrist tape','Coral wraps','Mint wraps'],['No undersleeves','Black base layer','Ice base layer','Violet base layer'],['No sock tape','White sock tape','Solar sock tape','Mint sock tape'],['No armband','Club captain','Golden captain','Coral captain']);
  colors.push(['#a2b8c4','#f2f3e9','#24374a','#f2c65b'],['#a2b8c4','#f2f3e9','#e9878a','#70d5b5'],['#a2b8c4','#1c2c39','#bdedf1','#a493d4'],['#a2b8c4','#f2f3e9','#f2c65b','#70d5b5'],['#a2b8c4','#f2f3e9','#f2c65b','#e9878a']);
  descriptions.push(
    ['Remove your headband.','A free white band for both players.','A navy band with a pale centre stripe.','Gold fabric with a dark centre stripe.'],
    ['Remove your wrist wraps.','Free white tape around both wrists.','Coral wraps with a contrasting seam.','Mint tape for your striker and keeper.'],
    ['Bare forearms on your striker.','A free dark base layer under the striker shirt.','Pale blue sleeves that move with your arms.','Violet sleeves under your striker kit.'],
    ['Remove the tape from your socks.','Free white bands around both calves.','Twin gold bands above the boots.','Twin mint bands for both players.'],
    ['Remove your captain’s armband.','A free white captain’s band on the left arm.','Lead your club in a gold captain’s band.','A coral captain’s band with a pale C.']
  );
  const items=categories.flatMap((category,i)=>names[i].map((name,variant)=>({id:`${i}-${variant}`,category,name,color:colors[i][variant],variant,description:descriptions[i][variant],price:i<8?(variant===1?80+i*15:0):(variant>1?(variant===2?70:110)+(i-8)*10:0),level:i<8&&variant===2?i+2:0,accessory:i>=8})));
  const stages=[
    {name:'The neighbourhood',opponent:'Riverside Rovers',badge:'RR',color:'#ff9474',difficulty:'easy',style:'early',hint:'Their keeper commits early. A driven finish can beat the first step.',gift:'0-1',bonus:100},
    {name:'Under the lights',opponent:'Neon Athletic',badge:'NA',color:'#eaff62',difficulty:'normal',style:'low',hint:'Strong on low shots. Try placing your finish high.',bonus:120},
    {name:'City showdown',opponent:'Metro United',badge:'MU',color:'#f58dbb',difficulty:'normal',style:'left',hint:'Their striker favours the left. Watch for the change.',gift:'4-1',bonus:140},
    {name:'The pressure test',opponent:'Summit FC',badge:'SF',color:'#7dd9ff',difficulty:'hard',style:'power',hint:'Fast, low finishes. Get your hands down after the kick.',bonus:160},
    {name:'Legend of the spot',opponent:'The All Stars',badge:'AS',color:'#c0a0ff',difficulty:'hard',style:'balanced',hint:'They mix power and placement. Read every kick.',gift:'6-1',bonus:180}
  ];
  const difficulties={easy:{flight:1.35,read:1.2,miss:.10,error:18},normal:{flight:1.12,read:1.05,miss:.05,error:10},hard:{flight:.94,read:.9,miss:.02,error:6}};
  const keeperLevels={rookie:{name:'Rookie',reaction:.48,duration:.59,error:125,prediction:.22,travel:230},club:{name:'Club',reaction:.32,duration:.47,error:85,prediction:.48,travel:250},elite:{name:'Elite',reaction:.22,duration:.39,error:55,prediction:.68,travel:265}};
  const upgrades={
    accuracy:{name:'Accuracy',unit:'off-power drift reduction',value:l=>`${Math.round((1-1/(1+l*.16))*100)}%`,description:'Keep overhit or underhit shots closer to your aim.'},
    power:{name:'Power',unit:'flight time reduction',value:l=>`${l*2}%`,description:'Driven shots arrive sooner, giving the keeper less time.'},
    curl:{name:'Curl',unit:'maximum bend',value:l=>`${28+l*6} cm`,description:'Bend the flight without changing the selected landing point.'},
    reaction:{name:'Reaction',unit:'extra reach time',value:l=>`${l*30} ms`,description:'Descend more gradually after reaching, giving your hands extra time.'},
    reach:{name:'Reach',unit:'extra hand extension',value:l=>`${l*2} cm`,description:'A modest hand extension; height and direction still matter.'}
  };
  const achievements=[['First whistle','Finish a run'],['Net finder','Score your first goal'],['Safe hands','Make your first save'],['On the rise','Win 3 shootouts'],['Wall of fame','Save 3 consecutive shots'],['Spot legend','Finish all 5 career stages']];
  const kitPatterns=[['plain','Clean'],['stripes','Stripes'],['hoops','Hoops'],['sash','Sash'],['halves','Half & half']];
  const clubPresets=[
    {name:'Ocean',primary:'#2874d5',secondary:'#eef5ff',pattern:'stripes'},
    {name:'Flame',primary:'#b72f43',secondary:'#ffd476',pattern:'sash'},
    {name:'Forest',primary:'#207957',secondary:'#ecedd4',pattern:'hoops'},
    {name:'Midnight',primary:'#202d47',secondary:'#d0a8ef',pattern:'halves'},
    {name:'Sunrise',primary:'#f1bd42',secondary:'#242e45',pattern:'plain'},
    {name:'Ice',primary:'#dbeff1',secondary:'#317786',pattern:'sash'}
  ];
  const clubObjectives=[
    {id:'finisher',name:'Reliable finisher',description:'Score 30 goals in completed runs.',stat:'goals',target:30,coins:120,xp:80,group:'Finishing',tier:'Club',play:{mode:'match'}},
    {id:'centurion',name:'Century of goals',description:'Score 100 goals in completed runs.',stat:'goals',target:100,coins:240,xp:160,group:'Finishing',tier:'Elite',play:{mode:'match'}},
    {id:'goal-machine',name:'The goal machine',description:'Score 250 goals in completed runs.',stat:'goals',target:250,coins:425,xp:275,group:'Finishing',tier:'Legend',play:{mode:'match'}},
    {id:'clinical',name:'No room for error',description:'Win 3 shootouts without missing a penalty. Take at least 3 kicks in each win.',stat:'clinicalWins',target:3,coins:250,xp:170,group:'Finishing',tier:'Elite',play:{mode:'match'}},
    {id:'wall',name:'Club number one',description:'Make 25 saves in completed runs.',stat:'saves',target:25,coins:150,xp:100,group:'Goalkeeping',tier:'Club',play:{mode:'challenge'}},
    {id:'six-stops',name:'Shut the door',description:'Make 6 consecutive saves in a single completed run.',stat:'best',target:6,coins:225,xp:150,group:'Goalkeeping',tier:'Elite',play:{mode:'challenge'}},
    {id:'keeper-eight',name:'Eight out of ten',description:'Save 8 of 10 penalties in one keeper challenge on Normal or Hard.',stat:'keeperRecord',minimumDifficulty:'normal',target:8,coins:250,xp:175,group:'Goalkeeping',tier:'Elite',play:{mode:'challenge',difficulty:'normal'}},
    {id:'hard-streak',name:'Unbreakable',description:'Make 8 consecutive saves in one Hard keeper challenge.',stat:'hardSaveStreak',target:8,coins:375,xp:240,group:'Goalkeeping',tier:'Legend',play:{mode:'challenge',difficulty:'hard'}},
    {id:'perfect-wall',name:'The perfect wall',description:'Save all 10 penalties in one Hard keeper challenge. Striker misses do not count.',stat:'keeperRecord',minimumDifficulty:'hard',target:10,coins:500,xp:325,group:'Goalkeeping',tier:'Legend',play:{mode:'challenge',difficulty:'hard'}},
    {id:'loyal',name:'Matchday regular',description:'Finish 20 shootouts.',stat:'matches',target:20,coins:180,xp:120,group:'Shootouts',tier:'Club',play:{mode:'match'}},
    {id:'winners',name:'Winning culture',description:'Win 10 shootouts.',stat:'wins',target:10,coins:225,xp:150,group:'Shootouts',tier:'Club',play:{mode:'match'}},
    {id:'clean-sheets',name:'Nothing gets through',description:'Win 3 shootouts without conceding, making at least 3 saves in each.',stat:'cleanSheetWins',target:3,coins:275,xp:180,group:'Shootouts',tier:'Elite',play:{mode:'match'}},
    {id:'elite-opposition',name:'Beat the best',description:'Win 5 shootouts against a Hard striker AND an Elite goalkeeper.',stat:'eliteWins',target:5,coins:400,xp:260,group:'Shootouts',tier:'Legend',play:{mode:'match',difficulty:'hard',keeperLevel:'elite'}},
    {id:'sudden-death',name:'Nerves of steel',description:'Win 3 shootouts that reach sudden death.',stat:'suddenDeathWins',target:3,coins:275,xp:180,group:'Shootouts',tier:'Elite',play:{mode:'match'}},
    {id:'comeback',name:'Never finished',description:'Win 3 shootouts after trailing at the end of a paired round.',stat:'comebackWins',target:3,coins:275,xp:180,group:'Shootouts',tier:'Elite',play:{mode:'match'}},
    {id:'five-wins',name:'On a roll',description:'Win 5 shootouts in a row. A shootout loss resets the streak.',stat:'bestWinStreak',target:5,coins:300,xp:200,group:'Shootouts',tier:'Elite',play:{mode:'match'}},
    {id:'ten-wins',name:'Unstoppable club',description:'Win 10 shootouts in a row. Other modes neither extend nor break the streak.',stat:'bestWinStreak',target:10,coins:500,xp:325,group:'Shootouts',tier:'Legend',play:{mode:'match'}},
    {id:'precision',name:'Target specialist',description:'Score 3,000 points in one Target Rush.',stat:'rush',target:3000,coins:200,xp:140,group:'Target Rush',tier:'Club',play:{mode:'rush'}},
    {id:'combo-twelve',name:'Twelve on target',description:'Hit 12 targets in a row in a single Target Rush.',stat:'rushBestCombo',target:12,coins:250,xp:170,group:'Target Rush',tier:'Elite',play:{mode:'rush'}},
    {id:'combo-twenty',name:'Laser focus',description:'Hit 20 targets in a row in a single Target Rush.',stat:'rushBestCombo',target:20,coins:425,xp:275,group:'Target Rush',tier:'Legend',play:{mode:'rush'}},
    {id:'hard-rush',name:'Under pressure',description:'Score 5,000 points in one Target Rush on Hard.',stat:'rush',minimumDifficulty:'hard',target:5000,coins:450,xp:300,group:'Target Rush',tier:'Legend',play:{mode:'rush',difficulty:'hard'}},
    {id:'target-hunter',name:'Target hunter',description:'Hit 150 targets across completed Target Rush runs.',stat:'rushHits',target:150,coins:275,xp:180,group:'Target Rush',tier:'Elite',play:{mode:'rush'}},
    {id:'rising',name:'A club on the rise',description:'Win all 5 career stages.',stat:'career',target:5,coins:300,xp:200,group:'Career',tier:'Elite',play:{mode:'career'}},
    {id:'defend-crown',name:'Defend the crown',description:'Beat The All Stars 3 times in career with an Elite keeper. Their striker is always Hard.',stat:'legendWins',target:3,coins:450,xp:300,group:'Career',tier:'Legend',play:{mode:'career',stage:4,keeperLevel:'elite'}}
  ];
  clubObjectives.push(
    {id:'bar-collector',name:'Heavy metal',description:'Hit the crossbar 20 times in completed Crossbar Circuit runs.',stat:'barHits',target:20,coins:150,xp:100,group:'Arcade',tier:'Club',play:{mode:'crossbar'}},
    {id:'bar-eight',name:'Golden touch',description:'Hit the gold zone with controlled power 8 times in one Crossbar Circuit.',stat:'barPrecisionBest',target:8,coins:225,xp:150,group:'Arcade',tier:'Elite',play:{mode:'crossbar'}},
    {id:'bar-combo',name:'Five in the frame',description:'Chain 5 gold-zone hits in one Crossbar Circuit.',stat:'barBestCombo',target:5,coins:200,xp:140,group:'Arcade',tier:'Elite',play:{mode:'crossbar'}},
    {id:'bar-hard',name:'Metal master',description:'Score 1,200 points in one Hard Crossbar Circuit.',stat:'barHardBest',target:1200,coins:350,xp:240,group:'Arcade',tier:'Legend',play:{mode:'crossbar',difficulty:'hard'}},
    {id:'survival-ten',name:'Last line',description:'Make 10 saves in one Keeper Survival run. Bank the run or finish all three lives.',stat:'survivalBest',target:10,coins:225,xp:150,group:'Arcade',tier:'Elite',play:{mode:'survival'}},
    {id:'survival-hard',name:'Endless wall',description:'Make 20 saves in one Hard Keeper Survival run.',stat:'survivalHardBest',target:20,coins:450,xp:300,group:'Arcade',tier:'Legend',play:{mode:'survival',difficulty:'hard'}}
  );
  function validArcade(g){
    const count=(n,max=1e7)=>Number.isInteger(n)&&n>=0&&n<=max;
    if(g.mode==='crossbar'){
      const c=g.crossbar;
      if(g.role!=='shoot')return false;
      if(!c||!count(g.round,10)||g.complete&&g.round!==10||!count(c.hits,g.round)||!count(c.precision,c.hits)||!count(c.combo,c.precision)||!count(c.bestCombo,c.precision)||c.bestCombo<c.combo||!count(c.points))return false;
      if(!Number.isFinite(c.offset)||c.offset<0||c.offset>Math.PI*2||!Number.isFinite(c.radius)||c.radius<24||c.radius>64)return false;
      if(c.locked!==null&&(!Number.isFinite(c.locked)||c.locked<275||c.locked>725))return false;
      if(['kick','flight','feedback'].includes(g.phase)&&c.locked===null)return false;
    }else if(g.crossbar!=null)return false;
    if(g.mode==='survival'){
      if(g.role!=='keep')return false;
      if(!g.survival||!count(g.survival.lives,3)||g.survival.lives!==3-g.conceded||!count(g.round)||g.round!==g.saves+g.conceded+g.aiMisses)return false;
      if(!g.complete&&g.survival.lives===0||g.complete&&g.survival.lives>0&&g.saves===0)return false;
    }else if(g.survival!=null)return false;
    return true;
  }
  items.push({id:'3-3',category:'Player kit',name:'Champions Night',color:'#20385e',variant:1,price:0,level:0,unlock:'league',description:'Win the Champions League. Midnight blue, gold trim and a champions sash.',design:{primary:'#20385e',secondary:'#e9c775',pattern:'sash'}});
  const facilities={
    passing:{name:'Training ground',icon:'target',description:'Quicker passes and more time to control the ball before a defender can tackle.',effect:n=>`+${n*10} pass speed / +${(n*.15).toFixed(2)}s ball control`},
    fitness:{name:'Recovery suite',icon:'bolt',description:'Your selected player uses less stamina while sprinting and recovers faster.',effect:n=>`${n*10}% less sprint drain / ${n*10}% faster recovery`},
    keeping:{name:'Goalkeeper school',icon:'shield',description:'Your goalkeeper covers more ground when diving during five-a-side matches.',effect:n=>`+${n*4} dive distance`}
  };
  const api={categories,items,stages,difficulties,keeperLevels,upgrades,facilities,achievements,kitPatterns,clubPresets,clubObjectives,validArcade};
  Object.assign(root.Panic ||= {},api);
  if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
