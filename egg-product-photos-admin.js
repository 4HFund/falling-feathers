(() => {
  const CLOUD_NAME = 'ixfa510d';
  const UPLOAD_PRESET = 'ml_default';
  const API_BASE = (window.FFH_CONFIG?.apiBase || '').replace(/\/$/, '');
  const products = [
    { key: 'chicken', label: 'Chicken Eggs', icon: '🥚' },
    { key: 'duck', label: 'Duck Eggs', icon: '🦆' },
    { key: 'quail', label: 'Quail Eggs', icon: '🪶' }
  ];
  let photos = [];

  const slotTag = (product, slot) => `egg-product-${product}-${slot}`;
  const imageUrl = (photo, width = 420) => `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,c_fill,w_${width},h_${Math.round(width * .75)}/${photo.public_id}.${photo.format}`;

  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .egg-photo-manager{margin-top:1rem;padding-top:1rem;border-top:1px solid var(--line)}
      .egg-photo-manager-title{display:flex;align-items:center;justify-content:space-between;gap:.7rem;margin-bottom:.65rem}
      .egg-photo-manager-title strong{color:var(--deep);font-size:.92rem}.egg-photo-manager-title small{color:var(--muted);font-size:.72rem}
      .egg-photo-slots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.55rem}
      .egg-photo-slot{border:1px solid rgba(75,59,42,.16);border-radius:14px;overflow:hidden;background:#fffaf1}
      .egg-photo-preview{aspect-ratio:4/3;display:grid;place-items:center;background:linear-gradient(135deg,#f8ead5,#e7d1ad);font-size:1.8rem;overflow:hidden}
      .egg-photo-preview img{width:100%;height:100%;object-fit:cover;display:block}
      .egg-photo-button{width:100%;border:0;border-top:1px solid rgba(75,59,42,.1);background:#fff;padding:.58rem .35rem;font-size:.68rem;font-weight:900;color:var(--green)}
      .egg-photo-message{margin-top:.6rem;font-size:.74rem;font-weight:800;color:var(--green);min-height:1em}
      @media(max-width:430px){.egg-photo-slots{gap:.4rem}.egg-photo-button{font-size:.62rem;padding:.52rem .2rem}}
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

  function setMessage(card, text) {
    const message = card.querySelector('.egg-photo-message');
    if (message) message.textContent = text;
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
      tags: ['website-gallery', 'eggs', 'egg-product-photo', tag],
      context: {
        title: `${product.label} product photo ${slot}`,
        description: `Rotating product image for ${product.label} on the Eggs page.`
      },
      showAdvancedOptions: false,
      cropping: true,
      croppingAspectRatio: 4 / 3,
      croppingShowDimensions: true
    }, (error, result) => {
      if (error) {
        setMessage(card, `Upload failed: ${error.message || 'Unknown error'}`);
        return;
      }
      if (result?.event === 'success') {
        photos = photos.filter(photo => !(Array.isArray(photo.tags) && photo.tags.includes(tag)));
        photos.unshift({
          public_id: result.info.public_id,
          format: result.info.format || 'jpg',
          tags: ['website-gallery', 'eggs', 'egg-product-photo', tag]
        });
        const preview = card.querySelector(`[data-egg-photo-slot="${slot}"] .egg-photo-preview`);
        if (preview) preview.innerHTML = `<img src="${result.info.secure_url}" alt="${product.label} photo ${slot}">`;
        const button = card.querySelector(`[data-egg-photo-slot="${slot}"] .egg-photo-button`);
        if (button) button.textContent = 'Replace';
        setMessage(card, `Photo ${slot} updated. The public Eggs page will rotate it automatically.`);
      }
    });
    widget.open();
  }

  function attachManager(card, product) {
    if (card.querySelector('.egg-photo-manager')) return;
    const manager = document.createElement('div');
    manager.className = 'egg-photo-manager';
    manager.innerHTML = `
      <div class="egg-photo-manager-title"><strong>Product pictures</strong><small>Up to 3 rotating photos</small></div>
      <div class="egg-photo-slots"></div>
      <div class="egg-photo-message" aria-live="polite"></div>`;
    const slots = manager.querySelector('.egg-photo-slots');

    [1, 2, 3].forEach(slot => {
      const photo = photoFor(product.key, slot);
      const item = document.createElement('div');
      item.className = 'egg-photo-slot';
      item.dataset.eggPhotoSlot = slot;
      item.innerHTML = `
        <div class="egg-photo-preview">${photo ? `<img src="${imageUrl(photo)}" alt="${product.label} photo ${slot}">` : '📷'}</div>
        <button class="egg-photo-button" type="button">${photo ? 'Replace' : `Add photo ${slot}`}</button>`;
      item.querySelector('button').addEventListener('click', () => openUpload(product, slot, card));
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
