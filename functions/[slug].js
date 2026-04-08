// Cloudflare Pages Function: serve landing.html for clean landing page URLs
// e.g. /airbnb-photography → serves /landing.html (JS reads slug from window.location.pathname)

const SKIP = new Set(['admin', 'index', 'landing', 'api', 'photos', 'functions', 'styles', 'script', 'blog-post']);

export async function onRequest({ request, env, params }) {
  const slug = params.slug || '';

  // Pass through if it looks like a file or a known route
  if (!slug || slug.includes('.') || SKIP.has(slug)) {
    return env.ASSETS.fetch(request);
  }

  // Serve landing.html — landing.js will read window.location.pathname to get the slug
  const url = new URL(request.url);
  url.pathname = '/landing.html';
  const response = await env.ASSETS.fetch(url.toString());

  // Return with same status but ensure content-type is html
  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}
