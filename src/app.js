/* 동현심: 동현랭으로 자금 옵션·이벤트·재해를 정하고, 강이 흐르는 40×40 평지(땅을 사면 60×60까지)에 마우스와 손가락만으로 작은 도시를 세운다. 키보드·게임패드는 판을 움직이지 않는다. */
(function(){
const $=s=>document.querySelector(s);
const {City,T,KINDS,BASE,KIND_NAME,BUILD_NAME,sizeOf,PLANT,COST,ORD,FUNDS_OPTS,FUNDS_LABEL,SIDE_NAME,ACH,LANDMARKS,parseSet}=window.Sim;

/* ---------- 화면 전환과 탭 ---------- */
$('#theme').onclick=()=>{const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';$('#theme').setAttribute('aria-pressed',String(dark));};
const SND=DHSFX('donghyunsim:sound');
function sndUI(){ const b=$('#sound'); b.setAttribute('aria-pressed',String(SND.on)); b.classList.toggle('muted',!SND.on); b.title=SND.on?'효과음 켬':'효과음 끔'; }
$('#sound').onclick=()=>{ SND.set(!SND.on); sndUI(); }; sndUI();
let tab='play';
function showTab(name){
  tab=name;
  document.querySelectorAll('.tabs button').forEach(b=>{const on=b.dataset.tab===name;b.classList.toggle('active',on);on?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current');});
  document.querySelectorAll('.tab-panel').forEach(p=>p.hidden=p.id!=='tab-'+name);
}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
$('.brand').onclick=e=>{e.preventDefault();showTab('play');scrollTo({top:0,behavior:'smooth'});};

/* ---------- 동현랭 편집기(동현랭 시리즈와 같은 모양) ---------- */
for(const ex of examples){const o=document.createElement('option');o.value=ex.id;o.textContent=ex.title;$('#example').append(o);}
const DH_TOKEN=/(ㅋㅋ.*$)|(나는 동현이냐\?|동현이구나)|(오겡끼데스까)|(신중동역|신중동|뭉치)|(뿡뿡뿡|뿡뿡|포동이)|(꽥꽥)|(동+현아)|(동+현)|(도오*옹)|(ㅠ+)|(뚱띠|또치)/g;
const DH_CLS=[null,'t-cmt','t-frame','t-halt','t-ctl','t-out','t-in','t-assign','t-var','t-num','t-minus','t-op'];
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function dhLine(line){let html='',last=0;line.replace(DH_TOKEN,(m,...gr)=>{const idx=gr[gr.length-2];html+=esc(line.slice(last,idx));const k=gr.slice(0,11).findIndex(x=>x!==undefined)+1;html+=`<span class="${DH_CLS[k]}">${esc(m)}</span>`;last=idx+m.length;return m;});return html+esc(line.slice(last));}
const code=$('#code'), area=document.createElement('div'), hl=document.createElement('div');
area.className='code-area'; hl.id='hl'; hl.setAttribute('aria-hidden','true'); code.parentNode.insertBefore(area,code); area.append(hl,code);
function hlSync(){hl.scrollTop=code.scrollTop;hl.scrollLeft=code.scrollLeft;}
function hlMetrics(){const cs=getComputedStyle(code);for(const p of ['paddingTop','paddingRight','paddingBottom','paddingLeft','fontFamily','fontSize','lineHeight','tabSize','letterSpacing'])hl.style[p]=cs[p];}
function highlight(){hlMetrics();hl.innerHTML=code.value.split('\n').map(l=>`<span class="ln">${dhLine(l)||' '}</span>`).join('')+'<span class="ln"> </span>';hlSync();}
code.addEventListener('scroll',()=>{hlSync();$('#lines').scrollTop=code.scrollTop;});addEventListener('resize',highlight);
function codeChanged(e){if(!e?.isComposing)indent();const n=code.value.split('\n').length;$('#line-count').textContent=n+'줄';$('#lines').textContent=Array.from({length:n},(_,i)=>i+1).join('\n');highlight();}
// 동현랭 시리즈 들여쓰기: ㅋㅋ 주석 세 칸, 명령 두 칸, '나는 동현이냐?'·'동현이구나'는 들여 쓰지 않는다
function indent(){
  const text=code.value,lines=text.split('\n'),lead=l=>l.length-l.replace(/^[ \t]+/,'').length;
  const next=lines.map(l=>{const b=l.slice(lead(l));if(!b)return '';if(b.startsWith('ㅋㅋ'))return '   '+b;const s=b.split('~')[0].replace(/ㅋㅋ.*$/,'').trim();return (s==='나는 동현이냐?'||s==='동현이구나'?'':'  ')+b;});
  const {selectionStart:a,selectionEnd:b,selectionDirection:dir,scrollTop:y,scrollLeft:x}=code;
  const moved=p=>{let o=0,n=0;for(let i=0;i<lines.length;i++){const L=lines[i].length;if(p<=o+L){const c=p-o,ol=lead(lines[i]),nl=lead(next[i]);return n+Math.min(next[i].length,c<ol?nl:c-ol+nl);}o+=L+1;n+=next[i].length+1;}return n;};
  const value=next.join('\n'),na=moved(a),nb=moved(b);if(value===text&&na===a&&nb===b)return;if(value!==text)code.value=value;code.setSelectionRange(na,nb,dir);code.scrollTop=y;code.scrollLeft=x;
}
code.addEventListener('compositionend',()=>codeChanged());
function codeLead(){const a=code.selectionStart,v=code.value,ls=v.lastIndexOf('\n',a-1)+1,le=v.indexOf('\n',ls);return {a,ls,lead:/^[ \t]*/.exec(v.slice(ls,le<0?v.length:le))[0].length};}
document.addEventListener('selectionchange',()=>{if(document.activeElement!==code||code.selectionStart!==code.selectionEnd)return;const {a,ls,lead}=codeLead();if(a-ls<lead)code.setSelectionRange(ls+lead,ls+lead);});
code.addEventListener('beforeinput',e=>{
  const {a,ls,lead}=codeLead();
  if(a!==code.selectionEnd)return;
  if(e.inputType==='deleteContentBackward'&&ls>0&&a>ls&&a-ls<=lead){e.preventDefault();code.setRangeText('',ls-1,a,'end');codeChanged();}
});
code.oninput=codeChanged;
code.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();start();}});
function selectExample(){const ex=examples.find(e=>e.id===$('#example').value);code.value=ex.code;$('#example-note').textContent=ex.note;codeChanged();}
$('#example').onchange=selectExample; selectExample();
$('#save').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([code.value+'\n'],{type:'text/plain;charset=utf-8'}));a.download='sim.dh';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
$('#open').onchange=async e=>{const f=e.target.files[0];if(!f)return;code.value=(await f.text()).replace(/\r/g,'').replace(/\n$/,'');codeChanged();e.target.value='';};
$('#run').onclick=()=>start();

/* ---------- 자금·이벤트·재해 규약 ---------- */
const FLAG=v=>v?'켬':'끔';
function setCard(s){
  $('#set-card').innerHTML=[['자금',FUNDS_LABEL[s.fundsOpt]],['이벤트',FLAG(s.events)],['재해',FLAG(s.disasters)]].map(([a,b])=>`<div><span>${a}</span><strong>${b}</strong></div>`).join('');
  $('#stamp-funds').innerHTML=`${FUNDS_OPTS[s.fundsOpt].toLocaleString()} <span>냥</span>`;$('#stamp-flags').innerHTML=`이벤트 ${FLAG(s.events)} <span>· 재해 ${FLAG(s.disasters)}</span>`;
}
const result=(t,kind)=>{const r=$('#result');r.textContent=t;r.dataset.kind=kind||'';};
const status=(t,kind)=>{const s=$('#status');s.textContent=t;s.dataset.kind=kind||'';};

/* ---------- 도구 ---------- */
const SVG_HAND='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12m0-7.5a1.5 1.5 0 0 1 3 0V12m0-6a1.5 1.5 0 0 1 3 0v9.5a6 6 0 0 1-6 6h-1.2a6 6 0 0 1-5-2.7L3 14.2a1.6 1.6 0 0 1 2.6-1.9L8 15"/></svg>';
const SVG_INFO='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M10.5 7.5v.01M10.5 10v4"/></svg>';
const GROUPS=[
  {name:'기본',tools:[{id:'pan',name:'이동',svg:SVG_HAND},{id:'info',name:'정보',svg:SVG_INFO},{id:'road',name:'도로',cost:COST.road,ico:'ico_road'},{id:'wire',name:'전선',cost:COST.wire,ico:'ico_wire'},{id:'park',name:'공원',cost:COST.park,ico:'ico_park'},{id:'bull',name:'철거',cost:COST.bull,ico:'ico_bull'},{id:'repair',name:'보수',ico:'ico_repair'},{id:'land',name:'땅 사기',ico:'ico_land'}]},
  {name:'구역',tools:KINDS.map(k=>({id:k,name:KIND_NAME[k],cost:COST[k],ico:'ico_'+k}))},
  {name:'발전소',tools:['power','hydro','wind','nuclear','solar','fusion'].map(k=>({id:k,name:BUILD_NAME[k].replace(' 발전소','').replace(' 발전기',''),cost:COST[k],ico:'ico_'+k}))},
  {name:'공공',tools:['police','fire','cityhall','school','hospital','library','museum','concert'].map(k=>({id:k,name:BUILD_NAME[k],cost:COST[k],ico:'ico_'+k}))},
  {name:'랜드마크',tools:LANDMARKS.map(k=>({id:k,name:BUILD_NAME[k],cost:COST[k],ico:'ico_'+k}))}];
const TOOLS=GROUPS.flatMap(gr=>gr.tools);
const BIG=[...KINDS,...Object.keys(BUILD_NAME)], PAINT=['road','wire','park','bull','repair'];
const toolOf=id=>TOOLS.find(t=>t.id===id);
let tool='road', group=0;
const toolsEl=$('#tools'), groupsEl=$('#toolgroups');
GROUPS.forEach((gr,i)=>{ const b=document.createElement('button'); b.type='button'; b.textContent=gr.name; b.dataset.group=i; b.addEventListener('click',()=>{ showGroup(i); SND.play('tick'); }); groupsEl.append(b); });
for(const t of TOOLS){
  const b=document.createElement('button'); b.type='button'; b.dataset.tool=t.id; b.dataset.group=GROUPS.findIndex(gr=>gr.tools.includes(t)); b.setAttribute('aria-label',t.name+(t.cost?` · ${t.cost.toLocaleString()}냥`:''));
  if(t.ico){ const ic=Tiles.make(t.ico,2); b.append(ic); } else b.insertAdjacentHTML('beforeend',t.svg);
  const nm=document.createElement('span'); nm.textContent=t.name; b.append(nm);
  const sm=document.createElement('small'); sm.textContent=t.cost?t.cost.toLocaleString()+'냥':'\u00a0'; b.append(sm);
  b.addEventListener('click',()=>{ const why=city&&city.locked(t.id); if(why&&t.id!=='cityhall'){ status(`${t.name} · ${why}`,'error'); SND.play('buzz'); return; } if(why&&t.id==='cityhall'&&city.hall){ setTool('cityhall'); hallMenu(); return; } setTool(t.id); SND.play('tick'); });
  toolsEl.append(b);
}
function showGroup(i){ group=i; groupsEl.querySelectorAll('button').forEach(b=>{ const on=+b.dataset.group===i; b.classList.toggle('on',on); b.setAttribute('aria-pressed',String(on)); }); toolsEl.querySelectorAll('button').forEach(b=>b.hidden=+b.dataset.group!==i); }
function setTool(id){ tool=id; toolsEl.querySelectorAll('button').forEach(b=>{ const on=b.dataset.tool===id; b.classList.toggle('on',on); b.setAttribute('aria-pressed',String(on)); });
  board.classList.toggle('pan',id==='pan'); board.classList.toggle('info',id==='info'); hideInfo();
  if(city&&!ready) status(toolHint(id)); }
function toolHint(id){ const t=toolOf(id); if(id==='pan') return '이동 · 판을 끌어 보는 자리를 옮긴다 · 두 손가락으로 늘리고 줄인다'; if(id==='info') return '정보 · 칸을 누르면 무엇인지 알려 준다';
  if(id==='repair') return '보수 · 낡은 건물을 누르면 원가의 30%로 새것이 된다'; if(id==='land'){ const o=city?city.landOffer():null; return o&&o.left>0?`땅 사기 · 한 줄(5칸) ${o.price.toLocaleString()}냥 · ${o.left}줄 더 살 수 있다 · 판을 누르면 방향을 고른다`:'땅 사기 · 칭호가 오르면 살 수 있는 줄이 늘어난다 · 판을 누르면 값을 본다'; }
  if(id==='cityhall'&&city&&city.hall) return '시청 · 판을 누르면 세율·조례·증축 메뉴가 열린다';
  if(BIG.includes(id)){ const n=sizeOf(id); return `${t.name} ${KINDS.includes(id)?'3×3':n+'×'+n} · ${t.cost.toLocaleString()}냥 · 누른 채 옮기다 떼면 놓인다`; } return `${t.name} · 한 칸 ${t.cost.toLocaleString()}냥 · 끌면 이어진다`; }
function refreshToolCost(){ if(!city) return; toolsEl.querySelectorAll('button').forEach(b=>{ const t=toolOf(b.dataset.tool); const why=city.locked(t.id); const sm=b.querySelector('small');
    if(t.id==='cityhall'&&city.hall){ b.classList.remove('locked','poor'); sm.textContent=`${city.hall.lv}단계 · 메뉴`; return; }
    if(t.id==='land'){ const o=city.landOffer(); b.classList.toggle('locked',o.left<=0); sm.textContent=o.left>0?`${o.price.toLocaleString()}냥`:(o.nextRank?o.nextRank+'부터':'다 샀다'); b.classList.toggle('poor',o.left>0&&city.funds<o.price); return; }
    b.classList.toggle('locked',!!why); if(why) sm.textContent=why.replace(/\(.*?\)/,'').replace(/부터$/,'부터'); else sm.textContent=t.cost?t.cost.toLocaleString()+'냥':'\u00a0';
    b.classList.toggle('poor',!why&&!!t.cost&&city.funds<t.cost); }); }

/* ---------- 상태 ---------- */
let city=null, settings={fundsOpt:1,events:true,disasters:true}, ready=true, speed=1, paused=false, pauseWhy='', view='base';
const SPEED_MS=[0,1000,500,220];
let acc=0, now=0;
/* ---------- 저장·불러오기: 동현전·동현워·동현몬과 같은 브라우저 칸 3개 + .dhsave 파일. 마우스·터치용 메뉴 ---------- */
const SAVE_FORMAT='donghyunsim-save', SAVE_VERSION=1, SLOT_KEY=n=>'donghyunsim:slot'+n, SLOTS=3;
let menu=null;
function snapshot(){ return {format:SAVE_FORMAT,version:SAVE_VERSION,savedAt:new Date().toISOString(),summary:{title:city.title,pop:city.pop,year:Math.floor(city.month/12)+1,funds:city.funds,date:city.dateText()},state:city.snapshot()}; }
function restore(data){
  if(!data||data.format!==SAVE_FORMAT) throw new Error('동현심 저장 파일이 아니다.');
  if(data.version!==SAVE_VERSION) throw new Error('지원하지 않는 저장 형식 버전이다('+data.version+').');
  const st=data.state; if(!st||(st.v!==1&&st.v!==2)||!st.grid||!Array.isArray(st.zones)) throw new Error('도시 정보가 맞지 않는다.'); // v1(v0.03 40×40)도 읽는다
  const c=City.restore(st);
  closeMenu(); city=c; settings={fundsOpt:city.fundsOpt,events:city.events,disasters:city.disasters}; setCard(settings);
  ready=false; acc=0; paused=false; pauseWhy=''; ghost=null; hideInfo(); $('#ready').hidden=true; newsEl.innerHTML=''; for(const m of (city.log||[]).slice(-4)) addNews(m,true);
  fitAll(); setSpeed(1,true); showGroup(group); renderHud(); layout(); draw(); fileRow(); status(`${city.title} · 인구 ${city.pop.toLocaleString()} · ${city.dateText()}부터 이어 한다`);
  result(`저장한 도시를 이어 한다 · ${FUNDS_LABEL[settings.fundsOpt]} · 이벤트 ${FLAG(settings.events)} · 재해 ${FLAG(settings.disasters)} (저장될 때의 설정)`); SND.play('good');
}
function readSlot(n){ try{ const t=localStorage.getItem(SLOT_KEY(n)); const d=t?JSON.parse(t):null; return d&&d.format===SAVE_FORMAT?d:null; }catch(e){ return null; } }
function slotNote(d){ if(!d) return '비어 있음'; const t=new Date(d.savedAt); const pad=v=>String(v).padStart(2,'0'); return `${d.summary.title} · ${d.summary.date} · ${t.getMonth()+1}/${t.getDate()} ${pad(t.getHours())}:${pad(t.getMinutes())}`; }
function slotSmall(d){ return `인구 ${Number(d.summary.pop).toLocaleString('ko-KR')} · ${Number(d.summary.funds).toLocaleString('ko-KR')}냥`; }
function toast(t,kind){ status(t,kind); addNews(t,true); }
function saveToSlot(n){ if(!city||ready) return false; try{ localStorage.setItem(SLOT_KEY(n),JSON.stringify(snapshot())); toast(`브라우저 칸 ${n}에 저장했다 · ${city.dateText()}`); SND.play('coin'); renderSlotList(); return true; } catch(e){ toast('브라우저 저장에 실패했다. 파일로 내려받아 저장하자.','error'); SND.play('buzz'); return false; } }
function deleteSlot(n){ try{ localStorage.removeItem(SLOT_KEY(n)); }catch(e){} renderSlotList(); }
function saveToFile(){ if(!city||ready) return false; const d=snapshot(), a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(d)],{type:'application/json'})); a.download=`donghyunsim-${city.title}-${d.summary.year}년차.dhsave`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); toast(`.dhsave 파일로 내려받았다 · ${city.title} · ${city.dateText()}`); SND.play('coin'); return true; }
function loadFrom(d){ try{ restore(d); return true; }catch(e){ const msg='불러오기 실패: '+e.message; if(city&&!ready) toast(msg,'error'); else { result(msg,'error'); status('불러오기 실패','error'); } SND.play('buzz'); return false; } }
async function loadFile(input){ const f=input.files[0]; input.value=''; if(!f) return false; let d=null; try{ d=JSON.parse(await f.text()); }catch(e){} return loadFrom(d); }
/* 메뉴: 판 가운데 떠서 누르는 것으로만 고른다. 열려 있는 동안 달은 멎는다 */
function openMenu(title,items,onCancel){ menu={title,items:items.map(it=>Array.isArray(it)?{label:it[0],fn:it[1]}:it),onCancel}; drawMenu(); }
function drawMenu(){ const m=$('#menu'); if(!menu){ m.hidden=true; return; } m.hidden=false; m.innerHTML=(menu.title?`<h4>${esc(menu.title)}</h4>`:'')+menu.items.map((it,i)=>`<div class="mi ${it.off?'off':''}" role="menuitem" data-i="${i}"><span>${esc(it.label)}</span>${it.note?`<small>${esc(it.note)}</small>`:''}</div>`).join(''); m.querySelectorAll('.mi').forEach(el=>el.onclick=()=>{ const it=menu.items[+el.dataset.i]; if(!it||it.off) return; closeMenu(); it.fn(); }); draw(); }
function closeMenu(){ menu=null; $('#menu').hidden=true; acc=0; draw(); }
function cancelMenu(){ const c=menu&&menu.onCancel; closeMenu(); if(c) c(); }
function confirmMenu(q,opts,back){ openMenu(q,opts.map(([label,fn])=>({label,fn})),back); }
function saveMenu(){ if(!city||ready) return; const items=[];
  for(let n=1;n<=SLOTS;n++){ const d=readSlot(n); items.push({label:`브라우저 칸 ${n}`,note:slotNote(d),fn:()=>{ if(d) confirmMenu(`칸 ${n}에 덮어쓸까?`,[['덮어쓴다',()=>saveToSlot(n)],['그만둔다',saveMenu]],saveMenu); else saveToSlot(n); }}); }
  items.push({label:'파일로 내려받기',note:'.dhsave',fn:saveToFile},{label:'칸 지우기',fn:deleteMenu},['돌아가기',()=>{}]);
  openMenu('저장',items); }
