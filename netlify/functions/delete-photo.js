// Netlify Function: delete a photo from Cloudinary
// POST /.netlify/functions/delete-photo
// Body: { "public_id": "portfolio/wedding/12345_photo.jpg" }

'use strict';
const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors() };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors(), body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { public_id } = body;
  if (!public_id || !public_id.startsWith('portfolio/')) {
    return {
      statusCode: 400,
      headers: cors(),
      body: JSON.stringify({ error: 'Invalid public_id — must start with portfolio/' })
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

  const auth    = Buffer.from(`${key}:${sec}`).toString('base64');
  const payload = JSON.stringify({ public_ids: [public_id] });

  let result;
  try {
    result = await del(`/v1_1/${encodeURIComponent(cloud)}/resources/image/upload`, auth, payload);
  } catch (e) {
    return {
      statusCode: 502,
      headers: cors(),
      body: JSON.stringify({ error: 'Cloudinary delete failed', detail: e.message })
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', ...cors() },
    body: JSON.stringify({ deleted: result.deleted || {} })
  };
};

function del(path, auth, payload) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.cloudinary.com',
      path,
      method: 'DELETE',
      headers: {
        Authorization:    `Basic ${auth}`,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error('Bad JSON from Cloudinary: ' + body.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}
