/**
 * Yelp Fusion API integration (optional real-data layer).
 *
 * Setup:
 *   1. Get a free API key at https://www.yelp.com/developers/v3/manage_app
 *   2. Add YELP_API_KEY to Vercel environment variables
 *   3. Redeploy — the app will automatically use real Yelp data
 *
 * Without YELP_API_KEY the app falls back to mock data seamlessly.
 */

const YELP_BASE = 'https://api.yelp.com/v3';

function hasYelpKey() {
  return !!(process.env.YELP_API_KEY);
}

async function searchYelp({ location, term, limit = 50 }) {
  const key = process.env.YELP_API_KEY;
  if (!key) return null;

  const params = new URLSearchParams({
    location: `${location}, Toronto, ON, Canada`,
    categories: 'restaurants,bars,cafes',
    limit: String(Math.min(50, limit)),
    sort_by: 'rating',
    radius: '2000',
  });
  if (term) params.set('term', term);

  try {
    const resp = await fetch(`${YELP_BASE}/businesses/search?${params}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.businesses || [];
  } catch {
    return null;
  }
}

const CAT_TO_CUISINE = {
  italian: 'Italian', japanese: 'Japanese', sushi: 'Japanese', korean: 'Korean',
  mexican: 'Mexican', mediterranean: 'Mediterranean', mideastern: 'Middle Eastern',
  indpak: 'Indian', thai: 'Thai', vietnamese: 'Vietnamese', chinese: 'Chinese',
  burgers: 'American', american: 'American', canadian: 'Canadian', french: 'French',
  spanish: 'Spanish', greek: 'Greek', seafood: 'Seafood', steak: 'Steakhouse',
  pizza: 'Pizza', bbq: 'BBQ', asianfusion: 'Asian Fusion',
  breakfast_brunch: 'Brunch & Breakfast', cafes: 'Coffee & Cafe', coffee: 'Coffee & Cafe',
  bars: 'Bar', cocktailbars: 'Cocktail Bar', beerbar: 'Bar',
  tapas: 'Tapas', wine_bars: 'Wine Bar', gastropubs: 'Gastropub',
  ramen: 'Japanese', vegan: 'Vegan/Vegetarian',
};

function mapYelpBusiness(biz, neighbourhood) {
  const cats = biz.categories || [];
  const aliases = cats.map(c => c.alias);
  const isBar = aliases.some(a => ['bars', 'cocktailbars', 'beerbar', 'wine_bars'].includes(a));
  const isCafe = aliases.some(a => ['cafes', 'coffee'].includes(a));
  const priceLevel = biz.price ? biz.price.length : 2;
  const cuisineCategories = [...new Set(aliases.map(a => CAT_TO_CUISINE[a]).filter(Boolean))];

  const vibes = [];
  if (priceLevel >= 3) vibes.push('upscale');
  if (isBar) vibes.push('lively', 'happy hour friendly');
  if (isCafe) vibes.push('quiet');
  if (!vibes.length) vibes.push('trendy');

  const occasions = ['casual dinner'];
  if (!isBar && !isCafe) occasions.push('date', 'small group');
  if (isBar) occasions.push('catching up');
  if (isCafe) occasions.push('coffee', 'breakfast');
  if (priceLevel >= 3) occasions.push('business', 'celebration');

  return {
    id: biz.id,
    name: biz.name,
    neighbourhood: neighbourhood || biz.location?.city || 'Toronto',
    address: (biz.location?.display_address || []).join(', '),
    cuisine: cats[0]?.title || 'Various',
    cuisineCategories: cuisineCategories.length ? cuisineCategories : ['Various'],
    priceLevel,
    rating: biz.rating || 4.0,
    reviewCount: biz.review_count || 0,
    popularity: Math.min(10, Math.max(1, Math.round(Math.log(biz.review_count + 1) * 2))),
    vibes,
    occasions,
    tags: cats.map(c => c.title),
    googleReviews: [],
    coordinates: biz.coordinates || {},
    yelpUrl: biz.url,
    imageUrl: biz.image_url,
    openHour: 11, closeHour: isBar ? 25 : 22,
    lateNight: isBar,
    isBar,
    isCafe,
  };
}

module.exports = { hasYelpKey, searchYelp, mapYelpBusiness };
