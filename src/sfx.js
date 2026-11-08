/* 합성 효과음: 소리 파일 없이 Web Audio로 그 자리에서 만든다(동현주의 짧은 소리 묶음을 동현심에 맞게 추렸다).
   짓기·길 잇기·철거·돈·소식·재해·거절. 브라우저 규칙에 따라 첫 클릭·터치·키 입력 뒤에 소리 장치를 연다. */
var DHSFX=function(storeKey){
  'use strict';
  var AC=window.AudioContext||window.webkitAudioContext, ctx=null, master=null, noiseBuf=null;
  var on=true; try{ on=localStorage.getItem(storeKey)!=='off'; }catch(e){}
  function unlock(){
    if(!AC) return;
    if(!ctx){ try{ ctx=new AC(); }catch(e){ return; }
      master=ctx.createGain(); master.gain.value=0.3;
      var comp=ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
      var n=ctx.sampleRate, b=ctx.createBuffer(1,n,n), d=b.getChannelData(0);
      for(var i=0;i<n;i++) d[i]=Math.random()*2-1; noiseBuf=b; }
    if(ctx.state!=='running'){
      try{ var r=ctx.resume(); if(r&&r.catch) r.catch(function(){}); }catch(e){}
      /* 옛 iOS Safari: 손짓 안에서 빈 소리를 한 번 틀어야 소리 장치가 열린다 */
      try{ var sb=ctx.createBufferSource(); sb.buffer=ctx.createBuffer(1,1,22050); sb.connect(ctx.destination); sb.start(0); }catch(e){}
    }
  }
  /* 휴대폰은 손가락을 뗄 때(touchend·click)만 소리를 허락하므로 그 이벤트도 함께 듣는다 */
  ['touchend','click','pointerup','mousedown','keydown','touchstart','pointerdown'].forEach(function(ev){ document.addEventListener(ev,unlock,{capture:true,passive:true}); });
  function ready(){ return on&&ctx&&ctx.state!=='closed'; }
  function env(g,t,a,peak,dec){ g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(peak,t+a); g.gain.exponentialRampToValueAtTime(0.0001,t+a+dec); }
  function noise(t,dur,type,freq,q,peak,a){
    var s=ctx.createBufferSource(); s.buffer=noiseBuf; s.loop=true;
    var f=ctx.createBiquadFilter(); f.type=type; f.frequency.setValueAtTime(freq,t); if(q) f.Q.value=q;
    var g=ctx.createGain(); env(g,t,a||0.005,peak,dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t,Math.random()*0.5); s.stop(t+(a||0.005)+dur+0.05); return f;
  }
  function tone(t,type,freq,dur,peak,a){
    var o=ctx.createOscillator(); o.type=type; o.frequency.setValueAtTime(freq,t);
    var g=ctx.createGain(); env(g,t,a||0.01,peak,dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t+(a||0.01)+dur+0.05); return o;
  }
  var S={
    bell:function(t,f,dur,peak){ tone(t,'sine',f,dur,peak,0.005); tone(t,'sine',f*2,dur*0.5,peak*0.3,0.005); tone(t,'sine',f*3.01,dur*0.25,peak*0.12,0.005); },
    tick:function(t){ tone(t,'triangle',880,0.05,0.22,0.003); },                                                                   // 도구 고르기
    road:function(t){ var f=noise(t,0.07,'bandpass',700,2,0.25,0.005); f.frequency.linearRampToValueAtTime(1100,t+0.07); },          // 길·전선 한 칸
    build:function(t){ var o=tone(t,'sine',440,0.12,0.4,0.004); o.frequency.exponentialRampToValueAtTime(660,t+0.1); noise(t,0.08,'lowpass',900,0,0.2,0.01); },  // 구역·건물
    big:function(t){ S.bell(t,392,0.3,0.35); S.bell(t+0.12,523.25,0.4,0.35); noise(t,0.2,'lowpass',500,0,0.3,0.02); },               // 큰 건물
    crunch:function(t){ var f=noise(t,0.18,'lowpass',600,0,0.45,0.005); f.frequency.linearRampToValueAtTime(150,t+0.18); },          // 철거
    coin:function(t){ S.bell(t,1318.5,0.2,0.25); S.bell(t+0.08,1760,0.3,0.25); },                                                    // 돈·결산
    news:function(t){ S.bell(t,784,0.25,0.25); S.bell(t+0.1,1046.5,0.35,0.25); },                                                    // 소식
    good:function(t){ [659.25,783.99,1046.5].forEach(function(f,i){ S.bell(t+i*0.09,f,0.35,0.3); }); },                             // 좋은 이벤트·칭호
    alarm:function(t){ for(var i=0;i<3;i++){ tone(t+i*0.22,'triangle',330,0.12,0.22); tone(t+i*0.22+0.11,'triangle',262,0.1,0.2); } }, // 재해
    rumble:function(t){ var f=noise(t,0.9,'lowpass',180,0,0.5,0.05); f.frequency.linearRampToValueAtTime(60,t+0.9); },               // 괴수·홍수
    buzz:function(t){ var o=tone(t,'square',140,0.16,0.12,0.005); o.frequency.linearRampToValueAtTime(110,t+0.16); }                 // 안 됨
  };
  return {
    get on(){ return on; },
    set:function(v){ on=!!v; try{ localStorage.setItem(storeKey,on?'on':'off'); }catch(e){} if(on) unlock(); },
    play:function(k,arg){ if(!ready()||!S[k]) return; S[k](ctx.currentTime+0.01,arg); }
  };
};