function deleteMenu(){ const items=[];
  for(let n=1;n<=SLOTS;n++){ const d=readSlot(n); items.push({label:`브라우저 칸 ${n}`,note:slotNote(d),off:!d,fn:()=>confirmMenu(`칸 ${n}${n===2?'를':'을'} 지울까? 되돌릴 수 없다.`,[['지운다',()=>{ deleteSlot(n); toast(`브라우저 칸 ${n}${n===2?'를':'을'} 지웠다.`); deleteMenu(); }],['그만둔다',deleteMenu]],deleteMenu)}); }
  items.push(['돌아가기',saveMenu]); openMenu('칸 지우기',items,saveMenu); }
function loadMenu(){ if(!city||ready) return; const items=[];
  for(let n=1;n<=SLOTS;n++){ const d=readSlot(n); items.push({label:`브라우저 칸 ${n}`,note:slotNote(d),off:!d,fn:()=>confirmMenu('지금 도시를 두고 불러올까? 저장하지 않은 달은 사라진다.',[['불러온다',()=>loadFrom(readSlot(n))],['그만둔다',loadMenu]],loadMenu)}); }
  items.push({label:'파일에서 불러오기',note:'.dhsave',fn:()=>$('#load-file').click()},['돌아가기',()=>{}]);
  openMenu('불러오기',items); }
