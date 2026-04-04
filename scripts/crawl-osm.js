#!/usr/bin/env node
/**
 * scripts/crawl-osm.js
 *
 * Fetches Toronto restaurant / bar / cafe data from OpenStreetMap via the
 * Overpass API.  100% free — no API key, no rate-limit cliff, runs forever.
 *
 * ─── Run ─────────────────────────────────────────────────────────────────────
 *  node scripts/crawl-osm.js
 *
 * ─── After running ───────────────────────────────────────────────────────────
 *  git add data/restaurants-osm.js
 *  git commit -m "data: refresh OSM crawl"
 *  git push
 *  → Vercel auto-deploys with the new venues included
 *
 * ─── Node version ────────────────────────────────────────────────────────────
 *  Requires Node 18+ (uses built-in fetch).
 */

'use strict';
const fs   = require('fs');
const path = require('path');

// ─── Toronto bounding box (south, west, north, east) ─────────────────────────
const BBOX = '43.58,-79.64,43.86,-79.11';

// ─── Neighbourhood centres (same list as the app) ─────────────────────────────
const NEIGHBOURHOODS = [
  { name: 'Bay Street Corridor', lat: 43.6496, lng: -79.3826 },
  { name: 'Chinatown',           lat: 43.6548, lng: -79.3991 },
  { name: 'Distillery District', lat: 43.6503, lng: -79.3592 },
  { name: 'Dundas West',         lat: 43.6535, lng: -79.4390 },
  { name: 'Harbord Village',     lat: 43.6607, lng: -79.4055 },
  { name: 'Harbourfront',        lat: 43.6386, lng: -79.3822 },
  { name: 'Kensington Market',   lat: 43.6556, lng: -79.4009 },
  { name: 'King West',           lat: 43.6466, lng: -79.3971 },
  { name: 'Leslieville',         lat: 43.6618, lng: -79.3296 },
  { name: 'Liberty Village',     lat: 43.6393, lng: -79.4236 },
  { name: 'Little Italy',        lat: 43.6546, lng: -79.4131 },
  { name: 'Niagara',             lat: 43.6432, lng: -79.4064 },
  { name: 'Ossington',           lat: 43.6489, lng: -79.4240 },
  { name: 'Queen West',          lat: 43.6476, lng: -79.4071 },
  { name: 'Roncesvalles',        lat: 43.6492, lng: -79.4479 },
  { name: 'The Annex',           lat: 43.6660, lng: -79.4122 },
  { name: 'Yorkville',           lat: 43.6740, lng: -79.3956 },
];

// Maximum distance (km) to assign a neighbourhood — venues outside all radii are skipped
const MAX_RADIUS_KM = 1.2;

// ─── Cuisine tag mapping ──────────────────────────────────────────────────────
// OSM uses lowercase strings, sometimes semicolon-separated
const OSM_CUISINE_MAP = {
  italian:        'Italian',
  pizza:          'Pizza',
  japanese:       'Japanese',
  sushi:          'Japanese',
  ramen:          'Japanese',
  korean:         'Korean',
  mexican:        'Mexican',
  mediterranean:  'Mediterranean',
  greek:          'Mediterranean',
  middle_eastern: 'Middle Eastern',
  lebanese:       'Middle Eastern',
  indian:         'Indian',
  thai:           'Thai',
  vietnamese:     'Vietnamese',
  chinese:        'Chinese',
  american:       'American',
  burger:         'American',
  french:         'French',
  spanish:        'Spanish',
  seafood:        'Seafood',
  steak_house:    'Steakhouse',
  steak:          'Steakhouse',
  barbecue:       'BBQ',
  bbq:            'BBQ',
  tapas:          'Tapas',
  brunch:         'Brunch & Breakfast',
  breakfast:      'Brunch & Breakfast',
  coffee_shop:    'Coffee & Cafe',
  coffee:         'Coffee & Cafe',
  cafe:           'Coffee & Cafe',
  bar:            'Bar',
  pub:            'Bar',
  wine_bar:       'Wine Bar',
  gastropub:      'Gastropub',
  vegan:          'Vegan/Vegetarian',
  vegetarian:     'Vegan/Vegetarian',
  asian:          'Asian Fusion',
  canadian:       'Canadian',
  sandwich:       'Sandwiches',
  regional:       'Canadian',
};

