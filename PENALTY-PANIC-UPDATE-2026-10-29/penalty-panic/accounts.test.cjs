'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('./progression.js'),{AccountStore,ACCOUNT_LIMIT}=require('./accounts.js'),{harness}=require('./test-dom.cjs');
const clone=x=>JSON.parse(JSON.stringify(x));
function memory(initial){const map=new Map();if(initial)map.set('penalty-panic-v1',JSON.stringify(initial));return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}
function uiCreate(h,name,gender='boys',submit=false){h.app.openAccounts();h.doc.querySelector('#account-create-name').value=name;h.doc.querySelector('#account-create-gender').value=gender;if(submit)h.doc.emit('submit',{target:h.doc.querySelector('#account-create-form')});else h.click('[data-action="account-create"]');return h.app.accounts.current.id;}
function uiSwitch(h,id){h.app.openAccounts();h.click(`[data-action="account-switch"][data-id="${id}"]`);}

test('existing progress becomes the original account without rewriting or losing the legacy save',()=>{
  const s=P.fresh();s.coins=870;s.xp=640;s.club=P.normalizeClub({...s.club,name:'Carlos FC',playerGender:'girls'});s.settings.mute=true;
  const storage=memory(s),raw=storage.getItem('penalty-panic-v1'),a=new AccountStore(storage);
  assert.equal(a.current.name,'Player 1');assert.equal(a.current.id,'original');assert.equal(a.store.key,'penalty-panic-v1');assert.deepEqual(a.store.data,P.load(s));
  assert.equal(storage.getItem('penalty-panic-v1'),raw);assert.equal(JSON.parse(storage.getItem(a.key)).accounts.length,1);
  const reload=new AccountStore(storage);assert.equal(reload.current.id,'original');assert.equal(reload.store.data.coins,870);
});
test('accounts keep coins, clubs, squads, unlocks, upgrades and preferences completely separate',()=>{
  const storage=memory(),a=new AccountStore(storage);a.store.data.coins=450;a.store.data.upgrades.power=3;a.store.data.club.name='Original FC';a.store.data.settings.mute=true;a.store.data.facilities.fitness=2;
  const original=clone(a.store.data),second=a.create('Sophie','girls');assert.equal(a.store.data.coins,120);assert.equal(a.store.data.club.playerGender,'girls');assert.equal(a.store.data.club.squad[0],'Sophie Hart');
  assert.equal(a.store.data.upgrades.power,0);assert.equal(a.store.data.settings.mute,false);assert.equal(a.store.data.facilities.fitness,0);
  a.store.data.coins=245;a.store.data.club.name='Sophie FC';a.store.data.settings.master=.2;const newer=clone(a.store.data);
  a.switchTo('original');assert.deepEqual(a.store.data,original);a.switchTo(second.id);assert.deepEqual(a.store.data,newer);
  const reloaded=new AccountStore(storage);assert.equal(reloaded.current.name,'Sophie');assert.equal(reloaded.current.id,second.id);assert.deepEqual(reloaded.store.data,newer);
});
test('rename validates unique trimmed Unicode names without changing identity or saved progress',()=>{
  const a=new AccountStore(memory()),second=a.create('  Mia   Jones  ');assert.equal(second.name,'Mia Jones');const key=a.store.key;
  a.store.data.coins=600;a.store.write();assert.equal(a.rename(second.id,'Zoë ⚽'),'Zoë ⚽');assert.equal(a.store.key,key);assert.equal(a.store.data.coins,600);
  for(const value of ['', '  ', 'x'.repeat(25),null])assert.throws(()=>a.create(value));
  assert.throws(()=>a.create('zoe\u0308 ⚽'),/already taken/);assert.throws(()=>a.rename('original','ZOË ⚽'),/already taken/);
  assert.throws(()=>a.rename('absent-id','Other'),/no longer available/);assert.throws(()=>a.create('Third','invalid'),/Boys or Girls/);
});
test('the account limit is enforced and current/last accounts cannot be deleted',()=>{
  const a=new AccountStore(memory());assert.throws(()=>a.remove('original'),/Switch/);
  for(let i=1;i<ACCOUNT_LIMIT;i++)a.create(`Player ${i+1}`);assert.equal(a.index.accounts.length,ACCOUNT_LIMIT);
  assert.throws(()=>a.create('Overflow'),/up to/);assert.throws(()=>a.remove(a.current.id),/Switch/);
  a.remove('original');assert.equal(a.index.accounts.length,ACCOUNT_LIMIT-1);assert.throws(()=>a.remove('original'),/no longer/);
  a.create('New player');assert.equal(a.index.accounts.length,ACCOUNT_LIMIT);
});
test('deleting an inactive account erases only its save and persists after reload',()=>{
  const storage=memory(),a=new AccountStore(storage),second=a.create('Second'),key=a.store.key;
  a.store.data.coins=777;a.store.write();a.switchTo('original');a.store.data.coins=888;a.store.write();a.remove(second.id);
  assert.equal(storage.getItem(key),null);assert.equal(a.store.data.coins,888);assert.equal(new AccountStore(storage).index.accounts.length,1);
});
test('imports and resets affect the active account only and never change the account list',()=>{
  const storage=memory(),a=new AccountStore(storage);a.store.data.coins=900;a.create('Second');a.store.data.coins=320;
  const saved=a.store.exportText(),index=storage.getItem(a.key);a.store.reset();assert.equal(a.store.data.coins,120);a.store.importText(saved);assert.equal(a.store.data.coins,320);
  assert.equal(storage.getItem(a.key),index);a.switchTo('original');assert.equal(a.store.data.coins,900);
});
test('malformed and unsupported account lists remain intact and disable account mutations',()=>{
  for(const raw of ['{bad','{"version":99}',JSON.stringify({version:1,activeId:'original',accounts:[{id:'original',name:'Same'},{id:'original',name:'Same'}]})]){
    const s=P.fresh();s.coins=540;const storage=memory(s);storage.setItem('penalty-panic-accounts-v1',raw);const a=new AccountStore(storage);
    assert.equal(a.blocked,true);assert.equal(a.store.data.coins,540);assert.throws(()=>a.create('New'),/attention/);assert.throws(()=>a.rename('original','New'),/attention/);
    assert.equal(storage.getItem(a.key),raw);assert.equal(storage.map.size,2);
  }
});
test('an invalid individual save can be selected for recovery without overwriting its raw contents',()=>{
  const storage=memory(),a=new AccountStore(storage),second=a.create('Second'),key=a.store.key;a.switchTo('original');
  storage.setItem(key,'{"version":99,"coins":6543}');a.switchTo(second.id);assert.equal(a.store.blocked,true);assert.equal(a.store.write(),false);
  assert.equal(a.store.exportText(),'{"version":99,"coins":6543}');a.switchTo('original');assert.equal(storage.getItem(key),'{"version":99,"coins":6543}');
  storage.removeItem(key);a.switchTo(second.id);assert.equal(a.store.blocked,true);assert.equal(a.store.status,'missing');
  a.store.importText(JSON.stringify(P.fresh()));assert.equal(a.store.blocked,false);assert.equal(a.store.data.coins,120);
});
test('storage failures cannot silently switch away from unsaved progress',()=>{
  const storage=memory(),a=new AccountStore(storage),second=a.create('Second');a.switchTo('original');a.store.data.coins=1234;
  const index=storage.getItem(a.key),set=storage.setItem;storage.setItem=()=>{throw Error('full');};
  assert.throws(()=>a.switchTo(second.id),/current progress/);assert.throws(()=>a.create('Third'),/current progress/);assert.equal(a.current.id,'original');assert.equal(a.store.data.coins,1234);assert.equal(storage.getItem(a.key),index);
  storage.setItem=set;a.switchTo(second.id);a.switchTo('original');assert.equal(a.store.data.coins,1234);
});
test('a failed account index commit rolls back creation and leaves switching/deletion unchanged',()=>{
  const storage=memory(),a=new AccountStore(storage),second=a.create('Second');a.switchTo('original');const before=[...storage.map.keys()],set=storage.setItem;
  storage.setItem=(k,v)=>{if(k===a.key)throw Error('full');set(k,v);};
  assert.throws(()=>a.create('Third'),/Could not save accounts/);assert.deepEqual([...storage.map.keys()],before);assert.equal(a.current.id,'original');assert.equal(a.index.accounts.length,2);
  assert.throws(()=>a.switchTo(second.id));assert.equal(a.current.id,'original');assert.throws(()=>a.remove(second.id));assert.equal(a.index.accounts.length,2);assert.equal(storage.map.size,before.length);
});
test('stale tabs cannot overwrite the account list and writes stay bound to each tab account',()=>{
  const storage=memory(),a=new AccountStore(storage),stale=new AccountStore(storage);a.create('Second');a.store.data.coins=444;a.store.write();
  assert.throws(()=>stale.create('Third'),/another tab/);assert.throws(()=>stale.rename('original','Stale'),/another tab/);
  stale.store.data.coins=333;stale.store.write();assert.equal(new AccountStore(storage).store.data.coins,444);a.switchTo('original');assert.equal(a.store.data.coins,333);
});
test('blocked browser storage keeps the game playable and accounts honestly unavailable',()=>{
  const a=new AccountStore({getItem(){throw Error('disabled');},setItem(){throw Error('disabled');}});assert.equal(a.store.data.coins,120);assert.equal(a.store.ok,false);assert.equal(a.store.write(),false);assert.throws(()=>a.create('New'),/unavailable/);
});
test('the account picker creates via keyboard submit, persists selection and safely renders names',()=>{
  const h=harness();const id=uiCreate(h,'<Mia & Co>','girls',true);assert.notEqual(id,'original');assert.equal(h.app.page,'menu');assert.equal(h.app.save.club.playerGender,'girls');assert.equal(h.doc.querySelector('#account-name').textContent,'<Mia & Co>');
  h.app.openAccounts();assert.match(h.doc.querySelector('#screen').innerHTML,/&lt;Mia &amp; Co&gt;/);assert.match(h.doc.querySelector('#screen').innerHTML,/do not sync online/);
  const reload=harness(undefined,h.memory);assert.equal(reload.app.accounts.current.id,id);assert.equal(reload.app.save.club.playerGender,'girls');
  reload.app.openAccounts();reload.doc.querySelector('#account-create-name').value='<mia & co>';reload.doc.querySelector('#account-create-gender').value='boys';reload.click('[data-action="account-create"]');assert.match(reload.doc.querySelector('#account-error').textContent,/already taken/);assert.equal(reload.app.accounts.index.accounts.length,2);
});
test('switching accounts checkpoints a match and restores each player clock, team, settings and rewards',()=>{
  const h=harness();h.app.save.coins=800;h.app.save.settings.mute=true;h.app.start('match',{seed:42});h.P.fieldStart(h.app.sim.g);h.frames(35);
  const game=clone(h.app.sim.g);const second=uiCreate(h,'Ava','girls');assert.equal(h.app.sim,null);assert.equal(h.app.save.active,null);assert.equal(h.app.save.coins,120);assert.equal(h.app.save.settings.mute,false);
  h.app.start('match',{seed:77});h.P.fieldStart(h.app.sim.g);h.frames(18);const other=clone(h.app.sim.g);
  uiSwitch(h,'original');assert.equal(h.app.save.coins,800);assert.equal(h.app.save.settings.mute,true);assert.equal(h.app.save.active.id,game.id);assert.equal(h.app.save.active.time,game.time);
  h.app.resumeSaved();assert.equal(h.app.paused,true);assert.deepEqual(clone(h.app.sim.g.field),game.field);assert.equal(h.app.sim.g.roster[0],'Jamie Hart');
  uiSwitch(h,second);assert.equal(h.app.save.active.id,other.id);h.app.resumeSaved();assert.deepEqual(clone(h.app.sim.g.field),other.field);assert.equal(h.app.sim.g.roster[0],'Sophie Hart');assert.match(h.doc.querySelector('#lineups').innerHTML,/Sophie Hart/);
});
test('rename and deletion require the right UI confirmation, and cancellation preserves progress',()=>{
  const h=harness(),second=uiCreate(h,'Second');h.app.openAccounts();h.click(`[data-action="account-rename"][data-id="${second}"]`);
  assert.equal(h.doc.activeElement.id,'account-rename-name');h.doc.querySelector('#account-rename-name').value='Robin';h.doc.emit('submit',{target:h.doc.querySelector('#account-rename-form')});assert.equal(h.app.accounts.current.name,'Robin');assert.equal(h.app.accounts.current.id,second);
  h.click('[data-action="account-delete"][data-id="original"]');assert.equal(h.app.modalKind,'account-delete');h.click('[data-action="close-dialog"].primary');assert.equal(h.app.accounts.index.accounts.length,2);
  h.click('[data-action="account-delete"][data-id="original"]');h.click('[data-action="account-delete-confirm"]');assert.equal(h.app.accounts.index.accounts.length,1);assert.equal(h.app.accounts.current.id,second);assert.equal(h.memory.has('penalty-panic-v1'),false);
});
test('UI imports and confirmed resets belong to one account; an asynchronous import cannot follow a switch',async()=>{
  const h=harness();h.app.save.coins=780;h.app.persist();const second=uiCreate(h,'Second');h.app.save.coins=333;h.app.persist();
  h.app.openDialog('settings');h.click('[data-action="reset"]');assert.match(h.app.modal.innerHTML,/Reset Second/);h.click('[data-action="confirm-reset"]');assert.equal(h.app.save.coins,120);
  const imported=P.fresh();imported.coins=567;await h.app.importFile({size:100,text:async()=>JSON.stringify(imported)});h.click('[data-action="confirm-import"]');assert.equal(h.app.save.coins,567);
  let completeRead;const pending=h.app.importFile({size:100,text:()=>new Promise(resolve=>completeRead=resolve)});uiSwitch(h,'original');completeRead(JSON.stringify(imported));await pending;
  assert.equal(h.app.save.coins,780);assert.equal(h.app.modal.open,false);assert.equal(h.app.pendingImport,null);uiSwitch(h,second);assert.equal(h.app.save.coins,567);
});