function fileRow(){ const playing=!!city&&!ready; $('#city-save').disabled=!playing; $('#city-load').disabled=!playing; $('#load-box').hidden=playing; if(!playing) renderSlotList(); }
function renderSlotList(){
  const box=$('#slot-list'); if(!box) return; box.innerHTML='';
  for(let n=1;n<=SLOTS;n++){ const d=readSlot(n); const b=document.createElement('button'); b.className='slot-btn'; b.type='button'; b.disabled=!d;
    b.innerHTML=`<b>칸 ${n}</b><span>${esc(slotNote(d))}</span>${d?`<small>${esc(slotSmall(d))}</small>`:''}`;
    b.onclick=()=>loadFrom(readSlot(n));
    const row=document.createElement('div'); row.className='slot-row'; row.append(b);
    if(d){ const x=document.createElement('button'); x.className='slot-del'; x.type='button'; x.textContent='지우기'; x.setAttribute('aria-label',`칸 ${n} 지우기`);
      let t=0; x.onclick=()=>{ if(!x.classList.contains('armed')){ x.classList.add('armed'); x.textContent='정말 지운다'; t=setTimeout(()=>{ x.classList.remove('armed'); x.textContent='지우기'; },4000); return; }
        clearTimeout(t); deleteSlot(n); status(`브라우저 칸 ${n}${n===2?'를':'을'} 지웠다.`); };
      row.append(x); }
    box.append(row); }
}
$('#city-save').onclick=()=>saveMenu(); $('#city-load').onclick=()=>loadMenu();
$('#load-file').onchange=e=>loadFile(e.target); $('#load-file-setup').onchange=e=>loadFile(e.target);
$('#menu-back').addEventListener('click',e=>{ if(e.target===e.currentTarget) cancelMenu(); });

/* ---------- 땅 사기·시청 메뉴 ---------- */
function landMenu(){ if(!city||ready) return; const o=city.landOffer(); const items=[];
  for(const side of ['N','S','E','W']){ const off=!o.room[side]||o.left<=0||!city.canPay(o.price); items.push({label:`${SIDE_NAME[side]} 한 줄(5칸)`,note:!o.room[side]?'세계의 끝':o.left<=0?(o.nextRank?`${o.nextRank}이 되면`:'다 샀다'):`${o.price.toLocaleString()}냥${city.canPay(o.price)?'':' · 자금 부족'}`,off,fn:()=>{ const r=city.buyLand(side); if(!r.ok){ status(`땅 사기 · ${r.why}`,'error'); SND.play('buzz'); return; } cam.x+=r.dx; cam.y+=r.dy; fitAll(); handleMsgs(); renderHud(); layout(); status(`${SIDE_NAME[side]} 땅을 샀다 · 판 ${city.W}×${city.H} · −${r.cost.toLocaleString()}냥`); SND.play('big'); }}); }
  items.push(['돌아가기',()=>{}]);
  openMenu(`땅 사기 · 판 ${city.W}×${city.H} · ${o.left>0?`${o.left}줄 더 살 수 있다`:(o.nextRank?`${o.nextRank}이 되면 더 살 수 있다`:'더 살 땅이 없다')}`,items); }
