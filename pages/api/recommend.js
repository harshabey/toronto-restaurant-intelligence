import restaurants from '../../data/restaurants';
import { enrichAll } from '../../lib/enricher';
import { rankRestaurants, parseTimeHour, isOpenAt } from '../../lib/scorer';
import { getNearestTransit } from '../../lib/transit';
import { getBusyness } from '../../lib/busyness';
import { hasYelpKey, searchYelp, mapYelpBusiness } from '../../lib/yelp';
import { rankByIntent, getMatchedTags, parseIntent } from '../../lib/vibe-engine';

// ─── Pre-compute base (curated) venues at module load ─────────────────────────
const baseRestaurants = enrichAll(restaurants).map(r => ({
  ...r,
  transit: getNearestTransit(r.coordinates),
}));

// ─── Load Google crawled venues if available ──────────────────────────────────
let googleRestaurants = [];
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const raw = require('../../data/restaurants-google');
  const baseNames = new Set(baseRestaurants.map(r => r.name.toLowerCase().trim()));
  const deduped   = raw.filter(r => !baseNames.has((r.name || '').toLowerCase().trim()));
  googleRestaurants = enrichAll(deduped).map(r => ({
    ...r,
    transit: getNearestTransit(r.coordinates),
  }));
  console.log(`[recommend] Loaded ${googleRestaurants.length} Google venues`);
} catch {
  // File not yet generated
}

// ─── Load OSM venues if available ────────────────────────────────────────────
let osmRestaurants = [];
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const raw = require('../../data/restaurants-osm');
  const knownNames = new Set(
    [...baseRestaurants, ...googleRestaurants].map(r => r.name.toLowerCase().trim())
  );
  const deduped = raw.filter(r => !knownNames.has((r.name || '').toLowerCase().trim()));
  osmRestaurants = enrichAll(deduped).map(r => ({
    ...r,
    transit: getNearestTransit(r.coordinates),
  }));
  console.log(`[recommend] Loaded ${osmRestaurants.length} OSM venues`);
} catch {
  // File not yet generated
}

const VALID_OCCASIONS = [
  'date', 'first date', 'follow-up date',
  'casual dinner', 'celebration', 'business',
  'solo', 'small group', 'large group',
  'catching up', 'family dinner',
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
  const wrapped = h >= 24 ? h - 24 : h;
  const period  = wrapped >= 12 ? 'PM' : 'AM';
  const display = wrapped === 0 ? 12 : wrapped > 12 ? wrapped - 12 : wrapped;
  return `${display}:00 ${period}`;
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
    openTime: fmtHour(r.openHour),
    closeTime: fmtHour(r.closeHour),
    isOpenAtTime: isOpenAt(r, time),
    source: r.source || 'curated',
  };
}

