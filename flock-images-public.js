(() => {
  const CLOUD_NAME = 'ixfa510d';
  const API_BASE = (window.FFH_CONFIG?.apiBase || '').replace(/\/$/, '');

  function imageUrl(photo, width = 900) {
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,c_fill,w_${width},h_${Math.round(width * .75)}/${photo.public_id}.${photo.format}`;
  }

  async function applyFlockImages() {
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

        const img = document.createElement('img');
        img.src = imageUrl(photo);
        img.alt = container.dataset.flockAlt || `${slot} at Falling Feathers Hollow`;
        img.loading = 'lazy';
        container.replaceChildren(img);
      });
    } catch (error) {
      console.warn('Flock category images could not be loaded.', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyFlockImages);
  else applyFlockImages();
})();
