"""Rebuild outlined SVG assets. Requires fonttools + brotli; previews use sharp."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from html import escape
import math
ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent
fonts={}
for kind,file in [('ru','rubik-800-cyrillic.woff2'),('lat','rubik-800-latin.woff2')]:
    f=TTFont(ROOT/'shared/fonts'/file); fonts[kind]=(f,f.getGlyphSet(),f.getBestCmap())
GREEN='#124D3C'; RED='#BD4932'; YELLOW='#F5BD49'; CREAM='#FFF7E5'; SAGE='#A9BF76'
def glyph(ch):
    for f,gs,cmap in fonts.values():
        if ord(ch) in cmap: return f,gs,cmap[ord(ch)]
    raise ValueError(ch)
def width(s,size):
    return sum(glyph(c)[0]['hmtx'][glyph(c)[2]][0]*size/glyph(c)[0]['head'].unitsPerEm for c in s)
def letters(s,x,y,size,color,play=False):
    pieces=[]
    for index,ch in enumerate(s):
        f,gs,name=glyph(ch); scale=size/f['head'].unitsPerEm; pen=SVGPathPen(gs); gs[name].draw(pen)
        d=pen.getCommands()
        if d:
            angle=([-2,1,-1,2,0,-1,1][index%7] if play else 0)
            shift=([0,-2,1,-1,2][index%5] if play else 0)
            pieces.append(f'<g transform="translate({x:.2f} {y+shift:.2f}) rotate({angle})"><path transform="scale({scale:.6f} {-scale:.6f})" fill="{color}" d="{d}"/></g>')
        x+=f['hmtx'][name][0]*scale
    return ''.join(pieces)
def path(d,fill,extra=''):return f'<path d="{d}" fill="{fill}" {extra}/>'
def ellipse(cx,cy,rx,ry,fill):return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{fill}"/>'
def circle(x,y,r,fill):return ellipse(x,y,r,r,fill)
def svg(name,w,h,body,title):
    data=f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-labelledby="title"><title id="title">{escape(title)}</title>{body}</svg>'''
    (OUT/name).write_text(data)
    return data
# Main title: a separate transparent illustration, not live text.
first=letters('3 друга',20,180,205,GREEN,True)
# Fit the lower line to the same visual width, with green preposition.
lower_size=147
second=letters('на',26,354,lower_size,GREEN,True)+letters('тарелке',26+width('на ',lower_size),354,lower_size,RED,True)
accents=path('M7 227 Q-1 218 4 212 Q10 208 19 221 L30 238Z',YELLOW)+path('M18 254 Q3 253 4 246 Q6 238 20 244 L31 250Z',YELLOW)
body=f'<g transform="translate(38 18) rotate(-2 420 180)" stroke="{CREAM}" stroke-width="5" stroke-linejoin="round" paint-order="stroke fill">{first}{second}</g>'+f'<g transform="translate(4 0)">{accents}</g>'
svg('title.svg',970,420,body,'3 друга на тарелке')
# Shared paper shapes, deliberately flat: short offset shadows only.
def plate():
    b=ellipse(128,171,108,42,'#D6CBB2')+ellipse(128,158,110,47,CREAM)+ellipse(128,151,92,34,'#E9DEBD')
    b+=path('M44 145 L73 111 L104 151Z',RED)+path('M65 120 L98 109 L121 149 L93 159Z','#DE684A')
    b+=path('M142 154 L155 111 L177 95 L189 114 L181 159Z',SAGE)
    for x,y,r in [(149,107,20),(171,90,23),(194,105,24),(173,119,24)]:b+=circle(x,y,r,'#39804C')
    for x,y in [(97,144),(109,126),(124,152),(136,128)]:b+=ellipse(x,y,12,6,YELLOW)
    b+=ellipse(131,142,28,33,'#D8CFB5')+ellipse(129,137,28,33,CREAM)+circle(129,140,15,YELLOW)
    return b
def face(x,y):
    return circle(x-7,y,2.5,GREEN)+circle(x+7,y,2.5,GREEN)+f'<path d="M{x-5} {y+8} Q{x} {y+13} {x+5} {y+8}" fill="none" stroke="{GREEN}" stroke-width="2.5" stroke-linecap="round"/>'
def friends():
    b=ellipse(124,188,106,12,'#E4DCC5')
    # Bread: two pieces, inset crumb, a few broad marks.
    b+=path('M84 172 L82 102 C59 90 70 58 91 60 C103 42 145 44 156 61 C180 62 183 92 163 103 L167 176 Q126 184 84 172Z','#A96935')
    b+=path('M94 166 L92 97 C73 87 83 70 97 72 C110 55 139 57 151 73 C169 72 173 89 153 99 L157 168Z','#F1CD8D')
    for x,y in [(101,91),(145,87),(114,74),(144,151),(99,146)]:b+=ellipse(x,y,2,3,'#C29250')
    b+=face(125,119)
    # Apple and leaf.
    b+=path('M20 139 C13 105 48 101 62 115 C85 103 102 125 94 150 C88 174 71 188 57 179 C39 189 23 168 20 139Z','#CF563E')
    b+=path('M57 117 Q50 99 58 89 L64 91 L63 113Z','#8E623A')+path('M63 104 Q65 78 88 86 Q88 106 63 104Z','#5E8B4D')+face(55,143)
    # Egg.
    b+=path('M163 164 C151 140 171 100 192 103 C213 107 237 144 229 166 C219 193 176 190 163 164Z',CREAM)+ellipse(194,151,23,25,YELLOW)+face(194,148)
    return b
def three():
    b=path('M27 48 C65 13 177 17 212 59 C245 99 231 176 190 205 C143 237 60 220 30 180 C0 141 0 81 27 48Z',GREEN)
    b+=path('M47 64 C81 32 169 37 198 70 C222 100 212 163 180 188 C143 214 75 202 48 171 C24 143 23 91 47 64Z','#21644B')
    b+=letters('3',67,172,166,CREAM,True)
    b+=path('M119 50 Q111 20 88 24 Q87 47 119 50Z',SAGE)+path('M120 48 Q126 16 150 20 Q149 44 120 48Z','#74A060')
    b+=circle(182,164,11,RED)+circle(165,186,9,YELLOW)+circle(139,197,7,SAGE)
    return b
marks=[plate(),friends(),three()]
for number,mark in enumerate(marks,1):
    words=letters('3 друга',272,113,91,GREEN,True)+letters('на тарелке',276,176,49,RED,False)
    svg(f'logo-0{number}.svg',740,250,f'<g transform="translate(4 0)">{mark}</g>'+words,'3 друга на тарелке — вариант '+str(number))
    svg(f'mark-0{number}.svg',256,256,f'<g transform="translate(4 8)">{mark}</g>','Знак — вариант '+str(number))
# Favicon: redraw for tiny sizes; no letters or fine food details.
for number in range(1,4):
    if number==1:
        icon=circle(32,32,30,GREEN)+ellipse(32,40,25,14,CREAM)+ellipse(32,37,20,10,'#E9DEBD')+path('M12 36 L22 25 L31 39Z',RED)+circle(39,27,11,'#69A464')+ellipse(31,37,9,11,CREAM)+circle(31,38,5,YELLOW)
    elif number==2:
        icon=circle(32,32,30,GREEN)+path('M22 46 L21 23 Q12 17 22 13 Q31 8 40 13 Q51 17 43 23 L44 46Z','#F1CD8D')+circle(18,39,11,RED)+ellipse(47,37,10,14,CREAM)+circle(47,40,5,YELLOW)
    else:
        icon=circle(32,32,30,GREEN)+letters('3',14,49,49,CREAM)+path('M30 16 Q22 14 23 6 Q32 6 33 14 Q35 6 43 7 Q42 16 33 17Z',SAGE)
    svg(f'favicon-0{number}.svg',64,64,icon,'Три друга — значок '+str(number))
print('Created title, 3 logos, 3 standalone marks and 3 favicon SVGs.')
