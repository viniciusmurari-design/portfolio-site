// Netlify Function: list photos from Cloudinary for a given category
// GET /.netlify/functions/photos?category=wedding

'use strict';
const https = require('https');

const VALID = new Set([
  'wedding', 'portrait', 'food', 'family', 'events',
  'product', 'hotels', 'corporate', 'architecture', 'hero'
]);

exports.handler = async (event) => {
  const cat = (event.queryStringParameters || {}).category;
  if (!VALID.has(cat)) {
    return {
      statusCode: 400,
      headers: cors(),
      body: JSON.stringify({ error: 'Invalid category' })
    };
  }

  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key   = process.env.CLOUDINARY_API_KEY;
  const sec   = process.env.CLOUDINARY_API_SECRET;

  if (!cloud || !key || !sec) {
    return {
      statusCode: 500,
      headers: cors(),
      body: JSON.stringify({ error: 'Cloudinary not configured' })
    };
  }

  const auth = Buffer.from(`${key}:${sec}`).toString('base64');
  const url  = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/resources/image` +
               `?type=upload&prefix=portfolio%2F${cat}%2F&max_results=500&direction=asc`;

  let raw;
  try {
    raw = await get(url, auth);
  } catch (e) {
    return {
      statusCode: 502,
      headers: cors(),
      body: JSON.stringify({ error: 'Cloudinary request failed', detail: e.message })
    };
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

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors() },
    body: JSON.stringify(photos)
  };
};

function get(url, auth) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { Authorization: `Basic ${auth}` } }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error('Bad JSON from Cloudinary: ' + body.slice(0, 200))); }
      });
    }).on('error', reject);
  });
}

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}