function hallMenu(){ if(!city||ready||!city.hall) return; const h=city.hall, items=[];
  items.push({label:`세율 ${city.tax}%`,note:`판 위 세율 막대로 바꾼다 · 5~${city.taxMax()}%${h.lv<2?' · 2단계면 20%까지':''}`,off:true,fn:()=>{}});
  for(const id of Object.keys(ORD)){ const o=ORD[id], on=city.ord(id); items.push({label:`${on?'■':'□'} ${o.name}`,note:h.lv<o.lv?`시청 ${o.lv}단계부터`:`${o.note} · 달마다 ${o.cost}냥${on?' · 시행 중':''}`,off:h.lv<o.lv,fn:()=>{ const r=city.toggleOrd(id); if(r.ok){ handleMsgs(); renderHud(); SND.play('tick'); } else { status(r.why,'error'); SND.play('buzz'); } hallMenu(); }}); }
  if(h.lv<3){ const cost=h.lv===1?COST.hall2:COST.hall3; items.push({label:`증축 → ${h.lv+1}단계`,note:`${cost.toLocaleString()}냥 · ${h.lv===1?'세율 20%까지 · 조례 둘 더':'세수 10% 보너스'}${city.canPay(cost)?'':' · 자금 부족'}`,off:!city.canPay(cost),fn:()=>{ const r=city.upgradeHall(); if(r.ok){ handleMsgs(); renderHud(); SND.play('big'); } else { status(r.why,'error'); SND.play('buzz'); } }}); }
  else items.push({label:'시청 3단계',note:'세수 10% 보너스 · 더 증축할 수 없다',off:true,fn:()=>{}});
  items.push(['돌아가기',()=>{}]);
  openMenu(`시청 ${h.lv}단계 · 조례 ${Object.keys(ORD).filter(id=>city.ord(id)).length}개 시행`,items); }

/* ---------- 판·카메라 ---------- */
const board=$('#board'), g=board.getContext('2d'), stage=$('#stage'), mainEl=$('.sim-main');
let cssW=640, cssH=640, dpr=1;
const cam={x:0,y:0,zoom:1};
const TS=()=>16*cam.zoom;
const fitZoom=()=>Math.min(cssW,cssH)/(16*(city?Math.max(city.W,city.H):40));
function clampCam(){ const ts=TS(), vw=cssW/ts, vh=cssH/ts, W=city?city.W:40, H=city?city.H:40;
  cam.x=vw>=W?(W-vw)/2:Math.max(0,Math.min(W-vw,cam.x)); cam.y=vh>=H?(H-vh)/2:Math.max(0,Math.min(H-vh,cam.y)); }
function setZoom(z,px,py){ // px,py: 화면 기준점(CSS px). 그 아래 땅이 그대로 있게 한다
  const minZ=Math.min(fitZoom(),1), maxZ=4; z=Math.max(minZ,Math.min(maxZ,z)); if(px==null){ px=cssW/2; py=cssH/2; }
  const wx=cam.x+px/TS(), wy=cam.y+py/TS(); cam.zoom=z; cam.x=wx-px/TS(); cam.y=wy-py/TS(); clampCam(); }
function fitAll(){ cam.zoom=fitZoom(); cam.x=0; cam.y=0; clampCam(); }
function layout(){
  if(stage.classList.contains('fs')){ const w=mainEl.clientWidth, h=mainEl.clientHeight; board.style.width=w+'px'; board.style.height=h+'px'; }
  else { board.style.width=''; board.style.height=''; }
  const r=board.getBoundingClientRect(); if(r.width<10||r.height<10) return; const oldFit=fitZoom(); const wasFit=Math.abs(cam.zoom-oldFit)<1e-6;
  cssW=r.width; cssH=r.height; dpr=Math.min(window.devicePixelRatio||1,3);
  board.width=Math.round(cssW*dpr); board.height=Math.round(cssH*dpr);
  if(wasFit) cam.zoom=fitZoom(); clampCam(); draw(); }
new ResizeObserver(()=>layout()).observe(mainEl); addEventListener('orientationchange',()=>setTimeout(layout,80));

/* ---------- 그리기 ---------- */
const ROAD='#627273', CURB='#d4cfb9', DECK='#9d8b77', RAIL='#705e56', WIRE='#4a3a2a', POLE='#8d919c';
const ZONE_COL={R:'#4caf50',RH:'#2f8f4e',C:'#2f62c8',CD:'#5a3fb8',I:'#e0952a',IH:'#9a5a1e'}, ZONE_CH={R:'주',RH:'고',C:'상',CD:'백',I:'공',IH:'중'};
let ghost=null; // {x,y,big,ok} 또는 {x,y,big:false}
let pendingPaint=false; // 손가락으로 길·전선·공원·철거를 누른 뒤 아직 놓지 않은 상태
function spr(key){ const s=Math.max(1,Math.ceil(cam.zoom*dpr)); return Tiles.make(key,s); }
function face(key,s){ return Sprites.make(key,s); }
function faceCopy(key,s){ const src=Sprites.make(key,s), c=document.createElement('canvas'); c.width=src.width; c.height=src.height; c.getContext('2d').drawImage(src,0,0); return c; } // 소식마다 새 캔버스(같은 캔버스를 옮기지 않게)
function isRoad(x,y){ const c=city.cell(x,y); return !!c&&c.t===T.ROAD; }
function conducts(x,y){ const c=city.cell(x,y); return !!c&&(c.wire||c.t===T.ZONE||c.t===T.BUILD); }
function drawRoad(x,y,px,py,ts){ const c=city.cell(x,y); const L=isRoad(x-1,y),R=isRoad(x+1,y),U=isRoad(x,y-1),D=isRoad(x,y+1);
  if(c.bridge){ g.fillStyle=DECK; g.fillRect(px,py,ts,ts); g.fillStyle=RAIL; const r=Math.max(1,ts/8);
    if(L||R){ g.fillRect(px,py,ts,r); g.fillRect(px,py+ts-r,ts,r); } if(U||D){ g.fillRect(px,py,r,ts); g.fillRect(px+ts-r,py,r,ts); } if(!(L||R||U||D)){ g.fillRect(px,py,ts,r); g.fillRect(px,py+ts-r,ts,r); } return; }
  g.fillStyle=ROAD; g.fillRect(px,py,ts,ts); g.fillStyle=CURB; const k=Math.max(1,ts/9);
  if(!L) g.fillRect(px,py,k,ts); if(!R) g.fillRect(px+ts-k,py,k,ts); if(!U) g.fillRect(px,py,ts,k); if(!D) g.fillRect(px,py+ts-k,ts,k);
  g.fillStyle='#dab66d'; const d=Math.max(1,ts/10);
  if(L&&R&&!U&&!D){ g.fillRect(px+ts*0.1,py+ts/2-d/2,ts*0.3,d); g.fillRect(px+ts*0.6,py+ts/2-d/2,ts*0.3,d); }
  else if(U&&D&&!L&&!R){ g.fillRect(px+ts/2-d/2,py+ts*0.1,d,ts*0.3); g.fillRect(px+ts/2-d/2,py+ts*0.6,d,ts*0.3); } }
function drawWire(x,y,px,py,ts){ const c=city.cell(x,y); const n=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>conducts(x+dx,y+dy)); const lw=Math.max(1,ts/8), cx=px+ts/2, cy=py+ts/2;
  g.strokeStyle=WIRE; g.lineWidth=lw; g.beginPath(); if(!n.length){ g.moveTo(cx-ts*0.3,cy); g.lineTo(cx+ts*0.3,cy); } for(const [dx,dy] of n){ g.moveTo(cx,cy); g.lineTo(cx+dx*ts/2,cy+dy*ts/2); } g.stroke();
  g.fillStyle=c.t===T.WATER?'#e8e1d3':POLE; g.fillRect(cx-lw,cy-lw,lw*2,lw*2); }
function drawBolt(cx,cy,s){ g.fillStyle='#f2b705'; g.strokeStyle='#2e2a38'; g.lineWidth=Math.max(1,s/10); g.beginPath(); g.moveTo(cx+s*0.1,cy-s*0.5); g.lineTo(cx-s*0.3,cy+s*0.08); g.lineTo(cx,cy+s*0.08); g.lineTo(cx-s*0.1,cy+s*0.5); g.lineTo(cx+s*0.3,cy-s*0.08); g.lineTo(cx,cy-s*0.08); g.closePath(); g.fill(); g.stroke(); }
function drawNoRoad(cx,cy,s){ g.fillStyle='#e8e1d3'; g.strokeStyle='#2e2a38'; g.lineWidth=Math.max(1,s/10); g.beginPath(); g.arc(cx,cy,s*0.45,0,Math.PI*2); g.fill(); g.stroke(); g.fillStyle=ROAD; g.fillRect(cx-s*0.3,cy-s*0.12,s*0.6,s*0.24); g.fillStyle='#f2b705'; g.fillRect(cx-s*0.08,cy-s*0.03,s*0.16,s*0.06); }
// 건축 그림의 굴뚝 중심(48×48 원본 좌표). 규칙이 아닌 연기 표시 위치다.
const STACKS={I1:[[32,10]],I2:[[34,6]],I3:[[10,4],[35,8]],I4:[[11,3],[32,3]],I5:[[11,3],[32,3]],
  IH1:[[32,10]],IH2:[[34,6]],IH3:[[10,4],[35,8]],IH4:[[10,3],[21,3],[35,3]],IH5:[[10,3],[21,3],[35,3]],
  power:[[11,3],[32,2]],nuclear:[[10,8],[35,8]]};
