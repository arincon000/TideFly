export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  const { email, home_airport, spot_id, min_wave_m, max_wind_kmh, max_price_eur, min_nights, max_nights } = req.body || {};
  if (!email || !home_airport || !spot_id) return res.status(400).send('Missing fields');

  const base = process.env.SUPABASE_URL + '/rest/v1';
  const headers = {
    'apikey': process.env.SUPABASE_SERVICE_KEY,
    'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates,return=representation'
  };

  // Upsert user by email
  let u = await fetch(`${base}/users?email=eq.${encodeURIComponent(email)}`, { headers });
  let users = await u.json(); let user = users[0];
  if (!user) {
    const ins = await fetch(`${base}/users`, { method:'POST', headers, body: JSON.stringify([{ email, home_airport }]) });
    const data = await ins.json(); user = data[0];
  } else if (user.home_airport !== home_airport) {
    await fetch(`${base}/users`, { method:'POST', headers, body: JSON.stringify([{ id:user.id, email, home_airport }]) });
  }

  // Insert preference
  const pref = {
    user_id: user.id, spot_id,
    min_wave_m: min_wave_m ?? 1.5, max_wind_kmh: max_wind_kmh ?? 15,
    max_price_eur: max_price_eur ?? 100, min_nights: min_nights ?? 2, max_nights: max_nights ?? 5,
    is_active: true
  };
  const r = await fetch(`${base}/user_spot_prefs`, { method:'POST', headers, body: JSON.stringify([pref]) });
  if (!r.ok) return res.status(500).send(await r.text());
  const data = await r.json();
  res.status(200).json(data[0]);
}
