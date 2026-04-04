import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';

// ─── Constants ───────────────────────────────────────────────────────────────────────────────
const NEIGHBOURHOODS = [
  'Bay Street Corridor','Chinatown','Distillery District','Dundas West',
  'Harbord Village','Harbourfront','Kensington Market','King West','Leslieville',
  'Liberty Village','Little Italy','Niagara','Ossington',
  'Queen West','Roncesvalles','The Annex','Yorkville',
];
const NEIGHBOURHOOD_COORDS = {
  'Bay Street Corridor':{lat:43.6496,lng:-79.3826},'Chinatown':{lat:43.6548,lng:-79.3991},
  'Distillery District':{lat:43.6503,lng:-79.3592},'Dundas West':{lat:43.6535,lng:-79.4390},
  'Harbord Village':{lat:43.6607,lng:-79.4055},'Harbourfront':{lat:43.6386,lng:-79.3822},
  'Kensington Market':{lat:43.6556,lng:-79.4009},'King West':{lat:43.6466,lng:-79.3971},
  'Leslieville':{lat:43.6618,lng:-79.3296},'Liberty Village':{lat:43.6393,lng:-79.4236},
  'Little Italy':{lat:43.6546,lng:-79.4131},'Niagara':{lat:43.6432,lng:-79.4064},
  'Ossington':{lat:43.6489,lng:-79.4240},'Queen West':{lat:43.6476,lng:-79.4071},
  'Roncesvalles':{lat:43.6492,lng:-79.4479},'The Annex':{lat:43.6660,lng:-79.4122},
  'Yorkville':{lat:43.6740,lng:-79.3956},
};
const OCCASIONS = [
  {value:'date',label:'Date Night'},{value:'first date',label:'First Date'},
  {value:'follow-up date',label:'Follow-Up Date'},{value:'catching up',label:'Catching Up'},
  {value:'casual dinner',label:'Casual Dinner'},{value:'celebration',label:'Celebration'},
  {value:'business',label:'Business'},{value:'family dinner',label:'Family Dinner'},
  {value:'small group',label:'Small Group (3\u20135)'},{value:'large group',label:'Large Group (6+)'},
  {value:'solo',label:'Solo Dining'},{value:'brunch',label:'Brunch'},
  {value:'breakfast',label:'Breakfast'},{value:'late night',label:'Late Night'},
  {value:'coffee',label:'Coffee'},
];
const VIBES = [
  {value:'trendy',label:'Trendy'},{value:'upscale',label:'Upscale'},
  {value:'lively',label:'Lively'},{value:'quiet',label:'Quiet'},
  {value:'conversation friendly',label:'Conversation Friendly'},
  {value:'music forward',label:'Music Forward'},{value:'happy hour friendly',label:'Happy Hour'},
];
const CUISINE_OPTIONS = [
  'Italian','Japanese','Korean','Mexican','Mediterranean','Middle Eastern',
  'Indian','Thai','Asian Fusion','Chinese','Vietnamese',
  'American','Canadian','French','Spanish','Seafood','Steakhouse',
  'BBQ','Pizza','Tapas','Brunch & Breakfast','Coffee & Cafe',
  'Bar','Wine Bar','Gastropub','Vegan/Vegetarian',
];
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const TIMES = [
  '6:00 AM','6:30 AM','7:00 AM','7:30 AM','8:00 AM','8:30 AM',
  '9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM',
  '12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM',
  '3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM','5:30 PM',
  '6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM','8:30 PM',
  '9:00 PM','9:30 PM','10:00 PM','10:30 PM','11:00 PM','11:30 PM',
  '12:00 AM','12:30 AM','1:00 AM','1:30 AM','2:00 AM','2:30 AM','3:00 AM',
];
const PRICE_SYMBOLS = {1:'$',2:'$$',3:'$$$',4:'$$$$'};
const QUICK_VIBES = [
  {label:'First Date',   query:'first date romantic',               icon:'\uD83D\uDC9D'},
  {label:'Solo Work',    query:'quiet place to work from laptop',    icon:'\uD83D\uDCBB'},
  {label:'Late Night',   query:'late night drinks open late',        icon:'\uD83C\uDF19'},
  {label:'Group Dinner', query:'large group dinner',                 icon:'\uD83D\uDC65'},
  {label:'Romantic',     query:'romantic dinner intimate',           icon:'\uD83D\uDD6F\uFE0F'},
  {label:'Hidden Gems',  query:'cozy quiet hidden gem',             icon:'\uD83D\uDC8E'},
];

