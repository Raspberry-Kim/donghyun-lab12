// 실제 버튼 입력으로 메뉴·네이티브/대체 전체 화면을 왕복한다.
// node qa/fullscreen-menu.cjs [URL] [--old-css] [--case=pseudo-dark-1024]
const {chromium}=require('/home/user/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const url=process.argv[2]||'http://127.0.0.1:3012';
const out=path.join(__dirname,'fullscreen-output');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const b=await chromium.launch({channel:'chromium'}),errors=[];let cases=0;
 try{
  for(const pseudo of [false,true])for(const dark of [false,true])for(const size of [{width:1440,height:900},{width:1024,height:600},{width:375,height:812}]){
   const caseName=`${pseudo?'pseudo':'native'}-${dark?'dark':'light'}-${size.width}`;
   const only=process.argv.find(a=>a.startsWith('--case='))?.slice(7);if(only&&only!==caseName)continue;
   const c=await b.newContext({viewport:size}),p=await c.newPage();p.setDefaultTimeout(8000);
   p.on('pageerror',e=>errors.push(e.message));
   if(pseudo)await p.addInitScript(()=>Object.defineProperty(document,'fullscreenEnabled',{get:()=>false}));
   await p.goto(url);await p.locator('#begin').click();await p.locator('[data-speed="0"]').click();
   if(dark)await p.locator('#theme').click();
   if(process.argv.includes('--old-css'))await p.addStyleTag({content:'.game-menu{color:inherit}.game-menu .mi.off{opacity:.45;color:inherit;background:transparent}'});
   // Saved-slot conditions use only this isolated test context.
   await p.locator('#city-save').click();await p.locator('#menu .mi').filter({hasText:'브라우저 칸 1'}).click();
   for(const kind of ['land','hall','save','load']){
    if(kind==='hall'){
     // Stage a developed-city fixture; opening and choosing still use real controls.
     await p.evaluate(()=>{const c=__donghyunsim.city;c.hall={lv:1,ord:{}};c.funds=100000;});
    }
    if(kind==='save'||kind==='load')await p.locator('#city-'+kind).click();
    await p.locator('#full').click();await p.waitForFunction(()=>__donghyunsim.isFull());
    if(kind==='land'||kind==='hall'){
     await p.locator(`#toolgroups [data-group="${kind==='land'?0:3}"]`).click();
     await p.locator(`[data-tool="${kind==='land'?'land':'cityhall'}"]`).click();
     if(await p.locator('#menu').isHidden())await p.locator('#board').click({position:{x:60,y:60}});
    }
    await p.locator('#menu').waitFor({state:'visible'});
    // fullscreenchange 뒤 onFull의 지연 layout까지 기다린다. 전환 중 좌표와 최종 메뉴 위치를 혼동하지 않는다.
    await p.waitForFunction(()=>{
     const menu=document.querySelector('#menu'),r=menu.getBoundingClientRect();
     return __donghyunsim.isFull()&&r.width>0&&r.top>=0&&r.left>=0&&r.bottom<=innerHeight+1&&r.right<=innerWidth+1;
    },null,{timeout:2000});
    const info=await p.locator('#menu').evaluate(e=>{
     const rgb=s=>(s.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
     const lum=a=>a.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((v,x,i)=>v+x*[.2126,.7152,.0722][i],0);
     const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
     const bg=rgb(getComputedStyle(e).backgroundColor),rect=e.getBoundingClientRect();
     return {box:rect.toJSON(),screen:[innerWidth,innerHeight],rows:[...e.querySelectorAll('.mi')].map(row=>{
      const s=getComputedStyle(row),base=s.backgroundColor==='rgba(0, 0, 0, 0)'?bg:rgb(s.backgroundColor);
      const fg=rgb(s.color).map((x,i)=>x*Number(s.opacity)+base[i]*(1-Number(s.opacity)));
      return {text:row.innerText,off:row.classList.contains('off'),contrast:ratio(fg,base)};
     })};
    });
    assert.ok(info.rows.every(r=>r.contrast>=4.5),JSON.stringify({pseudo,dark,size,kind,info}));
    if(info.box.top<0||info.box.bottom>info.screen[1]+1)await p.screenshot({path:path.join(out,'failure-'+caseName+'-'+kind+'.png')});
    assert.ok(info.box.top>=0&&info.box.bottom<=info.screen[1]+1,'menu vertical fit '+JSON.stringify({caseName,kind,info}));
    assert.ok(info.box.left>=0&&info.box.right<=info.screen[0]+1,'menu horizontal fit '+JSON.stringify({caseName,kind,info}));
    const off=p.locator('#menu .mi.off');
    if(await off.count()){
     const before=await p.locator('#menu').innerText();await off.first().click();
     assert.equal(await p.locator('#menu').innerText(),before,'disabled click changed menu');
    }
    await p.screenshot({path:path.join(out,`${pseudo?'pseudo':'native'}-${dark?'dark':'light'}-${size.width}-${kind}.png`)});
    await p.locator('#menu .mi').filter({hasText:'돌아가기'}).click();
    assert.ok(await p.locator('#menu').isHidden());
    await p.locator('#exit-full').click();await p.waitForFunction(()=>!__donghyunsim.isFull());
    cases++;
   }
   await c.close();
  }
  assert.deepEqual(errors,[]);console.log(`PASS ${cases} menu cases · ${process.argv.some(a=>a.startsWith('--case='))?'selected viewport/theme/fullscreen mode':'3 viewports × 2 themes × 2 fullscreen modes'} × 4 menus · pageerror 0`);
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1);});
