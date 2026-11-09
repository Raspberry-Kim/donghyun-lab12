// 동현심 도시 엔진 검사: node qa/core-tests.cjs
// 지도, 놓기와 값, 다리와 강 위 전선, 전력 전달, 길 닿기, 성장과 단계, 세금과 유지비, 철거, 재해와 이벤트, 저장과 복원, 규약 예제,
// v0.10: 땅 사기, 세율·시청·조례, 발전소 여섯과 노후화·보수, 공공시설과 만족도, 구역 여섯, 랜드마크, 재해 셋 추가, 업적, v1 저장 호환을 본다.
const assert=require('assert');
const S=require('../src/engine.js').Sim; const {City,WORLD,START,STRIP,T,KINDS,COST,UPKEEP,PLANT,PLANT_ZONES,MAX_LV,FUNDS_OPTS,TITLES,RANKS,POP_PER_LV,JOBS,TAX,ORD,ACH,LANDMARKS,parseSet,makeMap}=S;
const W=START, H=START; // 처음 판 40×40
const D=require('../src/donghyun.js'); const {examples}=require('../src/examples.js');
let n=0; const ok=(name,f)=>{ f(); n++; console.log('ok',name); };
const run=(c,months)=>{ for(let i=0;i<months;i++) c.tick(); };
const bank=(c,y,s=3)=>{ for(let x=0;x<c.W-s;x++) if(c.fits(x,y,s)&&c.touchesWater(x,y,s)) return x; throw new Error('강가 자리 없음'); }; // 강 왼쪽 기슭의 빈 s×s
/* 강 왼쪽 평지에 발전소·길·구역을 놓는 작은 도시 */
function smallTown(opts){ const c=new City(Object.assign({seed:7,events:false,disasters:false},opts||{}));
  assert.ok(c.placeBuilding('power',2,2).ok); for(let x=1;x<=13;x++) assert.ok(c.placeRoad(x,7).ok,'길 '+x);
  for(let y=5;y<=7;y++) assert.ok(c.placeWire(3,y).ok,'전선 '+y);
  assert.ok(c.placeZone('R',2,8).ok); assert.ok(c.placeZone('R',5,8).ok); assert.ok(c.placeZone('C',8,8).ok); assert.ok(c.placeZone('I',11,8).ok); c.recompute(); return c; }

