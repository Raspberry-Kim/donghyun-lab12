/* 동현심 예제. 동현랭이 출력한 정수 셋이 차례로 자금 옵션(0 넉넉 · 1 보통 · 2 빠듯 · 3 아주 넉넉 100,000냥), 이벤트(0 끔 · 1 켬), 재해(0 끔 · 1 켬)다. 기본은 1 1 1. */
function expression(n){
  if(n===0)return '도옹ㅠ';
  if(n<0)return 'ㅠ '+expression(-n);
  if(n<=10)return '도'+'오'.repeat(n-1)+'옹';
  for(let a=10;a>=2;a--)if(n%a===0)return expression(a)+' '+expression(n/a);
  return '도'+'오'.repeat(n-1)+'옹';
}
const output=(...ns)=>ns.map(n=>'뿡뿡 '+expression(n)+'~뿡뿡뿡').join('~');
const wrap=a=>['나는 동현이냐?',...a,'동현이구나'].join('\n');
const FUNDS_WORD=['넉넉하게 50,000냥','보통 20,000냥','빠듯하게 10,000냥','아주 넉넉하게 100,000냥'];
const triple=(label,f,e,d)=>wrap(['ㅋㅋ '+label,'ㅋㅋ 자금 옵션 '+f+' · '+FUNDS_WORD[f],output(f),'ㅋㅋ 이벤트 '+(e?'켬':'끔'),output(e),'ㅋㅋ 재해 '+(d?'켬':'끔'),output(d)]);
const examples=[
 {id:'basic',title:'01 · 기본 모드 (보통 자금 · 이벤트 켬 · 재해 켬)',note:'동현심의 기본값이다. 20,000냥으로 시작하고, 포동이 시장의 축제 같은 이벤트도, 불·홍수·거대 라이언 같은 재해도 찾아온다. 세 정수가 모두 1이다.',code:triple('기본 모드 · 보통 자금 · 이벤트 켬 · 재해 켬',1,1,1)},
 {id:'rich',title:'02 · 자금 옵션 (넉넉하게 50,000냥)',note:'첫 정수를 0으로 바꾸면 50,000냥으로 넉넉하게 시작한다. 2로 바꾸면 10,000냥으로 빠듯하고, 3이면 100,000냥이다. 0은 도옹ㅠ로 쓴다.',code:triple('자금 옵션 · 넉넉하게',0,1,1)},
 {id:'noevent',title:'03 · 이벤트 끄기',note:'둘째 정수를 0으로 두면 축제·기부금·관광객·나무 심기 같은 이벤트가 오지 않는다. 조용히 도시만 키우고 싶을 때.',code:triple('이벤트 끄기',1,0,1)},
 {id:'nodisaster',title:'04 · 재해 끄기',note:'셋째 정수를 0으로 두면 불도, 홍수도, 거대 라이언도 오지 않는다. 처음 도시를 배울 때 좋다.',code:triple('재해 끄기',1,1,0)},
 {id:'rich100',title:'05 · 자금 옵션 (아주 넉넉하게 100,000냥)',note:'첫 정수를 3으로 두면 100,000냥으로 시작한다. 발전소를 여럿 세우고 넓게 펼쳐도 돈 걱정이 없다. 3은 도오오옹으로 쓴다.',code:triple('자금 옵션 · 아주 넉넉하게',3,1,1)},
 {id:'sandbox',title:'06 · 100,000냥 · 이벤트 끄기 · 재해 끄기',note:'3 0 0. 돈은 넉넉하고 이벤트도 재해도 없다. 아무 방해 없이 도시 모양만 그려 보는 모래 놀이판이다.',code:triple('모래 놀이판 · 100,000냥 · 이벤트 끔 · 재해 끔',3,0,0)}
];
if(typeof module!=='undefined')module.exports={examples,expression};
