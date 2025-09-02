import { supabase } from '../../lib/supabase/server.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data, error } = await supabase
      .from('api.v1_spots')
      .select('*');

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching spots:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