// ─── Helpers ─────────────────────────────────────────────────────────────────────────────────
function distKm(lat1,lng1,lat2,lng2){
  const R=6371,dL=(lat2-lat1)*Math.PI/180,dG=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dL/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dG/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

// ─── Sub-components ─────────────────────────────────────────────────────────────────────────────
function BusynessBar({busyness}){
  const cm={
    green:{bg:'#22c55e',light:'#dcfce7',text:'#15803d'},
    yellow:{bg:'#eab308',light:'#fef9c3',text:'#a16207'},
    orange:{bg:'#f97316',light:'#ffedd5',text:'#c2410c'},
    red:{bg:'#ef4444',light:'#fee2e2',text:'#b91c1c'},
  };
  const c=cm[busyness.color]||cm.green;
  return(
    <div style={{display:'flex',alignItems:'center',gap:10}}>
      <div style={{flex:1,height:5,borderRadius:99,background:'#e2eaf4',overflow:'hidden'}}>
        <div style={{height:'100%',width:`${busyness.percentFull}%`,background:c.bg,borderRadius:99,transition:'width 0.6s ease'}}/>
      </div>
      <span style={{fontSize:11,fontWeight:600,padding:'2px 7px',borderRadius:99,background:c.light,color:c.text,whiteSpace:'nowrap'}}>
        {busyness.label} &middot; {busyness.waitEstimate}
      </span>
    </div>
  );
}

function StarRating({rating}){
  const s=Math.round(rating);
  return(
    <span style={{color:'#f59e0b',fontSize:13,fontWeight:600}}>
      {'\u2605'.repeat(s)}
      <span style={{color:'#cbd5e1',fontWeight:400}}>{'\u2605'.repeat(5-s)}</span>
      <span style={{color:'#64748b',marginLeft:4}}>{rating.toFixed(1)}</span>
    </span>
  );
}

function Tag({children,accent}){
  return(
    <span style={{
      display:'inline-block',fontSize:11,fontWeight:500,padding:'3px 9px',borderRadius:99,whiteSpace:'nowrap',
      background:accent?'#e8faf8':'#F7F9FC',
      color:accent?'#2EC4B6':'#0B1F3A',
      border:accent?'1px solid #9de0db':'1px solid #dde4ef',
    }}>
      {children}
    </span>
  );
}

function VibePill({children}){
  return(
    <span style={{
      display:'inline-block',fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:99,
      background:'#e8faf8',color:'#0B1F3A',border:'1px solid #9de0db',whiteSpace:'nowrap',
    }}>
      {children}
    </span>
  );
}

function VenueTypePill({r}){
  if(r.lateNight&&r.isBar) return <span style={{fontSize:11,background:'#1e1b4b',color:'#c7d2fe',padding:'2px 8px',borderRadius:99,fontWeight:600}}>🌙 Late Night Bar</span>;
  if(r.isBar)  return <span style={{fontSize:11,background:'#e8faf8',color:'#0B1F3A',padding:'2px 8px',borderRadius:99,fontWeight:600}}>🍺 Bar</span>;
  if(r.isCafe) return <span style={{fontSize:11,background:'#f0fdf4',color:'#166534',padding:'2px 8px',borderRadius:99,fontWeight:600}}>☕ Cafe</span>;
  return null;
}

function HoursLine({r}){
  if(!r.openTime||!r.closeTime) return null;
  return(
    <span style={{fontSize:12,color:r.isOpenAtTime?'#16a34a':'#ef4444',fontWeight:500,marginLeft:6}}>
      {r.isOpenAtTime?'\uD83D\uDD50':'\u26D4'} {r.openTime}{' \u2013 '}{r.closeTime}
    </span>
  );
}

function RestaurantCard({r,index,userLocation}){
  const [expanded,setExpanded]=useState(false);
  const dist=(userLocation&&r.coordinates)
    ? distKm(userLocation.lat,userLocation.lng,r.coordinates.lat,r.coordinates.lng).toFixed(1)
    : null;
  const mapsUrl=`https://www.google.com/maps/search/${encodeURIComponent(r.name+(r.address?' '+r.address:' Toronto'))}`;
  const redditUrl=`https://www.reddit.com/r/toronto/search/?q=${encodeURIComponent(r.name)}&sort=top&t=year`;
  const topVibes=(r.vibes||[]).slice(0,3);
  const scoreColor=r.matchScore>=80?'#16a34a':r.matchScore>=60?'#2EC4B6':'#94a3b8';
  const scoreBg   =r.matchScore>=80?'#f0fdf4':r.matchScore>=60?'#e8faf8':'#F7F9FC';
  const topBarBg  =r.matchScore>=80
    ?'linear-gradient(90deg,#16a34a,#4ade80)'
    :r.matchScore>=60
      ?'linear-gradient(90deg,#2EC4B6,#1aada3)'
      :'linear-gradient(90deg,#dde4ef,#e2eaf4)';

  return(
    <div
      style={{background:'#fff',borderRadius:16,boxShadow:'0 1px 4px rgba(11,31,58,0.06),0 4px 16px rgba(11,31,58,0.06)',overflow:'hidden',transition:'box-shadow 0.2s,transform 0.2s',animationName:'fadeUp',animationDuration:'0.35s',animationTimingFunction:'ease',animationFillMode:'both',animationDelay:`${index*0.04}s`}}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 4px 8px rgba(11,31,58,0.08),0 12px 32px rgba(11,31,58,0.12)';e.currentTarget.style.transform='translateY(-2px)';}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 1px 4px rgba(11,31,58,0.06),0 4px 16px rgba(11,31,58,0.06)';e.currentTarget.style.transform='translateY(0)';}}>
      <div style={{height:4,background:topBarBg}}/>
      <div style={{padding:'18px 20px 20px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10,marginBottom:6}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:7,flexWrap:'wrap',marginBottom:3}}>
              <h3 style={{margin:0,fontSize:17,fontWeight:700,color:'#0B1F3A',lineHeight:1.2,fontFamily:'Georgia,serif'}}>{r.name}</h3>
              <VenueTypePill r={r}/>
            </div>
            <p style={{margin:0,fontSize:12,color:'#64748b',display:'flex',alignItems:'center',flexWrap:'wrap',gap:4}}>
              {r.neighbourhood} &middot; {r.cuisine} &middot; {PRICE_SYMBOLS[r.priceLevel]}
              {dist&&<span style={{color:'#94a3b8'}}>&middot; {dist} km</span>}
              <HoursLine r={r}/>
            </p>
          </div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:12,fontWeight:700,color:scoreColor,background:scoreBg,border:`1px solid ${scoreColor}30`,borderRadius:8,padding:'4px 10px'}}>
              {r.matchScore>=80?'\u2605':r.matchScore>=60?'\u2713':'\u00b7'} {r.matchScore}%
            </div>
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:'#94a3b8',textDecoration:'none',display:'flex',alignItems:'center',gap:3}} title="Open in Google Maps">
              \uD83D\uDCCD Map
            </a>
          </div>
        </div>
        <div style={{marginBottom:10}}>
          <StarRating rating={r.rating}/>
          {r.reviewCount>0&&<span style={{fontSize:12,color:'#94a3b8',marginLeft:6}}>({r.reviewCount.toLocaleString()})</span>}
        </div>
        {topVibes.length>0&&(
          <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:10}}>
            {topVibes.map(v=><VibePill key={v}>{v}</VibePill>)}
          </div>
        )}
        <div style={{background:'#F7F9FC',border:'1px solid #e2eaf4',borderRadius:8,padding:'8px 12px',marginBottom:10}}>
          <p style={{margin:0,fontSize:13,color:'#374151',lineHeight:1.5}}>
            <span style={{fontWeight:600,color:'#0B1F3A'}}>Why: </span>{r.whyRecommended}
          </p>
        </div>
        <div style={{marginBottom:12}}>
          <p style={{margin:'0 0 5px',fontSize:11,fontWeight:600,color:'#94a3b8',letterSpacing:'0.05em',textTransform:'uppercase'}}>Current Busyness</p>
          <BusynessBar busyness={r.busyness}/>
        </div>
        {r.bestFor&&r.bestFor.length>0&&(
          <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:12}}>
            {r.bestFor.map(t=><Tag key={t} accent>{t}</Tag>)}
          </div>
        )}
        <button onClick={()=>setExpanded(x=>!x)} style={{background:'none',border:'none',padding:0,cursor:'pointer',fontSize:13,color:'#2EC4B6',fontWeight:600}}>
          {expanded?'\u25b2 Less':'\u25bc More details'}
        </button>
        {expanded&&(
          <div style={{marginTop:12,display:'flex',flexDirection:'column',gap:10}}>
            <div style={{background:'linear-gradient(135deg,#e8faf8,#d0f4f1)',border:'1px solid #9de0db',borderRadius:8,padding:'10px 12px'}}>
              <p style={{margin:'0 0 3px',fontSize:11,fontWeight:700,color:'#2EC4B6',textTransform:'uppercase',letterSpacing:'0.05em'}}>Insider Tip</p>
              <p style={{margin:0,fontSize:13,color:'#374151',lineHeight:1.5}}>{r.insiderTip}</p>
            </div>
            {r.transit&&(r.transit.subway.length>0||r.transit.streetcar.length>0)&&(
              <div>
                <p style={{margin:'0 0 6px',fontSize:11,fontWeight:600,color:'#94a3b8',letterSpacing:'0.05em',textTransform:'uppercase'}}>Nearest Transit</p>
                {r.transit.subway.slice(0,1).map(s=>(
                  <div key={s.name} style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'#374151'}}>
                    <span>\uD83D\uDE87</span><span><strong>{s.name}</strong> &middot; {s.line}</span>
                    <span style={{marginLeft:'auto',color:'#94a3b8',fontSize:12}}>{s.walkMinutes} min walk</span>
                  </div>
                ))}
                {r.transit.streetcar.map(s=>(
                  <div key={s.route} style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'#374151',marginTop:4}}>
                    <span>\uD83D\uDE8B</span><span><strong>{s.route}</strong></span>
                    <span style={{marginLeft:'auto',color:'#94a3b8',fontSize:12}}>{s.walkMinutes} min walk</span>
                  </div>
                ))}
              </div>
            )}
            {r.peakTimes&&r.peakTimes.length>0&&(
              <div>
                <p style={{margin:'0 0 5px',fontSize:11,fontWeight:600,color:'#94a3b8',letterSpacing:'0.05em',textTransform:'uppercase'}}>Peak Times</p>
                <div style={{display:'flex',flexWrap:'wrap',gap:5}}>{r.peakTimes.map(t=><Tag key={t}>{t}</Tag>)}</div>
              </div>
            )}
            {r.tags&&r.tags.length>0&&(
              <div>
                <p style={{margin:'0 0 5px',fontSize:11,fontWeight:600,color:'#94a3b8',letterSpacing:'0.05em',textTransform:'uppercase'}}>Known For</p>
                <div style={{display:'flex',flexWrap:'wrap',gap:5}}>{r.tags.map(t=><Tag key={t}>{t}</Tag>)}</div>
              </div>
            )}
            {r.googleReviews&&r.googleReviews[0]&&(
              <p style={{margin:0,fontSize:13,color:'#64748b',fontStyle:'italic',lineHeight:1.5}}>&ldquo;{r.googleReviews[0]}&rdquo;</p>
            )}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
              {r.address&&<p style={{margin:0,fontSize:12,color:'#94a3b8'}}>{String.fromCharCode(128205)} {r.address}</p>}
              <a href={redditUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:'#2EC4B6',fontWeight:600,textDecoration:'none'}}>{String.fromCharCode(128488)} Reddit</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SelectField({label,value,onChange,options,placeholder,optional}){
  return(
    <div style={{display:'flex',flexDirection:'column',gap:5}}>
      <label style={{fontSize:12,fontWeight:600,color:'#64748b',letterSpacing:'0.05em',textTransform:'uppercase'}}>
        {label}{optional&&<span style={{fontWeight:400,color:'#94a3b8',marginLeft:4}}>(optional)</span>}
      </label>
      <div style={{position:'relative'}}>
        <select value={value} onChange={e=>onChange(e.target.value)}
          style={{width:'100%',appearance:'none',background:'#fff',border:'1.5px solid #dde4ef',borderRadius:10,padding:'10px 34px 10px 13px',fontSize:14,color:value?'#0B1F3A':'#94a3b8',cursor:'pointer',outline:'none'}}
          onFocus={e=>e.target.style.borderColor='#2EC4B6'}
          onBlur={e=>e.target.style.borderColor='#dde4ef'}>
          <option value="">{placeholder}</option>
          {options.map(o=>(<option key={o.value||o} value={o.value||o}>{o.label||o}</option>))}
        </select>
        <span style={{position:'absolute',right:11,top:'50%',transform:'translateY(-50%)',pointerEvents:'none',color:'#94a3b8',fontSize:11}}>{String.fromCharCode(9660)}</span>
      </div>
    </div>
  );
}

