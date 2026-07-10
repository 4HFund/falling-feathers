const ALLOWED_ORIGIN = 'https://4hfund.github.io';
const CLOUD_NAME = 'ixfa510d';

function corsHeaders(origin) {
  const allowed = origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Admin-Pin',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json; charset=utf-8'
  };
}

function json(data, status = 200, origin = ALLOWED_ORIGIN) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(origin)
  });
}

function unauthorized(origin) {
  return json({ error: 'Invalid admin PIN.' }, 401, origin);
}

function basicAuth(apiKey, apiSecret) {
  return `Basic ${btoa(`${apiKey}:${apiSecret}`)}`;
}

async function listTaggedResources(tag, env) {
  const url = new URL(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image/tags/${encodeURIComponent(tag)}`);
  url.searchParams.set('max_results', '500');
  url.searchParams.set('tags', 'true');
  url.searchParams.set('context', 'true');

  const response = await fetch(url, {
    headers: {
      Authorization: basicAuth(env.CLOUDINARY_API_KEY, env.CLOUDINARY_API_SECRET)
    }
  });

  if (!response.ok) {
    throw new Error(`Cloudinary list request failed with ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data.resources) ? data.resources : [];
}

async function changeTag(publicId, tag, command, env) {
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image/tags/${encodeURIComponent(tag)}`;
  const body = new URLSearchParams();
  body.set('command', command);
  body.append('public_ids[]', publicId);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(env.CLOUDINARY_API_KEY, env.CLOUDINARY_API_SECRET),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cloudinary tag update failed with ${response.status}: ${text}`);
  }

  return response.json();
}

async function requireAdminPin(request, env) {
  const suppliedPin = request.headers.get('X-Admin-Pin') || '';
  return suppliedPin && suppliedPin === env.ADMIN_PIN;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ALLOWED_ORIGIN;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (!env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET || !env.ADMIN_PIN) {
      return json({ error: 'Worker secrets are not configured.' }, 500, origin);
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === '/health' && request.method === 'GET') {
        return json({ ok: true }, 200, origin);
      }

      if (!(await requireAdminPin(request, env))) {
        return unauthorized(origin);
      }

      if (url.pathname === '/photos' && request.method === 'GET') {
        const [visible, hidden] = await Promise.all([
          listTaggedResources('website-gallery', env),
          listTaggedResources('website-hidden', env)
        ]);

        const normalized = [
          ...visible.map(photo => ({ ...photo, website_status: 'visible' })),
          ...hidden.map(photo => ({ ...photo, website_status: 'hidden' }))
        ].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

        return json({ resources: normalized }, 200, origin);
      }

      if ((url.pathname === '/hide' || url.pathname === '/restore') && request.method === 'POST') {
        const body = await request.json();
        const publicId = String(body.public_id || '').trim();

        if (!publicId) {
          return json({ error: 'public_id is required.' }, 400, origin);
        }

        if (url.pathname === '/hide') {
          await changeTag(publicId, 'website-gallery', 'remove', env);
          await changeTag(publicId, 'website-hidden', 'add', env);
          return json({ ok: true, status: 'hidden', public_id: publicId }, 200, origin);
        }

        await changeTag(publicId, 'website-hidden', 'remove', env);
        await changeTag(publicId, 'website-gallery', 'add', env);
        return json({ ok: true, status: 'visible', public_id: publicId }, 200, origin);
      }

      return json({ error: 'Not found.' }, 404, origin);
    } catch (error) {
      console.error(error);
      return json({ error: error.message || 'Unexpected server error.' }, 500, origin);
    }
  }
};
