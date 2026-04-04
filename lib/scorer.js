const { getBusyness } = require('./busyness');

const NEIGHBOURHOOD_CENTRES = {
  'Bay Street Corridor': { lat: 43.6496, lng: -79.3826 },
  'Chinatown':           { lat: 43.6548, lng: -79.3991 },
  'Distillery District': { lat: 43.6503, lng: -79.3592 },
  'Dundas West':         { lat: 43.6535, lng: -79.4390 },
  'Harbord Village':     { lat: 43.6607, lng: -79.4055 },
  'Harbourfront':        { lat: 43.6386, lng: -79.3822 },
  'Kensington Market':   { lat: 43.6556, lng: -79.4009 },
  'King West':           { lat: 43.6466, lng: -79.3971 },
  'Leslieville':         { lat: 43.6618, lng: -79.3296 },
  'Liberty Village':     { lat: 43.6393, lng: -79.4236 },
  'Little Italy':        { lat: 43.6546, lng: -79.4131 },
  'Niagara':             { lat: 43.6432, lng: -79.4064 },
  'Ossington':           { lat: 43.6489, lng: -79.4240 },
  'Queen West':          { lat: 43.6476, lng: -79.4071 },
  'Roncesvalles':        { lat: 43.6492, lng: -79.4479 },
  'The Annex':           { lat: 43.6660, lng: -79.4122 },
  'Yorkville':           { lat: 43.6740, lng: -79.3956 },
};

const OCCASION_COPY = {
  'date':           'ideal for a date night',
  'first date':     'perfect for a first date',
  'follow-up date': 'great for a romantic follow-up',
  'casual dinner':  'perfect for a relaxed evening out',
  'celebration':    'made for celebrations',
  'business':       'well-suited for business dining',
  'solo':           'a great solo spot',
  'small group':    'ideal for a small group (3–5)',
  'large group':    'great for a larger group (6+)',
  'catching up':    'perfect for catching up',
  'family dinner':  'great for a family dinner',
  'brunch':         'a top brunch destination',
  'breakfast':      'an excellent breakfast spot',
  'late night':     'built for late nights',
  'coffee':         'a great coffee destination',
};

const VIBE_COPY = {
  'trendy':                'a trendy crowd favourite',
  'quiet':                 'a quiet, intimate setting',
  'upscale':               'an upscale atmosphere',
  'lively':                'a lively, buzzy energy',
  'music forward':         'a music-forward atmosphere',
  'conversation friendly': 'easy to actually talk in',
  'happy hour friendly':   'a great happy hour spot',
};

