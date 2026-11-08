// 동현심 도시 엔진 검사: node qa/core-tests.cjs
// 지도, 놓기와 값, 다리와 강 위 전선, 전력 전달, 길 닿기, 성장과 단계, 세금과 유지비, 철거, 재해와 이벤트, 저장과 복원, 규약 예제를 본다.
const assert=require('assert');
const S=require('../src/engine.js').Sim; const {City,W,H,T,KINDS,COST,UPKEEP,PLANT_ZONES,MAX_LV,FUNDS_OPTS,TITLES,POP_PER_LV,parseSet,makeMap}=S;
const D=require('../src/donghyun.js'); const {examples}=require('../src/examples.js');
let n=0; const ok=(name,f)=>{ f(); n++; console.log('ok',name); };
const run=(c,months)=>{ for(let i=0;i<months;i++) c.tick(); };
/* 강 왼쪽 평지에 발전소·길·구역을 놓는 작은 도시 */
function smallTown(opts){ const c=new City(Object.assign({seed:7,events:false,disasters:false},opts||{}));
  assert.ok(c.placeBuilding('power',2,2).ok); for(let x=1;x<=13;x++) assert.ok(c.placeRoad(x,7).ok,'길 '+x);
  for(let y=5;y<=7;y++) assert.ok(c.placeWire(3,y).ok,'전선 '+y);
  assert.ok(c.placeZone('R',2,8).ok); assert.ok(c.placeZone('R',5,8).ok); assert.ok(c.placeZone('C',8,8).ok); assert.ok(c.placeZone('I',11,8).ok); c.recompute(); return c; }