function drawSmoke(key,px,py,ts,alpha,period){
  const sm=spr(Math.floor(now/600)%2?'smoke1':'smoke0'), unit=ts/16;
  g.globalAlpha=alpha;
  for(const [i,p] of (STACKS[key]||[]).entries()){
    const rise=((now/period+i*0.4)%1)*5;
    g.drawImage(sm,px+(p[0]-6)*unit,py+(p[1]-11-rise)*unit,12*unit,12*unit);
  }
  g.globalAlpha=1;
}
function draw(){
  if(!city){ g.setTransform(1,0,0,1,0,0); g.fillStyle='#5c9e45'; g.fillRect(0,0,board.width,board.height); return; }
  const W=city.W, H=city.H;
  g.setTransform(dpr,0,0,dpr,0,0); g.imageSmoothingEnabled=false; g.fillStyle='#1d2a1b'; g.fillRect(0,0,cssW,cssH);
  const ts=TS(), x0=Math.max(0,Math.floor(cam.x)), y0=Math.max(0,Math.floor(cam.y)), x1=Math.min(W-1,Math.ceil(cam.x+cssW/ts)), y1=Math.min(H-1,Math.ceil(cam.y+cssH/ts));
  const anim=Math.floor(now/600)%2, blink=Math.floor(now/500)%2===0;
  const shake=(city.fx.quake>0&&!paused&&!menu&&speed>0)?ts*0.25:0; const sx=shake?(Math.random()-0.5)*shake:0, sy=shake?(Math.random()-0.5)*shake:0;
  const px0=x=>(x-cam.x)*ts+sx, py0=y=>(y-cam.y)*ts+sy;
  g.save(); g.beginPath(); g.rect(px0(0),py0(0),W*ts,H*ts); g.clip();
  // 땅
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){ const c=city.grid[y][x], px=px0(x), py=py0(y);
    if(c.t===T.WATER){ g.drawImage(spr(((x+y+anim)%2)?'water1':'water0'),px,py,ts,ts);
      // 밝은 강둑 한 줄과 얕은 물: 강 모양·건설 가능한 칸은 바꾸지 않는다.
      const edge=(xx,yy)=>{const n=city.cell(xx,yy);return n&&n.t!==T.WATER&&!n.bridge;}, e=Math.max(1,ts/16);
      g.fillStyle='#96b9be';
      if(edge(x-1,y))g.fillRect(px,py,e,ts);if(edge(x+1,y))g.fillRect(px+ts-e,py,e,ts);
      if(edge(x,y-1))g.fillRect(px,py,ts,e);if(edge(x,y+1))g.fillRect(px,py+ts-e,ts,e);
    }
    else g.drawImage(spr(((x*7+y*13)%5===0)?'grass1':'grass0'),px,py,ts,ts);
    if(c.t===T.TREE) g.drawImage(spr('tree'),px,py,ts,ts); else if(c.t===T.PARK){ g.drawImage(spr('park'),px,py,ts,ts); if(ts>=12&&((x*5+y*3+Math.floor(now/700))%9===0)){ g.fillStyle='rgba(255,255,255,.85)'; g.fillRect(px+ts*0.6,py+ts*0.25,Math.max(1,ts/8),Math.max(1,ts/8)); } }
    else if(c.t===T.RUBBLE) g.drawImage(spr('rubble'),px,py,ts,ts);
    else if(c.t===T.ROAD) drawRoad(x,y,px,py,ts); }
  // 길의 차: 발달한 구역 옆 길 위를 작은 점이 흐른다
  if(ts>=10&&city.developed>0){ const t=now/900; for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){ const c=city.grid[y][x]; if(c.t!==T.ROAD) continue; const h=(x*31+y*17)%23; if(h>4) continue; const px=px0(x), py=py0(y), L=isRoad(x-1,y), R=isRoad(x+1,y), f=(t+h/5)%1, d=Math.max(2,ts/5);
      g.fillStyle=['#d6403a','#2f62c8','#f2b705','#f6ecd6','#2e2a38'][h]; if(L||R) g.fillRect(px+f*(ts-d),py+ts*0.62-d/2,d,d*0.8); else g.fillRect(px+ts*0.62-d/2,py+f*(ts-d),d*0.8,d); } }
  // 구역(3×3)·건물(s×s)
  const vis=(x,y,n)=>x+n-1>=x0&&x<=x1&&y+n-1>=y0&&y<=y1;
  const font=getComputedStyle(document.body).getPropertyValue('--body')||'sans-serif';
  for(const z of city.zones){ if(!z||!vis(z.x,z.y,3)) continue; const px=px0(z.x), py=py0(z.y), s3=ts*3;
    if(z.lv>0){ g.fillStyle='rgba(255,246,220,.28)'; g.fillRect(px,py,s3,s3); g.strokeStyle='rgba(46,42,56,.28)'; g.lineWidth=Math.max(1,ts/12); g.strokeRect(px+0.5,py+0.5,s3-1,s3-1); g.drawImage(spr(z.kind+z.lv),px,py,s3,s3);
      if(city.month-z.grow<2){ // 공사 중: 비계와 크레인 팔
        g.fillStyle='rgba(242,183,5,.22)'; g.fillRect(px,py,s3,s3); g.strokeStyle='#f2b705'; g.lineWidth=Math.max(1,ts/10); g.setLineDash([ts/3,ts/3]); g.strokeRect(px+ts*0.2,py+ts*0.2,s3-ts*0.4,s3-ts*0.4); g.setLineDash([]);
        g.strokeStyle='#2e2a38'; g.beginPath(); g.moveTo(px+s3*0.75,py+s3*0.95); g.lineTo(px+s3*0.75,py+ts*0.1); g.lineTo(px+s3*0.2+anim*ts*0.3,py+ts*0.1); g.stroke(); }
      if(BASE[z.kind]==='I'&&z.pow&&ts>=8) drawSmoke(z.kind+z.lv,px,py,ts,z.kind==='IH'?0.75:0.5,450); }
    else { g.fillStyle=ZONE_COL[z.kind]; g.globalAlpha=0.18; g.fillRect(px,py,s3,s3); g.globalAlpha=1; g.strokeStyle=ZONE_COL[z.kind]; g.lineWidth=Math.max(1,ts/6); g.setLineDash([ts/2,ts/3]); g.strokeRect(px+ts*0.15,py+ts*0.15,s3-ts*0.3,s3-ts*0.3); g.setLineDash([]);
      g.fillStyle='rgba(255,255,255,.85)'; g.font=`700 ${Math.max(8,ts*1.1)}px ${font}`; g.textAlign='center'; g.textBaseline='middle'; g.fillText(ZONE_CH[z.kind],px+s3/2,py+s3/2); } }
  for(const b of city.builds){ if(!b||!vis(b.x,b.y,b.s)) continue; const px=px0(b.x), py=py0(b.y), n=b.s, sn=ts*n; g.drawImage(spr(b.kind),px,py,sn,sn);
    if(b.kind==='power'&&b.pow!==false) drawSmoke('power',px,py,ts,0.7,400);
    if(b.kind==='nuclear') drawSmoke('nuclear',px,py,ts,0.4,700);
    if(b.kind==='wind'&&ts>=8){ const cx=px+ts/2, cy=py+ts*0.3, r=ts*0.42, a=now/300; g.strokeStyle='#f6ecd6'; g.lineWidth=Math.max(1,ts/9); g.beginPath(); for(let i=0;i<3;i++){ g.moveTo(cx,cy); g.lineTo(cx+Math.cos(a+i*2.094)*r,cy+Math.sin(a+i*2.094)*r); } g.stroke(); }
    if(b.worn&&blink){ const r=Math.max(5,ts*0.7); g.fillStyle='#f2b705'; g.strokeStyle='#2e2a38'; g.lineWidth=Math.max(1,ts/10); g.beginPath(); g.arc(px+sn-r*0.7,py+r*0.7,r*0.6,0,Math.PI*2); g.fill(); g.stroke(); g.fillStyle='#2e2a38'; g.font=`900 ${Math.round(r*0.9)}px ${font}`; g.textAlign='center'; g.textBaseline='middle'; g.fillText('!',px+sn-r*0.7,py+r*0.72); }
    if(b.kind==='cityhall'&&city.hall&&city.hall.lv>1&&ts>=8){ g.fillStyle='#f2b705'; g.font=`700 ${Math.round(ts*0.9)}px ${font}`; g.textAlign='center'; g.textBaseline='middle'; g.fillText('★'.repeat(city.hall.lv-1),px+sn/2,py+sn-ts*0.5); } }
  // 전선·불·물
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){ const c=city.grid[y][x], px=px0(x), py=py0(y);
    if(c.wire) drawWire(x,y,px,py,ts);
    if(c.flood){ g.globalAlpha=0.75; g.drawImage(spr(((x+y+anim)%2)?'water1':'water0'),px,py,ts,ts); g.globalAlpha=1; }
    if(c.burn) g.drawImage(spr(((x+y+anim)%2)?'fire1':'fire0'),px,py,ts,ts); }
  // 겹쳐 보기
  if(view!=='base') drawOverlay(x0,y0,x1,y1,ts,px0,py0);
  // 표식: 전기 없음·길 없음
  if(blink||view==='power') for(const z of city.zones){ if(!z||!vis(z.x,z.y,3)) continue; const cx=px0(z.x)+ts*1.5, cy=py0(z.y)+ts*1.5;
    if(!z.pow) drawBolt(cx-(z.road?0:ts*0.5),cy,ts); if(!z.road) drawNoRoad(cx+(z.pow?0:ts*0.5),cy,ts); }
  // 토네이도: 회전하는 깔때기
  if(city.tornado){ const t=city.tornado, cx=px0(t.x)+ts/2, cy=py0(t.y)+ts/2; for(let i=0;i<6;i++){ const r=ts*(0.35+i*0.3), a=now/120+i*0.9; g.strokeStyle=`rgba(200,200,210,${0.85-i*0.1})`; g.lineWidth=Math.max(2,ts/4); g.beginPath(); g.ellipse(cx+Math.cos(a)*ts*0.15,cy-i*ts*0.45,r,r*0.4,0,0,Math.PI*2); g.stroke(); } }
  // 괴수
  if(city.monster){ const m=city.monster, bob=Math.sin(now/180)*ts*0.15; const px=px0(m.x-1), py=py0(m.y-1);
    g.fillStyle='rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(px+ts*1.5,py+ts*2.9,ts*1.3,ts*0.4,0,0,Math.PI*2); g.fill();
    g.drawImage(face('lion',Math.max(2,Math.ceil(cam.zoom*dpr*3))),px,py-ts*0.4+bob,ts*3,ts*3);
    if(Math.floor(now/1600)%2===0&&ts>=8){ const bw=ts*2.4, bh=ts*1.1, bx=px+ts*2.6, by=py-ts*1.4+bob; g.fillStyle='#fff'; g.strokeStyle='#2e2a38'; g.lineWidth=Math.max(1,ts/10); g.beginPath(); g.roundRect?g.roundRect(bx,by,bw,bh,ts*0.3):g.rect(bx,by,bw,bh); g.fill(); g.stroke(); g.beginPath(); g.moveTo(bx+ts*0.2,by+bh); g.lineTo(bx-ts*0.2,by+bh+ts*0.4); g.lineTo(bx+ts*0.8,by+bh); g.fill(); g.fillStyle='#2e2a38'; g.font=`700 ${Math.round(ts*0.7)}px ${font}`; g.textAlign='center'; g.textBaseline='middle'; g.fillText('어흥!',bx+bw/2,by+bh/2); } }
  // 유령(놓을 자리)
  if(ghost){ const n=ghost.n||1, px=px0(ghost.x), py=py0(ghost.y); g.lineWidth=Math.max(2,ts/5); g.strokeStyle=ghost.ok?'rgba(63,174,82,.95)':'rgba(214,64,58,.95)'; g.fillStyle=ghost.ok?'rgba(63,174,82,.22)':'rgba(214,64,58,.22)';
    g.fillRect(px,py,ts*n,ts*n); g.strokeRect(px+1,py+1,ts*n-2,ts*n-2); }
  g.restore();
  if((paused||menu)&&!ready){ g.fillStyle='rgba(20,18,14,.55)'; g.fillRect(0,0,cssW,cssH); if(menu) return; g.fillStyle='#fff'; g.font=`700 ${Math.round(Math.min(cssW,cssH)/16)}px ${getComputedStyle(document.body).getPropertyValue('--display')||'sans-serif'}`; g.textAlign='center'; g.textBaseline='middle'; g.fillText(speed===0?'멈춤':'잠시 멎음',cssW/2,cssH/2-14); g.font=`500 13px ${font}`; g.fillText(pauseWhy||'▶ 단추를 누르면 달이 흐른다',cssW/2,cssH/2+18); }
}
function drawOverlay(x0,y0,x1,y1,ts,px0,py0){ const m=city.maps, W=city.W;
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){ const c=city.grid[y][x], i=y*W+x, px=px0(x), py=py0(y); let col=null;
    if(view==='power'){ if(c.t===T.ZONE){ col=city.zones[c.z].pow?'rgba(63,174,82,.5)':'rgba(214,64,58,.6)'; } else if(c.t===T.BUILD){ col=city.builds[c.b].pow?'rgba(63,174,82,.5)':'rgba(214,64,58,.6)'; } else if(c.wire) col='rgba(242,183,5,.55)'; else col='rgba(20,18,14,.35)'; }
    else if(view==='pol'){ const v=Math.min(1,m.pol[i]/50); col=v>0.04?`rgba(140,60,20,${v*0.75})`:null; }
    else if(view==='crime'){ const v=Math.min(1,m.crime[i]/40); col=v>0.04?`rgba(120,40,160,${v*0.75})`:null; }
    else if(view==='val'){ const v=Math.max(0,Math.min(1,(m.val[i]-6)/30)); col=`rgba(${Math.round(220-180*v)},${Math.round(60+140*v)},40,.5)`; }
    if(col){ g.fillStyle=col; g.fillRect(px,py,ts,ts); } } }
