/**
 * GET  /api/votes?venueId=bar-hop        — returns { count: number }
 * POST /api/votes  { venueId, venueName, occasion } — records a thumbs-up
 */
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export default async function handler(req, res) {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Community features not yet configured.' });

  if (req.method === 'GET') {
    const { venueId } = req.query;
    if (!venueId) return res.status(400).json({ error: 'venueId required' });

    const { count, error } = await sb
      .from('venue_votes')
      .select('*', { count: 'exact', head: true })
      .eq('venue_id', venueId);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ count: count || 0 });
  }

  if (req.method === 'POST') {
    const { venueId, venueName, occasion } = req.body || {};
    if (!venueId) return res.status(400).json({ error: 'venueId required' });

    const { error } = await sb.from('venue_votes').insert({
      venue_id:   venueId,
      venue_name: venueName || venueId,
      occasion:   occasion  || null,
    });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