export default async function handler(req, res) {
  const raw = req.method === 'POST' ? req.body : req.query;
  const {
    location = '',
    occasion = '',
    vibe     = '',
    time     = '7:00 PM',
    day      = 'Friday',
    surprise = false,
    cuisines,
    intent   = '',       // free-text intent query (the vibe engine input)
  } = raw;

  let params = {
    location: location || '',
    occasion: occasion || '',
    vibe:     vibe     || '',
    time:     time     || '7:00 PM',
    day:      day      || 'Friday',
    cuisines: parseCuisines(cuisines),
    intent:   (intent || '').trim(),
  };

  const hasIntent  = !!params.intent;
  const noOccasion = !params.occasion && !hasIntent;

  if (surprise === 'true' || surprise === true) {
    const allN = [...new Set(
      [...baseRestaurants, ...googleRestaurants, ...osmRestaurants].map(r => r.neighbourhood)
    )];
    const surpriseLocation = Math.random() > 0.4
      ? allN[Math.floor(Math.random() * allN.length)]
      : '';
    const hour = new Date().getHours();
    let occasionPool = VALID_OCCASIONS;
    if (hour < 11) occasionPool = ['breakfast', 'coffee', 'brunch'];
    else if (hour < 15) occasionPool = ['brunch', 'casual dinner', 'coffee', 'catching up'];
    params = {
      location:  surpriseLocation,
      occasion:  occasionPool[Math.floor(Math.random() * occasionPool.length)],
      vibe:      VALID_VIBES[Math.floor(Math.random() * VALID_VIBES.length)],
      time, day, cuisines: [], intent: '',
    };
  } else {
    if (params.occasion && !VALID_OCCASIONS.includes(params.occasion)) {
      return res.status(400).json({ error: `occasion must be one of: ${VALID_OCCASIONS.join(', ')}` });
    }
    if (params.vibe && !VALID_VIBES.includes(params.vibe)) {
      return res.status(400).json({ error: `vibe must be one of: ${VALID_VIBES.join(', ')}` });
    }
  }

  // ─── Build full dataset ────────────────────────────────────────────────────
  let allRestaurants = [...baseRestaurants, ...googleRestaurants, ...osmRestaurants];

  if (hasYelpKey() && params.location) {
    try {
      const yelpBizs = await searchYelp({ location: params.location, limit: 50 });
      if (yelpBizs && yelpBizs.length > 0) {
        const existingNames = new Set(allRestaurants.map(r => r.name.toLowerCase().trim()));
        const newFromYelp   = yelpBizs
          .filter(b => !existingNames.has(b.name.toLowerCase().trim()))
          .map(b => {
            const mapped = mapYelpBusiness(b, params.location);
            return { ...mapped, transit: getNearestTransit(mapped.coordinates) };
          });
        allRestaurants = [...allRestaurants, ...newFromYelp];
      }
    } catch { /* Yelp failed */ }
  }

  const meta_sources = {
    curated: baseRestaurants.length,
    google:  googleRestaurants.length,
    osm:     osmRestaurants.length,
    total:   allRestaurants.length,
  };

  // Helper: attach busyness to a ranked list
  function withBusyness(ranked) {
    return ranked.map(r => ({
      ...r,
      busyness: getBusyness(r, params.day, params.time),
    }));
  }

  // ─── Cuisine pre-filter (applied in all non-surprise modes) ───────────────
  let pool = allRestaurants;
  if (!(surprise === 'true' || surprise === true) && params.cuisines.length > 0) {
    pool = pool.filter(r =>
      params.cuisines.some(c => (r.cuisineCategories || []).includes(c))
    );
    if (pool.length === 0) pool = allRestaurants; // fallback if filter is too narrow
  }

  // ─── MODE 1: Intent (vibe engine) ───────────────────────────────────────
  if (hasIntent && !(surprise === 'true' || surprise === true)) {
    const intentRanked = rankByIntent(pool, params.intent, params);
    if (intentRanked) {
      const top              = withBusyness(intentRanked).slice(0, 18);
      const strongMatchCount = top.filter(r => r.isStrongMatch).length;
      const weights          = parseIntent(params.intent);
      const matchedTags      = weights ? getMatchedTags(weights) : [];

      return res.status(200).json({
        results:          top.map(r => serialise(r, params.time)),
        strongMatchCount,
        noOccasion:       false,
        intentMode:       true,
        matchedTags,
        intent:           params.intent,
        query:            params,
        meta:             {
          ...meta_sources, strongMatchCount,
          suggestionCount: top.length - strongMatchCount,
          generatedAt: new Date().toISOString(),
        },
      });
    }
    // Intent unrecognised — fall through to rating sort
  }

  // ─── MODE 2: Rating-first (no occasion, no intent) ────────────────────
  if (noOccasion && !(surprise === 'true' || surprise === true)) {
    const mapped = pool
      .map(r => {
        const locationMatch = !params.location ||
          r.neighbourhood.toLowerCase() === params.location.toLowerCase();
        const busynessData  = getBusyness(r, params.day, params.time);
        const open          = isOpenAt(r, params.time);
        const score         = open
          ? Math.max(0, Math.round(r.rating * 18) + (locationMatch ? 5 : 0))
          : 0;
        return {
          ...r,
          matchScore:    score,
          isStrongMatch: open && r.rating >= 4.3,
          busyness:      busynessData,
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
      results:          top.map(r => serialise(r, params.time)),
      strongMatchCount,
      noOccasion:       true,
      intentMode:       false,
      matchedTags:      [],
      query:            params,
      meta:             {
        ...meta_sources, strongMatchCount,
        suggestionCount: top.length - strongMatchCount,
        generatedAt: new Date().toISOString(),
      },
    });
  }

  // ─── MODE 3: Occasion-based ranking ───────────────────────────────────
  const ranked           = rankRestaurants(pool, params);
  const top              = withBusyness(ranked).slice(0, 18);
  const strongMatchCount = top.filter(r => r.isStrongMatch).length;

  return res.status(200).json({
    results:          top.map(r => serialise(r, params.time)),
    strongMatchCount,
    noOccasion:       false,
    intentMode:       false,
    matchedTags:      [],
    query:            params,
    meta:             {
      ...meta_sources, strongMatchCount,
      suggestionCount: top.length - strongMatchCount,
      generatedAt: new Date().toISOString(),
    },
  });
}
