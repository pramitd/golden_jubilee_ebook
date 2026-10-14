from pathlib import Path
import json, os, re, shutil, subprocess
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image, Table, TableStyle, KeepTogether, HRFlowable
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image as PILImage

ROOT=Path(__file__).resolve().parents[1]
DATA=json.loads((ROOT/'public/public_data.json').read_text(encoding='utf-8'))
OUT=ROOT/'public'
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'; FONT_B='/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'; FONT_I='/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf'; SANS='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'; SANS_B='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
pdfmetrics.registerFont(TTFont('BookSerif',FONT));pdfmetrics.registerFont(TTFont('BookSerif-Bold',FONT_B));pdfmetrics.registerFont(TTFont('BookSerif-Italic',FONT_I));pdfmetrics.registerFont(TTFont('BookSans',SANS));pdfmetrics.registerFont(TTFont('BookSans-Bold',SANS_B))
EM=colors.HexColor('#0D493B'); DEEP=colors.HexColor('#08372E'); GOLD=colors.HexColor('#C8A45D'); LIGHTGOLD=colors.HexColor('#EAD8A8'); PAPER=colors.HexColor('#FBF7EC'); INK=colors.HexColor('#27342D'); MUTED=colors.HexColor('#6C756D'); LINE=colors.HexColor('#D9C9A7')
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='CoverEyebrow',fontName='BookSans-Bold',fontSize=8,leading=13,textColor=LIGHTGOLD,alignment=TA_CENTER,spaceAfter=10,tracking=1.8))
styles.add(ParagraphStyle(name='CoverTitle',fontName='BookSerif',fontSize=39,leading=45,textColor=colors.HexColor('#FFF7E8'),alignment=TA_CENTER,spaceAfter=14))
styles.add(ParagraphStyle(name='CoverSub',fontName='BookSerif',fontSize=18,leading=22,textColor=LIGHTGOLD,alignment=TA_CENTER,spaceAfter=12))
styles.add(ParagraphStyle(name='CoverNote',fontName='BookSerif-Italic',fontSize=13,leading=19,textColor=colors.HexColor('#E7E1CF'),alignment=TA_CENTER,spaceAfter=18))
styles.add(ParagraphStyle(name='Section',fontName='BookSans-Bold',fontSize=8,leading=11,textColor=EM,spaceBefore=2,spaceAfter=8,uppercase=True))
styles.add(ParagraphStyle(name='Display',fontName='BookSerif',fontSize=32,leading=32,textColor=DEEP,spaceAfter=10))
styles.add(ParagraphStyle(name='StoryHead',fontName='BookSerif',fontSize=22,leading=24,textColor=DEEP,spaceBefore=3,spaceAfter=5,keepWithNext=1))
styles.add(ParagraphStyle(name='Name',fontName='BookSerif',fontSize=31,leading=30,textColor=DEEP,spaceAfter=8))
styles.add(ParagraphStyle(name='SubName',fontName='BookSerif-Italic',fontSize=16,leading=19,textColor=colors.HexColor('#A17C38'),spaceAfter=12))
styles.add(ParagraphStyle(name='Meta',fontName='BookSerif',fontSize=12,leading=16,textColor=EM,spaceAfter=4))
styles.add(ParagraphStyle(name='Label',fontName='BookSans-Bold',fontSize=7,leading=10,textColor=EM,spaceAfter=4))
styles.add(ParagraphStyle(name='BodyBook',fontName='BookSerif',fontSize=11.2,leading=16.1,textColor=INK,spaceAfter=7,allowWidows=0,allowOrphans=0))
styles.add(ParagraphStyle(name='CaptionBook',fontName='BookSerif-Italic',fontSize=9.2,leading=12,textColor=INK,alignment=TA_CENTER,spaceBefore=7,spaceAfter=8))
styles.add(ParagraphStyle(name='IndexName',fontName='BookSerif-Bold',fontSize=10,leading=13,textColor=DEEP))
styles.add(ParagraphStyle(name='IndexBranch',fontName='BookSans',fontSize=7,leading=9,textColor=MUTED))
styles.add(ParagraphStyle(name='SmallNote',fontName='BookSans',fontSize=7.5,leading=10,textColor=MUTED,spaceBefore=12))

def has_meaningful_content(value):
    text=str(value or '').strip()
    if not text:return False
    return not re.fullmatch(r'(?:[-–—_•.\s]|n/?a|none|not applicable)+', text, flags=re.I)
