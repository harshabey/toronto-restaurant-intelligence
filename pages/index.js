import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';

const NEIGHBOURHOODS = [
  'Bay Street Corridor', 'Chinatown', 'Distillery District', 'Dundas West',
  'Harbord Village', 'Harbourfront', 'Kensington Market', 'King West', 'Leslieville',
  'Liberty Village', 'Little Italy', 'Niagara', 'Ossington',
  'Queen West', 'Roncesvalles', 'The Annex', 'Yorkville',
];

const OCCASIONS = [
  { value: 'date',           label: 'Date Night' },
  { value: 'first date',     label: 'First Date' },
  { value: 'follow-up date', label: 'Follow-Up Date' },
  { value: 'catching up',    label: 'Catching Up' },
  { value: 'casual dinner',  label: 'Casual Dinner' },
  { value: 'celebration',    label: 'Celebration' },
  { value: 'business',       label: 'Business' },
  { value: 'family dinner',  label: 'Family Dinner' },
  { value: 'small group',    label: 'Small Group (3–5)' },
  { value: 'large group',    label: 'Large Group (6+)' },
  { value: 'solo',           label: 'Solo Dining' },
  { value: 'brunch',         label: 'Brunch' },
  { value: 'breakfast',      label: 'Breakfast' },
  { value: 'late night',     label: 'Late Night' },
  { value: 'coffee',         label: 'Coffee' },
];

const VIBES = [
  { value: 'trendy',                label: 'Trendy' },
  { value: 'upscale',               label: 'Upscale' },
  { value: 'lively',                label: 'Lively' },
  { value: 'quiet',                 label: 'Quiet' },
  { value: 'conversation friendly', label: 'Conversation Friendly' },
  { value: 'music forward',         label: 'Music Forward' },
  { value: 'happy hour friendly',   label: 'Happy Hour' },
];

