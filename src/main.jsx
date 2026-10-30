import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import './styles.css';

const PAGE_W=794, PAGE_H=1123;

// Scale the whole A4 sheet to fit the available reader area (never distort aspect ratio).
function getViewerScale(fullPage=false, sidebarOpen=true){
  const vw=window.innerWidth||1200;
  const vh=window.innerHeight||900;
  const shellPad=vw<=650?20:36;
  const sidebar=sidebarOpen&&vw>650?(vw<=900?167:248):0;
  const shellW=Math.min(vw,1680);
  let availableWidth, reservedY;
  if(fullPage){
    availableWidth=Math.max(260,shellW-shellPad*2-sidebar);
    reservedY=vw<=650?210:198;
  }else{
    if(vw<=650)availableWidth=Math.min(vw-20,500);
    else availableWidth=Math.min(800,Math.max(260,shellW-shellPad*2-sidebar));
    reservedY=235;
  }
  const availableHeight=Math.max(300,vh-reservedY);
  const scale=Math.min(availableWidth/PAGE_W,availableHeight/PAGE_H);
  return Math.max(.32, fullPage?scale:Math.min(1,scale));
}
function scaleFromRect(width,height,{margin=16,max=2.5}={}){
  const w=Math.max(200,width-margin);
  const h=Math.max(200,height-margin);
  const scale=Math.min(w/PAGE_W,h/PAGE_H);
  return Math.max(.28,Math.min(max,scale));
}
function NavPanelIcon({open}){
  return <svg className="nav-tab-svg" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M9 4v16" stroke="currentColor" strokeWidth="1.5"/><path fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d={open?'M12 9l3 3-3 3':'M15 9l-3 3 3 3'}/><path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M5.5 8.5h2M5.5 12h2M5.5 15.5h1.5"/></svg>;
}
function FullscreenIcon({exit}){
  const d=exit?'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5':'M4 9V4h5M15 4h5v5M4 15v5h5M15 20h5v-5';
  return <svg className="fs-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function CompactIcon(){
  return <svg className="fs-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8"/><rect x="7.5" y="6.5" width="9" height="11" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1.8"/></svg>;
}
function cleanText(s=''){return String(s).replace(/\r/g,'').trim();}
function hasMeaningfulContent(s=''){const t=cleanText(s);return !!t && !/^(?:[-–—_•.\s]|n\/?a|none|not applicable)+$/i.test(t);}
// ---- Compact per-alumnus flow --------------------------------------------------------------
// Every alumnus starts on a fresh A4 page (the identity page). Everything that follows for that
// alumnus - Professional Journey, Family, A Memory from College Days and the extra photographs -
// flows continuously into whatever space is left, page after page, with no forced page breaks.
// Pages are measured in the browser at the real A4 geometry, so a page is only closed when it is
// genuinely full. Source text is tokenised with whitespace preserved, so joining the chunks
// reproduces it exactly (verified below).
const MM=96/25.4;
const STORY_FIELDS=[['career','Professional Journey'],['family','Family'],['memory','A Memory from College Days']];
const FOOTER_GAP=10;            // px kept clear between the last line and the footer rule
const MIN_TOKENS_ON_PAGE=30;    // never strand a heading with only a line or two at the page bottom
const PHOTO_HEIGHTS=[105,92,80,70,60,52,44]; // mm - largest that fits the space left is used
const FRESH_HEIGHTS=[250,230,210,190,170,150,135,120,108,96,86,76,68,60]; // mm - tried largest first on a fresh page
const PAIR_W=72, SINGLE_W=158; // mm - max photo width for a two-up row / a full-width row
const MIN_PHOTO_SCALE=.85;     // photos are never shrunk below 85% of ideal just to squeeze onto a page
function loadImageSizes(data){
  const srcs=new Set();data.participants.forEach(p=>(p.photos||[]).forEach(ph=>srcs.add(ph.src)));
  const sizes={};
  return Promise.all([...srcs].map(src=>new Promise(res=>{const im=new Image();im.onload=()=>{sizes[src]={w:im.naturalWidth||800,h:im.naturalHeight||600};res();};im.onerror=()=>{sizes[src]={w:800,h:600};res();};im.src=src;}))).then(()=>sizes);
}
// Photographs are always shown whole (never cropped): scaled to fit a width/height box.
function photoBox(size,maxWmm,maxHmm){const sc=Math.min(maxWmm*MM/size.w,maxHmm*MM/size.h,2);return {w:Math.round(size.w*sc),h:Math.round(size.h*sc)};}
function planProfile(p,sizes,host,root){
  const fits=(first,items)=>{
    flushSync(()=>root.render(<ProfilePage p={p} first={first} items={items} n={1} sizes={sizes}/>));
    const body=host.querySelector('.flow-body');const folio=host.querySelector('.folio');
    if(!body||!folio)return false;
    return body.getBoundingClientRect().bottom<=folio.getBoundingClientRect().top-FOOTER_GAP;
  };
  const pages=[{first:true,items:[]}];
  const cur=()=>pages[pages.length-1];
  const newPage=()=>pages.push({first:false,items:[]});
  const joined={};
  for(const [key,title] of STORY_FIELDS){
    const text=cleanText(p[key]);if(!hasMeaningfulContent(text))continue;
    const tokens=text.match(/\S+\s*|\s+/g)||[text];
    let off=0,cont=false;joined[key]='';
    while(off<tokens.length){
      const pg=cur();const rem=tokens.length-off;
      const mk=k=>({type:'text',key,title,cont,content:tokens.slice(off,off+k).join('')});
      if(fits(pg.first,[...pg.items,mk(rem)])){pg.items.push(mk(rem));joined[key]+=mk(rem).content;off=tokens.length;break;}
      let lo=1,hi=rem-1,best=0;
      while(lo<=hi){const mid=(lo+hi)>>1;if(fits(pg.first,[...pg.items,mk(mid)])){best=mid;lo=mid+1;}else hi=mid-1;}
      if(best<Math.min(rem,MIN_TOKENS_ON_PAGE)&&(pg.items.length>0||pg.first)){newPage();continue;}
      if(best===0)throw new Error(`A4 pagination could not fit content for ${p.name} - ${title}.`);
      // Prefer ending the page at a line/paragraph boundary when one is close to the limit.
      let cut=best;const floorCut=Math.max(1,Math.floor(best*.85));
      for(let j=best;j>=floorCut;j--){if(/\n\s*$/.test(tokens[off+j-1]||'')){cut=j;break;}}
      const chunk=mk(cut);pg.items.push(chunk);joined[key]+=chunk.content;off+=cut;cont=true;newPage();
    }
    if(joined[key]!==text)throw new Error(`Pagination changed source text for ${p.name} - ${title}`);
  }
  // Additional photographs, always in source order.
  // 1) Leftover space on the current page is used first (a pair may shrink only to MIN_PHOTO_SCALE).
  // 2) Otherwise a fresh page is started and the remaining photographs are laid out as LARGE as that page
  //    allows: as many photographs as fit with a decent minimum size, either one per row (full width) or
  //    two per row, whichever gives the bigger photographs. Photographs are never cropped.
  const extra=(p.photos||[]).slice(1);
  let headed=false,idx=0;
  const sz=ph=>sizes[ph.src]||{w:800,h:600};
  const mkItem=(row,maxW,H,heading)=>({type:'photos',photos:row,maxW,maxH:H,heading});
  const areaMm2=(ph,maxW,H)=>{const b=photoBox(sz(ph),maxW,H);return b.w*b.h/(MM*MM);};
  while(idx<extra.length){
    const pair=extra.slice(idx,idx+2);
    let placed=false;
    const canSqueeze=cur().items.length>0||cur().first;
    if(canSqueeze){
      const tryPlace=(row,rowMaxW,heights)=>{
        const rowIdeal=row.map(ph=>photoBox(sz(ph),rowMaxW,heights[0]));
        for(const H of heights){
          const big=row.every((ph,i)=>photoBox(sz(ph),rowMaxW,H).w>=rowIdeal[i].w*MIN_PHOTO_SCALE);
          if(!big)break;
          const item=mkItem(row,rowMaxW,H,!headed);
          if(fits(cur().first,[...cur().items,item]))return {item,n:row.length,area:row.reduce((a,ph)=>a+areaMm2(ph,rowMaxW,H),0)};
        }
        return null;
      };
      // A full-width photograph is used when leftover page space would otherwise
      // leave the two-up row small. The next photograph continues on the following page.
      const tall=[200,180,160,140,130,120,110,...PHOTO_HEIGHTS];
      const one=tryPlace([extra[idx]],SINGLE_W,tall);
      const two=pair.length===2?tryPlace(pair,PAIR_W,PHOTO_HEIGHTS):null;
      const pick=one&&two?(one.area>two.area/2*1.35?one:two):(one||two);
      if(pick){cur().items.push(pick.item);headed=true;idx+=pick.n;placed=true;}
    }
    if(placed)continue;
    // A fresh page holds one photograph at the largest size that fits, so a pair is not
    // left side by side with empty page beneath it.
    if(cur().items.length>0||cur().first)newPage();
    const pg=cur();
    let chosen=null;
    for(const H of FRESH_HEIGHTS){
      const item=mkItem([extra[idx]],SINGLE_W,H,!headed);
      if(fits(pg.first,[...pg.items,item])){chosen={items:[item],k:1};break;}
    }
    if(!chosen)throw new Error(`A4 pagination could not fit photographs for ${p.name}.`);
    chosen.items.forEach(it=>pg.items.push(it));headed=true;idx+=chosen.k;
    if(idx<extra.length)newPage();
  }
  return pages;
}
function footer(page,bookPage=true){return <div className="folio"><span>{bookPage?'GOLDEN JUBILEE • 1976–2026':'GOLDEN JUBILEE'}</span><span className="folio-number">{page}</span><span className="folio-contact"><a href="mailto:pramit.b.dutta@gmail.com">pramit.b.dutta@gmail.com</a><span className="folio-sep">|</span><a href="https://boroai.in" target="_blank" rel="noreferrer">boroai.in</a></span></div>}
function Page({children,n,className=''}){return <section className={`paper ${className}`}><div className="paper-frame">{children}{footer(n)}</div></section>}
function Cover({book,n}){return <Page n={n} className="cover-page"><img className="cover-gate" src="/assets/cover/campus-gate.webp" alt="" aria-hidden="true"/><div className="cover-ornament top">✦　✦　✦</div><div className="cover-inner"><div className="seal"><span>50</span></div><p className="eyebrow">GOLDEN JUBILEE • THE CLASS OF 1976</p><h1>{book.title}</h1><div className="cover-rule"><span>✦</span></div><h2>{book.subtitle}</h2><p className="cover-note">A commemorative album of lives, friendships, family and memories</p><div className="cover-years">1976 <i>—</i> 2026</div><p className="cover-institution">NATIONAL INSTITUTE OF TECHNOLOGY · RAIPUR</p><div className="cover-editor"><span className="cover-editor-label">Edited by</span><span className="cover-editor-name">Bijon Dutta</span></div></div></Page>}
const readerJumpRef={current:null};
function IndexPage({entries,n,continued=false,part=1,totalParts=1,pdfLinks=false,offset=0}){
  return <Page n={n} className="index-page"><div className="section-kicker">THE CONTRIBUTORS</div><h2 className="display-title">{continued?'Contributors · continued':'A lifetime, in names'}</h2><p className="intro-copy">{pdfLinks?'Tap a name to jump to that profile.':'Tap a name to open that profile.'}{totalParts>1?` Part ${part} of ${totalParts}.`:''}</p><div className="index-grid">{entries.map((e,i)=>{
    const no=String(offset+i+1).padStart(2,'0');
    const inner=<><span className="index-no">{no}</span><div><strong>{e.name}</strong><small>{e.branch}</small></div><span className="index-folio">{String(e.folio).padStart(2,'0')}</span><span className="index-line"/></>;
    if(pdfLinks&&e.id)return <a className="index-entry index-entry-link" href={`#${e.id}`} key={e.id}>{inner}</a>;
    return <button type="button" className="index-entry index-entry-link" key={e.id||e.name} onClick={()=>readerJumpRef.current?.(e.id)}>{inner}</button>;
  })}</div></Page>;
}
function chunkList(list,size){const out=[];for(let i=0;i<list.length;i+=size)out.push(list.slice(i,i+size));return out.length?out:[[]];}
function IdentityHead({p}){const photo=p.photos?.[0];return <><div className="identity-head"><div className="section-kicker">A LIFE IN THE MAKING · {p.branch||'GOLDEN JUBILEE BATCH'}</div><div className="identity-layout"><div className="identity-copy"><p className="profile-overline">THE CLASS OF 1976</p><h2 className="profile-name">{p.name}</h2>{p.nickname&&<p className="profile-nickname">“{p.nickname}”</p>}<div className="identity-meta"><span>{p.branch}</span><span>{p.location}</span></div></div>{photo&&<figure className="hero-photo"><img src={photo.src} alt={photo.alt}/>{photo.caption&&<figcaption>{photo.caption}</figcaption>}</figure>}</div></div><div className="profile-details"><div className="detail-item"><span>EDUCATION</span><p>{p.education||'—'}</p></div><div className="detail-item"><span>CURRENT LOCATION</span><p>{p.location||'—'}</p></div><div className="detail-item"><span>EMAIL</span><p>{p.email||'—'}</p></div><div className="detail-item"><span>PHONE</span><p>{p.phone||'—'}</p></div></div></>}
function FlowItem({p,item,sizes}){
  if(item.type==='text')return <section className={`flow-section${item.cont?' is-cont':''}`}><h2>{item.cont?`${item.title} · continued`:item.title}</h2><div className="gold-rule"/>{item.content.split(/\n\n/).map((para,i)=><p key={i}>{para}</p>)}</section>;
  return <div className="flow-photos">{item.heading&&<div className="flow-photos-head"><div className="section-kicker">PHOTOGRAPHS &amp; MEMORIES</div><h2>Moments, held close</h2><div className="gold-rule"/></div>}<div className="flow-photo-row">{item.photos.map(ph=>{const b=photoBox(sizes[ph.src]||{w:800,h:600},item.maxW,item.maxH);const cardW=Math.round(Math.max(b.w,50*MM)+30);return <figure className="photo-card" key={ph.src} style={{width:cardW}}><div className="photo-mat"><img src={ph.src} alt={ph.alt||p.name} style={{width:b.w,height:b.h}}/></div>{ph.caption&&<figcaption>{ph.caption}</figcaption>}</figure>})}</div></div>;
}
// One A4 page of an alumnus. The first page is the identity page; later pages carry the running header.
function ProfilePage({p,first,items,n,sizes}){return <Page n={n} className={`flow-page ${first?'identity-page':'story-page continuation-page'}`}>{first?<IdentityHead p={p}/>:<div className="story-running"><span>{p.name}</span><span>{p.branch}</span></div>}<div className="flow-body">{items.map((it,i)=><FlowItem key={i} p={p} item={it} sizes={sizes}/>)}</div></Page>}
function buildPages(data, plan,{pdfLinks=false}={}){
  const pages=[{key:'cover',render:n=><Cover book={data.book} n={n}/>}];
  for(const p of data.participants){
    (plan.profiles[p.participant_id]||[]).forEach((pg,i)=>pages.push({key:i===0?p.participant_id+'-identity':`${p.participant_id}-flow-${i}`,person:p.name,pdfAnchor:i===0?p.participant_id:null,outlineTitle:i===0?p.name:null,render:n=><ProfilePage p={p} first={pg.first} items={pg.items} n={n} sizes={plan.sizes}/>}));
  }
  pages.push({key:'closing',render:n=><Page n={n} className="closing-page"><div className="closing-content"><div className="seal"><span>50</span></div><div className="closing-kicker">GOLDEN JUBILEE · 1976–2026</div><h2>Years pass.<br/><em>Friendship remains.</em></h2><div className="cover-rule"><span>✦</span></div><p>To the classmates, families and memories that made this journey extraordinary.</p><strong>NIT RAIPUR · THE CLASS OF 1976</strong><div className="cover-editor"><span className="cover-editor-label">Edited by</span><span className="cover-editor-name">Bijon Dutta</span></div></div></Page>});
  const indexEntries=data.participants.map(p=>({id:p.participant_id,name:p.name,branch:p.branch||''}));
  const indexChunkSize=26;
  const indexChunks=chunkList(indexEntries,indexChunkSize);
  const totalParts=indexChunks.length;
  indexChunks.reverse().forEach((chunk,ci)=>{
    const part=totalParts-ci;
    const offset=(part-1)*indexChunkSize;
    pages.splice(1,0,{key:totalParts===1?'index':`index-${part}`,render:n=><IndexPage entries={chunk.map(e=>({...e,folio:pages.findIndex(x=>x.key===e.id+'-identity')+1}))} n={n} continued={part>1} part={part} totalParts={totalParts} pdfLinks={pdfLinks} offset={offset}/>});
  });
  return pages;
}
function App(){const [data,setData]=useState(null);const [fontsReady,setFontsReady]=useState(false);const [current,setCurrent]=useState(0);const [turn,setTurn]=useState(null);const [navOpen,setNavOpen]=useState(()=>typeof window!=='undefined'&&window.innerWidth>650);const [fitScale,setFitScale]=useState(()=>getViewerScale(false,typeof window!=='undefined'&&window.innerWidth>650));const [fullScale,setFullScale]=useState(()=>getViewerScale(true,typeof window!=='undefined'&&window.innerWidth>650));const [fullFitScale,setFullFitScale]=useState(null);const [zoom,setZoom]=useState(1);const [pageView,setPageView]=useState('fit');const [nativeFs,setNativeFs]=useState(false);const lock=useRef(false);const goRef=useRef(null);const pageScrollRef=useRef(null);const readerRootRef=useRef(null);const pdfMode=new URLSearchParams(location.search).get('pdf')==='1';
 const fillViewport=pageView==='full'||nativeFs;
 useEffect(()=>{const sync=()=>{const active=!!document.fullscreenElement&&document.fullscreenElement===readerRootRef.current;setNativeFs(active);if(!active)setPageView(v=>v==='full'?'fit':v);};document.addEventListener('fullscreenchange',sync);return()=>document.removeEventListener('fullscreenchange',sync);},[]);
 const toggleNativeFullscreen=async()=>{
  const el=readerRootRef.current;
  if(!el)return;
  try{
    if(document.fullscreenElement===el){await document.exitFullscreen();return;}
    setPageView('full');setZoom(1);
    if(typeof window!=='undefined'&&window.innerWidth>650)setNavOpen(false);
    await el.requestFullscreen();
  }catch{setPageView('full');setZoom(1);}
 };
 const exitToCompact=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();}catch{}setPageView('fit');setZoom(1);};
 useEffect(()=>{const resize=()=>{setFitScale(getViewerScale(false,navOpen));setFullScale(getViewerScale(true,navOpen));};resize();window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize)},[navOpen]);
 useEffect(()=>{fetch('/public_data.json').then(r=>r.json()).then(setData).catch(()=>setData(window.BOOK_DATA||null));},[]);
 const [measured,setMeasured]=useState(null);
 useEffect(()=>{if(!data)return;let cancelled=false;
  const host=document.createElement('div');host.className='pagination-probe';document.body.appendChild(host);
  const root=createRoot(host);
  const measure=async()=>{
    await document.fonts.ready;
    if(cancelled)return;
    const sizes=await loadImageSizes(data);
    if(cancelled)return;
    const profiles={};
    for(const p of data.participants){profiles[p.participant_id]=planProfile(p,sizes,host,root);}
    const result={profiles,sizes};
    root.unmount();host.remove();if(!cancelled)setMeasured(result);
  };measure();return()=>{cancelled=true;};
 },[data]);
 const pages=useMemo(()=>data&&measured?buildPages(data,measured,{pdfLinks:pdfMode}):[],[data,measured,pdfMode]);
 useEffect(()=>{
  if(!fillViewport||!pages.length){setFullFitScale(null);return;}
  const el=pageScrollRef.current;
  if(!el)return;
  const measure=()=>setFullFitScale(scaleFromRect(el.clientWidth,el.clientHeight));
  measure();
  const ro=new ResizeObserver(measure);
  ro.observe(el);
  return()=>ro.disconnect();
 },[fillViewport,navOpen,pages.length]);
 useEffect(()=>{
  if(!fillViewport||!pages.length)return;
  const t=window.setTimeout(()=>{
    const el=pageScrollRef.current;
    if(el)setFullFitScale(scaleFromRect(el.clientWidth,el.clientHeight));
  },280);
  return()=>window.clearTimeout(t);
 },[navOpen,fillViewport,pages.length]);
 const zoomBy=f=>setZoom(z=>Math.min(3,Math.max(.5,+(z*f).toFixed(3))));
 const baseScale=fillViewport?(fullFitScale??fullScale):fitScale;
 const eff=baseScale*zoom;
 const go=(dir)=>{if(lock.current)return;const target=current+dir;if(target<0||target>=pages.length)return;lock.current=true;setTurn({from:current,to:target,dir});setTimeout(()=>{setCurrent(target);setTurn(null);lock.current=false;},720)};goRef.current=go;
 useEffect(()=>{const f=e=>{if(e.metaKey||e.ctrlKey||e.altKey)return;if(e.key==='ArrowRight')goRef.current?.(1);if(e.key==='ArrowLeft')goRef.current?.(-1);if(e.key==='+'||e.key==='=')zoomBy(1.25);if(e.key==='-'||e.key==='_')zoomBy(1/1.25);if(e.key==='0')setZoom(1)};window.addEventListener('keydown',f);return()=>window.removeEventListener('keydown',f)},[]);
 useEffect(()=>{const w=e=>{if(!(e.ctrlKey||e.metaKey)||!e.target.closest?.('.page-scroll'))return;e.preventDefault();zoomBy(e.deltaY<0?1.1:1/1.1)};window.addEventListener('wheel',w,{passive:false});return()=>window.removeEventListener('wheel',w)},[]);
 if(!data||!measured)return <div className="loading">Preparing the Golden Jubilee album…</div>;
 if(pdfMode){document.title='Golden Jubilee ’76 — PDF';document.documentElement.classList.add('pdf-mode');document.body.classList.add('pdf-mode');return <main className="pdf-export">{pages.map((p,i)=><div className="pdf-sheet" key={p.key} id={p.pdfAnchor||undefined} data-outline={p.outlineTitle||undefined}>{p.render(i+1)}</div>)}</main>}
 const shown=turn?turn.to:current;const jumpTo=idx=>{if(idx<0)return;setCurrent(idx);if(typeof window!=='undefined'&&window.innerWidth<=650)setNavOpen(false);};readerJumpRef.current=id=>{const idx=pages.findIndex(x=>x.key===id+'-identity');if(idx>=0)jumpTo(idx);};const shellClass=`app-shell${fillViewport?' reader-fullpage':''}${nativeFs?' reader-native-fs':''}${navOpen?' nav-open':' nav-collapsed'}`;return <div className={shellClass} ref={readerRootRef}><header className="site-header"><div className="header-leading"><button type="button" className={`nav-tab-toggle${navOpen?' is-open':''}`} onClick={()=>setNavOpen(o=>!o)} aria-expanded={navOpen} aria-controls="album-nav" title={navOpen?'Hide participant list':'Show participant list'}><NavPanelIcon open={navOpen}/><span className="nav-tab-label">Participants</span></button><div className="header-title"><h1>Golden Jubilee <span>’76</span><span className="header-place">NIT Raipur</span></h1></div></div><div className="header-actions">{!nativeFs?<a href="/golden-jubilee-high-resolution.pdf?v=links" download="golden-jubilee-high-resolution.pdf">DOWNLOAD PDF ↓</a>:null}<button type="button" className="fs-exit-btn" onClick={toggleNativeFullscreen} hidden={!nativeFs}>Exit full screen</button></div></header><button type="button" className="nav-backdrop" aria-label="Close participant list" onClick={()=>setNavOpen(false)}/><div className="reader-layout"><aside id="album-nav" className="contents"><div className="contents-title">IN THIS ALBUM</div><button className={current===0?'selected':''} onClick={()=>jumpTo(0)}>Cover <span>01</span></button>{pages.findIndex(x=>x.key==='index'||x.key.startsWith('index-'))>=0?<button className={/^index/.test(pages[current]?.key||'')?'selected':''} onClick={()=>jumpTo(pages.findIndex(x=>x.key==='index'||x.key.startsWith('index-')))}>Contributors <span>{String(pages.findIndex(x=>x.key==='index'||x.key.startsWith('index-'))+1).padStart(2,'0')}</span></button>:null}{data.participants.map(p=>{const idx=pages.findIndex(x=>x.key===p.participant_id+'-identity');return <button key={p.participant_id} className={current===idx?'selected':''} onClick={()=>jumpTo(idx)}>{p.name}<span>{String(idx+1).padStart(2,'0')}</span></button>})}</aside><main className="stage"><div className="page-scroll" ref={pageScrollRef}><div className="book-viewport" style={{width:`${794*eff}px`,height:`${1123*eff}px`,"--viewer-scale":eff}}><div className="book" aria-label="Golden Jubilee flipbook"><div className="page-layer base">{pages[shown].render(shown+1)}</div>{turn&&<div className={`page-layer turn ${turn.dir>0?'next':'prev'}`}>{pages[turn.from].render(turn.from+1)}</div>}</div></div></div><div className="controls"><button onClick={()=>go(-1)} disabled={current===0||!!turn} aria-label="Previous page">‹</button><span>PAGE {String(current+1).padStart(2,'0')} <i>/</i> {pages.length}</span><button onClick={()=>go(1)} disabled={current===pages.length-1||!!turn} aria-label="Next page">›</button><div className="view-controls"><button type="button" className={`fs-toggle${pageView==='fit'&&!nativeFs?' active':''}`} onClick={exitToCompact} aria-label="Compact" title="Compact page size"><CompactIcon/></button><button type="button" className={`fs-toggle${nativeFs||pageView==='full'?' active':''}`} onClick={toggleNativeFullscreen} aria-label={nativeFs?'Exit full screen':'Full screen'} title={nativeFs?'Exit full screen (Esc)':'Full screen — hides the browser bar'}><FullscreenIcon exit={nativeFs}/></button></div><div className="zoom-controls"><button onClick={()=>zoomBy(1/1.25)} disabled={zoom<=.5} aria-label="Zoom out" title="Zoom out (-)">−</button><button className="zoom-reset" onClick={()=>setZoom(1)} title="Reset zoom (0)">{Math.round(eff*100)}%</button><button onClick={()=>zoomBy(1.25)} disabled={zoom>=3} aria-label="Zoom in" title="Zoom in (+)">+</button></div></div></main></div><footer className="site-footer"><span>Preserving the stories of a remarkable batch.</span><span className="folio-contact"><a href="mailto:pramit.b.dutta@gmail.com">pramit.b.dutta@gmail.com</a><span className="folio-sep">|</span><a href="https://boroai.in" target="_blank" rel="noreferrer">boroai.in</a></span></footer></div>}
createRoot(document.getElementById('root')).render(<App/>);
