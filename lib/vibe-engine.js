'use strict';

/**
 * lib/vibe-engine.js
 *
 * Intent-to-venue matching engine.
 * Parses free-text queries like "quiet coffee shop to work from" into
 * weighted vibe dimension vectors, then scores venues against those vectors.
 *
 * Architecture:
 *   INTENT_MAP   — phrase/word → dimension weights (the "dictionary")
 *   computeVibeScores(venue) — venue properties → dimension scores (0–1)
 *   parseIntent(query)       — text → normalised weight map
 *   rankByIntent(venues, q)  — returns venues sorted by intent fit
 */

// ─── Vibe Dimensions ──────────────────────────────────────────────────────────────
// Each venue is scored 0–1 on each of these dimensions based on its properties.
// Intent queries are resolved to weights across these same dimensions,
// so matching is a simple weighted dot-product.

const DIM_LABELS = {
  work_friendly:    'Work-friendly',
  romantic:         'Romantic',
  energetic:        'Lively',
  quiet:            'Quiet',
  group_friendly:   'Group-friendly',
  upscale:          'Upscale',
  casual:           'Casual',
  late_night:       'Late Night',
  brunch_spot:      'Brunch',
  bar_vibe:         'Bar vibe',
  cafe_vibe:        'Café vibe',
  professional:     'Professional',
  affordable:       'Affordable',
  instagram_worthy: 'Instagram-worthy',
  family_friendly:  'Family-friendly',
};

// Why-text snippets per dimension (used in venue cards)
const DIM_REASONS = {
  work_friendly:    r => r.isCafe ? 'Great café for getting work done' : 'Quiet enough to focus',
  romantic:         () => 'Sets the mood for a date night',
  energetic:        () => 'Lively, social atmosphere',
  quiet:            () => 'Low-key \u2014 easy to hear each other',
  group_friendly:   () => 'Handles groups comfortably',
  upscale:          () => 'Elevated experience worth the spend',
  casual:           () => 'Relaxed, no-fuss vibe',
  late_night:       r => r.closeTime ? `Open until ${r.closeTime}` : 'Open late',
  brunch_spot:      () => 'Solid brunch spot',
  bar_vibe:         () => 'Great bar energy',
  cafe_vibe:        () => 'Classic caf\u00e9 feel',
  professional:     () => 'Right setting for a business conversation',
  affordable:       () => 'Easy on the wallet',
  instagram_worthy: () => 'Worth a photo or two',
  family_friendly:  () => 'Good for the whole family',
};

// ─── Intent Map ──────────────────────────────────────────────────────────────────
// Ordered array of [phrase, {dimension: weight}] pairs.
// MUST be ordered longest-first within each category so multi-word phrases
// are matched before their component words.

