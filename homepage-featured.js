(() => {
  const CLOUD_NAME = 'ixfa510d';
  const apiBase = String(window.FFH_CONFIG?.apiBase || '').trim().replace(/\/$/, '');

  function titleFor(photo, fallback = 'Life at the Hollow') {
    return photo.context?.custom?.title || photo.context?.title || fallback;
  }

  function descriptionFor(photo, fallback = 'A fresh moment from Falling Feathers Hollow.') {
    return photo.context?.custom?.description || photo.context?.description || fallback;
  }

  function categoryFor(photo) {
    const value = photo.category || 'farm-life';
    return value.replace(/-/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function imageUrl(photo, width = 1200) {
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,c_limit,w_${width}/${photo.public_id}.${photo.format}`;
  }

  function setImage(image, photo, fallbackAlt) {
    if (!image || !photo) return;
    image.src = imageUrl(photo);
    image.alt = titleFor(photo, fallbackAlt);
  }

  function updateStoryCard(card, photo) {
    if (!card || !photo) return;
    card.hidden = false;
    setImage(card.querySelector('img'), photo, 'Featured photo from Falling Feathers Hollow');
    const badge = card.querySelector('.badge');
    const heading = card.querySelector('h3');
    const copy = card.querySelector('p');
    if (badge) badge.textContent = categoryFor(photo);
    if (heading) heading.textContent = titleFor(photo);
    if (copy) copy.textContent = descriptionFor(photo);
  }

  async function loadFeatured() {
    if (!apiBase) return;

    try {
      const response = await fetch(`${apiBase}/gallery`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Homepage photo request returned ${response.status}`);
      const data = await response.json();
      const resources = Array.isArray(data.resources) ? data.resources : [];
      const featured = resources.filter(photo => photo.featured || photo.tags?.includes('featured'));
      if (!featured.length) return;

      setImage(document.getElementById('homepage-hero-photo'), featured[0], 'Featured photo from Falling Feathers Hollow');

      const storyCards = [...document.querySelectorAll('[data-homepage-featured-card]')];
      const storyPhotos = featured.slice(1, 3);

      storyCards.forEach((card, index) => {
        const photo = storyPhotos[index];
        if (photo) updateStoryCard(card, photo);
        else card.hidden = true;
      });
    } catch (error) {
      console.error('Homepage featured photos could not load:', error);
    }
  }

  loadFeatured();
})();