const VIEW_NAME={base:'기본',power:'전력',pol:'오염',crime:'범죄',val:'지가'};
document.querySelectorAll('.sim-view button').forEach(b=>b.addEventListener('click',()=>{ view=b.dataset.view; document.querySelectorAll('.sim-view button').forEach(x=>x.classList.toggle('on',x===b)); SND.play('tick');
  if(city&&!ready) status(view==='base'?toolHint(tool):`${VIEW_NAME[view]} 보기 · ${view==='power'?'초록 전기 있음 · 빨강 없음 · 노랑 전선':view==='pol'?'갈색이 짙을수록 오염':view==='crime'?'보라가 짙을수록 범죄':'초록이 짙을수록 지가가 높다'}`); }));

/* ---------- HUD·소식 ---------- */
function renderHud(){ if(!city) return;
  const f=$('#funds'); f.textContent=Math.round(city.funds).toLocaleString(); f.parentElement.classList.toggle('low',city.funds<500);
  $('#pop').textContent=city.pop.toLocaleString(); $('#title').textContent=city.title; $('#date').textContent=city.dateText();
  document.querySelectorAll('.sim-rci i').forEach(el=>{ const d=city.demand[el.dataset.k]||0; el.querySelector('b').style.setProperty('--h',Math.round(2+Math.min(1,Math.abs(d))*32)+'px'); el.classList.toggle('neg',d<0); el.title=`${el.dataset.k==='R'?'주거':el.dataset.k==='C'?'상업':'공업'} 수요 ${d>=0?'+':''}${d.toFixed(2)}`; });
  const sat=Math.round(city.satisfaction); const se=$('#sat'); se.textContent=sat; se.parentElement.classList.toggle('low',sat<40); se.parentElement.classList.toggle('high',sat>=75); se.parentElement.title=`주민 만족도 ${sat} · 경찰·소방·학교·병원·문화 권역이 올리고 오염·범죄·높은 세율이 내린다`;
  const tx=$('#tax'); tx.disabled=!city.hall; tx.max=city.taxMax(); if(document.activeElement!==tx) tx.value=city.tax; $('#tax-val').textContent=city.tax+'%'; $('#tax-chip').title=city.hall?`세율 ${city.tax}% · 5~${city.taxMax()}% · 10%보다 높으면 수요가 준다`:'세율은 시청이 선 뒤 바꿀 수 있다(10%)';
  const ae=$('#ach'); const html=ACH.map(a=>`<i class="${city.ach[a.id]!=null?'got':''}" title="${esc(a.name)} · ${esc(a.note)}${city.ach[a.id]!=null?` · ${Math.floor(city.ach[a.id]/12)+1}년차 달성`:''}">${ACH_ICON[a.id]}</i>`).join(''); if(ae.innerHTML!==html) ae.innerHTML=html;
  $('#size').textContent=`${city.W}×${city.H}`;
  refreshToolCost(); }
