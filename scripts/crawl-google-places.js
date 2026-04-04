#!/usr/bin/env node
/**
 * scripts/crawl-google-places.js
 *
 * Crawls the Google Places API (New) for Toronto restaurants, bars, and cafes
 * across all 17 supported neighbourhoods and writes the results to
 * data/restaurants-google.js, which the app loads automatically.
 *
 * ─── Setup (one-time) ────────────────────────────────────────────────────────
 *  1. Go to https://console.cloud.google.com
 *  2. Create a project (or use an existing one)
 *  3. Enable "Places API (New)" under APIs & Services > Library
 *  4. Create an API key: APIs & Services > Credentials > Create Credentials
 *  5. (Recommended) Restrict the key to "Places API (New)" only
 *  6. Copy the key
 *
 * ─── Run ─────────────────────────────────────────────────────────────────────
 *  GOOGLE_PLACES_API_KEY=AIza... node scripts/crawl-google-places.js
 *
 * ─── After running ───────────────────────────────────────────────────────────
 *  git add data/restaurants-google.js
 *  git commit -m "data: refresh Google Places crawl"
 *  git push
 *  → Vercel auto-deploys with the new venues included
 *
 * ─── Cost ────────────────────────────────────────────────────────────────────
 *  Google gives $200/month free credit.
 *  Text Search (New): ~$0.032 per request.
 *  A full crawl (17 neighbourhoods x 3 terms x up to 3 pages) = ~150 calls = ~$4.80.
 *  Re-run monthly to stay fresh — still well within the free tier.
 *
 * ─── Node version ────────────────────────────────────────────────────────────
 *  Requires Node 18+ (uses built-in fetch). Run `node -v` to check.
 */

'use strict';
const fs   = require('fs');
const path = require('path');

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) {
  console.error('\n❌  Missing GOOGLE_PLACES_API_KEY\n');
  console.error('   Usage: GOOGLE_PLACES_API_KEY=AIza... node scripts/crawl-google-places.js\n');
  process.exit(1);
}

// ─── Config ──────────────────────────────────────────────────────────────────

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

// Three passes per neighbourhood to capture restaurants, bars, and cafes
const SEARCH_TERMS = [
  'restaurants',
  'bars and cocktail bars',
  'cafes and coffee shops',
];

// Fields we request — only pay for what we use
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.types',
  'places.regularOpeningHours',
  'places.primaryTypeDisplayName',
  'places.businessStatus',
].join(',');

// Only keep operational venues with enough reviews to be meaningful
const MIN_REVIEWS = 20;

// ─── Type mapping ─────────────────────────────────────────────────────────────

const TYPE_TO_CUISINE = {
  italian_restaurant:      'Italian',
  japanese_restaurant:     'Japanese',
  sushi_restaurant:        'Japanese',
  ramen_restaurant:        'Japanese',
  korean_restaurant:       'Korean',
  mexican_restaurant:      'Mexican',
  mediterranean_restaurant:'Mediterranean',
  greek_restaurant:        'Mediterranean',
  middle_eastern_restaurant:'Middle Eastern',
  indian_restaurant:       'Indian',
  thai_restaurant:         'Thai',
  vietnamese_restaurant:   'Vietnamese',
  chinese_restaurant:      'Chinese',
  american_restaurant:     'American',
  hamburger_restaurant:    'American',
  french_restaurant:       'French',
  spanish_restaurant:      'Spanish',
  seafood_restaurant:      'Seafood',
  steak_house:             'Steakhouse',
  pizza_restaurant:        'Pizza',
  barbecue_restaurant:     'BBQ',
  tapas_bar:               'Tapas',
  brunch_restaurant:       'Brunch & Breakfast',
  breakfast_restaurant:    'Brunch & Breakfast',
  cafe:                    'Coffee & Cafe',
  coffee_shop:             'Coffee & Cafe',
  bar:                     'Bar',
  pub:                     'Bar',
  wine_bar:                'Wine Bar',
  gastropub:               'Gastropub',
  vegan_restaurant:        'Vegan/Vegetarian',
  vegetarian_restaurant:   'Vegan/Vegetarian',
  asian_restaurant:        'Asian Fusion',
  canadian_restaurant:     'Canadian',
};

