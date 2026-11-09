/* 동현심 엔진: 도시 판의 규칙. 화면·입력과 떨어져 있어 node에서도 돈다(qa/core-tests.cjs).
   SimCity DS의 기본 모드(자유 건설)를 동현심 나름대로 다시 세운 것이며, 원작의 코드·수치·그림은 쓰지 않았다.
   v0.10: 판은 40×40에서 시작해 땅을 사며 60×60까지 넓어진다. 세율·시청·발전소 여섯·노후화, 공공시설 다섯·만족도, 구역 여섯, 재해 여섯, 업적, 랜드마크. */
(function(root){
'use strict';
const WORLD=60, START=40, STRIP=5;                   // 세계 60×60 · 처음 40×40 · 땅 한 줄 5칸
const T={GRASS:0,WATER:1,TREE:2,ROAD:3,ZONE:4,BUILD:5,PARK:6,RUBBLE:7};
const KINDS=['R','RH','C','CD','I','IH'];
const BASE={R:'R',RH:'R',C:'C',CD:'C',I:'I',IH:'I'};  // 수요 막대는 주·상·공 셋
const KIND_NAME={R:'주거',RH:'고급 주거',C:'시장',CD:'백화점',I:'경공업',IH:'중공업'};
const BUILD_NAME={power:'화력 발전소',hydro:'수력 발전소',wind:'풍력 발전기',nuclear:'원자력 발전소',solar:'태양광 발전소',fusion:'핵융합 발전소',
  police:'경찰서',fire:'소방서',cityhall:'시청',school:'학교',hospital:'병원',library:'도서관',museum:'미술관',concert:'음악당',
  tower:'동현타워',stadium:'경기장',airport:'공항',harbor:'항구'};
const SIZE={wind:1,solar:2,library:2,cityhall:4,tower:4,stadium:4,airport:4};   // 그 밖은 3×3
const sizeOf=k=>SIZE[k]||3;
const PLANT={power:{cap:40,pol:10,polR:6,life:600},hydro:{cap:25,water:true,life:600},wind:{cap:8,life:360},nuclear:{cap:150,pol:2,polR:4,life:600},solar:{cap:12,life:480},fusion:{cap:1e9,life:1e9}};
const LANDMARKS=['tower','stadium','airport','harbor'];
const COST={road:10,bridge:50,wire:5,wirebridge:25,R:100,RH:300,C:100,CD:400,I:100,IH:200,park:30,
  power:3000,hydro:8000,wind:1500,nuclear:60000,solar:5000,fusion:1000000,police:500,fire:500,cityhall:50000,
  school:2000,hospital:3000,library:1500,museum:10000,concert:15000,tower:200000,stadium:300000,airport:500000,harbor:150000,
  bull:1,bullBig:9,hall2:100000,hall3:200000};
const UPKEEP={power:40,hydro:20,wind:5,nuclear:150,solar:0,fusion:200,police:30,fire:30,cityhall:100,school:25,hospital:35,library:15,museum:40,concert:40,
  tower:100,stadium:150,airport:300,harbor:80,road:0.1,wire:0.05,park:0.5};
const ORD={pollute:{name:'공해 규제',cost:200,lv:1,note:'공업 오염 40% 줄고 공업 수요가 조금 준다'},patrol:{name:'야간 순찰',cost:150,lv:1,note:'범죄 30% 준다'},
  tourism:{name:'관광 홍보',cost:300,lv:2,note:'상업 수요가 오른다'},green:{name:'녹지 보전',cost:100,lv:2,note:'공원 둘레 지가가 더 오른다'}};
const PLANT_ZONES=40;            // 화력 발전소 하나가 먹이는 구역 수
const MAX_LV=5;
const FUNDS_OPTS=[500000,200000,100000,1000000];
const FUNDS_LABEL=['넉넉하게 500,000냥','보통 200,000냥','빠듯하게 100,000냥','아주 넉넉하게 1,000,000냥'];
const TITLES=[[60000,'수도'],[30000,'대도시'],[10000,'도시'],[2000,'읍'],[500,'마을'],[0,'촌락']];
const RANKS=['촌락','마을','읍','도시','대도시','수도'];
const LAND_BY_RANK=[0,2,4,6,8,8];                     // 칭호마다 살 수 있는 땅 줄 수(누적)
const LAND_PRICE=n=>20000*(n+1);                      // n번째(0부터) 땅값
const SIDE_NAME={N:'북쪽',S:'남쪽',E:'동쪽',W:'서쪽'};
const POP_PER_LV={R:160,RH:100}, JOBS={C:80,CD:160,I:120,IH:200}, TAX={R:10,RH:30,C:12,CD:24,I:10,IH:18};
const ACH=[{id:'capital',name:'수도 달성',note:'인구 60,000'},{id:'clean',name:'맑은 하늘 한 해',note:'구역 열 곳 이상인 채 평균 오염 2 아래로 열두 달'},
  {id:'safe',name:'재해 무피해 10년',note:'재해를 켠 채 재해 없이 120달'},{id:'happy',name:'만족도 90',note:'인구 2,000 이상에서 만족도 90'},
  {id:'fusion',name:'핵융합 시대',note:'핵융합 발전소를 세운다'},{id:'landmarks',name:'랜드마크 넷',note:'동현타워·경기장·공항·항구를 모두 세운다'}];

function mulberry(seed){ let a=seed>>>0; return function(){ a|=0; a=(a+0x6D2B79F5)|0; let t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; }
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const newCell=()=>({t:T.GRASS,z:-1,b:-1,wire:false,bridge:false,burn:0,flood:0});

/* ---------- 세계 지도 60×60: 평지에 강 하나(언제나 같은 지도). 도시는 가운데 40×40에서 시작한다 ---------- */
let WORLD_MAP=null;
function makeMap(){
  if(WORLD_MAP) return WORLD_MAP.map(r=>r.map(c=>Object.assign({},c)));
  const rnd=mulberry(20260108), W=WORLD, H=WORLD, inb=(x,y)=>x>=0&&y>=0&&x<W&&y<H;
  const grid=[]; for(let y=0;y<H;y++){ const row=[]; for(let x=0;x<W;x++) row.push(newCell()); grid.push(row); }
  // 강: 위에서 아래로 굽이치며 흐른다. 너비 3~4(도시 좌표로 12~16·28~31에서 넓어진다).
  let cx=32, drift=1;
  for(let y=0;y<H;y++){
    const bend=Math.round(4*Math.sin((y-10)/5.5));
    const r=rnd(); if(r<0.25) drift=-1; else if(r<0.5) drift=1;
    if(rnd()<0.6) cx=clamp(cx+drift,29,35);
    const cxx=clamp(cx+bend,26,41);
    for(let x=cxx-1;x<=cxx+1+(((y>=22&&y<=26)||(y>=38&&y<=41))?1:0);x++) grid[y][x].t=T.WATER;
    if(y>=30&&y<=33) grid[y][cxx-2].t=T.WATER;
  }
  // 숲: 몇 군데 둥근 숲. 강 위에는 심지 않는다.
  const woods=[[15,15,3],[19,40,3],[44,18,2],[45,44,3],[24,30,2],[41,32,2],[30,45,2],[16,26,2],[4,4,2],[55,6,3],[5,53,3],[56,56,2],[30,3,2],[27,57,2],[3,30,2],[57,30,2]];
  for(const [wx,wy,r] of woods) for(let y=wy-r;y<=wy+r;y++) for(let x=wx-r;x<=wx+r;x++){
    if(!inb(x,y)||grid[y][x].t!==T.GRASS) continue;
    const d=(x-wx)*(x-wx)+(y-wy)*(y-wy); if(d<=r*r+(rnd()<0.5?1:0)) grid[y][x].t=T.TREE; }
  const nearW=(x,y)=>{ for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){ const xx=x+dx,yy=y+dy; if(inb(xx,yy)&&grid[yy][xx].t===T.WATER) return true; } return false; };
  for(let y=0;y<H;y++) for(let x=0;x<W;x++) if(grid[y][x].t===T.GRASS&&nearW(x,y)&&rnd()<0.12) grid[y][x].t=T.TREE;
  WORLD_MAP=grid; return makeMap();
}

/* ---------- 도시 ---------- */
class City{
  constructor(opts){
    opts=opts||{};
    this.fundsOpt=clamp(opts.fundsOpt==null?1:opts.fundsOpt,0,FUNDS_OPTS.length-1);
    this.funds=FUNDS_OPTS[this.fundsOpt];
    this.events=opts.events==null?true:!!opts.events;
    this.disasters=opts.disasters==null?true:!!opts.disasters;
    this.random=mulberry(opts.seed==null?Date.now()&0xffffffff:opts.seed);
    this.world=makeMap(); this.ox=(WORLD-START)/2; this.oy=(WORLD-START)/2; this.W=START; this.H=START;
    this.grid=[]; for(let y=0;y<START;y++) this.grid.push(this.world[this.oy+y].slice(this.ox,this.ox+START));
    this.zones=[]; this.builds=[];
    this.month=0; this.pop=0; this.jobs=0; this.title='촌락'; this.rank=0;
    this.demand={R:1,C:0.3,I:0.4};
    this.income=0; this.expense=0; this.yearIncome=0; this.yearExpense=0; this.lastYear=null; this.totalTax=0;
    this.tax=10; this.hall=null;                        // 시청이 서면 {lv:1,ord:{}}
    this.land={bought:0};
    this.satisfaction=50; this.cleanMonths=0; this.lastDisaster=0; this.ach={};
    this.crime=0; this.pollution=0; this.landValue=0; this.unpowered=0; this.noroad=0;
    this.fx={cBoost:0,taxBoost:0,treeBoost:0,cheapPower:0,quake:0};
    this.monster=null; this.tornado=null; this.log=[]; this.msgs=[];
    this.maps={};
    this.recompute();
    this.say(`시장 포동이가 부임했다 · 자금 ${this.funds.toLocaleString()}냥 · 이벤트 ${this.events?'켬':'끔'} · 재해 ${this.disasters?'켬':'끔'}`,'podong','info');
  }
  /* ----- 소식 ----- */
  say(text,face,kind){ const m={m:this.month,text,face:face||'podong',kind:kind||'info'}; this.log.push(m); if(this.log.length>40) this.log.shift(); this.msgs.push(m); }
  takeMsgs(){ const m=this.msgs; this.msgs=[]; return m; }
  get date(){ return {year:Math.floor(this.month/12)+1,month:this.month%12+1}; }
  dateText(){ const d=this.date; return `${d.year}년차 ${d.month}월`; }
  inb(x,y){ return x>=0&&y>=0&&x<this.W&&y<this.H; }
  cell(x,y){ return this.inb(x,y)?this.grid[y][x]:null; }
  zoneAt(x,y){ const c=this.cell(x,y); return c&&c.z>=0?this.zones[c.z]:null; }
  buildAt(x,y){ const c=this.cell(x,y); return c&&c.b>=0?this.builds[c.b]:null; }
  has(kind){ return this.builds.some(b=>b&&b.kind===kind); }
  count(kind){ return this.builds.filter(b=>b&&b.kind===kind).length; }

  /* ----- 해금: 칭호·시청·연차에 따라 열린다. 열려 있으면 null, 아니면 이유 ----- */
  locked(kind){
    const r=this.rank, hall=!!this.hall, year=this.date.year;
    switch(kind){
      case 'RH': return r<2?'읍(인구 2,000)부터':null;
      case 'IH': return r<1?'마을(인구 500)부터':null;
      case 'CD': return hall?null:'시청이 선 뒤';
      case 'wind': return r<2?'읍부터':null;
      case 'nuclear': return r<3?'도시(인구 10,000)부터':!hall?'시청이 선 뒤':null;
      case 'solar': return (r>=3||year>=100)?null:'도시 또는 100년차부터';
      case 'fusion': return r<5?'수도(인구 60,000)부터':this.totalTax<1000000?`누적 세입 100만냥(지금 ${Math.round(this.totalTax).toLocaleString()})`:null;
      case 'cityhall': return hall?'시청은 하나면 된다':r<3?'도시(인구 10,000)부터':null;
      case 'school': case 'hospital': case 'library': return r<1?'마을(인구 500)부터':null;
      case 'museum': case 'concert': return r<2?'읍(인구 2,000)부터':null;
      case 'tower': case 'stadium': return this.has(kind)?'하나면 된다':r<3?'도시부터':null;
      case 'airport': return this.has(kind)?'하나면 된다':r<4?'대도시(인구 30,000)부터':null;
      case 'harbor': return this.has(kind)?'하나면 된다':r<2?'읍부터':null;
      default: return null;
    }
  }

  /* ----- 짓기 ----- */
  canPay(n){ return this.funds>=n; }
  buildable(x,y){ const c=this.cell(x,y); return !!c&&(c.t===T.GRASS||c.t===T.TREE)&&!c.wire&&!c.flood; }
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
  fits(x,y,s){ for(let dy=0;dy<s;dy++) for(let dx=0;dx<s;dx++) if(!this.buildable(x+dx,y+dy)) return false; return true; }
  fits3(x,y){ return this.fits(x,y,3); }
  touchesWater(x,y,s){ for(let yy=y-1;yy<=y+s;yy++) for(let xx=x-1;xx<=x+s;xx++){ const c=this.cell(xx,yy); if(c&&c.t===T.WATER) return true; } return false; }
  placeZone(kind,x,y){
    if(!KINDS.includes(kind)) return {ok:false,why:'종류'};
    const lk=this.locked(kind); if(lk) return {ok:false,why:lk};
    if(!this.inb(x,y)||!this.inb(x+2,y+2)) return {ok:false,why:'밖'};
    if(!this.fits3(x,y)) return {ok:false,why:'빈 땅 3×3이 필요하다'};
    if(!this.canPay(COST[kind])) return {ok:false,why:'자금 부족'};
    const z={kind,x,y,lv:0,pow:false,road:false,crime:0,pol:0,val:0,grow:-99}; const id=this.zones.length; this.zones.push(z);
    for(let dy=0;dy<3;dy++) for(let dx=0;dx<3;dx++){ const c=this.grid[y+dy][x+dx]; c.t=T.ZONE; c.z=id; }
    this.funds-=COST[kind]; this.dirty=true; return {ok:true,cost:COST[kind],zone:z};
  }
  placeBuilding(kind,x,y){
    if(!BUILD_NAME[kind]) return {ok:false,why:'종류'};
    const lk=this.locked(kind); if(lk) return {ok:false,why:lk};
    const s=sizeOf(kind);
    if(!this.inb(x,y)||!this.inb(x+s-1,y+s-1)) return {ok:false,why:'밖'};
    if(!this.fits(x,y,s)) return {ok:false,why:`빈 땅 ${s}×${s}이 필요하다`};
    if((kind==='hydro'||kind==='harbor')&&!this.touchesWater(x,y,s)) return {ok:false,why:'강에 붙여야 한다'};
    if(!this.canPay(COST[kind])) return {ok:false,why:'자금 부족'};
    const b={kind,x,y,s,pow:!!PLANT[kind],age:0,worn:false}; const id=this.builds.length; this.builds.push(b);
    for(let dy=0;dy<s;dy++) for(let dx=0;dx<s;dx++){ const c=this.grid[y+dy][x+dx]; c.t=T.BUILD; c.b=id; }
    this.funds-=COST[kind]; this.dirty=true;
    if(kind==='cityhall'){ this.hall={lv:1,ord:{}}; this.say('시청이 섰다 · 세율을 정하고 조례를 펼 수 있다 · 시청 도구를 다시 누르면 시청 메뉴','podong','good'); }
    if(kind==='fusion') this.say('핵융합 발전소! 전기 걱정은 끝났다','copter','good');
    if(LANDMARKS.includes(kind)) this.say(`${BUILD_NAME[kind]}가 섰다 · 도시의 자랑이다`,'podong','good');
    return {ok:true,cost:COST[kind],build:b};
  }
  placePark(x,y){
    if(!this.buildable(x,y)) return {ok:false,why:'빈 땅이 필요하다'};
    if(!this.canPay(COST.park)) return {ok:false,why:'자금 부족'};
    this.grid[y][x].t=T.PARK; this.funds-=COST.park; this.dirty=true; return {ok:true,cost:COST.park};
  }
  /* 보수: 낡은 발전소를 원가의 30%로 새것처럼 */
  repair(x,y){
    const b=this.buildAt(x,y); if(!b||!PLANT[b.kind]) return {ok:false,why:'발전소를 눌러야 한다'};
    if(!b.worn) return {ok:false,why:'아직 멀쩡하다'};
    const cost=Math.round(COST[b.kind]*0.3); if(!this.canPay(cost)) return {ok:false,why:'자금 부족'};
    b.worn=false; b.age=0; this.funds-=cost; this.dirty=true; this.say(`${BUILD_NAME[b.kind]}를 보수했다 · −${cost.toLocaleString()}냥`,'knight','info'); return {ok:true,cost};
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
  removeBuild(id,to){ const b=this.builds[id]; if(!b) return; const s=b.s||3; for(let dy=0;dy<s;dy++) for(let dx=0;dx<s;dx++){ const c=this.grid[b.y+dy][b.x+dx]; c.t=to; c.b=-1; c.burn=0; } this.builds[id]=null; if(b.kind==='cityhall') this.hall=null; }
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
  flammable(c){ return (c.t===T.ZONE&&this.zones[c.z]&&this.zones[c.z].lv>0)||c.t===T.TREE||c.t===T.PARK||(c.t===T.BUILD&&this.builds[c.b]&&!PLANT[this.builds[c.b].kind]); }

  /* ----- 땅 사기: 칭호가 오를 때마다 바깥 한 줄(5칸)씩 살 수 있다 ----- */
  landOffer(){
    const allowed=LAND_BY_RANK[this.rank], n=this.land.bought, price=LAND_PRICE(n);
    const room={N:this.oy>=STRIP,S:this.oy+this.H+STRIP<=WORLD,W:this.ox>=STRIP,E:this.ox+this.W+STRIP<=WORLD};
    return {allowed,bought:n,left:Math.max(0,allowed-n),price,room,nextRank:this.rank<RANKS.length-1?RANKS[this.rank+1]:null};
  }
  buyLand(side){
    const o=this.landOffer(); if(!SIDE_NAME[side]) return {ok:false,why:'방향'};
    if(!o.room[side]) return {ok:false,why:`${SIDE_NAME[side]}은 세계의 끝이다`};
    if(o.left<=0) return {ok:false,why:o.nextRank?`${o.nextRank}이 되면 더 살 수 있다`:'더 살 땅이 없다'};
    if(!this.canPay(o.price)) return {ok:false,why:'자금 부족'};
    const dx=side==='W'?STRIP:0, dy=side==='N'?STRIP:0;
    if(side==='N') this.oy-=STRIP; if(side==='W') this.ox-=STRIP;
    const nW=this.W+(side==='E'||side==='W'?STRIP:0), nH=this.H+(side==='N'||side==='S'?STRIP:0);
    const grid=[]; for(let y=0;y<nH;y++){ const row=[]; for(let x=0;x<nW;x++){ const sx=x-dx, sy=y-dy;
      if(sx>=0&&sy>=0&&sx<this.W&&sy<this.H) row.push(this.grid[sy][sx]); else row.push(Object.assign({},this.world[this.oy+y][this.ox+x])); } grid.push(row); }
    this.grid=grid; this.W=nW; this.H=nH;
    for(const z of this.zones) if(z){ z.x+=dx; z.y+=dy; }
    for(const b of this.builds) if(b){ b.x+=dx; b.y+=dy; }
    if(this.monster){ this.monster.x+=dx; this.monster.y+=dy; this.monster.tx+=dx; this.monster.ty+=dy; }
    if(this.tornado){ this.tornado.x+=dx; this.tornado.y+=dy; }
    this.funds-=o.price; this.land.bought++; this.dirty=true; this.shift={dx,dy};
    this.say(`${SIDE_NAME[side]} 땅 한 줄을 샀다 · 판 ${this.W}×${this.H} · −${o.price.toLocaleString()}냥`,'podong','good');
    this.recompute(); return {ok:true,cost:o.price,dx,dy};
  }

  /* ----- 시청: 세율·조례·증축 ----- */
  setTax(v){ if(!this.hall) return {ok:false,why:'시청이 있어야 세율을 바꾼다'}; const max=this.hall.lv>=2?20:15; v=Math.round(v); if(v<5||v>max) return {ok:false,why:`세율은 5~${max}%`}; this.tax=v; return {ok:true}; }
  taxMax(){ return this.hall&&this.hall.lv>=2?20:15; }
  toggleOrd(id){ const o=ORD[id]; if(!this.hall||!o) return {ok:false,why:'시청이 있어야 한다'}; if(this.hall.lv<o.lv) return {ok:false,why:`시청 ${o.lv}단계부터`};
    this.hall.ord[id]=!this.hall.ord[id]; this.dirty=true; this.say(`조례 ${o.name} ${this.hall.ord[id]?'시행':'폐지'}`,'podong','info'); return {ok:true,on:this.hall.ord[id]}; }
  ord(id){ return !!(this.hall&&this.hall.ord[id]); }
  upgradeHall(){ if(!this.hall) return {ok:false,why:'시청이 없다'}; if(this.hall.lv>=3) return {ok:false,why:'이미 3단계'}; const cost=this.hall.lv===1?COST.hall2:COST.hall3; if(!this.canPay(cost)) return {ok:false,why:'자금 부족'};
    this.funds-=cost; this.hall.lv++; this.say(this.hall.lv===2?'시청 2단계 · 세율 20%까지 · 관광 홍보·녹지 보전 조례가 열렸다':'시청 3단계 · 세수 10% 보너스','podong','good'); return {ok:true,cost}; }

  /* ----- 달마다 다시 세는 것: 전력·도로·지도들 ----- */
  recompute(){
    const g=this.grid, W=this.W, H=this.H, inb=(x,y)=>this.inb(x,y);
    // 전력: 발전소에서 전도체(전선·구역·건물)를 따라 퍼진다. 한 그물의 용량은 발전소 용량의 합(낡으면 반, 잠긴 수력은 0).
    const comp=new Int16Array(W*H).fill(-1); const comps=[]; let ncomp=0;
    const capOf=b=>{ const p=PLANT[b.kind]; let cap=p.cap; if(b.worn) cap*=0.5; if(p.water&&this.floodedAt(b)) cap=0; return cap; };
    for(const b of this.builds){ if(!b||!PLANT[b.kind]) continue; const k=comp[b.y*W+b.x]; if(k>=0){ comps[k].cap+=capOf(b); continue; }
      const id=ncomp++; comps.push({cap:capOf(b),zones:[]}); const q=[[b.x,b.y]]; comp[b.y*W+b.x]=id;
      while(q.length){ const [x,y]=q.shift(); const c=g[y][x]; if(c.t===T.ZONE&&c.z>=0&&this.zones[c.z]&&!comps[id].zones.includes(c.z)) comps[id].zones.push(c.z);
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const xx=x+dx,yy=y+dy; if(!inb(xx,yy)) continue; const n=g[yy][xx]; if(comp[yy*W+xx]>=0||!this.conductive(n)) continue; comp[yy*W+xx]=id; q.push([xx,yy]); } } }
    for(const z of this.zones) if(z) z.pow=false;
    this.unpowered=0; this.brownout=false; let dark=0;
    for(const cp of comps){ cp.zones.forEach((zi,i)=>{ if(i<Math.floor(cp.cap)) this.zones[zi].pow=true; else { dark++; this.brownout=true; } }); }
    for(const b of this.builds){ if(!b) continue; b.pow=PLANT[b.kind]?true:comp[b.y*W+b.x]>=0; }
    let outside=0; for(const z of this.zones) if(z&&!z.pow&&comp[z.y*W+z.x]<0) outside++; this.unpowered=outside+dark;
    this.compMap=comp;
    // 도로: 3×3 둘레 한 겹 안에 도로가 있으면 된다
    this.noroad=0;
    for(const z of this.zones){ if(!z) continue; z.road=false;
      for(let y=z.y-1;y<=z.y+3&&!z.road;y++) for(let x=z.x-1;x<=z.x+3;x++){ if(!inb(x,y)) continue; if(y>=z.y&&y<=z.y+2&&x>=z.x&&x<=z.x+2) continue; if(g[y][x].t===T.ROAD){ z.road=true; break; } }
      if(!z.road) this.noroad++; }
    // 오염·치안·소방·학교·병원·문화·백화점·지가
    const F=()=>new Float32Array(W*H);
    const pol=F(), police=F(), fire=F(), school=F(), hosp=F(), cult=F(), cd=F(), val=F();
    const spread=(arr,x,y,amt,r)=>{ for(let yy=y-r;yy<=y+r;yy++) for(let xx=x-r;xx<=x+r;xx++){ if(!inb(xx,yy)) continue; const d=Math.max(Math.abs(xx-x),Math.abs(yy-y)); arr[yy*W+xx]+=amt*(1-d/(r+1)); } };
    const polMul=this.ord('pollute')?0.6:1;
    for(const z of this.zones){ if(!z||!z.lv) continue; if(z.kind==='I') spread(pol,z.x+1,z.y+1,z.lv*1.5*polMul,4); else if(z.kind==='IH') spread(pol,z.x+1,z.y+1,z.lv*5*polMul,5); else if(z.kind==='CD') spread(cd,z.x+1,z.y+1,0.12,6); }
    for(const b of this.builds){ if(!b) continue; const s=b.s||3, cx=b.x+Math.floor(s/2), cy=b.y+Math.floor(s/2); const p=PLANT[b.kind];
      if(p&&p.pol) spread(pol,cx,cy,p.pol,p.polR);
      if(b.kind==='airport') spread(pol,cx,cy,6,6);
      if(!b.pow) continue;
      if(b.kind==='police') spread(police,cx,cy,1,10); else if(b.kind==='fire') spread(fire,cx,cy,1,10);
      else if(b.kind==='school') spread(school,cx,cy,1,10); else if(b.kind==='library'){ spread(school,cx,cy,0.5,6); spread(val,cx,cy,2,4); }
      else if(b.kind==='hospital') spread(hosp,cx,cy,1,10); else if(b.kind==='museum'||b.kind==='concert') spread(cult,cx,cy,1,12);
      else if(b.kind==='tower') spread(val,cx,cy,6,8); }
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const c=g[y][x]; if(c.t===T.ROAD&&!c.bridge){ let dev=false; for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const n=this.cell(x+dx,y+dy); if(n&&n.z>=0&&this.zones[n.z]&&this.zones[n.z].lv>0){ dev=true; break; } } if(dev) spread(pol,x,y,0.8,1); } }
    // 지가: 물·숲·공원이 올리고 오염이 내린다
    const parkAmt=(2.6+(this.fx.treeBoost?1.5:0))*(this.ord('green')?1.5:1);
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const c=g[y][x]; if(c.t===T.WATER) spread(val,x,y,2.2,2); else if(c.t===T.TREE) spread(val,x,y,0.9,2); else if(c.t===T.PARK) spread(val,x,y,parkAmt,3); }
    for(let i=0;i<W*H;i++){ val[i]=clamp(14+val[i]-pol[i]*1.4,0,40); }
    // 구역마다 요약, 범죄
    let polSum=0,valSum=0,crSum=0,n=0; const crimeMul=this.ord('patrol')?0.7:1;
    for(const z of this.zones){ if(!z) continue; const i=(z.y+1)*W+z.x+1; z.pol=pol[i]; z.val=val[i]; z.school=school[i]>=0.5; z.hosp=hosp[i]>=0.5; z.cult=Math.min(2,cult[i]); z.cd=cd[i]; const cov=Math.min(1,police[i]);
      const base=BASE[z.kind], dens=z.lv*(base==='C'?1.3:base==='R'?1:0.5); z.crime=clamp(dens*6*(1-cov)*(z.val<12?1.4:1)*crimeMul,0,40);
      if(z.lv>0){ polSum+=z.pol; valSum+=z.val; crSum+=z.crime; n++; } }
    const crime=F(); for(const z of this.zones) if(z&&z.lv>0) spread(crime,z.x+1,z.y+1,z.crime,3);
    this.pollution=n?polSum/n:0; this.landValue=n?valSum/n:0; this.crime=n?crSum/n:0; this.developed=n;
    this.maps={pol,police,fire,val,crime,school,hosp,cult};
    this.dirty=false;
  }
  floodedAt(b){ const s=b.s||3; for(let dy=0;dy<s;dy++) for(let dx=0;dx<s;dx++){ const c=this.cell(b.x+dx,b.y+dy); if(c&&c.flood) return true; } return false; }

  /* ----- 한 달 ----- */
  tick(){
    this.recompute();
    const g=this.grid, W=this.W, H=this.H;
    // 인구·일자리·수요
    let R=0,C=0,I=0,pop=0,jobs=0; for(const z of this.zones){ if(!z) continue; const b=BASE[z.kind];
      if(b==='R'){ R+=z.lv; pop+=z.lv*POP_PER_LV[z.kind]*(z.hosp?1.1:1); } else if(b==='C'){ C+=z.lv; jobs+=z.lv*JOBS[z.kind]; } else { I+=z.lv; jobs+=z.lv*JOBS[z.kind]; } }
    const res=Math.round(pop); this.pop=res; this.jobs=jobs;
    const cJobs=C*JOBS.C, iJobs=I*JOBS.I, taxPen=(this.tax-10)/50;
    this.demand={
      R:clamp((jobs*1.2+1200-res)/(res+800),-1,1)-taxPen,
      C:clamp((res*0.35+100-cJobs)/(cJobs+300),-1,1)+(this.fx.cBoost?0.4:0)+(this.ord('tourism')?0.15:0)+(this.has('stadium')?0.15:0)+(this.has('airport')?0.3:0)-taxPen,
      I:clamp((res*0.5+200-iJobs)/(iJobs+300),-1,1)+(this.has('harbor')?0.2:0)+(this.has('airport')?0.1:0)-(this.ord('pollute')?0.1:0)-taxPen
    };
    // 구역 성장
    const satMul=this.satisfaction>=70?1.2:this.satisfaction<40?0.6:1;
    for(const z of this.zones){ if(!z) continue;
      if(!z.pow||!z.road){ if(z.lv>0&&this.random()<0.3){ z.lv--; z.grow=this.month; } continue; }
      const b=BASE[z.kind]; let d=this.demand[b];
      if(z.kind==='R') d+=(z.val-14)/40-z.pol/25-z.crime/60;
      if(z.kind==='RH') d+=(z.val-18)/30-z.pol/12-z.crime/30;
      if(b==='C') d+=(z.val-14)/40-z.crime/40+z.cult*0.1+(z.kind==='C'?z.cd:0);
      if(b==='I') d+=0.05;
      const t1=z.school?16:20, t2=z.school?22:28;
      if(d>0&&z.lv<MAX_LV&&this.random()<d*0.35*satMul){
        let gate=false;
        if(b!=='I'&&((z.lv===3&&z.val<t1)||(z.lv===4&&z.val<t2))) gate=true;
        if(z.kind==='RH'&&z.val<22) gate=true;
        if(z.kind==='CD'&&z.lv>=2&&z.val<18) gate=true;
        if(!gate){ z.lv++; z.grow=this.month; } }
      else if(d<-0.15&&z.lv>0&&this.random()<-d*0.25){ z.lv--; z.grow=this.month; }
    }
    // 돈: 달마다 세금이 들어오고 유지비가 나간다
    let inc=0; for(const z of this.zones){ if(!z||!z.lv) continue; inc+=z.lv*TAX[z.kind]; }
    inc*=this.tax/10; if(this.fx.taxBoost) inc*=2; if(this.hall&&this.hall.lv>=3) inc*=1.1;
    let exp=0, roads=0, wires=0, parks=0;
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const c=g[y][x]; if(c.t===T.ROAD) roads++; if(c.wire) wires++; if(c.t===T.PARK) parks++; }
    for(const b of this.builds){ if(!b) continue; exp+=UPKEEP[b.kind]*(PLANT[b.kind]&&this.fx.cheapPower?0.5:1); }
    if(this.hall) for(const k in ORD) if(this.hall.ord[k]) exp+=ORD[k].cost;
    exp+=roads*UPKEEP.road+wires*UPKEEP.wire+parks*UPKEEP.park;
    // 노후화: 발전소는 수명이 다하면 낡아 용량이 반이 된다(보수 도구로 고친다). 길은 30년마다 보수비.
    for(const b of this.builds){ if(!b) continue; b.age=(b.age||0)+1; const p=PLANT[b.kind]; if(p&&!b.worn&&b.age>=p.life){ b.worn=true; this.say(`${BUILD_NAME[b.kind]}가 낡았다 · 용량이 반으로 준다 · 보수 도구로 누르면 ${Math.round(COST[b.kind]*0.3).toLocaleString()}냥에 새것처럼`,'knight','warn'); } }
    if(this.month>0&&this.month%360===0&&roads>0){ const fix=roads*3; exp+=fix; this.say(`30년 만의 도로 보수 · 길 ${roads}칸 · −${fix.toLocaleString()}냥`,'knight','info'); }
    inc=Math.round(inc); exp=Math.round(exp);
    this.funds+=inc-exp; this.income=inc; this.expense=exp; this.yearIncome+=inc; this.yearExpense+=exp; this.totalTax+=inc;
    // 병원 둘레 잔해는 저절로 치워진다
    const hosp=this.maps.hosp; for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const c=g[y][x]; if(c.t===T.RUBBLE&&hosp[y*W+x]>=0.5&&this.random()<0.25) c.t=T.GRASS; }
    // 만족도
    this.satisfaction=this.calcSatisfaction();
    // 불
    this.burnStep();
    // 홍수 물러감
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const c=g[y][x]; if(c.flood>0){ c.flood--; } }
    // 괴수·토네이도
    if(this.monster) this.monsterStep();
    if(this.tornado) this.tornadoStep();
    // 효과 남은 달
    for(const k in this.fx) if(this.fx[k]>0) this.fx[k]--;
    // 재해·이벤트
    if(this.disasters&&!this.monster&&!this.tornado&&this.month>=24&&this.random()<1/60) this.disaster(); // 처음 두 해는 재해가 없다
    const cultural=this.builds.some(b=>b&&b.pow&&(b.kind==='museum'||b.kind==='concert'));
    if(this.events&&this.random()<1/30) this.event(cultural);
    // 칭호
    const title=TITLES.find(t=>this.pop>=t[0])[1];
    if(title!==this.title){ const up=RANKS.indexOf(title)>RANKS.indexOf(this.title); this.title=title; this.rank=RANKS.indexOf(title);
      if(up){ this.say(`인구 ${this.pop.toLocaleString()} · 이제 ${title}이다!`,'podong','good'); const o=this.landOffer(); if(o.left>0) this.say(`${title}이 되어 땅 ${o.left}줄을 더 살 수 있다 · 땅 도구에서 방향을 고른다 · 다음 줄 ${o.price.toLocaleString()}냥`,'podong','info'); } }
    // 경고(가끔만)
    if(this.month%6===5){
      if(this.unpowered>0) this.say(this.brownout?`전력이 모자란다 · 구역 ${this.unpowered}곳이 어둡다 · 발전소를 더 짓거나 보수하자`:`전선이 닿지 않은 구역 ${this.unpowered}곳`,'copter','warn');
      if(this.noroad>0) this.say(`도로가 닿지 않은 구역 ${this.noroad}곳`,'knight','warn');
      if(this.funds<0) this.say(`자금이 바닥났다 · 세금이 들어올 때까지 지을 수 없다`,'shushu','warn');
    }
    if(this.month%12===7&&this.satisfaction<40&&this.developed>=4) this.say(`주민 만족도 ${Math.round(this.satisfaction)} · 불만이 크다 · 경찰서·소방서·학교·병원을 늘리고 오염을 줄이자`,'shushu','warn');
    // 업적
    this.checkAch();
    // 해가 바뀌면 결산
    this.month++;
    if(this.month%12===0){ this.lastYear={income:this.yearIncome,expense:this.yearExpense}; this.say(`${this.date.year-1}년차 결산 · 수입 ${this.yearIncome.toLocaleString()} · 지출 ${this.yearExpense.toLocaleString()}냥`,'podong','info'); this.yearIncome=0; this.yearExpense=0; }
    this.recompute();
  }
  calcSatisfaction(){
    const m=this.maps, W=this.W; let sum=0, n=0;
    for(const z of this.zones){ if(!z||!z.lv) continue; const i=(z.y+1)*W+z.x+1;
      let s=55+12*Math.min(1,m.police[i])+10*Math.min(1,m.fire[i])+8*Math.min(1,m.school[i])+8*Math.min(1,m.hosp[i])+7*Math.min(1,m.cult[i])-z.pol*0.6-z.crime*0.5-(this.tax-10)*2-(z.pow?0:10)-(z.road?0:5);
      sum+=clamp(s,0,100); n++; }
    return n?sum/n:50;
  }
  checkAch(){
    const got=id=>{ if(this.ach[id]) return; this.ach[id]=this.month; const a=ACH.find(x=>x.id===id); this.say(`업적 달성 · ${a.name}!`,'podong','good'); };
    if(this.title==='수도') got('capital');
    if(this.developed>=10&&this.pollution<2) this.cleanMonths++; else this.cleanMonths=0; if(this.cleanMonths>=12) got('clean');
    if(this.disasters&&this.month-this.lastDisaster>=120&&this.month>=144) got('safe');
    if(this.satisfaction>=90&&this.pop>=2000) got('happy');
    if(this.has('fusion')) got('fusion');
    if(LANDMARKS.every(k=>this.has(k))) got('landmarks');
  }
  burnStep(){
    const g=this.grid, W=this.W, H=this.H, fire=this.maps.fire; const spreads=[];
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const c=g[y][x]; if(!c.burn) continue;
      const cov=Math.min(1,fire[y*W+x]);
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const n=this.cell(x+dx,y+dy); if(n&&!n.burn&&this.flammable(n)&&this.random()<0.35*(1-cov*0.85)) spreads.push(n); }
      c.burn--; if(c.burn<=0){ this.wreck(x,y); c.t=T.RUBBLE; c.burn=0; } else if(cov>0.6&&this.random()<0.5){ c.burn=0; this.wreck(x,y); c.t=T.RUBBLE; } }
    for(const n of spreads) if(!n.burn) n.burn=3;
  }
  ignite(x,y){ const c=this.cell(x,y); if(!c||c.burn||!this.flammable(c)) return false; c.burn=3; return true; }
  nearWater(x,y){ for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){ const c=this.cell(x+dx,y+dy); if(c&&c.t===T.WATER) return true; } return false; }
  disaster(){
    const r=this.random(), W=this.W, H=this.H; const dev=[]; for(const z of this.zones) if(z&&z.lv>0) dev.push(z);
    const plants=this.builds.filter(b=>b&&PLANT[b.kind]&&b.kind!=='fusion'), nukes=this.builds.filter(b=>b&&b.kind==='nuclear');
    const pick=()=>dev[Math.floor(this.random()*dev.length)];
    this.lastDisaster=this.month;
    if(nukes.length&&r<0.05){ const b=nukes[Math.floor(this.random()*nukes.length)]; let n=0; for(let y=b.y-3;y<=b.y+5;y++) for(let x=b.x-3;x<=b.x+5;x++){ if(this.random()<0.6&&this.wreck(x,y)) n++; } this.removeBuild(this.builds.indexOf(b),T.RUBBLE);
      this.say(`원자력 발전소가 샜다! 둘레 ${n}곳이 잔해가 되었다 · 발전소도 잃었다`,'doom','bad'); return; }
    if(r<0.3){ if(!dev.length) return; const z=pick(); this.ignite(z.x+1,z.y+1); this.say(`${KIND_NAME[z.kind]} 구역에 불이 났다! 소방서가 가까우면 금방 꺼진다 · 불타는 칸을 밀면 방화선`,'doom','bad'); }
    else if(r<0.5){ let n=0; for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const c=this.grid[y][x]; if(c.t!==T.WATER&&this.nearWater(x,y)&&this.random()<0.55){ c.flood=4+Math.floor(this.random()*4); if(this.wreck(x,y)) n++; } }
      this.say(`강이 넘쳤다! 강가 ${n}곳이 잠겼다 · 다리와 전선은 버틴다 · 수력 발전소는 물이 빠질 때까지 멈춘다`,'lion','bad'); }
    else if(r<0.65){ if(!dev.length) return; const z=pick(); const side=Math.floor(this.random()*4); const m={x:side===0?0:side===1?W-1:Math.floor(this.random()*W),y:side===2?0:side===3?H-1:Math.floor(this.random()*H),tx:z.x+1,ty:z.y+1,life:7,steps:[]};
      this.monster=m; this.say('거대 라이언이 나타났다! 지나는 자리는 잔해가 된다 · 일곱 달쯤 머문다','lion','bad'); }
    else if(r<0.8){ const fromW=this.random()<0.5; const t={x:fromW?0:W-1,y:Math.floor(this.random()*H),dx:fromW?1:-1,dy:this.random()<0.5?1:-1,life:5};
      this.tornado=t; this.say('토네이도가 왔다! 다섯 달 동안 판을 가로지르며 지나는 자리를 쓸어 간다','copter','bad'); this.tornadoStep(); }
    else if(r<0.9){ let n=0; for(const z of dev) if(this.random()<0.08&&this.wreck(z.x+1,z.y+1)) n++;
      for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const c=this.grid[y][x]; if(c.t===T.ROAD&&!c.bridge&&this.random()<0.04){ this.wreck(x,y); n++; } }
      this.fx.quake=2; this.say(`지진이다! 건물 ${n}곳이 무너지고 길이 끊겼다 · 잔해를 치우고 다시 잇자`,'doom','bad'); }
    else { if(!plants.length){ if(dev.length){ const z=pick(); this.ignite(z.x+1,z.y+1); this.say(`${KIND_NAME[z.kind]} 구역에 불이 났다!`,'doom','bad'); } return; }
      const b=plants[Math.floor(this.random()*plants.length)]; b.worn=true; this.say(`정전! ${BUILD_NAME[b.kind]}가 고장 나 용량이 반이 되었다 · 보수 도구로 고치자`,'copter','bad'); }
  }
  monsterStep(){
    const m=this.monster; m.life--; if(m.life<=0){ this.monster=null; this.say('거대 라이언이 강으로 돌아갔다','lion','info'); return; }
    m.steps=[];
    for(let s=0;s<2;s++){ const dx=Math.sign(m.tx-m.x), dy=Math.sign(m.ty-m.y); if(this.random()<0.3){ m.x+=Math.round(this.random()*2-1); m.y+=Math.round(this.random()*2-1); } else if(Math.abs(m.tx-m.x)>Math.abs(m.ty-m.y)) m.x+=dx; else m.y+=dy;
      m.x=clamp(m.x,0,this.W-1); m.y=clamp(m.y,0,this.H-1); m.steps.push([m.x,m.y]);
      this.wreck(m.x,m.y); for(const [ox,oy] of [[1,0],[-1,0],[0,1],[0,-1]]) if(this.random()<0.4) this.wreck(m.x+ox,m.y+oy); }
    if(m.x===m.tx&&m.y===m.ty){ const dev=[]; for(const z of this.zones) if(z&&z.lv>0) dev.push(z); if(dev.length){ const z=dev[Math.floor(this.random()*dev.length)]; m.tx=z.x+1; m.ty=z.y+1; } }
  }
  tornadoStep(){
    const t=this.tornado; t.life--; if(t.life<0||!this.inb(t.x,t.y)){ this.tornado=null; this.say('토네이도가 흩어졌다','copter','info'); return; }
    for(let s=0;s<4;s++){ this.wreck(t.x,t.y); if(this.random()<0.5) this.wreck(t.x+(this.random()<0.5?1:-1),t.y); t.x+=t.dx; if(this.random()<0.5) t.y+=t.dy; if(this.random()<0.2) t.dy=-t.dy;
      if(!this.inb(t.x,t.y)){ this.tornado=null; this.say('토네이도가 판 밖으로 나갔다','copter','info'); return; } }
  }
  event(cultural){
    const r=this.random();
    if(r<0.3){ this.fx.cBoost=3; this.say('시장 포동이가 축제를 열었다 · 석 달 동안 상업 수요가 오른다','podong','good'); }
    else if(r<0.55){ const amt=Math.max(1000,Math.round(this.pop*0.15/100)*100); this.funds+=amt; this.say(`슈슈가 복싱 대회 상금 ${amt.toLocaleString()}냥을 도시에 기부했다`,'shushu','good'); }
    else if(r<(cultural?0.9:0.8)){ this.fx.taxBoost=cultural?3:1; this.say(cultural?'미술관·음악당을 보러 관광객이 몰려왔다 · 석 달 동안 세금 두 배':'초파리 떼가 아니라 관광객이 몰려왔다 · 이번 달 세금 두 배','fly','good'); }
    else { this.fx.treeBoost=6; this.say('나무 심기 운동 · 여섯 달 동안 공원 둘레 지가가 더 오른다','podong','good'); }
  }
  /* 칸 설명(정보 도구) */
  describe(x,y){
    const c=this.cell(x,y); if(!c) return '';
    const i=y*this.W+x, m=this.maps;
    const env=`지가 ${Math.round(m.val[i])} · 오염 ${Math.round(m.pol[i])} · 범죄 ${Math.round(m.crime[i])}`;
    if(c.flood) return `물에 잠긴 땅 · ${c.flood}달 뒤 물러난다`;
    if(c.burn) return '불타는 중! 소방서가 가까우면 금방 꺼진다';
    if(c.z>=0){ const z=this.zones[c.z]; const svc=[z.school?'학교':null,z.hosp?'병원':null,z.cult?'문화':null].filter(Boolean); return `${KIND_NAME[z.kind]} 구역 ${z.lv?z.lv+'단계':'빈 터'} · 전력 ${z.pow?'있음':'없음'} · 도로 ${z.road?'있음':'없음'}${svc.length?' · '+svc.join('·')+' 권역':''} · ${env}`; }
    if(c.b>=0){ const b=this.builds[c.b]; const p=PLANT[b.kind];
      if(p) return `${BUILD_NAME[b.kind]} · ${b.kind==='fusion'?'전력 무제한':`구역 ${Math.floor(p.cap*(b.worn?0.5:1))}곳까지 전력 공급`}${p.water&&this.floodedAt(b)?' · 물에 잠겨 멈춤':''} · ${Math.floor(b.age/12)}년째${b.worn?' · 낡음 · 보수 필요':''}`;
      if(b.kind==='cityhall') return `시청 ${this.hall?this.hall.lv:1}단계 · 세율 ${this.tax}% · 시청 도구를 누르면 메뉴`;
      if(LANDMARKS.includes(b.kind)) return `${BUILD_NAME[b.kind]} · 랜드마크 · ${b.kind==='tower'?'둘레 지가를 올린다':b.kind==='stadium'?'상업 수요를 올린다':b.kind==='airport'?'상업·공업 수요를 크게 올린다 · 오염':'공업 수요를 올린다'}`;
      return `${BUILD_NAME[b.kind]} · ${b.pow?`가동 중 · 반경 ${b.kind==='library'?'여섯':b.kind==='museum'||b.kind==='concert'?'열두':'열'} 칸`:'전력 없음'}`; }
    const name=c.t===T.WATER?'강':c.t===T.TREE?'숲':c.t===T.ROAD?(c.bridge?'다리':'도로'):c.t===T.PARK?'공원':c.t===T.RUBBLE?'잔해 · 철거해야 다시 쓸 수 있다':'빈 땅';
    return `${name}${c.wire?' · 전선':''} · ${env}`;
  }
  /* 저장·복원. v1(40×40 고정)도 읽는다 */
  snapshot(){
    return {v:2,fundsOpt:this.fundsOpt,funds:this.funds,events:this.events,disasters:this.disasters,month:this.month,title:this.title,fx:this.fx,monster:this.monster,tornado:this.tornado,yearIncome:this.yearIncome,yearExpense:this.yearExpense,lastYear:this.lastYear,
      W:this.W,H:this.H,ox:this.ox,oy:this.oy,tax:this.tax,hall:this.hall,land:this.land,totalTax:this.totalTax,ach:this.ach,satisfaction:this.satisfaction,cleanMonths:this.cleanMonths,lastDisaster:this.lastDisaster,
      grid:this.grid.map(row=>row.map(c=>[c.t,c.wire?1:0,c.bridge?1:0,c.burn,c.flood])),
      zones:this.zones.map(z=>z&&{kind:z.kind,x:z.x,y:z.y,lv:z.lv}), builds:this.builds.map(b=>b&&{kind:b.kind,x:b.x,y:b.y,s:b.s,age:b.age,worn:b.worn}), log:this.log.slice(-12)};
  }
  static restore(s){
    const c=new City({fundsOpt:s.fundsOpt,events:s.events,disasters:s.disasters});
    c.funds=s.funds; c.month=s.month; c.title=s.title; c.rank=Math.max(0,RANKS.indexOf(s.title)); c.fx=Object.assign(c.fx,s.fx||{}); c.monster=s.monster||null; c.tornado=s.tornado||null; c.yearIncome=s.yearIncome||0; c.yearExpense=s.yearExpense||0; c.lastYear=s.lastYear||null;
    c.tax=s.tax||10; c.hall=s.hall||null; c.land=s.land||{bought:0}; c.totalTax=s.totalTax||0; c.ach=s.ach||{}; c.satisfaction=s.satisfaction==null?50:s.satisfaction; c.cleanMonths=s.cleanMonths||0; c.lastDisaster=s.lastDisaster||0;
    const H=s.grid.length, W=s.grid[0].length; c.W=W; c.H=H; c.ox=s.ox==null?(WORLD-W)/2:s.ox; c.oy=s.oy==null?(WORLD-H)/2:s.oy;
    c.grid=[]; for(let y=0;y<H;y++){ const row=[]; for(let x=0;x<W;x++){ const [t,w,br,burn,flood]=s.grid[y][x]; const cell=newCell(); cell.t=t; cell.wire=!!w; cell.bridge=!!br; cell.burn=burn||0; cell.flood=flood||0; row.push(cell); } c.grid.push(row); }
    c.zones=s.zones.map(z=>z&&{kind:z.kind,x:z.x,y:z.y,lv:z.lv,pow:false,road:false,crime:0,pol:0,val:0,grow:-99});
    c.builds=s.builds.map(b=>b&&{kind:b.kind,x:b.x,y:b.y,s:b.s||sizeOf(b.kind),pow:false,age:b.age||0,worn:!!b.worn});
    c.zones.forEach((z,i)=>{ if(z) for(let dy=0;dy<3;dy++) for(let dx=0;dx<3;dx++) c.grid[z.y+dy][z.x+dx].z=i; });
    c.builds.forEach((b,i)=>{ if(b) for(let dy=0;dy<b.s;dy++) for(let dx=0;dx<b.s;dx++) c.grid[b.y+dy][b.x+dx].b=i; });
    if(!c.hall&&c.has('cityhall')) c.hall={lv:1,ord:{}};
    c.log=s.log||[]; c.msgs=[]; c.recompute();
    let pop=0; for(const z of c.zones) if(z&&BASE[z.kind]==='R') pop+=z.lv*POP_PER_LV[z.kind]*(z.hosp?1.1:1); c.pop=Math.round(pop);
    return c;
  }
}
/* 동현랭 규약: 정수 셋 = 자금 옵션(0 넉넉 · 1 보통 · 2 빠듯 · 3 아주 넉넉), 이벤트(0 끔 · 1 켬), 재해(0 끔 · 1 켬). 출력이 없으면 1 1 1. */
function parseSet(out){
  const tok=String(out||'').split(/\s+/).filter(Boolean).map(Number);
  if(!tok.length) return {fundsOpt:1,events:true,disasters:true,note:'출력이 없어 기본값(보통 200,000냥 · 이벤트 켬 · 재해 켬)으로 시작한다.'};
  if(tok.length!==3) return {err:`정수를 ${tok.length}개 출력했다. 자금 옵션, 이벤트, 재해 — 세 개를 차례로 출력하자.`};
  const [f,e,d]=tok;
  if(!Number.isInteger(f)||f<0||f>3) return {err:`자금 옵션 ${f}은 쓸 수 없다. 0(넉넉) · 1(보통) · 2(빠듯) · 3(아주 넉넉 1,000,000냥) 중 하나다.`};
  if(!Number.isInteger(e)||(e!==0&&e!==1)) return {err:`이벤트 ${e}은 쓸 수 없다. 0(끔) 또는 1(켬)이다.`};
  if(!Number.isInteger(d)||(d!==0&&d!==1)) return {err:`재해 ${d}은 쓸 수 없다. 0(끔) 또는 1(켬)이다.`};
  return {fundsOpt:f,events:e===1,disasters:d===1};
}
root.Sim={City,WORLD,START,STRIP,T,KINDS,BASE,KIND_NAME,BUILD_NAME,SIZE,sizeOf,PLANT,LANDMARKS,COST,UPKEEP,ORD,PLANT_ZONES,MAX_LV,FUNDS_OPTS,FUNDS_LABEL,TITLES,RANKS,LAND_BY_RANK,LAND_PRICE,SIDE_NAME,POP_PER_LV,JOBS,TAX,ACH,parseSet,makeMap,mulberry};
})(typeof window!=='undefined'?window:(typeof module!=='undefined'?module.exports:this));
