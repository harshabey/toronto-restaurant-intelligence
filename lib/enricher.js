const PRICE_LABELS = { 1: 'budget-friendly', 2: 'mid-range', 3: 'upscale', 4: 'fine dining' };

const CUISINE_MOOD = {
  'French Contemporary': 'refined and quietly theatrical',
  'Middle Eastern': 'warm, social, and a little heady with spice',
  'Canadian Contemporary': 'grounded and proudly local',
  'Northern Thai': 'vibrant, bold, and unapologetically flavourful',
  'Spanish Tapas': 'convivial and generously spirited',
  'Japanese (Aburi)': 'serene, precise, and visually stunning',
  'Canadian Bistro': 'unpretentious and quietly confident',
  'Italian': 'easy-going, warm, and reliably satisfying',
  'Asian-Fusion': 'playful, unexpected, and contemporary',
  'Canadian Wild Game': 'adventurous and distinctly Canadian',
  'Historical Canadian': 'contemplative and genuinely one-of-a-kind',
  'Italian-Californian': 'breezy, natural, and effortlessly cool',
  'Modern French-Jewish': 'personal, soulful, and thoughtfully executed',
  'Spanish-Seafood': 'precise, seasonal, and quietly magnificent',
  'BBQ / American': 'loud, smoke-scented, and deeply satisfying',
  'Italian (Southern)': 'spirited, authentic, and happily rule-bound',
  'Eclectic / Cafe': 'laid-back, curious, and neighbourhood-proud',
  'Gastropub': 'energetic, unpretentious, and genuinely fun',
  'Neapolitan Pizza': 'simple, honest, and absolutely delicious',
  'Korean-Fusion': 'creative, casual, and full of pleasant surprises',
  'French Bistro': 'classically romantic and reassuringly timeless',
  'Asian Fusion / Noodles': 'fast, flavour-forward, and reliably excellent',
  'Wine Bar / Small Plates': 'unhurried, intimate, and wine-forward',
  'Italian Bakery & Cafe': 'artisanal, calm, and warmly scented',
};

function deriveBestFor(restaurant) {
  const { occasions, priceLevel, vibes, tags } = restaurant;
  const bestFor = new Set();

  // Date occasions
  if (occasions.includes('first date')) bestFor.add('first dates');
  if (occasions.includes('first date') && priceLevel <= 2) bestFor.add('low-pressure first dates');
  if (occasions.includes('follow-up date') && priceLevel >= 3) bestFor.add('impressive follow-up dates');
  if (occasions.includes('date') && priceLevel >= 3) bestFor.add('romantic evenings');
  if (occasions.includes('date') && priceLevel <= 2) bestFor.add('casual date nights');
  if ((occasions.includes('date') || occasions.includes('follow-up date')) && vibes.includes('quiet')) bestFor.add('intimate dinners');

  // Celebrations & business
  if (occasions.includes('celebration')) bestFor.add('birthdays & anniversaries');
  if (occasions.includes('celebration') && priceLevel >= 3) bestFor.add('milestone celebrations');
  if (occasions.includes('business') && priceLevel >= 3) bestFor.add('power lunches');
  if (occasions.includes('business')) bestFor.add('client entertaining');

  // Social occasions
  if (occasions.includes('casual dinner') && priceLevel <= 2) bestFor.add('weeknight dinners');
  if (occasions.includes('casual dinner')) bestFor.add('relaxed evenings out');
  if (occasions.includes('catching up')) bestFor.add('catching up with friends');
  if (occasions.includes('small group')) bestFor.add('small group dining (3-5)');
  if (occasions.includes('large group')) bestFor.add('large group dining (6+)');
  if (occasions.includes('family dinner')) bestFor.add('family meals');
  if (occasions.includes('solo')) bestFor.add('solo dining');

  // Vibe-based
  if (vibes.includes('lively')) bestFor.add('fun nights out');
  if (vibes.includes('conversation friendly')) bestFor.add('long conversations');
  if (vibes.includes('music forward')) bestFor.add('music lovers');
  if (vibes.includes('happy hour friendly')) bestFor.add('after-work drinks');
  if (vibes.includes('quiet') && (occasions.includes('date') || occasions.includes('first date'))) bestFor.add('deep conversations');

  // Tag-based
  if (tags && tags.some(t => t.includes('wine'))) bestFor.add('wine enthusiasts');
  if (tags && tags.some(t => t.includes('tasting menu'))) bestFor.add('foodie adventures');
  if (tags && tags.some(t => t.includes('late night'))) bestFor.add('late-night hangs');

  return Array.from(bestFor).slice(0, 4);
}

