# 동현심 그림: 땅·물·숲·공원·잔해 16×16, 구역 건물(주거·상업·공업 1~5단계)과 발전소·경찰서·소방서 48×48, 도구 아이콘 16×16을
# 글자 격자로 그려 src/tiles.js에 쓴다. 동현주·동현몬과 같은 팔레트 글자, 같은 윤곽색(K). 원작 게임의 그림은 한 점도 쓰지 않는다.
# 사용: python3 tools/tiles.py            → src/tiles.js
#       python3 tools/tiles.py preview    → /tmp/sim_tiles.png
import json, sys
PAL={'.':None,'K':'#2e2a38','E':'#ffffff','W':'#f6ecd6','G':'#c9aa78','R':'#d6403a','M':'#e5483a','d':'#9a2620',
     'B':'#3b63b5','b':'#24417a','I':'#8d919c','i':'#c7c9d1','h':'#6b4a2e','c':'#8c7a63','a':'#9a978c','A':'#5d5b53',
     's':'#efc7a6','S':'#d9a785','p':'#f0a3a3','P':'#d97b86','w':'#f6f2e8','Y':'#f2b705','g':'#6fb04a','5':'#3f8a3a','6':'#8cc55e',
     'C':'#2bb0c8','8':'#b5dcf2','7':'#5fa8e0','n':'#3f7fc0','e':'#49392f','L':'#ff9f86','O':'#d98a3c','k':'#231d18','t':'#7a4a22','x':'#4a4a52'}
def blank(w=16,h=16): return [['.']*w for _ in range(h)]
def put(g,x,y,c):
    if 0<=y<len(g) and 0<=x<len(g[0]): g[y][x]=c
def rect(g,x,y,w,h,c):
    for yy in range(y,y+h):
        for xx in range(x,x+w): put(g,xx,yy,c)
def blob(g,rows,x0,y0):
    for dy,r in enumerate(rows):
        for dx,ch in enumerate(r):
            if ch!=' ': put(g,x0+dx,y0+dy,ch)
def disc(g,cx,cy,r,c):
    for y in range(len(g)):
        for x in range(len(g[0])):
            if (x-cx+0.5)**2+(y-cy+0.5)**2<=r*r: g[y][x]=c
def outline(g,c='K'):
    h=len(g); w=len(g[0]); o=[r[:] for r in g]
    for y in range(h):
        for x in range(w):
            if g[y][x]=='.':
                for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    xx,yy=x+dx,y+dy
                    if 0<=xx<w and 0<=yy<h and g[yy][xx]!='.': o[y][x]=c; break
    return o
def ground(g,seed=0):
    """빈 칸을 잔디로 채운다. 점무늬는 자리로 정해져 늘 같다."""
    h=len(g); w=len(g[0])
    for y in range(h):
        for x in range(w):
            if g[y][x]=='.':
                v=(x*7+y*13+seed*5)%17
                g[y][x]='5' if v==0 else ('6' if v==9 else 'g')
    return g
def S(g): return [''.join(r) for r in g]
SPR={}
def add(k,g): SPR[k]=S(g)

# ---------- 땅 16×16 ----------
g=blank(); ground(g,0); add('grass0',g)
g=blank(); ground(g,3); add('grass1',g)
for f in (0,1):                                                     # 물 두 장(잔물결이 움직인다)
    g=blank(); rect(g,0,0,16,16,'7')
    for y in range(16):
        for x in range(16):
            if (x+y*3+f*4)%11==0: put(g,x,y,'8')
            if (x*3+y+f*6)%13==0: put(g,x,y,'n')
    add('water%d'%f,g)
