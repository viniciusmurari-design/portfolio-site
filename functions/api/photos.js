// Cloudflare Pages Function: list photos from Cloudinary for a given category
// GET /api/photos?category=wedding

const VALID = new Set([
  'wedding', 'portrait', 'food', 'family', 'events',
  'product', 'hotels', 'corporate', 'architecture', 'hero'
]);

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

export async function onRequestGet({ request, env }) {
  const cat = new URL(request.url).searchParams.get('category');
  if (!VALID.has(cat)) {
    return Response.json({ error: 'Invalid category' }, { status: 400, headers: cors() });
  }

  const { CLOUDINARY_CLOUD_NAME: cloud, CLOUDINARY_API_KEY: key, CLOUDINARY_API_SECRET: sec } = env;
  if (!cloud || !key || !sec) {
    return Response.json({ error: 'Cloudinary not configured' }, { status: 500, headers: cors() });
  }

  const auth = btoa(`${key}:${sec}`);
  const url  = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/resources/image` +
               `?type=upload&prefix=portfolio%2F${cat}%2F&max_results=500&direction=asc`;

  let raw;
  try {
    const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
    raw = await res.json();
  } catch (e) {
    return Response.json({ error: 'Cloudinary request failed', detail: e.message }, { status: 502, headers: cors() });
  }

  const photos = (raw.resources || []).map(r => {
    const basename = r.public_id.split('/').pop();
    const filename = basename + '.' + r.format;
    return {
      filename,
      url:       `https://res.cloudinary.com/${cloud}/image/upload/q_auto,f_auto/${r.public_id}`,
      public_id: r.public_id,
      thumb:     `https://res.cloudinary.com/${cloud}/image/upload/w_400,h_300,c_fill,q_auto/${r.public_id}`
    };
  });

  return Response.json(photos, {
    headers: { 'Cache-Control': 'no-store', ...cors() }
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 200, headers: cors() });
}
