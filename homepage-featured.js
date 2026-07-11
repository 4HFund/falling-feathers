(() => {
  const CLOUD_NAME = 'ixfa510d';
  const apiBase = String(window.FFH_CONFIG?.apiBase || '').trim().replace(/\/$/, '');

  function titleFor(photo, fallback = 'Life at the Hollow') {
    return photo?.context?.custom?.title || photo?.context?.title || fallback;
  }

  function descriptionFor(photo, fallback = 'A fresh moment from Falling Feathers Hollow.') {
    return photo?.context?.custom?.description || photo?.context?.description || fallback;
  }

  function categoryFor(photo) {
    const value = photo?.category || 'farm-life';
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
    if (!card) return;
    if (!photo) {
      card.hidden = true;
      return;
    }
    card.hidden = false;
    setImage(card.querySelector('img'), photo, 'Featured photo from Falling Feathers Hollow');
    const badge = card.querySelector('.badge');
    const heading = card.querySelector('h3');
    const copy = card.querySelector('p');
    if (badge) badge.textContent = categoryFor(photo);
    if (heading) heading.textContent = titleFor(photo);
    if (copy) copy.textContent = descriptionFor(photo);
  }

  async function loadHomepage() {
    if (!apiBase) return;

    try {
      const response = await fetch(`${apiBase}/homepage`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Homepage request returned ${response.status}`);
      const data = await response.json();
      const slots = data.slots || {};

      if (slots['homepage-hero']) {
        setImage(document.getElementById('homepage-hero-photo'), slots['homepage-hero'], 'Featured photo from Falling Feathers Hollow');
      }

      const storyCards = [...document.querySelectorAll('[data-homepage-featured-card]')];
      updateStoryCard(storyCards[0], slots['homepage-story-1']);
      updateStoryCard(storyCards[1], slots['homepage-story-2']);
    } catch (error) {
      console.error('Homepage photos could not load:', error);
    }
  }

  loadHomepage();
})();
