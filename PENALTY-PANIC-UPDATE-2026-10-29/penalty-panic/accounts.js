(function(root){
  'use strict';
  const P=typeof module!=='undefined'?{...require('./progression.js'),SaveStore:require('./storage.js')}:root.Panic;
  const KEY='penalty-panic-accounts-v1',LIMIT=12;
  const saveKey=id=>id==='original'?'penalty-panic-v1':`penalty-panic-account-${id}-v1`;
  function accountName(value){
    if(typeof value!=='string')throw Error('Enter an account name.');
    const clean=value.normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,'').replace(/\s+/g,' ').trim();
    if(!clean)throw Error('Enter an account name.');
    if(Array.from(clean).length>24)throw Error('Use 24 characters or fewer for your account name.');
    return clean;
  }
  function decodeIndex(raw){
    const d=JSON.parse(raw);
    if(!d||d.version!==1||!Array.isArray(d.accounts)||!d.accounts.length||d.accounts.length>LIMIT)throw Error('Invalid account list.');
    const ids=new Set(),names=new Set();
    for(const a of d.accounts){
      if(!a||typeof a.id!=='string'||!(/^[a-z0-9-]{8,64}$/.test(a.id)||a.id==='original')||ids.has(a.id))throw Error('Invalid account.');
      if(accountName(a.name)!==a.name||names.has(a.name.toLowerCase()))throw Error('Invalid account name.');
      ids.add(a.id);names.add(a.name.toLowerCase());
    }
    if(!ids.has(d.activeId))throw Error('Missing active account.');
    return {version:1,activeId:d.activeId,accounts:d.accounts.map(a=>({id:a.id,name:a.name}))};
  }
  class AccountStore{
    constructor(storage){
      this.storage=storage;this.key=KEY;this.raw=null;this.blocked=false;this.ok=true;
      try{this.raw=storage.getItem(KEY)??null;}catch{this.ok=false;}
      this.index={version:1,activeId:'original',accounts:[{id:'original',name:'Player 1'}]};
      if(this.raw!==null){try{this.index=decodeIndex(this.raw);}catch{this.blocked=true;}}
      this.store=this.loadStore(this.current);
      // Keep the original save under its original key. Only add account metadata.
      if(this.raw===null&&this.ok){try{this.commit(this.index);}catch{this.ok=false;}}
    }
    get current(){return this.index.accounts.find(a=>a.id===this.index.activeId);}
    loadStore(account){
      const store=new P.SaveStore(this.storage,saveKey(account.id));
      if(account.id!=='original'&&store.raw==null){store.blocked=true;store.status='missing';}
      return store;
    }
    list(){return this.index.accounts.map(a=>{
      const store=a.id===this.current.id?this.store:this.loadStore(a),s=store.data;
      return {...a,current:a.id===this.current.id,level:P.level(s),coins:s.coins,club:s.club.name,gender:P.playerGender(s.club),needsRepair:store.blocked};
    });}
    guard(){
      if(this.blocked)throw Error('The account list needs attention. Your existing saves have been kept.');
      let raw;try{raw=this.storage.getItem(KEY)??null;}catch{this.ok=false;throw Error('Account storage is unavailable in this browser.');}
      if(raw!==this.raw)throw Error('Accounts changed in another tab. Reload before changing accounts here.');
    }
    commit(index){
      this.guard();const raw=JSON.stringify(index);
      try{this.storage.setItem(KEY,raw);}catch{this.ok=false;throw Error('Could not save accounts. Free browser storage and try again.');}
      this.index=index;this.raw=raw;this.ok=true;
    }
    saveCurrent(){
      if(!this.store.blocked&&!this.store.write())throw Error('Could not save your current progress. Export it in Settings before switching accounts.');
    }
    uniqueName(value,except){
      const name=accountName(value);
      if(this.index.accounts.some(a=>a.id!==except&&a.name.toLowerCase()===name.toLowerCase()))throw Error('That name is already taken on this device. Choose another.');
      return name;
    }
    create(value,gender='boys'){
      this.guard();const name=this.uniqueName(value);
      if(this.index.accounts.length>=LIMIT)throw Error(`You can keep up to ${LIMIT} accounts on this device.`);
      if(!['boys','girls'].includes(gender))throw Error('Choose Boys or Girls for your team.');
      this.saveCurrent();
      let id;do{id=root.crypto?.randomUUID?.()||`player-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,12)}`;}while(this.storage.getItem(saveKey(id))!=null);
      const store=new P.SaveStore(this.storage,saveKey(id));store.data.club=P.normalizeClub({...store.data.club,playerGender:gender});
      if(!store.write())throw Error('Could not save the new account. Your current account is unchanged.');
      const account={id,name};
      try{this.commit({...this.index,activeId:id,accounts:[...this.index.accounts,account]});}
      catch(error){try{this.storage.removeItem(saveKey(id));}catch{}throw error;}
      this.store=store;return account;
    }
    switchTo(id){
      this.guard();const account=this.index.accounts.find(a=>a.id===id);if(!account)throw Error('That account is no longer available.');
      if(id===this.current.id)return account;
      this.saveCurrent();const store=this.loadStore(account);
      if(!store.ok)throw Error('Could not read this account. Try again when browser storage is available.');
      this.commit({...this.index,activeId:id});this.store=store;return account;
    }
    rename(id,value){
      this.guard();if(!this.index.accounts.some(a=>a.id===id))throw Error('That account is no longer available.');
      const name=this.uniqueName(value,id);this.commit({...this.index,accounts:this.index.accounts.map(a=>a.id===id?{...a,name}:a)});return name;
    }
    remove(id){
      this.guard();if(id===this.current.id)throw Error('Switch to another account before deleting this one.');
      if(!this.index.accounts.some(a=>a.id===id))throw Error('That account is no longer available.');
      this.commit({...this.index,accounts:this.index.accounts.filter(a=>a.id!==id)});
      // Removing the list entry first prevents a failed metadata write from losing a save.
      try{this.storage.removeItem(saveKey(id));}catch{throw Error('Account removed from the list, but browser storage could not erase its old save.');}
    }
  }
  const api={AccountStore,accountName,ACCOUNT_LIMIT:LIMIT};Object.assign(root.Panic||={},api);if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
