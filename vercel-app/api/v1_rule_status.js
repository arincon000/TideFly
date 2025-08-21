export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
  const { rule_id } = req.query || {};
  let url = process.env.SUPABASE_URL + '/rest/v1/api.v1_rule_status';
  if (rule_id) url += `?rule_id=eq.${encodeURIComponent(rule_id)}`;
  const r = await fetch(url, { headers: {
    'apikey': process.env.SUPABASE_SERVICE_KEY,
    'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_KEY
  }});
  const data = await r.json();
  res.status(200).json(data);
}