function deriveVibeDescription(restaurant) {
  const { name, cuisine, neighbourhood, priceLevel, rating, vibes } = restaurant;
  const mood = CUISINE_MOOD[cuisine] || 'distinctive and memorable';
  const priceLabel = PRICE_LABELS[priceLevel] || 'mid-range';
  const ratingNote = rating >= 4.7 ? 'consistently top-rated' : rating >= 4.4 ? 'highly regarded' : 'well-loved';

  // Add vibe qualifier
  let vibeQualifier = '';
  if (vibes.includes('conversation friendly')) vibeQualifier = 'You can actually hear each other here. ';
  else if (vibes.includes('music forward')) vibeQualifier = 'The music is part of the experience. ';
  else if (vibes.includes('happy hour friendly')) vibeQualifier = 'A natural spot to decompress after work. ';

  return `${vibeQualifier}${name} is ${mood} - a ${priceLabel} ${ratingNote} spot in ${neighbourhood} that earns its loyal following meal after meal.`;
}

function derivePeakTimes(restaurant) {
  const { popularity, occasions, vibes } = restaurant;
  const peaks = [];

  if (popularity >= 8) {
    peaks.push('Friday & Saturday 7-9 pm');
    peaks.push('Sunday brunch 11am-1pm');
  } else if (popularity >= 6) {
    peaks.push('Friday & Saturday evenings');
    peaks.push('Wed-Thu dinner');
  } else {
    peaks.push('Weekend evenings');
  }

  if (occasions.includes('business')) peaks.push('Weekday lunch 12-2 pm');
  if (vibes.includes('lively') || vibes.includes('music forward')) peaks.push('Late night Fri-Sat after 10pm');
  if (vibes.includes('happy hour friendly')) peaks.push('Weekday happy hour 5-7 pm');

  return peaks.slice(0, 3);
}

function deriveInsiderTip(restaurant) {
  const { priceLevel, popularity, tags, occasions, cuisine, vibes, name } = restaurant;
  const tips = [];

  if (popularity >= 9) {
    tips.push(`Book ${name} 3-4 weeks out - it fills up fast, especially on weekends.`);
  } else if (popularity >= 7) {
    tips.push(`Weeknight reservations at ${name} are easier to snag and the service tends to be more attentive.`);
  } else {
    tips.push(`${name} is a neighbourhood favourite that rarely shows up on "best of" lists - which is exactly why regulars love it.`);
  }

  if (occasions.includes('large group')) tips.push(`Call ahead for large parties at ${name} - they can seat 6+ but it needs advance notice.`);
  if (occasions.includes('solo') && !occasions.includes('large group')) tips.push(`${name} has excellent bar seating - great for solo dining with a view of the action.`);
  if (occasions.includes('family dinner') && !occasions.includes('large group')) tips.push(`${name} is relaxed enough for families - the menu has something for everyone.`);
  if (occasions.includes('first date') && priceLevel <= 2) tips.push(`Good pick for a first date - low stakes, genuinely good food, easy to focus on the conversation.`);
  if (vibes.includes('music forward')) tips.push(`The playlist at ${name} is curated and consistent - the music sets the mood from the first drink.`);
  if (vibes.includes('happy hour friendly')) tips.push(`The happy hour at ${name} is worth building your evening around - come at 5pm and stay for dinner.`);
  if (tags && tags.includes('tasting menu')) tips.push('The tasting menu is the move - a la carte is fine, but the full experience is transformative.');
  if (tags && tags.some(t => t.includes('wine'))) tips.push('Let the staff guide your wine - they know the list inside out.');
  if (priceLevel <= 2 && popularity >= 7) tips.push('Come early on weekends - the wait can stretch to 45 minutes.');
  if (cuisine.includes('Thai') || cuisine.includes('Korean')) tips.push("Don't be afraid to ask for extra spice - they dial it back for the general crowd.");

  return tips[0] || `${name} rewards repeat visits - the menu evolves constantly and the regulars all have their orders.`;
}

function enrichRestaurant(restaurant) {
  return {
    ...restaurant,
    bestFor: deriveBestFor(restaurant),
    vibeDescription: deriveVibeDescription(restaurant),
    peakTimes: derivePeakTimes(restaurant),
    insiderTip: deriveInsiderTip(restaurant),
  };
}

function enrichAll(restaurants) {
  return restaurants.map(enrichRestaurant);
}

module.exports = { enrichRestaurant, enrichAll };
