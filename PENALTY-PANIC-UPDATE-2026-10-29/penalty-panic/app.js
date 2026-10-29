(function(root){
  'use strict';
  const P=root.Panic,U=P.UI,$=s=>document.querySelector(s);
  class App {
    constructor(){
      let storage;try{storage=root.localStorage;}catch{storage={getItem(){throw Error('Unavailable');}};}
      this.accounts=new P.AccountStore(storage);this.store=this.accounts.store;this.save=this.store.data;this.sim=null;this.paused=false;this.page='menu';this.shopTab='Football';this.previewId='0-0';this.visualTime=0;this.lastSave=0;this.modal=$('#modal');this.modalKind=null;
      this.renderer=new P.Renderer($('#stadium'));this.audio=new P.GameAudio(()=>this.save.settings);
      this.commentary=new P.GameCommentary(()=>this.save.settings,text=>{$('#commentary-text').textContent=text;$('#commentary').hidden=!text;});this.input=new P.GameInput(this,$('#stadium'));
      this.modal.addEventListener('cancel',e=>{e.preventDefault();this.closeDialog();});
      document.addEventListener('click',e=>this.click(e));document.addEventListener('change',e=>this.change(e));
      document.addEventListener('submit',e=>{if(e.target.id==='account-create-form'){e.preventDefault();this.createAccount();}if(e.target.id==='account-rename-form'){e.preventDefault();this.renameAccount();}});
      document.addEventListener('input',e=>{if(e.target.dataset.club||e.target.dataset.kit)this.editClub(e);else if(e.target.id==='field-shot-power'||['master','sfx','commentaryVolume'].includes(e.target.dataset.setting))this.change(e);});
      $('#import-file').addEventListener('change',e=>this.importFile(e.target.files[0]));
      root.addEventListener('pagehide',()=>{this.commentary.stop();this.checkpoint();});
      this.resizeObserver=new ResizeObserver(()=>{this.renderer.resize();this.menuRenderer?.resize();});this.resizeObserver.observe($('#stadium'));
      root.addEventListener('resize',()=>{this.renderer.resize();this.menuRenderer?.resize();});
      if(this.save.active&&!P.validSnapshot(this.save.active)){this.save.active=null;this.store.write();}
      this.navigate('menu');
      if(this.store.status==='migrated')this.toast('Your progress has been upgraded. Welcome back.');
      if(this.store.blocked)this.toast('Your existing save needs attention. Export it from Settings before resetting.');
      if(this.accounts.blocked)this.toast('Your account list needs attention. Open Accounts for details.');
      this.last=performance.now();requestAnimationFrame(t=>this.frame(t));
    }
    header(){
      $('#coins').textContent=`◉ ${this.save.coins.toLocaleString()}`;$('#level').textContent=`LEVEL ${P.level(this.save)} · ${this.save.xp%250}/250 XP`;
      $('#player-title').textContent=this.save.club.name.toUpperCase();$('#save-status').textContent=this.store.label();
      $('#account-name').textContent=this.accounts.current.name;$('#account-button').setAttribute('aria-label',`Accounts. Playing as ${this.accounts.current.name}`);
      document.body.classList.toggle('reduce-motion',this.save.settings.reducedMotion);
    }
    persist(){this.store.write();this.header();}
    openAccounts(){
      if(this.sim){this.paused=true;this.input.clear();this.checkpoint();if(!this.store.ok&&!this.store.blocked){this.openDialog('pause');this.toast('Your progress could not be saved. Export it in Settings before switching accounts.');return;}}
      this.navigate('accounts');
    }
    accountError(error){const el=$('#account-dialog-error')||$('#account-error');if(el)el.textContent=error.message;else this.toast(error.message);}
    useAccount(){
      this.store=this.accounts.store;this.save=this.store.data;
      if(this.save.active&&!P.validSnapshot(this.save.active)){this.save.active=null;this.store.write();}
      this.pendingImport=null;this.pendingAccountId=null;this.pendingCompetition=null;this.pendingLeague=null;
      this.clubDraft=null;this.lineupsId=null;this.resultAnimation=null;this.lastSave=0;this.shopTab='Football';this.previewId='0-0';this.challengeFilter='All';
      this.navigate('menu');this.commentary.syncSettings();this.announce(`Playing as ${this.accounts.current.name}.`);
      this.toast(`Welcome, ${this.accounts.current.name}.`);
    }
    createAccount(){
      if(this.page!=='accounts')return;
      try{this.accounts.create($('#account-create-name').value,$('#account-create-gender').value);this.useAccount();}catch(error){this.accountError(error);$('#account-create-name')?.focus();}
    }
    renameAccount(){
      if(this.modalKind!=='account-rename')return;
      try{this.accounts.rename(this.pendingAccountId,$('#account-rename-name').value);this.pendingAccountId=null;this.navigate('accounts');this.toast('Account name saved.');}catch(error){this.accountError(error);}
    }
    announce(text){$('#announcer').textContent=text;}
    toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');this.toastUntil=performance.now()+3500;}
    navigate(page){
      this.commentary.reset();
      if(page==='club'){this.clubDraft=P.normalizeClub(this.save.club);this.clubKitTab=this.clubDraft.activeKit;this.clubDirty=false;}
      if(this.menuRenderer)this.resizeObserver.unobserve(this.menuRenderer.canvas);
      this.closeDialog(false);this.clearVictory();this.input.clear();this.sim=null;this.paused=false;this.page=page;
      document.body.classList.remove('playing','on-pitch','aiming-field');$('#play').hidden=true;$('#screen').hidden=false;
      const render=U[page]||U.menu;$('#screen').innerHTML=render(this);this.header();this.refreshPreviews();
      this.menuRenderer=page==='menu'?new P.Renderer($('#menu-canvas')):null;
      if(this.menuRenderer)this.resizeObserver.observe($('#menu-canvas'));
      if(page==='result'){this.resultAnimation=performance.now();this.announce(`Full time. ${this.save.lastResult?.score}. Rewards saved.`);}
      root.scrollTo({top:0,behavior:'instant'});
    }
    start(mode,options={}){
      if(mode==='competition'&&!P.competitionMatch(this.save.competitions[options.kind])){this.navigate(options.kind||'champions');return;}
      if(mode==='league'&&!P.leagueMatch(this.save.league)){this.navigate('league');return;}
      if(this.menuRenderer)this.resizeObserver.unobserve(this.menuRenderer.canvas);
      this.closeDialog(false);this.clearVictory();this.input.clear();this.paused=false;this.page='game';this.sim=new P.Simulation(this.save,mode,{regulation:true,...options});this.audio.unlock();this.menuRenderer=null;
      this.commentary.unlock();this.commentary.reset(this.sim.g);
      document.body.classList.add('playing');$('#screen').hidden=true;$('#play').hidden=false;this.renderer.resize();this.process();this.renderPlay();this.checkpoint();
      $('#stadium').focus({preventScroll:true});root.scrollTo({top:0,behavior:'instant'});
    }
    resumeSaved(){
      const sim=P.Simulation.restore(this.save.active);if(!sim){this.save.active=null;this.persist();this.toast('That run could not be restored. Your coins and career are safe.');return;}
      if(sim.g.mode==='competition'&&P.competitionMatch(this.save.competitions[sim.g.competition.kind])?.id!==sim.g.id){this.save.active=null;this.persist();this.navigate(sim.g.competition.kind);this.toast('That fixture is already finished. Your campaign is up to date.');return;}
      if(sim.g.mode==='league'&&P.leagueMatch(this.save.league)?.id!==sim.g.id){this.save.active=null;this.persist();this.navigate('league');this.toast('That fixture is already finished. Your campaign is up to date.');return;}
      if(!sim.g.team)sim.g.team=P.normalizeClub(this.save.club);this.refreshMatchSquad(sim.g);this.commentary.reset(sim.g,true);
      if(sim.g.field)sim.g.field.assists=this.save.settings.matchAssists;
      this.closeDialog(false);this.sim=sim;this.page='game';this.paused=false;this.menuRenderer=null;document.body.classList.add('playing');$('#screen').hidden=true;$('#play').hidden=false;this.renderer.resize();this.renderPlay();this.pause();
    }
    checkpoint(){
      if(this.sim&&!this.sim.g.complete)this.save.active=this.sim.snapshot();
      this.persist();this.lastSave=this.sim?.g.time||0;
    }
    process(){
      if(!this.sim)return;
      const events=this.sim.events.splice(0);
      for(const e of events){
        const g=this.sim.g;
        this.commentary.event(e,g);
        if(e.type==='kick')this.audio.play('kick');
        if(e.type==='field-goal'){this.audio.play(e.team===0?'goal':'concede');this.announce(g.field.message);}
        if(e.type==='field-save')this.audio.play('gloves');
        if(e.type==='field-save-ready')this.announce('Your save! 1.45 seconds. Click the blue target, or use W high / S low with A left / D right.');
        if(e.type==='field-save-result')this.announce(g.field.message);
        if(e.type==='field-kick')this.audio.play('kick');
        if(e.type==='field-foul'){this.audio.play('whistle');this.announce(g.field.message);}
        if(e.type==='field-view'){this.input.clear();this.renderPlay();$('#stadium').focus({preventScroll:true});if(g.field.finish||g.field.saveWindow)root.scrollTo({top:0,behavior:'instant'});}
        if(e.type==='field-end'){this.input.clear();this.audio.play('post');this.announce('Full time.');}
        if(e.type==='phase'){this.renderPlay();this.announce(`${g.role==='shoot'?'Your shot':'Your save'}. ${g.feedback}`);}
        if(e.type==='resolved'){
          const sound=e.event==='goal'?(g.role==='shoot'?'goal':'concede'):e.event==='save'?(g.role==='keep'?'save':'gloves'):e.event;
          if(e.event==='goal')this.audio.play('net');
          if(e.event==='save'&&g.role==='keep')this.audio.play('gloves');
          this.audio.play(sound);this.renderPlay();this.announce(`${g.feedback}. ${g.detail}`);
          if(g.crossbar?.combo)this.audio.play('goal');
        }
        if(e.type==='complete'){
          if(g.mode==='tutorial'){this.save.tutorialDone=true;this.save.active=null;this.persist();}
          else {
            const rewards=P.reward(this.save,g);
            if(rewards){
              this.save.lastResult={...this.sim.snapshot(),rewards};this.save.active=null;this.persist();
              if(g.result==='win'){this.audio.play('victory');this.beginVictory(g);}
            }
          }
          this.renderPlay();
        }
      }
      if(events.length&&!this.sim.g.complete)this.checkpoint();
    }
    renderPlay(){if(!this.sim)return;const pitch=this.sim.g.field&&!this.sim.g.field.pensStarted&&!this.sim.g.field.finish&&!this.sim.g.field.saveWindow&&!this.sim.g.field.celebration;document.body.classList.toggle('on-pitch',!!pitch);document.body.classList.toggle('aiming-field',!!(this.sim.g.field?.finish||this.sim.g.field?.saveWindow||this.sim.g.field?.celebration));$('#stadium').setAttribute('aria-label',pitch?'Five-a-side pitch. Move with WASD or arrow keys. Q passes, E switches, X tackles. Hold and release Space for a 2.5-second first-person aiming window.':'Goal aiming area. Click to lock a shot target or dive to that point. Use arrow keys to aim. Keeper controls are below.');$('#hud').innerHTML=U.hud(this);$('#controls').innerHTML=U.controls(this);if(this.lineupsId!==this.sim.g.id){$('#lineups').innerHTML=U.squads(this.sim.g);this.lineupsId=this.sim.g.id;}$('#hud').hidden=$('#controls').hidden=!!this.victory;this.header();this.highlightDive();this.renderer.resize();}
    beginVictory(g){
      if(this.victory||g.result!=='win'||this.save.lastResult?.id!==g.id)return;
      const reduced=this.save.settings.reducedMotion||root.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.victory={time:0,duration:reduced?2:6.4,reduced,cheered:false};this.input.clear();
      this.gameCanvasLabel=$('#stadium').getAttribute('aria-label');
      $('#stadium').setAttribute('aria-label','Your team celebrating a shootout victory. Use Skip Cutscene to view the results.');
      $('#stadium').setAttribute('tabindex','-1');
      const club=g.team||this.save.club,champions=g.mode==='competition'&&this.save.competitions[g.competition.kind]?.champion===0||g.mode==='career'&&g.stage===P.stages.length-1||g.mode==='league'&&g.league.stage==='final';
      $('#victory-club').textContent=club.name;
      $('#victory-title').textContent=champions?'CHAMPIONS':'VICTORY';
      $('#victory-score').textContent=g.score;
      $('#victory-opponent').textContent=`vs ${g.opponent.name}`;
      $('#victory-stage').textContent=g.mode==='competition'?(g.competition.kind==='premier'?'PREMIER LEAGUE':'CHAMPIONS LEAGUE'):g.mode==='league'?'CHAMPIONS LEAGUE':'FULL TIME';$('#victory-progress').style.transform='scaleX(0)';
      $('#victory-caption').classList.toggle('visible',reduced);
      $('#victory-overlay').hidden=false;$('#hud').hidden=$('#controls').hidden=true;
      document.body.classList.add('celebrating');this.renderer.resize();
      $('[data-action="skip-victory"]').focus({preventScroll:true});
      this.announce(`${club.name} win ${g.score}. Press Space, Enter or Escape to skip the celebration.`);
    }
    clearVictory(){
      if(this.victory){$('#stadium').setAttribute('aria-label',this.gameCanvasLabel);$('#stadium').setAttribute('tabindex','0');}
      this.victory=null;$('#victory-overlay').hidden=true;$('#victory-caption').classList.remove('visible');
      document.body.classList.remove('celebrating');$('#hud').hidden=$('#controls').hidden=false;
    }
    finishVictory(){
      if(!this.victory)return;
      this.navigate('result');
      $('#screen').querySelector('[data-action="champions"],[data-action="premier"],[data-action="league"],[data-action="next-career"],[data-action="rematch"]')?.focus({preventScroll:true});
    }
    highlightDive(){
      const p=this.sim?.g.divePreview;
      document.querySelectorAll('[data-dive]').forEach(b=>{const [x,y]=b.dataset.dive.split(',').map(Number);const active=p&&Math.abs(p.x-x)<35&&Math.abs(p.y-y)<30;b.classList.toggle('active',!!active);b.setAttribute('aria-pressed',String(!!active));});
    }
    next(){
      if(this.victory){if(!this.paused)this.finishVictory();return;}
      if(this.sim?.g.phase==='interval'&&!this.paused){this.input.clear();this.sim.next();this.process();$('#stadium').focus({preventScroll:true});return;}
      if(!this.sim||this.paused||this.sim.g.phase!=='feedback')return;
      const g=this.sim.g;
      if(g.complete){
        if(g.mode==='tutorial'){this.navigate('menu');this.toast('You know the spot. Try your first match!');}
        else this.navigate('result');return;
      }
      this.input.clear();this.sim.next();this.process();
    }
    repeat(){
      if(!this.sim||this.paused||!this.sim.isPractice()||this.sim.g.phase!=='feedback')return;
      this.input.clear();this.sim.next(true);this.process();
    }
    passField(){
      if(!this.sim||this.paused||this.modal.open||this.victory)return false;
      const restart=!!this.sim.g.field?.setPiece;
      if(!P.fieldPass(this.sim.g))return false;
      this.audio.play('kick');
      this.commentary.event({type:'field-kick'},this.sim.g);
      if(restart){this.input.clear();this.renderPlay();this.checkpoint();$('#stadium').focus({preventScroll:true});}
      return true;
    }
    restart(){if(!this.sim)return;const g=this.sim.g;if(g.mode==='competition'){this.start('competition',{kind:g.competition.kind});return;}if(g.mode==='league'&&g.complete){this.navigate('league');return;}this.start(g.mode,{stage:g.stage,drill:g.drill});}
    newLeague(){
      const selected=$('#league-level')?.value||this.save.league?.difficulty||this.save.settings.difficulty;
      const difficulty=['easy','normal','hard'].includes(selected)?selected:'normal';
      if(this.save.active?.mode==='league')this.save.active=null;
      this.save.league=P.createLeague(this.save.club,difficulty);this.persist();this.navigate('league');
    }
    newCompetition(kind){
      if(!['champions','premier'].includes(kind))return;
      const selected=this.pendingCompetition?.difficulty||$('#competition-level')?.value||this.save.settings.difficulty;
      const difficulty=['easy','normal','hard'].includes(selected)?selected:'normal';
      if(this.save.active?.competition?.kind===kind)this.save.active=null;
      this.save.competitions[kind]=P.createCompetition(kind,this.save.club,difficulty);this.pendingCompetition=null;this.persist();this.navigate(kind);
    }
    pause(kind='pause'){
      this.commentary.stop();
      if(!this.sim||this.modal.open)return;
      this.paused=true;this.input.clear();this.checkpoint();this.openDialog(kind);
    }
    openDialog(kind){
      this.commentary.stop();
      if(this.sim){this.paused=true;this.input.clear();this.checkpoint();}
      if(!this.modal.open)this.returnFocus=document.activeElement;
      this.modalKind=kind;
      let content='';
      if(kind==='account-rename')content=U.accountRename(this);
      if(kind==='account-delete')content=U.accountDelete(this);
      if(kind==='competition-reset')content=`<h2 id="dialog-title">Restart this competition?</h2><p>This replaces this campaign and its unfinished fixture. Your coins, cosmetics and earned titles stay saved. The other competition stays saved too.</p><div class="actions">${U.btn('Keep my campaign','close-dialog','primary')}${U.btn('Restart campaign','confirm-competition','secondary')}</div>`;
      if(kind==='pause')content=`<span class="eyebrow">TAKE A BREATH</span><h2 id="dialog-title" class="pause-title">Pressure, paused.</h2><p>Your next moment can wait. Your run is saved.</p><div class="pause-buttons">${U.btn('RESUME →','resume','primary')}${U.btn('Settings','settings','secondary')}${U.btn('Controls & help','help','secondary')}${U.btn('Restart run','restart','secondary')}${U.btn('Save & main menu','leave','secondary')}</div>`;
      if(kind==='settings')content=U.settings(this);
      if(kind==='league-reset')content=`<h2 id="dialog-title">Start a new campaign?</h2><p>This replaces your current Champions League fixtures. Your coins, kit rewards and trophy collection stay saved.</p><div class="actions">${U.btn('Keep playing','close-dialog','primary')}${U.btn('Start fresh','confirm-league','secondary')}</div>`;
      if(kind==='help')content=U.help();
      if(kind==='coins')content=`<h2 id="dialog-title">Make your coins count.</h2><p>PANIC COINS are fictional rewards earned by playing. Spend them on kits and accessories in the locker room, abilities in Player Development, or permanent passing, stamina and goalkeeper facilities in the Clubhouse.</p><div class="stats"><div><b>8</b><small>PER GOAL</small></div><div><b>12</b><small>PER SAVE</small></div><div><b>60</b><small>VICTORY BONUS</small></div></div><p>Finish any run for 20 coins. New achievements earn 25 each. Practice is free and awards no coins.</p>${U.btn('OPEN LOCKER ROOM','open-shop','primary')}`;
      if(kind==='reset')content=`<h2 id="dialog-title">Reset ${U.esc(this.accounts.current.name)}?</h2><p>This removes this account's coins, purchases, records and career. Other accounts keep their progress. Export a backup first if you want to keep it.</p><div class="actions">${U.btn('Keep my progress','settings','primary')}${U.btn('Export backup','export','secondary')}${U.btn('Yes, reset this account','confirm-reset','danger')}</div>`;
      if(kind==='import-confirm')content=`<h2 id="dialog-title">Restore this save?</h2><p>This replaces progress for ${U.esc(this.accounts.current.name)} only. Other accounts keep their progress. You can export this account's progress first.</p><div class="actions">${U.btn('Export current save','export','secondary')}${U.btn('Replace and restore','confirm-import','primary')}${U.btn('Cancel','settings','quiet')}</div>`;
      this.modal.innerHTML=`<div class="dialog-tools">${this.sim&&kind!=='pause'?U.btn('← Pause menu','pause-view','quiet'):'<span></span>'}${U.btn('Close ✕','close-dialog','quiet','aria-label="Close dialog"')}</div>${content}`;
      if(!this.modal.open)this.modal.showModal();
      const focus=this.modal.querySelector(kind==='pause'?'[data-action="resume"]':kind==='account-rename'?'#account-rename-name':kind==='account-delete'?'[data-action="close-dialog"].primary':'button,select,input');focus?.focus();
    }
    closeDialog(resume=true){
      if(this.modal.open)this.modal.close();this.modalKind=null;
      if(resume){this.paused=false;if(this.victory)$('[data-action="skip-victory"]').focus({preventScroll:true});else if(this.sim)$('#stadium').focus({preventScroll:true});else if(this.returnFocus?.isConnected)this.returnFocus.focus({preventScroll:true});}
    }
    async importFile(file){
      if(!file)return;if(file.size>2e6){this.toast('That file is too large.');return;}
      const accountId=this.accounts.current.id;
      try{const text=await file.text();if(accountId!==this.accounts.current.id)return;const decoded=P.decode(text);if(['unsupported','invalid','new'].includes(decoded.status))throw Error('That is not a supported save file.');this.pendingImport=text;this.openDialog('import-confirm');}catch(e){this.toast(e.message);}finally{$('#import-file').value='';}
    }
    exportSave(){
      this.checkpoint();this.download(this.store.exportText(),`penalty-panic-${this.accounts.current.id}-save.json`);
    }
    download(text,name){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    change(e){
      if(e.target.dataset.club||e.target.dataset.kit){this.editClub(e);return;}
      const key=e.target.dataset.setting;
      if(key){
        let value=e.target.type==='checkbox'?e.target.checked:e.target.value;if(['master','sfx','commentaryVolume','trainingSpeed'].includes(key))value=Number(value);
        this.save.settings[key]=value;
        if(['master','mute','commentary','commentaryVolume','commentaryCaptions'].includes(key))this.commentary.syncSettings();
        if(key==='matchAssists'&&this.sim?.g.field){this.sim.g.field.assists=value;this.checkpoint();this.renderPlay();}
        this.persist();
        if(key==='difficulty'&&!this.sim){
          for(const [mode,records,unit]of [['rush',this.save.rushRecords,'points'],['crossbar',this.save.crossbarRecords,'points'],['survival',this.save.survivalRecords,'saves']]){
            const best=$(`#${mode}-best`);if(best)best.textContent=`Best: ${records[value]} ${unit} on ${value}`;
          }
        }
        if(this.sim&&['assistance','controlPreset','targets'].includes(key))this.renderPlay();
      }
      if(e.target.id==='curl'&&this.sim)this.sim.g.curl=Number(e.target.value);
      if(e.target.id==='field-shot-power'&&this.sim?.g.field?.finish)this.sim.g.field.finish.power=P.clamp(Number(e.target.value),.25,1);
    }
    click(e){
      const dive=e.target.closest('[data-dive]');if(dive){this.input.selectDive(...dive.dataset.dive.split(',').map(Number));return;}
      const b=e.target.closest('[data-action]');if(!b||b.disabled)return;
      const action=b.dataset.action;this.audio.unlock();this.commentary.unlock();
      if(action==='accounts'){this.openAccounts();return;}
      if(['settings','help','coins'].includes(action)){this.openDialog(action);return;}
      if(['menu','career','practice','shop','profile','upgrades','club','league','champions','premier','trophies','clubhouse'].includes(action)){if(this.sim){this.pause();return;}this.navigate(action);return;}
      switch(action){
        case 'account-create':e.preventDefault();this.createAccount();break;
        case 'account-switch':try{this.accounts.switchTo(b.dataset.id);this.useAccount();}catch(error){this.accountError(error);}break;
        case 'account-rename':case 'account-delete':this.pendingAccountId=b.dataset.id;this.openDialog(action);break;
        case 'account-rename-confirm':e.preventDefault();this.renameAccount();break;
        case 'account-delete-confirm':
          if(this.modalKind!=='account-delete'||!this.pendingAccountId)break;
          try{this.accounts.remove(this.pendingAccountId);this.pendingAccountId=null;this.navigate('accounts');this.toast('Account deleted.');}catch(error){this.accountError(error);}break;
        case 'export-accounts':this.download(this.accounts.raw,'penalty-panic-account-list-backup.json');break;
        case 'skip-goal':if(this.sim&&!this.paused)P.fieldSkipCelebration(this.sim.g);break;
        case 'competition-new':{
          const kind=b.dataset.kind;if(!['champions','premier'].includes(kind))return;
          if(this.save.competitions[kind]&&!this.save.competitions[kind].finished){this.pendingCompetition={kind,difficulty:$('#competition-level')?.value||this.save.competitions[kind].difficulty};this.openDialog('competition-reset');}
          else this.newCompetition(kind);break;
        }
        case 'confirm-competition':if(this.pendingCompetition)this.newCompetition(this.pendingCompetition.kind);break;
        case 'competition-play':{
          const kind=b.dataset.kind,spec=P.competitionMatch(this.save.competitions[kind]);if(!spec)return;
          if(this.save.active?.id===spec.id)this.resumeSaved();else this.start('competition',{kind});break;
        }
        case 'field-restart':if(this.sim&&!this.paused)P.fieldRestart(this.sim.g);break;
        case 'field-aim':if(this.sim&&!this.paused){const [x,y]=b.dataset.point.split(',').map(Number);P.fieldFinishAim(this.sim.g,x,y);}break;
        case 'facility':
          if(this.page==='clubhouse'&&P.buyFacility(this.save,b.dataset.key,Number(b.dataset.level))){this.persist();this.navigate('clubhouse');this.toast('Facility upgraded. Ready for your next five-a-side match.');}break;
        case 'field-start':if(this.sim&&!this.paused){P.fieldStart(this.sim.g);U.updateField(this);$('#stadium').focus({preventScroll:true});}break;
        case 'field-pass':this.passField();break;
        case 'field-switch':if(this.sim&&!this.paused)P.fieldSwitch(this.sim.g);break;
        case 'field-tackle':if(this.sim&&!this.paused&&P.fieldTackle(this.sim.g))this.audio.play('gloves');break;
        case 'field-pens':this.next();break;
        case 'league-new':if(this.save.league&&!P.leagueState(this.save.league).done)this.openDialog('league-reset');else this.newLeague();break;
        case 'league-reset':this.openDialog('league-reset');break;
        case 'confirm-league':this.newLeague();break;
        case 'league-play':{
          const spec=P.leagueMatch(this.save.league);if(!spec)return;
          if(this.save.active?.id===spec.id)this.resumeSaved();else this.start('league');break;
        }
        case 'accessories':
          if(this.sim){this.pause();return;}
          if(this.page==='club'&&!this.saveClub())return;
          this.shopTab='Headband';this.previewId='8-1';this.navigate('shop');break;
        case 'club-challenges':
          if(this.sim){this.pause();return;}
          this.challengeFilter='All';this.navigate('club');$('#club-challenges').scrollIntoView({block:'start'});break;
        case 'challenge-filter':
          if(this.page!=='club'||!U.challengeFilters.includes(b.dataset.value))return;
          this.challengeFilter=b.dataset.value;$('#club-challenges').innerHTML=U.clubChallenges(this);$(`[data-action="challenge-filter"][data-value="${this.challengeFilter}"]`).focus();break;
        case 'challenge-play':{
          const objective=P.clubObjectives.find(o=>o.id===b.dataset.id);if(!objective||this.save.clubGoals.includes(objective.id)||!this.saveClub())return;
          const play=objective.play;
          if(play.mode==='career'&&(play.stage===undefined||this.save.career<play.stage)){this.navigate('career');break;}
          if(play.difficulty)this.save.settings.difficulty=play.difficulty;
          if(play.keeperLevel)this.save.settings.keeperLevel=play.keeperLevel;
          this.persist();this.start(play.mode,{stage:play.stage});break;
        }
        case 'save-club':this.saveClub();break;
        case 'club-play':if(this.saveClub())this.start('match');break;
        case 'club-kit':
          if(!['home','away','keeper'].includes(b.dataset.value))return;
          this.clubKitTab=b.dataset.value;if(this.clubKitTab!=='keeper')this.clubDraft.activeKit=this.clubKitTab;
          this.clubDirty=true;this.renderClub();break;
        case 'club-preset':{
          const p=P.clubPresets[Number(b.dataset.index)];if(!p)return;
          this.clubDraft[this.clubKitTab]={primary:p.primary,secondary:p.secondary,pattern:p.pattern};this.clubDraft.custom=true;this.clubDirty=true;this.renderClub();break;
        }
        case 'play':this.start('match');break;
        case 'challenge':this.start('challenge');break;
        case 'rush':this.start('rush');break;
        case 'crossbar':this.start('crossbar');break;
        case 'survival':this.start('survival');break;
        case 'bank-survival':if(this.sim&&!this.paused){this.sim.finishSurvival();this.process();}break;
        case 'tutorial':this.start('tutorial');break;
        case 'skip-tutorial':this.save.tutorialDone=true;this.save.active=null;this.persist();this.navigate('menu');break;
        case 'stage':this.start('career',{stage:Number(b.dataset.stage)});break;
        case 'practice-shoot':this.start('practice-shoot',{drill:$('#shoot-drill').value});break;
        case 'practice-keep':this.start('practice-keep',{drill:$('#keeper-drill').value});break;
        case 'resume-save':this.resumeSaved();break;
        case 'pause':this.pause();break;
        case 'pause-view':this.openDialog('pause');break;
        case 'close-dialog':case 'resume':this.closeDialog();break;
        case 'leave':this.checkpoint();this.navigate('menu');break;
        case 'restart':this.restart();break;
        case 'next':this.next();break;
        case 'skip-victory':if(!this.paused)this.finishVictory();break;
        case 'repeat':this.repeat();break;
        case 'commit-dive':this.input.commit();break;
        case 'shot-type':if(this.sim?.g.phase==='aim'){this.sim.g.shotType=b.dataset.value;this.renderPlay();}break;
        case 'mute':this.save.settings.mute=!this.save.settings.mute;this.commentary.syncSettings();this.persist();this.renderPlay();break;
        case 'test-commentary':this.commentary.line('Max Vale here. Welcome to Penalty Panic. What a finish!',4,'voice-test:'+performance.now());if(!this.commentary.voice())this.toast(this.commentary.status());break;
        case 'last-result':this.navigate('result');break;
        case 'rematch':{const m=this.save.lastResult;if(m?.mode==='competition')this.navigate(m.competition.kind);else if(m?.mode==='league')this.navigate('league');else if(m)this.start(m.mode,{stage:m.stage});break;}
        case 'next-career':this.start('career',{stage:Math.min(this.save.career,4)});break;
        case 'category':this.shopTab=b.dataset.value;this.previewId=P.items.find(i=>i.category===this.shopTab).id;this.navigate('shop');break;
        case 'preview':this.previewId=b.dataset.id;this.navigate('shop');break;
        case 'item':{
          const i=P.items.find(i=>i.id===b.dataset.id);if(!i)return;
          if(!this.save.owned.includes(i.id)&&!P.purchase(this.save,i.id)){this.toast('Keep playing to unlock this item.');return;}
          this.save.equipped[i.category]=i.id;if(['Player kit','Keeper kit'].includes(i.category))this.save.club.custom=false;
          this.previewId=i.id;this.persist();this.navigate('shop');this.toast(`${i.name} equipped`);break;
        }
        case 'upgrade':if(P.upgrade(this.save,b.dataset.key)){this.persist();this.navigate('upgrades');this.toast('Training complete. Your next run uses the improved attribute.');}break;
        case 'export':this.exportSave();break;
        case 'import':$('#import-file').click();break;
        case 'confirm-import':if(this.modalKind!=='import-confirm'||!this.pendingImport)break;try{this.save=this.store.importText(this.pendingImport);this.pendingImport=null;this.navigate('menu');this.toast('Progress restored.');}catch(error){this.toast(error.message);}break;
        case 'reset':this.openDialog('reset');break;
        case 'confirm-reset':if(this.modalKind!=='reset')break;this.save=this.store.reset();this.navigate('menu');this.toast('A fresh chapter.');break;
        case 'open-shop':if(this.sim)this.checkpoint();this.navigate('shop');break;
      }
    }
    editClub(e){
      if(this.page!=='club'||!this.clubDraft)return;
      const el=e.target,key=el.dataset.club,kit=el.dataset.kit;
      if(key&&['name','shortName','shirtName','number','crest','custom','playerGender'].includes(key))this.clubDraft[key]=key==='custom'?el.checked:key==='number'?(el.value===''?null:Number(el.value)):el.value;
      if(kit&&['primary','secondary','pattern'].includes(kit)){this.clubDraft[this.clubKitTab][kit]=el.value;this.clubDraft.custom=true;const toggle=$('[data-club="custom"]');if(toggle)toggle.checked=true;}
      this.clubDirty=true;$('#club-save-state').textContent='Unsaved changes — preview only. Save to use them in a new run.';$('#club-error').textContent='';this.refreshClubPreview();
    }
    refreshClubPreview(){
      const canvas=$('#club-preview');if(!canvas)return;
      const club=P.normalizeClub(this.clubDraft);P.clubPreview(canvas,this.save,club,this.clubKitTab);
      const squad=$('#club-squad');if(squad){squad.innerHTML=U.mySquad(club);P.squadPreview($('#squad-preview'),this.save,club);}
      $('#club-badge-preview').innerHTML=U.clubBadge(club);$('#club-name-preview').textContent=club.name;
      $('#club-identity-preview').textContent=`${club.shirtName} · #${club.number}`;$('#club-kit-state').textContent=U.kitState(club);
    }
    renderClub(){
      const focused=document.activeElement?.dataset;
      $('#screen').innerHTML=U.club(this);this.refreshClubPreview();
      if(focused?.action){const key=focused.action==='club-kit'?'value':'index',extra=focused[key]!==undefined?`[data-${key}="${focused[key]}"]`:'';document.querySelector(`[data-action="${focused.action}"]${extra}`)?.focus();}
    }
    refreshMatchSquad(g){
      if(!g?.team||P.playerGender(g.team)===P.playerGender(this.save.club))return;
      g.team=P.normalizeClub({...g.team,playerGender:P.playerGender(this.save.club)});
      g.roster=P.buildRoster(g.team,g.opponent);this.lineupsId=null;
    }
    saveClub(){
      if(this.page!=='club'||!this.clubDraft)return false;
      const t=this.clubDraft;
      const missing=['name','shortName','shirtName'].find(k=>!String(t[k]).trim());
      if(missing||!Number.isInteger(t.number)||t.number<0||t.number>99){
        $('#club-error').textContent=missing?'Enter a team name, scoreboard initials and shirt name.':'Choose a whole shirt number from 0 to 99.';
        $(`[data-club="${missing||'number'}"]`).focus();return false;
      }
      this.save.club=P.normalizeClub(t);this.clubDraft=P.normalizeClub(this.save.club);this.refreshMatchSquad(this.save.active);this.clubDirty=false;this.persist();this.renderClub();
      $('#club-save-state').textContent=this.store.ok&&!this.store.blocked?'Saved. Squad choice applies to resumed matches. New runs use this club and kit.':'Updated for this session. Export your save in Settings to keep a copy.';
      this.toast(`${this.save.club.name} is ready for matchday.`);return true;
    }
    refreshPreviews(){document.querySelectorAll('[data-preview]').forEach(c=>P.preview(c,this.save,c.dataset.preview,this.visualTime));this.refreshClubPreview();}
    frame(t){
      const dt=Math.min(.25,(t-this.last)/1000);this.last=t;this.visualTime+=dt;
      if(this.sim){
        if(!this.paused&&!this.victory){this.input.update(dt);this.sim.step(dt);this.process();this.commentary.observe(this.sim?.g);
          const g=this.sim?.g;
          if(g&&g.time-this.lastSave>1)this.checkpoint();
          if(!this.victory&&g?.phase==='feedback'&&g.time-g.phaseStart>(g.complete?1.7:1.4)&&(g.complete||this.save.settings.autoAdvance))this.next();
        }
        if(this.victory){
          const scene=this.victory;
          if(!this.paused&&!document.hidden)scene.time+=dt;
          // Honor a preference changed from Settings while the scene was paused.
          if(!scene.reduced&&(this.save.settings.reducedMotion||root.matchMedia('(prefers-reduced-motion: reduce)').matches)){
            scene.reduced=true;scene.duration=Math.min(scene.duration,scene.time+2);
          }
          if(scene.time>=scene.duration)this.finishVictory();
          else{
            this.renderer.drawVictory(this.sim.g,this.save,scene.time,scene.reduced);
            $('#victory-caption').classList.toggle('visible',scene.reduced||scene.time>.65);
            $('#victory-progress').style.transform=`scaleX(${scene.time/scene.duration})`;
            if(scene.time>2.2&&!scene.cheered){scene.cheered=true;$('#victory-stage').textContent='YOUR CLUB. YOUR MOMENT.';this.audio.play('goal');}
          }
        }else if(this.sim){this.renderer.draw(this.sim.g,this.save,this.visualTime);this.updatePower();}
      }else this.menuRenderer?.draw(null,this.save,this.visualTime);
      if(!this.save.settings.reducedMotion&&!root.matchMedia('(prefers-reduced-motion: reduce)').matches)document.querySelectorAll('[data-preview]').forEach(c=>{const i=P.items.find(i=>i.id===c.dataset.preview);if(['Celebration','Goal effect'].includes(i.category))P.preview(c,this.save,i,this.visualTime);});
      if(this.page==='result'&&this.resultAnimation){const f=Math.min(1,(t-this.resultAnimation)/800);document.querySelectorAll('[data-count]').forEach(el=>el.textContent=Math.round(Number(el.dataset.count)*f));if(f===1)this.resultAnimation=null;}
      if(this.toastUntil&&t>this.toastUntil){$('#toast').classList.remove('show');this.toastUntil=0;}
      requestAnimationFrame(time=>this.frame(time));
    }
    updatePower(){
      if(this.sim.g.field&&['field','interval'].includes(this.sim.g.phase)){U.updateField(this);return;}
      const g=this.sim.g,clock=$('#rush-clock');
      if(clock){clock.textContent=String(Math.ceil(g.rush.remaining)).padStart(2,'0');clock.classList.toggle('urgent',g.rush.remaining<=10);}
      const meter=$('#power');if(!meter)return;
      const n=Math.round(g.power*100);meter.querySelector('span').style.left=`${n}%`;meter.setAttribute('aria-valuenow',n);$('#power-value').textContent=`${n}%`;
      const lo=g.crossbar ? .55 : g.shotType==='driven' ? .55 : .35,hi=g.crossbar ? .78 : g.shotType==='driven' ? .78 : .82;
      $('#power-state').textContent=g.power<lo?'Underhit':g.power>hi?'Overhit':g.crossbar?'Gold power':g.power>=.65?'Powerful · no dip':'Controlled';
    }
  }
  root.PanicApp=new App();
})(window);
