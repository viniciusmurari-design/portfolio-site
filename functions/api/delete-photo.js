// Cloudflare Pages Function: delete a photo from Cloudinary
// POST /api/delete-photo
// Body: { "public_id": "portfolio/wedding/12345_photo.jpg" }

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: cors() });
  }

  const { public_id } = body;
  if (!public_id || !public_id.startsWith('portfolio/')) {
    return Response.json(
      { error: 'Invalid public_id — must start with portfolio/' },
      { status: 400, headers: cors() }
    );
  }

  const { CLOUDINARY_CLOUD_NAME: cloud, CLOUDINARY_API_KEY: key, CLOUDINARY_API_SECRET: sec } = env;
  if (!cloud || !key || !sec) {
    return Response.json({ error: 'Cloudinary not configured' }, { status: 500, headers: cors() });
  }

  const auth    = btoa(`${key}:${sec}`);
  const payload = JSON.stringify({ public_ids: [public_id] });

  let result;
  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/resources/image/upload`,
      {
        method: 'DELETE',
        headers: {
          Authorization:  `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: payload
      }
    );
    result = await res.json();
  } catch (e) {
    return Response.json({ error: 'Cloudinary delete failed', detail: e.message }, { status: 502, headers: cors() });
  }

  return Response.json({ deleted: result.deleted || {} }, { headers: cors() });
}

export async function onRequestOptions() {
  return new Response(null, { status: 200, headers: cors() });
}
