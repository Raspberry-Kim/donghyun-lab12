/* 동현심 엔진: 40×40 도시 판의 규칙. 화면·입력과 떨어져 있어 node에서도 돈다(qa/core-tests.cjs).
   SimCity DS의 기본 모드(자유 건설)를 동현심 나름대로 다시 세운 것이며, 원작의 코드·수치·그림은 쓰지 않았다. */
(function(root){
'use strict';
const W=40, H=40;
const T={GRASS:0,WATER:1,TREE:2,ROAD:3,ZONE:4,BUILD:5,PARK:6,RUBBLE:7};
const KINDS=['R','C','I'];
const KIND_NAME={R:'주거',C:'상업',I:'공업'};
const BUILD_NAME={power:'발전소',police:'경찰서',fire:'소방서'};
const COST={road:10,bridge:50,wire:5,wirebridge:25,R:100,C:100,I:100,park:30,power:3000,police:500,fire:500,bull:1,bullBig:9};
const UPKEEP={power:40,police:30,fire:30,road:0.1,wire:0.05,park:0.5};
const PLANT_ZONES=40;            // 발전소 하나가 먹이는 구역 수
const MAX_LV=5;
const FUNDS_OPTS=[50000,20000,10000];
const FUNDS_LABEL=['넉넉하게 50,000냥','보통 20,000냥','빠듯하게 10,000냥'];
const TITLES=[[60000,'수도'],[30000,'대도시'],[10000,'도시'],[2000,'읍'],[500,'마을'],[0,'촌락']];
const POP_PER_LV=160, JOBS_C=80, JOBS_I=120;

function mulberry(seed){ let a=seed>>>0; return function(){ a|=0; a=(a+0x6D2B79F5)|0; let t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; }
const inb=(x,y)=>x>=0&&y>=0&&x<W&&y<H;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;

/* ---------- 지도: 평지에 강 하나(언제나 같은 지도) ---------- */
function makeMap(){
  const rnd=mulberry(20260108);
  const grid=[]; for(let y=0;y<H;y++){ const row=[]; for(let x=0;x<W;x++) row.push({t:T.GRASS,z:-1,b:-1,wire:false,burn:0,flood:0}); grid.push(row); }
  // 강: 위에서 아래로 굽이치며 흐른다. 너비 2~3.
  let cx=22, drift=1;
  for(let y=0;y<H;y++){
    const bend=Math.round(4*Math.sin(y/5.5));                      // 큰 굽이
    const r=rnd(); if(r<0.25) drift=-1; else if(r<0.5) drift=1;    // 잔 굽이
    if(rnd()<0.6) cx=clamp(cx+drift,19,25);
    const cxx=clamp(cx+bend,16,31);
    for(let x=cxx-1;x<=cxx+1+(((y>=12&&y<=16)||(y>=28&&y<=31))?1:0);x++) grid[y][x].t=T.WATER;
    if(y>=20&&y<=23) grid[y][cxx-2].t=T.WATER;
    continue;
    const wide=(y>=12&&y<=16)||(y>=28&&y<=31)?1:0;         // 중간에 두 군데 넓어진다
    for(let x=cx-1;x<=cx+1+wide;x++) grid[y][x].t=T.WATER;
    if(y>=20&&y<=23) grid[y][cx-2].t=T.WATER;              // 작은 모래톱 없이 살짝 굵어지는 곳
  }
  // 숲: 몇 군데 둥근 숲. 강 위에는 심지 않는다.
  const woods=[[5,5,3],[9,30,3],[34,8,2],[35,34,3],[14,20,2],[31,22,2],[20,35,2],[6,16,2]];
  for(const [wx,wy,r] of woods) for(let y=wy-r;y<=wy+r;y++) for(let x=wx-r;x<=wx+r;x++){
    if(!inb(x,y)||grid[y][x].t!==T.GRASS) continue;
    const d=(x-wx)*(x-wx)+(y-wy)*(y-wy); if(d<=r*r+(rnd()<0.5?1:0)) grid[y][x].t=T.TREE; }
  // 강가에 나무 몇 그루
  for(let y=0;y<H;y++) for(let x=0;x<W;x++) if(grid[y][x].t===T.GRASS&&nearWater(grid,x,y)&&rnd()<0.12) grid[y][x].t=T.TREE;
  return grid;
}
function nearWater(grid,x,y){ for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){ const xx=x+dx,yy=y+dy; if(inb(xx,yy)&&grid[yy][xx].t===T.WATER) return true; } return false; }

/* ---------- 도시 ---------- */
class City{
  constructor(opts){
    opts=opts||{};
    this.fundsOpt=clamp(opts.fundsOpt==null?1:opts.fundsOpt,0,2);
    this.funds=FUNDS_OPTS[this.fundsOpt];
    this.events=opts.events==null?true:!!opts.events;
    this.disasters=opts.disasters==null?true:!!opts.disasters;
    this.random=mulberry(opts.seed==null?Date.now()&0xffffffff:opts.seed);
    this.grid=makeMap(); this.zones=[]; this.builds=[];
    this.month=0; this.pop=0; this.jobs=0; this.title='촌락';
    this.demand={R:1,C:0.3,I:0.4};
    this.income=0; this.expense=0; this.yearIncome=0; this.yearExpense=0; this.lastYear=null;
    this.crime=0; this.pollution=0; this.landValue=0; this.unpowered=0; this.noroad=0;
    this.fx={cBoost:0,taxBoost:0,treeBoost:0,cheapPower:0};
    this.monster=null; this.log=[]; this.msgs=[];
    this.maps={pow:null,pol:null,crime:null,lv:null,fire:null,police:null};
    this.recompute();
    this.say(`시장 포동이가 부임했다 · 자금 ${this.funds.toLocaleString()}냥 · 이벤트 ${this.events?'켬':'끔'} · 재해 ${this.disasters?'켬':'끔'}`,'podong','info');
  }
  /* ----- 소식 ----- */
  say(text,face,kind){ const m={m:this.month,text,face:face||'podong',kind:kind||'info'}; this.log.push(m); if(this.log.length>40) this.log.shift(); this.msgs.push(m); }
  takeMsgs(){ const m=this.msgs; this.msgs=[]; return m; }
  get date(){ return {year:Math.floor(this.month/12)+1,month:this.month%12+1}; }
  dateText(){ const d=this.date; return `${d.year}년차 ${d.month}월`; }
  cell(x,y){ return inb(x,y)?this.grid[y][x]:null; }
  zoneAt(x,y){ const c=this.cell(x,y); return c&&c.z>=0?this.zones[c.z]:null; }
  buildAt(x,y){ const c=this.cell(x,y); return c&&c.b>=0?this.builds[c.b]:null; }

  /* ----- 짓기 ----- */
  canPay(n){ return this.funds>=n; }
  buildable(x,y){ const c=this.cell(x,y); return !!c&&(c.t===T.GRASS||c.t===T.TREE)&&!c.wire&&!c.flood; }
  /* 도로·전선: 한 칸. 물 위면 다리다. */
  placeRoad(x,y){
    const c=this.cell(x,y); if(!c) return {ok:false,why:'밖'};
    if(c.t===T.ROAD) return {ok:false,why:'이미 도로'};
    if(c.flood) return {ok:false,why:'물에 잠김'};
    if(!(c.t===T.GRASS||c.t===T.TREE||c.t===T.WATER)) return {ok:false,why:'여기엔 길을 낼 수 없다 · 먼저 철거'};
    const cost=c.t===T.WATER?COST.bridge:COST.road; if(!this.canPay(cost)) return {ok:false,why:'자금 부족'};
    c.t=T.ROAD; c.bridge=(cost===COST.bridge); this.funds-=cost; this.dirty=true; return {ok:true,cost};
  }
  placeWire(x,y){
    const c=this.cell(x,y); if(!c) return {ok:false,why:'밖'};
    if(c.wire) return {ok:false,why:'이미 전선'};
    if(c.flood) return {ok:false,why:'물에 잠김'};
    if(!(c.t===T.GRASS||c.t===T.TREE||c.t===T.WATER||c.t===T.ROAD)) return {ok:false,why:'여기엔 전선을 놓을 수 없다'};
    const cost=c.t===T.WATER?COST.wirebridge:COST.wire; if(!this.canPay(cost)) return {ok:false,why:'자금 부족'};
    if(c.t===T.TREE) c.t=T.GRASS; c.wire=true; this.funds-=cost; this.dirty=true; return {ok:true,cost};
  }
  /* 3×3 구역·건물: 왼쪽 위 칸 기준 */
  fits3(x,y){ for(let dy=0;dy<3;dy++) for(let dx=0;dx<3;dx++) if(!this.buildable(x+dx,y+dy)) return false; return true; }
  placeZone(kind,x,y){
    if(!KINDS.includes(kind)) return {ok:false,why:'종류'};
    if(!inb(x,y)||!inb(x+2,y+2)) return {ok:false,why:'밖'};
    if(!this.fits3(x,y)) return {ok:false,why:'빈 땅 3×3이 필요하다'};
    if(!this.canPay(COST[kind])) return {ok:false,why:'자금 부족'};
    const z={kind,x,y,lv:0,pow:false,road:false,crime:0,pol:0,val:0}; const id=this.zones.length; this.zones.push(z);
    for(let dy=0;dy<3;dy++) for(let dx=0;dx<3;dx++){ const c=this.grid[y+dy][x+dx]; c.t=T.ZONE; c.z=id; }
    this.funds-=COST[kind]; this.dirty=true; return {ok:true,cost:COST[kind],zone:z};
  }
  placeBuilding(kind,x,y){
    if(!BUILD_NAME[kind]) return {ok:false,why:'종류'};
    if(!inb(x,y)||!inb(x+2,y+2)) return {ok:false,why:'밖'};
    if(!this.fits3(x,y)) return {ok:false,why:'빈 땅 3×3이 필요하다'};
    if(!this.canPay(COST[kind])) return {ok:false,why:'자금 부족'};
    const b={kind,x,y,pow:kind==='power'}; const id=this.builds.length; this.builds.push(b);
    for(let dy=0;dy<3;dy++) for(let dx=0;dx<3;dx++){ const c=this.grid[y+dy][x+dx]; c.t=T.BUILD; c.b=id; }
    this.funds-=COST[kind]; this.dirty=true; return {ok:true,cost:COST[kind],build:b};
  }
  placePark(x,y){
    if(!this.buildable(x,y)) return {ok:false,why:'빈 땅이 필요하다'};
    if(!this.canPay(COST.park)) return {ok:false,why:'자금 부족'};
    this.grid[y][x].t=T.PARK; this.funds-=COST.park; this.dirty=true; return {ok:true,cost:COST.park};
  }
  /* 철거: 구역·건물은 통째로, 나머지는 한 칸. 불타는 칸도 밀 수 있다(방화선). */
  bulldoze(x,y){
    const c=this.cell(x,y); if(!c) return {ok:false,why:'밖'};
    if(c.t===T.WATER&&!c.wire) return {ok:false,why:'물은 밀 수 없다'};
    if(c.t===T.GRASS&&!c.wire&&!c.burn) return {ok:false,why:'빈 땅'};
    let cost=COST.bull;
    if(c.z>=0){ cost=COST.bullBig; if(!this.canPay(cost)) return {ok:false,why:'자금 부족'}; this.removeZone(c.z,T.GRASS); }
    else if(c.b>=0){ cost=COST.bullBig; if(!this.canPay(cost)) return {ok:false,why:'자금 부족'}; this.removeBuild(c.b,T.GRASS); }
    else { if(!this.canPay(cost)) return {ok:false,why:'자금 부족'}; if(c.wire) c.wire=false; else if(c.t!==T.WATER){ c.t=T.GRASS; c.bridge=false; } c.burn=0; }
    this.funds-=cost; this.dirty=true; return {ok:true,cost};
  }
  removeZone(id,to){ const z=this.zones[id]; if(!z) return; for(let dy=0;dy<3;dy++) for(let dx=0;dx<3;dx++){ const c=this.grid[z.y+dy][z.x+dx]; c.t=to; c.z=-1; c.burn=0; } this.zones[id]=null; }
  removeBuild(id,to){ const b=this.builds[id]; if(!b) return; for(let dy=0;dy<3;dy++) for(let dx=0;dx<3;dx++){ const c=this.grid[b.y+dy][b.x+dx]; c.t=to; c.b=-1; c.burn=0; } this.builds[id]=null; }
  /* 불·홍수·괴수에 당한 칸: 구역·건물은 통째로 잔해가 된다 */
  wreck(x,y){
    const c=this.cell(x,y); if(!c) return false;
    if(c.z>=0){ this.removeZone(c.z,T.RUBBLE); return true; }
    if(c.b>=0){ this.removeBuild(c.b,T.RUBBLE); return true; }
    if(c.t===T.PARK||c.t===T.TREE){ c.t=T.RUBBLE; return true; }
    if(c.t===T.ROAD&&!c.bridge){ c.t=T.RUBBLE; c.wire=false; return true; }
    return false;
  }
  conductive(c){ return c.wire||c.t===T.ZONE||c.t===T.BUILD; }
  flammable(c){ return (c.t===T.ZONE&&this.zones[c.z]&&this.zones[c.z].lv>0)||c.t===T.TREE||c.t===T.PARK||(c.t===T.BUILD&&this.builds[c.b]&&this.builds[c.b].kind!=='power'); }

  /* ----- 달마다 다시 세는 것: 전력·도로·지도들 ----- */
  recompute(){
    const g=this.grid;
    // 전력: 발전소에서 전도체(전선·구역·건물)를 따라 퍼진다. 한 그물의 용량은 발전소 수 × PLANT_ZONES 구역.
    const comp=new Int16Array(W*H).fill(-1); const comps=[]; let ncomp=0;
    for(const b of this.builds){ if(!b||b.kind!=='power') continue; const k=comp[b.y*W+b.x]; if(k>=0){ comps[k].plants++; continue; }
      const id=ncomp++; comps.push({plants:1,zones:[]}); const q=[[b.x,b.y]]; comp[b.y*W+b.x]=id;
      while(q.length){ const [x,y]=q.shift(); const c=g[y][x]; if(c.t===T.ZONE&&c.z>=0&&this.zones[c.z]&&!comps[id].zones.includes(c.z)) comps[id].zones.push(c.z);
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const xx=x+dx,yy=y+dy; if(!inb(xx,yy)) continue; const n=g[yy][xx]; if(comp[yy*W+xx]>=0||!this.conductive(n)) continue; comp[yy*W+xx]=id; q.push([xx,yy]); } } }
    for(const z of this.zones) if(z) z.pow=false;
    for(const b of this.builds) if(b) b.pow=b.kind==='power';
    this.unpowered=0; this.brownout=false;
    for(const cp of comps){ const cap=cp.plants*PLANT_ZONES; cp.zones.forEach((zi,i)=>{ if(i<cap) this.zones[zi].pow=true; else { this.unpowered++; this.brownout=true; } }); }
    for(const b of this.builds){ if(!b||b.kind==='power') continue; b.pow=comp[b.y*W+b.x]>=0; }
    for(const z of this.zones) if(z&&!z.pow) this.unpowered+=0; // 그물 밖 구역은 아래에서 센다
    let outside=0; for(const z of this.zones) if(z&&!z.pow&&comp[z.y*W+z.x]<0) outside++; this.unpowered=outside+(this.brownout?this.unpowered:0);
    this.compMap=comp;
    // 도로: 3×3 둘레 한 겹 안에 도로가 있으면 된다
    this.noroad=0;
    for(const z of this.zones){ if(!z) continue; z.road=false;
      for(let y=z.y-1;y<=z.y+3&&!z.road;y++) for(let x=z.x-1;x<=z.x+3;x++){ if(!inb(x,y)) continue; if(y>=z.y&&y<=z.y+2&&x>=z.x&&x<=z.x+2) continue; if(g[y][x].t===T.ROAD){ z.road=true; break; } }
      if(!z.road) this.noroad++; }
    // 오염: 공업 구역·발전소·도로(교통)
    const pol=new Float32Array(W*H), police=new Float32Array(W*H), fire=new Float32Array(W*H), val=new Float32Array(W*H);
    const spread=(arr,x,y,amt,r)=>{ for(let yy=y-r;yy<=y+r;yy++) for(let xx=x-r;xx<=x+r;xx++){ if(!inb(xx,yy)) continue; const d=Math.max(Math.abs(xx-x),Math.abs(yy-y)); arr[yy*W+xx]+=amt*(1-d/(r+1)); } };
    for(const z of this.zones) if(z&&z.kind==='I'&&z.lv>0) spread(pol,z.x+1,z.y+1,z.lv*3,4);
    for(const b of this.builds){ if(!b) continue; if(b.kind==='power') spread(pol,b.x+1,b.y+1,10,6); if(b.pow&&b.kind==='police') spread(police,b.x+1,b.y+1,1,10); if(b.pow&&b.kind==='fire') spread(fire,b.x+1,b.y+1,1,10); }
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const c=g[y][x]; if(c.t===T.ROAD&&!c.bridge){ let dev=false; for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const n=this.cell(x+dx,y+dy); if(n&&n.z>=0&&this.zones[n.z]&&this.zones[n.z].lv>0){ dev=true; break; } } if(dev) spread(pol,x,y,0.8,1); } }
    // 지가: 물·숲·공원이 올리고 오염이 내린다
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const c=g[y][x]; if(c.t===T.WATER) spread(val,x,y,2.2,2); else if(c.t===T.TREE) spread(val,x,y,0.9,2); else if(c.t===T.PARK) spread(val,x,y,2.6+(this.fx.treeBoost?1.5:0),3); }
    for(let i=0;i<W*H;i++){ val[i]=clamp(14+val[i]-pol[i]*1.4,0,40); }
    // 구역마다 요약, 범죄
    let polSum=0,valSum=0,crSum=0,n=0;
    for(const z of this.zones){ if(!z) continue; const i=(z.y+1)*W+z.x+1; z.pol=pol[i]; z.val=val[i]; const cov=Math.min(1,police[i]);
      const dens=z.lv*(z.kind==='C'?1.3:z.kind==='R'?1:0.5); z.crime=clamp(dens*6*(1-cov)*(z.val<12?1.4:1),0,40);
      if(z.lv>0){ polSum+=z.pol; valSum+=z.val; crSum+=z.crime; n++; } }
    const crime=new Float32Array(W*H); for(const z of this.zones) if(z&&z.lv>0) spread(crime,z.x+1,z.y+1,z.crime,3);
    this.pollution=n?polSum/n:0; this.landValue=n?valSum/n:0; this.crime=n?crSum/n:0;
    this.maps={pol,police,fire,val,crime};
    this.dirty=false;
  }

  /* ----- 한 달 ----- */
  tick(){
    this.recompute();
    const g=this.grid;
    // 인구·일자리·수요
    let R=0,C=0,I=0; for(const z of this.zones){ if(!z) continue; if(z.kind==='R') R+=z.lv; else if(z.kind==='C') C+=z.lv; else I+=z.lv; }
    const res=R*POP_PER_LV, jobs=C*JOBS_C+I*JOBS_I;
    this.pop=res; this.jobs=jobs;
    this.demand={
      R:clamp((jobs*1.2+1200-res)/(res+800),-1,1),
      C:clamp((res*0.35+100-C*JOBS_C)/(C*JOBS_C+300),-1,1)+(this.fx.cBoost?0.4:0),
      I:clamp((res*0.5+200-I*JOBS_I)/(I*JOBS_I+300),-1,1)
    };
    // 구역 성장
    for(const z of this.zones){ if(!z) continue;
      if(!z.pow||!z.road){ if(z.lv>0&&this.random()<0.3) z.lv--; continue; }
      let d=this.demand[z.kind];
      if(z.kind==='R') d+=(z.val-14)/40-z.pol/25-z.crime/60;
      if(z.kind==='C') d+=(z.val-14)/40-z.crime/40;
      if(z.kind==='I') d+=0.05;
      if(d>0&&z.lv<MAX_LV&&this.random()<d*0.35){
        if(z.kind!=='I'&&((z.lv===3&&z.val<20)||(z.lv===4&&z.val<28))){} else z.lv++; }
      else if(d<-0.15&&z.lv>0&&this.random()<-d*0.25) z.lv--;
    }
    // 돈: 달마다 세금이 들어오고 유지비가 나간다
    let inc=0; for(const z of this.zones){ if(!z||!z.lv) continue; inc+=z.lv*(z.kind==='R'?10:z.kind==='C'?12:10); }
    if(this.fx.taxBoost) inc*=2;
    let exp=0, roads=0, wires=0, parks=0;
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const c=g[y][x]; if(c.t===T.ROAD) roads++; if(c.wire) wires++; if(c.t===T.PARK) parks++; }
    for(const b of this.builds){ if(!b) continue; exp+=UPKEEP[b.kind]*(b.kind==='power'&&this.fx.cheapPower?0.5:1); }
    exp+=roads*UPKEEP.road+wires*UPKEEP.wire+parks*UPKEEP.park;
    inc=Math.round(inc); exp=Math.round(exp);
    this.funds+=inc-exp; this.income=inc; this.expense=exp; this.yearIncome+=inc; this.yearExpense+=exp;
    // 불
    this.burnStep();
    // 홍수 물러감
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const c=g[y][x]; if(c.flood>0){ c.flood--; } }
    // 괴수
    if(this.monster) this.monsterStep();
    // 효과 남은 달
    for(const k in this.fx) if(this.fx[k]>0) this.fx[k]--;
    // 재해·이벤트
    if(this.disasters&&!this.monster&&this.month>=24&&this.random()<1/60) this.disaster(); // 처음 두 해는 재해가 없다
    if(this.events&&this.random()<1/30) this.event();
    // 칭호
    const title=TITLES.find(t=>this.pop>=t[0])[1];
    if(title!==this.title){ const up=TITLES.findIndex(t=>t[1]===title)<TITLES.findIndex(t=>t[1]===this.title); this.title=title; if(up) this.say(`인구 ${this.pop.toLocaleString()} · 이제 ${title}이다!`,'podong','good'); }
    // 경고(가끔만)
    if(this.month%6===5){
      if(this.unpowered>0) this.say(this.brownout?`전력이 모자란다 · 구역 ${this.unpowered}곳이 어둡다 · 발전소를 더 짓자`:`전선이 닿지 않은 구역 ${this.unpowered}곳`,'copter','warn');
      if(this.noroad>0) this.say(`도로가 닿지 않은 구역 ${this.noroad}곳`,'knight','warn');
      if(this.funds<0) this.say(`자금이 바닥났다 · 세금이 들어올 때까지 지을 수 없다`,'shushu','warn');
    }
    // 해가 바뀌면 결산
    this.month++;
    if(this.month%12===0){ this.lastYear={income:this.yearIncome,expense:this.yearExpense}; this.say(`${this.date.year-1}년차 결산 · 수입 ${this.yearIncome.toLocaleString()} · 지출 ${this.yearExpense.toLocaleString()}냥`,'podong','info'); this.yearIncome=0; this.yearExpense=0; }
    this.recompute();
  }
  burnStep(){
    const g=this.grid, fire=this.maps.fire; const spreads=[];
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const c=g[y][x]; if(!c.burn) continue;
      const cov=Math.min(1,fire[y*W+x]);
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const n=this.cell(x+dx,y+dy); if(n&&!n.burn&&this.flammable(n)&&this.random()<0.35*(1-cov*0.85)) spreads.push(n); }
      c.burn--; if(c.burn<=0){ this.wreck(x,y); c.t=T.RUBBLE; c.burn=0; } else if(cov>0.6&&this.random()<0.5){ c.burn=0; this.wreck(x,y); c.t=T.RUBBLE; } }
    for(const n of spreads) if(!n.burn) n.burn=3;
  }
  ignite(x,y){ const c=this.cell(x,y); if(!c||c.burn||!this.flammable(c)) return false; c.burn=3; return true; }
  disaster(){
    const r=this.random(); const dev=[]; for(const z of this.zones) if(z&&z.lv>0) dev.push(z);
    if(r<0.5){ if(!dev.length) return; const z=dev[Math.floor(this.random()*dev.length)]; this.ignite(z.x+1,z.y+1); this.say(`${KIND_NAME[z.kind]} 구역에 불이 났다! 소방서가 가까우면 금방 꺼진다 · 불타는 칸을 밀면 방화선`,'doom','bad'); }
    else if(r<0.75){ let n=0; for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const c=this.grid[y][x]; if(c.t!==T.WATER&&nearWater(this.grid,x,y)&&this.random()<0.55){ c.flood=4+Math.floor(this.random()*4); if(this.wreck(x,y)) n++; else if(c.t===T.GRASS||c.t===T.RUBBLE){} } }
      this.say(`강이 넘쳤다! 강가 ${n}곳이 잠겼다 · 다리와 전선은 버틴다`,'lion','bad'); }
    else { if(!dev.length) return; const z=dev[Math.floor(this.random()*dev.length)]; const side=Math.floor(this.random()*4); const m={x:side===0?0:side===1?W-1:Math.floor(this.random()*W),y:side===2?0:side===3?H-1:Math.floor(this.random()*H),tx:z.x+1,ty:z.y+1,life:7};
      this.monster=m; this.say('거대 라이언이 나타났다! 지나는 자리는 잔해가 된다 · 일곱 달쯤 머문다','lion','bad'); }
  }
  monsterStep(){
    const m=this.monster; m.life--; if(m.life<=0){ this.monster=null; this.say('거대 라이언이 강으로 돌아갔다','lion','info'); return; }
    for(let s=0;s<2;s++){ const dx=Math.sign(m.tx-m.x), dy=Math.sign(m.ty-m.y); if(this.random()<0.3){ m.x+=Math.round(this.random()*2-1); m.y+=Math.round(this.random()*2-1); } else if(Math.abs(m.tx-m.x)>Math.abs(m.ty-m.y)) m.x+=dx; else m.y+=dy;
      m.x=clamp(m.x,0,W-1); m.y=clamp(m.y,0,H-1);
      this.wreck(m.x,m.y); for(const [ox,oy] of [[1,0],[-1,0],[0,1],[0,-1]]) if(this.random()<0.4) this.wreck(m.x+ox,m.y+oy); }
    if(m.x===m.tx&&m.y===m.ty){ const dev=[]; for(const z of this.zones) if(z&&z.lv>0) dev.push(z); if(dev.length){ const z=dev[Math.floor(this.random()*dev.length)]; m.tx=z.x+1; m.ty=z.y+1; } }
  }
  event(){
    const r=this.random();
    if(r<0.3){ this.fx.cBoost=3; this.say('시장 포동이가 축제를 열었다 · 석 달 동안 상업 수요가 오른다','podong','good'); }
    else if(r<0.55){ const amt=Math.max(1000,Math.round(this.pop*0.15/100)*100); this.funds+=amt; this.say(`슈슈가 복싱 대회 상금 ${amt.toLocaleString()}냥을 도시에 기부했다`,'shushu','good'); }
    else if(r<0.8){ this.fx.taxBoost=1; this.say('초파리 떼가 아니라 관광객이 몰려왔다 · 이번 달 세금 두 배','fly','good'); }
    else { this.fx.treeBoost=6; this.say('나무 심기 운동 · 여섯 달 동안 공원 둘레 지가가 더 오른다','podong','good'); }
  }
  /* 칸 설명(정보 도구) */
  describe(x,y){
    const c=this.cell(x,y); if(!c) return '';
    const i=y*W+x, m=this.maps;
    const env=`지가 ${Math.round(m.val[i])} · 오염 ${Math.round(m.pol[i])} · 범죄 ${Math.round(m.crime[i])}`;
    if(c.flood) return `물에 잠긴 땅 · ${c.flood}달 뒤 물러난다`;
    if(c.burn) return '불타는 중! 소방서가 가까우면 금방 꺼진다';
    if(c.z>=0){ const z=this.zones[c.z]; return `${KIND_NAME[z.kind]} 구역 ${z.lv?z.lv+'단계':'빈 터'} · 전력 ${z.pow?'있음':'없음'} · 도로 ${z.road?'있음':'없음'} · ${env}`; }
    if(c.b>=0){ const b=this.builds[c.b]; return `${BUILD_NAME[b.kind]} · ${b.kind==='power'?`구역 ${PLANT_ZONES}곳까지 전력 공급`:b.pow?'가동 중 · 반경 열 칸':'전력 없음'}`; }
    const name=c.t===T.WATER?'강':c.t===T.TREE?'숲':c.t===T.ROAD?(c.bridge?'다리':'도로'):c.t===T.PARK?'공원':c.t===T.RUBBLE?'잔해 · 철거해야 다시 쓸 수 있다':'빈 땅';
    return `${name}${c.wire?' · 전선':''} · ${env}`;
  }
  /* 저장·복원 */
  snapshot(){
    return {v:1,fundsOpt:this.fundsOpt,funds:this.funds,events:this.events,disasters:this.disasters,month:this.month,title:this.title,fx:this.fx,monster:this.monster,yearIncome:this.yearIncome,yearExpense:this.yearExpense,lastYear:this.lastYear,
      grid:this.grid.map(row=>row.map(c=>[c.t,c.wire?1:0,c.bridge?1:0,c.burn,c.flood])),
      zones:this.zones.map(z=>z&&{kind:z.kind,x:z.x,y:z.y,lv:z.lv}), builds:this.builds.map(b=>b&&{kind:b.kind,x:b.x,y:b.y}), log:this.log.slice(-12)};
  }
  static restore(s){
    const c=new City({fundsOpt:s.fundsOpt,events:s.events,disasters:s.disasters});
    c.funds=s.funds; c.month=s.month; c.title=s.title; c.fx=Object.assign(c.fx,s.fx||{}); c.monster=s.monster||null; c.yearIncome=s.yearIncome||0; c.yearExpense=s.yearExpense||0; c.lastYear=s.lastYear||null;
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const [t,w,br,burn,flood]=s.grid[y][x]; const cell=c.grid[y][x]; cell.t=t; cell.wire=!!w; cell.bridge=!!br; cell.burn=burn||0; cell.flood=flood||0; cell.z=-1; cell.b=-1; }
    c.zones=s.zones.map(z=>z&&{kind:z.kind,x:z.x,y:z.y,lv:z.lv,pow:false,road:false,crime:0,pol:0,val:0});
    c.builds=s.builds.map(b=>b&&{kind:b.kind,x:b.x,y:b.y,pow:false});
    c.zones.forEach((z,i)=>{ if(z) for(let dy=0;dy<3;dy++) for(let dx=0;dx<3;dx++) c.grid[z.y+dy][z.x+dx].z=i; });
    c.builds.forEach((b,i)=>{ if(b) for(let dy=0;dy<3;dy++) for(let dx=0;dx<3;dx++) c.grid[b.y+dy][b.x+dx].b=i; });
    c.log=s.log||[]; c.msgs=[]; c.recompute();
    let R=0; for(const z of c.zones) if(z&&z.kind==='R') R+=z.lv; c.pop=R*POP_PER_LV;
    return c;
  }
}
/* 동현랭 규약: 정수 셋 = 자금 옵션(0 넉넉 · 1 보통 · 2 빠듯), 이벤트(0 끔 · 1 켬), 재해(0 끔 · 1 켬). 출력이 없으면 1 1 1. */
function parseSet(out){
  const tok=String(out||'').split(/\s+/).filter(Boolean).map(Number);
  if(!tok.length) return {fundsOpt:1,events:true,disasters:true,note:'출력이 없어 기본값(보통 20,000냥 · 이벤트 켬 · 재해 켬)으로 시작한다.'};
  if(tok.length!==3) return {err:`정수를 ${tok.length}개 출력했다. 자금 옵션, 이벤트, 재해 — 세 개를 차례로 출력하자.`};
  const [f,e,d]=tok;
  if(!Number.isInteger(f)||f<0||f>2) return {err:`자금 옵션 ${f}은 쓸 수 없다. 0(넉넉) · 1(보통) · 2(빠듯) 중 하나다.`};
  if(!Number.isInteger(e)||(e!==0&&e!==1)) return {err:`이벤트 ${e}은 쓸 수 없다. 0(끔) 또는 1(켬)이다.`};
  if(!Number.isInteger(d)||(d!==0&&d!==1)) return {err:`재해 ${d}은 쓸 수 없다. 0(끔) 또는 1(켬)이다.`};
  return {fundsOpt:f,events:e===1,disasters:d===1};
}
root.Sim={City,W,H,T,KINDS,KIND_NAME,BUILD_NAME,COST,UPKEEP,PLANT_ZONES,MAX_LV,FUNDS_OPTS,FUNDS_LABEL,TITLES,POP_PER_LV,parseSet,makeMap,mulberry};
})(typeof window!=='undefined'?window:(typeof module!=='undefined'?module.exports:this));