const INTENT_MAP = [
  // ── Work / productivity ─────────────────────────────────────────────
  ['work from home',   { work_friendly:1.0, quiet:0.8, cafe_vibe:0.6, affordable:0.3 }],
  ['coffee shop to work', { cafe_vibe:1.0, work_friendly:1.0, quiet:0.8 }],
  ['work from',        { work_friendly:1.0, quiet:0.8, cafe_vibe:0.5 }],
  ['business meeting', { professional:1.0, quiet:0.8, upscale:0.5 }],
  ['client dinner',    { professional:1.0, upscale:0.9, romantic:0.3 }],
  ['client lunch',     { professional:0.9, upscale:0.7 }],
  ['work meeting',     { professional:0.8, quiet:0.8 }],
  ['work',             { work_friendly:0.9, quiet:0.6 }],
  ['laptop',           { work_friendly:1.0, quiet:0.7, cafe_vibe:0.5 }],
  ['study',            { work_friendly:0.9, quiet:1.0, cafe_vibe:0.5 }],
  ['focus',            { work_friendly:0.8, quiet:0.9 }],
  ['remote',           { work_friendly:0.8, quiet:0.7 }],
  ['meeting',          { professional:0.8, quiet:0.7, work_friendly:0.5 }],
  ['client',           { professional:0.9, upscale:0.6 }],
  ['wifi',             { work_friendly:0.9, cafe_vibe:0.6 }],
  ['concentrate',      { work_friendly:0.8, quiet:0.9 }],
  ['productive',       { work_friendly:0.9, quiet:0.7 }],

  // ── Romance ─────────────────────────────────────────────────────
  ['first date',       { romantic:1.0, quiet:0.7, upscale:0.4, casual:0.2 }],
  ['date night',       { romantic:1.0, quiet:0.6, upscale:0.5 }],
  ['special occasion', { upscale:0.8, romantic:0.6 }],
  ['anniversary',      { romantic:1.0, upscale:0.8 }],
  ['proposal',         { romantic:1.0, upscale:0.9, quiet:0.7 }],
  ['fine dining',      { upscale:1.0, romantic:0.6, professional:0.5 }],
  ['romantic',         { romantic:1.0, quiet:0.6, upscale:0.4 }],
  ['date',             { romantic:0.9, quiet:0.5 }],
  ['intimate',         { romantic:0.8, quiet:0.8 }],
  ['impress',          { upscale:0.9, instagram_worthy:0.6 }],

  // ── Social / groups ─────────────────────────────────────────────
  ['girls night',      { energetic:0.7, bar_vibe:0.7, group_friendly:0.9 }],
  ['guys night',       { energetic:0.8, bar_vibe:0.8, group_friendly:0.9 }],
  ['night out',        { late_night:0.7, bar_vibe:0.9, energetic:0.8 }],
  ['grab drinks',      { bar_vibe:0.9, energetic:0.6, affordable:0.4 }],
  ['catch up',         { quiet:0.8, casual:0.8, group_friendly:0.6 }],
  ['catching up',      { quiet:0.8, casual:0.8 }],
  ['birthday',         { group_friendly:0.9, energetic:0.7, bar_vibe:0.5 }],
  ['celebrate',        { group_friendly:0.7, upscale:0.5, energetic:0.6 }],
  ['party',            { energetic:1.0, bar_vibe:0.9, late_night:0.7, group_friendly:0.8 }],
  ['friends',          { group_friendly:0.8, energetic:0.5, casual:0.6 }],
  ['group',            { group_friendly:1.0 }],
  ['crew',             { group_friendly:0.8, energetic:0.6 }],
  ['family',           { family_friendly:1.0, casual:0.5 }],
  ['kids',             { family_friendly:1.0 }],
  ['parents',          { family_friendly:0.8, casual:0.5 }],
  ['solo',             { quiet:0.7, work_friendly:0.4 }],
  ['alone',            { quiet:0.7, work_friendly:0.4 }],

  // ── Vibe descriptors ─────────────────────────────────────────────
  ['low key',          { casual:0.9, quiet:0.7 }],
  ['low-key',          { casual:0.9, quiet:0.7 }],
  ['lowkey',           { casual:0.9, quiet:0.7 }],
  ['cozy',             { quiet:0.8, casual:0.7, cafe_vibe:0.5 }],
  ['chill',            { quiet:0.7, casual:0.9 }],
  ['quiet',            { quiet:1.0, work_friendly:0.4 }],
  ['peaceful',         { quiet:1.0 }],
  ['lively',           { energetic:0.8, bar_vibe:0.5 }],
  ['loud',             { energetic:0.9, bar_vibe:0.7 }],
  ['vibey',            { energetic:0.7, instagram_worthy:0.6 }],
  ['trendy',           { instagram_worthy:0.8, upscale:0.4 }],
  ['fancy',            { upscale:0.9, romantic:0.5 }],
  ['upscale',          { upscale:1.0 }],
  ['classy',           { upscale:0.8, professional:0.5 }],
  ['casual',           { casual:1.0 }],
  ['relaxed',          { casual:0.8, quiet:0.5 }],
  ['fun',              { energetic:0.7, casual:0.6 }],
  ['aesthetic',        { instagram_worthy:0.9 }],
  ['instagram',        { instagram_worthy:1.0 }],
  ['photos',           { instagram_worthy:0.8 }],

  // ── Time / meal ───────────────────────────────────────────────
  ['brunch spot',      { brunch_spot:1.0, casual:0.6 }],
  ['late night',       { late_night:1.0, bar_vibe:0.8, energetic:0.6 }],
  ['happy hour',       { bar_vibe:0.9, affordable:0.8, energetic:0.5 }],
  ['morning coffee',   { cafe_vibe:1.0, quiet:0.7, work_friendly:0.5 }],
  ['breakfast',        { brunch_spot:0.9, cafe_vibe:0.5, casual:0.5 }],
  ['brunch',           { brunch_spot:1.0, casual:0.5 }],
  ['lunch',            { casual:0.5, work_friendly:0.3, affordable:0.3 }],
  ['dinner',           { romantic:0.3, upscale:0.2 }],
  ['morning',          { brunch_spot:0.6, cafe_vibe:0.7 }],
  ['afternoon',        { casual:0.5, cafe_vibe:0.4 }],
  ['late',             { late_night:0.8, bar_vibe:0.5 }],
  ['night',            { late_night:0.5, bar_vibe:0.4 }],

  // ── Venue type ───────────────────────────────────────────────
  ['coffee shop',      { cafe_vibe:1.0, quiet:0.7, work_friendly:0.8, affordable:0.5 }],
  ['wine bar',         { bar_vibe:0.8, upscale:0.7, romantic:0.6 }],
  ['cocktail bar',     { bar_vibe:0.9, upscale:0.5, energetic:0.5 }],
  ['coffee',           { cafe_vibe:0.9, quiet:0.6, work_friendly:0.5 }],
  ['cafe',             { cafe_vibe:1.0, quiet:0.6, work_friendly:0.4 }],
  ['bar',              { bar_vibe:1.0, energetic:0.5 }],
  ['pub',              { bar_vibe:0.9, casual:0.7, affordable:0.5 }],
  ['cocktail',         { bar_vibe:0.8, upscale:0.5 }],
  ['cocktails',        { bar_vibe:0.8, upscale:0.5 }],
  ['wine',             { upscale:0.5, romantic:0.4, bar_vibe:0.5 }],
  ['beer',             { bar_vibe:0.7, casual:0.7, affordable:0.5 }],
  ['drinks',           { bar_vibe:0.7, energetic:0.4 }],
  ['sushi',            { romantic:0.3, upscale:0.4 }],
  ['pizza',            { casual:0.7, affordable:0.6 }],
  ['italian',          { romantic:0.4, upscale:0.3 }],
  ['sports',           { bar_vibe:0.9, energetic:0.8, group_friendly:0.7 }],
  ['business',         { professional:1.0, upscale:0.5, quiet:0.5 }],

  // ── Budget ───────────────────────────────────────────────────
  ['cheap',            { affordable:1.0, casual:0.5 }],
  ['budget',           { affordable:1.0, casual:0.5 }],
  ['affordable',       { affordable:0.9 }],
  ['inexpensive',      { affordable:0.9 }],
  ['value',            { affordable:0.8 }],
  ['splurge',          { upscale:1.0, romantic:0.4 }],
  ['expensive',        { upscale:0.7 }],
  ['pricey',           { upscale:0.7 }],
  ['treat',            { upscale:0.6, romantic:0.3 }],
];

