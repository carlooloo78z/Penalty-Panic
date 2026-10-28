(function(root){
  'use strict';
  const defaultSquad=Object.freeze(['Jamie Hart','Leo Bennett','Kai Morgan','Alex Mercer','Theo Brooks']);
  const girlsSquad=Object.freeze(['Sophie Hart','Mia Bennett','Zoe Morgan','Ava Mercer','Ella Brooks']);
  const playerGender=club=>club?.playerGender==='girls'?'girls':'boys';
  const positions=Object.freeze(['Goalkeeper','Defender','Left wing','Striker','Right wing']);
  const first=['Luca','Mateo','Noah','Rafael','Hugo','Elias','Nico','Oscar','Felix','Diego','Adam','Emil','Marco','Dario','Andre','Jonas','Ivan','Tomas','Enzo','Milan','Ruben','Isaac','Owen','Samir','Luis','Finn','Remy','Arlo','Bruno','Max','Yusuf','Tariq'];
  const firstGirls=['Lucia','Sofia','Nora','Rafaela','Hannah','Elisa','Nina','Olivia','Freya','Diana','Amelia','Emilia','Marta','Daria','Andrea','Johanna','Isabella','Tessa','Eva','Mila','Ruby','Iris','Orla','Samira','Luisa','Fiona','Romy','Aria','Bianca','Maya','Yasmin','Talia'];
  const last=['Vega','Costa','Lind','Moreau','Silva','Navarro','Keller','Rossi','Voss','Almeida','Duarte','Laurent','Reed','Santos','Novak','Marin','Beck','Fontana','Russo','Weber','Blake','Kovac','Solis','Berg','Torres','Meyer','Campos','Dunn','Fischer','Valente','Khan','Aziz'];
  const name=(value,fallback)=>typeof value==='string'?Array.from(value.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,'').replace(/\s+/g,' ').trim()).slice(0,28).join('')||fallback:fallback;
  function squadNames(club={},gender=playerGender(club)){
    const defaults=gender==='girls'?girlsSquad:defaultSquad;
    // Older saves have an untagged boys' squad. Keep each squad when switching.
    const activeGender=club.squadGender==='girls'?'girls':'boys';
    const stored=activeGender===gender&&Array.isArray(club.squad)?club.squad:Array.isArray(club.squads?.[gender])?club.squads[gender]:null;
    const names=defaults.map((fallback,i)=>name(stored?.[i],fallback));
    if(club.shirtName&&club.shirtName.toUpperCase()!=='PANIC')names[3]=name(club.shirtName,names[3]);
    return names;
  }
  function opponentNames(opponent={},gender='boys'){
    const given=gender==='girls'?firstGirls:first;
    let seed=Array.from(opponent.name||'Panic Athletic').reduce((v,c)=>(Math.imul(v,31)+c.charCodeAt(0))>>>0,7);
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
    const used=new Set(),names=[];
    for(let i=0;i<5;i++){let n;do{n=given[(random()>>>16)%given.length]+' '+last[(random()>>>16)%last.length];}while(used.has(n));used.add(n);names.push(n);}
    return names;
  }
  const buildRoster=(team,opponent)=>[...squadNames(team),...opponentNames(opponent,playerGender(team))];
  const validRoster=roster=>Array.isArray(roster)&&roster.length===10&&roster.every(n=>typeof n==='string'&&n.length>0&&Array.from(n).length<=28&&name(n,'')===n);
  const playerName=(g,id)=>g.roster?.[id]||buildRoster(g.team,g.opponent)[id]||'Player';
  const playerNumber=(g,id)=>id===3?g.team?.number??10:[1,4,7,10,11][id%5];
  const api={defaultSquad,girlsSquad,playerGender,squadPositions:positions,squadNames,opponentNames,buildRoster,validRoster,playerName,playerNumber};
  Object.assign(root.Panic||={},api);if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
