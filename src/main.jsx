import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import './styles.css';

// Fit a natural A4 page into the available reader viewport by scaling the whole sheet, never by distorting its aspect ratio.
function getViewerScale(){const vw=window.innerWidth||1200;const vh=window.innerHeight||900;let availableWidth;if(vw<=650)availableWidth=Math.min(vw-20,500);else if(vw<=900)availableWidth=vw-210;else availableWidth=Math.min(800,vw-320);const availableHeight=Math.max(420,vh-235);return Math.max(.35,Math.min(1,availableWidth/794,availableHeight/1123));}
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
  // Additional photographs: source order, up to two per row, each with its caption; a row moves to
  // the next page only if it cannot fit (even at the smallest size) in the space that remains.
  const extra=(p.photos||[]).slice(1);const rows=[];
  for(let i=0;i<extra.length;i+=2)rows.push(extra.slice(i,i+2));
  let headed=false;
  for(const row of rows){
    const maxW=row.length===1?120:75;
    // A row may shrink to squeeze into the space left on the current page only while every photo keeps at
    // least MIN_PHOTO_SCALE of its ideal (full-size) width; otherwise it moves to the next page at full size.
    const ideal=row.map(ph=>photoBox(sizes[ph.src]||{w:800,h:600},maxW,PHOTO_HEIGHTS[0]));
    const place=(pg,allowShrink)=>{for(const H of PHOTO_HEIGHTS){
      const big=row.every((ph,i)=>photoBox(sizes[ph.src]||{w:800,h:600},maxW,H).w>=ideal[i].w*MIN_PHOTO_SCALE);
      if(!big&&allowShrink)break;
      const item={type:'photos',photos:row,maxW,maxH:H,heading:!headed};if(fits(pg.first,[...pg.items,item])){pg.items.push(item);return true;}}return false;};
    if(!place(cur(),true)){newPage();if(!place(cur(),false))throw new Error(`A4 pagination could not fit photographs for ${p.name}.`);}
    headed=true;
  }
  return pages;
}
function footer(page,bookPage=true){return <div className="folio"><span>{bookPage?'GOLDEN JUBILEE • 1976–2026':'GOLDEN JUBILEE'}</span><span className="folio-number">{page}</span><a href="https://boroai.in" target="_blank" rel="noreferrer">boroai.in</a></div>}
function Page({children,n,className=''}){return <section className={`paper ${className}`}><div className="paper-frame">{children}{footer(n)}</div></section>}
function Cover({book,n}){return <Page n={n} className="cover-page"><div className="cover-ornament top">✦　✦　✦</div><div className="cover-inner"><div className="seal">50</div><p className="eyebrow">GOLDEN JUBILEE • THE CLASS OF 1976</p><h1>{book.title}</h1><div className="cover-rule"><span>✦</span></div><h2>{book.subtitle}</h2><p className="cover-note">A commemorative album of lives, friendships, family and memories</p><div className="cover-years">1976 <i>—</i> 2026</div><p className="cover-institution">NATIONAL INSTITUTE OF TECHNOLOGY · RAIPUR</p></div><div className="cover-ornament bottom">❧</div></Page>}
function IndexPage({data,n}){return <Page n={n} className="index-page"><div className="section-kicker">THE CONTRIBUTORS</div><h2 className="display-title">A lifetime, in names</h2><p className="intro-copy">Fifteen names in the contributor index; fourteen full profiles are present in the supplied compilation.</p><div className="index-grid">{data.index.map((p,i)=><div className="index-entry" key={p.name}><span className="index-no">{String(i+1).padStart(2,'0')}</span><div><strong>{p.name}</strong><small>{p.branch}</small></div><span className="index-line"/></div>)}</div><p className="editor-note">Bijan K. Dutta appears in the source index; a profile page and profile content were not present in the supplied Word compilation.</p></Page>}
function IdentityHead({p}){const photo=p.photos?.[0];return <><div className="identity-head"><div className="section-kicker">A LIFE IN THE MAKING · {p.branch||'GOLDEN JUBILEE BATCH'}</div><div className="identity-layout"><div className="identity-copy"><p className="profile-overline">THE CLASS OF 1976</p><h2 className="profile-name">{p.name}</h2>{p.nickname&&<p className="profile-nickname">“{p.nickname}”</p>}<div className="identity-meta"><span>{p.branch}</span><span>{p.location}</span></div></div>{photo&&<figure className="hero-photo"><img src={photo.src} alt={photo.alt}/>{photo.caption&&<figcaption>{photo.caption}</figcaption>}</figure>}</div></div><div className="profile-details"><div className="detail-item"><span>EDUCATION</span><p>{p.education||'—'}</p></div><div className="detail-item"><span>CURRENT LOCATION</span><p>{p.location||'—'}</p></div><div className="detail-item"><span>EMAIL</span><p>{p.email||'—'}</p></div><div className="detail-item"><span>PHONE</span><p>{p.phone||'—'}</p></div></div></>}
function FlowItem({p,item,sizes}){
  if(item.type==='text')return <section className={`flow-section${item.cont?' is-cont':''}`}><h2>{item.cont?`${item.title} · continued`:item.title}</h2><div className="gold-rule"/>{item.content.split(/\n\n/).map((para,i)=><p key={i}>{para}</p>)}</section>;
  return <div className="flow-photos">{item.heading&&<div className="flow-photos-head"><div className="section-kicker">PHOTOGRAPHS &amp; MEMORIES</div><h2>Moments, held close</h2><div className="gold-rule"/></div>}<div className="flow-photo-row">{item.photos.map(ph=>{const b=photoBox(sizes[ph.src]||{w:800,h:600},item.maxW,item.maxH);const cardW=Math.round(Math.max(b.w,50*MM)+30);return <figure className="photo-card" key={ph.src} style={{width:cardW}}><div className="photo-mat"><img src={ph.src} alt={ph.alt||p.name} style={{width:b.w,height:b.h}}/></div>{ph.caption&&<figcaption>{ph.caption}</figcaption>}</figure>})}</div></div>;
}
// One A4 page of an alumnus. The first page is the identity page; later pages carry the running header.
function ProfilePage({p,first,items,n,sizes}){return <Page n={n} className={`flow-page ${first?'identity-page':'story-page continuation-page'}`}>{first?<IdentityHead p={p}/>:<div className="story-running"><span>{p.name}</span><span>{p.branch}</span></div>}<div className="flow-body">{items.map((it,i)=><FlowItem key={i} p={p} item={it} sizes={sizes}/>)}</div></Page>}
function buildPages(data, plan){const pages=[{key:'cover',render:n=><Cover book={data.book} n={n}/>},{key:'index',render:n=><IndexPage data={data} n={n}/>}];
  for(const p of data.participants){
    (plan.profiles[p.participant_id]||[]).forEach((pg,i)=>pages.push({key:i===0?p.participant_id+'-identity':`${p.participant_id}-flow-${i}`,person:p.name,render:n=><ProfilePage p={p} first={pg.first} items={pg.items} n={n} sizes={plan.sizes}/>}));
  }
  pages.push({key:'closing',render:n=><Page n={n} className="closing-page"><div className="closing-content"><div className="seal small-seal">50</div><div className="section-kicker">GOLDEN JUBILEE · 1976–2026</div><h2>Years pass.<br/><em>Friendship remains.</em></h2><div className="cover-rule"><span>✦</span></div><p>To the classmates, families and memories that made this journey extraordinary.</p><strong>NIT RAIPUR · THE CLASS OF 1976</strong></div></Page>});
  return pages;
}
function App(){const [data,setData]=useState(null);const [fontsReady,setFontsReady]=useState(false);const [current,setCurrent]=useState(0);const [turn,setTurn]=useState(null);const [viewerScale,setViewerScale]=useState(()=>getViewerScale());const lock=useRef(false);const goRef=useRef(null);const pdfMode=new URLSearchParams(location.search).get('pdf')==='1';
 useEffect(()=>{const resize=()=>setViewerScale(getViewerScale());window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize)},[]);
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
 const pages=useMemo(()=>data&&measured?buildPages(data,measured):[],[data,measured]);
 const go=(dir)=>{if(lock.current)return;const target=current+dir;if(target<0||target>=pages.length)return;lock.current=true;setTurn({from:current,to:target,dir});setTimeout(()=>{setCurrent(target);setTurn(null);lock.current=false;},720)};goRef.current=go;
 useEffect(()=>{const f=e=>{if(e.key==='ArrowRight')goRef.current?.(1);if(e.key==='ArrowLeft')goRef.current?.(-1)};window.addEventListener('keydown',f);return()=>window.removeEventListener('keydown',f)},[]);
 if(!data||!measured)return <div className="loading">Preparing the Golden Jubilee album…</div>;
 if(pdfMode){document.title='Golden Jubilee ’76 — PDF';document.documentElement.classList.add('pdf-mode');document.body.classList.add('pdf-mode');return <main className="pdf-export">{pages.map((p,i)=><div className="pdf-sheet" key={p.key}>{p.render(i+1)}</div>)}</main>}
 const shown=turn?turn.to:current;return <div className="app-shell"><header className="site-header"><div><span className="site-kicker">NIT RAIPUR · BATCH OF 1976</span><h1>Golden Jubilee <span>’76</span></h1></div><div className="header-actions"><a href="/golden-jubilee-high-resolution.pdf" download>PRINT PDF ↗</a><a href="/golden-jubilee-low-resolution.pdf" download>SHARE PDF ↓</a></div></header><div className="reader-layout"><aside className="contents"><div className="contents-title">IN THIS ALBUM</div><button className={current===0?'selected':''} onClick={()=>setCurrent(0)}>Cover <span>01</span></button><button className={current===1?'selected':''} onClick={()=>setCurrent(1)}>Contributors <span>02</span></button>{data.participants.map(p=>{const idx=pages.findIndex(x=>x.key===p.participant_id+'-identity');return <button key={p.participant_id} className={current===idx?'selected':''} onClick={()=>setCurrent(idx)}>{p.name}<span>{String(idx+1).padStart(2,'0')}</span></button>})}</aside><main className="stage"><div className="book-viewport" style={{width:`${794*viewerScale}px`,height:`${1123*viewerScale}px`,"--viewer-scale":viewerScale}}><div className="book" aria-label="Golden Jubilee flipbook"><div className="page-layer base">{pages[shown].render(shown+1)}</div>{turn&&<div className={`page-layer turn ${turn.dir>0?'next':'prev'}`}>{pages[turn.from].render(turn.from+1)}</div>}</div></div><div className="controls"><button onClick={()=>go(-1)} disabled={current===0||!!turn} aria-label="Previous page">‹</button><span>PAGE {String(current+1).padStart(2,'0')} <i>/</i> {pages.length}</span><button onClick={()=>go(1)} disabled={current===pages.length-1||!!turn} aria-label="Next page">›</button></div></main></div><footer className="site-footer"><span>Preserving the stories of a remarkable batch.</span><a href="https://boroai.in" target="_blank" rel="noreferrer">boroai.in</a></footer></div>}
createRoot(document.getElementById('root')).render(<App/>);
