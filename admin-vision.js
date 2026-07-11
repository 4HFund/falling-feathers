(() => {
  const CLOUD_NAME = 'ixfa510d';
  const PIN_KEY = 'falling-feathers-admin-pin';
  const SLOTS = [
    { key: 'homepage-hero', name: 'Homepage Hero', help: 'Large photo at the top of the homepage.' },
    { key: 'homepage-story-1', name: 'Featured Story 1', help: 'First story card on the homepage.' },
    { key: 'homepage-story-2', name: 'Featured Story 2', help: 'Second story card on the homepage.' }
  ];
  const CATEGORY_ICONS = {
    ducks: '🦆', chickens: '🐔', quail: '🪶', eggs: '🥚', babies: '🐣',
    rescues: '❤️', 'around-the-hollow': '🌲', 'farm-life': '📸'
  };

  let photos = [];
  let loading = false;
  let lastLoadedAt = 0;

  function apiBase() {
    return String(window.FFH_CONFIG?.apiBase || '').trim().replace(/\/$/, '');
  }

  function getPin() {
    return sessionStorage.getItem(PIN_KEY) || '';
  }

  async function api(path, options = {}) {
    if (!apiBase()) throw new Error('The Cloudflare Worker address is missing.');
    let pin = getPin();
    if (!pin) {
      pin = window.prompt('Enter your Hollow Admin PIN:') || '';
      if (!pin) throw new Error('PIN required.');
      sessionStorage.setItem(PIN_KEY, pin);
    }

    const response = await fetch(`${apiBase()}${path}`, {
      ...options,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Pin': pin,
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) sessionStorage.removeItem(PIN_KEY);
      throw new Error(data.error || `Request failed with ${response.status}`);
    }
    return data;
  }

  function titleFor(photo) {
    return photo?.context?.custom?.title || photo?.context?.title || 'Untitled photo';
  }

  function imageUrl(photo, width = 520) {
    if (!photo) return 'falling_feathers_logo_compressed.png';
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,c_fill,w_${width},h_${Math.round(width * .72)}/${photo.public_id}.${photo.format}`;
  }

  function slotPhoto(slot) {
    return photos.find(photo => photo.homepage_slot === slot) || null;
  }

  function visiblePhotos() {
    return photos.filter(photo => photo.website_status !== 'hidden');
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      body{padding-bottom:calc(6rem + env(safe-area-inset-bottom))}
      .vision-panel{scroll-margin-top:90px}.homepage-toolbar{display:flex;gap:.6rem;align-items:center;flex-wrap:wrap}.homepage-toolbar .upload-button{margin:0;flex:1}.homepage-refresh{border:1px solid rgba(75,59,42,.18);background:#fff;border-radius:15px;padding:1rem;font-weight:900;color:var(--brown)}
      .homepage-status{display:none;margin:.8rem 0 0;padding:.82rem;border-radius:13px;font-weight:800;line-height:1.4}.homepage-status.show{display:block}.homepage-status.loading{background:#fff7df;color:#6c4d16}.homepage-status.success{background:var(--mint);color:var(--green)}.homepage-status.error{background:#fff0ec;color:#8e3020}
      .homepage-grid{display:grid;gap:.8rem;margin-top:.9rem}.homepage-slot{background:#fff;border:1px solid var(--line);border-radius:20px;padding:.8rem}.homepage-slot.current{box-shadow:0 10px 28px rgba(32,59,45,.09)}.slot-head{display:grid;grid-template-columns:105px 1fr;gap:.8rem;align-items:center}.slot-preview{width:105px;height:82px;object-fit:cover;border-radius:14px;background:#efe6da}.slot-copy strong,.slot-copy small{display:block}.slot-copy strong{color:var(--deep);font-size:1.05rem}.slot-copy small{color:var(--muted);line-height:1.35;margin-top:.22rem}.slot-selected{margin-top:.45rem;font-size:.72rem;font-weight:900;color:var(--green)}
      .slot-select{width:100%;margin-top:.75rem;padding:.86rem;border:1px solid rgba(75,59,42,.2);border-radius:13px;background:#fff;color:var(--deep)}.slot-actions{display:grid;grid-template-columns:1fr auto;gap:.55rem;margin-top:.6rem}.slot-save,.slot-clear{border:0;border-radius:12px;padding:.78rem;font-weight:900}.slot-save{background:var(--green);color:#fff}.slot-clear{background:#f4e0c5;color:#65411f}.slot-save:disabled,.slot-clear:disabled{opacity:.5}
      .bottom-nav{position:fixed;z-index:5000;left:50%;transform:translateX(-50%);bottom:max(.65rem,env(safe-area-inset-bottom));width:min(calc(100% - 1rem),720px);display:grid;grid-template-columns:repeat(5,1fr);background:rgba(32,21,14,.95);backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:.42rem;box-shadow:0 18px 50px rgba(0,0,0,.28)}.bottom-nav a{display:grid;place-items:center;text-decoration:none;color:#fff;font-size:.62rem;font-weight:800;gap:.12rem;padding:.42rem .15rem;border-radius:13px}.bottom-nav a span{font-size:1.18rem}.bottom-nav a:active{background:rgba(255,255,255,.12)}
      @media(min-width:760px){.homepage-grid{grid-template-columns:repeat(3,1fr)}.slot-head{grid-template-columns:1fr}.slot-preview{width:100%;height:150px}}
    `;
    document.head.appendChild(style);
  }

  function setStatus(text, type = 'success', autoHide = false) {
    const node = document.getElementById('homepage-status');
    if (!node) return;
    node.textContent = text;
    node.className = `homepage-status show ${type}`;
    if (autoHide) {
      window.setTimeout(() => {
        if (node.textContent === text) node.className = 'homepage-status';
      }, 3500);
    }
  }

  function setBusy(busy) {
    document.querySelectorAll('#homepage-manager button,#homepage-manager select').forEach(control => {
      control.disabled = busy;
    });
  }

  function updateStats() {
    const managed = document.getElementById('dashboard-photo-count');
    const featured = document.getElementById('dashboard-featured-count');
    const visible = document.getElementById('dashboard-visible-count');
    if (managed) managed.textContent = photos.length;
    if (featured) featured.textContent = photos.filter(photo => photo.featured).length;
    if (visible) visible.textContent = visiblePhotos().length;
  }

  function createPanel() {
    const mount = document.getElementById('photo-manager-mount');
    if (!mount || document.getElementById('homepage-manager')) return;

    const panel = document.createElement('section');
    panel.className = 'panel vision-panel';
    panel.id = 'homepage-manager';
    panel.innerHTML = `
      <div class="section-title"><h2>Homepage Photos</h2><span>Choose each position</span></div>
      <p style="line-height:1.55;margin-top:0">Pick one different photo for each homepage position. Changes save directly to the website.</p>
      <div class="homepage-toolbar">
        <button class="upload-button" id="homepage-load" type="button">Load Homepage Photos</button>
        <button class="homepage-refresh" id="homepage-refresh" type="button" aria-label="Refresh homepage photos">↻ Refresh</button>
      </div>
      <div class="homepage-status" id="homepage-status" aria-live="polite"></div>
      <div class="homepage-grid" id="homepage-grid" hidden></div>`;
    mount.before(panel);

    document.getElementById('homepage-load').addEventListener('click', () => loadPhotos(true));
    document.getElementById('homepage-refresh').addEventListener('click', () => loadPhotos(true));
  }

  function renderSlots() {
    const grid = document.getElementById('homepage-grid');
    if (!grid) return;
    grid.hidden = false;
    grid.replaceChildren();

    SLOTS.forEach(slot => {
      const current = slotPhoto(slot.key);
      const card = document.createElement('article');
      card.className = `homepage-slot${current ? ' current' : ''}`;
      card.innerHTML = `
        <div class="slot-head">
          <img class="slot-preview" alt="">
          <div class="slot-copy"><strong></strong><small></small><div class="slot-selected"></div></div>
        </div>
        <select class="slot-select" aria-label="Choose photo"><option value="">Choose a photo…</option></select>
        <div class="slot-actions"><button class="slot-save" type="button">Save This Photo</button><button class="slot-clear" type="button">Clear</button></div>`;

      const preview = card.querySelector('.slot-preview');
      const selectedText = card.querySelector('.slot-selected');
      const select = card.querySelector('.slot-select');
      card.querySelector('strong').textContent = slot.name;
      card.querySelector('small').textContent = slot.help;
      preview.src = imageUrl(current);
      preview.alt = current ? titleFor(current) : `${slot.name} placeholder`;
      selectedText.textContent = current ? `Currently: ${titleFor(current)}` : 'No photo selected';

      visiblePhotos().forEach(photo => {
        const option = document.createElement('option');
        option.value = photo.public_id;
        option.textContent = `${CATEGORY_ICONS[photo.category] || '📸'} ${titleFor(photo)}`;
        option.selected = current?.public_id === photo.public_id;
        select.appendChild(option);
      });

      select.addEventListener('change', () => {
        const selected = photos.find(photo => photo.public_id === select.value);
        preview.src = imageUrl(selected);
        preview.alt = selected ? titleFor(selected) : `${slot.name} placeholder`;
      });
      card.querySelector('.slot-save').addEventListener('click', () => saveSlot(slot.key, select.value));
      card.querySelector('.slot-clear').addEventListener('click', () => clearSlot(slot.key));
      grid.appendChild(card);
    });
  }

  async function loadPhotos(showMessage = false) {
    if (loading) return;
    loading = true;
    setBusy(true);
    if (showMessage || !photos.length) setStatus('Loading your latest photos…', 'loading');

    try {
      const data = await api('/admin/photos');
      photos = Array.isArray(data.resources) ? data.resources : [];
      lastLoadedAt = Date.now();
      renderSlots();
      updateStats();
      document.getElementById('homepage-load').textContent = 'Photos Loaded';
      setStatus('Homepage photos are ready.', 'success', true);
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      loading = false;
      setBusy(false);
    }
  }

  async function saveSlot(slot, publicId) {
    if (!publicId) {
      setStatus('Choose a photo before saving.', 'error');
      return;
    }

    const usedElsewhere = photos.find(photo => photo.public_id === publicId && photo.homepage_slot && photo.homepage_slot !== slot);
    if (usedElsewhere) {
      const other = SLOTS.find(item => item.key === usedElsewhere.homepage_slot)?.name || 'another position';
      setStatus(`That photo is already used for ${other}. Choose a different photo.`, 'error');
      return;
    }

    setBusy(true);
    setStatus('Saving homepage photo…', 'loading');
    try {
      await api('/admin/photo', {
        method: 'POST',
        body: JSON.stringify({ public_id: publicId, action: 'set-homepage-slot', slot })
      });
      await loadPhotos(false);
      setStatus('Saved. Refresh the public homepage to see the change.', 'success', true);
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function clearSlot(slot) {
    const current = slotPhoto(slot);
    if (!current) {
      setStatus('That homepage position is already empty.', 'success', true);
      return;
    }

    setBusy(true);
    setStatus('Clearing homepage position…', 'loading');
    try {
      await api('/admin/photo', {
        method: 'POST',
        body: JSON.stringify({ public_id: current.public_id, action: 'clear-homepage-slot', slot })
      });
      await loadPhotos(false);
      setStatus('Homepage position cleared.', 'success', true);
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  function addSmartUpload() {
    const title = document.getElementById('title');
    const story = document.getElementById('story');
    if (!title || !story || document.querySelector('.smart-upload-row')) return;

    const row = document.createElement('div');
    row.className = 'smart-upload-row';
    row.style.cssText = 'display:flex;gap:.55rem;flex-wrap:wrap;margin:.8rem 0';
    row.innerHTML = '<button class="homepage-refresh" type="button">✨ Suggest words</button><button class="homepage-refresh" type="button">Clear</button>';
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
      const category = document.querySelector('.category.active')?.dataset.value || 'farm-life';
      const [suggestedTitle, suggestedStory] = suggestions[category];
      if (!title.value.trim()) title.value = suggestedTitle;
      if (!story.value.trim()) story.value = suggestedStory;
    });
    row.children[1].addEventListener('click', () => {
      title.value = '';
      story.value = '';
    });
  }

  function createBottomNav() {
    if (document.querySelector('.bottom-nav')) return;
    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    nav.setAttribute('aria-label', 'Admin shortcuts');
    nav.innerHTML = '<a href="#"><span>🏠</span>Home</a><a href="#new-photo"><span>📷</span>Upload</a><a href="#homepage-manager"><span>⭐</span>Homepage</a><a href="#photo-manager-mount"><span>🖼️</span>Photos</a><a href="#egg-inventory"><span>🥚</span>Eggs</a>';
    document.body.appendChild(nav);
  }

  function refreshWhenNeeded() {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && Date.now() - lastLoadedAt > 15000) loadPhotos(false);
    });
    window.addEventListener('focus', () => {
      if (Date.now() - lastLoadedAt > 15000) loadPhotos(false);
    });
  }

  function initialize() {
    injectStyles();
    createPanel();
    addSmartUpload();
    createBottomNav();
    refreshWhenNeeded();
    window.setTimeout(() => loadPhotos(false), 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
  else initialize();
})();
