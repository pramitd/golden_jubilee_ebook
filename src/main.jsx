import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import './styles.css';

const fields=[['education','Education & Qualifications'],['career','Professional Journey'],['family','Family'],['memory','A Memory from College Days']];
// Fit a natural A4 page into the available reader viewport by scaling the whole sheet, never by distorting its aspect ratio.
function getViewerScale(){const vw=window.innerWidth||1200;const vh=window.innerHeight||900;let availableWidth;if(vw<=650)availableWidth=Math.min(vw-20,500);else if(vw<=900)availableWidth=vw-210;else availableWidth=Math.min(800,vw-320);const availableHeight=Math.max(420,vh-235);return Math.max(.35,Math.min(1,availableWidth/794,availableHeight/1123));}
function cleanText(s=''){return String(s).replace(/\r/g,'').trim();}
function hasMeaningfulContent(s=''){const t=cleanText(s);return !!t && !/^(?:[-–—_•.\s]|n\/?a|none|not applicable)+$/i.test(t);}
// Browser-measured pagination uses the exact A4 sheet rendered by the reader and PDF export.
// Source text is tokenized with whitespace preserved, so joining page chunks reproduces it exactly.
function sectionFontScale(source){
  const length=source.length;
  if(length>2600)return 0.88;
  if(length>1800)return 0.92;
  if(length>1200)return 0.96;
  return 1;
}
function paginateMeasured(p,title,text,host,root){
  const source=cleanText(text);
  if(!source)return {chunks:[],fontScale:1};
  const fontScale=sectionFontScale(source);
  const tokens=source.match(/\S+\s*|\s+/g)||[source];
  const pages=[];
  const fits=(candidate,part)=>{
    flushSync(()=>root.render(<StoryPage p={p} title={title} content={candidate} n={1} part={part} total={2} fontScale={fontScale}/>));
    const body=host.querySelector('.story-body');
    const folio=host.querySelector('.folio');
    if(!body||!folio)return false;
    // Compare the bottom of the last rendered line to the actual footer position.
    const bodyBottom=body.getBoundingClientRect().bottom;
    const footerTop=folio.getBoundingClientRect().top;
    return bodyBottom<=footerTop-20;
  };
  let offset=0;
  while(offset<tokens.length){
    const part=pages.length+1;
    let low=1,high=tokens.length-offset,best=0;
    while(low<=high){
      const mid=Math.floor((low+high)/2);
      const candidate=tokens.slice(offset,offset+mid).join('');
      if(fits(candidate,part)){best=mid;low=mid+1;}else high=mid-1;
    }
    if(best===0){
      throw new Error(`A4 pagination could not fit content safely for ${p.name} — ${title}. Check the page styles or fonts.`);
    }
    // If all remaining text fits, keep the section together: never split a short section
    // merely because it contains a sentence-ending punctuation mark near the end.
    let cut=best;
    const allRemainingFit=best===tokens.length-offset;
    if(!allRemainingFit){
      // For genuinely long sections, prefer a nearby paragraph/sentence boundary only when
      // it leaves a meaningful amount of content for the next page.
      const floorCut=Math.max(1,Math.floor(best*.92));
      for(let j=best;j>=floorCut;j--){
        const ending=tokens[offset+j-1]||'';
        const candidate=tokens.slice(offset,offset+j).join('');
        const tailLength=tokens.slice(offset+j).join('').trim().length;
        if(tailLength>=180 && (/\n\s*\n\s*$/.test(candidate)||/[.!?][”’"']?\s*$/.test(ending))){cut=j;break;}
      }
    }
    pages.push(tokens.slice(offset,offset+cut).join(''));
    offset+=cut;
  }
  if(pages.join('')!==source)throw new Error(`Pagination changed source text for ${p.name} — ${title}`);
  return {chunks:pages,fontScale};
}
function footer(page,bookPage=true){return <div className="folio"><span>{bookPage?'GOLDEN JUBILEE • 1976–2026':'GOLDEN JUBILEE'}</span><span className="folio-number">{page}</span><a href="https://boroai.in" target="_blank" rel="noreferrer">boroai.in</a></div>}
function Page({children,n,className=''}){return <section className={`paper ${className}`}><div className="paper-frame">{children}{footer(n)}</div></section>}
function Cover({book,n}){return <Page n={n} className="cover-page"><div className="cover-ornament top">✦　✦　✦</div><div className="cover-inner"><div className="seal">50</div><p className="eyebrow">GOLDEN JUBILEE • THE CLASS OF 1976</p><h1>{book.title}</h1><div className="cover-rule"><span>✦</span></div><h2>{book.subtitle}</h2><p className="cover-note">A commemorative album of lives, friendships, family and memories</p><div className="cover-years">1976 <i>—</i> 2026</div><p className="cover-institution">NATIONAL INSTITUTE OF TECHNOLOGY · RAIPUR</p></div><div className="cover-ornament bottom">❧</div></Page>}
function IndexPage({data,n}){return <Page n={n} className="index-page"><div className="section-kicker">THE CONTRIBUTORS</div><h2 className="display-title">A lifetime, in names</h2><p className="intro-copy">Fifteen names in the contributor index; fourteen full profiles are present in the supplied compilation.</p><div className="index-grid">{data.index.map((p,i)=><div className="index-entry" key={p.name}><span className="index-no">{String(i+1).padStart(2,'0')}</span><div><strong>{p.name}</strong><small>{p.branch}</small></div><span className="index-line"/></div>)}</div><p className="editor-note">Bijan K. Dutta appears in the source index; a profile page and profile content were not present in the supplied Word compilation.</p></Page>}
function IdentityPage({p,n}){const photo=p.photos?.[0];return <Page n={n} className="identity-page"><div className="identity-head"><div className="section-kicker">A LIFE IN THE MAKING · {p.branch||'GOLDEN JUBILEE BATCH'}</div><div className="identity-layout"><div className="identity-copy"><p className="profile-overline">THE CLASS OF 1976</p><h2 className="profile-name">{p.name}</h2>{p.nickname&&<p className="profile-nickname">“{p.nickname}”</p>}<div className="identity-meta"><span>{p.branch}</span><span>{p.location}</span></div></div>{photo&&<figure className="hero-photo"><img src={photo.src} alt={photo.alt}/><figcaption>{photo.caption||'A recent photograph'}</figcaption></figure>}</div></div><div className="profile-details"><div className="detail-item"><span>EDUCATION</span><p>{p.education||'—'}</p></div><div className="detail-item"><span>CURRENT LOCATION</span><p>{p.location||'—'}</p></div><div className="detail-item"><span>EMAIL</span><p>{p.email||'—'}</p></div><div className="detail-item"><span>PHONE</span><p>{p.phone||'—'}</p></div></div><div className="identity-bottom"><span>AN ALUMNUS OF NIT RAIPUR</span><span>MEMORIES THAT ENDURE</span></div></Page>}
function StoryPage({p,title,content,n,part,total,fontScale=1}){const continuation=part>1;return <Page n={n} className={`story-page${continuation?' continuation-page':''}`}><div className="story-running"><span>{p.name}</span><span>{p.branch}</span></div><div className={`story-heading${continuation?' compact-heading':''}`}><div className="section-kicker">{continuation?`${title.toUpperCase()} · CONTINUED`:'THE JOURNEY CONTINUES'}</div>{!continuation&&<><h2>{title}</h2><div className="gold-rule"/></>}</div><div className="story-body" style={{'--page-font-scale':fontScale}}>{content.split(/\n\n/).map((para,i)=><p key={i}>{para}</p>)}</div></Page>}
function PhotoPage({p,photos,n,part,total}){return <Page n={n} className="photo-page"><div className="story-running"><span>{p.name}</span><span>PHOTOGRAPHS & MEMORIES</span></div><div className="photo-page-heading"><div className="section-kicker">MOMENTS, HELD CLOSE{total>1?` · ${part} OF ${total}`:''}</div><h2>{p.name}</h2><div className="gold-rule"/></div><div className={`photo-grid count-${photos.length}`}>{photos.map((ph,i)=><figure className="photo-card" key={ph.src}><div className="photo-mat"><img src={ph.src} alt={ph.alt||p.name}/></div>{ph.caption&&<figcaption>{ph.caption}</figcaption>}</figure>)}</div></Page>}
function buildPages(data, measured={}){const pages=[{key:'cover',render:n=><Cover book={data.book} n={n}/>},{key:'index',render:n=><IndexPage data={data} n={n}/>}];
  for(const p of data.participants){pages.push({key:p.participant_id+'-identity',person:p.name,render:n=><IdentityPage p={p} n={n}/>});
    for(const [key,title] of fields){const text=cleanText(p[key]);if(!hasMeaningfulContent(text))continue;const layout=measured[`${p.participant_id}-${key}`]||{chunks:[text],fontScale:1};const chunks=layout.chunks;chunks.forEach((content,i)=>pages.push({key:`${p.participant_id}-${key}-${i}`,person:p.name,render:n=><StoryPage p={p} title={title} content={content} n={n} part={i+1} total={chunks.length} fontScale={layout.fontScale}/>}));}
    const photos=(p.photos||[]).slice(1); const groups=photos.map(photo=>[photo]); groups.forEach((group,i)=>pages.push({key:`${p.participant_id}-photos-${i}`,person:p.name,render:n=><PhotoPage p={p} photos={group} n={n} part={i+1} total={groups.length}/> }));
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
    const result={};
    for(const p of data.participants){for(const [key,title] of fields){
      if(!hasMeaningfulContent(p[key]))continue;
      result[`${p.participant_id}-${key}`]=paginateMeasured(p,title,p[key],host,root);
    }}
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
