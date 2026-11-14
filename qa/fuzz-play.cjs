// 동현심 무작위 시험: node qa/fuzz-play.cjs [판 수]
// 여러 시드로 무작위로 놓고 부수며 수백 년을 돌려, 멈추거나 값이 깨지지 않는지(NaN·음수 단계·격자와 구역 목록의 어긋남) 본다. 저장·복원도 중간에 섞는다.
const assert=require('assert');
const {City,T,KINDS,MAX_LV,BUILD_NAME,sizeOf}=require('../src/engine.js').Sim;
const BKINDS=Object.keys(BUILD_NAME);
const N=+process.argv[2]||40;
function rnd(seed){ let a=seed>>>0; return ()=>{ a|=0; a=(a+0x6D2B79F5)|0; let t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; }
function check(c,where){
  assert.ok(Number.isFinite(c.funds),where+' 자금 '+c.funds); assert.ok(Number.isFinite(c.pop)&&c.pop>=0,where+' 인구');
  for(const k of ['R','C','I']) assert.ok(Number.isFinite(c.demand[k]),where+' 수요 '+k);
  c.zones.forEach((z,i)=>{ if(!z) return; assert.ok(z.lv>=0&&z.lv<=MAX_LV,where+' 단계 '+z.lv); for(let dy=0;dy<3;dy++) for(let dx=0;dx<3;dx++){ const cell=c.grid[z.y+dy][z.x+dx]; assert.strictEqual(cell.t,T.ZONE,where+' 구역 칸'); assert.strictEqual(cell.z,i,where+' 구역 번호'); } });
  c.builds.forEach((b,i)=>{ if(!b) return; assert.strictEqual(b.s,sizeOf(b.kind),where+' 건물 크기'); for(let dy=0;dy<b.s;dy++) for(let dx=0;dx<b.s;dx++){ const cell=c.grid[b.y+dy][b.x+dx]; assert.strictEqual(cell.t,T.BUILD,where+' 건물 칸'); assert.strictEqual(cell.b,i,where+' 건물 번호'); } });
  assert.strictEqual(c.grid.length,c.H,where+' 세로'); assert.ok(c.grid.every(r=>r.length===c.W),where+' 가로');
  for(let y=0;y<c.H;y++) for(let x=0;x<c.W;x++){ const cell=c.grid[y][x]; if(cell.t===T.ZONE) assert.ok(c.zones[cell.z],where+' 사라진 구역을 가리킴'); else assert.strictEqual(cell.z,-1,where+' 구역 아닌데 번호');
    if(cell.t===T.BUILD) assert.ok(c.builds[cell.b],where+' 사라진 건물'); else assert.strictEqual(cell.b,-1,where+' 건물 아닌데 번호'); assert.ok(cell.burn>=0&&cell.flood>=0); }
  if(c.monster){ assert.ok(c.monster.x>=0&&c.monster.x<c.W&&c.monster.y>=0&&c.monster.y<c.H,where+' 괴수 밖'); }
  if(c.tornado){ assert.ok(c.tornado.x>=0&&c.tornado.x<c.W&&c.tornado.y>=0&&c.tornado.y<c.H,where+' 토네이도 밖'); }
  assert.ok(c.satisfaction>=0&&c.satisfaction<=100,where+' 만족도 '+c.satisfaction); assert.ok(c.tax>=5&&c.tax<=20,where+' 세율');
}
let totalMonths=0, totalActs=0, okActs=0, t0=Date.now();
for(let s=1;s<=N;s++){
  const r=rnd(s*7919); let c=new City({seed:s,fundsOpt:s%4,events:s%4!==0,disasters:s%5!==0});
  const years=20+Math.floor(r()*60);
  for(let m=0;m<years*12;m++){
    const acts=Math.floor(r()*6);
    for(let a=0;a<acts;a++){ const x=Math.floor(r()*c.W), y=Math.floor(r()*c.H), k=r(); let res;
      if(k<0.22) res=c.placeRoad(x,y); else if(k<0.36) res=c.placeWire(x,y); else if(k<0.56) res=c.placeZone(KINDS[Math.floor(r()*KINDS.length)],x,y);
      else if(k<0.66) res=c.placeBuilding(BKINDS[Math.floor(r()*BKINDS.length)],x,y); else if(k<0.72) res=c.placePark(x,y);
      else if(k<0.74) res=c.repair(x,y); else if(k<0.76){ if(s%2===0){ c.rank=5; c.title='수도'; } res=c.buyLand(['N','S','E','W'][Math.floor(r()*4)]); }
      else if(k<0.78){ res=c.setTax(5+Math.floor(r()*16)); } else if(k<0.80){ res=c.toggleOrd(['pollute','patrol','tourism','green'][Math.floor(r()*4)]); } else if(k<0.81) res=c.upgradeHall(); else res=c.bulldoze(x,y);
      totalActs++; if(res.ok) okActs++; assert.ok(typeof res.ok==='boolean'); if(!res.ok) assert.ok(res.why,'이유 없음'); }
    if(r()<0.02) c.funds+=500000; // 가끔 돈을 넣어 많이 짓게 한다
    c.tick(); totalMonths++; c.takeMsgs();
    if(m%97===0) check(c,`시드 ${s} ${m}달`);
    if(r()<0.01){ const snap=JSON.parse(JSON.stringify(c.snapshot())); const d=City.restore(snap); check(d,`시드 ${s} 복원`); assert.strictEqual(d.funds,c.funds); assert.strictEqual(d.month,c.month); assert.strictEqual(d.W,c.W); assert.strictEqual(d.tax,c.tax); c=d; }
    for(let y=0;y<c.H;y++) for(let x=0;x<c.W;x++) c.describe(x,y); // 설명이 던지지 않는다
  }
  check(c,`시드 ${s} 끝`);
  process.stdout.write(`시드 ${s}: ${years}년 · ${c.W}×${c.H} · 인구 ${c.pop} · ${c.title} · 자금 ${Math.round(c.funds)} · 구역 ${c.zones.filter(Boolean).length} · 소식 ${c.log.length}\n`);
}
console.log(`\n${N}판 · ${totalMonths}달 · 행동 ${totalActs}(성공 ${okActs}) · ${((Date.now()-t0)/1000).toFixed(1)}초 · 이상 없음`);
