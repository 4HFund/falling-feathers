(() => {
  const CLOUD_NAME = 'ixfa510d';
  const WORKER_URL_KEY = 'falling-feathers-worker-url';
  const PIN_KEY = 'falling-feathers-admin-pin';
  const CATEGORIES = [
    ['ducks', '🦆 Ducks'],
    ['chickens', '🐔 Chickens'],
    ['quail', '🪶 Quail'],
    ['eggs', '🥚 Eggs'],
    ['around-the-hollow', '🌲 Around the Hollow']
  ];
  const LEGACY_MAP = { babies: 'around-the-hollow', rescues: 'around-the-hollow', 'farm-life': 'around-the-hollow' };
  let photos = [];
  let activeFilter = 'all';
  let searchTerm = '';
  let lastFocused = null;

  const configuredApiBase = () => String(window.FFH_CONFIG?.apiBase || localStorage.getItem(WORKER_URL_KEY) || '').trim().replace(/\/$/, '');
  const adminPin = () => sessionStorage.getItem(PIN_KEY) || '';
  const titleFor = photo => photo.context?.custom?.title || photo.context?.title || 'Untitled photo';
  const descriptionFor = photo => photo.context?.custom?.description || photo.context?.description || '';
  const normalizedCategory = value => CATEGORIES.some(([key]) => key === value) ? value : (LEGACY_MAP[value] || 'around-the-hollow');
  const categoryLabel = value => CATEGORIES.find(([key]) => key === normalizedCategory(value))?.[1] || '🌲 Around the Hollow';
  const imageUrl = (photo, width = 640) => `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,c_fill,w_${width},h_${width}/${photo.public_id}.${photo.format}`;

  function ensureStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .manager-toolbar{display:grid;gap:.7rem;margin:1rem 0}.manager-toolbar input,.manager-toolbar select{width:100%;padding:.9rem;border:1px solid rgba(75,59,42,.2);border-radius:13px;background:#fff}.manager-stats{display:flex;gap:.5rem;flex-wrap:wrap;margin:.7rem 0}.manager-chip{border:0;border-radius:999px;padding:.5rem .75rem;font-weight:900;background:#f4e0c5;color:#5c4329}.manager-chip.active{background:#2f4b35;color:#fff}.manager-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.8rem}.manager-card{background:#fff;border:1px solid rgba(209,167,111,.35);border-radius:18px;overflow:hidden;box-shadow:0 8px 24px rgba(75,59,42,.08)}.manager-card.is-hidden{opacity:.65}.manager-card-image{position:relative}.manager-card img{display:block;width:100%;aspect-ratio:1/1;object-fit:cover}.manager-status-badge{position:absolute;top:.55rem;left:.55rem;border-radius:999px;padding:.3rem .55rem;font-size:.68rem;font-weight:900;background:rgba(36,26,18,.82);color:#fff}.manager-featured{position:absolute;top:.55rem;right:.55rem;border-radius:999px;padding:.3rem .5rem;background:#c7941f;color:#fff;font-size:.75rem;font-weight:900}.manager-card-body{padding:.75rem}.manager-card h3{font-size:.93rem;margin:0;color:#241a12;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.manager-card p{font-size:.76rem;margin:.3rem 0;color:#77634e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.manager-actions{display:grid;grid-template-columns:1fr 1fr;gap:.45rem;margin-top:.65rem}.manager-actions button{border:0;border-radius:10px;padding:.55rem .4rem;font-size:.74rem;font-weight:900;background:#f4e0c5;color:#5c4329}.manager-actions .danger{background:#fff0ec;color:#9b2f1c}.manager-actions .restore{background:#eaf4e6;color:#2f4b35}.manager-modal{position:fixed;inset:0;z-index:9999;background:rgba(24,18,13,.72);display:none;align-items:flex-end;justify-content:center;padding:1rem}.manager-modal.open{display:flex}.manager-modal-card{width:min(620px,100%);max-height:92vh;overflow:auto;background:#fffdf8;border-radius:24px;padding:1.2rem;box-shadow:0 30px 80px rgba(0,0,0,.35)}.manager-modal-card h2{font-family:Lora,serif;margin:.2rem 0 1rem;color:#241a12}.manager-modal-actions{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}.manager-secondary{border:1px solid rgba(75,59,42,.18);background:#fff;border-radius:14px;padding:.9rem;font-weight:900;color:#4b3b2a}.manager-empty{grid-column:1/-1;text-align:center;padding:2rem;color:#77634e}.manager-setup{background:#fff6dd;border:1px solid #ead59a;border-radius:16px;padding:1rem;margin:1rem 0}@media(min-width:680px){.manager-toolbar{grid-template-columns:2fr 1fr}.manager-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
    `;
    document.head.appendChild(style);
  }

  function createPanel() {
    const panel = document.createElement('section');
    panel.className = 'panel';
    panel.id = 'sitewide-photo-manager';
    panel.innerHTML = `
      <div class="section-title"><h2>Photo manager</h2><span id="manager-count">Secure site-wide controls</span></div>
      <p style="line-height:1.55;margin-top:0">Manage the Hollow moments shared in the public gallery.</p>
      <div class="manager-setup" id="manager-setup" hidden><strong>Connect the secure API</strong><div class="field"><label for="manager-api-url">Cloudflare Worker URL</label><input id="manager-api-url" inputmode="url" placeholder="https://example.workers.dev"><small>Stored only on this device until added to site-config.js.</small></div><button class="upload-button" id="manager-save-url" type="button">Save API Address</button></div>
      <button class="upload-button" id="manager-login" type="button">Unlock Photo Manager</button>
      <div class="result" id="manager-message" aria-live="polite"></div>
      <div id="manager-content" hidden><div class="manager-toolbar"><input id="manager-search" type="search" placeholder="Search titles, descriptions, or file names"><select id="manager-category"><option value="all">All categories</option>${CATEGORIES.map(([key,label]) => `<option value="${key}">${label}</option>`).join('')}</select></div><div class="manager-stats"><button class="manager-chip active" data-status="all">All</button><button class="manager-chip" data-status="visible">Visible</button><button class="manager-chip" data-status="hidden">Hidden</button><button class="manager-chip" data-status="featured">Featured</button></div><div class="manager-grid" id="manager-grid"></div></div>`;
    document.getElementById('photo-manager-mount')?.replaceWith(panel);
    return panel;
  }

  function createModal() {
    const modal = document.createElement('div');
    modal.className = 'manager-modal';
    modal.id = 'manager-modal';
    modal.innerHTML = `<div class="manager-modal-card" role="dialog" aria-modal="true" aria-labelledby="manager-edit-heading"><h2 id="manager-edit-heading">Edit photo</h2><div class="field"><label for="manager-edit-title">Title</label><input id="manager-edit-title" maxlength="80"></div><div class="field"><label for="manager-edit-description">Story or description</label><textarea id="manager-edit-description" maxlength="500"></textarea></div><div class="field"><label for="manager-edit-category">Category</label><select id="manager-edit-category" style="width:100%;padding:1rem;border:1px solid rgba(75,59,42,.2);border-radius:14px;background:white">${CATEGORIES.map(([key,label]) => `<option value="${key}">${label}</option>`).join('')}</select></div><div class="manager-modal-actions"><button class="manager-secondary" id="manager-cancel-edit" type="button">Cancel</button><button class="upload-button" id="manager-save-edit" type="button" style="margin:0">Save Changes</button></div></div>`;
    document.body.appendChild(modal);
    return modal;
  }

  function showMessage(message, type = 'success') {
    const element = document.getElementById('manager-message');
    if (!element) return;
    element.textContent = message;
    element.className = `result show ${type}`;
  }

  async function api(path, options = {}) {
    const base = configuredApiBase();
    if (!base) throw new Error('The secure API address has not been configured.');
    const response = await fetch(`${base}${path}`, { ...options, headers: { 'Content-Type': 'application/json', 'X-Admin-Pin': adminPin(), ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) sessionStorage.removeItem(PIN_KEY);
      throw new Error(data.error || `Request failed with ${response.status}`);
    }
    return data;
  }

  function matchesFilters(photo) {
    const category = document.getElementById('manager-category')?.value || 'all';
    const haystack = `${titleFor(photo)} ${descriptionFor(photo)} ${photo.public_id}`.toLowerCase();
    const statusMatch = activeFilter === 'all' || photo.website_status === activeFilter || (activeFilter === 'featured' && photo.featured);
    return statusMatch && (category === 'all' || normalizedCategory(photo.category) === category) && haystack.includes(searchTerm);
  }

  function render() {
    const grid = document.getElementById('manager-grid');
    if (!grid) return;
    const filtered = photos.filter(matchesFilters);
    grid.replaceChildren();
    document.getElementById('manager-count').textContent = `${photos.length} managed · ${filtered.length} shown`;
    if (!filtered.length) { const empty = document.createElement('div'); empty.className = 'manager-empty'; empty.textContent = 'No photos match these filters.'; grid.appendChild(empty); return; }
    filtered.forEach(photo => {
      const card = document.createElement('article');
      card.className = `manager-card${photo.website_status === 'hidden' ? ' is-hidden' : ''}`;
      card.innerHTML = `<div class="manager-card-image"><img alt=""><span class="manager-status-badge"></span>${photo.featured ? '<span class="manager-featured">★ Featured</span>' : ''}</div><div class="manager-card-body"><h3></h3><p></p><div class="manager-actions"><button data-action="edit">Edit</button><button data-action="feature"></button><button data-action="visibility"></button><button class="danger" data-action="delete">Delete</button></div></div>`;
      card.querySelector('img').src = imageUrl(photo);
      card.querySelector('img').alt = titleFor(photo);
      card.querySelector('.manager-status-badge').textContent = photo.website_status === 'hidden' ? 'Hidden' : 'Visible';
      card.querySelector('h3').textContent = titleFor(photo);
      card.querySelector('p').textContent = categoryLabel(photo.category);
      card.querySelector('[data-action="feature"]').textContent = photo.featured ? 'Unfeature' : 'Feature';
      const visibility = card.querySelector('[data-action="visibility"]');
      visibility.textContent = photo.website_status === 'hidden' ? 'Restore' : 'Hide';
      if (photo.website_status === 'hidden') visibility.classList.add('restore');
      card.addEventListener('click', event => { const action = event.target.closest('button')?.dataset.action; if (action) handleAction(photo, action); });
      grid.appendChild(card);
    });
  }

  async function loadPhotos() {
    showMessage('Loading your Cloudinary library…');
    const data = await api('/admin/photos');
    photos = Array.isArray(data.resources) ? data.resources.map(photo => ({ ...photo, category: normalizedCategory(photo.category) })) : [];
    document.getElementById('manager-content').hidden = false;
    document.getElementById('manager-login').textContent = 'Refresh Photos';
    showMessage('Photo manager is ready.');
    render();
  }

  async function mutate(photo, action) {
    await api('/admin/photo', { method: 'POST', body: JSON.stringify({ public_id: photo.public_id, action }) });
    if (action === 'hide') photo.website_status = 'hidden';
    if (action === 'restore') photo.website_status = 'visible';
    if (action === 'feature') photo.featured = true;
    if (action === 'unfeature') photo.featured = false;
    render();
    showMessage('Change saved. The public gallery updates automatically.');
  }

  async function deletePhoto(photo) {
    if (!window.confirm(`Permanently delete “${titleFor(photo)}” from Cloudinary? This cannot be undone.`)) return;
    await api('/admin/photo', { method: 'DELETE', body: JSON.stringify({ public_id: photo.public_id }) });
    photos = photos.filter(item => item.public_id !== photo.public_id);
    render();
    showMessage('Photo permanently deleted.');
  }

  function closeEditor() {
    const modal = document.getElementById('manager-modal');
    modal.classList.remove('open');
    lastFocused?.focus?.();
  }

  function openEditor(photo) {
    lastFocused = document.activeElement;
    const modal = document.getElementById('manager-modal');
    modal.dataset.publicId = photo.public_id;
    document.getElementById('manager-edit-title').value = titleFor(photo) === 'Untitled photo' ? '' : titleFor(photo);
    document.getElementById('manager-edit-description').value = descriptionFor(photo);
    document.getElementById('manager-edit-category').value = normalizedCategory(photo.category);
    modal.classList.add('open');
    document.getElementById('manager-edit-title').focus();
  }

  async function saveEditor() {
    const modal = document.getElementById('manager-modal');
    const photo = photos.find(item => item.public_id === modal.dataset.publicId);
    if (!photo) return;
    const title = document.getElementById('manager-edit-title').value.trim();
    const description = document.getElementById('manager-edit-description').value.trim();
    const category = document.getElementById('manager-edit-category').value;
    await api('/admin/photo', { method: 'POST', body: JSON.stringify({ public_id: photo.public_id, action: 'edit', title, description, category, tags: photo.tags || [] }) });
    photo.category = category;
    photo.context = { ...(photo.context || {}), custom: { ...(photo.context?.custom || {}), title, description } };
    closeEditor();
    render();
    showMessage('Title, story, and category updated.');
  }

  function handleAction(photo, action) {
    const task = action === 'edit' ? (openEditor(photo), null) : action === 'delete' ? deletePhoto(photo) : action === 'feature' ? mutate(photo, photo.featured ? 'unfeature' : 'feature') : action === 'visibility' ? mutate(photo, photo.website_status === 'hidden' ? 'restore' : 'hide') : null;
    task?.catch(error => showMessage(error.message, 'error'));
  }

  async function unlock() {
    if (!configuredApiBase()) { document.getElementById('manager-setup').hidden = false; showMessage('Save the Worker address first.', 'error'); return; }
    let pin = adminPin();
    if (!pin) pin = window.prompt('Enter your Hollow Admin PIN:') || '';
    if (!pin) return;
    sessionStorage.setItem(PIN_KEY, pin);
    try { await loadPhotos(); } catch (error) { showMessage(error.message, 'error'); }
  }

  function initialize() {
    ensureStyles(); createPanel(); createModal();
    const setup = document.getElementById('manager-setup');
    if (!configuredApiBase()) setup.hidden = false; else document.getElementById('manager-api-url').value = configuredApiBase();
    document.getElementById('manager-save-url').addEventListener('click', () => { const value = document.getElementById('manager-api-url').value.trim().replace(/\/$/, ''); if (!/^https:\/\//i.test(value)) return showMessage('Enter the full HTTPS Worker address.', 'error'); localStorage.setItem(WORKER_URL_KEY, value); setup.hidden = true; showMessage('Secure API address saved on this device.'); });
    document.getElementById('manager-login').addEventListener('click', unlock);
    document.getElementById('manager-search').addEventListener('input', event => { searchTerm = event.target.value.toLowerCase().trim(); render(); });
    document.getElementById('manager-category').addEventListener('change', render);
    document.querySelector('.manager-stats').addEventListener('click', event => { const chip = event.target.closest('[data-status]'); if (!chip) return; activeFilter = chip.dataset.status; document.querySelectorAll('.manager-chip').forEach(item => item.classList.toggle('active', item === chip)); render(); });
    document.getElementById('manager-cancel-edit').addEventListener('click', closeEditor);
    document.getElementById('manager-save-edit').addEventListener('click', () => saveEditor().catch(error => showMessage(error.message, 'error')));
    document.getElementById('manager-modal').addEventListener('click', event => { if (event.target.id === 'manager-modal') closeEditor(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && document.getElementById('manager-modal')?.classList.contains('open')) closeEditor(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize); else initialize();
})();
