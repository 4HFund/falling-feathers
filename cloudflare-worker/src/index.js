const CLOUD_NAME = 'ixfa510d';
const DEFAULT_ORIGINS = [
  'https://4hfund.github.io',
  'https://fallingfeathers.us',
  'https://www.fallingfeathers.us'
];
const CATEGORIES = [
  'ducks', 'chickens', 'quail', 'eggs', 'babies',
  'rescues', 'around-the-hollow', 'farm-life'
];
const HOMEPAGE_SLOTS = ['homepage-hero', 'homepage-story-1', 'homepage-story-2'];
const EGG_INVENTORY_KEY = 'current';

function allowedOrigins(env) {
  const extras = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  return [...new Set([...DEFAULT_ORIGINS, ...extras])];
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = allowedOrigins(env);
  const responseOrigin = allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': responseOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Admin-Pin',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'Vary': 'Origin'
  };
}

function json(request, env, data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(request, env), ...extraHeaders }
  });
}

function basicAuth(env) {
  return `Basic ${btoa(`${env.CLOUDINARY_API_KEY}:${env.CLOUDINARY_API_SECRET}`)}`;
}

function requireConfiguration(env) {
  const missing = ['CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'ADMIN_PIN']
    .filter(key => !env[key]);
  if (missing.length) throw new Error(`Missing Worker secrets: ${missing.join(', ')}`);
}

function isAuthorized(request, env) {
  const supplied = request.headers.get('X-Admin-Pin') || '';
  return supplied.length >= 4 && supplied === env.ADMIN_PIN;
}

async function cloudinaryRequest(env, path, options = {}) {
  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}${path}`, {
    ...options,
    headers: {
      Authorization: basicAuth(env),
      ...(options.body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; }
  catch { data = { raw: text }; }

  if (!response.ok) {
    const detail = data?.error?.message || data?.error || text || `HTTP ${response.status}`;
    throw new Error(`Cloudinary request failed: ${detail}`);
  }
  return data;
}

async function listTaggedResources(env, tag) {
  const resources = [];
  let nextCursor = '';
  do {
    const query = new URLSearchParams({ max_results: '500', tags: 'true', context: 'true', metadata: 'true' });
    if (nextCursor) query.set('next_cursor', nextCursor);
    const data = await cloudinaryRequest(env, `/resources/image/tags/${encodeURIComponent(tag)}?${query}`);
    resources.push(...(Array.isArray(data.resources) ? data.resources : []));
    nextCursor = data.next_cursor || '';
  } while (nextCursor && resources.length < 2000);
  return resources;
}

function normalizeResource(resource, status = 'visible') {
  const tags = Array.isArray(resource.tags) ? resource.tags : [];
  return {
    public_id: resource.public_id,
    format: resource.format,
    version: resource.version,
    width: resource.width,
    height: resource.height,
    bytes: resource.bytes,
    created_at: resource.created_at,
    secure_url: resource.secure_url,
    tags,
    context: resource.context || {},
    featured: tags.includes('featured'),
    homepage_slot: HOMEPAGE_SLOTS.find(slot => tags.includes(slot)) || '',
    category: CATEGORIES.find(category => tags.includes(category)) || 'farm-life',
    website_status: status
  };
}

async function changeTag(env, publicId, tag, command) {
  const body = new URLSearchParams({ command });
  body.append('public_ids[]', publicId);
  return cloudinaryRequest(env, `/resources/image/tags/${encodeURIComponent(tag)}`, { method: 'POST', body });
}

async function replaceCategory(env, publicId, currentTags, category) {
  if (!CATEGORIES.includes(category)) throw new Error('Invalid category.');
  const existing = CATEGORIES.filter(tag => currentTags.includes(tag));
  await Promise.all(existing.filter(tag => tag !== category).map(tag => changeTag(env, publicId, tag, 'remove')));
  if (!existing.includes(category)) await changeTag(env, publicId, category, 'add');
}

async function setHomepageSlot(env, publicId, slot) {
  if (!HOMEPAGE_SLOTS.includes(slot)) throw new Error('Invalid homepage slot.');
  const existing = await listTaggedResources(env, slot);
  await Promise.all(existing.filter(photo => photo.public_id !== publicId).map(photo => changeTag(env, photo.public_id, slot, 'remove')));
  await Promise.all([
    changeTag(env, publicId, slot, 'add'),
    changeTag(env, publicId, 'featured', 'add'),
    changeTag(env, publicId, 'website-gallery', 'add')
  ]);
}

async function clearHomepageSlot(env, publicId, slot) {
  if (!HOMEPAGE_SLOTS.includes(slot)) throw new Error('Invalid homepage slot.');
  await changeTag(env, publicId, slot, 'remove');
}

async function updateContext(env, publicId, title, description) {
  const body = new URLSearchParams({ command: 'add' });
  const safeTitle = String(title || '').replace(/[|=]/g, ' ').trim();
  const safeDescription = String(description || '').replace(/[|=]/g, ' ').trim();
  body.set('context', `title=${safeTitle}|description=${safeDescription}`);
  body.append('public_ids[]', publicId);
  return cloudinaryRequest(env, '/resources/image/context', { method: 'POST', body });
}

async function deleteResource(env, publicId) {
  const body = new URLSearchParams();
  body.append('public_ids[]', publicId);
  body.set('invalidate', 'true');
  return cloudinaryRequest(env, '/resources/image/upload', { method: 'DELETE', body });
}

async function readJson(request) {
  try { return await request.json(); }
  catch { throw new Error('Request body must be valid JSON.'); }
}

async function getAllManagedPhotos(env) {
  const [visible, hidden] = await Promise.all([
    listTaggedResources(env, 'website-gallery'),
    listTaggedResources(env, 'website-hidden')
  ]);
  const byId = new Map();
  visible.forEach(photo => byId.set(photo.public_id, normalizeResource(photo, 'visible')));
  hidden.forEach(photo => byId.set(photo.public_id, normalizeResource(photo, 'hidden')));
  return [...byId.values()].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
}

function defaultEggInventory() {
  return {
    updated_at: null,
    public_message: 'Fresh eggs are offered when the flock is laying and supply allows.',
    pickup_note: 'Local pickup in the Wheeling, West Virginia area. Contact us to confirm availability.',
    products: {
      chicken: { count: 0, price: '5.00', package: 'dozen', available: false, public_note: '' },
      duck: { count: 0, price: '6.00', package: 'half dozen', available: false, public_note: '' },
      quail: { count: 0, price: '6.00', package: '18-count carton', available: false, public_note: '' }
    }
  };
}

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function sanitizeEggProduct(value, fallbackPackage) {
  const count = Math.max(0, Math.floor(Number(value?.count) || 0));
  const price = Math.max(0, Number(value?.price) || 0).toFixed(2);
  return {
    count,
    price,
    package: cleanText(value?.package || fallbackPackage, 40),
    available: Boolean(value?.available) && count > 0,
    public_note: cleanText(value?.public_note, 120)
  };
}

function sanitizeEggInventory(value) {
  return {
    updated_at: new Date().toISOString(),
    public_message: cleanText(value?.public_message, 300) || defaultEggInventory().public_message,
    pickup_note: cleanText(value?.pickup_note, 300) || defaultEggInventory().pickup_note,
    products: {
      chicken: sanitizeEggProduct(value?.products?.chicken, 'dozen'),
      duck: sanitizeEggProduct(value?.products?.duck, 'half dozen'),
      quail: sanitizeEggProduct(value?.products?.quail, '18-count carton')
    }
  };
}

async function readEggInventory(env) {
  if (!env.EGG_INVENTORY) return { inventory: defaultEggInventory(), configured: false };
  const stored = await env.EGG_INVENTORY.get(EGG_INVENTORY_KEY, 'json');
  return { inventory: stored || defaultEggInventory(), configured: true };
}

async function writeEggInventory(env, value) {
  if (!env.EGG_INVENTORY) {
    throw new Error('Egg inventory storage is not connected yet. Add a Workers KV binding named EGG_INVENTORY in Cloudflare.');
  }
  const inventory = sanitizeEggInventory(value);
  await env.EGG_INVENTORY.put(EGG_INVENTORY_KEY, JSON.stringify(inventory));
  return inventory;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    try {
      requireConfiguration(env);
      const url = new URL(request.url);

      if (url.pathname === '/health' && request.method === 'GET') {
        return json(request, env, { ok: true, service: 'Falling Feathers Hollow Admin API', egg_inventory_configured: Boolean(env.EGG_INVENTORY) });
      }

      if (url.pathname === '/gallery' && request.method === 'GET') {
        const visible = await listTaggedResources(env, 'website-gallery');
        const resources = visible.map(photo => normalizeResource(photo, 'visible')).sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
        return json(request, env, { generated_at: new Date().toISOString(), resources }, 200, { 'Cache-Control': 'public, max-age=30, s-maxage=30' });
      }

      if (url.pathname === '/homepage' && request.method === 'GET') {
        const slotEntries = await Promise.all(HOMEPAGE_SLOTS.map(async slot => {
          const matches = await listTaggedResources(env, slot);
          return [slot, matches[0] ? normalizeResource(matches[0], 'visible') : null];
        }));
        return json(request, env, { slots: Object.fromEntries(slotEntries) }, 200, { 'Cache-Control': 'public, max-age=30, s-maxage=30' });
      }

      if (url.pathname === '/eggs' && request.method === 'GET') {
        const data = await readEggInventory(env);
        return json(request, env, data, 200, { 'Cache-Control': 'public, max-age=20, s-maxage=20' });
      }

      if (!isAuthorized(request, env)) {
        return json(request, env, { error: 'Invalid admin PIN.' }, 401);
      }

      if (url.pathname === '/admin/eggs' && request.method === 'GET') {
        return json(request, env, await readEggInventory(env));
      }

      if (url.pathname === '/admin/eggs' && request.method === 'POST') {
        const body = await readJson(request);
        return json(request, env, { inventory: await writeEggInventory(env, body), configured: true });
      }

      if (url.pathname === '/admin/photos' && request.method === 'GET') {
        return json(request, env, { resources: await getAllManagedPhotos(env) });
      }

      if (url.pathname === '/admin/photo' && request.method === 'POST') {
        const body = await readJson(request);
        const publicId = String(body.public_id || '').trim();
        const action = String(body.action || '').trim();
        if (!publicId) return json(request, env, { error: 'public_id is required.' }, 400);

        if (action === 'hide') {
          await changeTag(env, publicId, 'website-gallery', 'remove');
          await changeTag(env, publicId, 'website-hidden', 'add');
        } else if (action === 'restore') {
          await changeTag(env, publicId, 'website-hidden', 'remove');
          await changeTag(env, publicId, 'website-gallery', 'add');
        } else if (action === 'feature' || action === 'unfeature') {
          await changeTag(env, publicId, 'featured', action === 'feature' ? 'add' : 'remove');
        } else if (action === 'set-homepage-slot') {
          await setHomepageSlot(env, publicId, String(body.slot || ''));
        } else if (action === 'clear-homepage-slot') {
          await clearHomepageSlot(env, publicId, String(body.slot || ''));
        } else if (action === 'edit') {
          const tags = Array.isArray(body.tags) ? body.tags.map(String) : [];
          await Promise.all([
            updateContext(env, publicId, body.title, body.description),
            replaceCategory(env, publicId, tags, String(body.category || 'farm-life'))
          ]);
        } else {
          return json(request, env, { error: 'Unsupported action.' }, 400);
        }
        return json(request, env, { ok: true, public_id: publicId, action });
      }

      if (url.pathname === '/admin/photo' && request.method === 'DELETE') {
        const body = await readJson(request);
        const publicId = String(body.public_id || '').trim();
        if (!publicId) return json(request, env, { error: 'public_id is required.' }, 400);
        await deleteResource(env, publicId);
        return json(request, env, { ok: true, deleted: publicId });
      }

      return json(request, env, { error: 'Not found.' }, 404);
    } catch (error) {
      console.error(error);
      return json(request, env, { error: error.message || 'Unexpected server error.' }, 500);
    }
  }
};