ok('지도: 세계 60×60, 도시는 가운데 40×40에서 시작. 강이 위에서 아래로 이어지고 폭 3~4, 숲이 있고, 늘 같은 지도다',()=>{
  const g=makeMap(), g2=makeMap(); assert.strictEqual(g.length,WORLD); assert.strictEqual(g[0].length,WORLD); assert.strictEqual(WORLD,60); assert.strictEqual(START,40); assert.strictEqual(STRIP,5);
  let trees=0; for(let y=0;y<WORLD;y++){ const xs=[]; for(let x=0;x<WORLD;x++){ if(g[y][x].t===T.WATER) xs.push(x); if(g[y][x].t===T.TREE) trees++; }
    assert.ok(xs.length>=3&&xs.length<=4,`줄 ${y} 강 폭 ${xs.length}`); assert.ok(xs[xs.length-1]-xs[0]===xs.length-1,'강이 끊김'); assert.ok(xs[0]>=25&&xs[xs.length-1]<=42,'강이 가운데'); }
  assert.ok(trees>80,'숲 '+trees); assert.deepStrictEqual(g.map(r=>r.map(c=>c.t)),g2.map(r=>r.map(c=>c.t)));
  const c=new City({seed:1}); assert.strictEqual(c.W,40); assert.strictEqual(c.H,40); assert.strictEqual(c.ox,10); assert.strictEqual(c.oy,10);
  for(let y=0;y<40;y++) for(let x=0;x<40;x++) assert.strictEqual(c.grid[y][x].t,g[y+10][x+10].t,'도시 칸은 세계의 가운데');
  assert.strictEqual(c.cell(40,0),null); assert.strictEqual(c.cell(0,40),null);
});
ok('자금 옵션(v0.10 · 열 배): 0 넉넉 500,000 · 1 보통 200,000 · 2 빠듯 100,000 · 3 아주 넉넉 1,000,000, 기본 1 1 1',()=>{
  assert.deepStrictEqual(FUNDS_OPTS,[500000,200000,100000,1000000]); assert.strictEqual(new City({fundsOpt:3}).funds,1000000);
  assert.strictEqual(new City({fundsOpt:0}).funds,500000); assert.strictEqual(new City({}).funds,200000); assert.strictEqual(new City({fundsOpt:2}).funds,100000);
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
ok('전력 한도: 화력 발전소 하나는 구역 40개까지. 넘치면 뒤의 구역이 어둡다',()=>{
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
  assert.ok(lv.every(l=>l>=1),'네 구역 모두 자람 '+lv); assert.ok(c.pop>0&&c.pop===c.zones.filter(z=>z.kind==='R').reduce((a,z)=>a+z.lv,0)*POP_PER_LV.R); assert.ok(c.title!=='촌락'||c.pop<500);
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
  for(const z of c.zones) z.lv=1; const want=c.zones.length*POP_PER_LV.R; c.tick(); assert.strictEqual(c.pop,want); assert.ok(c.pop>=500); assert.ok(['마을','읍'].includes(c.title)); assert.ok(c.log.some(m=>/이제 (마을|읍)이다/.test(m.text)));
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
  run(d,12); assert.ok(d.month===c.month+12); assert.strictEqual(s.v,2);
});
/* ---------- v0.10 ---------- */
ok('v1 저장(40×40 고정 · 세율·시청 없음)도 읽는다: 가운데 40×40으로 들어오고 세율 10, 시청 없음, 칭호로 해금',()=>{
  const c=smallTown({seed:9}); run(c,30); const s=JSON.parse(JSON.stringify(c.snapshot()));
  const v1={v:1,fundsOpt:s.fundsOpt,funds:s.funds,events:s.events,disasters:s.disasters,month:s.month,title:'도시',fx:{cBoost:0,taxBoost:0,treeBoost:0,cheapPower:0},monster:null,yearIncome:0,yearExpense:0,lastYear:null,grid:s.grid,zones:s.zones,builds:s.builds.map(b=>b&&{kind:b.kind,x:b.x,y:b.y}),log:[]};
  const d=City.restore(v1); assert.strictEqual(d.W,40); assert.strictEqual(d.H,40); assert.strictEqual(d.ox,10); assert.strictEqual(d.oy,10); assert.strictEqual(d.tax,10); assert.strictEqual(d.hall,null); assert.strictEqual(d.rank,3); assert.strictEqual(d.locked('cityhall'),null);
  assert.deepStrictEqual(d.zones.map(z=>z&&[z.kind,z.x,z.y,z.lv]),c.zones.map(z=>z&&[z.kind,z.x,z.y,z.lv])); assert.ok(d.builds[0].s===3&&d.builds[0].age===0&&!d.builds[0].worn); run(d,12); assert.strictEqual(d.month,c.month+12);
});
ok('땅 사기: 칭호마다 살 수 있는 줄이 는다(촌락 0 · 마을 2 · 읍 4 · 도시 6 · 대도시·수도 8). 한 줄 5칸, 값 20,000×(n+1). 북·서쪽을 사면 좌표가 밀린다',()=>{
  const c=smallTown(); c.funds=1e6; assert.strictEqual(c.landOffer().left,0); assert.match(c.buyLand('N').why,/마을/);
  c.title='마을'; c.rank=1; const o=c.landOffer(); assert.strictEqual(o.left,2); assert.strictEqual(o.price,20000); const f=c.funds, z0=c.zones[0].x, b0=c.builds[0].y;
  const r=c.buyLand('W'); assert.ok(r.ok&&r.dx===5&&r.dy===0); assert.strictEqual(c.W,45); assert.strictEqual(c.H,40); assert.strictEqual(c.ox,5); assert.strictEqual(c.zones[0].x,z0+5); assert.strictEqual(c.grid[c.zones[0].y][c.zones[0].x].z,0); assert.strictEqual(c.funds,f-20000);
  assert.strictEqual(c.landOffer().price,40000); assert.ok(c.buyLand('N').ok); assert.strictEqual(c.H,45); assert.strictEqual(c.oy,5); assert.strictEqual(c.builds[0].y,b0+5); assert.strictEqual(c.grid[c.builds[0].y][c.builds[0].x].b,0);
  assert.match(c.buyLand('S').why,/읍/); c.title='수도'; c.rank=5; assert.ok(c.buyLand('N').ok); assert.strictEqual(c.oy,0); assert.match(c.buyLand('N').why,/세계의 끝/);
  assert.ok(c.buyLand('W').ok&&c.buyLand('E').ok&&c.buyLand('E').ok&&c.buyLand('S').ok&&c.buyLand('S').ok); assert.strictEqual(c.W,60); assert.strictEqual(c.H,60); assert.strictEqual(c.landOffer().left,0);
  for(let y=0;y<60;y++) for(let x=0;x<60;x++){ const k=c.grid[y][x]; if(k.t===T.WATER) assert.strictEqual(k.t,makeMap()[y][x].t); } run(c,24); assert.ok(c.zones.every(z=>!z||z.pow),'넓힌 뒤에도 전기');
  c.funds=0; c.title='수도'; const d=smallTown(); d.title='마을'; d.rank=1; d.funds=100; assert.strictEqual(d.buyLand('E').why,'자금 부족');
});
ok('세율: 시청이 있어야 5~15%(2단계부터 20%). 세입은 세율에 비례하고 수요는 세율이 높으면 준다',()=>{
  const c=smallTown(); c.funds=1e9; run(c,60); assert.match(c.setTax(15).why,/시청/); assert.match(c.placeBuilding('cityhall',20,2).why,/도시/);
  c.title='도시'; c.rank=3; assert.ok(c.placeBuilding('cityhall',20,2).ok); assert.ok(c.hall&&c.hall.lv===1); assert.strictEqual(c.locked('cityhall'),'시청은 하나면 된다');
  assert.match(c.setTax(20).why,/5~15/); assert.ok(c.setTax(15).ok); c.tick(); const hi=c.income, dHi=c.demand.R; assert.ok(c.setTax(5).ok); c.tick(); const lo=c.income; assert.ok(hi>lo*2.5,`${hi} vs ${lo}`); assert.ok(c.demand.R>dHi,'낮은 세율에 수요 높음');
  assert.ok(c.upgradeHall().ok); assert.strictEqual(c.hall.lv,2); assert.ok(c.setTax(20).ok); assert.ok(c.upgradeHall().ok); assert.strictEqual(c.hall.lv,3); assert.match(c.upgradeHall().why,/이미/);
  assert.strictEqual(c.describe(21,3).includes('시청 3단계'),true);
});
ok('조례: 공해 규제·야간 순찰(1단계), 관광 홍보·녹지 보전(2단계). 켜면 달마다 비용이 나간다',()=>{
  const c=smallTown(); c.funds=1e9; c.title='도시'; c.rank=3; assert.match(c.toggleOrd('patrol').why,/시청/); c.placeBuilding('cityhall',20,2);
  assert.match(c.toggleOrd('tourism').why,/2단계/); assert.ok(c.toggleOrd('patrol').ok&&c.ord('patrol')); assert.ok(c.toggleOrd('pollute').ok);
  for(const z of c.zones) z.lv=3; c.recompute(); const pol=c.pollution, cr=c.crime; c.toggleOrd('pollute'); c.toggleOrd('patrol'); c.recompute(); assert.ok(c.pollution>pol&&c.crime>cr,'조례가 오염·범죄를 줄인다');
  c.tick(); const e0=c.expense; c.toggleOrd('patrol'); c.toggleOrd('pollute'); c.tick(); assert.ok(c.expense>=e0+ORD.patrol.cost+ORD.pollute.cost-1,'조례 비용');
  c.upgradeHall(); assert.ok(c.toggleOrd('tourism').ok); c.tick(); assert.ok(c.demand.C>-1);
});
ok('발전소 여섯: 화력 40 · 수력 25(강에 붙여야) · 풍력 8(1×1 · 읍) · 원자력 150(도시+시청) · 태양광 12(2×2 · 도시 또는 100년차) · 핵융합 무제한(수도+누적 세입 100만)',()=>{
  assert.deepStrictEqual(Object.keys(PLANT),['power','hydro','wind','nuclear','solar','fusion']); assert.strictEqual(PLANT.power.cap,PLANT_ZONES);
  const c=new City({seed:3,events:false,disasters:false}); c.funds=1e9;
  assert.match(c.placeBuilding('hydro',2,2).why,/강/); const hx=bank(c,19); assert.ok(c.placeBuilding('hydro',hx,19).ok,'강가 수력');
  assert.match(c.placeBuilding('wind',0,0).why,/읍/); assert.match(c.placeBuilding('nuclear',0,0).why,/도시/); assert.match(c.placeBuilding('solar',0,0).why,/도시 또는 100년차/); assert.match(c.placeBuilding('fusion',0,0).why,/수도/);
  c.title='읍'; c.rank=2; assert.ok(c.placeBuilding('wind',0,0).ok); assert.strictEqual(c.builds[1].s,1); assert.strictEqual(c.grid[0][0].b,1); assert.strictEqual(c.grid[1][1].b,-1);
  c.title='도시'; c.rank=3; assert.match(c.placeBuilding('nuclear',4,4).why,/시청/); assert.ok(c.placeBuilding('cityhall',10,0).ok); assert.strictEqual(c.builds[2].s,4); assert.ok(c.placeBuilding('nuclear',4,4).ok); assert.ok(c.placeBuilding('solar',0,4).ok); assert.strictEqual(c.builds[4].s,2);
  c.title='수도'; c.rank=5; assert.match(c.placeBuilding('fusion',0,10).why,/누적 세입/); c.totalTax=1e6; assert.ok(c.placeBuilding('fusion',0,10).ok); c.recompute();
  assert.match(c.describe(0,10),/전력 무제한/); assert.match(c.describe(0,0),/구역 8곳/); assert.match(c.describe(hx+1,20),/구역 25곳/);
  // 수력은 물에 잠기면 멈춘다
  const d=new City({seed:3,events:false,disasters:false}); d.funds=1e9; assert.ok(d.placeBuilding('hydro',hx,19).ok); let zx=hx-3; while(!d.fits(zx,19,3)) zx--; assert.ok(d.placeZone('R',zx,19).ok); for(let x=zx+3;x<hx;x++) d.placeWire(x,20); d.recompute(); assert.ok(d.zones[0].pow); d.grid[19][hx].flood=3; d.recompute(); assert.ok(!d.zones[0].pow,'잠긴 수력은 0'); assert.match(d.describe(hx+1,20),/잠겨 멈춤/);
  // 용량 합: 풍력 하나(8)에 구역 10개 → 2개 어둡다
  const e=new City({seed:3,events:false,disasters:false}); e.funds=1e9; e.title='읍'; e.rank=2; e.placeBuilding('wind',0,0); for(let i=0;i<5;i++){ assert.ok(e.placeZone('R',1+i*3,0).ok); assert.ok(e.placeZone('R',1+i*3,3).ok); } e.recompute(); assert.strictEqual(e.zones.filter(z=>z.pow).length,8); assert.strictEqual(e.unpowered,2); assert.ok(e.brownout);
});
ok('노후화: 발전소는 수명(화력 600달)이 다하면 낡아 용량이 반이 된다. 보수는 원가 30%. 길은 30년마다 보수비',()=>{
  const c=smallTown(); c.funds=1e9; const b=c.builds[0]; b.age=PLANT.power.life-1; c.tick(); assert.ok(b.worn); assert.ok(c.log.some(m=>/낡았다/.test(m.text))); c.recompute();
  assert.match(c.describe(2,2),/구역 20곳.*낡음/); assert.strictEqual(c.repair(10,10).ok,false); const f=c.funds; const r=c.repair(3,3); assert.ok(r.ok&&r.cost===900); assert.ok(!b.worn&&b.age===0); assert.strictEqual(c.funds,f-900); assert.match(c.repair(3,3).why,/멀쩡/);
  const d=smallTown(); d.funds=1e9; d.month=360; d.takeMsgs(); d.tick(); assert.ok(d.log.some(m=>/도로 보수/.test(m.text))); assert.ok(d.expense>=13*3);
});
ok('공공시설 다섯: 학교·병원·도서관(마을) · 미술관·음악당(읍). 학교 권역은 주거 단계 벽이 20·28에서 16·22로, 병원은 인구 1.1배, 도서관은 2×2',()=>{
  const c=smallTown(); c.funds=1e9; assert.match(c.placeBuilding('school',5,11).why,/마을/); c.title='마을'; c.rank=1; assert.ok(c.placeBuilding('school',5,11).ok); assert.match(c.placeBuilding('museum',17,2).why,/읍/);
  assert.ok(c.placeBuilding('library',8,11).ok); assert.strictEqual(c.builds[c.builds.length-1].s,2); assert.ok(c.placeBuilding('hospital',0,11).ok); c.recompute(); assert.ok(c.zones[0].school&&c.zones[0].hosp); assert.match(c.describe(3,9),/학교·병원 권역/);
  for(const z of c.zones) z.lv=1; c.tick(); assert.strictEqual(c.pop,Math.round(2*POP_PER_LV.R*1.1));
  // 학교가 있으면 지가 17에서도 4단계로 간다
  const grows=(school)=>{ const d=smallTown({seed:5}); d.funds=1e9; d.title='마을'; d.rank=1; if(school) assert.ok(d.placeBuilding('school',5,11).ok); d.recompute(); const z=d.zones[0]; z.lv=3; let up=false; d.random=()=>0.01; d.demand={R:1,C:1,I:1}; for(let i=0;i<3;i++){ d.recompute(); d.tick(); if(d.zones[0].lv>3) up=true; } return [up,z.val]; };
  const [a,va]=grows(false), [b]=grows(true); if(va<20&&va>=16){ assert.ok(!a&&b,'학교 벽 해제'); }
  c.title='읍'; c.rank=2; assert.ok(c.placeBuilding('museum',20,2).ok&&c.placeBuilding('concert',17,2).ok); for(let x=14;x<=19;x++) assert.ok(c.placeWire(x,9).ok); for(let y=5;y<=8;y++) assert.ok(c.placeWire(19,y).ok); c.recompute(); assert.ok(c.builds.find(b=>b.kind==='concert').pow,'음악당 전기'); assert.ok(c.zones[2].cult>0);
});
ok('만족도 0~100: 경찰·소방·학교·병원·문화 권역이 올리고 오염·범죄·높은 세율이 내린다. 40 아래면 불만 소식',()=>{
  const c=smallTown(); c.funds=1e9; for(const z of c.zones) z.lv=3; c.tick(); const s0=c.satisfaction; assert.ok(s0>=0&&s0<=100);
  assert.ok(c.placeBuilding('police',5,11).ok); assert.ok(c.placeBuilding('fire',0,11).ok); c.title='마을'; c.rank=1; assert.ok(c.placeBuilding('school',8,11).ok); assert.ok(c.placeBuilding('hospital',11,11).ok); c.tick(); assert.ok(c.satisfaction>s0+15,`${s0} → ${c.satisfaction}`);
  const d=smallTown(); d.funds=1e9; for(const z of d.zones) z.lv=3; d.title='도시'; d.rank=3; d.placeBuilding('cityhall',20,2); d.upgradeHall(); d.setTax(20); d.tick(); assert.ok(d.satisfaction<s0,'세율 20이면 만족도 내려감');
  d.satisfaction=30; d.month=7; d.takeMsgs(); d.tick(); assert.ok(d.takeMsgs().some(m=>/만족도/.test(m.text))||d.satisfaction>=40);
});
ok('구역 여섯: 주거·고급 주거(읍 · 지가 22) · 시장·백화점(시청) · 경공업(오염 적음)·중공업(마을 · 오염 큼). 세금 10·30·12·24·10·18, 고급 주거 인구 100/단계',()=>{
  assert.deepStrictEqual(KINDS,['R','RH','C','CD','I','IH']); assert.deepStrictEqual(TAX,{R:10,RH:30,C:12,CD:24,I:10,IH:18}); assert.deepStrictEqual(POP_PER_LV,{R:160,RH:100}); assert.strictEqual(JOBS.I,120);
  const c=smallTown(); c.funds=1e9; assert.match(c.placeZone('RH',14,8).why,/읍/); assert.match(c.placeZone('IH',14,8).why,/마을/); assert.match(c.placeZone('CD',14,8).why,/시청/);
  c.title='읍'; c.rank=2; assert.ok(c.placeZone('RH',14,8).ok&&c.placeZone('IH',17,8).ok); assert.strictEqual(c.funds,1e9-300-200); c.title='도시'; c.rank=3; c.placeBuilding('cityhall',20,2); assert.ok(c.placeZone('CD',20,8).ok);
  for(const z of c.zones) z.lv=2; c.recompute(); const I=c.zones[3], IH=c.zones[5]; assert.ok(IH.pol>I.pol*2,`중공업 오염 ${IH.pol} vs 경공업 ${I.pol}`);
  c.random=()=>0.999; c.tick(); assert.strictEqual(c.pop,2*160*2+2*100); const inc=2*(10+10+12+10+30+18+24); assert.strictEqual(c.income,inc);
  const z=c.zones[4]; z.lv=0; z.val=10; c.random=()=>0.001; c.demand={R:1,C:1,I:1}; c.recompute(); const v=z.val; c.tick(); if(v<22) assert.strictEqual(c.zones[4].lv,0,'지가 낮은 고급 주거는 자라지 않는다');
  assert.match(c.describe(15,9),/고급 주거/); assert.match(c.describe(21,9),/백화점/); assert.match(c.describe(18,9),/중공업/);
});
ok('랜드마크 넷: 동현타워(도시 · 지가)·경기장(도시 · 상업 수요)·공항(대도시 · 수요+오염)·항구(읍 · 강가 · 공업 수요). 하나씩만',()=>{
  const c=smallTown(); c.funds=1e9; assert.match(c.placeBuilding('tower',0,20).why,/도시/); assert.match(c.placeBuilding('harbor',0,20).why,/읍/); assert.match(c.placeBuilding('airport',0,20).why,/대도시/);
  c.title='도시'; c.rank=3; for(let y=11;y<=19;y++) assert.ok(c.placeWire(3,y).ok,'전선 '+y); assert.ok(c.placeBuilding('tower',0,20).ok); assert.strictEqual(c.locked('tower'),'하나면 된다'); c.recompute(); assert.ok(c.builds.find(b=>b.kind==='tower').pow,'타워 전기'); assert.ok(c.maps.val[22*c.W+2]>c.maps.val[2*c.W+36],'타워 둘레 지가');
  c.tick(); const dC=c.demand.C; c.title='도시'; c.rank=3; assert.ok(c.placeBuilding('stadium',0,26).ok); c.tick(); assert.ok(c.demand.C>dC,'경기장이 상업 수요를 올린다');
  c.title='도시'; c.rank=3; assert.match(c.placeBuilding('harbor',2,30).why,/강/); assert.ok(c.placeBuilding('harbor',bank(c,26),26).ok);
  c.title='대도시'; c.rank=4; assert.ok(c.placeBuilding('airport',6,20).ok); c.tick(); assert.ok(c.ach.landmarks!=null,'랜드마크 업적'); assert.match(c.describe(7,21),/공항 · 랜드마크/);
});
ok('재해 여섯: 불·홍수·거대 라이언에 토네이도·지진·정전(원자력이 있으면 누출도). 재해는 lastDisaster를 남긴다',()=>{
  const seen={}; for(let s=1;s<=60;s++){ const d=smallTown({disasters:true,seed:s}); d.funds=1e9; for(const z of d.zones) z.lv=3; run(d,500);
    for(const m of d.log){ if(/불이 났다/.test(m.text)) seen.fire=1; if(/넘쳤다/.test(m.text)) seen.flood=1; if(/라이언이 나타났다/.test(m.text)) seen.monster=1; if(/토네이도가 왔다/.test(m.text)) seen.tornado=1; if(/지진/.test(m.text)) seen.quake=1; if(/정전/.test(m.text)) seen.blackout=1; } if(Object.keys(seen).length===6) break; }
  assert.strictEqual(Object.keys(seen).length,6,JSON.stringify(seen));
  const c=smallTown({seed:2}); c.tornado={x:0,y:10,dx:1,dy:1,life:5}; let n=0; while(c.tornado&&n<30){ c.tick(); n++; } assert.ok(n<=6&&c.log.some(m=>/토네이도가/.test(m.text)));
  const q=smallTown({seed:2}); for(const z of q.zones) z.lv=3; q.random=()=>0.85; q.disaster(); assert.ok(q.fx.quake>0&&q.lastDisaster===q.month);
  const b=smallTown({seed:2}); b.random=()=>0.95; b.disaster(); assert.ok(b.builds[0].worn,'정전은 발전소를 고장 낸다');
});
ok('업적 여섯: 수도·맑은 하늘·재해 무피해 10년·만족도 90·핵융합·랜드마크 넷. 한 번만 알린다',()=>{
  assert.deepStrictEqual(ACH.map(a=>a.id),['capital','clean','safe','happy','fusion','landmarks']);
  const c=smallTown({disasters:true,seed:4}); c.month=200; c.lastDisaster=0; c.takeMsgs(); c.tick(); assert.ok(c.ach.safe!=null); const n=c.log.filter(m=>/업적 달성/.test(m.text)).length; c.tick(); assert.strictEqual(c.log.filter(m=>/업적 달성/.test(m.text)).length,n);
  c.satisfaction=95; c.pop=5000; c.checkAch(); assert.ok(c.ach.happy!=null); c.title='수도'; c.checkAch(); assert.ok(c.ach.capital!=null);
  const s=JSON.parse(JSON.stringify(c.snapshot())); assert.deepStrictEqual(City.restore(s).ach,c.ach);
});
ok('규약: 정수 셋 → 자금 옵션·이벤트·재해. 빈 출력은 1 1 1. 개수·범위 오류를 가려낸다',()=>{
  assert.deepStrictEqual(parseSet('1\n1\n1\n'),{fundsOpt:1,events:true,disasters:true}); assert.match(parseSet('').note,/200,000/); assert.deepStrictEqual(parseSet('0\n0\n0'),{fundsOpt:0,events:false,disasters:false}); assert.deepStrictEqual(parseSet('2 1 0'),{fundsOpt:2,events:true,disasters:false});
  const e=parseSet(''); assert.strictEqual(e.fundsOpt,1); assert.ok(e.note);
  assert.match(parseSet('1 1').err,/2개/); assert.match(parseSet('1 1 1 1').err,/4개/); assert.deepStrictEqual(parseSet('3 0 0'),{fundsOpt:3,events:false,disasters:false}); assert.match(parseSet('4 1 1').err,/자금 옵션 4/); assert.match(parseSet('-1 1 1').err,/자금 옵션 -1/); assert.match(parseSet('1 2 1').err,/이벤트 2/); assert.match(parseSet('1 1 -1').err,/재해 -1/); assert.match(parseSet('1 1 가').err,/재해/);
});
ok('예제 여섯: 동현랭으로 돌리면 (1,1,1) (0,1,1) (1,0,1) (1,1,0) (3,1,1) (3,0,0)',()=>{
  for(const ex of examples) assert.ok(!/\b(20|50|10),000냥|아주 넉넉하게 100,000냥/.test(ex.title+ex.note),ex.id+' 옛 금액(v0.03 자금)');
  const want={basic:[1,true,true],rich:[0,true,true],noevent:[1,false,true],nodisaster:[1,true,false],rich100:[3,true,true],sandbox:[3,false,false]}; assert.strictEqual(examples.length,6);
  for(const ex of examples){ const out=D.run(ex.code,{maxSteps:300000}).output; const p=parseSet(out); assert.ok(!p.err,ex.id+' '+p.err); assert.deepStrictEqual([p.fundsOpt,p.events,p.disasters],want[ex.id],ex.id); assert.ok(!p.note,ex.id+' 출력 없음'); }
});
console.log(`\n${n} tests passed`);