def esc(s):
    return str(s or '').replace('&','&amp;').replace('<','&lt;').replace('>','&gt;').replace('\n','<br/>')
CLOSING=False
from reportlab.platypus import Flowable
class SetClosing(Flowable):
    """Zero-size marker: the page that starts after this flowable is the dark closing page."""
    def wrap(self,aw,ah):return (0,0)
    def draw(self):
        global CLOSING;CLOSING=True
def seal_50(canvas,cx,cy,r):
    canvas.setFillColor(colors.Color(.04,.25,.20));canvas.circle(cx,cy,r,fill=1,stroke=0)
    canvas.setStrokeColor(GOLD);canvas.setLineWidth(1.6);canvas.circle(cx,cy,r,fill=0,stroke=1)
    canvas.setStrokeColor(colors.Color(.8,.65,.36,alpha=.55));canvas.setLineWidth(.6);canvas.circle(cx,cy,r+3.2*mm,fill=0,stroke=1)
    canvas.setFillColor(colors.HexColor('#E9CF8E'));canvas.setFont('BookSerif-Bold',88);canvas.drawCentredString(cx,cy-30,'50')
def bg_closing(canvas,doc):
    canvas.saveState();w,h=A4;canvas.setFillColor(DEEP);canvas.rect(0,0,w,h,fill=1,stroke=0)
    for i in range(40):
        t=i/39;canvas.setFillColor(colors.Color(.05+.07*t,.22+.14*t,.18+.12*t));canvas.rect(0,h*(1-(i+1)/40),w,h/40+1,fill=1,stroke=0)
    canvas.setStrokeColor(GOLD);canvas.setLineWidth(.8);canvas.rect(12*mm,12*mm,w-24*mm,h-24*mm,fill=0,stroke=1)
    seal_50(canvas,w/2,h-92*mm,29*mm)
    canvas.setStrokeColor(colors.Color(.8,.65,.36,alpha=.5));canvas.line(20*mm,17*mm,w-20*mm,17*mm)
    canvas.setFont('BookSans-Bold',7);canvas.setFillColor(LIGHTGOLD);canvas.drawString(21*mm,13.2*mm,'GOLDEN JUBILEE \u2022 1976\u20132026')
    canvas.drawCentredString(w/2,13.2*mm,str(doc.page));canvas.drawRightString(w-21*mm,13.2*mm,'boroai.in');canvas.restoreState()
def footer(canvas,doc):
    if CLOSING:
        return bg_closing(canvas,doc)
    canvas.saveState(); w,h=A4
    canvas.setFillColor(PAPER);canvas.rect(0,0,w,h,fill=1,stroke=0)
    # double hairline border / understated gold frame
    canvas.setStrokeColor(LINE);canvas.setLineWidth(.55);canvas.rect(9*mm,9*mm,w-18*mm,h-18*mm,fill=0,stroke=1)
    canvas.setStrokeColor(GOLD);canvas.setLineWidth(.3);canvas.line(19*mm,18*mm,w-19*mm,18*mm)
    canvas.setFont('BookSans-Bold',6.5);canvas.setFillColor(MUTED);canvas.drawString(20*mm,13*mm,'GOLDEN JUBILEE  •  1976–2026')
    canvas.setFont('BookSans-Bold',7);canvas.setFillColor(EM);canvas.drawCentredString(w/2,13*mm,str(doc.page))
    canvas.drawRightString(w-20*mm,13*mm,'boroai.in')
    canvas.restoreState()
