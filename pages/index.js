import { useState } from 'react';
import Head from 'next/head';

const NEIGHBOURHOODS = ['Bay Street Corridor','Chinatown','Distillery District','Dundas West','Harbord Village','Kensington Market','King West','Leslieville','Liberty Village','Little Italy','Niagara','Ossington','Queen West','Roncesvalles','The Annex','Yorkville'];
const OCCASIONS = [{value:'date',label:'Date Night'},{value:'casual dinner',label:'Casual Dinner'},{value:'celebration',label:'Celebration'},{value:'business',label:'Business'}];
const VIBES = [{value:'trendy',label:'Trendy'},{value:'quiet',label:'Quiet'},{value:'upscale',label:'Upscale'},{value:'lively',label:'Lively'}];
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const TIMES = ['12:00 PM','1:00 PM','2:00 PM','5:00 PM','6:00 PM','7:00 PM','8:00 PM','9:00 PM','10:00 PM'];
const PRICE_SYMBOLS = {1:'$',2:'$$',3:'$$$',4:'$$$$'};

function BusynessBar({ busyness }) {
  const cm = { green:{bg:'#22c55e',light:'#dcfce7',text:'#15803d'}, yellow:{bg:'#eab308',light:'#fef9c3',text:'#a16207'}, orange:{bg:'#f97316',light:'#ffedd5',text:'#c2410c'}, red:{bg:'#ef4444',light:'#fee2e2',text:'#b91c1c'} };
  const c = cm[busyness.color] || cm.green;
  return (
    <div style={{display:'flex',alignItems:'center',gap:10}}>
      <div style={{flex:1,height:6,borderRadius:99,background:'#f1f0ee',overflow:'hidden'}}>
        <div style={{height:'100%',width:`${busyness.percentFull}%`,background:c.bg,borderRadius:99,transition:'width 0.6s ease'}} />
      </div>
      <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:99,background:c.light,color:c.text,whiteSpace:'nowrap'}}>{busyness.label} - {busyness.waitEstimate}</span>
    </div>
  );
}

function StarRating({ rating }) {
  const stars = Math.round(rating);
  return <span style={{color:'#f59e0b',fontSize:13,fontWeight:600}}>{'★'.repeat(stars)}<span style={{color:'#9ca3af',fontWeight:400}}>{'★'.repeat(5-stars)}</span><span style={{color:'#6b7280',marginLeft:4}}>{rating.toFixed(1)}</span></span>;
}

function Tag({ children, accent }) {
  return <span style={{display:'inline-block',fontSize:11,fontWeight:500,padding:'3px 9px',borderRadius:99,background:accent?'#fff7f0':'#f5f0eb',color:accent?'#e85d26':'#6b7280',border:accent?'1px solid #fdc9a8':'1px solid #e8e2db',whiteSpace:'nowrap'}}>{children}</span>;
}

function MatchBadge({ score }) {
  const color = score>=80?'#16a34a':score>=60?'#e85d26':'#9ca3af';
  const bg = score>=80?'#f0fdf4':score>=60?'#fff7f0':'#f9fafb';
  return <div style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:12,fontWeight:700,color,background:bg,border:`1px solid ${color}30`,borderRadius:8,padding:'4px 10px'}}>{score>=80?'★':score>=60?'✓':'·'} {score}% match</div>;
}

