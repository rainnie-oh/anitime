"""Requires fonttools and uharfbuzz. Geometry is shaped before outlining."""
from pathlib import Path
from io import BytesIO
import json
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
HERE=Path(__file__).resolve().parent
OUT=HERE.parent.parent/'public/brand'
f=instantiateVariableFont(TTFont(HERE/'Archivo-variable.ttf'),{'wght':800,'wdth':100},inplace=False)
raw=BytesIO(); f.save(raw)
font=hb.Font(hb.Face(raw.getvalue())); upm=f['head'].unitsPerEm; font.scale=(upm,upm)
buf=hb.Buffer(); buf.add_str('ANITIME'); buf.guess_segment_properties(); hb.shape(font,buf,{'kern':True})
glyphs=f.getGlyphSet(); order=f.getGlyphOrder(); x=0; placed=[]
for info,pos in zip(buf.glyph_infos,buf.glyph_positions):
 name=order[info.codepoint]; bp=BoundsPen(glyphs); glyphs[name].draw(bp)
 placed.append((name,x+pos.x_offset,pos.y_offset,bp.bounds))
 x+=pos.x_advance-.06*upm
# Center each I optically between its immediate neighboring ink bounds.
# Keep the overall -60/1000 em tracking and total word width unchanged.
optical={}
for i in (2,4):
 left=placed[i][1]+placed[i][3][0]-(placed[i-1][1]+placed[i-1][3][2])
 right=placed[i+1][1]+placed[i+1][3][0]-(placed[i][1]+placed[i][3][2])
 shift=(right-left)/2; name,x,y,b=placed[i]; placed[i]=(name,x+shift,y,b); optical[i+1]=shift
xmin=min(x+b[0] for _,x,y,b in placed); xmax=max(x+b[2] for _,x,y,b in placed)
ymin=min(y+b[1] for _,x,y,b in placed); ymax=max(y+b[3] for _,x,y,b in placed)
cap=ymax-ymin; pad=cap*.5; width=xmax-xmin+2*pad; height=cap+2*pad
paths=[]
for name,x,y,b in placed:
 pen=SVGPathPen(glyphs); glyphs[name].draw(TransformPen(pen,(1,0,0,-1,x-xmin+pad,ymax+pad-y))); paths.append(pen.getCommands())
def svg(color,background=None):
 bg=f'<path fill="{background}" d="M0 0H{width}V{height}H0Z"/>' if background else ''
 return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" aria-label="ANITIME">'+bg+''.join(f'<path fill="{color(i)}" d="{p}"/>' for i,p in enumerate(paths))+'</svg>\n'
for name,ink,bg in [('white','#000000','#FFFFFF'),('black','#FFFFFF','#000000'),('mono','#000000',None)]:
 color=lambda i: '#E53E3E' if i in (2,4) and name!='mono' else ink
 (OUT/f'anitime-{name}.svg').write_text(svg(color,bg))
 (OUT/f'anitime-{name}-transparent.svg').write_text(svg(color))
name,_,_,b=placed[0]; side=cap*2; pen=SVGPathPen(glyphs)
glyphs[name].draw(TransformPen(pen,(1,0,0,-1,(side-(b[2]-b[0]))/2-b[0],(side+(b[3]-b[1]))/2+b[1])))
(OUT/'favicon.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {side} {side}"><path fill="#000000" d="{pen.getCommands()}"/></svg>\n')
metrics={'font':'Archivo','wght':800,'wdth':100,'unitsPerEm':upm,'tracking':-.06*upm,'kerning':True,'opticalIShift':optical,'capHeight':cap,'clearSpace':pad,'viewBox':[width,height],'inkWidth':xmax-xmin,'gaps':[placed[i+1][1]+placed[i+1][3][0]-(placed[i][1]+placed[i][3][2]) for i in range(6)]}
(OUT/'metrics.json').write_text(json.dumps(metrics,indent=2)+'\n'); print(metrics)
