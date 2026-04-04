'use strict';
/**
 * lib/vibe-engine.js
 *
 * Intent-to-venue matching engine.
 * Parses free-text queries like "quiet coffee shop to work from"
 * and returns a vibe profile used to score and rank venues.
 *
 * Usage:
 *   const { parseIntent, scoreVenueByIntent } = require('./vibe-engine');
 *   const intent = parseIntent('romantic dinner for two');
 *   const bonus  = scoreVenueByIntent(venue, intent);  // 0–40
 */

const DIMS = ['romantic', 'energetic', 'focused', 'social', 'upscale', 'casual', 'adventurous'];

// ─── Intent Dictionary ─────────────────────────────────────────────────────────────────
const INTENT_DICTIONARY = [
  // ── Work / Focus
  {
    id: 'work',
    patterns: ['work', 'working', 'laptop', 'study', 'studying', 'focus', 'productive', 'remote', 'zoom', 'meeting', 'concentrate', 'get stuff done', 'take a call'],
    tags: ['quiet', 'work-friendly', 'low traffic'],
    scores: { romantic:0.0, energetic:0.1, focused:0.9, social:0.2, upscale:0.2, casual:0.8, adventurous:0.1 },
    occasionHint: 'solo', vibeHint: 'quiet', cuisineHints: ['Coffee & Cafe'], priceHint: 1, preferCafe: true,
  },
  // ── Coffee / Cafe
  {
    id: 'coffee',
    patterns: ['coffee', 'cafe', 'espresso', 'latte', 'cappuccino', 'tea', 'matcha', 'pour over', 'cold brew'],
    tags: ['coffee', 'casual', 'neighbourhood'],
    scores: { romantic:0.2, energetic:0.2, focused:0.5, social:0.4, upscale:0.1, casual:0.9, adventurous:0.1 },
    occasionHint: 'coffee', vibeHint: null, cuisineHints: ['Coffee & Cafe'], priceHint: 1, preferCafe: true,
  },
  // ── Brunch
  {
    id: 'brunch',
    patterns: ['brunch', 'eggs', 'mimosa', 'bloody mary', 'weekend morning', 'sunday', 'pancakes', 'waffles', 'avocado toast'],
    tags: ['brunch', 'morning', 'casual'],
    scores: { romantic:0.4, energetic:0.5, focused:0.1, social:0.7, upscale:0.2, casual:0.8, adventurous:0.2 },
    occasionHint: 'brunch', vibeHint: null, cuisineHints: ['Brunch & Breakfast'], priceHint: 2,
  },
  // ── Romantic / Date
  {
    id: 'romantic',
    patterns: ['date', 'romantic', 'romance', 'anniversary', 'intimate', 'girlfriend', 'boyfriend', 'partner', 'valentine', 'special night', 'proposal', 'impress'],
    tags: ['romantic', 'intimate', 'date-worthy', 'cozy'],
    scores: { romantic:0.95, energetic:0.3, focused:0.0, social:0.5, upscale:0.5, casual:0.3, adventurous:0.3 },
    occasionHint: 'date', vibeHint: 'quiet', cuisineHints: ['Italian', 'French', 'Mediterranean'], priceHint: null,
  },
  // ── First Date
  {
    id: 'first_date',
    patterns: ['first date', 'new date', 'blind date', 'meet someone', 'getting to know'],
    tags: ['conversation friendly', 'relaxed', 'comfortable'],
    scores: { romantic:0.7, energetic:0.2, focused:0.0, social:0.7, upscale:0.3, casual:0.6, adventurous:0.4 },
    occasionHint: 'first date', vibeHint: 'conversation friendly', cuisineHints: [], priceHint: 2,
  },
  // ── Business
  {
    id: 'business',
    patterns: ['business', 'client', 'work lunch', 'work dinner', 'professional', 'corporate', 'deal', 'colleague', 'impress client'],
    tags: ['upscale', 'quiet', 'professional'],
    scores: { romantic:0.0, energetic:0.2, focused:0.6, social:0.5, upscale:0.9, casual:0.0, adventurous:0.1 },
    occasionHint: 'business', vibeHint: 'upscale', cuisineHints: [], priceHint: 3,
  },
  // ── Celebration
  {
    id: 'celebration',
    patterns: ['celebration', 'celebrate', 'birthday', 'graduation', 'promotion', 'milestone', 'special occasion', 'treat myself'],
    tags: ['upscale', 'celebratory', 'memorable'],
    scores: { romantic:0.4, energetic:0.5, focused:0.0, social:0.8, upscale:0.7, casual:0.1, adventurous:0.4 },
    occasionHint: 'celebration', vibeHint: 'upscale', cuisineHints: [], priceHint: 3,
  },
  // ── Large Group
  {
    id: 'group',
    patterns: ['group', 'friends', 'squad', 'crew', 'team', 'party', 'big table', 'everyone', 'large group', 'gang'],
    tags: ['lively', 'group-friendly', 'social'],
    scores: { romantic:0.0, energetic:0.7, focused:0.0, social:0.95, upscale:0.2, casual:0.8, adventurous:0.5 },
    occasionHint: 'large group', vibeHint: 'lively', cuisineHints: [], priceHint: null,
  },
  // ── Bar / Drinks
  {
    id: 'bar',
    patterns: ['bar', 'drinks', 'cocktails', 'cocktail', 'beer', 'wine', 'booze', 'happy hour', 'nightlife', 'night out', 'pub', 'patio'],
    tags: ['bar', 'lively', 'drinks'],
    scores: { romantic:0.3, energetic:0.8, focused:0.0, social:0.9, upscale:0.2, casual:0.7, adventurous:0.5 },
    occasionHint: 'late night', vibeHint: 'lively', cuisineHints: ['Bar', 'Wine Bar', 'Gastropub'], priceHint: null, preferBar: true,
  },
  // ── Late Night
  {
    id: 'late_night',
    patterns: ['late night', 'open late', 'after midnight', 'night owl', '1am', '2am', 'after hours', 'still open'],
    tags: ['late night', 'open late'],
    scores: { romantic:0.2, energetic:0.7, focused:0.0, social:0.8, upscale:0.1, casual:0.8, adventurous:0.6 },
    occasionHint: 'late night', vibeHint: 'lively', cuisineHints: [], priceHint: null, lateNight: true,
  },
  // ── Quiet / Cozy
  {
    id: 'quiet',
    patterns: ['quiet', 'cozy', 'chill', 'relaxed', 'peaceful', 'calm', 'low key', 'lowkey', 'mellow', 'not loud', 'hidden gem'],
    tags: ['quiet', 'cozy', 'relaxed'],
    scores: { romantic:0.5, energetic:0.1, focused:0.5, social:0.3, upscale:0.2, casual:0.8, adventurous:0.1 },
    occasionHint: null, vibeHint: 'quiet', cuisineHints: [], priceHint: null,
  },
  // ── Trendy / Aesthetic
  {
    id: 'trendy',
    patterns: ['trendy', 'instagram', 'aesthetic', 'cool', 'hip', 'hotspot', 'popular', 'buzzing', 'scene', 'vibes'],
    tags: ['trendy', 'popular', 'aesthetic'],
    scores: { romantic:0.3, energetic:0.7, focused:0.0, social:0.7, upscale:0.4, casual:0.5, adventurous:0.6 },
    occasionHint: 'catching up', vibeHint: 'trendy', cuisineHints: [], priceHint: null,
  },
  // ── Budget
  {
    id: 'budget',
    patterns: ['cheap', 'budget', 'affordable', 'inexpensive', 'value', 'bang for buck', 'not expensive', 'reasonable'],
    tags: ['affordable', 'casual', 'value'],
    scores: { romantic:0.1, energetic:0.3, focused:0.2, social:0.5, upscale:0.0, casual:0.9, adventurous:0.4 },
    occasionHint: null, vibeHint: null, cuisineHints: [], priceHint: 1,
  },
  // ── Upscale / Fine Dining
  {
    id: 'upscale',
    patterns: ['upscale', 'fancy', 'fine dining', 'high end', 'luxury', 'special', 'splurge', 'michelin', 'tasting menu'],
    tags: ['upscale', 'fine dining', 'special'],
    scores: { romantic:0.5, energetic:0.2, focused:0.2, social:0.5, upscale:0.95, casual:0.0, adventurous:0.2 },
    occasionHint: 'celebration', vibeHint: 'upscale', cuisineHints: [], priceHint: 4,
  },
  // ── Vegan / Vegetarian
  {
    id: 'vegan',
    patterns: ['vegan', 'vegetarian', 'plant based', 'plant-based', 'no meat', 'veggie', 'meat free'],
    tags: ['vegan', 'vegetarian', 'plant-based'],
    scores: { romantic:0.2, energetic:0.3, focused:0.2, social:0.5, upscale:0.2, casual:0.7, adventurous:0.5 },
    occasionHint: null, vibeHint: null, cuisineHints: ['Vegan/Vegetarian'], priceHint: null,
  },
  // ── Catching Up
  {
    id: 'catch_up',
    patterns: ['catch up', 'catching up', 'reconnect', 'good chat', 'long chat', 'gossip', 'bestie'],
    tags: ['conversation friendly', 'casual', 'relaxed'],
    scores: { romantic:0.1, energetic:0.3, focused:0.1, social:0.9, upscale:0.2, casual:0.8, adventurous:0.3 },
    occasionHint: 'catching up', vibeHint: 'conversation friendly', cuisineHints: [], priceHint: null,
  },
  // ── Family
  {
    id: 'family',
    patterns: ['family', 'kids', 'children', 'parents', 'family friendly', 'grandparents', 'all ages'],
    tags: ['family-friendly', 'casual', 'comfortable'],
    scores: { romantic:0.0, energetic:0.4, focused:0.0, social:0.9, upscale:0.1, casual:0.9, adventurous:0.2 },
    occasionHint: 'family dinner', vibeHint: 'lively', cuisineHints: [], priceHint: 2,
  },
  // ── Solo
  {
    id: 'solo',
    patterns: ['solo', 'alone', 'by myself', 'eating alone', 'just me', 'table for one', 'single diner'],
    tags: ['solo-friendly', 'bar seating', 'welcoming'],
    scores: { romantic:0.0, energetic:0.2, focused:0.5, social:0.1, upscale:0.2, casual:0.7, adventurous:0.5 },
    occasionHint: 'solo', vibeHint: 'quiet', cuisineHints: [], priceHint: null,
  },
  // ── Music / Lively
  {
    id: 'music',
    patterns: ['music', 'dancing', 'dj', 'live music', 'energetic', 'lively', 'loud', 'pumping', 'party vibes'],
    tags: ['music forward', 'lively', 'energetic'],
    scores: { romantic:0.1, energetic:0.95, focused:0.0, social:0.9, upscale:0.2, casual:0.7, adventurous:0.7 },
    occasionHint: 'large group', vibeHint: 'music forward', cuisineHints: ['Bar'], priceHint: null, preferBar: true,
  },
];

