const { getBusyness } = require('./busyness');

const OCCASION_COPY = {
  'date':           'ideal for a date night',
  'first date':     'perfect for a first date',
  'follow-up date': 'great for a romantic follow-up',
  'casual dinner':  'perfect for a relaxed evening out',
  'celebration':    'made for celebrations',
  'business':       'well-suited for business dining',
  'solo':           'a great solo dining spot',
  'small group':    'ideal for a small group (3-5)',
  'large group':    'great for a larger group (6+)',
  'catching up':    'perfect for catching up',
  'family dinner':  'great for a family dinner',
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

function buildWhyText(restaurant, params, busynessData, matchFactors) {
  const { vibe, occasion, location } = params;
  const reasons = [];

  if (matchFactors.locationMatch) reasons.push(`right in ${location}`);
  if (matchFactors.vibeMatch) reasons.push(VIBE_COPY[vibe] || `a ${vibe} vibe`);
  if (matchFactors.occasionMatch) reasons.push(OCCASION_COPY[occasion] || `great for ${occasion}`);

  // Dynamic busyness context
  if (vibe === 'quiet' && (busynessData.label === 'Quiet' || busynessData.label === 'Moderate')) {
    reasons.push('and relatively quiet right now');
  }
  if ((vibe === 'lively' || vibe === 'music forward') && (busynessData.label === 'Very Busy' || busynessData.label === 'Packed')) {
    reasons.push('and buzzing with energy tonight');
  }
  if (vibe === 'happy hour friendly' && busynessData.label === 'Moderate') {
    reasons.push('and at a good flow for happy hour');
  }

  if (reasons.length === 0) return `Highly rated with a ${restaurant.cuisine} menu that suits ${occasion}.`;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  if (reasons.length === 1) return `${cap(reasons[0])}.`;
  if (reasons.length === 2) return `${cap(reasons[0])} and ${reasons[1]}.`;
  const last = reasons.pop();
  return `${cap(reasons.join(', '))}, and ${last}.`;
}

function rankRestaurants(restaurants, params) {
  const { location, occasion, vibe, time, day } = params;

  const scored = restaurants.map(r => {
    const busynessData = getBusyness(r, day, time);
    let score = 0;
    const matchFactors = {};

    // Location match — 30 pts
    if (r.neighbourhood.toLowerCase() === (location || '').toLowerCase()) {
      score += 30;
      matchFactors.locationMatch = true;
    }

    // Vibe match — 25 pts
    if (r.vibes.includes(vibe)) {
      score += 25;
      matchFactors.vibeMatch = true;
    }

    // Occasion match — 25 pts
    if (r.occasions.includes(occasion)) {
      score += 25;
      matchFactors.occasionMatch = true;
    }

    // Rating bonus — up to 15 pts
    score += Math.min(15, Math.max(0, (r.rating - 4.0) * 30));

    // Busyness alignment — up to ±5 pts
    const bs = busynessData.score;

    // Quiet / conversation-friendly: reward lower busyness, penalise packed
    if ((vibe === 'quiet' || vibe === 'conversation friendly') && bs <= 4) score += 5;
    if ((vibe === 'quiet' || vibe === 'conversation friendly') && bs >= 8) score -= 5;

    // Lively / music-forward: reward higher busyness
    if ((vibe === 'lively' || vibe === 'music forward') && bs >= 6.5) score += 5;

    // Happy hour: sweet spot is moderate-busy (not dead, not packed)
    if (vibe === 'happy hour friendly' && bs >= 3.5 && bs <= 7.5) score += 5;

    // Large group: penalise small / intimate spots (popularity < 6 suggests limited space)
    if (occasion === 'large group' && r.popularity < 6) score -= 8;

    // First date: penalise very loud / packed spots slightly
    if (occasion === 'first date' && bs >= 8.5) score -= 5;

    // Solo: reward bars and spots with solo-friendly atmosphere
    if (occasion === 'solo' && r.tags && r.tags.some(t => t.includes('bar') || t.includes('counter'))) score += 5;

    score = Math.min(100, Math.round(score));

    return {
      ...r,
      matchScore: score,
      matchFactors,
      busyness: busynessData,
      whyRecommended: buildWhyText(r, params, busynessData, matchFactors),
    };
  });

  scored.sort((a, b) => b.matchScore !== a.matchScore ? b.matchScore - a.matchScore : b.rating - a.rating);
  return scored;
}

module.exports = { rankRestaurants };
