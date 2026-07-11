(() => {
  const CLOUD_NAME = 'ixfa510d';
  const API_BASE = (window.FFH_CONFIG?.apiBase || '').replace(/\/$/, '');
  const DELIMITER = ':::';

  function imageUrl(photo, width = 900) {
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,c_fill,w_${width},h_${Math.round(width * .75)}/${photo.public_id}.${photo.format}`;
  }

  function contextValue(photo, key) {
    return photo?.context?.custom?.[key] || photo?.context?.[key] || '';
  }

  function parseTitle(photo) {
    const raw = contextValue(photo, 'title');
    if (!raw.includes(DELIMITER)) return { badge: '', title: raw };
    const [badge, ...title] = raw.split(DELIMITER);
    return { badge: badge.trim(), title: title.join(DELIMITER).trim() };
  }

  async function applyFlockContent() {
    if (!API_BASE) return;
    try {
      const response = await fetch(`${API_BASE}/gallery`);
      if (!response.ok) return;
      const data = await response.json();
      const photos = Array.isArray(data.resources) ? data.resources : [];

      document.querySelectorAll('[data-flock-slot]').forEach(container => {
        const slot = container.dataset.flockSlot;
        const photo = photos.find(item => Array.isArray(item.tags) && item.tags.includes(`flock-${slot}`));
        if (!photo) return;

        const card = container.closest('.card');
        const parsed = parseTitle(photo);
        const description = contextValue(photo, 'description');

        const img = document.createElement('img');
        img.src = imageUrl(photo);
        img.alt = container.dataset.flockAlt || parsed.title || `${slot} at Falling Feathers Hollow`;
        img.loading = 'lazy';
        container.replaceChildren(img);

        if (parsed.badge && card?.querySelector('.badge')) card.querySelector('.badge').textContent = parsed.badge;
        if (parsed.title && card?.querySelector('h3')) card.querySelector('h3').textContent = parsed.title;
        if (description && card?.querySelector('p')) card.querySelector('p').textContent = description;
      });
    } catch (error) {
      console.warn('Flock category content could not be loaded.', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyFlockContent);
  else applyFlockContent();
})();
