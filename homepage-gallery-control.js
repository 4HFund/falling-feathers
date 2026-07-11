(() => {
  const PIN_KEY = 'falling-feathers-admin-pin';
  let managedPhotos = [];

  function apiBase() {
    return String(window.FFH_CONFIG?.apiBase || '').trim().replace(/\/$/, '');
  }

  async function api(path, options = {}) {
    let pin = sessionStorage.getItem(PIN_KEY) || '';
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
    if (!response.ok) throw new Error(data.error || `Request failed with ${response.status}`);
    return data;
  }

  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .homepage-gallery-choice{display:flex;align-items:flex-start;gap:.65rem;margin-top:.7rem;padding:.78rem;background:#f7f1e8;border:1px solid rgba(75,59,42,.13);border-radius:13px}.homepage-gallery-choice input{width:23px;height:23px;accent-color:var(--green);flex:0 0 auto}.homepage-gallery-choice strong,.homepage-gallery-choice small{display:block}.homepage-gallery-choice strong{font-size:.83rem;color:var(--deep)}.homepage-gallery-choice small{font-size:.72rem;color:var(--muted);line-height:1.4;margin-top:.18rem}
    `;
    document.head.appendChild(style);
  }

  async function refreshPhotos() {
    try {
      const data = await api('/admin/photos');
      managedPhotos = Array.isArray(data.resources) ? data.resources : [];
      decorateCards();
    } catch (error) {
      console.error(error);
    }
  }

  function decorateCards() {
    document.querySelectorAll('#homepage-grid .homepage-slot').forEach((card, index) => {
      const select = card.querySelector('.slot-select');
      const save = card.querySelector('.slot-save');
      if (!select || !save) return;

      const slot = ['homepage-hero', 'homepage-story-1', 'homepage-story-2'][index];
      const current = managedPhotos.find(photo => photo.homepage_slot === slot);

      if (current && ![...select.options].some(option => option.value === current.public_id)) {
        const option = document.createElement('option');
        option.value = current.public_id;
        option.textContent = `${current.context?.custom?.title || current.context?.title || 'Homepage-only photo'} (homepage only)`;
        option.selected = true;
        select.appendChild(option);
      }

      let choice = card.querySelector('.homepage-gallery-choice');
      if (!choice) {
        choice = document.createElement('label');
        choice.className = 'homepage-gallery-choice';
        choice.innerHTML = '<input type="checkbox" checked><span><strong>Also show this photo in the public gallery</strong><small>Turn this off to use the photo only on the homepage.</small></span>';
        card.querySelector('.slot-actions')?.before(choice);
      }

      const checkbox = choice.querySelector('input');
      const selectedPhoto = managedPhotos.find(photo => photo.public_id === select.value) || current;
      checkbox.checked = selectedPhoto ? selectedPhoto.website_status !== 'hidden' : true;

      select.addEventListener('change', () => {
        const photo = managedPhotos.find(item => item.public_id === select.value);
        checkbox.checked = photo ? photo.website_status !== 'hidden' : true;
      });

      if (!save.dataset.galleryControl) {
        save.dataset.galleryControl = 'true';
        save.addEventListener('click', () => {
          const publicId = select.value;
          if (!publicId) return;
          const shouldShow = checkbox.checked;
          window.setTimeout(async () => {
            try {
              await api('/admin/photo', {
                method: 'POST',
                body: JSON.stringify({ public_id: publicId, action: shouldShow ? 'restore' : 'hide' })
              });
              await refreshPhotos();
            } catch (error) {
              console.error(error);
            }
          }, 1400);
        });
      }
    });
  }

  function observe() {
    const observer = new MutationObserver(() => decorateCards());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function initialize() {
    addStyles();
    observe();
    window.setTimeout(refreshPhotos, 900);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
  else initialize();
})();
