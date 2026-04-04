import restaurants from '../../data/restaurants';
import { enrichAll } from '../../lib/enricher';
import { rankRestaurants, parseTimeHour, isOpenAt } from '../../lib/scorer';
import { getNearestTransit } from '../../lib/transit';
import { getBusyness } from '../../lib/busyness';
import { hasYelpKey, searchYelp, mapYelpBusiness } from '../../lib/yelp';
import { parseIntent, scoreVenueByIntent } from '../../lib/vibe-engine';

// ─── Pre-compute base venues at module load ─────────────────────────────────────────
const baseRestaurants = enrichAll(restaurants).map(r => ({
  ...r, transit: getNearestTransit(r.coordinates),
}));

let googleRestaurants = [];
try {
  const raw = require('../../data/restaurants-google');
  const baseNames = new Set(baseRestaurants.map(r => r.name.toLowerCase().trim()));
  const deduped   = raw.filter(r => !baseNames.has((r.name || '').toLowerCase().trim()));
  googleRestaurants = enrichAll(deduped).map(r => ({ ...r, transit: getNearestTransit(r.coordinates) }));
  console.log(`[recommend] Google: ${googleRestaurants.length} venues`);
} catch { }

let osmRestaurants = [];
try {
  const raw = require('../../data/restaurants-osm');
  const knownNames = new Set([...baseRestaurants, ...googleRestaurants].map(r => r.name.toLowerCase().trim()));
  const deduped    = raw.filter(r => !knownNames.has((r.name || '').toLowerCase().trim()));
  osmRestaurants = enrichAll(deduped).map(r => ({ ...r, transit: getNearestTransit(r.coordinates) }));
  console.log(`[recommend] OSM: ${osmRestaurants.length} venues`);
} catch { }

const VALID_OCCASIONS = [
  'date', 'first date', 'follow-up date', 'casual dinner', 'celebration', 'business',
  'solo', 'small group', 'large group', 'catching up', 'family dinner',
  'brunch', 'breakfast', 'late night', 'coffee',
];
const VALID_VIBES = [
  'trendy', 'quiet', 'upscale', 'lively',
  'music forward', 'conversation friendly', 'happy hour friendly',
];