// ─── Core Functions ──────────────────────────────────────────────────────────────

/**
 * Parse a free-text intent query into a normalised dimension weight map.
 * Returns null when no known intent is detected.
 * @param {string} query
 * @returns {{ [dim: string]: number } | null}
 */
function parseIntent(query) {
  if (!query || !query.trim()) return null;
  const q = query.toLowerCase().trim();
  const weights = {};

  for (const [phrase, dims] of INTENT_MAP) {
    if (q.includes(phrase)) {
      for (const [dim, w] of Object.entries(dims)) {
        // Keep the strongest signal for each dimension across all matched phrases
        weights[dim] = Math.max(weights[dim] || 0, w);
      }
    }
  }

  if (Object.keys(weights).length === 0) return null;

  // Normalise to a comparable scale (sum of weights → 1)
  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  const normalised = {};
  for (const [dim, w] of Object.entries(weights)) {
    normalised[dim] = w / total;
  }
  return normalised;
}

/**
 * Compute a vibe score vector for a venue from its stored properties.
 * All scores are in [0, 1].
 * @param {object} r  Restaurant object
 * @returns {{ [dim: string]: number }}
 */
function computeVibeScores(r) {
  const vibes     = r.vibes     || [];
  const occasions = r.occasions || [];
  const price     = r.priceLevel || 2;
  const isBar     = r.isBar     || false;
  const isCafe    = r.isCafe    || false;
  const isLate    = r.lateNight || false;
  const closeH    = r.closeHour || 23;

  return {
    work_friendly:
      isCafe                                                      ? 0.85
      : vibes.includes('quiet') || vibes.includes('conversation friendly') ? 0.55
      : isBar                                                     ? 0.10
      : 0.30,

    romantic:
      occasions.includes('date') || occasions.includes('first date')  ? 0.85
      : occasions.includes('follow-up date')                           ? 0.75
      : price >= 3 && !isBar                                           ? 0.60
      : isBar                                                          ? 0.25
      : 0.35,

    energetic:
      isBar                             ? 0.90
      : vibes.includes('lively')        ? 0.75
      : vibes.includes('music forward') ? 0.70
      : isCafe                          ? 0.15
      : 0.40,

    quiet:
      vibes.includes('quiet')                    ? 0.90
      : vibes.includes('conversation friendly')  ? 0.80
      : isCafe                                   ? 0.70
      : isBar                                    ? 0.10
      : isLate                                   ? 0.20
      : 0.50,

    group_friendly:
      occasions.includes('large group') ? 0.95
      : occasions.includes('small group') ? 0.75
      : isBar ? 0.70
      : 0.50,

    upscale:
      price >= 4 ? 1.00
      : price === 3 ? 0.80
      : price === 2 ? 0.45
      : 0.15,

    casual:
      price <= 1 ? 0.95
      : price === 2 ? 0.75
      : price === 3 ? 0.35
      : 0.10,

    late_night:
      isLate       ? 0.90
      : closeH >= 25 ? 0.75
      : closeH >= 24 ? 0.60
      : closeH >= 22 ? 0.30
      : 0.05,

    brunch_spot:
      occasions.includes('brunch') || occasions.includes('breakfast') ? 0.90
      : isCafe ? 0.55
      : 0.20,

    bar_vibe:
      isBar                                       ? 1.00
      : vibes.includes('happy hour friendly')     ? 0.55
      : 0.10,

    cafe_vibe:
      isCafe                              ? 1.00
      : vibes.includes('quiet') && !isBar ? 0.30
      : 0.05,

    professional:
      occasions.includes('business')          ? 0.95
      : price >= 3 && !isBar && !isCafe       ? 0.60
      : price >= 3                            ? 0.45
      : 0.20,

    affordable:
      price === 1 ? 1.00
      : price === 2 ? 0.70
      : price === 3 ? 0.25
      : 0.05,

    instagram_worthy:
      vibes.includes('trendy') ? 0.85
      : price >= 3 ? 0.65
      : isCafe ? 0.50
      : 0.30,

    family_friendly:
      occasions.includes('family dinner') ? 0.95
      : isBar || isLate                   ? 0.05
      : isCafe                            ? 0.70
      : 0.50,
  };
}

