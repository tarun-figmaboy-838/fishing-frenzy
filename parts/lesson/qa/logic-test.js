// Headless logic test (Node, no browser): node qa/logic-test.js
// Loads the engine with stand-ins for the page, goes through every screen doing its task, and checks that every
// {{binding}} in index.html has a value and that each screen finishes and moves on. Ends with NO ERRORS or a list.
const fs=require('fs');
const path=require('path'), rd=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const html=rd('index.html');
const js=rd('js/config.js')+'\n'+rd('js/lesson-data.js')+'\n'+rd('js/game-engine.js').replace('window.TrapeziumGame = class TrapeziumGame','const Component = class Component');
const tpl=html.match(/<x-dc>([\s\S]*?)<\/x-dc>/)[1];
class DCLogic{constructor(p){this.props=p||{}} setState(u,cb){const v=typeof u==='function'?u(this.state):u; this.state=Object.assign({},this.state,v); if(cb) cb();} }
// js/motion.js (GSAP) needs a browser: a stand-in that does no animation but finishes waits and value/morph tweens at once
const Motion=new Proxy({},{get:(o,k)=>k==='wait'?(sec,fn)=>fn():k==='value'?(from,to,d,e,onUpdate,onDone)=>{onUpdate(to); if(onDone) onDone();}:k==='morph'?(from,frames,onUpdate,onSeg,onDone)=>{const f=frames[frames.length-1]; onUpdate({A:f.A,B:f.B}); onDone();}:()=>{}});
// run the engine source, passing stand-ins for DCLogic, React, window and Motion
const Component=new Function('DCLogic','StreamableLogic','React','window','Motion', js+'; return Component;')(DCLogic,DCLogic,{},{},Motion);
// run the engine's timers 40x faster
const c=new Component({});
const realTm=c.tm.bind(c);
c.tm=function(fn,ms){return realTm(fn,Math.max(0,ms/40));};
// every {{binding}} in the markup; loops maps a loop variable to the list it repeats over
const holes=[...tpl.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map(m=>m[1]).filter(h=>!/^(true|false)$/.test(h));
const loops={th:'thumbs',tg:'tags',o:'opts',sl:'slots',lb:'labs',cp:'chips',wd:'words'};
const get=(o,p)=>p.split('.').reduce((a,k)=>a==null?undefined:a[k],o);
const errs=[];
// render the current screen's values and report any binding that comes out undefined
function check(label){
  let v; try{ v=c.renderVals(); }catch(e){ errs.push(label+': renderVals threw '+e.stack); return; }
  for(const h of holes){
    const root=h.split('.')[0];
    if(loops[root]){ const L=v[loops[root]]; if(!Array.isArray(L)){errs.push(label+': list '+loops[root]+' not array'); continue;} for(const it of L){ if(get({[root]:it},h)===undefined) errs.push(label+': undefined '+h);} continue; }
    if(root==='g' && !v.isLesson) continue;
    if(root==='c1' && !v.isCfu1) continue;
    if(get(v,h)===undefined) errs.push(label+': undefined '+h);
  }
  return v;
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// focus screens: the shape can only be tapped once it has reached centre stage
const focusWait=async()=>{ for(let k=0;k<100&&c.cur().layout==='focus'&&!c.state.centered;k++) await sleep(20); if(c.cur().layout==='focus'&&!c.state.centered) errs.push(c.cur().id+': shape never reached centre'); };
(async()=>{
  check('prestart');
  // during the walk, record 'move on' requests instead of acting on them, so each step can be checked in place
  const realAdvance=c.maybeAdvance; let advCalls=0;
  c.maybeAdvance=function(){ if(this.state.done) advCalls++; };
  c.start();
  const steps=c.steps();
  for(let i=0;i<steps.length;i++){
    const st=steps[i];
    // finished screens move on by themselves: make sure we are testing step i
    if(c.state.step!==i){ c.navAt=0; c.goTo(i,true); }
    advCalls=0;
    await sleep(30);
    let v=check(st.id+':enter');
    const before=c.state.done;
    const P=c.state.P;
    switch(st.task){
      case 'extLegs': case 'extBases': case 'measure': // these screens play by themselves: wait until done
      case 'measureAngles': for(let w=0;w<160&&!c.state.done;w++) await sleep(50); break;
      case 'dragFree': { const Q=c.clone(P); Q.B.x=Q.B.x-40; c.setState({P:Q,moved:true}); c.dragMoved=true; c.checkDrag('B'); await sleep(600);
        // explore: dragging never completes the screen - only Done does (and only once)
        if(st.explore){ if(c.state.done) errs.push(st.id+': explore completed by dragging'); if(!c.state.explored) errs.push(st.id+': drag did not unlock Done'); const at=c.state.step; c.navAt=0; c.doneExplore(); c.doneExplore(); if(c.state.step!==at+1) errs.push(st.id+': Done did not move on exactly once (step '+c.state.step+')'); c.navAt=0; c.goTo(at,true); c.setState({done:true}); advCalls=1; }
        break; }
      case 'drag90': { const Q=c.clone(P); Q.A.x=Q.D.x+3; c.setState({P:Q,moved:true}); c.checkDrag('A'); await sleep(600); if(Math.abs(c.angle(c.state.P,'A')-90)>0.5) errs.push('drag90: no snap to 90'); break; }
      case 'dragA': { const Q=c.clone(P); Q.A.x=Q.D.x+(Q.C.x-Q.B.x); // legs exactly equal (the screen needs AD to read exactly BC)
        c.setState({P:Q,moved:true}); c.checkDrag('A'); break; }
    }
    // screen 35: tap the two right angles (it is finished once both are found)
    if(st.rightTap){ ['A','B','C','D'].filter(k=>Math.abs(c.angle(c.state.P,k)-90)<0.5).forEach(k=>c.rightTap(k)); }
    // answer screens: a wrong pick first, then the right one
    if((st.cfu||st.practice) && st.opts){ const bad=st.opts.find(o=>!o.ok); c.pick(bad); check(st.id+':bad'); c.pick(st.opts.find(o=>o.ok)); }
    // check 4 (drag the labels to the shapes): a wrong placement first, then the right one
    if(st.cfu===4){ c.place('iso','s0',c.state.c4); c.place('scal','s1',c.state.c4); c.place('right','s2',c.state.c4); await sleep(100); check('cfu4-wrong'); 
      const c4=c.state.c4; console.log('  after wrong check locked', JSON.stringify(c4.locked), JSON.stringify(c4.at));
      c.place('scal','s0',c.state.c4); c.place('iso','s1',c.state.c4); await sleep(100); }
    v=check(st.id+':after');
    const V=c.vals(c.state.P);
    const lens=[c.dist(c.state.P.A,c.state.P.D)/40, c.dist(c.state.P.B,c.state.P.C)/40].map(x=>x.toFixed(2));
    console.log(String(i).padStart(2), st.id.padEnd(9), 'done', c.state.done, '| chips', JSON.stringify(v.chips.map(x=>x.t)), '| hint', v.hintText||'-', '| ang', JSON.stringify(V), '| legs', lens.join('/'), '| tags', v.tags.filter(t=>t.cls!=='vlab').map(t=>t.t).join(','));
    if(!c.state.done) errs.push(st.id+': task not done');
    if(st.task||st.cfu||st.opts){ for(let w=0;w<60&&!advCalls;w++) await sleep(50); if(!advCalls) errs.push(st.id+': finished but never moves on'); } // polled: a busy machine slows the (sped-up) timers
    // on to the next screen
    c.navAt=0; if(i<steps.length-1){ if(st.task==='dragA'||st.task==='dragD90'){ c.goTo(i+1,true);} else c.next(); }
  }
  // there is no Next or Back (CONFIG.flow.autoAdvance): a finished narration screen moves on by itself, and so do
  // autoNext screens; a screen that asks for something waits until it is done
  c.maybeAdvance=realAdvance;
  { const k=steps.findIndex(x=>x.id==='parallel'); c.navAt=0; c.goTo(k,true); for(let w=0;w<120&&c.state.step===k;w++) await sleep(50); if(c.state.step!==k+1) errs.push('parallel: did not move on by itself (step '+c.state.step+')'); else console.log('narration screen moves on by itself: ok'); }
  { const k=steps.findIndex(x=>x.autoNext); c.navAt=0; c.goTo(k,true); for(let w=0;w<80&&c.state.step<=k;w++) await sleep(50); if(c.state.step<=k) errs.push(steps[k].id+': autoNext screen did not move on'); else console.log('autoNext screen moves on: ok'); }
  { const k=steps.findIndex(x=>x.cfu===2); c.navAt=0; c.goTo(k,true); await sleep(1500); if(c.state.step!==k) errs.push('cfu2: moved on before it was answered'); else console.log('a check waits for its answer: ok'); }
  // print how a few lines are rewritten for the voice (symbols to words)
  ['So, AB is parallel to CD.','Can you make ∠A exactly 90°?','In an isosceles trapezium, AB = 6 cm, CD = 10 cm and AD = 5 cm. What is the length of BC?','∠A + ∠D = 180°'].forEach(t=>console.log('SPEECH:',c.speechOf(t)));
  console.log(errs.length? 'ERRORS:\n'+[...new Set(errs)].join('\n') : 'NO ERRORS');
  process.exit(0);
})();