function parseCuisines(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string') return raw.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

function fmtHour(h) {
  if (h == null) return null;
  const w = h >= 24 ? h - 24 : h;
  const p = w >= 12 ? 'PM' : 'AM';
  const d = w === 0 ? 12 : w > 12 ? w - 12 : w;
  return `${d}:00 ${p}`;
}

function serialise(r, time) {
  return {
    id: r.id, name: r.name, neighbourhood: r.neighbourhood,
    cuisine: r.cuisine, cuisineCategories: r.cuisineCategories || [],
    priceLevel: r.priceLevel, rating: r.rating, reviewCount: r.reviewCount,
    matchScore: r.matchScore, isStrongMatch: r.isStrongMatch,
    vibes: r.vibes, occasions: r.occasions,
    bestFor: r.bestFor, vibeDescription: r.vibeDescription,
    peakTimes: r.peakTimes, insiderTip: r.insiderTip,
    busyness: r.busyness, whyRecommended: r.whyRecommended,
    tags: r.tags, googleReviews: r.googleReviews, address: r.address,
    transit: r.transit || { subway: [], streetcar: [] },
    isBar: r.isBar || false, isCafe: r.isCafe || false, lateNight: r.lateNight || false,
    openHour: r.openHour, closeHour: r.closeHour,
    openTime: fmtHour(r.openHour), closeTime: fmtHour(r.closeHour),
    isOpenAtTime: isOpenAt(r, time),
    coordinates: r.coordinates || null,
    source: r.source || 'curated',
  };
}

export default async function handler(req, res) {
  const raw = req.method === 'POST' ? req.body : req.query;
  const {
    location = '', occasion = '', vibe = '',
    time = '7:00 PM', day = 'Friday',
    surprise = false, cuisines, query = '',
  } = raw;

  let params = {
    location: location || '',
    occasion: occasion || '',
    vibe:     vibe     || '',
    time:     time     || '7:00 PM',
    day:      day      || 'Friday',
    cuisines: parseCuisines(cuisines),
    query:    query    || '',
  };

  // ─── Parse intent from free-text query ───────────────────────────────────────
  const intentProfile = params.query ? parseIntent(params.query) : null;

  if (surprise === 'true' || surprise === true) {
    const allN = [...new Set([...baseRestaurants, ...googleRestaurants, ...osmRestaurants].map(r => r.neighbourhood))];
    const surpriseLocation = Math.random() > 0.4 ? allN[Math.floor(Math.random() * allN.length)] : '';
    const hour = new Date().getHours();
    let occasionPool = VALID_OCCASIONS;
    if (hour < 11)  occasionPool = ['breakfast', 'coffee', 'brunch'];
    else if (hour < 15) occasionPool = ['brunch', 'casual dinner', 'coffee', 'catching up'];
    params = {
      location: surpriseLocation,
      occasion: occasionPool[Math.floor(Math.random() * occasionPool.length)],
      vibe: VALID_VIBES[Math.floor(Math.random() * VALID_VIBES.length)],
      time, day, cuisines: [], query: '',
    };
  } else {
    // Apply intent hints to supplement (not override) explicit user params
    if (intentProfile) {
      if (!params.occasion && intentProfile.occasionHint) params.occasion = intentProfile.occasionHint;
      if (!params.vibe     && intentProfile.vibeHint)     params.vibe     = intentProfile.vibeHint;
      if (!params.cuisines.length && intentProfile.cuisineHints.length) params.cuisines = intentProfile.cuisineHints;
    }
    if (params.occasion && !VALID_OCCASIONS.includes(params.occasion)) {
      return res.status(400).json({ error: `occasion must be one of: ${VALID_OCCASIONS.join(', ')}` });
    }
    if (params.vibe && !VALID_VIBES.includes(params.vibe)) {
      return res.status(400).json({ error: `vibe must be one of: ${VALID_VIBES.join(', ')}` });
    }
  }

  const noOccasion = !params.occasion;

  // ─── Build full dataset ─────────────────────────────────────────────────────────
  let allRestaurants = [...baseRestaurants, ...googleRestaurants, ...osmRestaurants];

  if (hasYelpKey() && params.location) {
    try {
      const yelpBizs = await searchYelp({ location: params.location, limit: 50 });
      if (yelpBizs?.length > 0) {
        const existingNames = new Set(allRestaurants.map(r => r.name.toLowerCase().trim()));
        const newFromYelp = yelpBizs
          .filter(b => !existingNames.has(b.name.toLowerCase().trim()))
          .map(b => ({ ...mapYelpBusiness(b, params.location), transit: getNearestTransit(mapYelpBusiness(b, params.location).coordinates) }));
        allRestaurants = [...allRestaurants, ...newFromYelp];
      }
    } catch { }
  }

  const meta_sources = {
    curated: baseRestaurants.length, google: googleRestaurants.length,
    osm: osmRestaurants.length, total: allRestaurants.length,
  };

  // ─── Rating-first mode (no occasion) ───────────────────────────────────────────────
  if (noOccasion && !(surprise === 'true' || surprise === true)) {
    const selectedCuisines = params.cuisines;
    const mapped = allRestaurants.map(r => {
      if (selectedCuisines.length > 0) {
        if (!selectedCuisines.some(c => (r.cuisineCategories || []).includes(c))) return null;
      }
      const locationMatch = !params.location || r.neighbourhood.toLowerCase() === params.location.toLowerCase();
      const busynessData  = getBusyness(r, params.day, params.time);
      const open          = isOpenAt(r, params.time);
      const intentBonus   = scoreVenueByIntent(r, intentProfile);
      const score = open
        ? Math.max(0, Math.round(r.rating * 18) + (locationMatch ? 5 : 0) + intentBonus)
        : 0;
      return {
        ...r,
        matchScore:     score,
        isStrongMatch:  open && r.rating >= 4.3,
        busyness:       busynessData,
        whyRecommended: open
          ? `Rated ${r.rating.toFixed(1)}/5${r.reviewCount > 0 ? ` \u00b7 ${r.reviewCount.toLocaleString()} reviews` : ''}.`
          : 'Closed at this time.',
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const aOpen = isOpenAt(a, params.time);
      const bOpen = isOpenAt(b, params.time);
      if (aOpen !== bOpen) return aOpen ? -1 : 1;
      if (b.rating !== a.rating) return b.rating - a.rating;
      return (b.reviewCount || 0) - (a.reviewCount || 0);
    });

    const top              = mapped.slice(0, 18);
    const strongMatchCount = top.filter(r => r.isStrongMatch).length;
    return res.status(200).json({
      results: top.map(r => serialise(r, params.time)),
      strongMatchCount, noOccasion: true, query: params,
      detectedIntent: intentProfile,
      meta: { ...meta_sources, strongMatchCount, suggestionCount: top.length - strongMatchCount, generatedAt: new Date().toISOString() },
    });
  }

  // ─── Occasion-based ranking ───────────────────────────────────────────────────────
  const ranked = rankRestaurants(allRestaurants, params).map(r => ({
    ...r,
    matchScore: Math.min(100, r.matchScore + scoreVenueByIntent(r, intentProfile)),
  })).sort((a, b) => b.matchScore - a.matchScore);

  const top              = ranked.slice(0, 18);
  const strongMatchCount = top.filter(r => r.isStrongMatch).length;
  return res.status(200).json({
    results: top.map(r => serialise(r, params.time)),
    strongMatchCount, noOccasion: false, query: params,
    detectedIntent: intentProfile,
    meta: { ...meta_sources, strongMatchCount, suggestionCount: top.length - strongMatchCount, generatedAt: new Date().toISOString() },
  });
}