ok('지도: 40×40, 강이 위에서 아래로 이어지고 폭 3~4, 숲이 있고, 늘 같은 지도다',()=>{
  const g=makeMap(), g2=makeMap(); assert.strictEqual(g.length,H); assert.strictEqual(g[0].length,W);
  let trees=0; for(let y=0;y<H;y++){ const xs=[]; for(let x=0;x<W;x++){ if(g[y][x].t===T.WATER) xs.push(x); if(g[y][x].t===T.TREE) trees++; }
    assert.ok(xs.length>=3&&xs.length<=4,`줄 ${y} 강 폭 ${xs.length}`); assert.ok(xs[xs.length-1]-xs[0]===xs.length-1,'강이 끊김'); }
  assert.ok(trees>60,'숲 '+trees); assert.deepStrictEqual(g.map(r=>r.map(c=>c.t)),g2.map(r=>r.map(c=>c.t)));
});
ok('자금 옵션: 0 넉넉 50,000 · 1 보통 20,000 · 2 빠듯 10,000 · 3 아주 넉넉 100,000, 기본 1 1 1',()=>{
  assert.deepStrictEqual(FUNDS_OPTS,[50000,20000,10000,100000]); assert.strictEqual(new City({fundsOpt:3}).funds,100000);
  assert.strictEqual(new City({fundsOpt:0}).funds,50000); assert.strictEqual(new City({}).funds,20000); assert.strictEqual(new City({fundsOpt:2}).funds,10000);
  const c=new City({}); assert.ok(c.events&&c.disasters); assert.strictEqual(c.title,'촌락'); assert.strictEqual(c.log.length,1);
});
ok('놓기와 값: 길 10 · 다리 50 · 전선 5 · 강 위 전선 25 · 구역 100 · 공원 30 · 발전소 3,000 · 경찰서·소방서 500',()=>{
  const c=new City({seed:1,events:false,disasters:false}); const f0=c.funds;
  assert.strictEqual(c.placeRoad(1,1).cost,10); let wx=-1; for(let x=0;x<W;x++) if(c.grid[20][x].t===T.WATER){ wx=x; break; }
  assert.strictEqual(c.placeRoad(wx,20).cost,50); assert.ok(c.grid[20][wx].bridge);
  assert.strictEqual(c.placeWire(1,2).cost,5); assert.strictEqual(c.placeWire(wx,21).cost,25); assert.ok(c.grid[21][wx].wire&&c.grid[21][wx].t===T.WATER);
  assert.strictEqual(c.placeZone('R',4,4).cost,100); assert.strictEqual(c.placePark(1,3).cost,30);
  assert.strictEqual(c.placeBuilding('power',10,10).cost,3000); assert.strictEqual(c.placeBuilding('police',14,10).cost,500); assert.strictEqual(c.placeBuilding('fire',10,14).cost,500);
  assert.strictEqual(c.funds,f0-10-50-5-25-100-30-3000-500-500);
});
ok('놓을 수 없는 곳: 겹침, 물 위 구역, 전선 위 구역, 판 밖, 자금 부족',()=>{
  const c=new City({seed:1,fundsOpt:2,events:false,disasters:false});
  assert.ok(c.placeZone('R',4,4).ok); assert.strictEqual(c.placeZone('C',5,5).ok,false); assert.strictEqual(c.placeZone('C',38,38).ok,false);
  let wx=-1; for(let x=0;x<W;x++) if(c.grid[20][x].t===T.WATER){ wx=x; break; } assert.strictEqual(c.placeZone('I',wx,20).ok,false);
  assert.ok(c.placeWire(10,10).ok); assert.strictEqual(c.placeZone('I',9,9).ok,false,'전선 위 구역');
  assert.strictEqual(c.placeRoad(4,4).ok,false,'구역 위 길'); assert.ok(c.placeWire(4,4).ok===false,'구역 위 전선');
  c.funds=50; assert.strictEqual(c.placeZone('R',6,24).why,'자금 부족'); assert.strictEqual(c.placeBuilding('power',6,24).why,'자금 부족'); assert.ok(c.placeRoad(6,24).ok);
  assert.strictEqual(c.placeRoad(-1,0).ok,false); assert.strictEqual(c.placeRoad(0,H).ok,false);
});
ok('전력: 전선·구역·건물을 따라 흐르고, 전선은 길과 강을 건넌다. 발전소 없는 전선은 어둡다',()=>{
  const c=smallTown(); const Z=c.zones;
  assert.ok(Z.every(z=>z.pow),'네 구역 모두 전기'); assert.strictEqual(c.unpowered,0);
  const d=new City({seed:7,events:false,disasters:false}); d.placeZone('R',10,10); for(let x=1;x<=9;x++) d.placeWire(x,11); d.recompute(); assert.strictEqual(d.zones[0].pow,false); assert.strictEqual(d.unpowered,1);
  d.placeBuilding('power',0,13); d.recompute(); assert.strictEqual(d.zones[0].pow,false,'발전소가 전선에 닿지 않음'); d.placeWire(1,12); d.recompute(); assert.strictEqual(d.zones[0].pow,true,'전선 한 칸으로 이어짐');
  // 강 건너기
  const e=new City({seed:7,events:false,disasters:false}); e.placeBuilding('power',2,20); let x=5; while(e.grid[21][x].t!==T.WATER||x<5){ e.placeWire(x,21); x++; } while(e.grid[21][x].t===T.WATER){ assert.ok(e.placeWire(x,21).ok); x++; }
  e.placeWire(x,21); e.placeZone('R',x+1,20); e.recompute(); assert.strictEqual(e.zones[0].pow,true,'강 건너 전기');
});
ok('전력 한도: 발전소 하나는 구역 40개까지. 넘치면 뒤의 구역이 어둡다',()=>{
  const c=new City({seed:3,fundsOpt:0,events:false,disasters:false}); c.funds=1e9; c.placeBuilding('power',0,0); let k=0;
  for(let y=0;y<39&&k<PLANT_ZONES+3;y+=3) for(let x=3;x<15&&k<PLANT_ZONES+3;x+=3){ if(c.placeZone('R',x,y).ok) k++; }
  for(let y=0;y<39;y++) c.placeWire(2,y);
  for(let y=1;y<39;y+=3) c.placeWire(1,y); c.placeWire(1,0); c.recompute();
  const powered=c.zones.filter(z=>z.pow).length; assert.ok(powered<=PLANT_ZONES,`${powered}`); assert.ok(c.brownout); assert.ok(c.unpowered>=k-PLANT_ZONES);
});
ok('길 닿기: 3×3 둘레 한 칸에 길이 있어야 한다',()=>{
  const c=new City({seed:7,events:false,disasters:false}); c.placeZone('R',10,10); c.recompute(); assert.strictEqual(c.zones[0].road,false); assert.strictEqual(c.noroad,1);
  c.placeRoad(9,10); c.recompute(); assert.strictEqual(c.zones[0].road,true,'왼쪽 둘레'); c.bulldoze(9,10); c.placeRoad(13,12); c.recompute(); assert.strictEqual(c.zones[0].road,true,'오른쪽 아래 둘레');
  c.bulldoze(13,12); c.placeRoad(14,10); c.recompute(); assert.strictEqual(c.zones[0].road,false,'두 칸 떨어진 길');
});
ok('성장: 전기와 길이 있으면 몇 해 안에 집·가게·공장이 자라고 인구가 센다. 둘 중 하나가 없으면 자라지 않는다',()=>{
  const c=smallTown(); run(c,48); const lv=c.zones.map(z=>z.lv);
  assert.ok(lv.every(l=>l>=1),'네 구역 모두 자람 '+lv); assert.ok(c.pop>0&&c.pop===c.zones.filter(z=>z.kind==='R').reduce((a,z)=>a+z.lv,0)*POP_PER_LV); assert.ok(c.title!=='촌락'||c.pop<500);
  const d=new City({seed:7,events:false,disasters:false}); d.placeZone('R',10,10); for(let x=8;x<=14;x++) d.placeRoad(x,9); run(d,48); assert.strictEqual(d.zones[0].lv,0,'전기 없이 자람');
  const e=new City({seed:7,events:false,disasters:false}); e.placeBuilding('power',2,2); e.placeZone('R',5,2); run(e,48); assert.strictEqual(e.zones[0].lv,0,'길 없이 자람');
});
ok('단계: 최고 5단계. 공업은 지가와 상관없이, 주거·상업은 지가가 낮으면 3단계에 머문다',()=>{
  const c=smallTown(); c.funds=1e9; run(c,240); assert.ok(c.zones.every(z=>z.lv<=MAX_LV));
  const R=c.zones.filter(z=>z.kind==='R'); for(const z of R){ if(z.val<20) assert.ok(z.lv<=3,`지가 ${z.val} 에 ${z.lv}단계`); }
});
ok('세금과 유지비: 달마다 자금이 바뀌고 해마다 결산 소식이 난다. 발전소 40 · 경찰서·소방서 30',()=>{
  const c=smallTown(); c.placeBuilding('police',14,2); c.placeBuilding('fire',17,2); c.takeMsgs(); const f0=c.funds; c.tick(); assert.notStrictEqual(c.funds,f0);
  assert.ok(c.expense>=UPKEEP.power+UPKEEP.police+UPKEEP.fire,'유지비 '+c.expense); run(c,11); const m=c.takeMsgs(); assert.ok(m.some(x=>/1년차 결산/.test(x.text)),'결산 소식'); assert.strictEqual(c.month,12); assert.deepStrictEqual(c.date,{year:2,month:1});
  run(c,36); assert.ok(c.income>0,'세금 '+c.income);
});
ok('철거: 구역·건물은 통째로 9냥, 길·전선·공원·나무는 한 칸 1냥, 물과 빈 땅은 안 된다. 잔해도 민다',()=>{
  const c=smallTown(); const f=c.funds; assert.strictEqual(c.bulldoze(3,9).cost,9); assert.strictEqual(c.zones[0],null); assert.strictEqual(c.grid[9][3].t,T.GRASS); assert.strictEqual(c.grid[8][2].z,-1);
  assert.strictEqual(c.bulldoze(5,7).cost,1); assert.strictEqual(c.grid[7][5].t,T.GRASS); assert.strictEqual(c.bulldoze(3,6).cost,1); assert.strictEqual(c.grid[6][3].wire,false);
  assert.strictEqual(c.bulldoze(20,20).ok,false); let wx=-1; for(let x=0;x<W;x++) if(c.grid[20][x].t===T.WATER){ wx=x; break; } assert.strictEqual(c.bulldoze(wx,20).ok,false);
  assert.strictEqual(c.bulldoze(2,2).cost,9); assert.strictEqual(c.builds[0],null); assert.strictEqual(c.funds,f-9-1-1-9);
  c.grid[30][5].t=T.RUBBLE; assert.ok(c.bulldoze(5,30).ok); assert.strictEqual(c.grid[30][5].t,T.GRASS);
});
ok('재해 끔·이벤트 끔이면 100년을 돌려도 재해·이벤트 소식이 없다',()=>{
  const c=smallTown(); run(c,1200); const bad=c.log.filter(m=>m.kind==='bad'||m.kind==='good'&&!/이제/.test(m.text)); assert.strictEqual(bad.length,0,bad.map(m=>m.text).join(' | '));
});
ok('재해 켬: 처음 두 해는 없고, 그 뒤 불·홍수·거대 라이언이 온다. 잔해가 생기고 라이언은 일곱 달 뒤 돌아간다',()=>{
  const c=smallTown({disasters:true,seed:11}); run(c,24); assert.strictEqual(c.log.filter(m=>m.kind==='bad').length,0,'두 해 안 재해');
  let seen={fire:0,flood:0,monster:0}; for(let s=1;s<=40&&(!seen.fire||!seen.flood||!seen.monster);s++){ const d=smallTown({disasters:true,seed:s}); d.funds=1e9; run(d,600);
    for(const m of d.log.concat()) { if(/불이 났다/.test(m.text)) seen.fire++; if(/넘쳤다/.test(m.text)) seen.flood++; if(/라이언이 나타났다/.test(m.text)) seen.monster++; } }
  assert.ok(seen.fire&&seen.flood&&seen.monster,JSON.stringify(seen));
  const d=new City({seed:5,events:false,disasters:false}); d.placeBuilding('power',2,2); d.placeZone('R',5,2); d.zones[0].lv=3; d.monster={x:0,y:0,tx:6,ty:3,life:7}; let months=0; while(d.monster&&months<20){ d.tick(); months++; }
  assert.ok(months<=7,'라이언 '+months); assert.ok(d.log.some(m=>/강으로 돌아갔다/.test(m.text)));
  let rubble=0; for(let y=0;y<H;y++) for(let x=0;x<W;x++) if(d.grid[y][x].t===T.RUBBLE) rubble++; assert.ok(rubble>0,'잔해 없음');
});
ok('불: 소방서가 가까우면 빨리 꺼진다. 불타는 칸을 밀면 방화선',()=>{
  const burnMonths=(withFire)=>{ const c=smallTown({seed:21}); c.funds=1e9; for(const z of c.zones) z.lv=3; if(withFire) c.placeBuilding('fire',14,8); c.recompute(); c.ignite(3,9); let m=0, burning=1; while(burning&&m<60){ c.tick(); m++; burning=0; for(let y=0;y<H;y++) for(let x=0;x<W;x++) if(c.grid[y][x].burn) burning++; } return m; };
  const a=burnMonths(false), b=burnMonths(true); assert.ok(b<=a,`소방서 ${b} vs 없음 ${a}`);
  const c=smallTown({seed:21}); c.ignite(20,20); c.grid[20][20].burn=3; assert.ok(c.bulldoze(20,20).ok); assert.strictEqual(c.grid[20][20].burn,0);
});
ok('이벤트 켬: 축제·기부·관광·나무 심기가 온다. 기부는 자금을 늘린다',()=>{
  let kinds=new Set(); for(let s=1;s<=30&&kinds.size<4;s++){ const c=smallTown({events:true,seed:s}); run(c,300); for(const m of c.log){ if(/축제/.test(m.text)) kinds.add('f'); if(/기부/.test(m.text)) kinds.add('d'); if(/관광객/.test(m.text)) kinds.add('t'); if(/나무 심기/.test(m.text)) kinds.add('p'); } }
  assert.strictEqual(kinds.size,4,[...kinds].join());
  const c=smallTown({seed:1}); const f=c.funds; c.random=()=>0.4; c.event(); assert.ok(c.funds>f,'기부금');
});
ok('칭호: 촌락 → 마을 500 → 읍 2,000 → 도시 10,000 → 대도시 30,000 → 수도 60,000',()=>{
  assert.deepStrictEqual(TITLES.map(t=>t[0]),[60000,30000,10000,2000,500,0]);
  const c=new City({seed:1,events:false,disasters:false}); c.funds=1e9; c.placeBuilding('power',0,0); let k=0; for(let y=0;y<9;y+=3) for(let x=3;x<15;x+=3) if(c.placeZone('R',x,y).ok) k++;
  for(let y=0;y<9;y++) c.placeWire(2,y); for(let y=0;y<9;y+=3) c.placeWire(1,y); for(let x=0;x<16;x++) c.placeRoad(x,9); c.recompute();
  for(const z of c.zones) z.lv=1; const want=c.zones.length*POP_PER_LV; c.tick(); assert.strictEqual(c.pop,want); assert.ok(c.pop>=500); assert.ok(['마을','읍'].includes(c.title)); assert.ok(c.log.some(m=>/이제 (마을|읍)이다/.test(m.text)));
});
ok('설명: 정보 도구가 구역·건물·강·길·잔해를 말해 준다',()=>{
  const c=smallTown(); assert.match(c.describe(3,9),/주거 구역 빈 터 · 전력 있음 · 도로 있음/); assert.match(c.describe(3,3),/발전소/); assert.match(c.describe(5,7),/도로/);
  let wx=-1; for(let x=0;x<W;x++) if(c.grid[20][x].t===T.WATER){ wx=x; break; } assert.match(c.describe(wx,20),/^강/); c.grid[30][5].t=T.RUBBLE; assert.match(c.describe(5,30),/잔해/); assert.strictEqual(c.describe(-1,0),'');
});
ok('저장과 복원: 스냅샷을 되살리면 자금·달·구역·건물·전선·전력이 같다',()=>{
  const c=smallTown({seed:9,events:true,disasters:true}); run(c,40); const s=JSON.parse(JSON.stringify(c.snapshot())); const d=City.restore(s);
  assert.strictEqual(d.funds,c.funds); assert.strictEqual(d.month,c.month); assert.strictEqual(d.pop,c.pop); assert.strictEqual(d.title,c.title); assert.strictEqual(d.events,true); assert.strictEqual(d.disasters,true);
  assert.deepStrictEqual(d.zones.map(z=>z&&[z.kind,z.x,z.y,z.lv,z.pow,z.road]),c.zones.map(z=>z&&[z.kind,z.x,z.y,z.lv,z.pow,z.road]));
  assert.deepStrictEqual(d.grid.map(r=>r.map(x=>[x.t,x.wire,x.z,x.b])),c.grid.map(r=>r.map(x=>[x.t,x.wire,x.z,x.b])));
  run(d,12); assert.ok(d.month===c.month+12);
});
ok('규약: 정수 셋 → 자금 옵션·이벤트·재해. 빈 출력은 1 1 1. 개수·범위 오류를 가려낸다',()=>{
  assert.deepStrictEqual(parseSet('1\n1\n1\n'),{fundsOpt:1,events:true,disasters:true}); assert.deepStrictEqual(parseSet('0\n0\n0'),{fundsOpt:0,events:false,disasters:false}); assert.deepStrictEqual(parseSet('2 1 0'),{fundsOpt:2,events:true,disasters:false});
  const e=parseSet(''); assert.strictEqual(e.fundsOpt,1); assert.ok(e.note);
  assert.match(parseSet('1 1').err,/2개/); assert.match(parseSet('1 1 1 1').err,/4개/); assert.deepStrictEqual(parseSet('3 0 0'),{fundsOpt:3,events:false,disasters:false}); assert.match(parseSet('4 1 1').err,/자금 옵션 4/); assert.match(parseSet('-1 1 1').err,/자금 옵션 -1/); assert.match(parseSet('1 2 1').err,/이벤트 2/); assert.match(parseSet('1 1 -1').err,/재해 -1/); assert.match(parseSet('1 1 가').err,/재해/);
});
ok('예제 여섯: 동현랭으로 돌리면 (1,1,1) (0,1,1) (1,0,1) (1,1,0) (3,1,1) (3,0,0)',()=>{
  const want={basic:[1,true,true],rich:[0,true,true],noevent:[1,false,true],nodisaster:[1,true,false],rich100:[3,true,true],sandbox:[3,false,false]}; assert.strictEqual(examples.length,6);
  for(const ex of examples){ const out=D.run(ex.code,{maxSteps:300000}).output; const p=parseSet(out); assert.ok(!p.err,ex.id+' '+p.err); assert.deepStrictEqual([p.fundsOpt,p.events,p.disasters],want[ex.id],ex.id); assert.ok(!p.note,ex.id+' 출력 없음'); }
});
console.log(`\n${n} tests passed`);
