import restaurants from '../../data/restaurants';
import { enrichAll } from '../../lib/enricher';
import { rankRestaurants } from '../../lib/scorer';
import { getNearestTransit } from '../../lib/transit';

// Enrich and pre-compute transit once at module load
const enrichedRestaurants = enrichAll(restaurants).map(r => ({
  ...r,
  transit: getNearestTransit(r.coordinates),
}));

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

function serialise(r) {
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
  };
}

export default function handler(req, res) {
  const raw = req.method === 'POST' ? req.body : req.query;
  const {
    location = '',
    occasion = '',
    vibe = '',
    time = '7:00 PM',
    day = 'Friday',
    surprise = false,
    cuisines,
  } = raw;

  let params = {
    location: location || '',
    occasion,
    vibe: vibe || '',
    time: time || '7:00 PM',
    day: day || 'Friday',
    cuisines: parseCuisines(cuisines),
  };

  if (surprise === 'true' || surprise === true) {
    const allN = [...new Set(enrichedRestaurants.map(r => r.neighbourhood))];
    // Surprise: 60% chance of picking a neighbourhood, 40% all-Toronto
    const surpriseLocation = Math.random() > 0.4
      ? allN[Math.floor(Math.random() * allN.length)]
      : '';
    // Pick an occasion that makes sense for the time of day
    const hour = new Date().getHours();
    let occasionPool = VALID_OCCASIONS;
    if (hour < 11) occasionPool = ['breakfast', 'coffee', 'brunch'];
    else if (hour < 15) occasionPool = ['brunch', 'casual dinner', 'coffee', 'catching up'];
    params = {
      location: surpriseLocation,
      occasion: occasionPool[Math.floor(Math.random() * occasionPool.length)],
      vibe: VALID_VIBES[Math.floor(Math.random() * VALID_VIBES.length)],
      time,
      day,
      cuisines: [],
    };
  } else {
    if (!VALID_OCCASIONS.includes(occasion)) {
      return res.status(400).json({ error: `occasion must be one of: ${VALID_OCCASIONS.join(', ')}` });
    }
    if (vibe && !VALID_VIBES.includes(vibe)) {
      return res.status(400).json({ error: `vibe must be one of: ${VALID_VIBES.join(', ')}` });
    }
  }

  const ranked = rankRestaurants(enrichedRestaurants, params);
  const top = ranked.slice(0, 18);

  const strongMatches = top.filter(r => r.isStrongMatch).map(serialise);
  const suggestions = top.filter(r => !r.isStrongMatch).slice(0, 6).map(serialise);

  return res.status(200).json({
    strongMatches,
    suggestions,
    results: [...strongMatches, ...suggestions],
    query: params,
    meta: {
      total: ranked.length,
      strongMatchCount: strongMatches.length,
      suggestionCount: suggestions.length,
      generatedAt: new Date().toISOString(),
    },
  });
}
