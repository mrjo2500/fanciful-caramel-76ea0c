export default async (req) => {
  const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers });
  const key = process.env.TIKTOOL_API_KEY;
  if (!key) return new Response(JSON.stringify({ error: 'Server API key is not configured' }), { status: 500, headers });
  try {
    const body = await req.json();
    const username = String(body.username || '').replace(/^@/, '').trim();
    if (!username) return new Response(JSON.stringify({ error: 'username required' }), { status: 400, headers });
    const r = await fetch('https://api.tik.tools/authentication/jwt?apiKey=' + encodeURIComponent(key), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ allowed_creators: [username], expire_after: 3600, max_websockets: 1 })
    });
    const data = await r.json();
    if (!r.ok || !data?.data?.token) return new Response(JSON.stringify({ error: 'JWT mint failed', details: data }), { status: 502, headers });
    return new Response(JSON.stringify({ token: data.data.token, username }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Bad request', message: String(e?.message || e) }), { status: 400, headers });
  }
};
