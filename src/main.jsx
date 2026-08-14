import React,{useEffect,useMemo,useRef,useState} from "react";
import {createRoot} from "react-dom/client";
import "./styles.css";

const TURN_MS=1250;

function driveUrls(photo) {
  if (!photo) return [];

  const urls = [];

  // Primary: published GitHub/Vercel asset.
  if (photo.file_url) {
    urls.push(photo.file_url);
  }

  // Fallback: Google Drive thumbnail for older/dev data.
  const id =
    photo.file_id ||
    (photo.file_url?.match(/[-\w]{20,}/)?.[0]);

  if (id) {
    urls.push(
      `https://drive.google.com/thumbnail?id=${id}&sz=w2000`
    );
  }

  return [...new Set(urls)];
}

function Img({ photo, className = "", alt = "", onRatio }) {
  const urls = driveUrls(photo);
  const [index, setIndex] = React.useState(0);

  if (!urls.length) {
    return (
      <div className={`photo-fallback ${className}`}>
        PHOTO UNAVAILABLE
      </div>
    );
  }

  const handleLoad = (e) => {
    const img = e.currentTarget;

    if (img.naturalWidth && img.naturalHeight) {
      onRatio?.(
        img.naturalWidth / img.naturalHeight
      );
    }
  };

  const handleError = () => {
    if (index < urls.length - 1) {
      setIndex(index + 1);
    }
  };

  return (
    <img
      key={urls[index]}
      className={className}
      src={urls[index]}
      alt={alt}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
}

function PageNo({n}){return <div className="page-no"><span>←</span><b>{n}</b><span>→</span></div>}

function Profile({p,n}){
 return <section className="paper profile">
  <div className="inner">
   <div className="topline"><span>MEMORIES THAT LAST</span><span>50 YEARS</span></div>
   <div className="profile-hero">
    <div className="portrait-frame"><Img photo={p.photos?.recent} className="portrait"/><span className="ring"/></div>
    <div className="identity">
      <h2>{p.name}</h2>
      {p.nickname&&<div className="nickname">“{p.nickname}”</div>}
      {p.branch&&<div className="identity-row"><i>◆</i>{p.branch}</div>}
      {p.location&&<div className="identity-row"><i>●</i>{p.location}</div>}
    </div>
   </div>
   <div className="rule"/>
   <div className="fields">
    {p.education&&<div><strong>EDUCATION</strong><span>{p.education}</span></div>}
    {p.career&&<div><strong>CAREER</strong><span>{p.career}</span></div>}
    {p.family&&<div><strong>FAMILY</strong><span>{p.family}</span></div>}
   </div>
   {p.memory&&<div className="memory"><b>“</b><em>{p.memory}</em><b>”</b></div>}
   <PageNo n={n}/>
  </div>
 </section>
}

function JustifiedGallery({photos}){
  const ref=useRef(null); const [size,setSize]=useState({width:760,height:420}); const [ratios,setRatios]=useState({});
  useEffect(()=>{const f=()=>setSize({width:ref.current?.clientWidth||760,height:ref.current?.clientHeight||420});f();const ro=new ResizeObserver(f);if(ref.current)ro.observe(ref.current);return()=>ro.disconnect()},[]);
  const items=photos.map(([slot,photo])=>({slot,photo,ratio:ratios[slot]||1.35}));
  const rows=useMemo(()=>{
    if(!items.length)return [];
    const groups=items.length===1?[items]:items.length===2?[items]:items.length===3?[[items[0]],[items[1],items[2]]]:[[items[0],items[1]],[items[2],items[3]]];
    const gap=12;
    let natural=groups.map(g=>Math.max(130,Math.min(285,(size.width-gap*(g.length-1))/g.reduce((sum,x)=>sum+x.ratio,0))));
    const totalGap=gap*(groups.length-1);
    const available=Math.max(160,size.height-totalGap);
    const scale=Math.min(1,available/natural.reduce((a,b)=>a+b,0));
    return groups.map((g,i)=>({items:g,height:Math.floor(natural[i]*scale)}));
  },[size.width,size.height,JSON.stringify(ratios),photos.length]);
  const setRatio=(slot,r)=>setRatios(x=>x[slot]===r?x:{...x,[slot]:r});
  return <div ref={ref} className={`gallery photos-${items.length}`}>
    {rows.map((row,ri)=><div className="gallery-row" key={ri} style={{height:row.height}}>
      {row.items.map(x=><figure key={x.slot} style={{flex:`${x.ratio} 1 0`}}>
        <Img photo={x.photo} className="gallery-img" onRatio={r=>setRatio(x.slot,r)}/>
        {x.photo.caption&&<figcaption>{x.photo.caption}</figcaption>}
      </figure>)}
    </div>)}
  </div>
}

function Memory({p,n}){
  const photos=Object.entries(p.photos||{}).filter(([s])=>s!=="recent");
  return <section className="paper memory-page"><div className="inner">
   <div className="memory-topline"><span>MEMORIES • {p.name}</span><span>50 YEARS</span></div>
   <div className="memory-title"><h2>From college days to today</h2><div className="camera">◉</div></div>
   <div className="goldline"><span>✦</span></div>
   <JustifiedGallery photos={photos}/>
   <PageNo n={n}/>
  </div></section>
}

function Cover({title}){return <section className="paper cover"><div className="cover-art"/><div className="cover-text"><div className="kicker">50 YEARS • ONE BATCH • MANY MEMORIES</div><h2>{title}</h2><p>A keepsake of friendships, memories and the journey since college.</p><div className="goldline small"/></div></section>}
function Journey(){return <section className="paper journey"><div className="journey-art"/><div className="journey-content"><div className="kicker">A JOURNEY OF</div><h2>Friendship<br/><em>& growth</em></h2><div className="goldline small"/><p>From lecture halls to canteen chai, from old friendships to the lives we built — every memory brought us here.</p><div className="fifty">50</div><strong>YEARS OF<br/>MEMORIES</strong></div></section>}
function Closing(){return <section className="paper closing"><div className="closing-content"><div className="kicker">GOLDEN JUBILEE</div><h2>50 years later,<br/><em>the memories remain.</em></h2><div className="goldline small"/><p>With warm regards to every member of the batch.</p></div></section>}

function ParticipantNav({participants,current,onNavigate}){
  return (
    <aside className="participant-nav">
      <div className="participant-nav-title">PARTICIPANTS</div>
      <div className="participant-list">
        {participants.map((person) => (
          <button
            key={person.participantId}
            className={current===person.page ? "participant-link active" : "participant-link"}
            onClick={() => onNavigate(person.page)}
          >
            <span className="participant-name">{person.name}</span>
            <span className="participant-page">{person.page+1}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function App(){
  const [data,setData]=useState(null);
  const [current,setCurrent]=useState(0);
  const [turn,setTurn]=useState(null);
  const lock=useRef(false);
  const goRef=useRef(null);

  useEffect(()=>fetch('/public_data.json').then(r=>r.json()).then(setData),[]);

  useEffect(()=>{
    const onKey=e=>{
      if(e.key==='ArrowRight'){e.preventDefault();goRef.current?.(1)}
      else if(e.key==='ArrowLeft'){e.preventDefault();goRef.current?.(-1)}
    };
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[]);

  if(!data)return <div className="loading">Loading Golden Jubilee…</div>;

  const pages=[];
  const profileIndex=[];

  pages.push(<Cover key="cover" title={data.book?.title||'Golden Jubilee 50th Anniversary E-Book'}/>);
  pages.push(<Journey key="journey"/>);

  (data.participants||[]).forEach((p,i)=>{
    const profilePage=pages.length;

    profileIndex.push({
      participantId:p.participant_id,
      name:p.name,
      nickname:p.nickname||'',
      page:profilePage
    });

    pages.push(
      <Profile
        key={p.participant_id+'p'}
        p={p}
        index={i}
        n={profilePage+1}
      />
    );

    if(Object.keys(p.photos||{}).some(k=>k!=='recent')){
      pages.push(
        <Memory
          key={p.participant_id+'m'}
          p={p}
          n={pages.length+1}
        />
      );
    }
  });

  pages.push(<Closing key="closing"/>);

  const go=dir=>{
    if(lock.current)return;
    const target=current+dir;
    if(target<0||target>=pages.length)return;
    lock.current=true;
    setTurn({from:current,to:target,dir});
    setTimeout(()=>{
      setCurrent(target);
      setTurn(null);
      lock.current=false;
    },TURN_MS);
  };

  goRef.current=go;

  const goToPage=page=>{
    if(lock.current)return;
    if(page<0||page>=pages.length)return;
    setCurrent(page);
  };

  const shown=turn?turn.to:current;
  const outgoing=turn?turn.from:null;

  return (
    <div className="app">
      <header>
        <div>
          <div className="kicker">GOLDEN JUBILEE • 50 YEARS</div>
          <h1>{data.book?.title||'Golden Jubilee'}</h1>
        </div>
        <nav>
          <button onClick={()=>go(-1)} disabled={current===0||!!turn}>‹</button>
          <span>{current+1} / {pages.length}</span>
          <button onClick={()=>go(1)} disabled={current===pages.length-1||!!turn}>›</button>
        </nav>
      </header>

      <div className="book-layout">
        <ParticipantNav
          participants={profileIndex}
          current={current}
          onNavigate={goToPage}
        />

        <main className="stage">
          <div className="book">
            <div className="page-layer base">{pages[shown]}</div>
            {turn&&(
              <div className={`page-layer turn ${turn.dir>0?'next':'prev'}`}>
                {pages[outgoing]}
              </div>
            )}
          </div>
        </main>
      </div>

      <footer>
        <span>Use the buttons or keyboard ← → to turn pages</span>
        <span>{current===0?'Cover':current===pages.length-1?'Closing':'Golden Jubilee'}</span>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App/>);