const CUISINE_OPTIONS = [
  'Italian', 'Japanese', 'Korean', 'Mexican', 'Mediterranean', 'Middle Eastern',
  'Indian', 'Thai', 'Asian Fusion', 'Chinese', 'Vietnamese',
  'American', 'Canadian', 'French', 'Spanish', 'Seafood', 'Steakhouse',
  'BBQ', 'Pizza', 'Tapas', 'Brunch & Breakfast', 'Coffee & Cafe',
  'Bar', 'Wine Bar', 'Gastropub', 'Vegan/Vegetarian',
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

const PRICE_SYMBOLS = { 1:'$', 2:'$$', 3:'$$$', 4:'$$$$' };

// ─── Sub-components ──────────────────────────────────────────────────────────

function BusynessBar({ busyness }) {
  const cm = {
    green:  { bg:'#22c55e', light:'#dcfce7', text:'#15803d' },
    yellow: { bg:'#eab308', light:'#fef9c3', text:'#a16207' },
    orange: { bg:'#f97316', light:'#ffedd5', text:'#c2410c' },
    red:    { bg:'#ef4444', light:'#fee2e2', text:'#b91c1c' },
  };
  const c = cm[busyness.color] || cm.green;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <div style={{ flex:1, height:6, borderRadius:99, background:'#f1f0ee', overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${busyness.percentFull}%`, background:c.bg, borderRadius:99, transition:'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:99, background:c.light, color:c.text, whiteSpace:'nowrap' }}>
        {busyness.label} &middot; {busyness.waitEstimate}
      </span>
    </div>
  );
}

function StarRating({ rating }) {
  const stars = Math.round(rating);
  return (
    <span style={{ color:'#f59e0b', fontSize:13, fontWeight:600 }}>
      {'\u2605'.repeat(stars)}
      <span style={{ color:'#9ca3af', fontWeight:400 }}>{'\u2605'.repeat(5 - stars)}</span>
      <span style={{ color:'#6b7280', marginLeft:4 }}>{rating.toFixed(1)}</span>
    </span>
  );
}

function Tag({ children, accent }) {
  return (
    <span style={{
      display:'inline-block', fontSize:11, fontWeight:500,
      padding:'3px 9px', borderRadius:99,
      background: accent ? '#fff7f0' : '#f5f0eb',
      color: accent ? '#e85d26' : '#6b7280',
      border: accent ? '1px solid #fdc9a8' : '1px solid #e8e2db',
      whiteSpace:'nowrap',
    }}>
      {children}
    </span>
  );
}

function MatchBadge({ score }) {
  const color = score >= 80 ? '#16a34a' : score >= 60 ? '#e85d26' : '#9ca3af';
  const bg    = score >= 80 ? '#f0fdf4' : score >= 60 ? '#fff7f0' : '#f9fafb';
  return (
    <div style={{
      display:'inline-flex', alignItems:'center', gap:4,
      fontSize:12, fontWeight:700, color, background:bg,
      border:`1px solid ${color}30`, borderRadius:8, padding:'4px 10px',
    }}>
      {score >= 80 ? '\u2605' : score >= 60 ? '\u2713' : '\u00b7'} {score}% match
    </div>
  );
}

function VenueTypePill({ r }) {
  if (r.lateNight && r.isBar) return <span style={{ fontSize:11, background:'#1e1b4b', color:'#c7d2fe', padding:'2px 8px', borderRadius:99, fontWeight:600 }}>🌙 Late Night Bar</span>;
  if (r.isBar) return <span style={{ fontSize:11, background:'#fef3c7', color:'#92400e', padding:'2px 8px', borderRadius:99, fontWeight:600 }}>🍺 Bar</span>;
  if (r.isCafe) return <span style={{ fontSize:11, background:'#f0fdf4', color:'#166534', padding:'2px 8px', borderRadius:99, fontWeight:600 }}>☕ Cafe</span>;
  return null;
}

function RestaurantCard({ r, index }) {
  const [expanded, setExpanded] = useState(false);
  const redditUrl = `https://www.reddit.com/r/toronto/search/?q=${encodeURIComponent(r.name)}&sort=top&t=year`;

  return (
    <div
      style={{
        background:'#fff', borderRadius:16,
        boxShadow:'0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
        overflow:'hidden', transition:'box-shadow 0.2s, transform 0.2s',
        animationName:'fadeUp', animationDuration:'0.35s',
        animationTimingFunction:'ease', animationFillMode:'both',
        animationDelay:`${index * 0.05}s`,
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow='0 4px 8px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.10)'; e.currentTarget.style.transform='translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)'; e.currentTarget.style.transform='translateY(0)'; }}
    >
      <div style={{
        height:4,
        background: r.matchScore >= 80
          ? 'linear-gradient(90deg,#16a34a,#4ade80)'
          : r.matchScore >= 60
          ? 'linear-gradient(90deg,#e85d26,#fb923c)'
          : 'linear-gradient(90deg,#d1d5db,#e5e7eb)',
      }} />

      <div style={{ padding:'20px 24px 24px' }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, marginBottom:8 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
              <h3 style={{ margin:0, fontSize:19, fontWeight:700, color:'#1a1a1a', lineHeight:1.2, fontFamily:'Georgia, serif' }}>{r.name}</h3>
              <VenueTypePill r={r} />
            </div>
            <p style={{ margin:0, fontSize:13, color:'#6b7280' }}>
              {r.neighbourhood} &middot; {r.cuisine} &middot; {PRICE_SYMBOLS[r.priceLevel]}
            </p>
          </div>
          <MatchBadge score={r.matchScore} />
        </div>

        <div style={{ marginBottom:12 }}><StarRating rating={r.rating} />
          <span style={{ fontSize:12, color:'#9ca3af', marginLeft:6 }}>({r.reviewCount?.toLocaleString()} reviews)</span>
        </div>

        <p style={{ margin:'0 0 12px', fontSize:14, color:'#374151', lineHeight:1.6 }}>{r.vibeDescription}</p>

        {/* Why it fits */}
        <div style={{ background:'#fafaf8', border:'1px solid #f0ede8', borderRadius:10, padding:'10px 14px', marginBottom:12 }}>
          <p style={{ margin:0, fontSize:13, color:'#374151', lineHeight:1.5 }}>
            <span style={{ fontWeight:600, color:'#1a1a1a' }}>Why it fits: </span>
            {r.whyRecommended}
          </p>
        </div>

        {/* Busyness */}
        <div style={{ marginBottom:14 }}>
          <p style={{ margin:'0 0 6px', fontSize:11, fontWeight:600, color:'#9ca3af', letterSpacing:'0.05em', textTransform:'uppercase' }}>Current Busyness</p>
          <BusynessBar busyness={r.busyness} />
        </div>

        {/* Best-for tags */}
        {r.bestFor && r.bestFor.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:14 }}>
            {r.bestFor.map(tag => <Tag key={tag} accent>{tag}</Tag>)}
          </div>
        )}

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(x => !x)}
          style={{ background:'none', border:'none', padding:0, cursor:'pointer', fontSize:13, color:'#e85d26', fontWeight:600 }}
        >
          {expanded ? '\u25b2 Less' : '\u25bc Insider tip, transit & more'}
        </button>

        {expanded && (
          <div style={{ marginTop:14, display:'flex', flexDirection:'column', gap:12 }}>

            {/* Insider tip */}
            <div style={{ background:'linear-gradient(135deg,#fff7f0,#ffeedd)', border:'1px solid #fdc9a8', borderRadius:10, padding:'12px 14px' }}>
              <p style={{ margin:'0 0 4px', fontSize:11, fontWeight:700, color:'#e85d26', textTransform:'uppercase', letterSpacing:'0.05em' }}>Insider Tip</p>
              <p style={{ margin:0, fontSize:13, color:'#374151', lineHeight:1.5 }}>{r.insiderTip}</p>
            </div>

            {/* Transit */}
            {r.transit && (r.transit.subway.length > 0 || r.transit.streetcar.length > 0) && (
              <div>
                <p style={{ margin:'0 0 8px', fontSize:11, fontWeight:600, color:'#9ca3af', letterSpacing:'0.05em', textTransform:'uppercase' }}>Nearest Transit</p>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {r.transit.subway.slice(0, 1).map(s => (
                    <div key={s.name} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#374151' }}>
                      <span style={{ fontSize:16 }}>🚇</span>
                      <span><strong>{s.name}</strong> &middot; {s.line}</span>
                      <span style={{ marginLeft:'auto', color:'#9ca3af', fontSize:12, whiteSpace:'nowrap' }}>{s.walkMinutes} min walk</span>
                    </div>
                  ))}
                  {r.transit.streetcar.map(s => (
                    <div key={s.route} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#374151' }}>
                      <span style={{ fontSize:16 }}>🚋</span>
                      <span><strong>{s.route}</strong></span>
                      <span style={{ marginLeft:'auto', color:'#9ca3af', fontSize:12, whiteSpace:'nowrap' }}>{s.walkMinutes} min walk</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Peak times */}
            {r.peakTimes && r.peakTimes.length > 0 && (
              <div>
                <p style={{ margin:'0 0 6px', fontSize:11, fontWeight:600, color:'#9ca3af', letterSpacing:'0.05em', textTransform:'uppercase' }}>Peak Times</p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>{r.peakTimes.map(t => <Tag key={t}>{t}</Tag>)}</div>
              </div>
            )}

            {/* Tags */}
            {r.tags && r.tags.length > 0 && (
              <div>
                <p style={{ margin:'0 0 6px', fontSize:11, fontWeight:600, color:'#9ca3af', letterSpacing:'0.05em', textTransform:'uppercase' }}>Known For</p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>{r.tags.map(t => <Tag key={t}>{t}</Tag>)}</div>
              </div>
            )}

            {/* Review */}
            {r.googleReviews && r.googleReviews[0] && (
              <div>
                <p style={{ margin:'0 0 4px', fontSize:11, fontWeight:600, color:'#9ca3af', letterSpacing:'0.05em', textTransform:'uppercase' }}>Guest Review</p>
                <p style={{ margin:0, fontSize:13, color:'#6b7280', fontStyle:'italic', lineHeight:1.5 }}>&ldquo;{r.googleReviews[0]}&rdquo;</p>
              </div>
            )}

            {/* Community + address */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
              {r.address && <p style={{ margin:0, fontSize:12, color:'#9ca3af' }}>📍 {r.address}</p>}
              <a
                href={redditUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize:12, color:'#e85d26', fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}
              >
                <span style={{ fontSize:14 }}>🗨️</span> Community on Reddit
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder, optional }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <label style={{ fontSize:12, fontWeight:600, color:'#6b7280', letterSpacing:'0.05em', textTransform:'uppercase' }}>
        {label}{optional && <span style={{ fontWeight:400, color:'#b0a99f', marginLeft:4 }}>(optional)</span>}
      </label>
      <div style={{ position:'relative' }}>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            width:'100%', appearance:'none', background:'#fff',
            border:'1.5px solid #e8e2db', borderRadius:10,
            padding:'11px 36px 11px 14px', fontSize:15,
            color: value ? '#1a1a1a' : '#9ca3af',
            cursor:'pointer', outline:'none', transition:'border-color 0.15s ease',
          }}
          onFocus={e => e.target.style.borderColor='#e85d26'}
          onBlur={e => e.target.style.borderColor='#e8e2db'}
        >
          <option value="">{placeholder}</option>
          {options.map(o => (
            <option key={o.value || o} value={o.value || o}>{o.label || o}</option>
          ))}
        </select>
        <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:'#9ca3af', fontSize:12 }}>\u25bc</span>
      </div>
    </div>
  );
}

function CuisineMultiselect({ selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggle = c => onChange(selected.includes(c) ? selected.filter(x => x !== c) : [...selected, c]);
  const label = selected.length === 0
    ? 'All cuisines'
    : selected.length === 1
    ? selected[0]
    : `${selected.length} cuisines selected`;

  return (
    <div ref={ref} style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <label style={{ fontSize:12, fontWeight:600, color:'#6b7280', letterSpacing:'0.05em', textTransform:'uppercase' }}>
        Cuisine <span style={{ fontWeight:400, color:'#b0a99f' }}>(optional)</span>
      </label>
      <div style={{ position:'relative' }}>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          style={{
            width:'100%', appearance:'none', background:'#fff',
            border:'1.5px solid ' + (open ? '#e85d26' : '#e8e2db'),
            borderRadius:10, padding:'11px 36px 11px 14px',
            fontSize:15, color: selected.length > 0 ? '#1a1a1a' : '#9ca3af',
            cursor:'pointer', outline:'none', textAlign:'left',
            transition:'border-color 0.15s ease',
          }}
        >
          {label}
        </button>
        <span style={{ position:'absolute', right:12, top:'50%', transform:`translateY(-50%) rotate(${open?180:0}deg)`, pointerEvents:'none', color:'#9ca3af', fontSize:12, transition:'transform 0.2s' }}>\u25bc</span>

        {open && (
          <div style={{
            position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:200,
            background:'#fff', border:'1.5px solid #e8e2db', borderRadius:12,
            padding:12, maxHeight:280, overflowY:'auto',
            boxShadow:'0 8px 32px rgba(0,0,0,0.14)',
          }}>
            <div style={{ display:'flex', gap:8, marginBottom:10, paddingBottom:10, borderBottom:'1px solid #f0ede8' }}>
              <button
                type="button"
                onClick={() => onChange([...CUISINE_OPTIONS])}
                style={{ flex:1, fontSize:12, fontWeight:600, padding:'5px 0', background:'#f5f0eb', border:'none', borderRadius:6, cursor:'pointer', color:'#374151' }}
              >Select All</button>
              <button
                type="button"
                onClick={() => onChange([])}
                style={{ flex:1, fontSize:12, fontWeight:600, padding:'5px 0', background:'#f5f0eb', border:'none', borderRadius:6, cursor:'pointer', color:'#374151' }}
              >Clear</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'2px 12px' }}>
              {CUISINE_OPTIONS.map(c => (
                <label key={c} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 4px', cursor:'pointer', fontSize:13, color:'#374151', borderRadius:6 }}>
                  <input
                    type="checkbox"
                    checked={selected.includes(c)}
                    onChange={() => toggle(c)}
                    style={{ accentColor:'#e85d26', width:14, height:14 }}
                  />
                  {c}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function YMALSeparator() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, margin:'8px 0' }}>
      <div style={{ flex:1, height:1, background:'linear-gradient(90deg,transparent,#e8e2db)' }} />
      <div style={{
        fontSize:12, fontWeight:600, color:'#9ca3af',
        background:'#fff', border:'1px solid #e8e2db',
        borderRadius:99, padding:'5px 14px', whiteSpace:'nowrap',
        letterSpacing:'0.04em', textTransform:'uppercase',
      }}>
        You Might Also Like
      </div>
      <div style={{ flex:1, height:1, background:'linear-gradient(90deg,#e8e2db,transparent)' }} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [form, setForm] = useState({ location:'', occasion:'', vibe:'', day:'Friday', time:'7:00 PM' });
  const [selectedCuisines, setSelectedCuisines] = useState([]);
  const [strongMatches, setStrongMatches] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [effectiveQuery, setEffectiveQuery] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function search(surprise = false) {
    if (!surprise && !form.occasion) {
      setError('Please select an occasion.');
      return;
    }
    setLoading(true); setError(null); setStrongMatches(null); setSuggestions(null);
    try {
      const body = surprise
        ? { ...form, surprise: true }
        : { ...form, cuisines: selectedCuisines.join(',') };
      const res  = await fetch('/api/recommend', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong.'); }
      else {
        setStrongMatches(data.strongMatches || []);
        setSuggestions(data.suggestions || []);
        setEffectiveQuery(data.query);
      }
    } catch { setError('Network error \u2014 please try again.'); }
    finally { setLoading(false); }
  }

  const hasResults = strongMatches !== null;
  const totalResults = (strongMatches?.length || 0) + (suggestions?.length || 0);
  const formReady = !!form.occasion;

  return (
    <>
      <Head>
        <title>Toronto Table - Restaurant Intelligence</title>
        <meta name="description" content="Find the perfect Toronto restaurant, bar, or cafe for any occasion, vibe, and neighbourhood." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ minHeight:'100vh', background:'#fafaf8', fontFamily:"'Inter', system-ui, sans-serif" }}>

        {/* Nav */}
        <nav style={{ background:'#fff', borderBottom:'1px solid #f0ede8', padding:'0 24px' }}>
          <div style={{ maxWidth:820, margin:'0 auto', height:56, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:20 }}>🍴</span>
              <span style={{ fontSize:16, fontWeight:700, color:'#1a1a1a', letterSpacing:'-0.02em' }}>Toronto Table</span>
            </div>
            <span style={{ fontSize:12, color:'#9ca3af', fontWeight:500 }}>Restaurant &middot; Bar &middot; Cafe Intelligence</span>
          </div>
        </nav>

        {/* Hero */}
        <div style={{ background:'linear-gradient(160deg,#1a1a1a 0%,#2d1a0e 100%)', padding:'52px 24px 60px', textAlign:'center' }}>
          <div style={{ maxWidth:600, margin:'0 auto' }}>
            <p style={{ margin:'0 0 10px', fontSize:13, fontWeight:600, color:'#e85d26', letterSpacing:'0.1em', textTransform:'uppercase' }}>Toronto &middot; Restaurants, Bars & Cafes</p>
            <h1 style={{ margin:'0 0 16px', fontSize:'clamp(30px,5vw,46px)', fontWeight:700, color:'#fff', lineHeight:1.15, letterSpacing:'-0.03em', fontFamily:'Georgia, serif' }}>
              Find your perfect<br />Toronto spot
            </h1>
            <p style={{ margin:0, fontSize:16, color:'#a8a29e', lineHeight:1.6 }}>
              Pick an occasion and vibe &mdash; we rank the best matches and show exactly why they fit, with busyness estimates and transit directions.
            </p>
          </div>
        </div>

        {/* Search form */}
        <div style={{ padding:'0 24px', marginTop:-28 }}>
          <div style={{ maxWidth:760, margin:'0 auto', background:'#fff', borderRadius:20, boxShadow:'0 4px 24px rgba(0,0,0,0.12)', padding:'28px 28px 24px' }}>

            {/* Row 1: neighbourhood + occasion + vibe */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16, marginBottom:16 }}>
              <SelectField label="Neighbourhood" value={form.location} onChange={v => set('location',v)}
                options={NEIGHBOURHOODS} placeholder="All Toronto" optional />
              <SelectField label="Occasion" value={form.occasion} onChange={v => set('occasion',v)}
                options={OCCASIONS} placeholder="What's the occasion?" />
              <SelectField label="Vibe" value={form.vibe} onChange={v => set('vibe',v)}
                options={VIBES} placeholder="Any vibe" optional />
            </div>

            {/* Row 2: cuisine + day + time */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:20 }}>
              <CuisineMultiselect selected={selectedCuisines} onChange={setSelectedCuisines} />
              <SelectField label="Day" value={form.day} onChange={v => set('day',v)} options={DAYS} placeholder="Day" />
              <SelectField label="Time" value={form.time} onChange={v => set('time',v)} options={TIMES} placeholder="Time" />
            </div>

            {/* Selected cuisine chips */}
            {selectedCuisines.length > 0 && selectedCuisines.length <= 6 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:16 }}>
                {selectedCuisines.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedCuisines(selectedCuisines.filter(x => x !== c))}
                    style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, fontWeight:500, padding:'3px 10px', borderRadius:99, background:'#fff7f0', color:'#e85d26', border:'1px solid #fdc9a8', cursor:'pointer' }}
                  >
                    {c} <span style={{ fontSize:10, fontWeight:700 }}>\u00d7</span>
                  </button>
                ))}
              </div>
            )}

            {error && (
              <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#b91c1c' }}>{error}</div>
            )}

            <div style={{ display:'flex', gap:12 }}>
              <button
                onClick={() => search(false)}
                disabled={loading || !formReady}
                style={{
                  flex:1, background: formReady && !loading ? '#e85d26' : '#d1d5db',
                  color:'#fff', border:'none', borderRadius:12, padding:'14px 24px',
                  fontSize:15, fontWeight:700,
                  cursor: formReady && !loading ? 'pointer' : 'not-allowed',
                  transition:'background 0.2s',
                }}
                onMouseEnter={e => { if (formReady && !loading) e.target.style.background='#d44e1a'; }}
                onMouseLeave={e => { if (formReady && !loading) e.target.style.background='#e85d26'; }}
              >
                {loading ? 'Finding...' : 'Find Restaurants'}
              </button>
              <button
                onClick={() => search(true)}
                disabled={loading}
                style={{ background:'#1a1a1a', color:'#fff', border:'none', borderRadius:12, padding:'14px 20px', fontSize:15, fontWeight:600, cursor: loading ? 'not-allowed' : 'pointer', whiteSpace:'nowrap', transition:'background 0.2s' }}
                onMouseEnter={e => { if (!loading) e.target.style.background='#374151'; }}
                onMouseLeave={e => { if (!loading) e.target.style.background='#1a1a1a'; }}
              >
                Surprise Me
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div style={{ padding:'40px 24px 80px', maxWidth:760, margin:'0 auto' }}>

          {loading && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ background:'#fff', borderRadius:16, padding:24, boxShadow:'0 1px 3px rgba(0,0,0,0.06)', animationName:'pulseSoft', animationDuration:'1.5s', animationTimingFunction:'ease-in-out', animationIterationCount:'infinite' }}>
                  <div style={{ height:22, background:'#f1f0ee', borderRadius:6, width:'55%', marginBottom:10 }} />
                  <div style={{ height:14, background:'#f1f0ee', borderRadius:6, width:'35%', marginBottom:16 }} />
                  <div style={{ height:14, background:'#f1f0ee', borderRadius:6, width:'90%', marginBottom:8 }} />
                  <div style={{ height:14, background:'#f1f0ee', borderRadius:6, width:'75%' }} />
                </div>
              ))}
            </div>
          )}

          {hasResults && !loading && (
            <>
              <div style={{ marginBottom:24, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
                <div>
                  <h2 style={{ margin:0, fontSize:22, fontWeight:700, color:'#1a1a1a', fontFamily:'Georgia, serif' }}>
                    {strongMatches.length} {strongMatches.length === 1 ? 'match' : 'matches'}
                    {suggestions.length > 0 && <span style={{ fontSize:16, color:'#9ca3af', fontWeight:400 }}> + {suggestions.length} suggestions</span>}
                  </h2>
                  {effectiveQuery && (
                    <p style={{ margin:'4px 0 0', fontSize:13, color:'#9ca3af' }}>
                      {effectiveQuery.location || 'All Toronto'}
                      {effectiveQuery.occasion ? ` \u00b7 ${effectiveQuery.occasion}` : ''}
                      {effectiveQuery.vibe ? ` \u00b7 ${effectiveQuery.vibe} vibe` : ''}
                      {' \u00b7 '}{effectiveQuery.day} {effectiveQuery.time}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => { setStrongMatches(null); setSuggestions(null); setEffectiveQuery(null); }}
                  style={{ background:'none', border:'1.5px solid #e8e2db', borderRadius:8, padding:'6px 14px', fontSize:13, color:'#6b7280', cursor:'pointer', fontWeight:500 }}
                >
                  &larr; New search
                </button>
              </div>

              {strongMatches.length === 0 && (
                <div style={{ background:'#fff', borderRadius:12, padding:'16px 20px', marginBottom:16, border:'1px solid #f0ede8', fontSize:14, color:'#6b7280' }}>
                  No perfect matches found — showing nearby suggestions below.
                </div>
              )}

              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                {strongMatches.map((r, i) => <RestaurantCard key={r.id} r={r} index={i} />)}

                {suggestions.length > 0 && (
                  <>
                    <YMALSeparator />
                    {suggestions.map((r, i) => <RestaurantCard key={r.id} r={r} index={i + strongMatches.length} />)}
                  </>
                )}
              </div>
            </>
          )}

          {!hasResults && !loading && (
            <div style={{ textAlign:'center', padding:'48px 0', color:'#b0a99f' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🍽️</div>
              <p style={{ margin:0, fontSize:16, fontWeight:500 }}>Your picks will appear here</p>
              <p style={{ margin:'8px 0 0', fontSize:14 }}>Select an occasion above, or hit Surprise Me</p>
            </div>
          )}
        </div>

        <div style={{ borderTop:'1px solid #f0ede8', padding:'20px 24px', textAlign:'center', fontSize:13, color:'#b0a99f' }}>
          Toronto Table &middot; 40 curated Toronto venues &middot; Built with Next.js
          <span style={{ margin:'0 8px' }}>&middot;</span>
          <a href="https://www.yelp.com/developers/v3/manage_app" target="_blank" rel="noopener noreferrer" style={{ color:'#e85d26', textDecoration:'none' }}>Connect Yelp API for live data</a>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp  { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulseSoft { 0%,100% { opacity:1 } 50% { opacity:0.5 } }
        * { box-sizing:border-box } body { margin:0 } select option { color:#1a1a1a }
        ::-webkit-scrollbar { width:6px } ::-webkit-scrollbar-track { background:#f5f0eb }
        ::-webkit-scrollbar-thumb { background:#d4c8bb; border-radius:3px }
      `}</style>
    </>
  );
}