def bg_cover(canvas,doc):
    canvas.saveState();w,h=A4;canvas.setFillColor(DEEP);canvas.rect(0,0,w,h,fill=1,stroke=0)
    # soft emerald lift toward the lower half of the page
    for i in range(40):
        t=i/39;canvas.setFillColor(colors.Color(.05+.07*t,.22+.14*t,.18+.12*t));canvas.rect(0,h*(1-(i+1)/40),w,h/40+1,fill=1,stroke=0)
    # campus gate, faded into the background (pre-faded image with transparency)
    gate=ROOT/'public'/'assets'/'cover'/'campus-gate.webp'
    if gate.exists():
        try:
            import tempfile
            png=Path(tempfile.gettempdir())/'gj_cover_gate.png'
            PILImage.open(gate).convert('RGBA').save(png)
            gw=w-24*mm;gh=gw*947/1700
            canvas.drawImage(str(png),12*mm,12*mm,width=gw,height=gh,mask='auto')
        except Exception as e:print('cover image skipped:',e)
    canvas.setStrokeColor(GOLD);canvas.setLineWidth(.8);canvas.rect(12*mm,12*mm,w-24*mm,h-24*mm,fill=0,stroke=1)
    seal_50(canvas,w/2,h-60*mm,29*mm)
    canvas.setFillColor(GOLD);canvas.setFont('BookSans-Bold',11);canvas.drawCentredString(w/2,h-27*mm,'\u2726      \u2726      \u2726')
    canvas.setStrokeColor(colors.Color(.8,.65,.36,alpha=.5));canvas.line(20*mm,17*mm,w-20*mm,17*mm)
    canvas.setFont('BookSans-Bold',7);canvas.setFillColor(LIGHTGOLD);canvas.drawString(21*mm,13.2*mm,'GOLDEN JUBILEE \u2022 NIT RAIPUR')
    canvas.drawRightString(w-21*mm,13.2*mm,'boroai.in');canvas.restoreState()
LOW_MODE=False
def img_flow(path,maxw,maxh):
    try:
        im=PILImage.open(path);w,h=im.size
        scale=min(maxw/w,maxh/h)
        if LOW_MODE:
            # Sharing edition: downsample to ~130 dpi at the printed size and re-encode as JPEG.
            import io,hashlib
            px=int(max(w*scale,h*scale)/72*130)
            im2=im.convert('RGB');im2.thumbnail((max(px,64),max(px,64)))
            out=Path(os.environ.get('TMPDIR','/tmp'))/('gj_low_'+hashlib.md5(str(path).encode()).hexdigest()+'.jpg')
            im2.save(out,'JPEG',quality=72)
            return Image(str(out),width=w*scale,height=h*scale)
        return Image(str(path),width=w*scale,height=h*scale)
    except Exception:return None

# ---------------------------------------------------------------------------------------------
# Photographs: always in source order and never cropped. Leftover space on the current page is used
# first (a pair may shrink only to 85% of its ideal size); otherwise the photographs move to a fresh
# page and are laid out as LARGE as that page allows (one per row at full width, or two per row,
# whichever gives bigger photographs), taking as many photographs as fit at a decent minimum size.
# ---------------------------------------------------------------------------------------------
from reportlab.platypus import Flowable
PG_PAIR_W=80*mm; PG_SINGLE_W=158*mm
PG_SQUEEZE=[105,92,80,70,60,52,44]                       # mm, current-page leftover space
PG_FRESH=[250,230,210,190,170,150,135,120,108,96,86,76,68,60]  # mm, fresh page
PG_MIN_AREA=4000*mm*mm; PG_MIN_SCALE=.85; PG_MAX_PER_PAGE=8
def _pg_size(ph):
    try:
        w,h=PILImage.open(ROOT/'public'/ph['src'].lstrip('/')).size
        return w,h
    except Exception:return 800,600
def _pg_box(ph,maxw,maxh):
    w,h=_pg_size(ph);sc=min(maxw/w,maxh/h);return w*sc,h*sc
def _pg_row(row,maxw,maxh,availW):
    cells=[];widths=[]
    for ph in row:
        im=img_flow(ROOT/'public'/ph['src'].lstrip('/'),maxw,maxh)
        if im is None:continue
        cell=[im]
        if ph.get('caption'):cell.append(Paragraph(esc(ph['caption']),styles['CaptionBook']))
        cells.append(cell);widths.append(im.drawWidth+4*mm)
    if not cells:return None,0
    t=Table([cells],colWidths=widths,hAlign='CENTER')
    t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('ALIGN',(0,0),(-1,-1),'CENTER'),('LEFTPADDING',(0,0),(-1,-1),2*mm),('RIGHTPADDING',(0,0),(-1,-1),2*mm),('TOPPADDING',(0,0),(-1,-1),1.5*mm),('BOTTOMPADDING',(0,0),(-1,-1),2*mm)]))
    return t,t.wrap(availW,10**6)[1]