// ─── Parse Intent ─────────────────────────────────────────────────────────────────
function parseIntent(query) {
  if (!query || typeof query !== 'string') return null;
  const lower = query.toLowerCase();

  const matched = [];
  for (const entry of INTENT_DICTIONARY) {
    let hits = 0;
    for (const pattern of entry.patterns) {
      if (lower.includes(pattern)) hits++;
    }
    if (hits > 0) matched.push({ entry, hits });
  }
  if (!matched.length) return null;

  matched.sort((a, b) => b.hits - a.hits);
  const top = matched.slice(0, 3);
  const totalWeight = top.reduce((s, m) => s + m.hits, 0);

  const tags         = new Set();
  const scores       = Object.fromEntries(DIMS.map(d => [d, 0]));
  const cuisineHints = new Set();
  let occasionHint   = null;
  let vibeHint       = null;
  let priceHint      = null;
  let lateNight      = false;
  let preferCafe     = false;
  let preferBar      = false;

  for (const { entry, hits } of top) {
    const w = hits / totalWeight;
    entry.tags.forEach(t => tags.add(t));
    for (const d of DIMS) scores[d] += (entry.scores[d] || 0) * w;
    (entry.cuisineHints || []).forEach(c => cuisineHints.add(c));
    if (!occasionHint && entry.occasionHint) occasionHint = entry.occasionHint;
    if (!vibeHint     && entry.vibeHint)     vibeHint     = entry.vibeHint;
    if (priceHint == null && entry.priceHint != null) priceHint = entry.priceHint;
    if (entry.lateNight)  lateNight  = true;
    if (entry.preferCafe) preferCafe = true;
    if (entry.preferBar)  preferBar  = true;
  }
  for (const d of DIMS) scores[d] = Math.min(1, Math.max(0, scores[d]));

  return {
    query,
    tags: [...tags],
    scores,
    occasionHint,
    vibeHint,
    cuisineHints: [...cuisineHints],
    priceHint,
    lateNight,
    preferCafe,
    preferBar,
  };
}

