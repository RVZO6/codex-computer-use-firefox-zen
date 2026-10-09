import assert from "node:assert/strict";
import fs from "node:fs";
import { absoluteFilePath } from "../extension/codex-sidepanel/firefox-file-path.js";

for (const [path, cwd, expected] of [
  ["outputs/file.txt", "/Users/test/project", "/Users/test/project/outputs/file.txt"],
  ["./outputs/../file.txt", "/Users/test/project/", "/Users/test/project/file.txt"],
  ["../file.txt", "/tmp/work", "/tmp/file.txt"],
  ["/tmp/a/../file.txt", undefined, "/tmp/file.txt"],
  ["outputs/file.txt", undefined, null],
  ["outputs/file.txt", "relative/project", null],
  ["https://example.test/file.txt", "/tmp", null],
  ["file:///tmp/a%20b.txt", undefined, "/tmp/a b.txt"],
  ["outputs/file.txt", "C:\\Users\\test", "C:\\Users\\test\\outputs\\file.txt"],
  ["C:\\work\\..\\file.txt", "/tmp", "C:\\file.txt"],
  ["\\file.txt", "C:\\work", "C:\\file.txt"],
  ["file:///C:/work/a%20b.txt", null, "C:\\work\\a b.txt"],
  ["outputs/file.txt", "\\\\server\\share\\work", "\\\\server\\share\\work\\outputs\\file.txt"],
  ["../../../../file.txt", "\\\\server\\share\\work", "\\\\server\\share\\file.txt"],
]) assert.equal(absoluteFilePath(path, cwd), expected);

const menu = fs.readFileSync("extension/codex-sidepanel/assets/workspace-file-tab-context-menu-BqXeq-x9.js", "utf8");
assert.ok(menu.includes("absoluteFilePath(O,l??getFileTabCwd(r))"), "Copy path must resolve against the run, not the browser.");
assert.ok(menu.includes("Copy relative path"), "An unknown working directory must not be mislabeled as an absolute path.");
assert.ok(menu.includes("path:P??O"), "Copy contents must read the same resolved file as Copy path.");
console.log(JSON.stringify({ ok: true, absoluteFilePaths: true, unknownCwdIsExplicit: true }));

// Exercise the actual packaged menu callback with a small host/thread scope,
// not just the path utility or a minified-string assertion.
const {default:vm}=await import('node:vm');
const factory=menu.slice(menu.indexOf('function C('),menu.indexOf('function w('));
for(const [cwd,threadCwd,expected,label] of [
  ['/Users/test/project',null,'/Users/test/project/outputs/file.txt','Copy path'],
  [null,'/Users/test/project','/Users/test/project/outputs/file.txt','Copy path'],
  [null,null,'outputs/file.txt','Copy relative path'],
]){
  const copied=[],read=[];
  const context=vm.createContext({absoluteFilePath,getFileTabCwd:()=>threadCwd,
    d:{},f:{},p:{},b:()=>({primaryTarget:null,visibleTargets:[]}),n:()=>true,
    y:{copyPath:{defaultMessage:'Copy path'}},o:x=>x,
    t:{clipboard:{async writeText(value){copied.push(value)}}},g:()=>{},
    v:(_client,options)=>read.push(options.path),s:()=>{throw Error('Old relative resolver used')},
  });
  const create=vm.runInContext(factory+';C',context);
  const scope={get:()=>({isCapable:false}),query:{getData:()=>undefined},queryClient:{}};
  const items=create(scope,{cwd,path:'outputs/file.txt'});
  const copy=items.find(x=>x.id==='workspace-file-copy-path');
  assert.equal(copy.message.defaultMessage,label);copy.onSelect();
  assert.deepEqual(copied,[expected]);
  items.find(x=>x.id==='workspace-file-copy-contents').onSelect();
  assert.deepEqual(read,[expected]);
}
console.log(JSON.stringify({ok:true,packagedCopyPathMenu:true,resolvedCopyContents:true}));