class PhotoGroup(Flowable):
    def __init__(self,photos,heading=None):
        Flowable.__init__(self);self.photos=photos;self.heading=heading
    def wrap(self,aW,aH):
        self._aW=aW;return aW,aH+1          # always ask to be split into what fits
    def draw(self):pass
    def _heights(self,aW):
        return sum(f.wrap(aW,10**6)[1] for f in (self.heading or []))
    def _try(self,rows,maxws,H,aW,aH,with_heading):
        flows=[];total=self._heights(aW) if with_heading else 0
        for r,mw in zip(rows,maxws):
            t,h=_pg_row(r,mw,H*mm,aW)
            if t is None:continue
            flows.append(t);total+=h+3*mm
        return (flows,total) if total<=aH-2 else (None,total)
    def split(self,aW,aH):
        photos=self.photos;head=self.heading;with_heading=head is not None
        fresh=aH>=240*mm
        if not fresh:
            pair=photos[:2];mw=PG_SINGLE_W*.75 if len(pair)==1 else PG_PAIR_W
            ideal=[_pg_box(p,mw,PG_SQUEEZE[0]*mm)[0] for p in pair]
            for H in PG_SQUEEZE:
                if not all(_pg_box(p,mw,H*mm)[0]>=ideal[i]*PG_MIN_SCALE for i,p in enumerate(pair)):break
                flows,_=self._try([pair],[mw],H,aW,aH,with_heading)
                if flows:
                    out=(list(head) if with_heading else [])+flows
                    rest=photos[2:]
                    return out+([PhotoGroup(rest)] if rest else [])
            return []                                   # not enough room: continue on the next page
        left=len(photos);chosen=None
        for k in range(min(left,PG_MAX_PER_PAGE),0,-1):
            batch=photos[:k];best=None
            for mode in ('single','pair'):
                if mode=='pair' and k==1:continue
                rows=[[p] for p in batch] if mode=='single' else [batch[i:i+2] for i in range(0,k,2)]
                maxws=[PG_SINGLE_W if len(r)==1 else PG_PAIR_W for r in rows]
                for H in PG_FRESH:
                    flows,_=self._try(rows,maxws,H,aW,aH,with_heading)
                    if flows:
                        areas=[_pg_box(p,mw,H*mm) for r,mw in zip(rows,maxws) for p in r]
                        tot=sum(a*b for a,b in areas);mn=min(a*b for a,b in areas)
                        if best is None or tot>best[0]:best=(tot,mn,flows)
                        break
            if best and (k==1 or best[1]>=PG_MIN_AREA):chosen=(k,best[2]);break
        if not chosen:return []
        k,flows=chosen;out=(list(head) if with_heading else [])+flows
        rest=photos[k:]
        return out+([PhotoGroup(rest)] if rest else [])

