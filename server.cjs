'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=__dirname;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8','.png':'image/png'};
function createServer(){
  return http.createServer((req,res)=>{
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'}).end();return;}
    let pathname;
    try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end('Malformed request');return;}
    if(pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify({app:'penalty-panic',version:2}));return;}
    const file=path.resolve(ROOT,'.'+(pathname==='/'?'/index.html':pathname)),relative=path.relative(ROOT,file);
    if(relative.startsWith('..')||path.isAbsolute(relative)||relative.split(/[\\/]/).some(part=>part.startsWith('.'))||!mime[path.extname(file)]){res.writeHead(403).end('Forbidden');return;}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404).end('Not found');return;}
      res.writeHead(200,{'Content-Type':mime[path.extname(file)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      res.end(req.method==='HEAD'?undefined:data);
    });
  });
}
if(require.main===module){
  const server=createServer(),port=Number(process.env.PORT)||4173;
  server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`Port ${port} is in use. Open http://localhost:${port} or stop the existing server first.`:error.message);process.exitCode=1;});
  server.listen(port,'127.0.0.1',()=>console.log(`PENALTY PANIC: http://localhost:${port}`));
}
module.exports={createServer};
