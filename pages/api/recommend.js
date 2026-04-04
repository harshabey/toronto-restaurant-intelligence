import restaurants from '../../data/restaurants';
import { enrichAll } from '../../lib/enricher';
import { rankRestaurants, parseTimeHour, isOpenAt } from '../../lib/scorer';
import { getNearestTransit } from '../../lib/transit';
import { getBusyness } from '../../lib/busyness';
import { hasYelpKey, searchYelp, mapYelpBusiness } from '../../lib/yelp';

// Pre-compute mock data at module load
const baseRestaurants = enrichAll(restaurants).map(r => ({
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

function fmtHour(h) {
  if (h == null) return null;
  const wrapped = h >= 24 ? h - 24 : h;
  const period = wrapped >= 12 ? 'PM' : 'AM';
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
  };
}

export default async function handler(req, res) {
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
    occasion: occasion || '',
    vibe: vibe || '',
    time: time || '7:00 PM',
    day: day || 'Friday',
    cuisines: parseCuisines(cuisines),
  };

  const noOccasion = !params.occasion;

  if (surprise === 'true' || surprise === true) {
    const allN = [...new Set(baseRestaurants.map(r => r.neighbourhood))];
    const surpriseLocation = Math.random() > 0.4
      ? allN[Math.floor(Math.random() * allN.length)]
      : '';
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
    if (params.occasion && !VALID_OCCASIONS.includes(params.occasion)) {
      return res.status(400).json({ error: `occasion must be one of: ${VALID_OCCASIONS.join(', ')}` });
    }
    if (params.vibe && !VALID_VIBES.includes(params.vibe)) {
      return res.status(400).json({ error: `vibe must be one of: ${VALID_VIBES.join(', ')}` });
    }
  }

  // Merge Yelp data if key is present
  let allRestaurants = [...baseRestaurants];
  if (hasYelpKey() && params.location) {
    try {
      const yelpBizs = await searchYelp({ location: params.location, limit: 50 });
      if (yelpBizs && yelpBizs.length > 0) {
        const existingNames = new Set(baseRestaurants.map(r => r.name.toLowerCase().trim()));
        const newFromYelp = yelpBizs
          .filter(b => !existingNames.has(b.name.toLowerCase().trim()))
          .map(b => {
            const mapped = mapYelpBusiness(b, params.location);
            return { ...mapped, transit: getNearestTransit(mapped.coordinates) };
          });
        allRestaurants = [...baseRestaurants, ...newFromYelp];
      }
    } catch {
      // Yelp failed — continue with mock data
    }
  }

  // Busyness-first mode when no occasion selected
  if (noOccasion && !(surprise === 'true' || surprise === true)) {
    const selectedCuisines = params.cuisines;
    const mapped = allRestaurants
      .map(r => {
        // Cuisine hard-filter when specified
        if (selectedCuisines.length > 0) {
          const rCats = r.cuisineCategories || [];
          if (!selectedCuisines.some(c => rCats.includes(c))) return null;
        }
        // Location soft-filter: exact match boosted, others included
        const locationMatch = !params.location || r.neighbourhood.toLowerCase() === params.location.toLowerCase();
        const busynessData = getBusyness(r, params.day, params.time);
        const open = isOpenAt(r, params.time);
        const score = open
          ? Math.max(0, Math.round(60 - busynessData.score * 4) + (locationMatch ? 10 : 0))
          : 0;
        return {
          ...r,
          matchScore: score,
          isStrongMatch: open && busynessData.score <= 5,
          busyness: busynessData,
          whyRecommended: open
            ? `Currently ${busynessData.label.toLowerCase()} — ${busynessData.waitEstimate === 'No wait' ? 'no wait expected' : busynessData.waitEstimate + ' wait'}.`
            : 'Closed at this time.',
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const aOpen = isOpenAt(a, params.time);
        const bOpen = isOpenAt(b, params.time);
        if (aOpen !== bOpen) return aOpen ? -1 : 1;
        return (a.busyness?.score ?? 99) - (b.busyness?.score ?? 99);
      });

    const top = mapped.slice(0, 18);
    const strongMatchCount = top.filter(r => r.isStrongMatch).length;

    return res.status(200).json({
      results: top.map(r => serialise(r, params.time)),
      strongMatchCount,
      noOccasion: true,
      query: params,
      meta: {
        total: mapped.length,
        strongMatchCount,
        suggestionCount: top.length - strongMatchCount,
        generatedAt: new Date().toISOString(),
      },
    });
  }

  // Normal occasion-based ranking
  const ranked = rankRestaurants(allRestaurants, params);
  const top = ranked.slice(0, 18);
  const strongMatchCount = top.filter(r => r.isStrongMatch).length;

  return res.status(200).json({
    results: top.map(r => serialise(r, params.time)),
    strongMatchCount,
    noOccasion: false,
    query: params,
    meta: {
      total: ranked.length,
      strongMatchCount,
      suggestionCount: top.length - strongMatchCount,
      generatedAt: new Date().toISOString(),
    },
  });
}