/**
 * Return the top-N matched dimension labels for a weight map.
 * Used to display tag pills in the UI.
 * @param {{ [dim: string]: number }} weights
 * @param {number} topN
 * @returns {string[]}
 */
function getMatchedTags(weights, topN = 4) {
  return Object.entries(weights)
    .filter(([, w]) => w > 0.05)
    .sort(([, a], [, b]) => b - a)
    .slice(0, topN)
    .map(([dim]) => DIM_LABELS[dim])
    .filter(Boolean);
}

/**
 * Rank venues by intent query.
 * Returns null when intent is unrecognised (caller falls back to rating sort).
 *
 * Scoring: 65% intent fit + 35% rating quality.
 * Location bonus (+8 pts) applied after scoring if neighbourhood is specified.
 *
 * @param {object[]} venues
 * @param {string}   intentQuery
 * @param {{ location?: string }} params
 * @returns {object[] | null}
 */
function rankByIntent(venues, intentQuery, params) {
  const weights = parseIntent(intentQuery);
  if (!weights) return null;

  const scored = venues.map(r => {
    const vs = computeVibeScores(r);

    // Weighted dot-product of intent weights × venue scores
    let intentScore = 0;
    let weightSum   = 0;
    for (const [dim, w] of Object.entries(weights)) {
      if (vs[dim] !== undefined) {
        intentScore += vs[dim] * w;
        weightSum   += w;
      }
    }
    const normalised = weightSum > 0 ? intentScore / weightSum : 0;

    // Blend intent fit with rating quality
    const rating5   = Math.min(r.rating || 4.0, 5) / 5;
    let   blended   = Math.round((normalised * 0.65 + rating5 * 0.35) * 100);

    // Location bonus
    if (params && params.location &&
        r.neighbourhood.toLowerCase() === params.location.toLowerCase()) {
      blended = Math.min(100, blended + 8);
    }

    // Build the why-text from the top 2 intent dimensions
    const topDims = Object.entries(weights)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([d]) => d);
    const whyParts = topDims.map(d => DIM_REASONS[d]?.(r)).filter(Boolean);
    const whyRecommended = whyParts.join(' \u00b7 ') || `${blended}% intent match`;

    return {
      ...r,
      matchScore:    blended,
      isStrongMatch: blended >= 70,
      intentScore:   Math.round(normalised * 100),
      whyRecommended,
    };
  });

  return scored.sort((a, b) => b.matchScore - a.matchScore);
}

module.exports = { parseIntent, computeVibeScores, rankByIntent, getMatchedTags, DIM_LABELS };
