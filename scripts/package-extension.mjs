#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {deflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
process.chdir(root);
execFileSync(process.execPath,['scripts/check-version.mjs'],{stdio:'inherit'});
execFileSync(process.execPath,['scripts/verify-extension.mjs'],{stdio:'inherit'});
if(execFileSync('git',['status','--porcelain','--untracked-files=normal'],{encoding:'utf8'}).trim())throw Error('Commit the source before packaging so the source archive matches the extension.');
const build=JSON.parse(fs.readFileSync('fork-build.json','utf8'));
const stem=`codex-computer-use-firefox-zen-${build.build}`;
const dist=path.join(root,'dist');fs.mkdirSync(dist,{recursive:true});
const table=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0});
const crc32=data=>{let crc=0xffffffff;for(const byte of data)crc=table[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0};
const files=[];
function walk(dir,prefix=''){for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){const name=prefix+entry.name;const full=path.join(dir,entry.name);if(entry.isSymbolicLink())throw Error('Refusing to package symlink '+name);if(entry.isDirectory())walk(full,name+'/');else if(entry.isFile())files.push({name,data:fs.readFileSync(full)})}}
walk(path.join(root,'extension'));
const parts=[],central=[];let offset=0;
for(const {name,data} of files){
 const filename=Buffer.from(name),compressed=deflateRawSync(data,{level:9}),crc=crc32(data);
 const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(0x800,6);local.writeUInt16LE(8,8);local.writeUInt16LE(0x21,12);local.writeUInt32LE(crc,14);local.writeUInt32LE(compressed.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(filename.length,26);
 const entry=Buffer.alloc(46);entry.writeUInt32LE(0x02014b50);entry.writeUInt16LE(20,4);entry.writeUInt16LE(20,6);entry.writeUInt16LE(0x800,8);entry.writeUInt16LE(8,10);entry.writeUInt16LE(0x21,14);entry.writeUInt32LE(crc,16);entry.writeUInt32LE(compressed.length,20);entry.writeUInt32LE(data.length,24);entry.writeUInt16LE(filename.length,28);entry.writeUInt32LE(offset,42);
 parts.push(local,filename,compressed);central.push(entry,filename);offset+=local.length+filename.length+compressed.length;
}
const centralData=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(centralData.length,12);end.writeUInt32LE(offset,16);
const archive=Buffer.concat([...parts,centralData,end]);
for(const suffix of ['zip','xpi'])fs.writeFileSync(path.join(dist,`${stem}.${suffix}`),archive);
execFileSync('git',['archive','--format=zip',`--output=${path.join(dist,stem+'-source.zip')}`,'HEAD']);
const artifacts=[stem+'.zip',stem+'.xpi',stem+'-source.zip'];
const checksums=artifacts.map(name=>`${createHash('sha256').update(fs.readFileSync(path.join(dist,name))).digest('hex')}  ${name}`).join('\n')+'\n';
fs.writeFileSync(path.join(dist,'SHA256SUMS'),checksums);
console.log(JSON.stringify({build:build.build,commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),files:files.length,artifacts:artifacts.map(name=>({path:path.join(dist,name),bytes:fs.statSync(path.join(dist,name)).size}))},null,2));
