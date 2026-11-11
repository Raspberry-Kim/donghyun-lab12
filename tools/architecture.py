"""동현심 v0.11 건축 도트. 외부 그림 없이 정수 격자 위에 직접 그린다.

건물의 부지와 키는 그대로. 북서쪽 빛, 뒤로 4~6픽셀 물러난 지붕,
밝은 정면과 어두운 오른쪽 측면으로 작은 건축 모형처럼 표현한다.
"""
import math


def repaint(PAL, SPR):
    # 기존 효과·인물 팔레트는 보존하고 건축 전용 색을 별도로 둔다.
    PAL.update({
        'q': '#a4b58b', 'j': '#9bab82', 'u': '#b0bf98',  # 잔디
        'v': '#385a4a', 'f': '#52765b', 'l': '#739069',  # 수관
        'z': '#74866c', 'H': '#d4cfb9', 'J': '#b3b5a4', # 지면·그림자
        'D': '#3c4d50', 'F': '#f1e7ce', 'N': '#c9c5b3', 'Q': '#979f95',
        'T': '#bd7156', 'U': '#e0a079', 'V': '#8e5144', # 테라코타
        'X': '#527377', 'Z': '#36545d', '1': '#88b7bb', '2': '#c3d9ce',
        '3': '#628fa2', '4': '#49758b', '9': '#96b9be', # 유리·물
        '!': '#dab66d', '?': '#f5da96', '@': '#768b98', '#': '#a4b6b7',
        '$': '#705e56', '%': '#9d8b77', '&': '#627273', '+': '#e4dbc1',
        '=': '#bb8b62', '~': '#849ca1', '^': '#d8aa9a',
    })

    def canvas(n):
        return [['.'] * n for _ in range(n)]

    def dot(g, x, y, c):
        if 0 <= x < len(g) and 0 <= y < len(g):
            g[y][x] = c

    def box(g, x, y, w, h, c):
        for yy in range(y, y+h):
            for xx in range(x, x+w):
                dot(g, xx, yy, c)

    def line(g, x, y, xx, yy, c):
        n = max(abs(xx-x), abs(yy-y), 1)
        for i in range(n+1):
            dot(g, round(x+(xx-x)*i/n), round(y+(yy-y)*i/n), c)

    def poly(g, pts, c):
        # Pixel-center even/odd fill; edges are deliberately crisp integer pixels.
        for y in range(max(0, min(p[1] for p in pts)), min(len(g), max(p[1] for p in pts)+1)):
            xs = []
            for a, b in zip(pts, pts[1:]+pts[:1]):
                if (a[1] <= y+.5 < b[1]) or (b[1] <= y+.5 < a[1]):
                    xs.append(a[0]+(y+.5-a[1])*(b[0]-a[0])/(b[1]-a[1]))
            xs.sort()
            for a, b in zip(xs[::2], xs[1::2]):
                for x in range(math.ceil(a-.5), math.ceil(b-.5)):
                    dot(g, x, y, c)

    def ellipse(g, x, y, rx, ry, c):
        for yy in range(max(0, y-ry), min(len(g), y+ry+1)):
            for xx in range(max(0, x-rx), min(len(g), x+rx+1)):
                if ((xx-x)/rx)**2 + ((yy-y)/ry)**2 <= 1:
                    dot(g, xx, yy, c)

    def add(key, g):
        SPR[key] = [''.join(r) for r in g]

    def lawn(n, seed=0):
        g = canvas(n)
        box(g, 0, 0, n, n, 'q')
        for y in range(2, n, 7):
            for x in range(2, n, 9):
                if (x+y+seed) % 3:
                    dot(g, (x+seed*3) % n, y, 'u')
        return g

    def tree(g, x, y, r=4):
        ellipse(g, x+2, y+3, r+1, 2, 'z')
        box(g, x, y, 1, 5, '$')
        ellipse(g, x, y-2, r, r, 'v')
        ellipse(g, x-1, y-3, r-1, r-1, 'f')
        box(g, x-2, y-r, 3, 2, 'l')

    def plot(n, paved=False):
        g = lawn(n)
        box(g, 1, n-5, n-2, 4, 'H')
        box(g, 1, n-2, n-2, 1, '+')
        if paved:
            box(g, 2, n//2, n-4, n//2-5, 'J')
        return g

    def pane(g, x, y, w=2, h=3, warm=False):
        box(g, x, y, w, h, 'Z')
        box(g, x, y, max(1, w-1), max(1, h-1), '?' if warm else '1')
        dot(g, x, y, 'F' if warm else '2')

    def block(g, x, y, w, h, d=4, wall='F', side='N', roof='#', rows=True):
        # Front face (x,y,w,h), roof recedes northeast; right side remains visible.
        poly(g, [(x+2,y+h),(x+w+d,y+h-d),(x+w+d+3,y+h),(x+5,y+h+4)], 'z')
        poly(g, [(x+w,y),(x+w+d,y-d),(x+w+d,y+h-d),(x+w,y+h)], side)
        box(g, x, y, w, h, wall)
        box(g, x, y, 1, h, '+')
        box(g, x, y+h-1, w, 1, 'Q')
        line(g, x+w, y, x+w, y+h-1, 'D')
        poly(g, [(x,y),(x+d,y-d),(x+w+d,y-d),(x+w,y)], roof)
        line(g, x, y, x+w, y, 'D')
        line(g, x+d, y-d, x+w+d, y-d, '2' if roof in 'X@#' else '+')
        if rows:
            for yy in range(y+3, y+h-3, 5):
                for xx in range(x+2, x+w-2, 4):
                    pane(g, xx, yy, 2, 3, (xx+yy) % 11 == 0)
                for xx in range(2, d, 3):
                    box(g, x+w+xx, yy-xx, 1, 2, 'X')
        return x, y, w, h

    def door(g, x, y, w=4, h=5):
        box(g, x-1, y-1, w+2, h+1, 'N')
        box(g, x, y, w, h, 'Z')
        box(g, x+1, y+1, max(1,w-2), h-2, '1')
        box(g, x-2, y+h, w+4, 1, '+')

    def cottage(g, x, y, w=14, h=10, luxury=False):
        d=4
        block(g,x,y,w,h,d,'F','N','X',False)
        roof, light, dark = ('X','@','Z') if luxury else ('T','U','V')
        poly(g,[(x-1,y),(x+w//2,y-6),(x+w+1,y)], light)
        poly(g,[(x+w//2,y-6),(x+w//2+d,y-9),(x+w+d+1,y-3),(x+w+1,y)], roof)
        line(g,x-1,y,x+w+1,y,dark)
        line(g,x+w//2,y-6,x+w+1,y,dark)
        line(g,x+w//2,y-6,x+w//2+d,y-9,'+')
        box(g,x+w-2,y-8,2,4,'N')
        pane(g,x+2,y+3,3,3)
        if w>15: pane(g,x+w-5,y+3,3,3)
        door(g,x+w//2-1,y+h-5,3,5)
        box(g,x+1,y+h,3,1,'v')

    def apartments(g, x, y, w, h, luxury=False):
        block(g,x,y,w,h,5,'F' if luxury else 'N','Q','X' if luxury else '#')
        # Roof parapet, rooftop plant room, balconies and ground-floor lobby.
        box(g,x+3,y-3,max(3,w-7),2,'N')
        box(g,x+4,y-3,max(2,w-9),1,'+')
        for yy in range(y+6,y+h-4,6):
            box(g,x+1,yy,w-2,1,'+' if luxury else 'F')
            box(g,x+1,yy+1,w-2,1,'@')
        # Warm brick stairwell for ordinary housing, copper-green for garden homes.
        box(g,x+w-2,y+2,2,h-3,'X' if luxury else 'T')
        door(g,x+w//2-2,y+h-5)

    def shop(g,x,y,w,h,department=False):
        block(g,x,y,w,h,4,'F' if department else 'N','Q','T' if department else 'X')
        box(g,x+2,y+2,w-4,2,'T' if department else 'X')
        # Shopfront glass with a stone mullion and alternating canvas awning.
        for xx in range(x+2,x+w-3,5):
            pane(g,xx,y+h-6,4,5)
        for xx in range(x,x+w,2):
            box(g,xx,y+h-9,min(2,x+w-xx),2,'F' if (xx-x)//2%2 else ('T' if department else 'X'))
        door(g,x+w//2-1,y+h-5,3,5)

    def stack(g,x,y,h=13,w=4):
        box(g,x+1,y,w,h,'Q'); box(g,x+1,y,1,h,'+')
        box(g,x+w,y,1,h,'&'); box(g,x,y,w+2,2,'D')
        for yy in range(y+4,y+h,6): box(g,x+1,yy,w,2,'T')

    def hall(g,x,y,w,h,heavy=False):
        block(g,x,y,w,h,4,'%' if heavy else 'N','$' if heavy else 'Q','&',False)
        # Saw-tooth factory skylights, not apartment window grids.
        for xx in range(x,x+w-3,7):
            poly(g,[(xx,y),(xx+5,y-5),(xx+5,y)], '#')
            line(g,xx+1,y-1,xx+4,y-4,'2')
            box(g,xx+5,y-4,1,4,'D')
        for xx in range(x+2,x+w-3,5): pane(g,xx,y+3,3,2)
        box(g,x+3,y+h-5,6,5,'&')
        for yy in range(y+h-4,y+h,2): box(g,x+3,yy,6,1,'#')
        box(g,x+w-5,y+h-4,3,4,'D')

    def tank(g,x,y,w=9,h=10):
        box(g,x,y,w,h,'#'); box(g,x+w-2,y,2,h,'&')
        ellipse(g,x+w//2,y,w//2,2,'+')
        line(g,x,y+h,x+w-1,y+h,'D')
        box(g,x+2,y+2,1,h-3,'2')

    # Quiet, continuous terrain; no dense single-pixel noise.
    add('grass0',lawn(16)); add('grass1',lawn(16,2))
    for f in (0,1):
        g=canvas(16); box(g,0,0,16,16,'3')
        box(g,2+f,4,5,1,'9'); box(g,10-f,11,4,1,'9')
        box(g,0,14,3,1,'4'); add('water'+str(f),g)
    g=lawn(16); tree(g,8,8,5); add('tree',g)
    g=lawn(16); box(g,0,12,16,3,'H'); tree(g,5,6,4)
    box(g,10,10,5,1,'='); box(g,10,12,5,1,'$')
    dot(g,10,13,'D'); dot(g,14,13,'D')
    dot(g,12,5,'^'); dot(g,13,6,'F'); add('park',g); add('ico_park',g)
    g=lawn(16)
    for x,y in ((2,5),(7,9),(11,4),(3,12)):
        box(g,x,y,3,2,'Q'); box(g,x,y,2,1,'N'); dot(g,x+3,y+1,'&')
    add('rubble',g)

    # Six families, five visibly different densities, all within the same 48px lot.
    for kind in ('R','RH','C','CD','I','IH'):
        for lv in range(1,6):
            g=plot(48,kind in ('C','CD','I','IH'))
            box(g,22,30,4,18,'H')
            if kind in ('R','RH'):
                luxury=kind=='RH'
                if lv==1:
                    cottage(g,15,22,17,12,luxury); tree(g,7,33); tree(g,39,34,3)
                elif lv==2:
                    cottage(g,4,17,13,10,luxury); cottage(g,26,19,13,10,luxury)
                    cottage(g,15,34,14,9,luxury)
                elif lv==3:
                    apartments(g,4,10,17,25,luxury); cottage(g,27,21,13,11,luxury)
                    tree(g,34,40,3)
                elif lv==4:
                    apartments(g,4,9,18,31,luxury); apartments(g,27,17,13,25,luxury)
                else:
                    apartments(g,6,7,18,35,luxury); apartments(g,26,13,14,29,luxury)
                    block(g,8,37,29,7,3,'F','N','X',False); door(g,22,39,5,5)
                if luxury:
                    box(g,2,44,18,1,'v'); box(g,29,44,17,1,'v')
                    for x in (4,9,34,40): dot(g,x,43,'^')
                    if lv<4:
                        box(g,3,36,9,6,'+'); box(g,4,37,7,4,'3'); box(g,5,37,5,1,'2')
            elif kind in ('C','CD'):
                dep=kind=='CD'
                if lv==1:
                    shop(g,12,22,22,15,dep); tree(g,5,35,3)
                elif lv==2:
                    shop(g,3,17,17,16,dep); shop(g,24,25,17,16,dep)
                elif lv==3:
                    shop(g,4,14,23,27,dep); shop(g,29,27,12,14,dep)
                elif lv==4:
                    shop(g,4,10,27,31,dep)
                    block(g,30,20,10,21,4,'1','X','@')
                else:
                    block(g,9,7,26,32,5,'1','X','@',False)
                    for yy in range(11,36,5):
                        box(g,10,yy,24,1,'2'); box(g,10,yy+1,24,1,'X')
                    for xx in (13,21,29): box(g,xx,8,1,29,'#')
                    shop(g,4,33,36,10,dep)
                if dep:
                    box(g,6,44,12,2,'T'); box(g,31,44,11,2,'T')
                    if lv>=3:
                        box(g,6,10 if lv==3 else 6,14,3,'V')
                        box(g,8,11 if lv==3 else 7,10,1,'!')
                else:
                    box(g,4,44,9,2,'X')
            else:
                heavy=kind=='IH'
                if lv==1:
                    stack(g,29,10,15); hall(g,9,25,25,13,heavy)
                elif lv==2:
                    stack(g,31,6,18); hall(g,4,16,19,12,heavy)
                    hall(g,20,31,20,12,heavy)
                elif lv==3:
                    stack(g,7,4,21); stack(g,32,8,19)
                    hall(g,3,22,33,18,heavy); tank(g,36,30,8,10)
                else:
                    for xx in (7,18,32) if heavy else (8,29): stack(g,xx,3,22)
                    hall(g,3,21,34,12,heavy); hall(g,5,35,32,9,heavy)
                    tank(g,37,24,7,13)
                    if lv==5:
                        tank(g,37,8,7,10); box(g,2,40,43,2,'&')
                        for xx in range(4,43,4): box(g,xx,40,2,1,'!')
                if heavy:
                    box(g,2,44,14,2,'&'); box(g,30,44,15,2,'&')
                    for xx in (3,8,33,38): box(g,xx,43,3,1,'!')
                else:
                    box(g,2,44,12,2,'N')
            add(kind+str(lv),g)

    # Power campus: boiler hall, cooling towers, spillways, panels and reactor.
    g=plot(48,True); stack(g,8,3,24,5); stack(g,29,2,25,5)
    hall(g,3,27,34,15,True); tank(g,37,27,8,14)
    box(g,6,40,27,1,'!'); add('power',g)
    g=plot(48); box(g,0,0,48,48,'3')
    for yy in (5,32,42): box(g,2,yy,44,1,'9')
    block(g,3,15,38,14,5,'N','Q','#',False)
    for xx in range(6,39,8):
        box(g,xx,19,5,9,'Z'); box(g,xx+1,22,3,12,'2'); box(g,xx,33,6,3,'9')
    block(g,15,7,13,8,4,'F','Q','X'); box(g,3,13,38,1,'+'); add('hydro',g)
    g=lawn(16); ellipse(g,9,14,4,1,'z')
    box(g,7,5,2,9,'F'); box(g,8,7,1,7,'N'); box(g,6,14,4,1,'N')
    # Hub matches the existing rotating blades; no second fixed rotor.
    box(g,7,4,3,2,'F'); dot(g,8,4,'D'); add('wind',g)
    g=plot(48,True)
    for x in (4,29):
        poly(g,[(x,8),(x+13,8),(x+10,17),(x+10,23),(x+15,32),(x-2,32),(x+3,23),(x+3,17)],'N')
        poly(g,[(x+9,8),(x+13,8),(x+10,18),(x+10,23),(x+15,32),(x+10,32),(x+7,23)],'Q')
        ellipse(g,x+6,8,7,2,'&'); box(g,x+2,8,7,1,'#')
        line(g,x+3,13,x+4,24,'+')
    block(g,11,34,22,8,4,'F','Q','@',False)
    door(g,20,37,4,5); add('nuclear',g)
    g=plot(32)
    for x,y in ((2,5),(17,5),(2,19),(17,19)):
        box(g,x+5,y+7,2,4,'&')
        poly(g,[(x,y+8),(x+2,y),(x+13,y),(x+11,y+8)],'Z')
        for yy in (y+2,y+5): line(g,x+2,yy,x+11,yy,'3')
        for xx in (x+5,x+9): line(g,xx,y+1,xx-2,y+7,'3')
        line(g,x+2,y,x+12,y,'2')
    add('solar',g)
    g=plot(48,True); block(g,4,32,36,11,5,'N','Q','@',False)
    ellipse(g,25,24,17,11,'D'); ellipse(g,24,22,17,11,'#')
    ellipse(g,24,22,12,7,'Z'); ellipse(g,24,22,10,5,'1')
    ellipse(g,24,22,6,3,'D')
    for x,y in ((8,20),(22,11),(36,20),(22,30)): box(g,x,y,4,3,'!')
    door(g,21,36,6,7); add('fusion',g)

    # Civic architecture. Each institution has its own massing and forecourt.
    g=plot(48,True); block(g,4,19,35,22,5,'F','Q','X')
    block(g,14,10,16,12,4,'F','N','X',False)
    box(g,19,13,6,5,'X'); dot(g,21,14,'!'); box(g,20,15,3,2,'!')
    box(g,4,25,35,2,'X'); door(g,18,33,7,8)
    box(g,5,43,8,3,'F'); box(g,6,43,5,1,'X'); dot(g,7,42,'R'); add('police',g)
    g=plot(48,True); block(g,4,18,35,23,5,'T','V','N',False)
    block(g,30,7,8,17,4,'T','V','N')
    for x in (7,20):
        box(g,x,27,11,14,'D')
        for yy in range(28,39,3): box(g,x+1,yy,9,1,'#')
        box(g,x+2,35,7,4,'T'); box(g,x+3,35,5,1,'2')
    box(g,6,22,25,2,'F'); door(g,33,34,4,7); add('fire',g)
    g=plot(64); box(g,9,42,46,18,'H')
    block(g,5,30,49,22,5,'F','N','X')
    block(g,21,19,20,33,4,'F','N','X',False)
    # Copper dome above clock tower, columned entrance and broad stairs.
    ellipse(g,33,16,10,7,'X'); ellipse(g,30,14,6,5,'@')
    box(g,22,18,22,2,'N'); box(g,32,5,1,6,'D'); box(g,33,5,5,3,'T')
    ellipse(g,31,25,4,4,'D'); ellipse(g,31,25,3,3,'F')
    line(g,31,25,31,23,'D'); line(g,31,25,33,26,'D')
    door(g,27,41,8,11)
    for x in (23,38): box(g,x,36,2,16,'+'); box(g,x-1,36,4,2,'N')
    for y,w in ((53,24),(55,30),(57,36)): box(g,31-w//2,y,w,2,'N'); box(g,31-w//2,y,w,1,'+')
    tree(g,7,55,4); tree(g,55,55,4); add('cityhall',g)
    g=plot(48); block(g,3,18,27,20,4,'F','N','T')
    block(g,12,12,9,26,3,'F','N','T')
    ellipse(g,16,17,3,3,'F'); line(g,16,17,16,15,'D'); dot(g,18,17,'D')
    door(g,13,32,6,6)
    box(g,33,29,13,13,'='); box(g,34,30,11,11,'H')
    box(g,35,31,9,9,'='); box(g,39,31,1,9,'+')
    line(g,39,10,39,25,'D'); box(g,40,10,5,3,'T'); add('school',g)
    g=plot(48,True); block(g,4,14,31,27,6,'F','N','X')
    block(g,9,8,14,9,4,'F','N','@',False)
    box(g,14,9,2,6,'T'); box(g,12,11,6,2,'T')
    block(g,9,33,29,9,4,'F','N','X',False)
    door(g,20,35,7,7); box(g,7,44,10,3,'F')
    box(g,8,44,3,1,'1'); box(g,13,43,2,1,'T'); add('hospital',g)
    g=plot(32); block(g,3,13,23,14,3,'F','N','N',False)
    poly(g,[(2,13),(15,5),(28,13)],'N'); line(g,2,13,28,13,'+')
    box(g,5,15,20,11,'X')
    for x in (6,12,18,24):
        box(g,x,15,2,11,'F'); box(g,x-1,15,4,1,'+')
    door(g,13,22,4,5)
    box(g,12,9,3,3,'F'); box(g,16,9,3,3,'F'); box(g,15,10,1,3,'$')
    add('library',g)
    g=plot(48); block(g,4,19,34,22,5,'F','N','N',False)
    poly(g,[(3,19),(22,8),(40,19)],'F')
    poly(g,[(22,8),(26,5),(44,15),(40,19)],'N')
    line(g,4,19,40,19,'+')
    box(g,7,22,29,18,'&')
    for x in (8,14,20,26,32): box(g,x,22,2,19,'F'); box(g,x-1,22,4,2,'+')
    box(g,3,41,39,2,'N'); box(g,1,43,43,2,'+')
    box(g,30,23,3,10,'T'); add('museum',g)
    g=plot(48,True)
    block(g,5,31,35,11,4,'F','N','X',False)
    for x,y,w,h in ((5,26,16,20),(16,22,18,20),(28,25,16,18)):
        poly(g,[(x,y+7),(x+w//2,y-h),(x+w,y+5)],'N')
        poly(g,[(x,y+7),(x+w//2,y-h),(x+w//2-1,y+7)],'F')
        line(g,x,y+7,x+w//2,y-h,'+')
    box(g,7,33,31,8,'Z')
    for x in range(9,37,5): pane(g,x,34,3,6)
    box(g,4,43,39,2,'H'); add('concert',g)

    # Landmark silhouettes stay completely inside their existing footprints.
    g=plot(64); box(g,17,45,32,16,'H')
    poly(g,[(27,54),(30,19),(35,19),(39,54)],'N')
    poly(g,[(34,19),(35,19),(39,54),(34,54)],'Q')
    line(g,30,22,29,52,'+')
    ellipse(g,33,23,12,4,'D'); ellipse(g,32,20,13,4,'#')
    box(g,20,20,24,3,'X')
    for x in range(22,44,4): box(g,x,20,2,2,'2')
    ellipse(g,32,17,10,3,'F')
    box(g,31,4,2,11,'N'); box(g,31,2,2,3,'!'); dot(g,31,1,'F')
    block(g,18,52,26,7,4,'N','Q','X',False); door(g,29,54,6,5)
    tree(g,9,55,5); tree(g,52,55,4); add('tower',g)
    g=plot(64,True)
    ellipse(g,32,34,29,21,'D'); ellipse(g,31,30,29,21,'N')
    ellipse(g,31,30,25,17,'F'); ellipse(g,31,30,22,14,'@')
    for yy in (19,23,37,41): line(g,14,yy,48,yy,'#')
    ellipse(g,31,30,19,11,'f')
    box(g,18,23,27,15,'l'); box(g,19,24,25,13,'f')
    line(g,31,24,31,36,'F'); ellipse(g,31,30,4,4,'F'); ellipse(g,31,30,3,3,'f')
    box(g,18,27,4,7,'F'); box(g,19,28,2,5,'f')
    box(g,41,27,4,7,'F'); box(g,42,28,2,5,'f')
    for x,y in ((7,10),(53,10),(7,43),(53,43)):
        box(g,x,y,1,10,'&'); box(g,x-2,y,6,2,'F'); box(g,x-2,y+2,6,1,'!')
    add('stadium',g)
    g=plot(64,True); box(g,2,42,60,15,'&')
    for x in range(5,59,8): box(g,x,49,4,1,'F')
    for x in (4,58):
        for y in (44,47,51,54): box(g,x,y,2,1,'F')
    block(g,4,17,32,16,5,'1','X','N',False)
    for x in range(7,35,5): box(g,x,20,1,12,'F')
    for x in (10,24): box(g,x,33,3,7,'N'); box(g,x-2,38,7,2,'+')
    block(g,46,12,6,22,3,'N','Q','X',False)
    block(g,42,8,14,6,3,'X','Z','#',False); box(g,44,9,10,2,'2')
    # Top-down aircraft with a fuselage, swept wings and tailplane.
    poly(g,[(36,34),(38,31),(40,34),(40,38),(51,42),(51,44),(40,42),(40,47),(44,49),(44,50),(38,49),(32,50),(32,49),(36,47),(36,42),(25,44),(25,42),(36,38)],'F')
    box(g,37,34,2,3,'X'); box(g,38,39,1,9,'N'); add('airport',g)
    g=plot(48,True); box(g,0,28,48,20,'3')
    box(g,3,38,8,1,'9'); box(g,31,44,11,1,'9')
    box(g,3,25,42,8,'N'); box(g,3,25,42,1,'+'); box(g,3,32,42,2,'&')
    for x,col in ((6,'T'),(18,'X'),(30,'!')):
        block(g,x,19,10,7,3,col,'&','#',False)
        for xx in range(x+2,x+9,3): box(g,xx,20,1,5,'N')
    box(g,10,5,3,20,'!'); box(g,10,5,24,2,'!')
    line(g,11,7,11,23,'F'); line(g,13,5,25,1,'!')
    line(g,25,1,33,5,'!'); line(g,31,7,31,16,'D')
    box(g,29,15,4,2,'&')
    poly(g,[(17,37),(39,37),(35,44),(20,44)],'D')
    box(g,20,37,16,3,'F'); box(g,22,36,6,3,'T')
    add('harbor',g)

    # Small tool silhouettes remain hand-pixelled and familiar, recolored to match.
    remap={'K':'D','g':'q','5':'f','6':'u','R':'T','d':'V','M':'U',
           'B':'X','b':'Z','7':'1','8':'2','i':'N','I':'@','W':'F','E':'+',
           'a':'Q','A':'&','c':'%','h':'$'}
    for key, rows in list(SPR.items()):
        if key.startswith('ico_') and key!='ico_park':
            SPR[key]=[''.join(remap.get(ch,ch) for ch in row) for row in rows]
