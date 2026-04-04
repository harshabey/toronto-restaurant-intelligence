/**
 * GET   /api/tips?venueId=bar-hop                              — returns { tips: [] }
 * POST  /api/tips  { venueId, venueName, tipText, occasion }   — submit a new tip
 * PATCH /api/tips  { tipId }                                   — mark a tip as helpful
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

  // ── GET: fetch tips for a venue ────────────────────────────────────────
  if (req.method === 'GET') {
    const { venueId } = req.query;
    if (!venueId) return res.status(400).json({ error: 'venueId required' });

    const { data, error } = await sb
      .from('venue_tips')
      .select('id, tip_text, occasion, helpful_count, created_at')
      .eq('venue_id', venueId)
      .eq('approved', true)
      .order('helpful_count', { ascending: false })
      .order('created_at',    { ascending: false })
      .limit(8);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ tips: data || [] });
  }

  // ── POST: submit a new tip ──────────────────────────────────────────
  if (req.method === 'POST') {
    const { venueId, venueName, tipText, occasion } = req.body || {};
    if (!venueId)  return res.status(400).json({ error: 'venueId required' });
    if (!tipText)  return res.status(400).json({ error: 'tipText required' });
    if (tipText.trim().length < 10)  return res.status(400).json({ error: 'Tip must be at least 10 characters.' });
    if (tipText.trim().length > 280) return res.status(400).json({ error: 'Tip must be under 280 characters.' });

    const { error } = await sb.from('venue_tips').insert({
      venue_id:     venueId,
      venue_name:   venueName || venueId,
      tip_text:     tipText.trim(),
      occasion:     occasion || null,
      helpful_count: 0,
      approved:     true,   // set to false if you want manual moderation
    });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ success: true });
  }

  // ── PATCH: mark a tip as helpful ───────────────────────────────────
  if (req.method === 'PATCH') {
    const { tipId } = req.body || {};
    if (!tipId) return res.status(400).json({ error: 'tipId required' });

    const { error } = await sb.rpc('increment_tip_helpful', { tip_id: tipId });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
