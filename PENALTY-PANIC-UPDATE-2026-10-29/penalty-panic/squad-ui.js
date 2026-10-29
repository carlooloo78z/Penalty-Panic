(function(root){
  'use strict';
  const P=root.Panic,U=P.UI,{esc}=U;
  function rows(g,team){return Array.from({length:5},(_,slot)=>{const id=team*5+slot;return `<li><b>${P.playerNumber(g,id)}</b><span>${esc(P.playerName(g,id))}<small>${P.squadPositions[slot]}</small></span></li>`;}).join('');}
  U.squads=g=>`<details class="match-squads"><summary>TEAM SHEETS / PLAYER NAMES</summary><div><section><h3>${esc(g.team.name)}</h3><ul>${rows(g,0)}</ul></section><section><h3>${esc(g.opponent.name)}</h3><ul>${rows(g,1)}</ul></section></div><p>Your squad keeps its names. Each opposing club has its own players.</p></details>`;
  U.mySquad=club=>{const g={team:club,opponent:{},roster:P.buildRoster(club,{})};return `<section class="panel home-squad"><span class="eyebrow">YOUR STARTING FIVE / ${P.playerGender(club).toUpperCase()}</span><h2>Meet your squad.</h2><canvas id="squad-preview" width="900" height="240" role="img" aria-label="${P.playerGender(club)==='girls'?'Girls':'Boys'} squad preview, including your goalkeeper and four outfield players"></canvas><ul>${rows(g,0)}</ul><p>These names stay with your club. Your chosen shirt name belongs to the striker.</p></section>`;};
})(window);