g=blank(); disc(g,8,7,5,'5'); disc(g,7,6,3.2,'g'); put(g,6,5,'6'); rect(g,7,11,2,3,'t'); g=outline(g); ground(g,1); add('tree',g)
g=blank(); disc(g,5,6,3,'5'); put(g,4,5,'6'); rect(g,5,8,1,2,'t'); rect(g,9,10,5,1,'h'); rect(g,9,11,1,2,'t'); rect(g,13,11,1,2,'t')   # 공원: 나무·벤치·꽃
for x,y in ((11,4),(13,6),(10,7)): put(g,x,y,'p')
g=outline(g); ground(g,2); add('park',g)
g=blank(); blob(g,['aA','AA'],2,9); blob(g,['AAa','aAA'],7,6); blob(g,['A','AA'],11,10); blob(g,['aA'],4,4); blob(g,['Kx'],9,12); g=outline(g); ground(g,4); add('rubble',g)
for f in (0,1):                                                     # 불꽃 두 장(배경 없음)
    g=blank(); blob(g,['  O  ','  OO ',' OYO ','OYYYO','OYEYO',' OYO '],5+f,7-f*2); blob(g,[' O ','OYO'],2-f,10); blob(g,['O','OY'],12+f,9)
    add('fire%d'%f,g)
for f in (0,1):                                                     # 연기 두 장
    g=blank(8,8); disc(g,3+f,4-f,2.4,'i'); disc(g,5-f,2+f,1.6,'a'); add('smoke%d'%f,g)

