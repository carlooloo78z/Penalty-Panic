'use strict';
// Deliberately small DOM substitute for event/state tests. Not a visual browser emulator.
const vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto');
const selectorGroups=selector=>(selector.match(/(?:\[[^\]]*\]|[^,])+/g)||[]).map(s=>s.trim());
class Element {
  constructor(tag,doc){this.tagName=tag.toUpperCase();this.doc=doc;this.children=[];this.attrs={};this.dataset={};this.style={setProperty(k,v){this[k]=v;}};this.listeners={};this.hidden=false;this.value='';this.textContent='';this.open=false;this.checked=false;this.disabled=false;this.classList={add:(...v)=>v.forEach(x=>this.classes.add(x)),remove:(...v)=>v.forEach(x=>this.classes.delete(x)),contains:v=>this.classes.has(v),toggle:(v,on)=>{if(on===undefined)on=!this.classes.has(v);on?this.classes.add(v):this.classes.delete(v);return on;}};this.classes=new Set();}
  set innerHTML(value){this.html=value;this.children=[];const stack=[this],tokens=value.matchAll(/<\/?([a-z][\w-]*)\b([^>]*)>|([^<]+)/gi);for(const m of tokens){if(!m[1])continue;if(m[0][1]==='/'){if(stack.length>1)stack.pop();continue;}const el=new Element(m[1],this.doc);for(const a of m[2].matchAll(/([\w-]+)(?:="([^"]*)"|='([^']*)'|=([^\s>]+))?/g))el.setAttribute(a[1],a[2]??a[3]??a[4]??'');const parent=stack.at(-1);el.parentElement=parent;parent.children.push(el);if(!['input','br','hr','meta','link','img'].includes(m[1].toLowerCase()))stack.push(el);}}
  get innerHTML(){return this.html||'';}
  setAttribute(key,value){this.attrs[key]=String(value);if(key==='id')this.id=value;if(key==='class')this.classes=new Set(value.split(' '));if(key==='value')this.value=String(value);if(key==='type')this.type=value;if(key==='disabled')this.disabled=true;if(key==='checked')this.checked=true;if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(value);}
  getAttribute(key){return this.attrs[key];}
  matches(selector){const tag=selector.match(/^[a-z][\w-]*/i);if(tag&&tag[0].toUpperCase()!==this.tagName)return false;const id=selector.match(/#([\w-]+)/);if(id&&id[1]!==this.id)return false;const cls=selector.match(/\.([\w-]+)/);if(cls&&!this.classes.has(cls[1]))return false;for(const m of selector.matchAll(/\[([\w-]+)(?:=["']?([^\]"']+)["']?)?\]/g)){if(!(m[1]in this.attrs))return false;if(m[2]!==undefined&&this.attrs[m[1]]!==m[2])return false;}return true;}
  querySelectorAll(selector){const candidates=[];const walk=e=>{for(const child of e.children){candidates.push(child);walk(child);}};walk(this);const groups=selectorGroups(selector);return candidates.filter(c=>groups.some(s=>c.matches(s)));}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  closest(selector){for(let e=this;e;e=e.parentElement)if(selectorGroups(selector).some(s=>e.matches(s)))return e;return null;}
  addEventListener(type,fn){(this.listeners[type]||=[]).push(fn);}
  emit(type,props={}){const e={target:this,preventDefault(){},pointerId:1,...props};for(const fn of this.listeners[type]||[])fn(e);return e;}
  focus(){this.doc.activeElement=this;}
  get isConnected(){return true;}
  showModal(){this.open=true;}
  close(){this.open=false;}
  setPointerCapture(){}
  scrollIntoView(){}
  click(){this.doc.emit('click',{target:this});}
  getBoundingClientRect(){return {left:0,top:0,x:0,y:0,width:this.id==='stadium'?1000:300,height:this.id==='stadium'?620:150};}
  getContext(){if(!this.context){const noop=()=>{},stop=(offset,color)=>{if(color.startsWith('#')&&!/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(color))throw Error('Invalid canvas color: '+color);},ctx={createLinearGradient:()=>({addColorStop:stop}),createRadialGradient:()=>({addColorStop:stop})};this.context=new Proxy(ctx,{get:(t,k)=>t[k]||noop,set:(t,k,v)=>(t[k]=v,true)});}return this.context;}
}
function harness(initial){
  const doc=new Element('document',null);doc.doc=doc;doc.body=new Element('body',doc);doc.children.push(doc.body);doc.body.parentElement=doc;doc.activeElement=doc.body;doc.createElement=tag=>new Element(tag,doc);doc.body.innerHTML=fs.readFileSync('index.html','utf8').match(/<body>([\s\S]*?)<\/body>/)[1];
  const memory=new Map();if(initial)memory.set('penalty-panic-v1',JSON.stringify(initial));let raf,time=0;
  const sandbox={document:doc,console,crypto:crypto.webcrypto,innerWidth:1000,innerHeight:900,devicePixelRatio:1,performance:{now:()=>time},requestAnimationFrame:fn=>raf=fn,ResizeObserver:class{observe(){}unobserve(){}},matchMedia:()=>({matches:false}),addEventListener(){},scrollTo(){},localStorage:{getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)},setTimeout:()=>0,clearTimeout(){},Blob,URL};sandbox.window=sandbox;vm.createContext(sandbox);
  for(const file of ['catalog.js','field.js','tournament.js','competitions.js','roster.js','progression.js','storage.js','simulation.js','player-motion.js','renderer.js','field-view.js','audio.js','commentary.js','screens.js','club-ui.js','arcade-ui.js','league-ui.js','field-ui.js','competition-ui.js','squad-ui.js','input.js','app.js'])vm.runInContext(fs.readFileSync(file,'utf8'),sandbox,{filename:file});
  const event=(type,code,target=doc.body)=>doc.emit(type,{code,key:code,repeat:false,target});
  return {app:sandbox.PanicApp,P:sandbox.Panic,doc,memory,event,frame(dt=1/60){time+=dt*1000;raf(time);},frames(n){for(let i=0;i<n;i++){time+=1000/60;raf(time);}},click(selector){const e=doc.querySelector(selector);if(!e)throw Error('Missing '+selector);e.click();},eval:code=>vm.runInContext(code,sandbox)};
}
// Existing shootout-specific regressions deliberately start at the spot.
// New field tests use the unmodified production harness above.
function penaltyHarness(initial){const h=harness(initial),start=h.app.start.bind(h.app);h.app.start=(mode,options={})=>start(mode,{regulation:false,...options});return h;}
module.exports={harness,penaltyHarness};
