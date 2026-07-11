(() => {
  const CLOUD_NAME = 'ixfa510d';
  const UPLOAD_PRESET = 'ml_default';
  const API_BASE = (window.FFH_CONFIG?.apiBase || '').replace(/\/$/, '');
  const slots = [
    { key: 'pekins', label: 'Pekins', icon: '🦆', category: 'ducks' },
    { key: 'rouens', label: 'Rouens', icon: '🦆', category: 'ducks' },
    { key: 'runners', label: 'Runner Ducks', icon: '🐥', category: 'babies' },
    { key: 'chickens', label: 'Chicken Crew', icon: '🐔', category: 'chickens' },
    { key: 'quail', label: 'Quail', icon: '🪶', category: 'quail' },
    { key: 'rescues', label: 'Rescues & Special Care', icon: '❤️', category: 'rescues' }
  ];

  function imageUrl(photo, width = 700) {
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,c_fill,w_${width},h_${width}/${photo.public_id}.${photo.format}`;
  }

  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .flock-image-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem}
      .flock-image-card{background:#fff;border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 8px 24px rgba(75,59,42,.06)}
      .flock-image-preview{aspect-ratio:4/3;display:grid;place-items:center;background:linear-gradient(135deg,#fff6e5,#e7d1ad);font-size:3rem;overflow:hidden}
      .flock-image-preview img{width:100%;height:100%;object-fit:cover;display:block}
      .flock-image-body{padding:.8rem}.flock-image-body strong,.flock-image-body small{display:block}.flock-image-body small{color:var(--muted);margin:.25rem 0 .65rem;line-height:1.35}
      .flock-image-change{width:100%;border:0;border-radius:12px;padding:.7rem;font-weight:900;background:var(--green);color:#fff}
      @media(min-width:700px){.flock-image-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
    `;
    document.head.appendChild(style);
  }

  function createPanel() {
    const panel = document.createElement('section');
    panel.className = 'panel';
    panel.id = 'flock-image-controls';
    panel.innerHTML = `
      <div class="section-title"><h2>Flock category pictures</h2><span>Public flock page</span></div>
      <p style="line-height:1.55;margin-top:0">Change the main picture shown for each group on the Meet the Flock page. The newest upload for a category becomes its picture automatically.</p>
      <div class="flock-image-grid" id="flock-image-grid"></div>
      <div class="result" id="flock-image-message" aria-live="polite"></div>
    `;
    const mount = document.getElementById('photo-manager-mount');
    if (mount) mount.before(panel);
    else document.querySelector('main')?.appendChild(panel);
    return panel;
  }

  function message(text, type = 'success') {
    const el = document.getElementById('flock-image-message');
    el.textContent = text;
    el.className = `result show ${type}`;
  }

  async function loadCurrent() {
    if (!API_BASE) return {};
    const response = await fetch(`${API_BASE}/gallery`);
    if (!response.ok) return {};
    const data = await response.json();
    const photos = Array.isArray(data.resources) ? data.resources : [];
    const current = {};
    slots.forEach(slot => {
      current[slot.key] = photos.find(photo => Array.isArray(photo.tags) && photo.tags.includes(`flock-${slot.key}`)) || null;
    });
    return current;
  }

  function openUpload(slot) {
    const widget = cloudinary.createUploadWidget({
      cloudName: CLOUD_NAME,
      uploadPreset: UPLOAD_PRESET,
      multiple: false,
      sources: ['local', 'camera'],
      resourceType: 'image',
      clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'heic'],
      maxFileSize: 12000000,
      folder: `falling-feathers/flock/${slot.key}`,
      tags: ['website-gallery', slot.category, `flock-${slot.key}`],
      context: { title: `${slot.label} flock picture`, description: `Main category image for ${slot.label} on the Meet the Flock page.` },
      showAdvancedOptions: false,
      cropping: true,
      croppingAspectRatio: 4 / 3,
      croppingShowDimensions: true
    }, (error, result) => {
      if (error) {
        message(`Upload failed: ${error.message || 'Unknown error'}`, 'error');
        return;
      }
      if (result?.event === 'success') {
        const card = document.querySelector(`[data-flock-admin-slot="${slot.key}"]`);
        const preview = card?.querySelector('.flock-image-preview');
        if (preview) preview.innerHTML = `<img src="${result.info.secure_url}" alt="${slot.label}">`;
        message(`${slot.label} picture updated. The public flock page will use it automatically.`);
      }
    });
    widget.open();
  }

  async function render() {
    const current = await loadCurrent().catch(() => ({}));
    const grid = document.getElementById('flock-image-grid');
    grid.replaceChildren();
    slots.forEach(slot => {
      const photo = current[slot.key];
      const card = document.createElement('article');
      card.className = 'flock-image-card';
      card.dataset.flockAdminSlot = slot.key;
      card.innerHTML = `
        <div class="flock-image-preview">${photo ? `<img src="${imageUrl(photo)}" alt="${slot.label}">` : slot.icon}</div>
        <div class="flock-image-body"><strong>${slot.icon} ${slot.label}</strong><small>${photo ? 'Current custom picture' : 'Using the page fallback'}</small><button class="flock-image-change" type="button">Change Picture</button></div>
      `;
      card.querySelector('button').addEventListener('click', () => openUpload(slot));
      grid.appendChild(card);
    });
  }

  function init() {
    if (!document.getElementById('flock-image-controls')) {
      addStyles();
      createPanel();
      render();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
