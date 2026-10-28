'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
class Browser {
  static async open(url=process.env.GAME_URL||'http://localhost:4174'){
    const endpoint=process.env.BROWSER_DEBUG||'http://localhost:9224';
    const target=await (await fetch(`${endpoint}/json/new?${encodeURIComponent(url)}`,{method:'PUT'})).json();
    const b=new Browser(target.webSocketDebuggerUrl);try{await b.ready;await b.call('Page.enable');await b.call('Runtime.enable');return b;}catch(error){b.socket.close();throw error;}
  }
  constructor(url){
    this.socket=new WebSocket(url);this.id=0;this.pending=new Map();this.errors=[];
    this.ready=new Promise((resolve,reject)=>{this.socket.addEventListener('open',resolve,{once:true});this.socket.addEventListener('error',reject,{once:true});});
    this.socket.addEventListener('message',e=>{
      const m=JSON.parse(e.data);if(m.id){const p=this.pending.get(m.id);if(p){clearTimeout(p.timeout);this.pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}
      if(m.method==='Runtime.exceptionThrown')this.errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);
    });
  }
  call(method,params={}){return new Promise((resolve,reject)=>{const id=++this.id,timeout=setTimeout(()=>{this.pending.delete(id);reject(Error('CDP timeout: '+method));},15000);this.pending.set(id,{resolve,reject,timeout});this.socket.send(JSON.stringify({id,method,params}));});}
  async eval(expression){const r=await this.call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
  async until(expression,timeout=10000){const start=Date.now();while(Date.now()-start<timeout){if(await this.eval(expression))return;await delay(50);}throw Error('Timed out: '+expression);}
  async click(selector){const p=await this.eval(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing element');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);await this.mouse(p.x,p.y);}
  async mouse(x,y){await this.call('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});await this.call('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});await this.call('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});}
  async goal(x,y,touch=false){const p=await this.eval(`(()=>{const a=PanicApp,r=document.querySelector('#stadium').getBoundingClientRect(),v=a.renderer.view;return {x:r.left+v.x+${x}*v.scale,y:r.top+v.y+${y}*v.scale};})()`);if(touch){await this.call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y}]});await this.call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else await this.mouse(p.x,p.y);}
  async key(code,down=true){const key=code==='Space'?' ':code==='Escape'?'Escape':code.startsWith('Key')?code.slice(3).toLowerCase():code;await this.call('Input.dispatchKeyEvent',{type:down?'keyDown':'keyUp',code,key,windowsVirtualKeyCode:code==='Space'?32:code==='Escape'?27:code.startsWith('Key')?code.charCodeAt(3):0});}
  async viewport(width,height,mobile=false){await this.call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});await this.call('Emulation.setTouchEmulationEnabled',{enabled:mobile});await delay(150);}
  async shot(x=755,y=185){await this.goal(x,y);await this.key('Space');await delay(900);await this.key('Space',false);await this.until("PanicApp.sim?.g.phase==='feedback'||PanicApp.page==='result'",5000);}
  async screenshot(name){fs.mkdirSync('qa',{recursive:true});const result=await this.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(`qa/${name}.png`,Buffer.from(result.data,'base64'));}
  async close(){await this.call('Page.close').catch(()=>{});this.socket.close();}
}
async function smoke(){
  const b=await Browser.open();
  try{
    await b.until('!!window.PanicApp');
    // This test must use an isolated browser profile and test origin.
    await b.eval("localStorage.removeItem('penalty-panic-v1')");await b.call('Page.reload');await b.until('!!window.PanicApp');
    await b.viewport(1440,1000);await b.screenshot('desktop-menu');
    await b.click('[data-action="club"]');
    for(const [field,value]of [['name','Northbridge FC'],['shortName','NFC'],['shirtName','RIVERA'],['number','7']]){
      await b.click(`[data-club="${field}"]`);await b.eval(`document.querySelector('[data-club="${field}"]').select()`);await b.call('Input.insertText',{text:value});
    }
    await b.click('[data-action="club-preset"][data-index="1"]');await b.click('[data-action="save-club"]');await b.screenshot('desktop-club');
    assert.equal(await b.eval('PanicApp.save.club.name'),'Northbridge FC');assert.equal(await b.eval('PanicApp.save.club.custom'),true);assert.equal(await b.eval('PanicApp.save.coins'),120);
    await b.viewport(360,800,true);await b.screenshot('mobile-club');assert.equal(await b.eval('document.documentElement.scrollWidth<=innerWidth'),true,'Club editor overflows mobile viewport');
    await b.call('Page.reload');await b.until('!!window.PanicApp');assert.equal(await b.eval('PanicApp.save.club.shirtName'),'RIVERA');assert.equal(await b.eval('PanicApp.save.club.number'),7);await b.viewport(1440,1000);
    await b.click('[data-action="practice"]');await b.click('[data-action="practice-shoot"]');await b.screenshot('desktop-shooting');
    await b.goal(740,185);const before=await b.eval('JSON.stringify(PanicApp.sim.g.aim)');
    const box=await b.eval("(()=>{const r=document.querySelector('#shoot').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()");
    await b.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:box.x,y:box.y});assert.equal(await b.eval('JSON.stringify(PanicApp.sim.g.aim)'),before,'Aim changed while moving to Shoot');
    await b.eval('PanicApp.sim.g.seed=42');await b.shot();assert.equal(await b.eval('PanicApp.sim.g.goals'),1);await b.screenshot('desktop-goal');
    await b.key('Escape');await b.click('[data-action="restart"]');assert.equal(await b.eval('PanicApp.modal.open'),false);assert.equal(await b.eval('PanicApp.paused'),false);
    await b.click('[data-action="pause"]');await b.click('[data-action="settings"]');await b.eval("document.querySelector('[data-setting=controlPreset]').focus()");await b.key('Escape');assert.equal(await b.eval('PanicApp.paused'),false);
    await b.click('[data-action="pause"]');await b.click('[data-action="leave"]');await b.viewport(390,844,true);await b.screenshot('mobile-menu');
    await b.click('[data-action="practice"]');await b.click('[data-action="practice-keep"]');await b.screenshot('mobile-keeper');
    assert.equal(await b.eval('document.documentElement.scrollWidth<=innerWidth'),true,'Mobile horizontal overflow');
    await b.until("PanicApp.sim.g.phase==='flight'");const target=await b.eval('PanicApp.sim.g.shot.target');await b.goal(target.x,target.y,true);await b.until("PanicApp.sim.g.phase==='feedback'");assert.equal(await b.eval('PanicApp.sim.g.saves'),1,'Exact touch save failed');
    await b.screenshot('mobile-save');await b.viewport(844,390,true);await b.screenshot('landscape-feedback');
    await b.key('Escape');await b.click('[data-action="leave"]');await b.viewport(1440,1000);
    await b.click('[data-action="shop"]');await b.screenshot('locker-room');await b.click('[data-action="item"][data-id="0-1"]');assert.equal(await b.eval('PanicApp.save.equipped.Football'),'0-1');assert.equal(await b.eval('PanicApp.save.coins'),40);
    await b.call('Page.reload');await b.until('!!window.PanicApp');assert.equal(await b.eval('PanicApp.save.coins'),40);assert.equal(await b.eval('PanicApp.save.equipped.Football'),'0-1');
    // Exercise the new match entry, controls and timer before the shootout.
    await b.click('[data-action="play"]');await b.click('[data-action="field-start"]');
    assert.equal(await b.eval('PanicApp.sim.g.phase'),'field');
    const startY=await b.eval('PanicApp.sim.g.field.players[PanicApp.sim.g.field.controlled].y');
    await b.key('KeyW');await delay(350);await b.key('KeyW',false);
    assert.ok(await b.eval('PanicApp.sim.g.field.players[PanicApp.sim.g.field.controlled].y')<startY);
    await b.screenshot('five-a-side-desktop');
    await b.key('Escape');const pausedClock=await b.eval('PanicApp.sim.g.field.elapsed');await delay(250);
    assert.equal(await b.eval('PanicApp.sim.g.field.elapsed'),pausedClock);await b.click('[data-action="resume"]');
    await b.viewport(390,844);await b.screenshot('five-a-side-mobile');
    assert.ok(await b.eval('document.documentElement.scrollWidth<=innerWidth+1'));
    await b.viewport(1440,1000);
    // The unit suite runs all 300 seconds; place browser QA just before full time.
    await b.eval('PanicApp.sim.g.field.elapsed=299.95;PanicApp.sim.g.field.state="live";PanicApp.sim.g.field.score=[0,0]');
    await b.until("PanicApp.sim.g.phase==='interval'");await b.click('[data-action="field-pens"]');await b.eval('PanicApp.sim.g.seed=42');
    // Complete the shootout through aim, charge, dive and continue controls.
    for(let kick=0;kick<70&&await b.eval("PanicApp.page==='game'");kick++){
      const role=await b.eval('PanicApp.sim.g.role');
      if(role==='shoot')await b.shot(775,175);
      else{
        await b.until("PanicApp.sim?.g.phase==='flight'||PanicApp.page==='result'");
        if(await b.eval('!!PanicApp.sim')){const p=await b.eval('PanicApp.sim.g.shot.target');await b.goal(p.x,p.y);await b.until("PanicApp.sim?.g.phase==='feedback'||PanicApp.page==='result'");}
      }
      if(await b.eval('!!PanicApp.victory'))await b.click('[data-action="skip-victory"]');
      else if(await b.eval("PanicApp.page==='game'"))await b.click('[data-action="next"]');
    }
    assert.equal(await b.eval('PanicApp.page'),'result','Full shootout failed to end');
    const balance=await b.eval('PanicApp.save.coins');await b.screenshot('match-results');
    await b.click('[data-action="menu"]');await b.click('[data-action="last-result"]');assert.equal(await b.eval('PanicApp.save.coins'),balance,'Result awarded twice');
    await b.click('[data-action="menu"]');await b.click('[data-action="upgrades"]');await b.click('[data-action="upgrade"][data-key="reaction"]');assert.equal(await b.eval('PanicApp.save.upgrades.reaction'),1);
    await b.click('[data-action="menu"]');await b.click('[data-action="challenge"]');
    for(let i=0;i<10;i++){
      await b.until("PanicApp.sim?.g.phase==='flight'");const p=await b.eval('PanicApp.sim.g.shot.target');await b.goal(p.x,p.y);await b.until("PanicApp.sim?.g.phase==='feedback'||PanicApp.page==='result'");
      if(await b.eval("PanicApp.page==='game'"))await b.click('[data-action="next"]');
    }
    assert.equal(await b.eval('PanicApp.page'),'result');assert.equal(await b.eval('PanicApp.save.lastResult.saves+PanicApp.save.lastResult.conceded+PanicApp.save.lastResult.aiMisses'),10);
    await b.click('[data-action="menu"]');await b.click('[data-action="career"]');await b.screenshot('career-map');
    assert.deepEqual(b.errors,[]);console.log('Browser checks passed: aim lock, shot, restart, focus/Escape, touch save, mobile layout, shop, reload, full match, immediate rewards, duplicate results, upgrades and challenge.');
  }finally{await b.close();}
}
if(require.main===module)smoke().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={Browser,delay};
