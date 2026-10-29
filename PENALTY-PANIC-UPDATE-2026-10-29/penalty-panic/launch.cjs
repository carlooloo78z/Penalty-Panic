'use strict';
const {spawn}=require('node:child_process');
const path=require('node:path');
const url='http://localhost:4173';
async function status(){
  try{const response=await fetch(url+'/health',{signal:AbortSignal.timeout(800)});if(response.ok)return await response.json();}catch{}
  // An already-running v1 static server also serves the upgraded files correctly.
  // Recognize it without terminating the user's background process or changing save origin.
  try{const response=await fetch(url,{signal:AbortSignal.timeout(800)}),html=await response.text();if(response.ok&&html.includes('PENALTY PANIC')&&html.includes('src="app.js"'))return {app:'penalty-panic',version:2,legacyServer:true};}catch{}
  return null;
}
(async()=>{
  let ready=await status();
  if(!ready){
    const child=spawn(process.execPath,[path.join(__dirname,'server.cjs')],{cwd:__dirname,detached:true,stdio:'ignore',windowsHide:true});child.unref();
    for(let i=0;i<30&&!ready;i++){await new Promise(r=>setTimeout(r,200));ready=await status();}
  }
  if(ready?.app!=='penalty-panic'){console.error('The game could not start on port 4173. Close the other service using that port, then run PLAY again.');process.exitCode=1;return;}
  if(process.platform==='win32')spawn('cmd.exe',['/d','/c','start','',url],{stdio:'ignore',windowsHide:true}).unref();
  else console.log(`Play at ${url}`);
})().catch(error=>{console.error(error.message);process.exitCode=1;});