// ─── Score Venue by Intent ─────────────────────────────────────────────────────────
function scoreVenueByIntent(venue, intent) {
  if (!intent) return 0;
  let bonus = 0;
  const { scores } = intent;
  const vVibes     = venue.vibes       || [];
  const vOccasions = venue.occasions   || [];
  const vCuisines  = venue.cuisineCategories || [];

  if (scores.romantic > 0.5) {
    if (vOccasions.includes('date') || vOccasions.includes('first date')) bonus += scores.romantic * 12;
    if (vVibes.includes('quiet')) bonus += scores.romantic * 5;
  }
  if (scores.energetic > 0.5 && (venue.isBar || vVibes.includes('lively'))) {
    bonus += scores.energetic * 10;
  }
  if (scores.focused > 0.5) {
    if (venue.isCafe) bonus += scores.focused * 15;
    if (vVibes.includes('quiet') || vVibes.includes('conversation friendly')) bonus += scores.focused * 5;
  }
  if (scores.social > 0.5 && vOccasions.some(o => ['large group', 'small group', 'catching up', 'family dinner'].includes(o))) {
    bonus += scores.social * 8;
  }
  if (scores.upscale > 0.5 && venue.priceLevel >= 3) bonus += scores.upscale * 10;

  if (intent.lateNight  && venue.lateNight) bonus += 20;
  if (intent.preferCafe && venue.isCafe)    bonus += 15;
  if (intent.preferBar  && venue.isBar)     bonus += 15;

  if (intent.cuisineHints.length > 0 && intent.cuisineHints.some(c => vCuisines.includes(c))) bonus += 12;

  if (intent.priceHint != null) {
    bonus += Math.max(0, 8 - Math.abs(venue.priceLevel - intent.priceHint) * 4);
  }

  return Math.min(40, Math.round(bonus));
}

module.exports = { parseIntent, scoreVenueByIntent };
