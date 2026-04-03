function dayMultiplier(day) {
  const d = (day || '').toLowerCase();
  const map = { monday:0.55, tuesday:0.60, wednesday:0.75, thursday:0.85, friday:1.00, saturday:1.00, sunday:0.80 };
  return map[d] ?? 0.70;
}

function timeMultiplier(time) {
  if (!time) return 0.75;
  let hour;
  if (typeof time === 'number') { hour = time; }
  else {
    const str = time.toString().trim().toUpperCase();
    const pmMatch = str.match(/(\d{1,2})(?::(\d{2}))?\s*PM/);
    const amMatch = str.match(/(\d{1,2})(?::(\d{2}))?\s*AM/);
    const h24Match = str.match(/^(\d{1,2})(?::(\d{2}))?$/);
    if (pmMatch) { hour = parseInt(pmMatch[1], 10); if (hour !== 12) hour += 12; }
    else if (amMatch) { hour = parseInt(amMatch[1], 10); if (hour === 12) hour = 0; }
    else if (h24Match) { hour = parseInt(h24Match[1], 10); }
    else { hour = 19; }
  }
  if (hour >= 7 && hour < 10) return 0.30;
  if (hour >= 10 && hour < 12) return 0.45;
  if (hour >= 12 && hour < 14) return 0.75;
  if (hour >= 14 && hour < 17) return 0.40;
  if (hour >= 17 && hour < 18) return 0.60;
  if (hour >= 18 && hour < 20) return 0.95;
  if (hour >= 20 && hour < 22) return 0.85;
  if (hour >= 22 && hour < 24) return 0.65;
  return 0.20;
}

function getBusyness(restaurant, day, time) {
  const { popularity } = restaurant;
  const dayMult = dayMultiplier(day);
  const timeMult = timeMultiplier(time);
  const idHash = restaurant.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const jitter = ((idHash % 20) - 10) / 100;
  const raw = popularity * dayMult * timeMult + jitter * popularity;
  const score = Math.min(10, Math.max(0, parseFloat(raw.toFixed(1))));
  const percentFull = Math.round(score * 10);
  let label, color, waitEstimate;
  if (score < 2.5) { label='Quiet'; color='green'; waitEstimate='No wait'; }
  else if (score < 4.5) { label='Moderate'; color='yellow'; waitEstimate='5-10 min'; }
  else if (score < 6.5) { label='Busy'; color='orange'; waitEstimate='15-25 min'; }
  else if (score < 8.5) { label='Very Busy'; color='red'; waitEstimate='30-45 min'; }
  else { label='Packed'; color='red'; waitEstimate='45+ min'; }
  return { score, label, color, waitEstimate, percentFull };
}

module.exports = { getBusyness };
