(() => {
  const WORKER_URL_KEY = 'falling-feathers-worker-url';
  const PIN_KEY = 'falling-feathers-admin-pin';
  const CLOUD_NAME = 'ixfa510d';

  function workerUrl() {
    return (localStorage.getItem(WORKER_URL_KEY) || '').replace(/\/$/, '');
  }

  function adminPin() {
    return sessionStorage.getItem(PIN_KEY) || '';
  }

  function cloudinaryImage(photo, width = 500) {
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,c_fill,w_${width},h_${width}/${photo.public_id}.${photo.format}`;
  }

  function titleFor(photo) {
    return photo.context?.custom?.title || photo.context?.custom?.caption || photo.context?.title || photo.context?.caption || 'Untitled photo';
  }

  function createManagerPanel() {
    const panel = document.createElement('section');
    panel.className = 'panel';
    panel.id = 'sitewide-photo-manager';
    panel.innerHTML = `
      <div class="section-title">
        <h2>Manage website photos</h2>
        <span id="manager-status">Secure controls</span>
      </div>
      <p style="line-height:1.6;margin-top:0">Hide or restore photos for every visitor. Photos remain safely stored in Cloudinary.</p>
      <div id="manager-setup" style="display:none">
        <div class="field">
          <label for="worker-url">Cloudflare Worker URL</label>
          <input id="worker-url" inputmode="url" placeholder="https://falling-feathers-admin.your-name.workers.dev" />
          <small>Paste this once after the Worker is deployed.</small>
        </div>
        <button class="upload-button" id="save-worker-url" type="button">Save Worker Address</button>
      </div>
      <button class="upload-button" id="load-managed-photos" type="button">Load Website Photos</button>
      <div class="result" id="manager-message" aria-live="polite"></div>
      <div class="recent-grid" id="managed-photo-grid" style="margin-top:1rem"></div>
    `;

    const existingTools = document.querySelector('.panel:last-of-type');
    if (existingTools) existingTools.before(panel);
    else document.querySelector('main')?.appendChild(panel);

    return panel;
  }

  function showMessage(message, type = 'success') {
    const box = document.getElementById('manager-message');
    box.textContent = message;
    box.className = `result show ${type}`;
  }

  async function request(path, options = {}) {
    const base = workerUrl();
    if (!base) throw new Error('Worker URL has not been saved yet.');

    let pin = adminPin();
    if (!pin) {
      pin = window.prompt('Enter your Hollow Admin PIN:') || '';
      if (!pin) throw new Error('Admin PIN is required.');
      sessionStorage.setItem(PIN_KEY, pin);
    }

    const response = await fetch(`${base}${path}`, {
      ...options,
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

  async function changeVisibility(photo, action, card, button) {
    button.disabled = true;
    button.textContent = action === 'hide' ? 'Hiding…' : 'Restoring…';

    try {
      await request(`/${action}`, {
        method: 'POST',
        body: JSON.stringify({ public_id: photo.public_id })
      });

      photo.website_status = action === 'hide' ? 'hidden' : 'visible';
      renderManagedCard(photo, card);
      showMessage(action === 'hide'
        ? 'Photo hidden site-wide. It will disappear after the next gallery sync.'
        : 'Photo restored site-wide. It will return after the next gallery sync.');
    } catch (error) {
      button.disabled = false;
      button.textContent = action === 'hide' ? 'Hide from Website' : 'Restore to Website';
      showMessage(error.message, 'error');
    }
  }

  function renderManagedCard(photo, existingCard = null) {
    const card = existingCard || document.createElement('article');
    card.className = `recent-card${photo.website_status === 'hidden' ? ' hidden-photo' : ''}`;
    card.replaceChildren();

    const image = document.createElement('img');
    const copy = document.createElement('div');
    const title = document.createElement('strong');
    const meta = document.createElement('small');
    const button = document.createElement('button');

    image.src = cloudinaryImage(photo);
    image.alt = titleFor(photo);
    title.textContent = titleFor(photo);
    meta.textContent = photo.website_status === 'hidden' ? 'Hidden from website' : 'Visible on website';
    button.type = 'button';
    button.className = `hide-button${photo.website_status === 'hidden' ? ' restore' : ''}`;
    button.textContent = photo.website_status === 'hidden' ? 'Restore to Website' : 'Hide from Website';
    button.addEventListener('click', () => changeVisibility(
      photo,
      photo.website_status === 'hidden' ? 'restore' : 'hide',
      card,
      button
    ));

    copy.append(title, meta, button);
    card.append(image, copy);
    return card;
  }

  async function loadPhotos() {
    const grid = document.getElementById('managed-photo-grid');
    const button = document.getElementById('load-managed-photos');
    button.disabled = true;
    button.textContent = 'Loading photos…';
    grid.replaceChildren();

    try {
      const data = await request('/photos');
      const photos = Array.isArray(data.resources) ? data.resources : [];
      photos.forEach(photo => grid.appendChild(renderManagedCard(photo)));
      document.getElementById('manager-status').textContent = `${photos.length} photos`;
      showMessage(photos.length ? 'Website photos loaded.' : 'No website photos were found.');
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Refresh Website Photos';
    }
  }

  function initialize() {
    document.querySelectorAll('.hide-button').forEach(button => {
      if (!button.closest('#sitewide-photo-manager')) button.style.display = 'none';
    });

    const panel = createManagerPanel();
    const setup = panel.querySelector('#manager-setup');
    const urlInput = panel.querySelector('#worker-url');
    const loadButton = panel.querySelector('#load-managed-photos');
    const saveButton = panel.querySelector('#save-worker-url');

    if (!workerUrl()) {
      setup.style.display = 'block';
      loadButton.style.display = 'none';
    } else {
      urlInput.value = workerUrl();
    }

    saveButton.addEventListener('click', () => {
      const value = urlInput.value.trim().replace(/\/$/, '');
      if (!value.startsWith('https://')) {
        showMessage('Enter the full HTTPS Worker address.', 'error');
        return;
      }
      localStorage.setItem(WORKER_URL_KEY, value);
      setup.style.display = 'none';
      loadButton.style.display = 'block';
      showMessage('Worker address saved. Tap Load Website Photos.');
    });

    loadButton.addEventListener('click', loadPhotos);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
