from docx import Document
from docx.oxml.ns import qn
from pathlib import Path
from PIL import Image
from lxml import etree
import json, re, argparse
from lxml import etree
parser=argparse.ArgumentParser(description='Extract profile data and photographs from the curated Word compilation.')
parser.add_argument('source_docx', help='Path to the curated Word compilation .docx')
args=parser.parse_args()
src=Path(args.source_docx).expanduser().resolve()
root=Path(__file__).resolve().parents[1]
assets=root/'public'/'assets'/'profiles'
assets.mkdir(parents=True,exist_ok=True)
doc=Document(src)
# Index names/branches
index=[]
for row in doc.tables[0].rows[1:]:
    vals=[c.text.strip() for c in row.cells]
    if len(vals)>=3 and vals[1]: index.append({'number':vals[0].strip('. '),'name':vals[1],'branch':vals[2]})
profiles=[]
field_map={'Full Name':'name','Nick Name':'nickname','Branch':'branch','Email':'email','Phone':'phone','Current Location':'location','Educational Qualification':'education','Professional':'career','Family':'family','Memory from College Days':'memory'}
# profile detail tables every other table starting at 1; following table is photo table
for ti in range(1,len(doc.tables),2):
    t=doc.tables[ti]
    fields={}
    for row in t.rows:
        if len(row.cells)>=2:
            k=row.cells[0].text.strip().replace('\n',' ')
            v=row.cells[1].text.strip()
            if k in field_map: fields[field_map[k]]=v
    if not fields.get('name'): continue
    slug=re.sub(r'[^a-z0-9]+','-',fields['name'].lower()).strip('-')
    pdir=assets/slug; pdir.mkdir(parents=True,exist_ok=True)
    photos=[]
    pti=ti+1
    if pti < len(doc.tables):
        pt=doc.tables[pti]
        # Captions are often Word textboxes attached to the photo table, not ordinary table-cell text.
        xmlroot=etree.fromstring(pt._tbl.xml.encode('utf-8'))
        ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        table_captions=[]
        for textbox in xmlroot.xpath('.//w:txbxContent',namespaces=ns):
            cap=' '.join((node.text or '').strip() for node in textbox.xpath('.//w:t',namespaces=ns) if (node.text or '').strip())
            cap=' '.join(cap.split())
            if cap and cap not in table_captions: table_captions.append(cap)
        seen=set()
        for ri,row in enumerate(pt.rows):
            for ci,cell in enumerate(row.cells):
                # Get images and textbox caption text in this cell
                blips=cell._tc.xpath('.//a:blip')
                celltexts=cell._tc.xpath('.//w:txbxContent//w:t | .//w:p[not(ancestor::w:txbxContent)]//w:t')
                caption=' '.join(''.join(x.itertext()).strip() for x in [])
                raw=' '.join((x.text or '').strip() for x in celltexts if (x.text or '').strip())
                # Remove duplicated textbox strings from AlternateContent branches
                bits=[]
                for bit in re.split(r'(?<=[.!?])\s+|\n+',raw):
                    bit=bit.strip()
                    if bit and bit not in bits: bits.append(bit)
                caption=' '.join(bits)
                # Word alternate-content textboxes often duplicate their visible caption.
                words=caption.split()
                if len(words)%2==0 and words[:len(words)//2]==words[len(words)//2:]:
                    caption=' '.join(words[:len(words)//2])
                for blip in blips:
                    rid=blip.get(qn('r:embed'))
                    if not rid or rid in seen: continue
                    seen.add(rid)
                    part=doc.part.related_parts.get(rid)
                    if not part: continue
                    ext=part.content_type.split('/')[-1].replace('jpeg','jpg')
                    if ext not in ('jpg','png','gif','webp','bmp'): ext='jpg'
                    fn=f'photo-{len(photos)+1}.{ext}'
                    dest=pdir/fn
                    dest.write_bytes(part.blob)
                    # captions are often in cell textboxes; keep the entire label
                    cap=caption
                    # Strip profile-name label prefixes only if it's just a title
                    if cap.lower() in {fields['name'].lower()+': now', fields['name'].lower()+': then', fields['name'].lower()+' now', fields['name'].lower()+' then'}: cap=''
                    photos.append({'src':f'/assets/profiles/{slug}/{fn}','caption':cap,'alt':fields['name']+' photograph '+str(len(photos)+1),'order':len(photos)+1})
        # Caption textboxes in the Word source are ordered alongside the photos. Use the full textbox caption when available.
        if len(table_captions)==len(photos):
            for j,ph in enumerate(photos):
                cap=table_captions[j]
                cap=cap.replace('P awan Jain','Pawan Jain').replace('P awan J ain','Pawan Jain').replace('S cene s','Scenes').replace('A lso','Also')
                ph['caption']=cap
    fields['nickname']='' if fields.get('nickname','').strip() in ('--','-','—') else fields.get('nickname','').strip()
    fields['participant_id']=slug
    fields['photos']=photos
    profiles.append(fields)
# sort profiles alphabetically; index preserved from source and sort alphabetically for site
profiles.sort(key=lambda p:p['name'].casefold())
index_sorted=sorted(index,key=lambda p:p['name'].casefold())
# include all source fields, no rewrites
payload={'book':{'title':'Golden Jubilee ’76','subtitle':'Golden Jubilee Celebration • NIT Raipur','years':'1976–2026','institution':'National Institute of Technology Raipur','website':'boroai.in'},'index':index_sorted,'participants':profiles,'sourceAudit':{'sourceDocument':'Compilation of GForm Inputs from Contributors - Vol 3.docx','sourcePages':33,'indexEntries':len(index),'profilesExtracted':len(profiles),'photographsExtracted':sum(len(p['photos']) for p in profiles),'indexOnlyEntries':[x for x in index_sorted if not any(p['name'].casefold()==x['name'].casefold() for p in profiles)]}}
(root/'public'/'public_data.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf-8')
(root/'public_data.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(payload['sourceAudit'],ensure_ascii=False,indent=2))
for p in profiles: print(p['name'],len(p['photos']),[(x['caption'][:45]) for x in p['photos']])
