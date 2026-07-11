(() => {
  const CLOUD_NAME = 'ixfa510d';
  const UPLOAD_PRESET = 'ml_default';
  const API_BASE = (window.FFH_CONFIG?.apiBase || '').replace(/\/$/, '');
  const PIN_KEY = 'falling-feathers-admin-pin';
  const products = [
    { key: 'chicken', label: 'Chicken Eggs', icon: '🥚' },
    { key: 'duck', label: 'Duck Eggs', icon: '🦆' },
    { key: 'quail', label: 'Quail Eggs', icon: '🪶' }
  ];
  let photos = [];

  const slotTag = (product, slot) => `egg-product-${product}-${slot}`;
  const imageUrl = (photo, width = 420) => photo.secure_url || `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,c_fill,w_${width},h_${Math.round(width * .75)}/${photo.public_id}.${photo.format}`;

  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .egg-photo-manager{margin-top:1rem;padding-top:1rem;border-top:1px solid var(--line)}
      .egg-photo-manager-title{display:flex;align-items:center;justify-content:space-between;gap:.7rem;margin-bottom:.65rem}
      .egg-photo-manager-title strong{color:var(--deep);font-size:.92rem}.egg-photo-manager-title small{color:var(--muted);font-size:.72rem}
      .egg-photo-slots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.55rem}
      .egg-photo-slot{border:1px solid rgba(75,59,42,.16);border-radius:14px;overflow:hidden;background:#fffaf1;min-width:0}
      .egg-photo-preview{position:relative;aspect-ratio:4/3;display:grid;place-items:center;background:linear-gradient(135deg,#f8ead5,#e7d1ad);font-size:1.8rem;overflow:hidden}
      .egg-photo-preview img{width:100%;height:100%;object-fit:cover;display:block}.egg-photo-number{position:absolute;top:.35rem;left:.35rem;background:rgba(32,59,45,.86);color:#fff;border-radius:999px;padding:.2rem .38rem;font-size:.58rem;font-weight:900}
      .egg-photo-button{width:100%;border:0;border-top:1px solid rgba(75,59,42,.1);background:#fff;padding:.58rem .25rem;font-size:.66rem;font-weight:900;color:var(--green)}
      .egg-photo-tools{display:grid;grid-template-columns:1fr 1fr 1fr;border-top:1px solid rgba(75,59,42,.1)}.egg-photo-tools button{border:0;background:#fffaf1;padding:.45rem .1rem;font-size:.68rem;font-weight:900;color:#6b553e}.egg-photo-tools button+button{border-left:1px solid rgba(75,59,42,.1)}.egg-photo-tools .remove{color:#9b3828}.egg-photo-tools button:disabled{opacity:.3}
      .egg-photo-message{margin-top:.6rem;font-size:.74rem;font-weight:800;color:var(--green);min-height:1em}
      @media(max-width:430px){.egg-photo-slots{gap:.4rem}.egg-photo-button{font-size:.59rem}.egg-photo-tools button{font-size:.62rem}}
    `;
    document.head.appendChild(style);
  }

  async function loadPhotos() {
    if (!API_BASE) return;
    const response = await fetch(`${API_BASE}/gallery`, { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    photos = Array.isArray(data.resources) ? data.resources : [];
  }

  function photoFor(product, slot) {
    return photos.find(photo => Array.isArray(photo.tags) && photo.tags.includes(slotTag(product, slot))) || null;
  }

  function setMessage(card, text, error = false) {
    const message = card.querySelector('.egg-photo-message');
    if (message) {
      message.textContent = text;
      message.style.color = error ? '#9b3828' : 'var(--green)';
    }
  }

  async function adminDelete(publicId) {
    let pin = sessionStorage.getItem(PIN_KEY) || '';
    if (!pin) {
      pin = window.prompt('Enter your Hollow Admin PIN:') || '';
      if (!pin) throw new Error('Admin PIN required.');
      sessionStorage.setItem(PIN_KEY, pin);
    }
    const response = await fetch(`${API_BASE}/admin/photo`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Pin': pin },
      body: JSON.stringify({ public_id: publicId })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'The photo could not be removed.');
  }

  async function duplicateToSlot(photo, product, slot) {
    const form = new FormData();
    form.append('file', imageUrl(photo, 1400));
    form.append('upload_preset', UPLOAD_PRESET);
    form.append('folder', `falling-feathers/eggs/${product.key}`);
    form.append('tags', ['website-control', 'eggs', 'egg-product-photo', slotTag(product.key, slot)].join(','));
    form.append('context', `title=${product.label} product photo ${slot}|description=Rotating product image for ${product.label} on the Eggs page.`);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: form });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || 'The photo order could not be changed.');
    return { public_id: data.public_id, format: data.format || 'jpg', secure_url: data.secure_url, tags: ['website-control', 'eggs', 'egg-product-photo', slotTag(product.key, slot)] };
  }

  function rerenderCard(card, product) {
    card.querySelector('.egg-photo-manager')?.remove();
    attachManager(card, product);
  }

  function openUpload(product, slot, card) {
    const tag = slotTag(product.key, slot);
    const widget = cloudinary.createUploadWidget({
      cloudName: CLOUD_NAME,
      uploadPreset: UPLOAD_PRESET,
      multiple: false,
      sources: ['local', 'camera'],
      resourceType: 'image',
      clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'heic'],
      maxFileSize: 12000000,
      folder: `falling-feathers/eggs/${product.key}`,
      tags: ['website-control', 'eggs', 'egg-product-photo', tag],
      context: { title: `${product.label} product photo ${slot}`, description: `Rotating product image for ${product.label} on the Eggs page.` },
      showAdvancedOptions: false,
      cropping: true,
      croppingAspectRatio: 4 / 3,
      croppingShowDimensions: true
    }, async (error, result) => {
      if (error) { setMessage(card, `Upload failed: ${error.message || 'Unknown error'}`, true); return; }
      if (result?.event === 'success') {
        const old = photoFor(product.key, slot);
        const replacement = { public_id: result.info.public_id, format: result.info.format || 'jpg', secure_url: result.info.secure_url, tags: ['website-control', 'eggs', 'egg-product-photo', tag] };
        photos = photos.filter(photo => photo.public_id !== old?.public_id);
        photos.unshift(replacement);
        if (old) adminDelete(old.public_id).catch(() => {});
        rerenderCard(card, product);
        setMessage(card, `Photo ${slot} updated. It is ${slot === 1 ? 'the first image visitors will see' : `rotation position ${slot}`}.`);
      }
    });
    widget.open();
  }

  async function removePhoto(product, slot, card) {
    const photo = photoFor(product.key, slot);
    if (!photo || !window.confirm(`Remove photo ${slot} from ${product.label}?`)) return;
    setMessage(card, 'Removing photo…');
    try {
      await adminDelete(photo.public_id);
      photos = photos.filter(item => item.public_id !== photo.public_id);
      rerenderCard(card, product);
      setMessage(card, `Photo ${slot} removed.`);
    } catch (error) { setMessage(card, error.message, true); }
  }

  async function movePhoto(product, from, to, card) {
    const first = photoFor(product.key, from);
    if (!first || to < 1 || to > 3) return;
    const second = photoFor(product.key, to);
    setMessage(card, 'Changing photo order…');
    try {
      const replacements = [];
      replacements.push(await duplicateToSlot(first, product, to));
      if (second) replacements.push(await duplicateToSlot(second, product, from));
      await adminDelete(first.public_id);
      if (second) await adminDelete(second.public_id);
      photos = photos.filter(item => item.public_id !== first.public_id && item.public_id !== second?.public_id);
      photos.unshift(...replacements);
      rerenderCard(card, product);
      setMessage(card, `Photo moved to position ${to}.${to === 1 ? ' It will now appear first.' : ''}`);
    } catch (error) { setMessage(card, error.message, true); }
  }

  function attachManager(card, product) {
    if (card.querySelector('.egg-photo-manager')) return;
    const manager = document.createElement('div');
    manager.className = 'egg-photo-manager';
    manager.innerHTML = `<div class="egg-photo-manager-title"><strong>Product pictures</strong><small>Photo 1 appears first · up to 3</small></div><div class="egg-photo-slots"></div><div class="egg-photo-message" aria-live="polite"></div>`;
    const slots = manager.querySelector('.egg-photo-slots');

    [1, 2, 3].forEach(slot => {
      const photo = photoFor(product.key, slot);
      const item = document.createElement('div');
      item.className = 'egg-photo-slot';
      item.dataset.eggPhotoSlot = slot;
      item.innerHTML = `<div class="egg-photo-preview">${photo ? `<img src="${imageUrl(photo)}" alt="${product.label} photo ${slot}">` : '📷'}<span class="egg-photo-number">${slot}${slot === 1 ? ' · First' : ''}</span></div><button class="egg-photo-button" type="button">${photo ? 'Replace photo' : `Add photo ${slot}`}</button>${photo ? `<div class="egg-photo-tools"><button type="button" data-move="left" ${slot === 1 ? 'disabled' : ''}>←</button><button type="button" class="remove">Remove</button><button type="button" data-move="right" ${slot === 3 ? 'disabled' : ''}>→</button></div>` : ''}`;
      item.querySelector('.egg-photo-button').addEventListener('click', () => openUpload(product, slot, card));
      item.querySelector('.remove')?.addEventListener('click', () => removePhoto(product, slot, card));
      item.querySelector('[data-move="left"]')?.addEventListener('click', () => movePhoto(product, slot, slot - 1, card));
      item.querySelector('[data-move="right"]')?.addEventListener('click', () => movePhoto(product, slot, slot + 1, card));
      slots.appendChild(item);
    });
    card.appendChild(manager);
  }

  function attachAll() {
    products.forEach(product => {
      const card = document.querySelector(`[data-product="${product.key}"]`);
      if (card) attachManager(card, product);
    });
  }

  async function init() {
    addStyles();
    await loadPhotos().catch(() => {});
    attachAll();
    new MutationObserver(attachAll).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