const AMENITY_TO_CATEGORY = {
  restaurant: 'Restaurant',
  bar:        'Bar',
  pub:        'Bar',
  cafe:       'Coffee & Cafe',
  fast_food:  'Restaurant',
  food_court: 'Restaurant',
  ice_cream:  'Coffee & Cafe',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Haversine distance in km */
function distKm(lat1, lng1, lat2, lng2) {
  const R  = 6371;
  const dL = ((lat2 - lat1) * Math.PI) / 180;
  const dG = ((lng2 - lng1) * Math.PI) / 180;
  const a  =
    Math.sin(dL / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dG / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Return the nearest neighbourhood name, or null if too far from all centres */
function assignNeighbourhood(lat, lng) {
  let best = null;
  let bestDist = Infinity;
  for (const nb of NEIGHBOURHOODS) {
    const d = distKm(lat, lng, nb.lat, nb.lng);
    if (d < bestDist) { bestDist = d; best = nb.name; }
  }
  return bestDist <= MAX_RADIUS_KM ? best : null;
}

/**
 * Parse OSM opening_hours into {openHour, closeHour}.
 * OSM format is complex; we extract the first HH:MM-HH:MM we can find.
 * Falls back to 11-23 when unparseable.
 */
function parseOpeningHours(raw) {
  if (!raw) return { openHour: 11, closeHour: 23 };
  if (/24\/7/i.test(raw)) return { openHour: 0, closeHour: 24 };

  // Match first occurrence of something like "11:00-23:00" or "11:00-00:00"
  const m = raw.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
  if (!m) return { openHour: 11, closeHour: 23 };

  const openHour  = parseInt(m[1], 10);
  let   closeHour = parseInt(m[3], 10);
  // Midnight (00:00 after opening) → treat as 24
  if (closeHour === 0) closeHour = 24;
  // Close before open → add 24 (crosses midnight)
  if (closeHour < openHour) closeHour += 24;

  return { openHour, closeHour };
}

/** Map OSM cuisine string to our cuisineCategories array */
function parseCuisine(raw, amenity) {
  const cats = new Set();
  if (raw) {
    raw.split(/[;,]/).forEach(part => {
      const key = part.trim().toLowerCase().replace(/ /g, '_');
      const mapped = OSM_CUISINE_MAP[key];
      if (mapped) cats.add(mapped);
    });
  }
  if (!cats.size) {
    const fallback = AMENITY_TO_CATEGORY[amenity];
    if (fallback) cats.add(fallback);
    else cats.add('Canadian');
  }
  return [...cats];
}

/** Build a human-readable address from OSM address tags */
function buildAddress(tags) {
  const parts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:city'] || 'Toronto',
  ].filter(Boolean);
  return parts.join(' ');
}

/** Map a raw OSM element to our restaurant shape */
function mapElement(el) {
  const tags     = el.tags || {};
  const lat      = el.lat  ?? el.center?.lat;
  const lng      = el.lon  ?? el.center?.lon;
  if (!lat || !lng) return null;

  const name = (tags.name || '').trim();
  if (!name) return null;

  const neighbourhood = assignNeighbourhood(lat, lng);
  if (!neighbourhood) return null;   // too far from a supported neighbourhood

  const amenity = tags.amenity || 'restaurant';
  const isBar   = ['bar', 'pub'].includes(amenity);
  const isCafe  = ['cafe', 'ice_cream'].includes(amenity);

  const cuisineCategories = parseCuisine(tags.cuisine, amenity);
  const cuisine = cuisineCategories[0] || (isBar ? 'Bar' : isCafe ? 'Coffee & Cafe' : 'Restaurant');

  const { openHour, closeHour } = parseOpeningHours(tags.opening_hours);
  const lateNight = isBar || closeHour >= 25;

  // OSM has no rating data — use 4.0 as neutral default
  // Popularity heuristic: more tags filled in → more likely a notable venue
  const tagCount   = Object.keys(tags).length;
  const popularity = Math.min(8, Math.max(2, Math.round(tagCount / 3)));

  // Price: OSM uses "$", "$$", "$$$", "$$$$" in fee tag — or stars 1-4
  const feeRaw   = tags.fee || tags['payment:cash'] || '';
  const priceTag = tags['price_level'] || tags['stars'] || '';
  let priceLevel = 2;
  if (/\$\$\$\$/.test(feeRaw || priceTag)) priceLevel = 4;
  else if (/\$\$\$/.test(feeRaw || priceTag)) priceLevel = 3;
  else if (/\$\$/.test(feeRaw || priceTag))  priceLevel = 2;
  else if (/\$/.test(feeRaw || priceTag))    priceLevel = 1;

  const vibes = [];
  if (priceLevel >= 3) vibes.push('upscale');
  if (isBar)           vibes.push('lively', 'happy hour friendly');
  if (isCafe)          vibes.push('quiet', 'conversation friendly');
  if (!vibes.length)   vibes.push('trendy');

  const occasions = ['casual dinner', 'catching up'];
  if (!isBar && !isCafe)  occasions.push('date', 'small group', 'family dinner');
  if (isBar)              occasions.push('large group', 'late night');
  if (isCafe)             occasions.push('coffee', 'solo', 'breakfast');
  if (priceLevel >= 3)    occasions.push('business', 'celebration');

  return {
    id:               `osm_${el.type}_${el.id}`,
    name,
    neighbourhood,
    address:          buildAddress(tags),
    cuisine,
    cuisineCategories,
    priceLevel,
    rating:           4.0,
    reviewCount:      0,
    popularity,
    vibes,
    occasions,
    tags:             [amenity, ...(tags.cuisine ? tags.cuisine.split(/[;,]/).map(s => s.trim()) : [])].slice(0, 6),
    googleReviews:    [],
    coordinates:      { lat, lng },
    openHour,
    closeHour,
    lateNight,
    isBar,
    isCafe,
    source:           'osm',
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function crawl() {
  console.log('');
  console.log('🗺️   Toronto Table — OpenStreetMap Crawl');
  console.log('=========================================');
  console.log('Source : Overpass API (100% free, no key needed)');
  console.log(`BBox   : ${BBOX}`);
  console.log('');

  // Build Overpass QL query — fetch all relevant amenity nodes + ways in bbox
  const amenities = 'restaurant|bar|pub|cafe|fast_food|food_court|ice_cream';
  const overpassQuery = `
[out:json][timeout:120];
(
  node["amenity"~"^(${amenities})$"](${BBOX});
  way["amenity"~"^(${amenities})$"](${BBOX});
);
out center body;
`.trim();

  const endpoint = 'https://overpass-api.de/api/interpreter';

  console.log('⏳  Querying Overpass API...');
  console.log('   (This is a single request — may take 10–30 seconds)');
  console.log('');

  const resp = await fetch(endpoint, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    `data=${encodeURIComponent(overpassQuery)}`,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Overpass HTTP ${resp.status}: ${text.slice(0, 300)}`);
  }

  const json = await resp.json();
  const elements = json.elements || [];
  console.log(`   Raw elements from OSM : ${elements.length}`);

  // Map and filter
  const seen   = new Set(); // deduplicate within OSM by name+neighbourhood
  const venues = [];

  for (const el of elements) {
    const venue = mapElement(el);
    if (!venue) continue;

    const key = `${venue.name.toLowerCase().trim()}|${venue.neighbourhood}`;
    if (seen.has(key)) continue;
    seen.add(key);
    venues.push(venue);
  }

  // Sort by neighbourhood then name for a clean output file
  venues.sort((a, b) =>
    a.neighbourhood.localeCompare(b.neighbourhood) ||
    a.name.localeCompare(b.name)
  );

  console.log(`✅  Venues after filtering and dedup : ${venues.length}`);
  console.log('');

  // Neighbourhood breakdown
  const byNb = {};
  for (const v of venues) {
    byNb[v.neighbourhood] = (byNb[v.neighbourhood] || 0) + 1;
  }
  for (const [nb, count] of Object.entries(byNb).sort()) {
    console.log(`   ${nb.padEnd(25)} ${count}`);
  }
  console.log('');

  // Write output
  const outPath = path.join(__dirname, '..', 'data', 'restaurants-osm.js');
  const content = [
    `// AUTO-GENERATED — do not edit manually.`,
    `// Source  : OpenStreetMap via Overpass API (free, no key required)`,
    `// Crawled : ${new Date().toISOString()}`,
    `// Venues  : ${venues.length} across Toronto neighbourhoods`,
    `// Refresh : node scripts/crawl-osm.js`,
    ``,
    `const restaurantsOsm = ${JSON.stringify(venues, null, 2)};`,
    ``,
    `module.exports = restaurantsOsm;`,
    ``,
  ].join('\n');

  // Ensure data/ directory exists
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

  fs.writeFileSync(outPath, content, 'utf8');

  console.log(`💾  Written to data/restaurants-osm.js`);
  console.log('');
  console.log('Next steps:');
  console.log('  git add data/restaurants-osm.js');
  console.log('  git commit -m "data: refresh OSM crawl"');
  console.log('  git push');
  console.log('  → Vercel will auto-deploy with all new venues included.');
  console.log('');
}

crawl().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
