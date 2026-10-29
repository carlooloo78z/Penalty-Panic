(function(root){
  'use strict';
  const P=root.Panic,U=P.UI,{btn}=U;
  function arcadeMenu(app){
    const s=app.save,d=s.settings.difficulty;
    return `<section class="arcade-section" aria-label="New arcade games"><div class="section-line"><h2>Two new ways to play.</h2><span>NEW / ARCADE</span></div><div class="arcade-grid">
      <article class="arcade-card crossbar-card"><div class="arcade-art" aria-hidden="true"><svg viewBox="0 0 300 82" fill="none"><path d="M35 76V24H265V76" stroke="#dcece4" stroke-width="5"/><path d="M108 24H192" stroke="#ffd56d" stroke-width="11"/><circle cx="151" cy="24" r="9" fill="#ffd56d" stroke="#fff4ce" stroke-width="2"/><path d="M150 74V40" stroke="#ffe4a2" stroke-dasharray="4 5" stroke-width="2"/></svg><span>10 BALLS</span></div><span class="eyebrow">TIMING + PRECISION</span><h3>Crossbar Circuit</h3><p>A moving gold zone. Ten balls. Time your release, hit the bar and chain gold bonuses.</p><small id="crossbar-best">Best: ${s.crossbarRecords[d]} points on ${d}</small>${btn('PLAY CROSSBAR CIRCUIT →','crossbar','primary')}</article>
      <article class="arcade-card survival-card"><div class="arcade-art lives-art" aria-hidden="true">${[1,2,3].map(()=>U.icon('shield')).join('')}<span>3 LIVES</span></div><span class="eyebrow">REACTIONS + ENDURANCE</span><h3>Keeper Survival</h3><p>Three lives. Faster shots every five attempts. Keep saving, or bank your run between shots.</p><small id="survival-best">Best: ${s.survivalRecords[d]} saves on ${d}</small>${btn('PLAY KEEPER SURVIVAL →','survival','primary')}</article>
      </div><p class="micro">Coins, XP and records in both modes. Six new Arcade objectives are waiting on your club board.</p></section>`;
  }
  function arcadeHud(app){
    const g=app.sim.g,c=g.crossbar,lives=g.survival?.lives;
    const wave=Math.max(1,Math.ceil((g.round+(g.phase==='feedback'?0:1))/5));
    return `<div class="role-tag ${c?'':'keeper'}"><span>${c?'CROSSBAR CIRCUIT':'KEEPER SURVIVAL'}</span><strong>${c?'TIME YOUR RELEASE':`WAVE ${wave} · MAKE THE SAVE`}</strong></div>
      <div class="scoreboard"><div class="score-line"><span>${c?'POINTS':'SAVES'}</span><strong>${c?c.points:g.saves}</strong><span>${c?`${Math.min(10,g.round+(g.phase==='feedback'?0:1))}/10 BALLS`:`${lives}/3 LIVES`}</span></div><small>${c?`${c.hits} bar hits · ${c.precision} gold hits · combo ${c.combo}`:`${g.round} shots faced · best streak ${g.best}`}</small></div>
      <div class="match-tools">${btn(app.save.settings.mute?'SOUND OFF':'SOUND ON','mute','quiet')}${btn('Ⅱ PAUSE','pause','secondary')}</div>
      <div class="pressure">${c?'BAR 40 · GOLD 100 + COMBO · POWER 55–78%':lives===1?'LAST LIFE · STAY COMPOSED':'FASTER EVERY 5 SHOTS · BANK BETWEEN SHOTS'}<span>${g.difficulty} · best ${c?app.save.crossbarRecords[g.difficulty]+' pts':app.save.survivalRecords[g.difficulty]+' saves'}</span></div>`;
  }
  function arcadeResult(app){
    const m=app.save.lastResult;
    if(m?.crossbar)return {heading:'MAKE THE FRAME RING.',kicker:'CROSSBAR CIRCUIT · TEN BALLS',description:'Moving targets. Controlled power. Every hit counts.',stats:[[m.crossbar.hits,'CROSSBAR HITS'],[m.crossbar.precision,'GOLD HITS'],[m.crossbar.bestCombo,'BEST COMBO'],[10-m.crossbar.hits,'MISSES']],detail:`${m.difficulty} circuit · record ${app.save.crossbarRecords[m.difficulty]} points · 4 coins per bar hit + 8 per gold hit`};
    if(m?.survival)return {heading:m.survival.lives?'KNOW WHEN TO BANK.':'ONE MORE SAVE.',kicker:'KEEPER SURVIVAL · RUN COMPLETE',description:m.survival.lives?'You banked your run and secured the rewards.':'Three lives. Keep climbing with every run.',stats:[[m.saves,'SAVES'],[m.round,'SHOTS FACED'],[m.best,'BEST STREAK'],[m.conceded,'LIVES LOST']],detail:`${m.difficulty} striker · wave ${Math.max(1,Math.ceil(m.round/5))} reached · record ${app.save.survivalRecords[m.difficulty]} saves`};
    return null;
  }
  function arcadeRecords(app){
    const s=app.save;
    return `<h2>Arcade records</h2><div class="arcade-records">${[['Crossbar Circuit',s.crossbarRecords,'pts'],['Keeper Survival',s.survivalRecords,'saves'],['Target Rush',s.rushRecords,'pts']].map(([name,records,unit])=>`<div class="arcade-record"><h3>${name}</h3><div class="stats">${Object.entries(records).map(([d,n])=>`<div><b>${n}</b><small>${d.toUpperCase()} · ${unit}</small></div>`).join('')}</div></div>`).join('')}</div>`;
  }
  Object.assign(U,{arcadeMenu,arcadeHud,arcadeResult,arcadeRecords});
})(window);