def build_pdf(path, low=False):
    global CLOSING
    CLOSING=False   # reset per build: only the page after the SetClosing marker is the dark closing page
    doc=SimpleDocTemplate(str(path),pagesize=A4,rightMargin=20*mm,leftMargin=20*mm,topMargin=21*mm,bottomMargin=23*mm,title='Golden Jubilee ’76 — NIT Raipur',author='boroai.in')
    story=[]
    # Cover: purpose-designed typographic page
    story += [Spacer(1,78*mm),Paragraph('GOLDEN JUBILEE  •  THE CLASS OF 1976',styles['CoverEyebrow']),Spacer(1,3*mm),Paragraph('Golden Jubilee ’76',ParagraphStyle('ct',parent=styles['CoverTitle'],fontSize=33,leading=38,spaceAfter=0)),HRFlowable(width='26%',thickness=1,color=GOLD,hAlign='CENTER',spaceBefore=4*mm,spaceAfter=5*mm),Paragraph('Golden Jubilee Celebration · NIT Raipur',ParagraphStyle('cs',parent=styles['CoverSub'],fontSize=14,leading=18,spaceAfter=3)),Paragraph('A commemorative album of lives, friendships, family and memories',ParagraphStyle('cn',parent=styles['CoverNote'],fontSize=10.5,leading=15,spaceAfter=10)),Paragraph('1976&nbsp;&nbsp; — &nbsp;&nbsp;2026',ParagraphStyle('years',fontName='BookSerif',fontSize=17,leading=22,textColor=LIGHTGOLD,alignment=TA_CENTER)),Spacer(1,3*mm),Paragraph('NATIONAL INSTITUTE OF TECHNOLOGY · RAIPUR',ParagraphStyle('inst',fontName='BookSans-Bold',fontSize=6.5,leading=9,textColor=LIGHTGOLD,alignment=TA_CENTER)),Spacer(1,6*mm),Paragraph('E D I T E D &nbsp; B Y',ParagraphStyle('edl',fontName='BookSans-Bold',fontSize=6.5,leading=9,textColor=GOLD,alignment=TA_CENTER)),Spacer(1,1.5*mm),Paragraph('Bijon Dutta',ParagraphStyle('edn',fontName='BookSerif-Italic',fontSize=19,leading=24,textColor=colors.HexColor('#FFF2D3'),alignment=TA_CENTER))]
    story.append(PageBreak())
    # index
    story += [Paragraph('THE CONTRIBUTORS',styles['Section']),Paragraph('A lifetime, in names',styles['Display']),Paragraph('The contributor index as provided in the source compilation.',styles['BodyBook']),Spacer(1,4*mm)]
    rows=[]
    for i,p in enumerate(DATA['index']):
        rows.append([Paragraph(f'{i+1:02d}',ParagraphStyle('n'+str(i),fontName='BookSans',fontSize=8,textColor=GOLD)),Paragraph(esc(p['name']),styles['IndexName']),Paragraph(esc(p['branch']),styles['IndexBranch'])])
    tab=Table(rows,colWidths=[11*mm,83*mm,62*mm],repeatRows=0,hAlign='LEFT')
    tab.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'MIDDLE'),('LINEBELOW',(0,0),(-1,-1),.35,LINE),('LEFTPADDING',(0,0),(-1,-1),3),('RIGHTPADDING',(0,0),(-1,-1),5),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]));story.append(tab)
    story += [PageBreak()]
    for participant_index, p in enumerate(DATA['participants']):
        # Each alumnus starts on a fresh page, regardless of whether the previous
        # alumnus had any photographs or story text.
        if participant_index > 0:
            story.append(PageBreak())

        # opening page: use the first source photograph as the portrait
        story += [Paragraph('THE CLASS OF 1976  ·  AN ALUMNUS PROFILE',styles['Section'])]
        photo=p.get('photos',[])
        hero=img_flow(ROOT/'public'/photo[0]['src'].lstrip('/'),63*mm,78*mm) if photo else None
        identity=[]
        identity.append(Paragraph(esc(p['name']),styles['Name']))
        if p.get('nickname'):identity.append(Paragraph('“'+esc(p['nickname'])+'”',styles['SubName']))
        identity.append(Paragraph(esc(p.get('branch','')),styles['Meta']))
        identity.append(Paragraph(esc(p.get('location','')),styles['Meta']))
        if hero:
            hero_caption=photo[0].get('caption') or ''   # only the caption supplied in the source; never invented
            right=[hero]+([Paragraph(esc(hero_caption),styles['CaptionBook'])] if hero_caption else [])
            hero_table=Table([[identity,right]],colWidths=[83*mm,65*mm],hAlign='LEFT')
        else: hero_table=Table([[identity,'']],colWidths=[83*mm,65*mm])
        hero_table.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),6*mm),('TOPPADDING',(0,0),(-1,-1),3*mm),('BOTTOMPADDING',(0,0),(-1,-1),5*mm)]));story.append(hero_table)
        story.append(HRFlowable(width='100%',thickness=.8,color=GOLD,spaceBefore=5*mm,spaceAfter=4*mm))
        detailrows=[]
        for label,key in [('EDUCATION & QUALIFICATIONS','education'),('CURRENT LOCATION','location'),('EMAIL','email'),('PHONE','phone')]:
            detailrows.append([Paragraph(label,styles['Label']),Paragraph(esc(p.get(key,'') or '—'),styles['BodyBook'])])
        dt=Table(detailrows,colWidths=[43*mm,105*mm],hAlign='LEFT');dt.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LINEBELOW',(0,0),(-1,-1),.35,LINE),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),5*mm),('TOPPADDING',(0,0),(-1,-1),4*mm),('BOTTOMPADDING',(0,0),(-1,-1),2*mm)]));story.append(dt)
        # No forced break here: the story continues directly beneath the identity block and
        # flows onto following pages only when the page is genuinely full.
        story.append(Spacer(1,5*mm))
        story.append(Paragraph(esc(p['name'])+'  ·  THE STORY',styles['Section']))
        for key,title in [('career','Professional Journey'),('family','Family'),('memory','A Memory from College Days')]:
            txt=(p.get(key) or '').strip()
            if not has_meaningful_content(txt):continue
            heading=[Paragraph(esc(title),styles['StoryHead']),HRFlowable(width='28%',thickness=1,color=GOLD,hAlign='LEFT',spaceAfter=3*mm)]
            heading[0].keepWithNext=True; heading[1].keepWithNext=True
            story.extend(heading)
            # Paragraph objects naturally split across pages; preserve all source paragraphs/line breaks.
            for para in txt.split('\n'):
                if para.strip():story.append(Paragraph(esc(para),styles['BodyBook']))
                else:story.append(Spacer(1,2*mm))
            story.append(Spacer(1,3*mm))
        # Let photographs follow the story naturally instead of forcing a new page.
        # This recovers unused space while keeping all content within this alumnus.
        # The first photo is already used on the identity page; all remaining source
        # photos are retained, with their original captions and without cropping.
        photos = p.get('photos', [])[1:]
        photo_heading = [
            Paragraph(esc(p['name']) + '  ·  PHOTOGRAPHS & MEMORIES', styles['Section']),
            Paragraph('Moments, held close', styles['StoryHead']),
            HRFlowable(width='28%', thickness=1, color=GOLD, hAlign='LEFT', spaceAfter=4*mm),
        ]

        valid=[ph for ph in photos if (ROOT/'public'/ph['src'].lstrip('/')).exists()]
        if valid:
            story.append(PhotoGroup(valid, photo_heading))
    cream=colors.HexColor('#FFF4DD')
    story += [SetClosing(),PageBreak(),Spacer(1,107*mm),
        Paragraph('GOLDEN JUBILEE  ·  1976–2026',ParagraphStyle('ck',fontName='BookSans-Bold',fontSize=7.5,leading=11,textColor=LIGHTGOLD,alignment=TA_CENTER,spaceAfter=7)),
        Paragraph('Years pass.<br/><i>Friendship remains.</i>',ParagraphStyle('closing',fontName='BookSerif',fontSize=31,leading=37,textColor=cream,alignment=TA_CENTER,spaceAfter=6*mm)),
        HRFlowable(width='26%',thickness=1,color=GOLD,hAlign='CENTER',spaceAfter=6*mm),
        Paragraph('To the classmates, families and memories that made this journey extraordinary.',ParagraphStyle('closetext',fontName='BookSerif-Italic',fontSize=12,leading=17,textColor=colors.HexColor('#E7E1CF'),alignment=TA_CENTER,leftIndent=22*mm,rightIndent=22*mm,spaceAfter=7*mm)),
        Paragraph('NIT RAIPUR  ·  THE CLASS OF 1976',ParagraphStyle('cinst',fontName='BookSans-Bold',fontSize=6.5,leading=9,textColor=LIGHTGOLD,alignment=TA_CENTER)),
        Spacer(1,9*mm),
        Paragraph('E D I T E D &nbsp; B Y',ParagraphStyle('edl2',fontName='BookSans-Bold',fontSize=6.5,leading=9,textColor=GOLD,alignment=TA_CENTER)),
        Spacer(1,1.5*mm),
        Paragraph('Bijon Dutta',ParagraphStyle('edn2',fontName='BookSerif-Italic',fontSize=19,leading=24,textColor=cream,alignment=TA_CENTER))]
    doc.build(story,onFirstPage=bg_cover,onLaterPages=footer)

high=OUT/'golden-jubilee-high-resolution.pdf'; low=OUT/'golden-jubilee-low-resolution.pdf'
build_pdf(high)
# Recompress the high-resolution PDF with Ghostscript for a web-sharing version.
cmd=['gs','-sDEVICE=pdfwrite','-dCompatibilityLevel=1.5','-dPDFSETTINGS=/ebook','-dNOPAUSE','-dBATCH','-dQUIET',f'-sOutputFile={low}',str(high)]
if shutil.which('gs'): subprocess.run(cmd,check=True)
else:
    # Fallback when Ghostscript is unavailable: rebuild the sharing edition with downsampled photos.
    LOW_MODE=True; build_pdf(low); print('Ghostscript not found; low-resolution PDF built with downsampled images')
print('high',high.stat().st_size,'bytes','low',low.stat().st_size,'bytes')
