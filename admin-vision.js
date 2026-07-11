(() => {
  const CLOUD_NAME = 'ixfa510d';
  const PIN_KEY = 'falling-feathers-admin-pin';
  const LOCAL_KEY = 'ffh-operations-draft';
  const SLOTS = [
    ['homepage-hero', 'Homepage Hero', 'The large photo at the top of the homepage.'],
    ['homepage-story-1', 'Featured Story 1', 'The first story card beneath the homepage sections.'],
    ['homepage-story-2', 'Featured Story 2', 'The second story card beneath the homepage sections.']
  ];
  const CATEGORY_ICONS = {
    ducks: '🦆', chickens: '🐔', quail: '🪶', eggs: '🥚', babies: '🐣',
    rescues: '❤️', 'around-the-hollow': '🌲', 'farm-life': '📸'
  };
  let managedPhotos = [];
  let deferredInstallPrompt = null;

  function apiBase() {
    return String(window.FFH_CONFIG?.apiBase || localStorage.getItem('falling-feathers-worker-url') || '').trim().replace(/\/$/, '');
  }

  function pin() { return sessionStorage.getItem(PIN_KEY) || ''; }
  function titleFor(photo) { return photo.context?.custom?.title || photo.context?.title || 'Untitled photo'; }
  function imageUrl(photo, width = 560) {
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,c_fill,w_${width},h_${Math.round(width * .72)}/${photo.public_id}.${photo.format}`;
  }
  function label(value) { return String(value || '').replace(/-/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()); }

  async function api(path, options = {}) {
    if (!apiBase()) throw new Error('The Cloudflare Worker address is missing.');
    let currentPin = pin();
    if (!currentPin) {
      currentPin = window.prompt('Enter your Hollow Admin PIN:') || '';
      if (!currentPin) throw new Error('PIN required.');
      sessionStorage.setItem(PIN_KEY, currentPin);
    }
    const response = await fetch(`${apiBase()}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', 'X-Admin-Pin': currentPin, ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) sessionStorage.removeItem(PIN_KEY);
      throw new Error(data.error || `Request failed with ${response.status}`);
    }
    return data;
  }

  function styles() {
    const style = document.createElement('style');
    style.textContent = `
      body{padding-bottom:calc(6rem + env(safe-area-inset-bottom))}
      .vision-panel{scroll-margin-top:95px}.vision-grid{display:grid;gap:.8rem}.slot-card{display:grid;grid-template-columns:96px 1fr;gap:.8rem;align-items:center;background:#fff;border:1px solid var(--line);border-radius:18px;padding:.75rem}.slot-preview{width:96px;height:78px;border-radius:13px;object-fit:cover;background:#efe6da}.slot-copy strong,.slot-copy small{display:block}.slot-copy small{color:var(--muted);line-height:1.35;margin:.2rem 0 .55rem}.slot-copy select{width:100%;padding:.72rem;border:1px solid rgba(75,59,42,.2);border-radius:11px;background:#fff}.slot-actions{display:flex;gap:.45rem;margin-top:.5rem}.slot-actions button{border:0;border-radius:10px;padding:.58rem .7rem;font-weight:900;font-size:.75rem}.slot-save{background:var(--green);color:#fff}.slot-clear{background:#f4e0c5;color:#65411f}
      .smart-row{display:flex;gap:.55rem;flex-wrap:wrap;margin:.75rem 0}.smart-button{border:1px solid rgba(32,59,45,.18);background:var(--mint);color:var(--green);border-radius:12px;padding:.7rem .85rem;font-weight:900}.timeline{display:grid;gap:.65rem}.timeline-item{display:grid;grid-template-columns:48px 1fr;gap:.75rem;align-items:center;background:#fff;border:1px solid var(--line);border-radius:15px;padding:.7rem}.timeline-item img{width:48px;height:48px;border-radius:12px;object-fit:cover}.timeline-item strong,.timeline-item small{display:block}.timeline-item small{color:var(--muted);margin-top:.15rem}.map-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem}.map-card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:.9rem;text-decoration:none;color:var(--deep)}.map-card span{font-size:1.5rem}.map-card strong,.map-card small{display:block}.map-card small{color:var(--muted);margin-top:.18rem}.records-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.55rem}.records-grid input{width:100%;padding:.75rem;border:1px solid rgba(75,59,42,.18);border-radius:11px}.record-box{background:#fff;border:1px solid var(--line);border-radius:16px;padding:.85rem}.record-box label{font-size:.74rem;font-weight:900;color:var(--deep);display:block;margin-bottom:.35rem}.record-box textarea{width:100%;min-height:90px;padding:.75rem;border:1px solid rgba(75,59,42,.18);border-radius:11px}.local-note{font-size:.72rem;color:var(--muted);line-height:1.4}.bottom-nav{position:fixed;z-index:5000;left:50%;transform:translateX(-50%);bottom:max(.65rem,env(safe-area-inset-bottom));width:min(calc(100% - 1rem),720px);display:grid;grid-template-columns:repeat(5,1fr);background:rgba(32,21,14,.94);backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:.45rem;box-shadow:0 18px 50px rgba(0,0,0,.28)}.bottom-nav a{display:grid;place-items:center;text-decoration:none;color:#fff;font-size:.62rem;font-weight:800;gap:.15rem;padding:.45rem .2rem;border-radius:13px}.bottom-nav a span{font-size:1.18rem}.bottom-nav a:active{background:rgba(255,255,255,.12)}.vision-message{display:none;margin:.7rem 0;padding:.75rem;border-radius:12px;background:var(--mint);color:var(--green);font-weight:800}.vision-message.show{display:block}
      @media(min-width:720px){.vision-grid{grid-template-columns:repeat(3,1fr)}.slot-card{grid-template-columns:110px 1fr}.slot-preview{width:110px}.map-grid{grid-template-columns:repeat(4,1fr)}}
    `;
    document.head.appendChild(style);
  }

  function createHomepagePanel() {
    const mount = document.getElementById('photo-manager-mount');
    if (!mount) return;
    const panel = document.createElement('section');
    panel.className = 'panel vision-panel';
    panel.id = 'homepage-manager';
    panel.innerHTML = `
      <div class="section-title"><h2>Homepage Manager</h2><span>Tap, choose, save</span></div>
      <p style="line-height:1.55;margin-top:0">Choose exactly which photos appear in each homepage position. No tags or coding required.</p>
      <button class="upload-button" id="load-homepage-manager" type="button">Load Homepage Photos</button>
      <div class="vision-message" id="homepage-message"></div>
      <div class="vision-grid" id="homepage-slots" hidden></div>`;
    mount.before(panel);
    document.getElementById('load-homepage-manager').addEventListener('click', loadManager);
  }

  function slotPhoto(slot) { return managedPhotos.find(photo => photo.homepage_slot === slot); }

  function renderSlots() {
    const container = document.getElementById('homepage-slots');
    container.hidden = false;
    container.replaceChildren();
    SLOTS.forEach(([slot, name, help]) => {
      const current = slotPhoto(slot);
      const card = document.createElement('article');
      card.className = 'slot-card';
      card.innerHTML = `<img class="slot-preview" alt=""><div class="slot-copy"><strong></strong><small></small><select><option value="">Choose a photo…</option></select><div class="slot-actions"><button class="slot-save" type="button">Save Position</button><button class="slot-clear" type="button">Clear</button></div></div>`;
      card.querySelector('strong').textContent = name;
      card.querySelector('small').textContent = help;
      const preview = card.querySelector('img');
      preview.src = current ? imageUrl(current) : 'falling_feathers_logo_compressed.png';
      preview.alt = current ? titleFor(current) : `${name} placeholder`;
      const select = card.querySelector('select');
      managedPhotos.filter(photo => photo.website_status !== 'hidden').forEach(photo => {
        const option = document.createElement('option');
        option.value = photo.public_id;
        option.textContent = `${CATEGORY_ICONS[photo.category] || '📸'} ${titleFor(photo)}`;
        option.selected = current?.public_id === photo.public_id;
        select.appendChild(option);
      });
      select.addEventListener('change', () => {
        const photo = managedPhotos.find(item => item.public_id === select.value);
        preview.src = photo ? imageUrl(photo) : 'falling_feathers_logo_compressed.png';
      });
      card.querySelector('.slot-save').addEventListener('click', () => saveSlot(slot, select.value));
      card.querySelector('.slot-clear').addEventListener('click', () => clearSlot(slot));
      container.appendChild(card);
    });
  }

  function message(text) {
    const node = document.getElementById('homepage-message');
    node.textContent = text;
    node.classList.add('show');
  }

  async function loadManager() {
    message('Loading your live photo library…');
    const data = await api('/admin/photos');
    managedPhotos = Array.isArray(data.resources) ? data.resources : [];
    renderSlots();
    renderTimeline();
    renderMap();
    message('Homepage controls are ready.');
  }

  async function saveSlot(slot, publicId) {
    if (!publicId) return message('Choose a photo first.');
    message('Saving homepage position…');
    await api('/admin/photo', { method: 'POST', body: JSON.stringify({ public_id: publicId, action: 'set-homepage-slot', slot }) });
    managedPhotos.forEach(photo => { if (photo.homepage_slot === slot) photo.homepage_slot = ''; });
    const selected = managedPhotos.find(photo => photo.public_id === publicId);
    if (selected) { selected.homepage_slot = slot; selected.featured = true; selected.website_status = 'visible'; }
    renderSlots();
    message('Homepage position saved. The public homepage updates automatically.');
  }

  async function clearSlot(slot) {
    const current = slotPhoto(slot);
    if (!current) return message('That position is already empty.');
    await api('/admin/photo', { method: 'POST', body: JSON.stringify({ public_id: current.public_id, action: 'clear-homepage-slot', slot }) });
    current.homepage_slot = '';
    renderSlots();
    message('Homepage position cleared.');
  }

  function addSmartUpload() {
    const title = document.getElementById('title');
    const story = document.getElementById('story');
    if (!title || !story) return;
    const row = document.createElement('div');
    row.className = 'smart-row';
    row.innerHTML = `<button class="smart-button" type="button">✨ Suggest title & caption</button><button class="smart-button" type="button">🧹 Clear fields</button>`;
    title.closest('.field').before(row);
    const suggestions = {
      ducks: ['Duck Life at the Hollow', 'Another peaceful day with our ducks at Falling Feathers Hollow.'],
      chickens: ['Life Around the Coop', 'A fresh moment with our chicken crew here at the Hollow.'],
      quail: ['Tiny Birds, Big Personality', 'A quiet little moment with our quail flock.'],
      eggs: ['Fresh From the Hollow', 'A look at today’s chicken, duck, or quail eggs.'],
      babies: ['New Beginnings', 'These little ones are settling in and growing fast.'],
      rescues: ['A Safe Place to Land', 'A new chapter begins with patience, care, and a safe home.'],
      'around-the-hollow': ['Around the Hollow', 'A peaceful view from our little corner of Wheeling, West Virginia.'],
      'farm-life': ['A Day at Falling Feathers Hollow', 'Real work, real animals, and another day building the Hollow feather by feather.']
    };
    row.children[0].addEventListener('click', () => {
      const active = document.querySelector('.category.active')?.dataset.value || 'farm-life';
      const [suggestedTitle, suggestedStory] = suggestions[active];
      if (!title.value.trim()) title.value = suggestedTitle;
      if (!story.value.trim()) story.value = suggestedStory;
    });
    row.children[1].addEventListener('click', () => { title.value = ''; story.value = ''; });
  }

  function createInsightsPanels() {
    const manager = document.getElementById('homepage-manager');
    if (!manager) return;
    const panel = document.createElement('section');
    panel.className = 'panel vision-panel';
    panel.id = 'hollow-timeline';
    panel.innerHTML = `<div class="section-title"><h2>Hollow Timeline</h2><span>Automatic from uploads</span></div><div class="timeline" id="vision-timeline"><p class="local-note">Load Homepage Photos to build the live timeline.</p></div>`;
    manager.after(panel);
    const map = document.createElement('section');
    map.className = 'panel vision-panel';
    map.id = 'hollow-map';
    map.innerHTML = `<div class="section-title"><h2>Hollow Map</h2><span>Browse by area</span></div><div class="map-grid" id="vision-map"><p class="local-note">Load Homepage Photos to see each area.</p></div>`;
    panel.after(map);
  }

  function renderTimeline() {
    const node = document.getElementById('vision-timeline');
    if (!node) return;
    node.replaceChildren();
    managedPhotos.slice(0, 6).forEach(photo => {
      const item = document.createElement('article');
      item.className = 'timeline-item';
      item.innerHTML = `<img alt=""><div><strong></strong><small></small></div>`;
      item.querySelector('img').src = imageUrl(photo, 120);
      item.querySelector('img').alt = titleFor(photo);
      item.querySelector('strong').textContent = titleFor(photo);
      const date = new Date(photo.created_at);
      item.querySelector('small').textContent = `${CATEGORY_ICONS[photo.category] || '📸'} ${label(photo.category)} · ${Number.isNaN(date.getTime()) ? 'Recently' : date.toLocaleDateString()}`;
      node.appendChild(item);
    });
  }

  function renderMap() {
    const node = document.getElementById('vision-map');
    if (!node) return;
    node.replaceChildren();
    Object.entries(CATEGORY_ICONS).forEach(([category, icon]) => {
      const count = managedPhotos.filter(photo => photo.category === category && photo.website_status !== 'hidden').length;
      const card = document.createElement('a');
      card.className = 'map-card';
      card.href = '#photo-manager-mount';
      card.innerHTML = `<span>${icon}</span><strong>${label(category)}</strong><small>${count} visible photo${count === 1 ? '' : 's'}</small>`;
      node.appendChild(card);
    });
  }

  function createRecordsPanel() {
    const footer = document.querySelector('.footer');
    const panel = document.createElement('section');
    panel.className = 'panel vision-panel';
    panel.id = 'quick-records';
    panel.innerHTML = `
      <div class="section-title"><h2>Quick Records</h2><span>Fast daily notes</span></div>
      <div class="records-grid">
        <div class="record-box"><label>Chicken eggs</label><input id="record-chicken" inputmode="numeric" type="number" min="0" placeholder="0"></div>
        <div class="record-box"><label>Duck eggs</label><input id="record-duck" inputmode="numeric" type="number" min="0" placeholder="0"></div>
        <div class="record-box"><label>Quail eggs</label><input id="record-quail" inputmode="numeric" type="number" min="0" placeholder="0"></div>
      </div>
      <div class="record-box" style="margin-top:.7rem"><label>Rescue, health, or flock note</label><textarea id="record-note" placeholder="Example: Moon Beam foot check, new rescue intake, incubator update…"></textarea></div>
      <button class="upload-button" id="save-records" type="button">Save Today’s Notes</button>
      <p class="local-note">These quick notes stay privately on this device while the full synced records database is built.</p>`;
    footer.before(panel);
    const saved = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
    document.getElementById('record-chicken').value = saved.chicken || '';
    document.getElementById('record-duck').value = saved.duck || '';
    document.getElementById('record-quail').value = saved.quail || '';
    document.getElementById('record-note').value = saved.note || '';
    document.getElementById('save-records').addEventListener('click', () => {
      localStorage.setItem(LOCAL_KEY, JSON.stringify({
        chicken: document.getElementById('record-chicken').value,
        duck: document.getElementById('record-duck').value,
        quail: document.getElementById('record-quail').value,
        note: document.getElementById('record-note').value,
        savedAt: new Date().toISOString()
      }));
      document.getElementById('save-records').textContent = '✓ Notes Saved';
      setTimeout(() => { document.getElementById('save-records').textContent = 'Save Today’s Notes'; }, 1800);
    });
  }

  function createBottomNav() {
    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    nav.setAttribute('aria-label', 'Admin shortcuts');
    nav.innerHTML = `<a href="#"><span>🏠</span>Home</a><a href="#new-photo"><span>📷</span>Upload</a><a href="#homepage-manager"><span>⭐</span>Homepage</a><a href="#photo-manager-mount"><span>🖼️</span>Photos</a><a href="#quick-records"><span>📋</span>Records</a>`;
    document.body.appendChild(nav);
  }

  function installAppSupport() {
    window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstallPrompt = event; });
    const heroActions = document.querySelector('.hero-actions');
    if (!heroActions) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary-link';
    button.style.border = '1px solid rgba(255,255,255,.18)';
    button.textContent = '📱 Add to Home Screen';
    button.addEventListener('click', async () => {
      if (deferredInstallPrompt) { deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt = null; }
      else alert('On iPhone: tap Share, then “Add to Home Screen.”');
    });
    heroActions.appendChild(button);
  }

  function initialize() {
    styles();
    createHomepagePanel();
    createInsightsPanels();
    addSmartUpload();
    createRecordsPanel();
    createBottomNav();
    installAppSupport();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
  else initialize();
})();
