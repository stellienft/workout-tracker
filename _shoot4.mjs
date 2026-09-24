import { chromium } from "playwright-core";
const OUT="/tmp/claude-0/-home-user-workout-tracker/b792d247-7d97-5b77-af3e-9cb01c7fe5e2/scratchpad";
const BASE="http://127.0.0.1:3210";
async function ready(){for(let i=0;i<45;i++){try{const r=await fetch(BASE+"/");if(r.status===200)return}catch{}await new Promise(r=>setTimeout(r,1000))}throw new Error("nr")}
await ready();
const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});
const c=await b.newContext({viewport:{width:1440,height:900},reducedMotion:"reduce"});
const p=await c.newPage();await p.goto(BASE+"/",{waitUntil:"networkidle"});await p.waitForTimeout(1000);
await p.screenshot({path:`${OUT}/v2-hero.png`});
await p.locator("#features").screenshot({path:`${OUT}/v2-features.png`});
await p.locator("#bento").screenshot({path:`${OUT}/v2-bento.png`});
await b.close();console.log("ok");