function haversineMetres(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseTimeHour(time) {
  if (!time) return 19;
  const str = time.toString().trim().toUpperCase();
  const pmMatch = str.match(/(\d{1,2})(?::(\d{2}))?\s*PM/);
  const amMatch = str.match(/(\d{1,2})(?::(\d{2}))?\s*AM/);
  let hour = 19;
  if (pmMatch) { hour = parseInt(pmMatch[1], 10); if (hour !== 12) hour += 12; }
  else if (amMatch) { hour = parseInt(amMatch[1], 10); if (hour === 12) hour = 0; }
  if (hour < 5) hour += 24; // 12am=24, 1am=25, 2am=26, 3am=27
  return hour;
}

function isOpenAt(restaurant, time) {
  const h = parseTimeHour(time);
  return h >= (restaurant.openHour || 11) && h <= (restaurant.closeHour || 23);
}

function buildWhyText(restaurant, params, busynessData, matchFactors) {
  const { vibe, occasion, location } = params;
  const reasons = [];

  if (matchFactors.locationMatch) reasons.push(`right in ${location}`);
  else if (matchFactors.locationProximity) reasons.push(`close to ${location}`);
  if (matchFactors.vibeMatch) reasons.push(VIBE_COPY[vibe] || `a ${vibe} vibe`);
  if (matchFactors.occasionMatch) reasons.push(OCCASION_COPY[occasion] || `great for ${occasion}`);
  if (matchFactors.cuisineMatch) reasons.push('matching your cuisine preference');

  if ((vibe === 'quiet' || vibe === 'conversation friendly') && (busynessData.label === 'Quiet' || busynessData.label === 'Moderate')) {
    reasons.push('and relatively quiet right now');
  }
  if ((vibe === 'lively' || vibe === 'music forward') && (busynessData.label === 'Very Busy' || busynessData.label === 'Packed')) {
    reasons.push('and buzzing with energy right now');
  }

  if (reasons.length === 0) return `Highly rated ${restaurant.cuisine} in ${restaurant.neighbourhood} — worth considering.`;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  if (reasons.length === 1) return `${cap(reasons[0])}.`;
  if (reasons.length === 2) return `${cap(reasons[0])} and ${reasons[1]}.`;
  const last = reasons.pop();
  return `${cap(reasons.join(', '))}, and ${last}.`;
}

function rankRestaurants(restaurants, params) {
  const { location, occasion, vibe, time, day, cuisines } = params;
  const selectedCuisines = Array.isArray(cuisines) ? cuisines : (cuisines ? cuisines.split(',') : []);
  const targetCenter = location ? NEIGHBOURHOOD_CENTRES[location] : null;

  const scored = restaurants.map(r => {
    const busynessData = getBusyness(r, day, time);
    let score = 0;
    const matchFactors = {};

    // Location
    if (location) {
      if (r.neighbourhood.toLowerCase() === location.toLowerCase()) {
        score += 30;
        matchFactors.locationMatch = true;
      } else if (targetCenter && r.coordinates && r.coordinates.lat) {
        const distM = haversineMetres(r.coordinates.lat, r.coordinates.lng, targetCenter.lat, targetCenter.lng);
        const proximityPts = Math.max(0, Math.round(15 - distM / 300));
        score += proximityPts;
        if (proximityPts >= 8) matchFactors.locationProximity = true;
      }
    }

    // Vibe
    if (vibe && r.vibes.includes(vibe)) {
      score += 25;
      matchFactors.vibeMatch = true;
    }

    // Occasion
    const occasionMatch = occasion && r.occasions.includes(occasion);
    if (occasionMatch) {
      score += 25;
      matchFactors.occasionMatch = true;
    }

    if (occasion === 'late night' && !r.lateNight) score -= 45;
    if (occasion === 'coffee' && !r.isCafe) score -= 30;
    if (occasion === 'breakfast' && (r.openHour || 11) > 9) score -= 25;
    if (occasion === 'brunch' && (r.openHour || 11) > 11) score -= 20;

    if (!isOpenAt(r, time)) score -= 40;

    // Rating bonus
    score += Math.min(15, Math.max(0, (r.rating - 4.0) * 30));

    // Cuisine
    if (selectedCuisines.length > 0) {
      const rCats = r.cuisineCategories || [];
      const match = selectedCuisines.some(c => rCats.includes(c));
      if (match) { score += 20; matchFactors.cuisineMatch = true; }
      else score -= 25;
    }

    // Busyness alignment
    const bs = busynessData.score;
    if ((vibe === 'quiet' || vibe === 'conversation friendly') && bs <= 4) score += 5;
    if ((vibe === 'quiet' || vibe === 'conversation friendly') && bs >= 8) score -= 5;
    if ((vibe === 'lively' || vibe === 'music forward') && bs >= 6.5) score += 5;
    if (vibe === 'happy hour friendly' && bs >= 3.5 && bs <= 7.5) score += 5;

    if (occasion === 'large group' && r.popularity < 6) score -= 8;
    if (occasion === 'first date' && bs >= 8.5) score -= 5;
    if (occasion === 'solo' && r.tags && r.tags.some(t => t.toLowerCase().includes('bar') || t.toLowerCase().includes('counter'))) score += 5;

    score = Math.round(Math.min(100, score));
    const isStrongMatch = score >= 55;

    return {
      ...r,
      matchScore: score,
      isStrongMatch,
      matchFactors,
      busyness: busynessData,
      whyRecommended: buildWhyText(r, params, busynessData, matchFactors),
    };
  });

  scored.sort((a, b) => b.matchScore !== a.matchScore ? b.matchScore - a.matchScore : b.rating - a.rating);
  return scored;
}

module.exports = { rankRestaurants, parseTimeHour, isOpenAt };