const ACH_ICON={capital:'👑',clean:'☀',safe:'🛡',happy:'☺',fusion:'⚛',landmarks:'🏛'};
$('#tax').addEventListener('input',e=>{ if(!city) return; const r=city.setTax(+e.target.value); if(r.ok){ $('#tax-val').textContent=city.tax+'%'; status(`세율 ${city.tax}% · ${city.tax>10?'수요가 조금 준다':city.tax<10?'수요가 조금 오른다':'기본'}`); } else { status(r.why,'error'); e.target.value=city.tax; } });
$('#tax').addEventListener('change',()=>{ SND.play('tick'); renderHud(); });
const newsEl=$('#news');
function addNews(m,quiet){ const li=document.createElement('li'); li.className='new '+(m.kind==='bad'?'bad':m.kind==='good'?'good':m.kind==='warn'?'warn':''); if(/결산|기부/.test(m.text)) li.classList.add('money');
  li.append(faceCopy(m.face||'podong',2)); const sp=document.createElement('span'); sp.textContent=m.text; li.append(sp); const tm=document.createElement('time'); tm.textContent=`${Math.floor(m.m/12)+1}년 ${m.m%12+1}월`; li.append(tm);
  newsEl.prepend(li); while(newsEl.children.length>4) newsEl.lastChild.remove();
  if(quiet) return; if(m.kind==='bad') SND.play(/라이언|넘쳤|지진|토네이도/.test(m.text)?'rumble':'alarm'); else if(m.kind==='good') SND.play(/기부|땅 한 줄/.test(m.text)?'coin':/업적/.test(m.text)?'big':'good'); else if(/결산/.test(m.text)) SND.play('coin'); else if(m.kind==='warn') SND.play('buzz'); }
function handleMsgs(quiet){ for(const m of city.takeMsgs()) addNews(m,quiet); }

/* ---------- 새 도시 ---------- */
function newCity(opts){
  city=new City({fundsOpt:settings.fundsOpt,events:settings.events,disasters:settings.disasters}); ready=!!(opts&&opts.ready); acc=0; paused=false; pauseWhy=''; ghost=null; hideInfo();
  newsEl.innerHTML=''; handleMsgs(true); fitAll(); setSpeed(1,true);
  $('#ready').hidden=!ready;
  if(ready){ $('#ready-note').textContent=`${FUNDS_LABEL[settings.fundsOpt]} · 이벤트 ${FLAG(settings.events)} · 재해 ${FLAG(settings.disasters)}`; }
  showGroup(group); renderHud(); layout(); draw(); fileRow();
  status(ready?`새 도시 시작을 누르면 ${FUNDS_LABEL[settings.fundsOpt]}으로 시작한다`:toolHint(tool));
}
function begin(){ if(!ready||!city) return; ready=false; $('#ready').hidden=true; acc=0; status(toolHint(tool)); SND.play('build'); fileRow(); }
$('#begin').onclick=()=>begin();

/* ---------- 속도·멎음 ---------- */
function setSpeed(n,quiet){ speed=n; document.querySelectorAll('.sim-speed button').forEach(b=>b.classList.toggle('on',+b.dataset.speed===n)); if(!quiet){ SND.play('tick'); if(city&&!ready) status(n===0?'멈춤 · ▶를 누르면 달이 흐른다':n===1?'보통 · 한 달에 1초':n===2?'빠름 · 한 달에 0.5초':'아주 빠름 · 한 달에 0.22초'); }}
document.querySelectorAll('.sim-speed button').forEach(b=>b.addEventListener('click',()=>setSpeed(+b.dataset.speed)));
function pause(why){ if(!paused){ paused=true; pauseWhy=why; } }
function unpause(){ if(paused){ paused=false; pauseWhy=''; acc=0; } }
document.addEventListener('visibilitychange',()=>{ if(document.hidden) pause('다른 탭을 보는 동안 달이 멎었다'); else unpause(); });

/* ---------- 달 흐름 ---------- */
function step(){ city.tick(); handleMsgs(); renderHud(); }
let last=0;
function loop(ts){ requestAnimationFrame(loop); now=ts; const dt=last?Math.min(100,ts-last):0; last=ts;
  if(city&&!ready&&!paused&&!menu&&speed>0){ acc+=dt; let n=0; while(acc>=SPEED_MS[speed]&&n<3){ acc-=SPEED_MS[speed]; step(); n++; } }
  draw(); }
requestAnimationFrame(loop);

/* ---------- 입력: 마우스·터치만 ---------- */
const pointers=new Map(); let mode=null, pinch=null, lastCell=null, deniedWhy='', hover=null;
function cellOf(ev){ const r=board.getBoundingClientRect(); const px=ev.clientX-r.left, py=ev.clientY-r.top; return {px,py,x:Math.floor(cam.x+px/TS()),y:Math.floor(cam.y+py/TS())}; }
function bigPos(c,n){ n=n||3; const o=Math.floor((n-1)/2); return {x:Math.max(0,Math.min(city.W-n,c.x-o)),y:Math.max(0,Math.min(city.H-n,c.y-o))}; }
function applyAt(x,y){ if(!city||ready) return null; let r;
  if(tool==='road') r=city.placeRoad(x,y); else if(tool==='wire') r=city.placeWire(x,y); else if(tool==='park') r=city.placePark(x,y); else if(tool==='bull') r=city.bulldoze(x,y); else if(tool==='repair') r=city.repair(x,y);
  else if(KINDS.includes(tool)) r=city.placeZone(tool,x,y); else if(BUILD_NAME[tool]) r=city.placeBuilding(tool,x,y); else return null;
  if(r.ok){ city.recompute(); handleMsgs(); renderHud(); const t=toolOf(tool); status(`${t.name} · −${r.cost.toLocaleString()}냥 · 자금 ${Math.round(city.funds).toLocaleString()}냥${tool==='cityhall'?' · 시청 단추를 다시 누르면 세율·조례 메뉴':''}`);
    SND.play(tool==='bull'?'crunch':tool==='repair'?'build':PAINT.includes(tool)?'road':(PLANT[tool]||LANDMARKS.includes(tool)||tool==='cityhall')?'big':'build'); deniedWhy=''; if(tool==='cityhall') refreshToolCost(); }
  else if(!/^이미|^빈 땅$|멀쩡/.test(r.why)){ if(deniedWhy!==r.why){ deniedWhy=r.why; status(`${toolOf(tool).name} · ${r.why}`,'error'); SND.play('buzz'); } }
  return r; }
function paintLine(a,b){ // 빠르게 끌어도 칸이 빠지지 않게 사이를 메운다
  let x=a.x,y=a.y; const dx=Math.abs(b.x-x), dy=Math.abs(b.y-y), sx=x<b.x?1:-1, sy=y<b.y?1:-1; let err=dx-dy;
  for(let i=0;i<200;i++){ if(x===b.x&&y===b.y) break; const e2=2*err; if(e2>-dy){ err-=dy; x+=sx; } if(e2<dx){ err+=dx; y+=sy; } if(city.inb(x,y)) applyAt(x,y); } }
function updateGhost(c){ if(BIG.includes(tool)&&!(tool==='cityhall'&&city.hall)){ const n=KINDS.includes(tool)?3:sizeOf(tool), p=bigPos(c,n); const water=(tool==='hydro'||tool==='harbor')?city.touchesWater(p.x,p.y,n):true; ghost={x:p.x,y:p.y,n,big:true,ok:!city.locked(tool)&&city.fits(p.x,p.y,n)&&water&&city.canPay(COST[tool])}; }
  else if(PAINT.includes(tool)&&city.inb(c.x,c.y)) ghost={x:c.x,y:c.y,n:1,big:false,ok:true}; else ghost=null; }