function RestaurantCard({ r, index }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{background:'#fff',borderRadius:16,boxShadow:'0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.06)',overflow:'hidden',transition:'box-shadow 0.2s,transform 0.2s',animationName:'fadeUp',animationDuration:'0.35s',animationTimingFunction:'ease',animationFillMode:'both',animationDelay:`${index*0.05}s`}}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 4px 8px rgba(0,0,0,0.08),0 12px 32px rgba(0,0,0,0.10)';e.currentTarget.style.transform='translateY(-2px)';}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.06)';e.currentTarget.style.transform='translateY(0)';}}>
      <div style={{height:4,background:r.matchScore>=80?'linear-gradient(90deg,#16a34a,#4ade80)':r.matchScore>=60?'linear-gradient(90deg,#e85d26,#fb923c)':'linear-gradient(90deg,#d1d5db,#e5e7eb)'}} />
      <div style={{padding:'20px 24px 24px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,marginBottom:12}}>
          <div style={{flex:1,minWidth:0}}>
            <h3 style={{margin:0,fontSize:19,fontWeight:700,color:'#1a1a1a',lineHeight:1.2,fontFamily:'Georgia,serif'}}>{r.name}</h3>
            <p style={{margin:'4px 0 0',fontSize:13,color:'#6b7280'}}>{r.neighbourhood} · {r.cuisine} · {PRICE_SYMBOLS[r.priceLevel]}</p>
          </div>
          <MatchBadge score={r.matchScore} />
        </div>
        <div style={{marginBottom:14}}><StarRating rating={r.rating} /></div>
        <p style={{margin:'0 0 14px',fontSize:14,color:'#374151',lineHeight:1.6}}>{r.vibeDescription}</p>
        <div style={{background:'#fafaf8',border:'1px solid #f0ede8',borderRadius:10,padding:'10px 14px',marginBottom:14}}>
          <p style={{margin:0,fontSize:13,color:'#374151',lineHeight:1.5}}><span style={{fontWeight:600,color:'#1a1a1a'}}>Why it fits: </span>{r.whyRecommended}</p>
        </div>
        <div style={{marginBottom:16}}>
          <p style={{margin:'0 0 6px',fontSize:12,fontWeight:600,color:'#9ca3af',letterSpacing:'0.05em',textTransform:'uppercase'}}>Current Busyness</p>
          <BusynessBar busyness={r.busyness} />
        </div>
        {r.bestFor && r.bestFor.length > 0 && <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:16}}>{r.bestFor.map(tag=><Tag key={tag} accent>{tag}</Tag>)}</div>}
        <button onClick={()=>setExpanded(x=>!x)} style={{background:'none',border:'none',padding:0,cursor:'pointer',fontSize:13,color:'#e85d26',fontWeight:600}}>
          {expanded ? '▲ Less' : '▼ Insider tip & details'}
        </button>
        {expanded && (
          <div style={{marginTop:14,display:'flex',flexDirection:'column',gap:12}}>
            <div style={{background:'linear-gradient(135deg,#fff7f0,#ffeedd)',border:'1px solid #fdc9a8',borderRadius:10,padding:'12px 14px'}}>
              <p style={{margin:'0 0 4px',fontSize:11,fontWeight:700,color:'#e85d26',textTransform:'uppercase',letterSpacing:'0.05em'}}>Insider Tip</p>
              <p style={{margin:0,fontSize:13,color:'#374151',lineHeight:1.5}}>{r.insiderTip}</p>
            </div>
            {r.peakTimes && r.peakTimes.length > 0 && <div><p style={{margin:'0 0 6px',fontSize:12,fontWeight:600,color:'#9ca3af',letterSpacing:'0.05em',textTransform:'uppercase'}}>Peak Times</p><div style={{display:'flex',flexWrap:'wrap',gap:6}}>{r.peakTimes.map(t=><Tag key={t}>{t}</Tag>)}</div></div>}
            {r.tags && r.tags.length > 0 && <div><p style={{margin:'0 0 6px',fontSize:12,fontWeight:600,color:'#9ca3af',letterSpacing:'0.05em',textTransform:'uppercase'}}>Known For</p><div style={{display:'flex',flexWrap:'wrap',gap:6}}>{r.tags.map(t=><Tag key={t}>{t}</Tag>)}</div></div>}
            {r.googleReviews && r.googleReviews[0] && <div><p style={{margin:'0 0 4px',fontSize:12,fontWeight:600,color:'#9ca3af',letterSpacing:'0.05em',textTransform:'uppercase'}}>Guest Review</p><p style={{margin:0,fontSize:13,color:'#6b7280',fontStyle:'italic',lineHeight:1.5}}>"{r.googleReviews[0]}"</p></div>}
            {r.address && <p style={{margin:0,fontSize:12,color:'#9ca3af'}}>📍 {r.address}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder }) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:6}}>
      <label style={{fontSize:12,fontWeight:600,color:'#6b7280',letterSpacing:'0.05em',textTransform:'uppercase'}}>{label}</label>
      <div style={{position:'relative'}}>
        <select value={value} onChange={e=>onChange(e.target.value)} style={{width:'100%',appearance:'none',background:'#fff',border:'1.5px solid #e8e2db',borderRadius:10,padding:'11px 36px 11px 14px',fontSize:15,color:value?'#1a1a1a':'#9ca3af',cursor:'pointer',outline:'none'}}
          onFocus={e=>e.target.style.borderColor='#e85d26'} onBlur={e=>e.target.style.borderColor='#e8e2db'}>
          <option value="">{placeholder}</option>
          {options.map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
        </select>
        <span style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',pointerEvents:'none',color:'#9ca3af',fontSize:12}}>▼</span>
      </div>
    </div>
  );
}

