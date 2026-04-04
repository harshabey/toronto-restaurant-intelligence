/**
 * TTC transit proximity — subway stations and streetcar routes.
 * Uses Haversine distance to find nearest options for each venue.
 */

const SUBWAY_STATIONS = [
  // Line 1 Yonge (south to north)
  { name: 'Union Station',         line: 'Line 1 (Yonge)',        lat: 43.6453, lng: -79.3806 },
  { name: 'King Station',           line: 'Line 1 (Yonge)',        lat: 43.6489, lng: -79.3784 },
  { name: 'Queen Station',          line: 'Line 1 (Yonge)',        lat: 43.6526, lng: -79.3797 },
  { name: 'Dundas Station',         line: 'Line 1 (Yonge)',        lat: 43.6555, lng: -79.3810 },
  { name: 'College Station',        line: 'Line 1 (Yonge)',        lat: 43.6598, lng: -79.3828 },
  { name: 'Wellesley Station',      line: 'Line 1 (Yonge)',        lat: 43.6647, lng: -79.3838 },
  { name: 'Bloor-Yonge Station',    line: 'Line 1/2 Interchange',  lat: 43.6711, lng: -79.3862 },
  { name: 'Rosedale Station',       line: 'Line 1 (Yonge)',        lat: 43.6774, lng: -79.3871 },
  { name: 'Summerhill Station',     line: 'Line 1 (Yonge)',        lat: 43.6853, lng: -79.3879 },
  { name: 'St. Clair Station',      line: 'Line 1 (Yonge)',        lat: 43.6882, lng: -79.3887 },
  // Line 1 University (south to north)
  { name: 'Osgoode Station',        line: 'Line 1 (University)',   lat: 43.6503, lng: -79.3869 },
  { name: 'St. Patrick Station',    line: 'Line 1 (University)',   lat: 43.6544, lng: -79.3879 },
  { name: "Queen's Park Station",   line: 'Line 1 (University)',   lat: 43.6583, lng: -79.3895 },
  { name: 'Museum Station',         line: 'Line 1 (University)',   lat: 43.6660, lng: -79.3939 },
  { name: 'St. George Station',     line: 'Line 1/2 Interchange',  lat: 43.6687, lng: -79.3996 },
  { name: 'Spadina Station',        line: 'Line 1 (University)',   lat: 43.6670, lng: -79.4034 },
  { name: 'Dupont Station',         line: 'Line 1 (University)',   lat: 43.6748, lng: -79.4069 },
  { name: 'St. Clair West Station', line: 'Line 1 (University)',   lat: 43.6829, lng: -79.4144 },
  // Line 2 Bloor-Danforth (west to east)
  { name: 'Dundas West Station',    line: 'Line 2 (Bloor-Danforth)', lat: 43.6540, lng: -79.4542 },
  { name: 'Lansdowne Station',      line: 'Line 2 (Bloor-Danforth)', lat: 43.6562, lng: -79.4441 },
  { name: 'Dufferin Station',       line: 'Line 2 (Bloor-Danforth)', lat: 43.6607, lng: -79.4340 },
  { name: 'Ossington Station',      line: 'Line 2 (Bloor-Danforth)', lat: 43.6655, lng: -79.4218 },
  { name: 'Christie Station',       line: 'Line 2 (Bloor-Danforth)', lat: 43.6655, lng: -79.4122 },
  { name: 'Bathurst Station',       line: 'Line 2 (Bloor-Danforth)', lat: 43.6686, lng: -79.4112 },
  { name: 'Bay Station',            line: 'Line 2 (Bloor-Danforth)', lat: 43.6703, lng: -79.3894 },
  { name: 'Sherbourne Station',     line: 'Line 2 (Bloor-Danforth)', lat: 43.6696, lng: -79.3740 },
  { name: 'Broadview Station',      line: 'Line 2 (Bloor-Danforth)', lat: 43.6763, lng: -79.3584 },
  { name: 'Pape Station',           line: 'Line 2 (Bloor-Danforth)', lat: 43.6773, lng: -79.3392 },
  { name: 'Coxwell Station',        line: 'Line 2 (Bloor-Danforth)', lat: 43.6786, lng: -79.3132 },
  { name: 'Victoria Park Station',  line: 'Line 2 (Bloor-Danforth)', lat: 43.6924, lng: -79.2792 },
];

const STREETCAR_CORRIDORS = [
  // 501 Queen
  { route: '501 Queen',    lat: 43.6494, lng: -79.4013 },
  { route: '501 Queen',    lat: 43.6466, lng: -79.4121 },
  { route: '501 Queen',    lat: 43.6447, lng: -79.4260 },
  { route: '501 Queen',    lat: 43.6418, lng: -79.4436 },
  { route: '501 Queen',    lat: 43.6503, lng: -79.3638 },
  // 504 King
  { route: '504 King',     lat: 43.6454, lng: -79.3993 },
  { route: '504 King',     lat: 43.6437, lng: -79.4107 },
  { route: '504 King',     lat: 43.6384, lng: -79.4320 },
  { route: '504 King',     lat: 43.6512, lng: -79.3654 },
  // 505 Dundas
  { route: '505 Dundas',   lat: 43.6537, lng: -79.4005 },
  { route: '505 Dundas',   lat: 43.6525, lng: -79.4106 },
  { route: '505 Dundas',   lat: 43.6527, lng: -79.4244 },
  // 506 Carlton
  { route: '506 Carlton',  lat: 43.6556, lng: -79.4011 },
  { route: '506 Carlton',  lat: 43.6557, lng: -79.4103 },
  { route: '506 Carlton',  lat: 43.6570, lng: -79.3645 },
  // 510 Spadina
  { route: '510 Spadina',  lat: 43.6454, lng: -79.3993 },
  { route: '510 Spadina',  lat: 43.6537, lng: -79.4005 },
  { route: '510 Spadina',  lat: 43.6672, lng: -79.4037 },
  // 511 Bathurst
  { route: '511 Bathurst', lat: 43.6437, lng: -79.4107 },
  { route: '511 Bathurst', lat: 43.6525, lng: -79.4106 },
  { route: '511 Bathurst', lat: 43.6584, lng: -79.4112 },
];

function haversineMetres(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getNearestTransit(coordinates) {
  if (!coordinates || !coordinates.lat) return { subway: [], streetcar: [] };
  const { lat, lng } = coordinates;

  // Nearest subway stations (top 2)
  const subway = SUBWAY_STATIONS
    .map(s => ({ ...s, distanceM: Math.round(haversineMetres(lat, lng, s.lat, s.lng)) }))
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, 2)
    .map(s => ({
      name: s.name,
      line: s.line,
      distanceM: s.distanceM,
      walkMinutes: Math.max(1, Math.round(s.distanceM / 80)),
    }));

  // Nearest streetcar routes within 350m (deduplicated by route)
  const seen = new Set();
  const streetcar = [];
  STREETCAR_CORRIDORS
    .map(s => ({ ...s, distanceM: Math.round(haversineMetres(lat, lng, s.lat, s.lng)) }))
    .sort((a, b) => a.distanceM - b.distanceM)
    .forEach(s => {
      if (s.distanceM <= 350 && !seen.has(s.route) && streetcar.length < 2) {
        seen.add(s.route);
        streetcar.push({ route: s.route, distanceM: s.distanceM, walkMinutes: Math.max(1, Math.round(s.distanceM / 80)) });
      }
    });

  return { subway, streetcar };
}

module.exports = { getNearestTransit };
