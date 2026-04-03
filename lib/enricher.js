const PRICE_LABELS = { 1:'budget-friendly', 2:'mid-range', 3:'upscale', 4:'fine dining' };
const CUISINE_MOOD = {
  'French Contemporary':'refined and quietly theatrical',
  'Middle Eastern':'warm, social, and a little heady with spice',
  'Canadian Contemporary':'grounded and proudly local',
  'Northern Thai':'vibrant, bold, and unapologetically flavourful',
  'Spanish Tapas':'convivial and generously spirited',
  'Japanese (Aburi)':'serene, precise, and visually stunning',
  'Canadian Bistro':'unpretentious and quietly confident',
  'Italian':'easy-going, warm, and reliably satisfying',
  'Asian-Fusion':'playful, unexpected, and contemporary',
  'Canadian Wild Game':'adventurous and distinctly Canadian',
  'Historical Canadian':'contemplative and genuinely one-of-a-kind',
  'Italian-Californian':'breezy, natural, and effortlessly cool',
  'Modern French-Jewish':'personal, soulful, and thoughtfully executed',
  'Spanish-Seafood':'precise, seasonal, and quietly magnificent',
  'BBQ / American':'loud, smoke-scented, and deeply satisfying',
  'Italian (Southern)':'spirited, authentic, and happily rule-bound',
  'Eclectic / Cafe':'laid-back, curious, and neighbourhood-proud',
  'Gastropub':'energetic, unpretentious, and genuinely fun',
  'Neapolitan Pizza':'simple, honest, and absolutely delicious',
  'Korean-Fusion':'creative, casual, and full of pleasant surprises',
  'French Bistro':'classically romantic and reassuringly timeless',
  'Asian Fusion / Noodles':'fast, flavour-forward, and reliably excellent',
  'Wine Bar / Small Plates':'unhurried, intimate, and wine-forward',
  'Italian Bakery & Cafe':'artisanal, calm, and warmly scented',
};

function deriveBestFor(restaurant) {
  const { occasions, priceLevel, vibes, tags } = restaurant;
  const bestFor = new Set();
  if (occasions.includes('date') && priceLevel >= 3) bestFor.add('romantic evenings');
  if (occasions.includes('date') && priceLevel <= 2) bestFor.add('casual first dates');
  if (occasions.includes('date') && vibes.includes('quiet')) bestFor.add('intimate dinners');
  if (occasions.includes('celebration')) bestFor.add('birthdays & anniversaries');
  if (occasions.includes('celebration') && priceLevel >= 3) bestFor.add('milestone celebrations');
  if (occasions.includes('business') && priceLevel >= 3) bestFor.add('power lunches');
  if (occasions.includes('business')) bestFor.add('client entertaining');
  if (occasions.includes('casual dinner') && priceLevel <= 2) bestFor.add('weeknight dinners');
  if (occasions.includes('casual dinner')) bestFor.add('friend group dinners');
  if (vibes.includes('lively')) bestFor.add('fun nights out');
  if (vibes.includes('quiet') && occasions.includes('date')) bestFor.add('deep conversations');
  if (tags && tags.some(t => t.includes('wine'))) bestFor.add('wine lovers');
  if (tags && tags.some(t => t.includes('tasting menu'))) bestFor.add('foodie adventures');
  if (tags && tags.some(t => t.includes('late night'))) bestFor.add('late-night hangs');
  return Array.from(bestFor).slice(0, 4);
}

function deriveVibeDescription(restaurant) {
  const { name, cuisine, neighbourhood, priceLevel, rating } = restaurant;
  const mood = CUISINE_MOOD[cuisine] || 'distinctive and memorable';
  const priceLabel = PRICE_LABELS[priceLevel] || 'mid-range';
  const ratingNote = rating >= 4.7 ? 'consistently top-rated' : rating >= 4.4 ? 'highly regarded' : 'well-loved';
  return `${name} is ${mood} - a ${priceLabel} ${ratingNote} spot in ${neighbourhood} that earns its loyal following meal after meal.`;
}

function derivePeakTimes(restaurant) {
  const { popularity, occasions, vibes } = restaurant;
  const peaks = [];
  if (popularity >= 8) { peaks.push('Friday & Saturday 7-9 pm'); peaks.push('Sunday brunch 11am-1pm'); }
  else if (popularity >= 6) { peaks.push('Friday & Saturday evenings'); peaks.push('Wed-Thu dinner'); }
  else { peaks.push('Weekend evenings'); }
  if (occasions.includes('business')) peaks.push('Weekday lunch 12-2 pm');
  if (vibes.includes('lively')) peaks.push('Late night Fri-Sat after 10pm');
  return peaks.slice(0, 3);
}

function deriveInsiderTip(restaurant) {
  const { priceLevel, popularity, tags, occasions, cuisine, name } = restaurant;
  const tips = [];
  if (popularity >= 9) tips.push(`Book ${name} 3-4 weeks out - it fills up fast, especially on weekends.`);
  else if (popularity >= 7) tips.push(`Weeknight reservations at ${name} are easier to snag and the service tends to be more attentive.`);
  else tips.push(`${name} is a neighbourhood favourite that rarely shows up on "best of" lists - which is exactly why regulars love it.`);
  if (tags && tags.includes('tasting menu')) tips.push('The tasting menu is the move - a la carte is fine, but the full experience is transformative.');
  if (tags && tags.some(t => t.includes('wine'))) tips.push('Let the sommelier or staff guide your wine - they know the list inside out.');
  if (priceLevel <= 2 && popularity >= 7) tips.push('Come early on weekends - the wait can stretch to 45 minutes.');
  if (cuisine.includes('Thai') || cuisine.includes('Korean')) tips.push("Don't be afraid to ask for extra spice - they dial it back for the general crowd.");
  return tips[0] || `${name} rewards repeat visits - the menu evolves constantly and the regulars all have their orders.`;
}

function enrichRestaurant(restaurant) {
  return { ...restaurant, bestFor: deriveBestFor(restaurant), vibeDescription: deriveVibeDescription(restaurant), peakTimes: derivePeakTimes(restaurant), insiderTip: deriveInsiderTip(restaurant) };
}

function enrichAll(restaurants) { return restaurants.map(enrichRestaurant); }

module.exports = { enrichRestaurant, enrichAll };
