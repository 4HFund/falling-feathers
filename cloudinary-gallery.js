(() => {
  const CLOUD_NAME = 'ixfa510d';
  const DATA_URL = 'gallery-data.json';

  const grid = document.getElementById('gallery-grid');
  const status = document.getElementById('gallery-status');
  const filters = document.getElementById('gallery-filters');
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightbox-image');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxClose = document.getElementById('lightbox-close');

  let allPhotos = [];
  let activeCategory = 'all';

  const knownCategories = [
    'ducks',
    'chickens',
    'quail',
    'eggs',
    'babies',
    'rescues',
    'around-the-hollow',
    'farm-life'
  ];

  function titleFromPublicId(publicId) {
    const lastPart = publicId.split('/').pop() || 'Photo from the Hollow';
    return lastPart.replace(/[-_]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function categoryFromPhoto(photo) {
    const tags = Array.isArray(photo.tags) ? photo.tags.map(tag => String(tag).toLowerCase()) : [];
    return knownCategories.find(category => tags.includes(category)) || 'other';
  }

  function imageUrl(photo, width = 900) {
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,c_limit,w_${width}/${photo.public_id}.${photo.format}`;
  }

  function fullImageUrl(photo) {
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto/${photo.public_id}.${photo.format}`;
  }

  function displayCategory(category) {
    return category.replace(/-/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function photoTitle(photo) {
    return photo.context?.custom?.caption || photo.context?.caption || titleFromPublicId(photo.public_id);
  }

  function openLightbox(photo) {
    const title = photoTitle(photo);
    lightboxImage.src = fullImageUrl(photo);
    lightboxImage.alt = title;
    lightboxCaption.textContent = title;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    lightboxImage.src = '';
    document.body.style.overflow = '';
  }

  function renderFilters() {
    const categories = [...new Set(allPhotos.map(categoryFromPhoto))].sort();
    filters.replaceChildren();

    ['all', ...categories].forEach(category => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `filter-button${category === activeCategory ? ' active' : ''}`;
      button.textContent = category === 'all' ? 'All Photos' : displayCategory(category);
      button.addEventListener('click', () => {
        activeCategory = category;
        renderFilters();
        renderGallery();
      });
      filters.appendChild(button);
    });
  }

  function renderGallery() {
    const photos = activeCategory === 'all'
      ? allPhotos
      : allPhotos.filter(photo => categoryFromPhoto(photo) === activeCategory);

    grid.replaceChildren();

    photos.forEach(photo => {
      const title = photoTitle(photo);
      const category = categoryFromPhoto(photo);
      const card = document.createElement('article');
      const image = document.createElement('img');
      const info = document.createElement('div');
      const heading = document.createElement('h2');
      const categoryText = document.createElement('p');

      card.className = 'photo-card';
      card.tabIndex = 0;
      image.src = imageUrl(photo);
      image.alt = title;
      image.loading = 'lazy';
      info.className = 'photo-info';
      heading.textContent = title;
      categoryText.textContent = displayCategory(category);

      info.append(heading, categoryText);
      card.append(image, info);
      card.addEventListener('click', () => openLightbox(photo));
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openLightbox(photo);
        }
      });
      grid.appendChild(card);
    });
  }

  function showMessage(title, detail) {
    status.replaceChildren();
    const wrapper = document.createElement('div');
    const strong = document.createElement('strong');
    const lineBreak = document.createElement('br');
    wrapper.className = 'empty-note';
    strong.textContent = title;
    wrapper.append(strong, lineBreak, document.createTextNode(detail));
    status.appendChild(wrapper);
  }

  async function loadGallery() {
    try {
      const response = await fetch(`${DATA_URL}?v=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Gallery data returned ${response.status}`);

      const data = await response.json();
      allPhotos = Array.isArray(data.resources)
        ? data.resources.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
        : [];

      if (!allPhotos.length) {
        showMessage(
          'No synced gallery photos yet.',
          'Upload a photo through Hollow Admin. The gallery sync normally runs within about five minutes.'
        );
        filters.hidden = true;
        return;
      }

      status.hidden = true;
      filters.hidden = false;
      grid.hidden = false;
      renderFilters();
      renderGallery();
    } catch (error) {
      console.error('Gallery loading error:', error);
      showMessage(
        'The gallery is waiting for its first secure sync.',
        'Once the GitHub Cloudinary secrets are added, uploaded photos will appear automatically.'
      );
      filters.hidden = true;
    }
  }

  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', event => {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeLightbox();
  });

  loadGallery();
})();