const PRICE_LEVEL_MAP = {
  PRICE_LEVEL_FREE:            1,
  PRICE_LEVEL_INEXPENSIVE:     1,
  PRICE_LEVEL_MODERATE:        2,
  PRICE_LEVEL_EXPENSIVE:       3,
  PRICE_LEVEL_VERY_EXPENSIVE:  4,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function searchPlaces(query, neighbourhood, pageToken = null) {
  const body = {
    textQuery: `${query} in ${neighbourhood.name} Toronto Ontario`,
    maxResultCount: 20,
    locationBias: {
      circle: {
        center: { latitude: neighbourhood.lat, longitude: neighbourhood.lng },
        radius: 800, // tight 800m radius keeps results truly in the neighbourhood
      },
    },
  };
  if (pageToken) body.pageToken = pageToken;

  const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${text.slice(0, 200)}`);
  }
  return resp.json();
}

function parseHours(regularOpeningHours) {
  if (!regularOpeningHours || !regularOpeningHours.periods) {
    return { openHour: 11, closeHour: 23 };
  }
  // Use the first available period as representative (covers 24/7 venues too)
  const period = regularOpeningHours.periods[0];
  if (!period) return { openHour: 11, closeHour: 23 };

  const openHour  = period.open?.hour  ?? 11;
  let   closeHour = period.close?.hour ?? 23;

  // Wrap: if close is before open (midnight crosser), add 24
  if (closeHour !== 0 && closeHour < openHour) closeHour += 24;
  // 0 = midnight = 24
  if (closeHour === 0) closeHour = 24;

  return { openHour, closeHour };
}

function mapPlace(place, neighbourhood) {
  const types  = place.types || [];
  const isBar  = types.some(t => ['bar', 'pub', 'night_club', 'cocktail_bar', 'wine_bar', 'tapas_bar'].includes(t));
  const isCafe = types.some(t => ['cafe', 'coffee_shop'].includes(t));

  const cuisineCategories = [...new Set(
    types.map(t => TYPE_TO_CUISINE[t]).filter(Boolean)
  )];
  if (!cuisineCategories.length) {
    cuisineCategories.push(isBar ? 'Bar' : isCafe ? 'Coffee & Cafe' : 'Canadian');
  }

  const priceLevel = PRICE_LEVEL_MAP[place.priceLevel] || 2;

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

  const { openHour, closeHour } = parseHours(place.regularOpeningHours);
  const lateNight = isBar || closeHour >= 25;

  const reviewCount = place.userRatingCount || 0;
  const popularity  = Math.min(10, Math.max(1, Math.round(Math.log(reviewCount + 1) * 1.8)));

  const displayName = place.displayName?.text || 'Unknown Venue';
  const cuisine     = place.primaryTypeDisplayName?.text ||
                      (isCafe ? 'Cafe' : isBar ? 'Bar' : 'Restaurant');

  return {
    id:               `google_${place.id}`,
    name:             displayName,
    neighbourhood:    neighbourhood.name,
    address:          place.formattedAddress || '',
    cuisine,
    cuisineCategories,
    priceLevel,
    rating:           place.rating || 4.0,
    reviewCount,
    popularity,
    vibes,
    occasions,
    tags:             types.slice(0, 6).map(t => t.replace(/_/g, ' ')),
    googleReviews:    [],
    coordinates:      {
      lat: place.location?.latitude  || neighbourhood.lat,
      lng: place.location?.longitude || neighbourhood.lng,
    },
    openHour,
    closeHour,
    lateNight,
    isBar,
    isCafe,
    source:           'google',
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function crawl() {
  console.log('');
  console.log('🍴  Toronto Table — Google Places Crawl');
  console.log('======================================');
  console.log(`Neighbourhoods : ${NEIGHBOURHOODS.length}`);
  console.log(`Terms          : ${SEARCH_TERMS.length} per neighbourhood`);
  console.log(`Min reviews    : ${MIN_REVIEWS}`);
  console.log('');

  const seen   = new Set(); // deduplicate by Google place_id
  const venues = [];
  let   calls  = 0;

  for (const neighbourhood of NEIGHBOURHOODS) {
    process.stdout.write(`\n📍 ${neighbourhood.name}\n`);

    for (const term of SEARCH_TERMS) {
      let pageToken = null;
      let page      = 0;

      do {
        try {
          await sleep(pageToken ? 2000 : 200); // Google requires 2s delay before using pageToken
          const data = await searchPlaces(term, neighbourhood, pageToken);
          calls++;

          const places  = data.places || [];
          let   newCount = 0;

          for (const place of places) {
            // Skip: no ID, already seen, not operational, too few reviews
            if (!place.id)                             continue;
            if (seen.has(place.id))                    continue;
            if (place.businessStatus && place.businessStatus !== 'OPERATIONAL') continue;
            if ((place.userRatingCount || 0) < MIN_REVIEWS) continue;

            seen.add(place.id);
            venues.push(mapPlace(place, neighbourhood));
            newCount++;
          }

          process.stdout.write(
            `  [✓] ${term.padEnd(28)} page ${page + 1}  →  ${places.length} results, ${newCount} new\n`
          );

          pageToken = data.nextPageToken || null;
          page++;
        } catch (err) {
          process.stdout.write(`  [✗] ${term}: ${err.message}\n`);
          pageToken = null;
        }
      } while (pageToken && page < 3); // max 3 pages = 60 results per term per neighbourhood
    }
  }

  const estimatedCost = (calls * 0.032).toFixed(2);

  console.log('');
  console.log('─'.repeat(42));
  console.log(`✅  Done`);
  console.log(`   Venues found : ${venues.length}`);
  console.log(`   API calls    : ${calls}`);
  console.log(`   Est. cost    : ~$${estimatedCost} USD (likely $0 within free tier)`);
  console.log('');

  // Sort by review count descending so highest-quality venues appear first
  venues.sort((a, b) => b.reviewCount - a.reviewCount);

  // Write output file
  const outPath = path.join(__dirname, '..', 'data', 'restaurants-google.js');
  const content = [
    `// AUTO-GENERATED — do not edit manually.`,
    `// Source  : Google Places API (New) — Text Search`,
    `// Crawled : ${new Date().toISOString()}`,
    `// Venues  : ${venues.length} across ${NEIGHBOURHOODS.length} Toronto neighbourhoods`,
    `// Refresh : GOOGLE_PLACES_API_KEY=... node scripts/crawl-google-places.js`,
    ``,
    `const restaurantsGoogle = ${JSON.stringify(venues, null, 2)};`,
    ``,
    `module.exports = restaurantsGoogle;`,
    ``,
  ].join('\n');

  fs.writeFileSync(outPath, content, 'utf8');

  console.log(`💾  Written to data/restaurants-google.js`);
  console.log('');
  console.log('Next steps:');
  console.log('  git add data/restaurants-google.js');
  console.log('  git commit -m "data: refresh Google Places crawl"');
  console.log('  git push');
  console.log('  → Vercel will auto-deploy with all new venues included.');
  console.log('');
}

crawl().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
