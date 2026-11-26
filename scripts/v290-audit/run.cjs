'use strict';
// Runs synthetic fixtures only; no browser, IndexedDB or workspace required.
const path=require('node:path'), {execFileSync}=require('node:child_process');
const root=process.env.NSP_FIXTURE_ROOT||path.resolve(__dirname,'../..');
const app=process.argv[2]||path.join(root,'index.html');
for(const name of ['scoped-transport','recovery-journal','print-preflight','project-identity','workspace-storage','shared-controls','shared-templates','component-render']){
 execFileSync(process.execPath,[path.join(__dirname,name+'.cjs'),app,root],{stdio:'inherit'});
}
console.log('V290 audit source/fixture suite PASS (no browser, IndexedDB, disk handles, PDF or Native runtime)');
