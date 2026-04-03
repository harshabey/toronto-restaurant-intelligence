import restaurants from '../../data/restaurants';
import { enrichAll } from '../../lib/enricher';
import { rankRestaurants } from '../../lib/scorer';

const enrichedRestaurants = enrichAll(restaurants);

export default function handler(req, res) {
  const raw = req.method === 'POST' ? req.body : req.query;
  const {
    location  = '',
    occasion  = '',
    vibe      = '',
    time      = '7:00 PM',
    day       = 'Friday',
    surprise  = false,
  } = raw;

  const VALID_OCCASIONS = [
    'date', 'first date', 'follow-up date',
    'casual dinner', 'celebration', 'business',
    'solo', 'small group', 'large group',
    'catching up', 'family dinner',
  ];

  const VALID_VIBES = [
    'trendy', 'quiet', 'upscale', 'lively',
    'music forward', 'conversation friendly', 'happy hour friendly',
  ];

  if (!location) return res.status(400).json({ error: 'location is required' });
  if (!VALID_OCCASIONS.includes(occasion)) return res.status(400).json({ error: `occasion must be one of: ${VALID_OCCASIONS.join(', ')}` });
  if (!VALID_VIBES.includes(vibe)) return res.status(400).json({ error: `vibe must be one of: ${VALID_VIBES.join(', ')}` });

  let params = { location, occasion, vibe, time, day };

  if (surprise === 'true' || surprise === true) {
    const allN = [...new Set(enrichedRestaurants.map(r => r.neighbourhood))];
    params = {
      location: allN[Math.floor(Math.random() * allN.length)],
      occasion: VALID_OCCASIONS[Math.floor(Math.random() * VALID_OCCASIONS.length)],
      vibe:     VALID_VIBES[Math.floor(Math.random() * VALID_VIBES.length)],
      time,
      day,
    };
  }

  const ranked = rankRestaurants(enrichedRestaurants, params);
  const results = ranked.slice(0, 10).map(r => ({
    id: r.id, name: r.name, neighbourhood: r.neighbourhood, cuisine: r.cuisine,
    priceLevel: r.priceLevel, rating: r.rating, matchScore: r.matchScore,
    vibes: r.vibes, occasions: r.occasions,
    bestFor: r.bestFor, vibeDescription: r.vibeDescription,
    peakTimes: r.peakTimes, insiderTip: r.insiderTip,
    busyness: r.busyness, whyRecommended: r.whyRecommended,
    tags: r.tags, googleReviews: r.googleReviews, address: r.address,
  }));

  return res.status(200).json({
    results,
    query: params,
    meta: { total: ranked.length, returned: results.length, generatedAt: new Date().toISOString() },
  });
}
