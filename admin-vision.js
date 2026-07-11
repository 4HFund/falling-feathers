(() => {
  const CLOUD_NAME = 'ixfa510d';
  const PIN_KEY = 'falling-feathers-admin-pin';
  const SLOTS = [
    { key: 'homepage-hero', name: 'Top Homepage Photo', help: 'The large main photo near the top of the homepage.' },
    { key: 'homepage-story-1', name: 'Homepage Story Card 1', help: 'The first optional photo and story farther down the homepage.' },
    { key: 'homepage-story-2', name: 'Homepage Story Card 2', help: 'The second optional photo and story farther down the homepage.' }
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

  function contextValue(photo, key, fallback = '') {
    return photo?.context?.custom?.[key] || photo?.context?.[key] || fallback;
  }

  function titleFor(photo) {
    return contextValue(photo, 'title', 'Untitled photo');
  }

  function descriptionFor(photo) {
    return contextValue(photo, 'description', '');
  }

  function imageUrl(photo, width = 520) {
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,c_fill,w_${width},h_${Math.round(width * .72)}/${photo.public_id}.${photo.format}`;
  }

  function slotPhoto(slot) {
    return photos.find(photo => photo.homepage_slot === slot) || null;
  }

  function visiblePhotos() {
    return photos.filter(photo => photo.website_status !== 'hidden');
  }

  function currentHomepageCount() {
    return SLOTS.filter(slot => slotPhoto(slot.key)).length;
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      body{padding-bottom:calc(6rem + env(safe-area-inset-bottom))}.vision-panel{scroll-margin-top:90px}
      .homepage-toolbar{display:flex;gap:.6rem;align-items:center;flex-wrap:wrap}.homepage-toolbar .upload-button{margin:0;flex:1}.homepage-refresh{border:1px solid rgba(75,59,42,.18);background:#fff;border-radius:15px;padding:1rem;font-weight:900;color:var(--brown)}
      .homepage-count-control{background:#f7ead3;border:1px solid rgba(199,148,31,.25);border-radius:16px;padding:1rem;margin:.8rem 0}.homepage-count-control label{display:block;font-weight:900;color:var(--deep);margin-bottom:.5rem}.homepage-count-row{display:grid;grid-template-columns:1fr auto;gap:.6rem}.homepage-count-row select{width:100%;padding:.85rem;border:1px solid rgba(75,59,42,.2);border-radius:13px;background:#fff;font-weight:800}.homepage-count-row button{border:0;border-radius:13px;background:var(--green);color:#fff;padding:.85rem 1rem;font-weight:900}
      .homepage-status{display:none;margin:.8rem 0 0;padding:.82rem;border-radius:13px;font-weight:800;line-height:1.4}.homepage-status.show{display:block}.homepage-status.loading{background:#fff7df;color:#6c4d16}.homepage-status.success{background:var(--mint);color:var(--green)}.homepage-status.error{background:#fff0ec;color:#8e3020}
      .homepage-grid{display:grid;gap:.8rem;margin-top:.9rem}.homepage-slot{background:#fff;border:1px solid var(--line);border-radius:20px;padding:.9rem}.homepage-slot.current{box-shadow:0 10px 28px rgba(32,59,45,.09)}.slot-head{display:grid;grid-template-columns:105px 1fr;gap:.8rem;align-items:center}.slot-visual{width:105px;height:82px;border-radius:14px;background:#f4eadc;border:1px dashed rgba(75,59,42,.22);display:grid;place-items:center;overflow:hidden}.slot-preview{width:100%;height:100%;object-fit:cover}.slot-empty{font-size:.7rem;font-weight:900;color:var(--muted);text-align:center;line-height:1.25;padding:.4rem}.slot-copy strong,.slot-copy small{display:block}.slot-copy strong{color:var(--deep);font-size:1.05rem}.slot-copy small{color:var(--muted);line-height:1.35;margin-top:.22rem}.slot-selected{margin-top:.45rem;font-size:.72rem;font-weight:900;color:var(--green)}
      .slot-select,.slot-text input,.slot-text textarea{width:100%;padding:.84rem;border:1px solid rgba(75,59,42,.2);border-radius:13px;background:#fff;color:var(--deep)}.slot-select{margin-top:.75rem}.slot-text{display:grid;gap:.6rem;margin-top:.7rem}.slot-text label{display:block;font-size:.72rem;font-weight:900;color:var(--deep);margin-bottom:.3rem}.slot-text textarea{min-height:90px;resize:vertical;font-family:inherit}.slot-actions{display:grid;grid-template-columns:1fr auto;gap:.55rem;margin-top:.7rem}.slot-save,.slot-clear{border:0;border-radius:12px;padding:.82rem;font-weight:900}.slot-save{background:var(--green);color:#fff}.slot-clear{background:#f4e0c5;color:#65411f}.slot-save:disabled,.slot-clear:disabled{opacity:.5}
      .bottom-nav{position:fixed;z-index:5000;left:50%;transform:translateX(-50%);bottom:max(.65rem,env(safe-area-inset-bottom));width:min(calc(100% - 1rem),720px);display:grid;grid-template-columns:repeat(5,1fr);background:rgba(32,21,14,.95);backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:.42rem;box-shadow:0 18px 50px rgba(0,0,0,.28)}.bottom-nav a{display:grid;place-items:center;text-decoration:none;color:#fff;font-size:.62rem;font-weight:800;gap:.12rem;padding:.42rem .15rem;border-radius:13px}.bottom-nav a span{font-size:1.18rem}.bottom-nav a:active{background:rgba(255,255,255,.12)}
      @media(min-width:760px){.homepage-grid{grid-template-columns:repeat(3,1fr)}.slot-head{grid-template-columns:1fr}.slot-visual{width:100%;height:150px}}
    `;
    document.head.appendChild(style);
  }

  function setStatus(text, type = 'success', autoHide = false) {
    const node = document.getElementById('homepage-status');
    if (!node) return;
    node.textContent = text;
    node.className = `homepage-status show ${type}`;
    if (autoHide) window.setTimeout(() => {
      if (node.textContent === text) node.className = 'homepage-status';
    }, 3500);
  }

  function setBusy(busy) {
    document.querySelectorAll('#homepage-manager button,#homepage-manager select,#homepage-manager input,#homepage-manager textarea').forEach(control => {
      control.disabled = busy;
    });
  }

  function simplifyVision() {
    document.querySelectorAll('.module').forEach(module => {
      if (module.querySelector('strong')?.textContent.trim() === 'Health records') module.remove();
    });
  }

  function createPanel() {
    const mount = document.getElementById('photo-manager-mount');
    if (!mount || document.getElementById('homepage-manager')) return;

    const panel = document.createElement('section');
    panel.className = 'panel vision-panel';
    panel.id = 'homepage-manager';
    panel.innerHTML = `
      <div class="section-title"><h2>Homepage Photos</h2><span>Photos and wording</span></div>
      <p style="line-height:1.55;margin-top:0">Choose how many photos appear on the homepage, which photos are used, and the title and description shown with each one.</p>
      <div class="homepage-count-control">
        <label for="homepage-photo-count">How many homepage photos should show?</label>
        <div class="homepage-count-row"><select id="homepage-photo-count"><option value="0">0 photos</option><option value="1">1 photo</option><option value="2">2 photos</option><option value="3">3 photos</option></select><button id="homepage-count-save" type="button">Apply</button></div>
      </div>
      <div class="homepage-toolbar"><button class="upload-button" id="homepage-load" type="button">Load Homepage Photos</button><button class="homepage-refresh" id="homepage-refresh" type="button">↻ Refresh</button></div>
      <div class="homepage-status" id="homepage-status" aria-live="polite"></div>
      <div class="homepage-grid" id="homepage-grid" hidden></div>`;
    mount.before(panel);

    document.getElementById('homepage-load').addEventListener('click', () => loadPhotos(true));
    document.getElementById('homepage-refresh').addEventListener('click', () => loadPhotos(true));
    document.getElementById('homepage-count-save').addEventListener('click', applyHomepageCount);
  }

  function renderSlots() {
    const grid = document.getElementById('homepage-grid');
    if (!grid) return;
    grid.hidden = false;
    grid.replaceChildren();
    document.getElementById('homepage-photo-count').value = String(currentHomepageCount());

    SLOTS.forEach(slot => {
      const current = slotPhoto(slot.key);
      const card = document.createElement('article');
      card.className = `homepage-slot${current ? ' current' : ''}`;
      card.innerHTML = `
        <div class="slot-head"><div class="slot-visual"><img class="slot-preview" alt=""><div class="slot-empty">EMPTY<br>POSITION</div></div><div class="slot-copy"><strong></strong><small></small><div class="slot-selected"></div></div></div>
        <select class="slot-select"><option value="">Choose a photo…</option></select>
        <div class="slot-text"><div><label>Title shown with this photo</label><input class="slot-title" maxlength="90" placeholder="Example: New Bantam Crew"></div><div><label>Description shown with this photo</label><textarea class="slot-description" maxlength="280" placeholder="Example: Came home with these little guys today."></textarea></div></div>
        <div class="slot-actions"><button class="slot-save" type="button">Save Photo & Words</button><button class="slot-clear" type="button">Remove</button></div>`;

      const preview = card.querySelector('.slot-preview');
      const empty = card.querySelector('.slot-empty');
      const selectedText = card.querySelector('.slot-selected');
      const select = card.querySelector('.slot-select');
      const titleInput = card.querySelector('.slot-title');
      const descriptionInput = card.querySelector('.slot-description');
      const clearButton = card.querySelector('.slot-clear');
      card.querySelector('strong').textContent = slot.name;
      card.querySelector('small').textContent = slot.help;

      function showSelection(photo) {
        if (photo) {
          preview.src = imageUrl(photo);
          preview.alt = titleFor(photo);
          preview.hidden = false;
          empty.hidden = true;
          titleInput.value = titleFor(photo) === 'Untitled photo' ? '' : titleFor(photo);
          descriptionInput.value = descriptionFor(photo);
        } else {
          preview.removeAttribute('src');
          preview.alt = '';
          preview.hidden = true;
          empty.hidden = false;
          titleInput.value = '';
          descriptionInput.value = '';
        }
      }

      showSelection(current);
      selectedText.textContent = current ? `Currently showing: ${titleFor(current)}` : 'Nothing is currently showing here';
      clearButton.disabled = !current;

      visiblePhotos().forEach(photo => {
        const option = document.createElement('option');
        option.value = photo.public_id;
        option.textContent = `${CATEGORY_ICONS[photo.category] || '📸'} ${titleFor(photo)}`;
        option.selected = current?.public_id === photo.public_id;
        select.appendChild(option);
      });

      select.addEventListener('change', () => showSelection(photos.find(photo => photo.public_id === select.value)));
      card.querySelector('.slot-save').addEventListener('click', () => saveSlot(slot.key, select.value, titleInput.value, descriptionInput.value));
      clearButton.addEventListener('click', () => clearSlot(slot.key));
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
      document.getElementById('homepage-load').textContent = 'Photos Loaded';
      setStatus('Homepage controls are ready.', 'success', true);
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      loading = false;
      setBusy(false);
    }
  }

  async function saveSlot(slot, publicId, title, description) {
    if (!publicId) return setStatus('Choose a photo before saving.', 'error');
    const photo = photos.find(item => item.public_id === publicId);
    const usedElsewhere = photos.find(item => item.public_id === publicId && item.homepage_slot && item.homepage_slot !== slot);
    if (usedElsewhere) return setStatus('That photo is already being used in another homepage position.', 'error');

    setBusy(true);
    setStatus('Saving photo and wording…', 'loading');
    try {
      await api('/admin/photo', { method: 'POST', body: JSON.stringify({ public_id: publicId, action: 'set-homepage-slot', slot }) });
      await api('/admin/photo', { method: 'POST', body: JSON.stringify({ public_id: publicId, action: 'edit', title: title.trim(), description: description.trim(), category: photo?.category || 'farm-life', tags: photo?.tags || [] }) });
      await loadPhotos(false);
      setStatus('Homepage photo and wording saved.', 'success', true);
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function clearSlot(slot) {
    const current = slotPhoto(slot);
    if (!current) return;
    setBusy(true);
    setStatus('Removing homepage photo…', 'loading');
    try {
      await api('/admin/photo', { method: 'POST', body: JSON.stringify({ public_id: current.public_id, action: 'clear-homepage-slot', slot }) });
      await loadPhotos(false);
      setStatus('Homepage photo removed.', 'success', true);
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function applyHomepageCount() {
    const desired = Number(document.getElementById('homepage-photo-count').value);
    const assigned = SLOTS.map(slot => ({ slot, photo: slotPhoto(slot.key) }));
    const missing = assigned.slice(0, desired).filter(item => !item.photo);
    if (missing.length) return setStatus(`Choose and save photos for the first ${desired} position${desired === 1 ? '' : 's'} before applying this number.`, 'error');

    setBusy(true);
    setStatus('Updating the number of homepage photos…', 'loading');
    try {
      for (const item of assigned.slice(desired)) {
        if (item.photo) await api('/admin/photo', { method: 'POST', body: JSON.stringify({ public_id: item.photo.public_id, action: 'clear-homepage-slot', slot: item.slot.key }) });
      }
      await loadPhotos(false);
      setStatus(`Homepage will now show ${desired} photo${desired === 1 ? '' : 's'}.`, 'success', true);
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  function createBottomNav() {
    if (document.querySelector('.bottom-nav')) return;
    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    nav.innerHTML = '<a href="#"><span>🏠</span>Home</a><a href="#new-photo"><span>📷</span>Upload</a><a href="#homepage-manager"><span>⭐</span>Homepage</a><a href="#photo-manager-mount"><span>🖼️</span>Photos</a><a href="#egg-inventory"><span>🥚</span>Eggs</a>';
    document.body.appendChild(nav);
  }

  function initialize() {
    injectStyles();
    simplifyVision();
    createPanel();
    createBottomNav();
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && Date.now() - lastLoadedAt > 15000) loadPhotos(false);
    });
    window.setTimeout(() => loadPhotos(false), 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
  else initialize();
})();