# ---------- 건물 조각 ----------
def house(g,x,y,w,h,wall,roof,win='7',door='h',pitch=True):
    """작은 집: 지붕(뾰족 또는 평평)·벽·창·문. 폭 w, 높이 h(지붕 포함)."""
    rh=min(4,w//3) if pitch else 2
    if pitch:
        for i in range(rh):
            ins=rh-1-i; rect(g,x+ins,y+i,w-2*ins,1,roof)
    else:
        rect(g,x,y,w,rh,roof); rect(g,x+1,y+1,w-2,1,'K' if roof!='K' else 'A')
    rect(g,x,y+rh,w,h-rh,wall)
    rect(g,x,y+rh,w,1,'K' if roof!='K' else 'A') if not pitch else None
    # 창
    wy=y+rh+1
    for wx in range(x+1,x+w-2,3):
        if wx+1<x+w-1: rect(g,wx,wy,2,2,win)
    # 문
    dx=x+w//2-1; rect(g,dx,y+h-3,2,3,door)
def tower(g,x,y,w,h,wall,roof,win,lit='Y',sign=None):
    """높은 건물: 평평한 지붕, 층마다 창. sign은 지붕 위 간판 글자색."""
    rect(g,x,y,w,2,roof); rect(g,x,y+2,w,h-2,wall)
    for fy in range(y+3,y+h-3,3):
        for fx in range(x+1,x+w-1,3):
            if fx+1<x+w-1: rect(g,fx,fy,2,2,lit if (fx*5+fy*3)%7==0 else win)
    rect(g,x+w//2-1,y+h-3,2,3,'K')
    if sign: rect(g,x+2,y-2,w-4,2,sign); rect(g,x+3,y-1,w-6,1,'E')
def chimney(g,x,y,w,h,col='a'):
    rect(g,x,y,w,h,col); rect(g,x,y,w,1,'K'); rect(g,x,y+2,w,1,'R')

# ---------- 구역 건물 48×48 ----------
STY={'R':dict(wall='W',roof='R',win='7',big='w',bigroof='M',lit='Y',pitch=True),
     'C':dict(wall='i',roof='B',win='7',big='i',bigroof='b',lit='Y',pitch=False),
     'I':dict(wall='a',roof='c',win='Y',big='I',bigroof='A',lit='Y',pitch=False)}
def zone(kind,lv):
    s=STY[kind]; g=blank(48,48)
    if lv==1:
        house(g,18,16,12,12,s['wall'],s['roof'],s['win'],pitch=s['pitch'])
        if kind=='I': chimney(g,26,10,3,7)
    elif lv==2:
        house(g,3,5,12,11,s['wall'],s['roof'],s['win'],pitch=s['pitch']); house(g,31,6,13,11,s['wall'],s['roof'],s['win'],pitch=s['pitch']); house(g,16,27,14,12,s['wall'],s['roof'],s['win'],pitch=s['pitch'])
        if kind=='I': chimney(g,10,0,3,6); chimney(g,24,21,3,7)
    elif lv==3:
        tower(g,3,8,18,22,s['wall'],s['roof'],s['win'],s['lit'],sign=('Y' if kind=='C' else None))
        house(g,27,10,16,13,s['wall'],s['roof'],s['win'],pitch=s['pitch']); house(g,26,30,14,12,s['wall'],s['roof'],s['win'],pitch=s['pitch'])
        if kind=='I': chimney(g,6,1,4,8); chimney(g,33,3,3,8)
    elif lv==4:
        tower(g,2,4,24,30,s['big'],s['bigroof'],s['win'],s['lit'],sign=('Y' if kind=='C' else None))
        tower(g,30,14,15,24,s['wall'],s['roof'],s['win'],s['lit']); house(g,30,40,14,7,s['wall'],s['roof'],s['win'],pitch=False)
        if kind=='I': chimney(g,6,-2,4,7); chimney(g,16,-2,4,7); chimney(g,35,8,3,7)
    else:
        tower(g,8,2,30,42,s['big'],s['bigroof'],s['win'],s['lit'],sign=('Y' if kind=='C' else None))
        tower(g,1,22,10,24,s['wall'],s['roof'],s['win'],s['lit']); tower(g,39,26,8,20,s['wall'],s['roof'],s['win'],s['lit'])
        if kind=='I': chimney(g,12,-4,5,7); chimney(g,24,-4,5,7); chimney(g,32,-4,4,7)
        if kind=='R': rect(g,8,0,30,1,'K'); rect(g,22,0,2,2,'R')   # 옥상 안테나
    g=outline(g); ground(g,lv)
    # 길: 아래쪽 가운데로 통하는 포장길
    for y in range(44,48):
        for x in range(22,26):
            if g[y][x] in 'g56': g[y][x]='G'
    return g
for k in 'RCI':
    for lv in range(1,6): add('%s%d'%(k,lv),zone(k,lv))

# ---------- 발전소·경찰서·소방서 48×48 ----------
g=blank(48,48)
rect(g,4,22,40,20,'A'); rect(g,4,22,40,2,'K'); rect(g,6,40,36,1,'x')
for x in range(8,42,6): rect(g,x,27,3,3,'Y'); rect(g,x,33,3,3,'Y')
for i in range(0,40,4): put(g,4+i,24,'Y'); put(g,5+i,24,'Y')                       # 위험 줄무늬
chimney(g,10,4,6,18); chimney(g,30,2,6,20); rect(g,10,9,6,1,'R'); rect(g,30,8,6,1,'R')
rect(g,20,30,8,10,'K'); rect(g,22,32,4,6,'7')                                       # 큰 문
g=outline(g); ground(g,7); add('power',g)

g=blank(48,48)
rect(g,4,12,40,30,'E'); rect(g,4,10,40,4,'B'); rect(g,4,10,40,1,'b'); rect(g,16,4,16,7,'B'); rect(g,16,4,16,1,'b')
rect(g,22,1,4,3,'R'); rect(g,23,0,2,1,'7')                                          # 경광등
for x in (8,14,28,34): rect(g,x,18,4,4,'7'); rect(g,x,27,4,4,'7')
rect(g,20,30,8,12,'b'); rect(g,23,34,2,2,'Y')                                       # 문·손잡이
blob(g,[' Y ','YYY',' Y '],22,19)                                                   # 배지
g=outline(g); ground(g,8); add('police',g)

g=blank(48,48)
rect(g,4,14,40,28,'W'); rect(g,2,8,44,7,'R'); rect(g,2,8,44,1,'d'); rect(g,20,2,8,7,'R'); rect(g,22,0,4,2,'K')     # 망루
rect(g,8,22,12,20,'A'); rect(g,28,22,12,20,'A')                                     # 차고 문 둘
for y in range(24,42,3): rect(g,9,y,10,1,'a'); rect(g,29,y,10,1,'a')
rect(g,22,24,4,4,'7'); rect(g,22,34,4,8,'h')
g=outline(g); ground(g,9); add('fire',g)

# ---------- 도구 아이콘 16×16(배경 없음) ----------
g=blank(); house(g,2,3,12,11,'W','R','7'); g=outline(g); add('ico_R',g)
g=blank(); tower(g,2,3,12,11,'i','B','7','Y'); g=outline(g); add('ico_C',g)
g=blank(); rect(g,2,8,12,6,'a'); rect(g,2,8,12,1,'K'); chimney(g,4,2,3,7); rect(g,9,10,2,2,'Y'); g=outline(g); add('ico_I',g)
g=blank(); rect(g,2,8,12,6,'A'); chimney(g,4,1,3,8); chimney(g,9,3,3,6); rect(g,4,10,2,2,'Y'); rect(g,10,10,2,2,'Y'); g=outline(g); add('ico_power',g)
g=blank(); rect(g,2,6,12,8,'E'); rect(g,2,5,12,2,'B'); rect(g,6,2,4,3,'B'); put(g,7,1,'R'); put(g,8,1,'R'); rect(g,7,10,2,4,'b'); g=outline(g); add('ico_police',g)
g=blank(); rect(g,2,6,12,8,'W'); rect(g,1,4,14,2,'R'); rect(g,3,8,4,6,'A'); rect(g,9,8,4,6,'A'); g=outline(g); add('ico_fire',g)
g=blank(); blob(g,['  KK  ',' KKKK ','KKKKKK','KKKKKK',' KKKK '],1,2); blob(g,['YYYYYYY','YYYYYYY'],4,8); rect(g,2,10,12,3,'Y'); rect(g,2,13,12,1,'K'); blob(g,['K K K K K K'],2,14); rect(g,5,6,2,2,'A'); g=outline(g)  # 불도저
add('ico_bull',g)
g=blank(); rect(g,2,0,12,16,'A'); rect(g,0,0,2,16,'i'); rect(g,14,0,2,16,'i')
for y in range(1,16,4): rect(g,7,y,2,2,'W')
add('ico_road',g)
g=blank(); rect(g,7,2,2,13,'t'); rect(g,3,4,10,1,'t'); rect(g,4,5,1,1,'K'); rect(g,11,5,1,1,'K'); rect(g,3,3,1,1,'K'); rect(g,12,3,1,1,'K')   # 전봇대
blob(g,['K   K'],1,6); blob(g,['K             K'],0,5)
add('ico_wire',g)
add('ico_park',SPR['park'])

def write_js(path='src/tiles.js'):
    body=['/* 동현심 그림: tools/tiles.py가 글자 격자로 새로 그린 것이다. 원작 게임의 그림은 한 점도 쓰지 않는다. */','(function(root){',"'use strict';",
          'const PAL='+json.dumps(PAL,ensure_ascii=False)+';','const SPR={']
    for k,rows in SPR.items(): body.append('%s:`\n%s`,'%(json.dumps(k),'\n'.join(rows)))
    body+=['};','const cache={};',
           'function make(key,scale){ scale=scale||1; const id=key+"@"+scale; if(cache[id]) return cache[id];',
           '  const rs=SPR[key].trim().split("\\n"), h=rs.length, w=rs[0].length; const c=document.createElement("canvas"); c.width=w*scale; c.height=h*scale; const g=c.getContext("2d");',
           '  for(let y=0;y<h;y++) for(let x=0;x<rs[y].length;x++){ const col=PAL[rs[y][x]]; if(!col) continue; g.fillStyle=col; g.fillRect(x*scale,y*scale,scale,scale); } cache[id]=c; return c; }',
           'root.Tiles={make,PAL,SPR};',
           "})(typeof window!=='undefined'?window:(typeof module!=='undefined'?module.exports:this));"]
    open(path,'w').write('\n'.join(body)+'\n')
    print('tiles',len(SPR))

def preview(path='/tmp/sim_tiles.png',S=4):
    from PIL import Image
    keys=list(SPR.keys()); cols=8
    cw=max(len(SPR[k][0]) for k in keys)*S+8; ch=max(len(SPR[k]) for k in keys)*S+8
    rows=(len(keys)+cols-1)//cols
    im=Image.new('RGB',(cols*cw,rows*ch),'#f5ead6')
    for i,k in enumerate(keys):
        ox=(i%cols)*cw+4; oy=(i//cols)*ch+4
        for y,r in enumerate(SPR[k]):
            for x,chh in enumerate(r):
                c=PAL.get(chh)
                if c:
                    col=tuple(int(c[j:j+2],16) for j in (1,3,5))
                    for dy in range(S):
                        for dx in range(S): im.putpixel((ox+x*S+dx,oy+y*S+dy),col)
    im.save(path); print(path,im.size)

if __name__=='__main__':
    write_js()
    if 'preview' in sys.argv: preview()
