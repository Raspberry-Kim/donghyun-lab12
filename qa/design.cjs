// v0.11 그림 전수·상태 불변·건물 밀집 지도·반응형 회귀 검사.
// node qa/design.cjs [공개 URL]; 생성 결과는 qa/design-output/ 아래에만 둔다.
const {chromium}=require('/home/user/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const out=path.join(__dirname,'design-output');fs.mkdirSync(out,{recursive:true});
const url=process.argv[2]||'file://'+path.join(__dirname,'..','index.html');
(async()=>{
  const b=await chromium.launch({channel:'chromium'});
  try{
    const p=await b.newPage({viewport:{width:1440,height:1000}});
    const errors=[];p.on('pageerror',e=>errors.push(e.message));
    await p.goto(url);await p.waitForFunction(()=>window.__donghyunsim);
    const coverage=await p.evaluate(()=>{
      const keys=Object.keys(Tiles.SPR),fail=[];
      for(const key of keys){
        const rows=Tiles.SPR[key].trim().split('\n');
        if(rows.some(r=>r.length!==rows[0].length))fail.push(key+' ragged');
        if(rows.some(r=>[...r].some(c=>!(c in Tiles.PAL))))fail.push(key+' palette');
        const s=Tiles.make(key);if(s.width!==rows[0].length||s.height!==rows.length)fail.push(key+' canvas');
      }
      const zones=Sim.KINDS.flatMap(k=>[1,2,3,4,5].map(l=>k+l)),buildings=Object.keys(Sim.BUILD_NAME);
      for(const k of zones)if(Tiles.make(k).width!==48)fail.push(k+' footprint');
      for(const k of buildings)if(Tiles.make(k).width!==Sim.sizeOf(k)*16)fail.push(k+' footprint');
      return {tiles:keys.length,zones:zones.length,buildings:buildings.length,
        unique:new Set([...zones,...buildings].map(k=>Tiles.SPR[k])).size,fail};
    });
    assert.deepEqual(coverage,{tiles:89,zones:30,buildings:18,unique:48,fail:[]});
    console.log('PASS 89개 그림·팔레트·부지, 서로 다른 구역 30종·시설 18종');
    await p.selectOption('#example','sandbox');await p.click('#run');
    await p.click('.sim-speed [data-speed="0"]');
    // Drawing fixture only; not a gameplay shortcut. ui.cjs verifies real construction.
    await p.evaluate(()=>{
      const S=__donghyunsim,c=S.city;
      for(const row of c.grid)for(const k of row){k.t=Sim.T.GRASS;k.wire=false;k.z=-1;k.b=-1;}
      c.zones=[];c.builds=[];c.month=120;c.funds=9999999;
      const paint=(item,i,type,n)=>{
        for(let yy=item.y;yy<item.y+n;yy++)for(let xx=item.x;xx<item.x+n;xx++){
          const k=c.grid[yy][xx];k.t=type;if(type===Sim.T.ZONE)k.z=i;else k.b=i;
        }
      };
      Sim.KINDS.forEach((kind,r)=>[1,2,3,4,5].forEach(lv=>{
        const z={kind,lv,x:1+(lv-1)*4,y:1+r*5,pow:true,road:true,grow:-99};
        paint(z,c.zones.length,Sim.T.ZONE,3);c.zones.push(z);
      }));
      Object.keys(Sim.BUILD_NAME).forEach((kind,i)=>{
        const item={kind,s:Sim.sizeOf(kind),x:22+(i%3)*6,y:1+Math.floor(i/3)*6,pow:true,age:0,worn:false};
        paint(item,c.builds.length,Sim.T.BUILD,item.s);c.builds.push(item);
      });
      for(let y=4;y<32;y+=5)for(let x=0;x<21;x++)c.grid[y][x].t=Sim.T.ROAD;
      c.developed=30;S.draw();
      const before=JSON.stringify(c.snapshot());
      for(let i=0;i<30;i++)S.draw();
      window.__designUnchanged=before===JSON.stringify(c.snapshot());
    });
    assert(await p.evaluate(()=>window.__designUnchanged));
    console.log('PASS 밀집 지도 48종·30회 렌더 전후 도시 스냅샷 동일');
    await p.click('#full');await p.waitForFunction(()=>__donghyunsim.isFull());
    // Keep the clock static without a pause overlay in visual-only fixtures.
    await p.evaluate(()=>{__donghyunsim.setSpeed(1,true);window.__designTick=__donghyunsim.city.tick;__donghyunsim.city.tick=()=>{};});
    await p.screenshot({path:path.join(out,'all-buildings.png')});
    for(const v of ['power','pol','crime','val','base']){
      const button=p.locator(`.sim-view [data-view="${v}"]`);
      if(await button.count())await button.click();
    }
    await p.click('#exit-full');
    await p.click('#city-save');assert(await p.locator('#menu').isVisible());
    await p.locator('#menu .mi').filter({hasText:'돌아가기'}).click();
    await p.click('#theme');await p.screenshot({path:path.join(out,'dark.png')});await p.click('#theme');
    await p.click('#sound');assert.equal(await p.locator('#sound').getAttribute('aria-pressed'),'false');await p.click('#sound');
    for(const size of [{width:375,height:812},{width:1440,height:650},{width:1440,height:1000}]){
      await p.setViewportSize(size);await p.click('#full');
      await p.waitForFunction(()=>__donghyunsim.isFull());
      await p.screenshot({path:path.join(out,`full-${size.width}-${size.height}.png`)});
      const fit=await p.evaluate(()=>{
        const r=document.querySelector('#board').getBoundingClientRect();
        return {w:r.width,h:r.height,overflow:document.documentElement.scrollWidth>innerWidth+1};
      });
      assert(fit.w>0&&fit.h>0&&!fit.overflow,JSON.stringify(fit));
      await p.click('#exit-full');
    }
    console.log('PASS 375px·짧은/넓은 데스크톱, 전체 화면·보기·메뉴·테마·소리 왕복');
    const snapshot=await p.evaluate(()=>__donghyunsim.snapshot());
    await p.evaluate(s=>{__donghyunsim.restore(s);__donghyunsim.setSpeed(0,true);},snapshot);
    const restored=await p.evaluate(()=>__donghyunsim.snapshot());
    assert.deepEqual(restored.state.zones,snapshot.state.zones);
    assert.deepEqual(restored.state.builds,snapshot.state.builds);
    assert.deepEqual(restored.state.grid,snapshot.state.grid);
    assert.equal(restored.state.funds,snapshot.state.funds);
    console.log('PASS 48종 포함 v2 저장 복원: 건물·구역·지형·자금 동일');
    const times=await p.evaluate(()=>new Promise(resolve=>{
      const dt=[];let last=0;function frame(t){if(last)dt.push(t-last);last=t;if(dt.length<60)requestAnimationFrame(frame);else resolve(dt.sort((a,b)=>a-b)[30]);}requestAnimationFrame(frame);
    }));
    assert(times<50);assert.deepEqual(errors,[]);
    console.log(`PASS 중앙 프레임 ${times.toFixed(1)}ms · 브라우저 오류 0`);
    fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({coverage,frameMedianMs:times,errors},null,2));
  }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
