(function(root){
  'use strict';
  const P=root.Panic,U=P.UI,{esc,btn}=U;
  function clubBadge(value){
    const club=P.normalizeClub(value);
    return `<span class="team-crest crest-${club.crest}" style="--club-primary:${club.home.primary};--club-secondary:${club.home.secondary}" aria-hidden="true"><b>${esc(club.shortName)}</b></span>`;
  }
  function clubSummary(save){
    return `<section class="club-banner">${clubBadge(save.club)}<div><span class="eyebrow">YOUR CLUB</span><h2>${esc(save.club.name)}</h2><p>Your name. Your colours. Your next trophy.</p><small>${save.clubGoals.length}/${P.clubObjectives.length} club challenges completed</small></div><div class="actions club-links">${btn('MY CLUB & KIT DESIGNER →','club','secondary')}${btn('CHALLENGES →','club-challenges','primary')}</div></section>`;
  }
  function club(app){
    const s=app.save,t=app.clubDraft||s.club,slot=app.clubKitTab||t.activeKit,k=t[slot];
    const textField=(key,label,max)=>`<label class="field">${label}<input type="text" data-club="${key}" maxlength="${max}" value="${esc(t[key])}" autocomplete="off" spellcheck="false" required></label>`;
    return U.page('Make it your club.','MY CLUB',`<p>Design your identity for free. Your team name appears on the scoreboard, in results and around the stadium.</p>
      <div class="club-editor"><section class="panel club-fields" aria-label="Club details"><span class="eyebrow">01 / CLUB IDENTITY</span><h2>A name to play for.</h2>
        <div class="club-field-grid">${textField('name','Team name · up to 24 characters',24)}${textField('shortName','Scoreboard initials · up to 4',4)}${textField('shirtName','Name on shirt · up to 12',12)}
        <label class="field">Shirt number · 0–99<input data-club="number" type="number" inputmode="numeric" min="0" max="99" step="1" value="${t.number}" required></label></div>
        <label class="field">Club crest<select data-club="crest">${[['shield','Shield'],['round','Roundel'],['diamond','Diamond']].map(([v,n])=>`<option value="${v}" ${t.crest===v?'selected':''}>${n}</option>`).join('')}</select></label>
        <label class="field">Play as<select data-club="playerGender" aria-describedby="squad-choice-help">${[['boys','Boys'],['girls','Girls']].map(([v,n])=>`<option value="${v}" ${P.playerGender(t)===v?'selected':''}>${n}</option>`).join('')}</select></label>
        <small id="squad-choice-help">Save to change player names and appearances on both teams, including resumed matches. Your custom shirt name stays yours.</small>
        <div class="club-id-preview"><span id="club-badge-preview">${clubBadge(t)}</span><div><strong id="club-name-preview">${esc(t.name)}</strong><small id="club-identity-preview">${esc(t.shirtName)} · #${t.number}</small></div></div>
        <small>Goalkeepers wear number 1. Your chosen number belongs to the penalty taker.</small>
      </section>
      <section class="panel kit-studio" aria-label="Shirt designer"><span class="eyebrow">02 / KIT DESIGNER</span><h2>Wear your colours.</h2>
        <nav class="tabs kit-tabs" aria-label="Choose kit to edit">${[['home','Home'],['away','Away'],['keeper','Goalkeeper']].map(([key,label])=>btn(label,'club-kit',slot===key?'selected':'',`data-value="${key}" aria-pressed="${slot===key}"`)).join('')}</nav>
        <canvas id="club-preview" width="640" height="340" role="img" aria-label="Live front and back preview of your ${slot} shirt"></canvas>
        <div class="kit-colours"><label class="field">Main colour<input type="color" data-kit="primary" value="${k.primary}"></label><label class="field">Detail colour<input type="color" data-kit="secondary" value="${k.secondary}"></label><label class="field">Pattern<select data-kit="pattern">${P.kitPatterns.map(([v,n])=>`<option value="${v}" ${k.pattern===v?'selected':''}>${n}</option>`).join('')}</select></label></div>
        <div class="kit-presets" aria-label="Free design presets">${P.clubPresets.map((p,i)=>btn(`<span class="palette" style="--main:${p.primary};--detail:${p.secondary}"></span>${p.name}`,'club-preset','',`data-index="${i}" aria-label="Apply ${p.name} colours and ${p.pattern} pattern"`)).join('')}</div>
        <label class="check"><input type="checkbox" data-club="custom" ${t.custom?'checked':''}> Wear my custom kits</label>
        <small id="club-kit-state">${kitState(t)}</small>
        <div class="accessory-link"><small>Complete your look with headbands, wraps, sleeves and captain’s armbands.</small>${btn('SAVE & CHOOSE ACCESSORIES →','accessories','secondary')}</div>
      </section></div>
      <div class="club-save-bar"><div><strong>Ready for matchday?</strong><small id="club-save-state">${app.clubDirty?'Unsaved changes — preview only.':'All designs are free. Changes apply to your next new run.'}</small><p id="club-error" role="alert"></p></div><div class="actions">${btn('SAVE CLUB & KIT','save-club','primary')}${btn('PLAY A MATCH →','club-play','secondary')}</div></div>
      <div id="club-squad">${U.mySquad(t)}</div><section id="club-challenges" aria-label="Club challenges">${clubChallenges(app)}</section>`);
  }
  const challengeGroups=[...new Set(P.clubObjectives.map(o=>o.group))];
  const challengeFilters=['All',...challengeGroups,'Completed'];
  function clubChallenges(app){
    const s=app.save,filter=challengeFilters.includes(app.challengeFilter)?app.challengeFilter:'All';
    const list=P.clubObjectives.filter(o=>filter==='All'||filter==='Completed'&&s.clubGoals.includes(o.id)||o.group===filter);
    const card=o=>{
      const n=P.objectiveProgress(s,o),paid=s.clubGoals.includes(o.id),oldCompletion=paid&&n<o.target;
      const career=o.play.mode==='career',locked=career&&o.play.stage!==undefined&&s.career<o.play.stage;
      const actionText=career&&(locked||o.play.stage===undefined)?'OPEN CAREER →':o.play.mode==='crossbar'?'PLAY CROSSBAR CIRCUIT →':o.play.mode==='survival'?'PLAY KEEPER SURVIVAL →':o.play.mode==='rush'?'PLAY TARGET RUSH →':o.play.mode==='challenge'?'PLAY KEEPER CHALLENGE →':'PLAY SHOOTOUT →';
      const streak=['five-wins','ten-wins'].includes(o.id)?`Current streak: ${s.stats.currentWinStreak}. Best: ${s.stats.bestWinStreak}.`:'';
      return `<article class="card ${paid?'objective-done':''}" data-objective="${o.id}"><div class="objective-heading"><span class="badge">${paid?'✓ COMPLETE':n===o.target?'READY · FINISH A RUN':'IN PROGRESS'}</span><span class="challenge-tier tier-${o.tier.toLowerCase()}">${o.tier}</span></div><h3>${o.name}</h3><p>${o.description}</p><div class="objective-count"><b>${paid?'Completed':`${n.toLocaleString()} / ${o.target.toLocaleString()}`}</b><span>${paid?'Reward earned':`◉ ${o.coins} + ${o.xp} XP`}</span></div><div class="progress" role="progressbar" aria-label="${o.name}${paid?' completed':''}" aria-valuemin="0" aria-valuemax="${o.target}" aria-valuenow="${paid?o.target:n}"><span style="width:${paid?100:n/o.target*100}%"></span></div>${oldCompletion?'<small>Previous target completed. Your reward is kept.</small>':streak?`<small>${streak}</small>`:''}${paid?'':btn(actionText,'challenge-play','secondary',`data-id="${o.id}"`)}${locked?'<small>Unlock stage 5 to attempt this challenge.</small>':''}</article>`;
    };
    return `<div class="section-line"><div><span class="eyebrow">03 / CLUB CHALLENGES</span><h2>Earn your place among the best.</h2></div><span>${s.clubGoals.length}/${P.clubObjectives.length} COMPLETE</span></div>
      <p>${P.clubObjectives.length} challenges across Club, Elite and Legend tiers, including six Arcade objectives. Win under pressure, build streaks and master the harder difficulties.</p><p class="micro">Rewards are automatic and paid once. Only completed runs count; practice and the intro are excluded. Existing totals, records and earned rewards are kept. New skill counters track runs finished since this update.</p>
      <nav class="tabs challenge-tabs" aria-label="Filter club challenges">${challengeFilters.map(f=>btn(f,'challenge-filter',filter===f?'selected':'',`data-value="${f}" aria-pressed="${filter===f}"`)).join('')}</nav>
      ${list.length?challengeGroups.filter(group=>list.some(o=>o.group===group)).map(group=>`<div class="challenge-group"><h3>${group}</h3><div class="card-grid club-objectives">${list.filter(o=>o.group===group).map(card).join('')}</div></div>`).join(''):'<div class="panel"><h3>Your first challenge awaits.</h3><p>Complete a challenge to add it to this collection.</p></div>'}`;
  }
  function kitState(t){return t.custom?`${t.activeKit==='away'?'Away':'Home'} kit selected for new runs. The goalkeeper uses your keeper design.`:'Wearing your purchased locker kits. Edit a colour or apply a preset to wear your own design.';}
  Object.assign(U,{club,clubBadge,clubSummary,kitState,clubChallenges,challengeFilters});
})(window);