function CuisineMultiselect({selected,onChange}){
  const [open,setOpen]=useState(false);
  const ref=useRef(null);
  useEffect(()=>{
    function h(e){if(ref.current&&!ref.current.contains(e.target))setOpen(false);}
    document.addEventListener('mousedown',h);
    return()=>document.removeEventListener('mousedown',h);
  },[]);
  const toggle=c=>onChange(selected.includes(c)?selected.filter(x=>x!==c):[...selected,c]);
  const label=selected.length===0?'All cuisines':selected.length===1?selected[0]:`${selected.length} cuisines`;
  return(
    <div ref={ref} style={{display:'flex',flexDirection:'column',gap:5}}>
      <label style={{fontSize:12,fontWeight:600,color:'#64748b',letterSpacing:'0.05em',textTransform:'uppercase'}}>Cuisine <span style={{fontWeight:400,color:'#94a3b8'}}>(optional)</span></label>
      <div style={{position:'relative'}}>
        <button type="button" onClick={()=>setOpen(o=>!o)}
          style={{width:'100%',appearance:'none',background:'#fff',border:'1.5px solid '+(open?'#2EC4B6':'#dde4ef'),borderRadius:10,padding:'10px 34px 10px 13px',fontSize:14,color:selected.length>0?'#0B1F3A':'#94a3b8',cursor:'pointer',outline:'none',textAlign:'left'}}>
          {label}
        </button>
        <span style={{position:'absolute',right:11,top:'50%',transform:`translateY(-50%) rotate(${open?180:0}deg)`,pointerEvents:'none',color:'#94a3b8',fontSize:11,transition:'transform 0.2s'}}>{String.fromCharCode(9660)}</span>
        {open&&(
          <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,zIndex:300,background:'#fff',border:'1.5px solid #dde4ef',borderRadius:12,padding:10,maxHeight:260,overflowY:'auto',boxShadow:'0 8px 32px rgba(11,31,58,0.14)'}}>
            <div style={{display:'flex',gap:6,marginBottom:8,paddingBottom:8,borderBottom:'1px solid #e2eaf4'}}>
              <button type="button" onClick={()=>onChange([...CUISINE_OPTIONS])} style={{flex:1,fontSize:12,fontWeight:600,padding:'4px 0',background:'#F7F9FC',border:'none',borderRadius:6,cursor:'pointer',color:'#374151'}}>All</button>
              <button type="button" onClick={()=>onChange([])} style={{flex:1,fontSize:12,fontWeight:600,padding:'4px 0',background:'#F7F9FC',border:'none',borderRadius:6,cursor:'pointer',color:'#374151'}}>Clear</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'2px 10px'}}>
              {CUISINE_OPTIONS.map(c=>(
                <label key={c} style={{display:'flex',alignItems:'center',gap:7,padding:'4px 3px',cursor:'pointer',fontSize:13,color:'#374151',borderRadius:5}}>
                  <input type="checkbox" checked={selected.includes(c)} onChange={()=>toggle(c)} style={{accentColor:'#2EC4B6',width:13,height:13}}/>{c}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function YMALSeparator(){
  return(
    <div className="ymal-sep" style={{display:'flex',alignItems:'center',gap:10,margin:'4px 0'}}>
      <div style={{flex:1,height:1,background:'linear-gradient(90deg,transparent,#dde4ef)'}}/>
      <div style={{fontSize:11,fontWeight:600,color:'#94a3b8',background:'#fff',border:'1px solid #dde4ef',borderRadius:99,padding:'4px 12px',whiteSpace:'nowrap',letterSpacing:'0.04em',textTransform:'uppercase'}}>You Might Also Like</div>
      <div style={{flex:1,height:1,background:'linear-gradient(90deg,#dde4ef,transparent)'}}/>
    </div>
  );
}

export default function Home(){
  const [form,setForm]=useState({location:'',occasion:'',vibe:'',day:'Friday',time:'7:00 PM'});
  const [selectedCuisines,setSelectedCuisines]=useState([]);
  const [intentQuery,setIntentQuery]=useState('');
  const [results,setResults]=useState(null);
  const [strongMatchCount,setStrongMatchCount]=useState(0);
  const [noOccasion,setNoOccasion]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);
  const [effectiveQuery,setEffectiveQuery]=useState(null);
  const [detectedIntent,setDetectedIntent]=useState(null);
  const [totalVenues,setTotalVenues]=useState(null);
  const [openNowOnly,setOpenNowOnly]=useState(false);
  const [selectedPrices,setSelectedPrices]=useState([]);
  const [userLocation,setUserLocation]=useState(null);
  const [locating,setLocating]=useState(false);
  const [showAdvanced,setShowAdvanced]=useState(false);
  const intentRef=useRef(null);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  useEffect(()=>{if(intentRef.current)intentRef.current.focus();},[]);

  async function search(surprise=false,queryOverride=null){
    setLoading(true);setError(null);setResults(null);setDetectedIntent(null);
    setOpenNowOnly(false);setSelectedPrices([]);
    try{
      const q=queryOverride!==null?queryOverride:intentQuery;
      const body=surprise?{...form,surprise:true}:{...form,cuisines:selectedCuisines.join(','),query:q};
      const res=await fetch('/api/recommend',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const data=await res.json();
      if(!res.ok){setError(data.error||'Something went wrong.');}
      else{
        setResults(data.results||[]);
        setStrongMatchCount(data.strongMatchCount||0);
        setNoOccasion(data.noOccasion||false);
        setEffectiveQuery(data.query);
        setDetectedIntent(data.detectedIntent||null);
        if(data.meta?.total)setTotalVenues(data.meta.total);
      }
    }catch{setError('Network error \u2014 please try again.');}
    finally{setLoading(false);}
  }

  function handleNearMe(){
    if(!navigator.geolocation)return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({coords:{latitude,longitude}})=>{
        setUserLocation({lat:latitude,lng:longitude});
        let nearest='',bestDist=Infinity;
        for(const[name,pos]of Object.entries(NEIGHBOURHOOD_COORDS)){
          const d=Math.hypot(latitude-pos.lat,longitude-pos.lng);
          if(d<bestDist){bestDist=d;nearest=name;}
        }
        set('location',nearest);
        setLocating(false);
      },
      ()=>setLocating(false)
    );
  }

  const displayResults=(results||[]).filter(r=>{
    if(openNowOnly&&!r.isOpenAtTime)return false;
    if(selectedPrices.length>0&&!selectedPrices.includes(r.priceLevel))return false;
    return true;
  });
  const filteredStrong=displayResults.filter(r=>r.isStrongMatch);
  const filteredSugg  =displayResults.filter(r=>!r.isStrongMatch);
  const hasResults=results!==null;
  const filtersActive=openNowOnly||selectedPrices.length>0;

  return(
    <>
      <Head>
        <title>Toronto Table &mdash; Find Your Perfect Spot</title>
        <meta name="description" content="Discover Toronto restaurants, bars and cafes by vibe, occasion, and intent beyond ratings."/>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      </Head>

      <div style={{minHeight:'100vh',background:'#F7F9FC',fontFamily:"'Inter',system-ui,sans-serif"}}>

        <header style={{position:'sticky',top:0,zIndex:100,background:'rgba(255,255,255,0.96)',backdropFilter:'blur(12px)',borderBottom:'1px solid #e2eaf4'}}>
          <div style={{maxWidth:1100,margin:'0 auto',height:60,padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:34,height:34,borderRadius:9,background:'linear-gradient(135deg,#2EC4B6,#1aada3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'#fff',letterSpacing:'-0.03em'}}>TRI</div>
              <span style={{fontSize:16,fontWeight:700,color:'#0B1F3A',letterSpacing:'-0.02em'}}>Toronto Table</span>
            </div>
            <nav style={{display:'flex',alignItems:'center',gap:4}}>
              <a href="#how-it-works" className="nav-link">How it works</a>
              <a href="#login" className="nav-link">Login</a>
              <a href="#signup" className="nav-link-cta">Sign Up</a>
            </nav>
          </div>
        </header>

        <div style={{background:'linear-gradient(160deg,#0B1F3A 0%,#142d52 100%)',padding:'56px 24px 72px',textAlign:'center'}}>
          <div style={{maxWidth:720,margin:'0 auto'}}>
            <p style={{margin:'0 0 10px',fontSize:13,fontWeight:600,color:'#2EC4B6',letterSpacing:'0.1em',textTransform:'uppercase'}}>Toronto &middot; Restaurants, Bars &amp; Cafes</p>
            <h1 style={{margin:'0 0 12px',fontSize:'clamp(28px,5vw,48px)',fontWeight:700,color:'#fff',lineHeight:1.12,letterSpacing:'-0.03em',fontFamily:'Georgia,serif'}}>
              Find the Perfect Spot<br/>for Any Occasion
            </h1>
            <p style={{margin:'0 0 32px',fontSize:16,color:'#94a3b8',lineHeight:1.6}}>
              Discover restaurants based on vibes, cuisine, and location &mdash; beyond ratings.
            </p>
            <div style={{display:'flex',maxWidth:680,margin:'0 auto',background:'#fff',borderRadius:16,boxShadow:'0 8px 32px rgba(0,0,0,0.28)',overflow:'hidden'}}>
              <button onClick={handleNearMe} disabled={locating}
                style={{background:'#fff',border:'none',borderRight:'1px solid #e2eaf4',padding:'0 16px',cursor:'pointer',color:'#2EC4B6',fontSize:13,fontWeight:600,whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:5,transition:'background 0.15s',minWidth:100}}
                onMouseEnter={e=>e.currentTarget.style.background='#e8faf8'}
                onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                \uD83D\uDCCD {locating?'Locating\u2026':'Near Me'}
              </button>
              <input
                ref={intentRef}
                type="text"
                value={intentQuery}
                onChange={e=>setIntentQuery(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter')search(false);}}
                placeholder="Type a vibe, occasion, or cuisine\u2026"
                style={{flex:1,border:'none',outline:'none',padding:'16px 16px',fontSize:15,color:'#0B1F3A',fontFamily:"'Inter',sans-serif",minWidth:0}}
              />
              <button onClick={()=>search(false)} disabled={loading}
                style={{background:loading?'#dde4ef':'#2EC4B6',border:'none',padding:'0 24px',cursor:loading?'not-allowed':'pointer',color:'#fff',fontWeight:700,fontSize:15,transition:'background 0.15s',whiteSpace:'nowrap'}}
                onMouseEnter={e=>{if(!loading)e.currentTarget.style.background='#1aada3';}}
                onMouseLeave={e=>{if(!loading)e.currentTarget.style.background='#2EC4B6';}}>
                {loading?'Searching\u2026':'Search'}
              </button>
            </div>
            <div style={{display:'flex',justifyContent:'center',flexWrap:'wrap',gap:8,marginTop:16}}>
              {QUICK_VIBES.map(chip=>(
                <button key={chip.label}
                  onClick={()=>{setIntentQuery(chip.query);search(false,chip.query);}}
                  className="vibe-chip">
                  {chip.icon} {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {!hasResults&&!loading&&(
          <div id="how-it-works" style={{background:'#fff',borderBottom:'1px solid #e2eaf4',padding:'56px 24px'}}>
            <div style={{maxWidth:860,margin:'0 auto'}}>
              <div style={{textAlign:'center',marginBottom:44}}>
                <p style={{margin:'0 0 8px',fontSize:12,fontWeight:700,color:'#2EC4B6',letterSpacing:'0.12em',textTransform:'uppercase'}}>How it works</p>
                <h2 style={{margin:'0 0 14px',fontSize:'clamp(22px,4vw,30px)',fontWeight:700,color:'#0B1F3A',fontFamily:'Georgia,serif',lineHeight:1.2}}>
                  Find the right spot, every time
                </h2>
                <p style={{margin:'0 auto',fontSize:15,color:'#64748b',lineHeight:1.7,maxWidth:500}}>
                  No fake reviews. No endless scrolling.<br/>Just the right vibe for the right moment.
                </p>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:20,marginBottom:40}}>
                {[
                  {step:'01',icon:'\uD83D\uDD0D',title:'Discover',desc:'We pull real, open-source data from across Toronto \u2014 no paid placements, no sponsored results. What you see is earned, not bought.'},
                  {step:'02',icon:'\u2728',title:'Analyze',desc:'Our vibe engine reads between the lines \u2014 figuring out if a spot is great for a quiet first date, a loud birthday, or a solo work session.'},
                  {step:'03',icon:'\uD83C\uDFAF',title:'Match',desc:'Tell us the mood. We will surface the perfect spot based on your vibe, occasion, and where you are right now.'},
                ].map((s)=>(
                  <div key={s.step}
                    style={{background:'#F7F9FC',borderRadius:16,padding:'26px 22px',border:'1px solid #e2eaf4',transition:'box-shadow 0.2s,transform 0.2s',position:'relative',overflow:'hidden'}}
                    onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 4px 24px rgba(46,196,182,0.12)';e.currentTarget.style.transform='translateY(-2px)';}}
                    onMouseLeave={e=>{e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='translateY(0)';}}>
                    <span style={{position:'absolute',top:14,right:18,fontSize:40,fontWeight:900,color:'#e2eaf4',lineHeight:1,userSelect:'none'}}>{s.step}</span>
                    <div style={{width:44,height:44,borderRadius:12,background:'linear-gradient(135deg,#2EC4B6,#1aada3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,marginBottom:16,boxShadow:'0 4px 12px rgba(46,196,182,0.3)'}}>
                      {s.icon}
                    </div>
                    <h3 style={{margin:'0 0 8px',fontSize:18,fontWeight:700,color:'#0B1F3A'}}>{s.title}</h3>
                    <p style={{margin:0,fontSize:14,color:'#64748b',lineHeight:1.65}}>{s.desc}</p>
                  </div>
                ))}
              </div>
              <div style={{display:'flex',justifyContent:'center',flexWrap:'wrap',gap:12,marginBottom:40}}>
                {[
                  {icon:'\uD83D\uDEAB',text:'No fake reviews'},
                  {icon:'\u26A1',text:'Find the right vibe instantly'},
                  {icon:'\uD83D\uDCCD',text:'2,900+ Toronto venues'},
                  {icon:'\uD83D\uDD13',text:'Always free'},
                ].map(pill=>(
                  <div key={pill.text} style={{display:'flex',alignItems:'center',gap:7,background:'#F7F9FC',border:'1px solid #dde4ef',borderRadius:99,padding:'8px 16px',fontSize:13,fontWeight:600,color:'#0B1F3A'}}>
                    <span>{pill.icon}</span>{pill.text}
                  </div>
                ))}
              </div>
              <div style={{textAlign:'center'}}>
                <button
                  onClick={()=>{window.scrollTo({top:0,behavior:'smooth'});setTimeout(()=>intentRef.current&&intentRef.current.focus(),400);}}
                  style={{background:'#2EC4B6',color:'#fff',border:'none',borderRadius:12,padding:'14px 40px',fontSize:15,fontWeight:700,cursor:'pointer',transition:'background 0.15s',boxShadow:'0 4px 20px rgba(46,196,182,0.35)'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#1aada3'}
                  onMouseLeave={e=>e.currentTarget.style.background='#2EC4B6'}>
                  Try it Now &rarr;
                </button>
                <p style={{margin:'12px 0 0',fontSize:13,color:'#94a3b8'}}>
                  No account needed &middot; just type and go
                </p>
              </div>
            </div>
          </div>
        )}

        <div style={{maxWidth:860,margin:'-1px auto 0',padding:'0 24px'}}>
          <button onClick={()=>setShowAdvanced(a=>!a)}
            style={{display:'flex',alignItems:'center',gap:6,margin:'16px 0 0',background:'none',border:'none',cursor:'pointer',fontSize:13,color:'#94a3b8',fontWeight:500,padding:0}}>
            <span style={{fontSize:11,transition:'transform 0.2s',display:'inline-block',transform:showAdvanced?'rotate(180deg)':'rotate(0deg)'}}>&#9660;</span>
            {showAdvanced?'Hide advanced filters':'Advanced filters (neighbourhood, occasion, vibe, day, time)'}
          </button>
          {showAdvanced&&(
            <div style={{background:'#fff',borderRadius:16,boxShadow:'0 4px 24px rgba(11,31,58,0.08)',padding:'22px 24px',marginTop:10,marginBottom:4}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14,marginBottom:14}}>
                <SelectField label="Neighbourhood" value={form.location} onChange={v=>set('location',v)} options={NEIGHBOURHOODS} placeholder="All Toronto" optional/>
                <SelectField label="Occasion" value={form.occasion} onChange={v=>set('occasion',v)} options={OCCASIONS} placeholder="Any occasion" optional/>
                <SelectField label="Vibe" value={form.vibe} onChange={v=>set('vibe',v)} options={VIBES} placeholder="Any vibe" optional/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14,marginBottom:14}}>
                <CuisineMultiselect selected={selectedCuisines} onChange={setSelectedCuisines}/>
                <SelectField label="Day" value={form.day} onChange={v=>set('day',v)} options={DAYS} placeholder="Day"/>
                <SelectField label="Time" value={form.time} onChange={v=>set('time',v)} options={TIMES} placeholder="Time"/>
              </div>
              {selectedCuisines.length>0&&selectedCuisines.length<=6&&(
                <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}}>
                  {selectedCuisines.map(c=>(
                    <button key={c} type="button" onClick={()=>setSelectedCuisines(selectedCuisines.filter(x=>x!==c))}
                      style={{display:'flex',alignItems:'center',gap:4,fontSize:12,fontWeight:500,padding:'3px 10px',borderRadius:99,background:'#e8faf8',color:'#2EC4B6',border:'1px solid #9de0db',cursor:'pointer'}}>
                      {c} <span style={{fontSize:10,fontWeight:700}}>{String.fromCharCode(215)}</span>
                    </button>
                  ))}
                </div>
              )}
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>search(false)}
                  style={{flex:1,background:'#2EC4B6',color:'#fff',border:'none',borderRadius:10,padding:'12px 20px',fontSize:14,fontWeight:700,cursor:'pointer',transition:'background 0.15s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#1aada3'}
                  onMouseLeave={e=>e.currentTarget.style.background='#2EC4B6'}>
                  Search with Filters
                </button>
                <button onClick={()=>search(true)}
                  style={{background:'#0B1F3A',color:'#fff',border:'none',borderRadius:10,padding:'12px 18px',fontSize:14,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>
                  Surprise Me
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{padding:'24px 24px 80px',maxWidth:860,margin:'0 auto'}}>
          {loading&&(
            <div className="cards-grid">
              {[1,2,3,4].map(i=>(
                <div key={i} style={{background:'#fff',borderRadius:16,padding:22,boxShadow:'0 1px 4px rgba(11,31,58,0.06)',animationName:'pulseSoft',animationDuration:'1.5s',animationTimingFunction:'ease-in-out',animationIterationCount:'infinite'}}>
                  <div style={{height:20,background:'#e2eaf4',borderRadius:6,width:'55%',marginBottom:8}}/>
                  <div style={{height:12,background:'#e2eaf4',borderRadius:6,width:'35%',marginBottom:14}}/>
                  <div style={{height:12,background:'#e2eaf4',borderRadius:6,width:'90%',marginBottom:6}}/>
                  <div style={{height:12,background:'#e2eaf4',borderRadius:6,width:'70%'}}/>
                </div>
              ))}
            </div>
          )}
          {error&&<div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:'12px 16px',marginBottom:16,fontSize:13,color:'#b91c1c'}}>{error}</div>}
          {hasResults&&!loading&&(
            <>
              <div style={{marginBottom:16,display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
                <div>
                  <h2 style={{margin:0,fontSize:20,fontWeight:700,color:'#0B1F3A',fontFamily:'Georgia,serif'}}>
                    {noOccasion
                      ? `${filtersActive?displayResults.length:results.length} venues \u00b7 highest rated`
                      : <>{filtersActive?filteredStrong.length:strongMatchCount} {(filtersActive?filteredStrong.length:strongMatchCount)===1?'match':'matches'}{(filtersActive?filteredSugg.length:(results.length-strongMatchCount))>0&&<span style={{fontSize:15,color:'#94a3b8',fontWeight:400}}> + {filtersActive?filteredSugg.length:(results.length-strongMatchCount)} suggestions</span>}</>
                    }
                  </h2>
                  {effectiveQuery&&(
                    <p style={{margin:'3px 0 0',fontSize:12,color:'#94a3b8'}}>
                      {effectiveQuery.location||'All Toronto'}
                      {effectiveQuery.occasion?` \u00b7 ${effectiveQuery.occasion}`:''}
                      {effectiveQuery.vibe?` \u00b7 ${effectiveQuery.vibe}`:''}
                      {' \u00b7 '}{effectiveQuery.day} {effectiveQuery.time}
                    </p>
                  )}
                  {detectedIntent&&detectedIntent.tags.length>0&&(
                    <div style={{display:'flex',alignItems:'center',flexWrap:'wrap',gap:5,marginTop:6}}>
                      <span style={{fontSize:11,color:'#94a3b8',fontWeight:600}}>Matched:</span>
                      {detectedIntent.tags.slice(0,4).map(t=>(
                        <span key={t} style={{fontSize:11,background:'#e8faf8',color:'#2EC4B6',padding:'2px 8px',borderRadius:99,border:'1px solid #9de0db',fontWeight:500}}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={()=>{setResults(null);setEffectiveQuery(null);setDetectedIntent(null);setIntentQuery('');setTimeout(()=>intentRef.current&&intentRef.current.focus(),50);}}
                  style={{background:'none',border:'1.5px solid #dde4ef',borderRadius:8,padding:'6px 14px',fontSize:13,color:'#64748b',cursor:'pointer',fontWeight:500,whiteSpace:'nowrap'}}>
                  {'\u2190'} New search
                </button>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16,flexWrap:'wrap'}}>
                <button onClick={()=>setOpenNowOnly(o=>!o)}
                  style={{display:'flex',alignItems:'center',gap:5,padding:'6px 14px',borderRadius:99,fontSize:13,fontWeight:600,border:'1.5px solid '+(openNowOnly?'#16a34a':'#dde4ef'),background:openNowOnly?'#f0fdf4':'#fff',color:openNowOnly?'#16a34a':'#64748b',cursor:'pointer',transition:'all 0.15s'}}>
                  <span style={{fontSize:10}}>&#x25CF;</span> Open now
                </button>
                {[1,2,3,4].map(p=>(
                  <button key={p} onClick={()=>setSelectedPrices(prev=>prev.includes(p)?prev.filter(x=>x!==p):[...prev,p])}
                    style={{padding:'6px 14px',borderRadius:99,fontSize:13,fontWeight:600,border:'1.5px solid '+(selectedPrices.includes(p)?'#2EC4B6':'#dde4ef'),background:selectedPrices.includes(p)?'#e8faf8':'#fff',color:selectedPrices.includes(p)?'#2EC4B6':'#64748b',cursor:'pointer',transition:'all 0.15s'}}>
                    {PRICE_SYMBOLS[p]}
                  </button>
                ))}
                {filtersActive&&(
                  <button onClick={()=>{setOpenNowOnly(false);setSelectedPrices([]);}}
                    style={{fontSize:12,color:'#94a3b8',background:'none',border:'none',cursor:'pointer',padding:'6px 4px',fontWeight:500}}>Clear</button>
                )}
                {filtersActive&&<span style={{fontSize:12,color:'#94a3b8'}}>{displayResults.length} of {results.length} shown</span>}
              </div>
              {!noOccasion&&strongMatchCount===0&&!filtersActive&&(
                <div style={{background:'#fff',borderRadius:12,padding:'14px 18px',marginBottom:14,border:'1px solid #e2eaf4',fontSize:14,color:'#64748b'}}>
                  No perfect matches found \u2014 showing nearby suggestions below.
                </div>
              )}
              <div className="cards-grid">
                {noOccasion
                  ? displayResults.map((r,i)=><RestaurantCard key={r.id} r={r} index={i} userLocation={userLocation}/>)
                  : (
                    <>
                      {filteredStrong.map((r,i)=><RestaurantCard key={r.id} r={r} index={i} userLocation={userLocation}/>)}
                      {filteredSugg.length>0&&(
                        <>
                          <div className="ymal-sep"><YMALSeparator/></div>
                          {filteredSugg.map((r,i)=><RestaurantCard key={r.id} r={r} index={i+filteredStrong.length} userLocation={userLocation}/>)}
                        </>
                      )}
                    </>
                  )
                }
              </div>
            </>
          )}
          {!hasResults&&!loading&&(
            <div style={{textAlign:'center',padding:'32px 0 0',color:'#94a3b8'}}>
              <p style={{margin:0,fontSize:14}}>Type your vibe above, or tap a chip to get started</p>
            </div>
          )}
        </div>

        <footer style={{borderTop:'1px solid #e2eaf4',padding:'20px 24px',textAlign:'center',fontSize:13,color:'#94a3b8'}}>
          Toronto Table &middot; {totalVenues?`${totalVenues.toLocaleString()}+`:'2,900+'} Toronto venues &middot; Built with Next.js
          <span style={{margin:'0 8px'}}>&middot;</span>
          <a href="https://www.yelp.com/developers/v3/manage_app" target="_blank" rel="noopener noreferrer" style={{color:'#2EC4B6',textDecoration:'none'}}>Connect Yelp API</a>
        </footer>
      </div>

      <style>{`
        @keyframes fadeUp   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulseSoft{ 0%,100%{opacity:1} 50%{opacity:0.5} }
        *{box-sizing:border-box} body{margin:0;background:#F7F9FC} select option{color:#0B1F3A}
        ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-track{background:#F7F9FC}
        ::-webkit-scrollbar-thumb{background:#c5d1e0;border-radius:3px}
        .nav-link{
          font-size:14px;color:#64748b;font-weight:500;text-decoration:none;
          padding:6px 12px;border-radius:8px;transition:all 0.15s;
        }
        .nav-link:hover{background:#e8faf8;color:#2EC4B6;}
        .nav-link-cta{
          font-size:14px;font-weight:600;color:#fff;text-decoration:none;
          padding:7px 16px;border-radius:8px;background:#2EC4B6;transition:background 0.15s;
        }
        .nav-link-cta:hover{background:#1aada3;}
        .vibe-chip{
          background:rgba(255,255,255,0.10);border:1px solid rgba(255,255,255,0.18);
          color:#fff;border-radius:99px;padding:7px 15px;
          font-size:13px;font-weight:500;cursor:pointer;
          backdrop-filter:blur(8px);transition:all 0.15s;
          display:inline-flex;align-items:center;gap:6px;
          font-family:'Inter',sans-serif;
        }
        .vibe-chip:hover{background:rgba(46,196,182,0.22);border-color:#2EC4B6;}
        .cards-grid{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:14px;
        }
        .ymal-sep{ grid-column:1/-1; }
        @media(max-width:640px){
          .cards-grid{grid-template-columns:1fr;}
          .nav-link{display:none;}
        }
      `}</style>
    </>
  );
}
