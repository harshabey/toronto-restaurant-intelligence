const { getBusyness } = require('./busyness');

function buildWhyText(restaurant, params, busynessData, matchFactors) {
  const { vibe, occasion, location } = params;
  const reasons = [];
  if (matchFactors.locationMatch) reasons.push(`right in ${location}`);
  if (matchFactors.vibeMatch) {
    const vm = { trendy:'a trendy crowd favourite', quiet:'a quiet, intimate setting', upscale:'an upscale atmosphere', lively:'a lively, buzzy energy' };
    reasons.push(vm[vibe] || `a ${vibe} vibe`);
  }
  if (matchFactors.occasionMatch) {
    const om = { date:'ideal for dates', 'casual dinner':'perfect for a casual night out', celebration:'made for celebrations', business:'well-suited for business dining' };
    reasons.push(om[occasion] || `great for ${occasion}`);
  }
  if ((busynessData.label === 'Quiet' || busynessData.label === 'Moderate') && vibe === 'quiet') reasons.push('and relatively quiet right now');
  if ((busynessData.label === 'Very Busy' || busynessData.label === 'Packed') && vibe === 'lively') reasons.push('and buzzing with energy tonight');
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
    if (r.neighbourhood.toLowerCase() === (location||'').toLowerCase()) { score += 30; matchFactors.locationMatch = true; }
    if (r.vibes.includes(vibe)) { score += 25; matchFactors.vibeMatch = true; }
    if (r.occasions.includes(occasion)) { score += 25; matchFactors.occasionMatch = true; }
    score += Math.min(15, Math.max(0, (r.rating - 4.0) * 30));
    if (vibe === 'lively' && busynessData.score >= 6.5) score += 5;
    if (vibe === 'quiet' && busynessData.score <= 4) score += 5;
    if (vibe === 'quiet' && busynessData.score >= 8) score -= 5;
    score = Math.min(100, Math.round(score));
    return { ...r, matchScore: score, matchFactors, busyness: busynessData, whyRecommended: buildWhyText(r, params, busynessData, matchFactors) };
  });
  scored.sort((a, b) => b.matchScore !== a.matchScore ? b.matchScore - a.matchScore : b.rating - a.rating);
  return scored;
}

module.exports = { rankRestaurants };