export default function Home() {
  const [form, setForm] = useState({location:'',occasion:'',vibe:'',day:'Friday',time:'7:00 PM'});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [effectiveQuery, setEffectiveQuery] = useState(null);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  async function search(surprise=false) {
    if (!surprise && (!form.location||!form.occasion||!form.vibe)) { setError('Please fill in neighbourhood, occasion, and vibe.'); return; }
    setLoading(true); setError(null); setResults(null);
    try {
      const body = surprise ? {...form, surprise:true, location: form.location||'King West'} : form;
      const res = await fetch('/api/recommend', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const data = await res.json();
      if (!res.ok) setError(data.error||'Something went wrong.');
      else { setResults(data.results); setEffectiveQuery(data.query); }
    } catch { setError('Network error - please try again.'); }
    finally { setLoading(false); }
  }

  const formComplete = form.location && form.occasion && form.vibe;

  return (
    <>
      <Head>
        <title>Toronto Table - Restaurant Intelligence</title>
        <meta name="description" content="Find the perfect Toronto restaurant for any occasion, vibe, and neighbourhood." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div style={{minHeight:'100vh',background:'#fafaf8',fontFamily:"'Inter',system-ui,sans-serif"}}>
        <nav style={{background:'#fff',borderBottom:'1px solid #f0ede8',padding:'0 24px'}}>
          <div style={{maxWidth:800,margin:'0 auto',height:56,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:20}}>🍴</span><span style={{fontSize:16,fontWeight:700,color:'#1a1a1a',letterSpacing:'-0.02em'}}>Toronto Table</span></div>
            <span style={{fontSize:12,color:'#9ca3af',fontWeight:500}}>Restaurant Intelligence</span>
          </div>
        </nav>
        <div style={{background:'linear-gradient(160deg,#1a1a1a 0%,#2d1a0e 100%)',padding:'56px 24px 64px',textAlign:'center'}}>
          <div style={{maxWidth:600,margin:'0 auto'}}>
            <p style={{margin:'0 0 12px',fontSize:13,fontWeight:600,color:'#e85d26',letterSpacing:'0.1em',textTransform:'uppercase'}}>Toronto - AI-Powered</p>
            <h1 style={{margin:'0 0 16px',fontSize:'clamp(32px,5vw,48px)',fontWeight:700,color:'#fff',lineHeight:1.15,letterSpacing:'-0.03em',fontFamily:'Georgia,serif'}}>Find your perfect<br/>Toronto restaurant</h1>
            <p style={{margin:0,fontSize:16,color:'#a8a29e',lineHeight:1.6}}>Tell us the neighbourhood, occasion, and vibe - we will rank the best options and show you exactly why they fit.</p>
          </div>
        </div>
        <div style={{padding:'0 24px',marginTop:-28}}>
          <div style={{maxWidth:720,margin:'0 auto',background:'#fff',borderRadius:20,boxShadow:'0 4px 24px rgba(0,0,0,0.12)',padding:'28px 28px 24px'}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:16,marginBottom:16}}>
              <SelectField label="Neighbourhood" value={form.location} onChange={v=>set('location',v)} options={NEIGHBOURHOODS} placeholder="Pick a neighbourhood" />
              <SelectField label="Occasion" value={form.occasion} onChange={v=>set('occasion',v)} options={OCCASIONS} placeholder="What's the occasion?" />
              <SelectField label="Vibe" value={form.vibe} onChange={v=>set('vibe',v)} options={VIBES} placeholder="What's the vibe?" />
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
              <SelectField label="Day" value={form.day} onChange={v=>set('day',v)} options={DAYS} placeholder="Day" />
              <SelectField label="Time" value={form.time} onChange={v=>set('time',v)} options={TIMES} placeholder="Time" />
            </div>
            {error && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:'10px 14px',marginBottom:16,fontSize:13,color:'#b91c1c'}}>{error}</div>}
            <div style={{display:'flex',gap:12}}>
              <button onClick={()=>search(false)} disabled={loading||!formComplete} style={{flex:1,background:formComplete&&!loading?'#e85d26':'#d1d5db',color:'#fff',border:'none',borderRadius:12,padding:'14px 24px',fontSize:15,fontWeight:700,cursor:formComplete&&!loading?'pointer':'not-allowed',transition:'background 0.2s'}}
                onMouseEnter={e=>{if(formComplete&&!loading)e.target.style.background='#d44e1a';}}
                onMouseLeave={e=>{if(formComplete&&!loading)e.target.style.background='#e85d26';}}>
                {loading ? 'Finding...' : 'Find Restaurants'}
              </button>
              <button onClick={()=>search(true)} disabled={loading} style={{background:'#1a1a1a',color:'#fff',border:'none',borderRadius:12,padding:'14px 20px',fontSize:15,fontWeight:600,cursor:loading?'not-allowed':'pointer',whiteSpace:'nowrap'}}
                onMouseEnter={e=>{if(!loading)e.target.style.background='#374151';}}
                onMouseLeave={e=>{if(!loading)e.target.style.background='#1a1a1a';}}>Surprise Me</button>
            </div>
          </div>
        </div>
        <div style={{padding:'40px 24px 80px',maxWidth:720,margin:'0 auto'}}>
          {loading && <div style={{display:'flex',flexDirection:'column',gap:16}}>{[1,2,3].map(i=><div key={i} style={{background:'#fff',borderRadius:16,padding:24,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',animationName:'pulseSoft',animationDuration:'1.5s',animationTimingFunction:'ease-in-out',animationIterationCount:'infinite'}}><div style={{height:22,background:'#f1f0ee',borderRadius:6,width:'55%',marginBottom:10}}/><div style={{height:14,background:'#f1f0ee',borderRadius:6,width:'35%',marginBottom:16}}/><div style={{height:14,background:'#f1f0ee',borderRadius:6,width:'90%',marginBottom:8}}/><div style={{height:14,background:'#f1f0ee',borderRadius:6,width:'75%'}}/></div>)}</div>}
          {results && !loading && (
            <>
              <div style={{marginBottom:24,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
                <div>
                  <h2 style={{margin:0,fontSize:22,fontWeight:700,color:'#1a1a1a',fontFamily:'Georgia,serif'}}>{results.length} restaurants found</h2>
                  {effectiveQuery && <p style={{margin:'4px 0 0',fontSize:13,color:'#9ca3af'}}>{effectiveQuery.location} · {effectiveQuery.occasion} · {effectiveQuery.vibe} vibe · {effectiveQuery.day} {effectiveQuery.time}</p>}
                </div>
                <button onClick={()=>{setResults(null);setEffectiveQuery(null);}} style={{background:'none',border:'1.5px solid #e8e2db',borderRadius:8,padding:'6px 14px',fontSize:13,color:'#6b7280',cursor:'pointer',fontWeight:500}}>New search</button>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:16}}>{results.map((r,i)=><RestaurantCard key={r.id} r={r} index={i}/>)}</div>
            </>
          )}
          {!results && !loading && (
            <div style={{textAlign:'center',padding:'48px 0',color:'#b0a99f'}}>
              <div style={{fontSize:48,marginBottom:12}}>🍽️</div>
              <p style={{margin:0,fontSize:16,fontWeight:500}}>Your restaurant picks will appear here</p>
              <p style={{margin:'8px 0 0',fontSize:14}}>Fill in the form above and hit Find, or try Surprise Me</p>
            </div>
          )}
        </div>
        <div style={{borderTop:'1px solid #f0ede8',padding:'20px 24px',textAlign:'center',fontSize:13,color:'#b0a99f'}}>Toronto Table · Restaurant data is simulated for demonstration · Built with Next.js</div>
      </div>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes pulseSoft{0%,100%{opacity:1}50%{opacity:0.5}}*{box-sizing:border-box}body{margin:0}select option{color:#1a1a1a}`}</style>
    </>
  );
}
