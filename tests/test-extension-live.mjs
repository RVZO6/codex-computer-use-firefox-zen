import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
if(!process.env.FIREFOX_BINARY||!process.env.npm_execpath)throw Error('Run with FIREFOX_BINARY=... npm run test:extension:live');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zen-full-extension-test-'));
fs.cpSync(path.join(root,'extension'),dir,{recursive:true});
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));
// Never connect this disposable profile to the user's native host or app server.
manifest.browser_specific_settings.gecko.id='fork-smoke-test@localhost';
manifest.permissions=manifest.permissions.filter(p=>p!=='nativeMessaging');
manifest.background.scripts.unshift('test-init.js');
manifest.background.scripts.push('test-probe.js');
fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest));
for(const name of ['sidebar-layout.html','sidebar-layout.js','sidebar-layout.css','sidebar-layout-monitor.js']){
  fs.writeFileSync(path.join(dir,'codex-sidepanel',name),fs.readFileSync(path.join(root,'tests/fixtures',name),'utf8').replaceAll('../../extension/codex-sidepanel/','./'));
}
fs.appendFileSync(path.join(dir,'codex-sidepanel/sidebar-layout.js'),`\n
function report(){
 if(!document.querySelector('[aria-label="Send"]'))return false;
 const boxes=[...document.querySelectorAll('button')].map(el=>{const r=el.getBoundingClientRect();return {label:el.getAttribute('aria-label'),left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width}});
 const effort=document.querySelector('[class*="_ModelPickerTriggerEffortLabel_"]');
 parent.postMessage({type:'layout-result',width:innerWidth,height:innerHeight,fontSize:getComputedStyle(document.documentElement).fontSize,scrollWidth:document.documentElement.scrollWidth,effortVisible:getComputedStyle(effort).display!=='none',boxes},'*');return true;
}
const observer=new MutationObserver(()=>{if(report())observer.disconnect()});observer.observe(document.getElementById('root'),{childList:true,subtree:true});
requestAnimationFrame(report);
addEventListener('error',e=>browser.runtime.sendMessage({type:'test-ui-error',error:e.message}));
setTimeout(()=>{if(!document.querySelector('[aria-label="Send"]'))browser.runtime.sendMessage({type:'test-ui-error',error:'Fixture never rendered: '+document.body.innerHTML.slice(0,300)})},5000);
`);
fs.writeFileSync(path.join(dir,'test-init.js'),`
const smokeErrors=[];const smokeMenuTitles=[];
const createMenu=browser.contextMenus.create;browser.contextMenus.create=(options,...args)=>{smokeMenuTitles.push(options.title);return createMenu.call(browser.contextMenus,options,...args)};
addEventListener('error',e=>smokeErrors.push(String(e.message)));
addEventListener('unhandledrejection',e=>smokeErrors.push(String(e.reason)));
const originalConsoleError=console.error;
console.error=(...args)=>{smokeErrors.push(args.map(String).join(' '));originalConsoleError(...args)};
browser.runtime.connectNative=()=>{throw Error('Native host unavailable in isolated smoke test')};
`);
let finish;const done=new Promise(r=>finish=r);const images=new Map();
const server=http.createServer((req,res)=>{let body='';req.on('data',x=>body+=x);req.on('end',()=>{res.end('ok');if(req.url==='/result')finish(JSON.parse(body));else if(req.url.startsWith('/image/'))images.set(req.url.slice(7),body);});});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
fs.writeFileSync(path.join(dir,'test-driver.html'),`<!doctype html><title>Packaged UI responsive tests</title><link rel="stylesheet" href="test-driver.css"><script src="test-driver.js"></script><body></body>`);
fs.writeFileSync(path.join(dir,'test-driver.css'),`body{margin:0;background:#161616;display:flex;gap:12px;padding:12px}iframe{height:600px;flex-shrink:0;border:0}`);
fs.writeFileSync(path.join(dir,'test-driver.js'),`
const widths=[260,320,384,438,600];const results=[];
addEventListener('message',async e=>{
 if(e.data?.type!=='layout-result'||![...document.querySelectorAll('iframe')].some(f=>f.contentWindow===e.source))return;
 if(results.some(r=>r.width===e.data.width))return;
 results.push(e.data);
 if(results.length===widths.length)await browser.runtime.sendMessage({type:'test-layout-complete',results});
});
addEventListener('DOMContentLoaded',()=>{for(const width of widths){const frame=document.createElement('iframe');frame.style.width=width+'px';frame.src='codex-sidepanel/sidebar-layout.html';document.body.append(frame)}});
`);
const sidebarHtml=path.join(dir,'codex-sidepanel/index.html');
fs.writeFileSync(sidebarHtml,fs.readFileSync(sidebarHtml,'utf8').replace('<script src="./firefox-focus-compat.js">','<script src="./test-sidebar-probe.js"></script><script src="./firefox-focus-compat.js">'));
fs.writeFileSync(path.join(dir,'codex-sidepanel/test-sidebar-probe.js'),`const pageErrors=[];addEventListener('error',e=>pageErrors.push(e.message));addEventListener('unhandledrejection',e=>pageErrors.push(String(e.reason)));setTimeout(()=>browser.runtime.sendMessage({type:'test-sidebar-result',children:document.querySelector('#root')?.childElementCount??0,errors:pageErrors}),3000);`);
// Probe the actual sidebar entry in its disconnected recovery state as well as
// the composer components. Authentication and user conversations stay untouched.
const upstream=fs.readFileSync(path.join(dir,'background.js'),'utf8');
const dnrPolicy=upstream.slice(upstream.indexOf('ch=class')+3,upstream.indexOf(';function uh',upstream.indexOf('ch=class')));
fs.writeFileSync(path.join(dir,'test-probe.js'),`
(async()=>{
 try{
  if(!chrome.runtime.onMessage.hasListener)throw Error('Runtime listener shim missing');
  const Un=1000000,lh=1004999;const DnrPolicy=${dnrPolicy};
  const options=await chrome.sidePanel.getOptions({});
  if(options.path!=='codex-sidepanel/index.html')throw Error('Sidebar options mismatch');
  if(!browser.declarativeNetRequest?.getSessionRules)throw Error('Native DNR unavailable');
  let sidebarResolve;const sidebarReport=new Promise(resolve=>sidebarResolve=resolve);
  const driver=await browser.tabs.create({url:browser.runtime.getURL('test-driver.html')});
  const policy=new DnrPolicy();const headerResult=await policy.synchronize(new Map([[driver.id,'fixture']]));
  if(headerResult)throw Error(String(headerResult)+' '+JSON.stringify({resourceTypes:chrome.declarativeNetRequest.ResourceType,actions:chrome.declarativeNetRequest.RuleActionType,operations:chrome.declarativeNetRequest.HeaderOperation}));
  const rules=await browser.declarativeNetRequest.getSessionRules();if(!rules.some(r=>r.action.requestHeaders?.[0]?.header==='x-browser-agent'))throw Error('Controlled-tab request header rule missing');
  await policy.synchronize(new Map());
  browser.runtime.onMessage.addListener(async (message,sender)=>{
   if(message.type==='test-sidebar-result'){sidebarResolve(message);return;}
   if(message.type==='test-ui-error'){await fetch(${JSON.stringify(url+'/result')},{method:'POST',body:JSON.stringify({ok:false,error:message.error,errors:smokeErrors})});return;}
   if(message.type!=='test-layout-complete'||sender.tab?.id!==driver.id)return;
   try{
    for(const result of message.results){
     if(result.fontSize!=='16px'||result.scrollWidth>result.width)throw Error('Root scaling/overflow: '+JSON.stringify(result));
     if(result.boxes.length!==5)throw Error('Missing composer action');
     const ordered=[...result.boxes].sort((a,b)=>a.left-b.left);
     for(let i=0;i<ordered.length;i++){
      const box=ordered[i];
      if(box.width<12||box.left<0||box.right>result.width||box.bottom>result.height)throw Error('Unreachable action: '+JSON.stringify(result));
      if(i&&ordered[i-1].right>box.left+0.5)throw Error('Overlapping actions: '+JSON.stringify(result));
     }
     if(result.width<=384&&result.effortVisible)throw Error('Narrow sidebar must collapse secondary effort label');
    }
    const screenshot=await browser.tabs.captureTab(driver.id,{format:'png'});
    await fetch(${JSON.stringify(url+'/image/sidebar-layout')},{method:'POST',body:screenshot});
    const sidebar=await browser.tabs.create({url:browser.runtime.getURL('codex-sidepanel/index.html')});
    // Give the entry time to render its expected disconnected native-host state.
    const report=await Promise.race([sidebarReport,new Promise((_,reject)=>setTimeout(()=>reject(Error('Sidebar entry did not report')),8000))]);
    if(report.children===0||report.errors.some(e=>/TypeError|ReferenceError|SyntaxError|is not a function|before initialization/.test(e)))throw Error('Sidebar entry failed: '+JSON.stringify(report));
    if(!smokeMenuTitles.includes('Ask ChatGPT'))throw Error('Upstream context menu not registered: '+JSON.stringify(smokeMenuTitles));
    const errors=smokeErrors.filter(e=>/is not a function|SyntaxError|ReferenceError|TypeError|before initialization/.test(e));
    if(errors.length)throw Error('Full background startup failed: '+errors.join(' | '));
    await fetch(${JSON.stringify(url+'/result')},{method:'POST',body:JSON.stringify({ok:true,fullBackgroundBoot:true,sidebarEntryRendered:true,nativeDnr:true,controlledTabHeaderRules:true,customBrowserFont:20,layoutResults:message.results})});
   }catch(e){await fetch(${JSON.stringify(url+'/result')},{method:'POST',body:JSON.stringify({ok:false,error:String(e),errors:smokeErrors})});}
  });
 }catch(e){await fetch(${JSON.stringify(url+'/result')},{method:'POST',body:JSON.stringify({ok:false,error:String(e),errors:smokeErrors})});}
})();`);
const child=spawn(process.execPath,[process.env.npm_execpath,'exec','--yes','--package=web-ext','--','web-ext','run','--source-dir',dir,'--firefox',process.env.FIREFOX_BINARY,'--no-reload','--args=-headless','--pref=font.size.variable.x-western=20'],{stdio:['ignore','pipe','pipe'],detached:process.platform!=='win32'});
let logs='';child.stdout.on('data',x=>logs+=x);child.stderr.on('data',x=>logs+=x);
child.on('error',e=>finish({ok:false,error:String(e)}));child.on('exit',code=>finish({ok:false,error:'web-ext exited '+code,logs}));
const timeout=setTimeout(()=>finish({ok:false,error:'Smoke test timed out',logs}),45000);
try{
 const result=await done;
 const output=process.env.TEST_ARTIFACT_DIR||path.join(root,'dist/test-artifacts');fs.mkdirSync(output,{recursive:true});
 for(const [name,data] of images)fs.writeFileSync(path.join(output,name+'.png'),Buffer.from(data.split(',')[1],'base64'));
 console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;
}finally{
 clearTimeout(timeout);try{process.kill(-child.pid,'SIGTERM')}catch{}
 server.close();fs.rmSync(dir,{recursive:true,force:true});
}