let infoTimer=0;
function showInfo(c){ if(!city) return; const t=city.describe(c.x,c.y); if(!t) return; const el=$('#info'); el.innerHTML=`<b>(${c.x}, ${c.y})</b> ${t}`; el.hidden=false; clearTimeout(infoTimer); infoTimer=setTimeout(hideInfo,5000); }
function hideInfo(){ const el=$('#info'); if(el) el.hidden=true; }
board.addEventListener('contextmenu',e=>e.preventDefault());
board.addEventListener('pointerdown',e=>{ if(!city||ready||menu) return; e.preventDefault(); board.setPointerCapture(e.pointerId); const c=cellOf(e); pointers.set(e.pointerId,{px:c.px,py:c.py});
  if(pointers.size===2){ // 두 손가락: 어떤 도구든 옮기기·늘리기
    const [a,b]=[...pointers.values()]; pinch={d:Math.hypot(a.px-b.px,a.py-b.py),mx:(a.px+b.px)/2,my:(a.py+b.py)/2,zoom:cam.zoom,cx:cam.x,cy:cam.y}; mode='pinch'; ghost=null; pendingPaint=false; return; }
  if(pointers.size>2) return;
  if(e.button===1||e.button===2||tool==='pan'){ mode='pan'; board.classList.add('panning'); lastCell=c; return; }
  if(tool==='info'){ mode='info'; lastCell=c; return; }
  if(tool==='land'){ mode='menu'; return; } if(tool==='cityhall'&&city.hall){ mode='menu'; return; }
  deniedWhy='';
  if(PAINT.includes(tool)){ mode='paint'; lastCell=c; pendingPaint=e.pointerType!=='mouse'; if(!pendingPaint) applyAt(c.x,c.y); updateGhost(c); return; } // 손가락은 떼거나 움직일 때 놓는다(두 번째 손가락이 오면 아무것도 놓지 않는다)
  if(BIG.includes(tool)){ mode='ghost'; updateGhost(c); return; } });
board.addEventListener('pointermove',e=>{ const c=cellOf(e);
  if(!pointers.has(e.pointerId)){ if(e.pointerType==='mouse'&&city&&!ready&&!mode){ hover=c; updateGhost(c); } return; }
  pointers.set(e.pointerId,{px:c.px,py:c.py});
  if(mode==='pinch'&&pinch&&pointers.size>=2){ const [a,b]=[...pointers.values()]; const d=Math.hypot(a.px-b.px,a.py-b.py), mx=(a.px+b.px)/2, my=(a.py+b.py)/2;
    const z=Math.max(Math.min(fitZoom(),1),Math.min(4,pinch.zoom*d/Math.max(1,pinch.d))); const wx=pinch.cx+pinch.mx/(16*pinch.zoom), wy=pinch.cy+pinch.my/(16*pinch.zoom);
    cam.zoom=z; cam.x=wx-mx/TS(); cam.y=wy-my/TS(); clampCam(); return; }
  if(mode==='pan'&&lastCell){ cam.x-=(c.px-lastCell.px)/TS(); cam.y-=(c.py-lastCell.py)/TS(); clampCam(); lastCell=c; return; }
  if(mode==='paint'){ if(lastCell&&(c.x!==lastCell.x||c.y!==lastCell.y)){ if(pendingPaint){ pendingPaint=false; applyAt(lastCell.x,lastCell.y); } paintLine(lastCell,c); lastCell=c; } updateGhost(c); return; }
  if(mode==='ghost'){ updateGhost(c); return; }
  if(mode==='info'){ lastCell=c; } });
function endPointer(e,cancel){ if(!pointers.has(e.pointerId)) return; const c=cellOf(e); pointers.delete(e.pointerId);
  if(mode==='pinch'){ if(pointers.size<2){ mode=pointers.size?'pan':null; pinch=null; if(mode==='pan'){ const p=[...pointers.values()][0]; lastCell={px:p.px,py:p.py}; } } return; }
  if(mode==='ghost'&&!cancel&&ghost){ applyAt(ghost.x,ghost.y); }
  if(mode==='paint'&&pendingPaint&&!cancel&&city.inb(c.x,c.y)){ applyAt(c.x,c.y); }
  if(mode==='menu'&&!cancel&&pointers.size===0){ if(tool==='land') landMenu(); else hallMenu(); SND.play('tick'); }
  pendingPaint=false;
  if(mode==='info'&&!cancel){ showInfo(c); SND.play('tick'); }
  board.classList.remove('panning'); mode=null; lastCell=null; if(e.pointerType!=='mouse') ghost=null; else updateGhost(c); }
board.addEventListener('pointerup',e=>endPointer(e,false)); board.addEventListener('pointercancel',e=>endPointer(e,true));
board.addEventListener('pointerleave',e=>{ if(!pointers.has(e.pointerId)) ghost=null; });
board.addEventListener('wheel',e=>{ if(!city||menu) return; e.preventDefault(); const c=cellOf(e); setZoom(cam.zoom*Math.pow(1.0015,-e.deltaY),c.px,c.py); },{passive:false});
$('#zoom-in').onclick=()=>{ setZoom(cam.zoom*1.5); SND.play('tick'); }; $('#zoom-out').onclick=()=>{ setZoom(cam.zoom/1.5); SND.play('tick'); }; $('#zoom-fit').onclick=()=>{ fitAll(); SND.play('tick'); };
$('#ready').addEventListener('click',e=>{ if(e.target===e.currentTarget) begin(); });

/* ---------- 전체 화면(동현몬과 같은 규칙) ---------- */
const fullEl=()=>document.fullscreenElement||document.webkitFullscreenElement;
const canNativeFull=!!((document.fullscreenEnabled||document.webkitFullscreenEnabled)&&(stage.requestFullscreen||stage.webkitRequestFullscreen));
const isPseudo=()=>stage.classList.contains('pseudo-full');
const isFull=()=>fullEl()===stage||isPseudo();
function setPseudo(on){ stage.classList.toggle('pseudo-full',on); document.documentElement.classList.toggle('pseudo-full-on',on); onFull(); }
function exitFull(){ if(isPseudo()) return setPseudo(false); if(fullEl()===stage) (document.exitFullscreen||document.webkitExitFullscreen||(()=>{})).call(document); }
function onFull(){ const on=isFull(); stage.classList.toggle('fs',on); $('#exit-full').hidden=!on; $('#full').setAttribute('aria-label',on?'전체 화면 닫기':'전체 화면'); $('#full').title=on?'전체 화면 닫기':'전체 화면';
  layout(); setTimeout(()=>{ layout(); if(on) fitAll(); },60); if(on) $('#full').blur(); }
document.addEventListener('fullscreenchange',onFull); document.addEventListener('webkitfullscreenchange',onFull);
$('#exit-full').onclick=exitFull;
$('#full').onclick=()=>{ if(isFull()) return exitFull(); if(!canNativeFull) return setPseudo(true);
  try{ const r=stage.requestFullscreen?stage.requestFullscreen():stage.webkitRequestFullscreen(); if(r&&r.catch) r.catch(()=>setPseudo(true)); }catch(e){ setPseudo(true); } };

/* ---------- 시작 ---------- */
function start(opts){
  let out;
  try{ out=Donghyun.run(code.value,{maxSteps:300000}).output; }
  catch(e){ result(`동현랭 오류${e.line?` (${e.line}줄)`:''}: ${e.message}`,'error'); status('동현랭 오류','error'); return false; }
  const p=parseSet(out);
  if(p.err){ result('동현심 규약 오류: '+p.err,'error'); status('규약 오류','error'); return false; }
  settings={fundsOpt:p.fundsOpt,events:p.events,disasters:p.disasters}; setCard(settings);
  const rdy=!!(opts&&opts.ready);
  result((p.note?p.note+' ':'')+(rdy?`${FUNDS_LABEL[settings.fundsOpt]} · 이벤트 ${FLAG(settings.events)} · 재해 ${FLAG(settings.disasters)}. 판의 단추를 누르면 시작한다.`:`${FUNDS_LABEL[settings.fundsOpt]} · 이벤트 ${FLAG(settings.events)} · 재해 ${FLAG(settings.disasters)}으로 새 도시를 시작했다. 발전소를 세우고 길을 깔아 보자.`));
  newCity({ready:rdy}); return true;
}
setTool('road'); start({ready:true});
window.__donghyunsim={get city(){return city;},get ready(){return ready;},get settings(){return settings;},get tool(){return tool;},setTool,get cam(){return cam;},setZoom,fitAll,get speed(){return speed;},setSpeed,get paused(){return paused;},
  begin,start,newCity,snapshot,restore,readSlot,saveToSlot,deleteSlot,saveToFile,loadFrom,saveMenu,loadMenu,landMenu,hallMenu,showGroup,get group(){return group;},closeMenu,get menu(){return menu;},parseSet,applyAt,step:(n=1)=>{ for(let i=0;i<n&&city&&!ready;i++) step(); draw(); },get view(){return view;},isFull,get ghost(){return ghost;},cellOf,draw};
})();
