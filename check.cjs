'use strict';
const {spawnSync}=require('node:child_process');
const {readdirSync}=require('node:fs');
for(const file of readdirSync(__dirname).filter(f=>/\.(js|cjs)$/.test(f))){const check=spawnSync(process.execPath,['--check',file],{cwd:__dirname,encoding:'utf8'});if(check.status){console.error(file,check.stderr);process.exit(1);}}
console.log('All JavaScript syntax checks passed.');
