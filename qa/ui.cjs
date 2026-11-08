// 화면 시험: node qa/ui.cjs (index.html을 파일로 연다 · build 뒤에 돌린다)
// 첫 화면·규약 오류·도구 누르기·마우스 끌기·3×3 유령 놓기·바퀴 확대·가운데 단추 끌기·정보·보기·속도·멎음·저장과 이어 하기·전체 화면·휴대폰 터치·두 손가락·키보드 무시·시리즈 띠·콘솔 오류를 본다
const {chromium}=require('/home/user/node_modules/playwright'); const path=require('path'); const assert=require('assert');
const url='file://'+path.join(__dirname,'..','index.html');
const H='window.__donghyunsim';
(async()=>{
  const b=await chromium.launch(); const errs=[]; let n=0; const ok=(name)=>{ n++; console.log('ok',name); };
  const p=await b.newPage({viewport:{width:1280,height:900}});
  p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
  await p.goto(url); await p.waitForTimeout(400);
  const G=(js)=>p.evaluate(`(()=>{const S=${H};const c=S.city;return (${js});})()`);
  const bb=async()=>p.$eval('#board',e=>{const r=e.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height};});
  const cellXY=async(x,y)=>{ const r=await bb(); const cam=await G('S.cam'); const ts=16*cam.zoom; return {x:r.x+(x+0.5-cam.x)*ts,y:r.y+(y+0.5-cam.y)*ts}; };
  const cellAt=async(x,y)=>G(`(()=>{const k=c.cell(${x},${y});return {t:k.t,wire:k.wire,z:k.z,b:k.b};})()`);

  // 0) 첫 화면: 시작 카드가 떠 있고 달이 흐르지 않는다. 저장이 없으니 이어 하기는 없다
  assert.strictEqual(await G('S.ready'),true); assert.ok(!(await p.$eval('#ready',e=>e.hidden))); assert.ok(await p.$eval('#resume',e=>e.hidden),'저장 없음 → 이어 하기 숨김');
  assert.strictEqual(await G('c.month'),0); await p.waitForTimeout(1300); assert.strictEqual(await G('c.month'),0,'시작 전에는 달이 흐르지 않는다');
  assert.strictEqual(await p.$eval('#stamp-funds',e=>e.textContent.replace(/\s+/g,' ').trim()),'20,000 냥'); assert.strictEqual(await p.$eval('#tools',e=>e.children.length),12);
  ok('첫 화면: 시작 카드 · 달 멎음 · 도구 12');
  // 1) 규약 오류: 정수 둘 → 시작하지 않는다
  await p.fill('#code','나는 동현이냐?\n뿡뿡 도옹~뿡뿡뿡~뿡뿡 도옹~뿡뿡뿡\n동현이구나'); await p.click('#run'); assert.match(await p.$eval('#result',e=>e.textContent),/규약 오류.*2개/); assert.strictEqual(await G('S.ready'),true);
  await p.fill('#code','나는 동현이냐?\n뿡뿡 도오오오옹~뿡뿡뿡~뿡뿡 도옹~뿡뿡뿡~뿡뿡 도옹~뿡뿡뿡\n동현이구나'); await p.click('#run'); assert.match(await p.$eval('#result',e=>e.textContent),/자금 옵션 4/); assert.strictEqual(await G('S.ready'),true); ok('규약 오류: 개수·범위');
  // 2) 예제 02 로 시작 → 50,000냥, 바로 달이 흐른다
  await p.selectOption('#example','rich'); await p.click('#run'); assert.strictEqual(await G('S.ready'),false); assert.strictEqual(await G('c.funds'),50000); assert.strictEqual(await p.$eval('#funds',e=>e.textContent),'50,000');
  await p.waitForTimeout(1300); assert.ok((await G('c.month'))>=1,'달이 흐른다'); await p.click('.sim-speed button[data-speed="0"]'); const m0=await G('c.month'); await p.waitForTimeout(1200); assert.strictEqual(await G('c.month'),m0,'멈춤'); ok('예제 02: 50,000냥 · 달 흐름 · 멈춤 단추');
  await p.selectOption('#example','sandbox'); await p.click('#run'); assert.strictEqual(await G('c.funds'),100000); assert.deepStrictEqual(await G('[c.events,c.disasters]'),[false,false]); assert.strictEqual(await p.$eval('#set-card',e=>e.textContent.includes('아주 넉넉하게 100,000냥')),true); await p.selectOption('#example','rich'); await p.click('#run'); assert.strictEqual(await G('c.funds'),50000); await p.click('.sim-speed button[data-speed="0"]'); ok('예제 06: 100,000냥 · 이벤트·재해 끔');
  await p.evaluate(()=>document.querySelector('#stage').scrollIntoView({block:'center'}));
  // 3) 도구 단추 → 도구 바뀜. 발전소 3×3: 누른 채 옮기다 떼면 놓인다(유령 초록)
  await p.click('#tools button[data-tool="power"]'); assert.strictEqual(await G('S.tool'),'power'); assert.ok(await p.$eval('#tools button[data-tool="power"]',e=>e.classList.contains('on')));
  let a=await cellXY(3,3); await p.mouse.move(a.x,a.y); await p.mouse.down(); let gh=await G('S.ghost'); assert.ok(gh&&gh.big&&gh.ok&&gh.x===2&&gh.y===2,'유령 '+JSON.stringify(gh));
  a=await cellXY(5,5); await p.mouse.move(a.x,a.y); await p.mouse.up(); assert.strictEqual(await G('c.builds.filter(Boolean).length'),1); assert.deepStrictEqual(await G('[c.builds[0].x,c.builds[0].y]'),[4,4],'떼는 자리에 놓임'); assert.strictEqual(await G('c.funds'),47000); ok('발전소: 유령 따라가다 떼면 3×3 놓임 · −3,000');
  // 4) 길: 끌면 이어진다. 전선: 길 위를 지난다
  await p.click('#tools button[data-tool="road"]'); a=await cellXY(2,9); const z=await cellXY(14,9); await p.mouse.move(a.x,a.y); await p.mouse.down(); await p.mouse.move(z.x,z.y,{steps:4}); await p.mouse.up();
  for(let x=2;x<=14;x++) assert.strictEqual((await cellAt(x,9)).t,3,'길 '+x); assert.strictEqual(await G('c.funds'),47000-130);
  await p.click('#tools button[data-tool="wire"]'); a=await cellXY(5,7); const w2=await cellXY(5,9); await p.mouse.move(a.x,a.y); await p.mouse.down(); await p.mouse.move(w2.x,w2.y,{steps:3}); await p.mouse.up();
  for(let y=7;y<=9;y++) assert.ok((await cellAt(5,y)).wire,'전선 '+y); assert.strictEqual((await cellAt(5,9)).t,3,'길 위 전선'); ok('길·전선: 끌어서 잇기 · 길 위 전선');
  // 5) 주거 구역 놓기(길 아래) → 전기·길 모두 있음 → 몇 달 뒤 자란다
  await p.click('#tools button[data-tool="R"]'); a=await cellXY(5,11); await p.mouse.move(a.x,a.y); await p.mouse.down(); await p.mouse.up(); assert.strictEqual(await G('c.zones.filter(Boolean).length'),1); assert.deepStrictEqual(await G('[c.zones[0].x,c.zones[0].y,c.zones[0].pow,c.zones[0].road]'),[4,10,true,true]);
  // 겹치는 자리 → 거부(빨간 유령), 소리 없이 상태줄에 이유
  a=await cellXY(5,11); await p.mouse.move(a.x,a.y); gh=await G('S.ghost'); assert.ok(gh&&!gh.ok,'겹침 유령 빨강'); await p.mouse.down(); await p.mouse.up(); assert.strictEqual(await G('c.zones.filter(Boolean).length'),1); assert.match(await p.$eval('#status',e=>e.textContent),/3×3/);
  await p.evaluate(`${H}.step(18)`); assert.ok((await G('c.zones[0].lv'))>=1,'자람(18달 · 재해 전)'); assert.ok((await G('c.pop'))>0); assert.match(await p.$eval('#pop',e=>e.textContent),/\d/); ok('주거: 전기·길 → 자람 · 겹침 거부');
  // 6) 철거: 끌면 길이 사라진다. 정보: 칸 설명이 뜬다
  await p.click('#tools button[data-tool="bull"]'); a=await cellXY(13,9); const b2=await cellXY(14,9); await p.mouse.move(a.x,a.y); await p.mouse.down(); await p.mouse.move(b2.x,b2.y,{steps:2}); await p.mouse.up(); assert.strictEqual((await cellAt(13,9)).t,0); assert.strictEqual((await cellAt(14,9)).t,0);
  await p.click('#tools button[data-tool="info"]'); a=await cellXY(5,11); await p.mouse.click(a.x,a.y); assert.ok(!(await p.$eval('#info',e=>e.hidden))); assert.match(await p.$eval('#info',e=>e.textContent),/주거 구역/); ok('철거 끌기 · 정보 풍선');
  // 7) 바퀴 확대·가운데 단추 끌기·+·−·⤢
  const z0=await G('S.cam.zoom'); a=await cellXY(10,10); await p.mouse.move(a.x,a.y); await p.mouse.wheel(0,-600); assert.ok((await G('S.cam.zoom'))>z0,'바퀴로 확대');
  const cx0=await G('S.cam.x'); await p.mouse.move(a.x,a.y); await p.mouse.down({button:'middle'}); await p.mouse.move(a.x-120,a.y,{steps:3}); await p.mouse.up({button:'middle'}); assert.ok((await G('S.cam.x'))>cx0,'가운데 단추로 옮김');
  await p.click('#zoom-fit'); assert.ok(Math.abs((await G('S.cam.zoom'))-z0)<1e-6,'전체 보기'); await p.click('#zoom-in'); assert.ok((await G('S.cam.zoom'))>z0); await p.click('#zoom-out'); ok('확대·축소·옮기기: 바퀴 · 가운데 단추 · 단추');
  // 8) 이동 도구로 끌어도 아무것도 놓이지 않는다
  await p.click('#zoom-in'); await p.click('#tools button[data-tool="pan"]'); const zn=await G('c.zones.filter(Boolean).length'), rn=await G('c.grid.flat().filter(k=>k.t===3).length'); a=await cellXY(12,12); await p.mouse.move(a.x,a.y); await p.mouse.down(); await p.mouse.move(a.x-80,a.y-60,{steps:3}); await p.mouse.up();
  assert.strictEqual(await G('c.zones.filter(Boolean).length'),zn); assert.strictEqual(await G('c.grid.flat().filter(k=>k.t===3).length'),rn); await p.click('#zoom-fit'); ok('이동 도구: 끌어도 놓이지 않음');
  // 9) 보기 바꾸기·속도 바꾸기
  await p.click('.sim-view button[data-view="power"]'); assert.strictEqual(await G('S.view'),'power'); await p.click('.sim-view button[data-view="base"]');
  await p.click('.sim-speed button[data-speed="3"]'); assert.strictEqual(await G('S.speed'),3); const m1=await G('c.month'); await p.waitForTimeout(1000); assert.ok((await G('c.month'))-m1>=3,'아주 빠름'); await p.click('.sim-speed button[data-speed="1"]'); ok('보기·속도');
  // 10) 키보드는 판을 움직이지 않는다
  const snap=await G('JSON.stringify([c.zones.filter(Boolean).length,c.builds.filter(Boolean).length,S.tool,S.cam.zoom,S.view])'); await p.click('.sim-speed button[data-speed="0"]');
  for(const k of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter','Space','KeyX','KeyZ','Digit1','KeyR','Escape','KeyF','KeyM','Equal','Minus']) await p.keyboard.press(k);
  assert.strictEqual(await G('JSON.stringify([c.zones.filter(Boolean).length,c.builds.filter(Boolean).length,S.tool,S.cam.zoom,S.view])'),snap); assert.strictEqual(await G('S.speed'),0); assert.ok(!(await G('S.isFull()'))); ok('키보드: 아무 일도 없음');
  // 11) 저장과 이어 하기: 저장 뒤 새로 열면 이어 하기 단추가 있고 되살아난다
  assert.ok(await p.evaluate(`${H}.save()`)); const saved=await G('JSON.stringify([c.funds,c.month,c.zones.filter(Boolean).length])');
  await p.reload(); await p.waitForTimeout(400); await p.evaluate(()=>document.querySelector('#stage').scrollIntoView({block:'center'})); assert.strictEqual(await G('S.ready'),true); assert.ok(!(await p.$eval('#resume',e=>e.hidden)),'이어 하기 보임'); await p.click('#resume'); assert.strictEqual(await G('S.ready'),false);
  assert.strictEqual(await G('JSON.stringify([c.funds,c.month,c.zones.filter(Boolean).length])'),saved); assert.strictEqual(await G('S.settings.fundsOpt'),0,'저장된 설정(넉넉)'); assert.strictEqual(await p.$eval('#set-card',e=>e.textContent.includes('넉넉')),true); ok('저장 · 이어 하기');
  // 11b) 저장·불러오기 단추와 .dhcity 파일
  const fpath='/tmp/sim-export.dhcity';
  assert.ok(!(await p.$eval('#city-save',e=>e.disabled))); assert.ok(!(await p.$eval('#city-export',e=>e.disabled))); assert.ok(!(await p.$eval('#city-load',e=>e.disabled)));
  await p.evaluate(`${H}.step(7)`); const fundsNow=await G('c.funds'); await p.click('#city-save'); assert.match(await p.$eval('#status',e=>e.textContent),/저장했다/); assert.strictEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('donghyunsim.save')).funds),fundsNow,'저장 단추가 지금 자금을 남긴다');
  await p.evaluate(`${H}.step(3)`); const mLater=await G('c.month'); p.once('dialog',d=>d.accept()); await p.click('#city-load'); assert.strictEqual(await G('c.month'),mLater-3,'불러오기가 저장 시점으로 되돌린다'); assert.strictEqual(await G('S.ready'),false);
  await p.evaluate(`${H}.step(2)`); p.once('dialog',d=>d.dismiss()); await p.click('#city-load'); assert.strictEqual(await G('c.month'),mLater-1,'취소하면 그대로');
  await p.evaluate(()=>{ const o=URL.createObjectURL.bind(URL); URL.createObjectURL=(bl)=>{ window.__lastBlob=bl; return o(bl); }; HTMLAnchorElement.prototype.click=function(){ window.__lastName=this.download; }; });
  await p.click('#city-export'); const expName=await p.evaluate('window.__lastName'); assert.match(expName,/^donghyunsim-.*\.dhcity$/,'파일 이름 '+expName); const expText=await p.evaluate('window.__lastBlob.text()'); require('fs').writeFileSync(fpath,expText); const exp=JSON.parse(expText); assert.strictEqual(exp.v,1); assert.strictEqual(exp.month,mLater-1); assert.match(await p.$eval('#status',e=>e.textContent),/내려받았다/);
  await p.evaluate(`${H}.step(5)`); p.once('dialog',d=>d.accept()); await p.setInputFiles('#city-open',fpath); await p.waitForTimeout(200); assert.strictEqual(await G('c.month'),mLater-1,'파일에서 불러오면 그 시점'); assert.match(await p.$eval('#status',e=>e.textContent),/파일에서 불러왔다/);
  require('fs').writeFileSync('/tmp/sim-bad.dhcity','{"hello":1}'); await p.setInputFiles('#city-open','/tmp/sim-bad.dhcity'); await p.waitForTimeout(200); assert.match(await p.$eval('#status',e=>e.textContent),/도시 파일이 아니다/); assert.strictEqual(await G('c.month'),mLater-1);
  // 첫 화면에서 파일 열기 → 바로 이어진다
  await p.reload(); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(400); await p.evaluate(()=>document.querySelector('#stage').scrollIntoView({block:'center'})); assert.ok(await p.$eval('#resume',e=>e.hidden),'비운 뒤 이어 하기 없음'); // 첫 reload 때 떠나며 저절로 저장되므로 비운 뒤 한 번 더 연다 assert.ok(await p.$eval('#city-load',e=>e.disabled),'저장 없으면 불러오기 잠김');
  await p.setInputFiles('#city-open-ready',fpath); await p.waitForTimeout(200); assert.strictEqual(await G('S.ready'),false); assert.strictEqual(await G('c.month'),mLater-1); assert.strictEqual(await G('c.funds'),exp.funds); ok('저장 단추 · 불러오기(확인·취소) · .dhcity 내려받기·열기 · 잘못된 파일 · 첫 화면 파일 열기');
  // 12) 전체 화면 단추 → fs 상태, 닫기 단추로 돌아온다. 판이 넓어진다
  const w0=(await bb()).w; await p.click('#full'); await p.waitForTimeout(500); assert.ok(await G('S.isFull()')); assert.ok(!(await p.$eval('#exit-full',e=>e.hidden))); assert.ok((await bb()).w>w0,'전체 화면에서 판이 넓다');
  await p.click('#exit-full'); await p.waitForTimeout(400); assert.ok(!(await G('S.isFull()'))); assert.ok(Math.abs((await bb()).w-w0)<2); ok('전체 화면: 켜고 끄기');
  // 13) 다른 탭을 보면 멎고 저장된다
  await p.click('.sim-speed button[data-speed="1"]'); await p.evaluate(()=>{ localStorage.removeItem('donghyunsim.save'); Object.defineProperty(document,'hidden',{get:()=>true,configurable:true}); document.dispatchEvent(new Event('visibilitychange')); });
  assert.strictEqual(await G('S.paused'),true); assert.ok(await p.evaluate(()=>!!localStorage.getItem('donghyunsim.save')),'숨길 때 저장'); const m2=await G('c.month'); await p.waitForTimeout(1200); assert.strictEqual(await G('c.month'),m2);
  await p.evaluate(()=>{ Object.defineProperty(document,'hidden',{get:()=>false,configurable:true}); document.dispatchEvent(new Event('visibilitychange')); }); assert.strictEqual(await G('S.paused'),false); ok('숨기면 멎고 저장');
  // 14) 시리즈 띠: 13개 · 한 줄(1280)
  assert.strictEqual(await p.$eval('.series-links',e=>e.children.length),13); assert.ok((await p.$eval('.series-links',e=>e.getBoundingClientRect().height))<70,'한 줄');
  assert.strictEqual(await p.$eval('.series-item.is-current .series-name',e=>e.textContent.replace('™','')),'동현심'); ok('시리즈 띠 13 · 한 줄');
  await p.evaluate(()=>localStorage.clear());
  // 15) 휴대폰: 터치만으로 시작·도구·길 끌기·3×3 놓기·두 손가락 옮기기, 그리고 전체 화면
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const m=await ctx.newPage();
  m.on('pageerror',e=>errs.push('mobile: '+e.message)); m.on('console',x=>{ if(x.type()==='error') errs.push('mobile console: '+x.text()); });
  await m.goto(url); await m.waitForTimeout(400); await m.evaluate(()=>document.querySelector('#stage').scrollIntoView());
  const MG=(js)=>m.evaluate(`(()=>{const S=${H};const c=S.city;return (${js});})()`);
  const mcell=async(x,y)=>{ const r=await m.$eval('#board',e=>{const r=e.getBoundingClientRect();return {x:r.left,y:r.top};}); const cam=await MG('S.cam'); const ts=16*cam.zoom; return {x:r.x+(x+0.5-cam.x)*ts,y:r.y+(y+0.5-cam.y)*ts}; };
  const cdp=await ctx.newCDPSession(m); // 진짜 터치 사건(두 손가락 포함)을 넣는다
  const touch=async(seq)=>{ // seq: [{type:'start'|'move'|'end', pts:[{id,x,y}]}]
    for(const s of seq){ const type=s.type==='start'?'touchStart':s.type==='move'?'touchMove':'touchEnd'; const pts=s.type==='end'?[]:s.pts.map(pt=>({x:pt.x,y:pt.y,id:pt.id,radiusX:3,radiusY:3,force:1}));
      await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts}); await m.waitForTimeout(30); } };
  assert.strictEqual(await m.$eval('#tools',e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),6,'휴대폰 도구 6열');
  await m.tap('#begin'); assert.strictEqual(await MG('S.ready'),false);
  await m.tap('#tools button[data-tool="power"]'); let c1=await mcell(8,16); await touch([{type:'start',pts:[{id:1,...c1}]},{type:'move',pts:[{id:1,x:c1.x+4,y:c1.y+4}]},{type:'end',pts:[{id:1,x:c1.x+4,y:c1.y+4}]}]);
  assert.strictEqual(await MG('c.builds.filter(Boolean).length'),1,'터치로 발전소');
  await m.tap('#tools button[data-tool="road"]'); c1=await mcell(2,20); let c2=await mcell(12,20); await touch([{type:'start',pts:[{id:1,...c1}]},{type:'move',pts:[{id:1,x:(c1.x+c2.x)/2,y:c1.y}]},{type:'move',pts:[{id:1,...c2}]},{type:'end',pts:[{id:1,...c2}]}]);
  assert.ok((await MG('c.grid[20].filter(k=>k.t===3).length'))>=11,'터치로 길 끌기');
  // 두 손가락: 벌리면 커지고, 놓이는 것은 없다
  const zz=await MG('S.cam.zoom'), roads=await MG('c.grid.flat().filter(k=>k.t===3).length'); const mid=await mcell(20,20);
  await touch([{type:'start',pts:[{id:1,x:mid.x-30,y:mid.y}]},{type:'start',pts:[{id:2,x:mid.x+30,y:mid.y}]},{type:'move',pts:[{id:1,x:mid.x-80,y:mid.y},{id:2,x:mid.x+80,y:mid.y}]},{type:'end',pts:[{id:1,x:mid.x-80,y:mid.y},{id:2,x:mid.x+80,y:mid.y}]}]);
  assert.ok((await MG('S.cam.zoom'))>zz,'두 손가락 벌려 확대'); assert.strictEqual(await MG('c.grid.flat().filter(k=>k.t===3).length'),roads,'두 손가락으로 길이 놓이지 않음');
  const cx1=await MG('S.cam.x'); await touch([{type:'start',pts:[{id:1,x:mid.x-30,y:mid.y}]},{type:'start',pts:[{id:2,x:mid.x+30,y:mid.y}]},{type:'move',pts:[{id:1,x:mid.x-90,y:mid.y},{id:2,x:mid.x-30,y:mid.y}]},{type:'end',pts:[{id:1,x:mid.x-90,y:mid.y},{id:2,x:mid.x-30,y:mid.y}]}]);
  assert.ok((await MG('S.cam.x'))>cx1,'두 손가락으로 옮김');
  await m.tap('#full'); await m.waitForTimeout(500); assert.ok(await MG('S.isFull()')); assert.ok((await m.$eval('#board',e=>e.getBoundingClientRect().width))>=360); await m.tap('#exit-full'); await m.waitForTimeout(300); assert.ok(!(await MG('S.isFull()')));
  assert.strictEqual(await m.$eval('.series-links',e=>e.children.length),13); assert.strictEqual(await m.$eval('.series-item[data-series="lang"]',e=>getComputedStyle(e).gridColumn.replace(/\s/g,'')),'span2'); assert.notStrictEqual(await m.$eval('.series-item[data-series="zooo"]',e=>getComputedStyle(e).gridColumn.replace(/\s/g,'')),'span2','13개(홀수)면 동현랭만 크다');
  ok('휴대폰: 터치 시작·발전소·길 끌기·두 손가락·전체 화면·띠');
  await ctx.close(); await b.close();
  if(errs.length){ console.error('콘솔 오류',errs); process.exit(1); }
  console.log(`\n${n} ui tests passed · 콘솔 오류 0`);
})().catch(e=>{ console.error(e); process.exit(1); });
