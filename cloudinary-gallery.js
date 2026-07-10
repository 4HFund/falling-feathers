(() => {
  const CLOUD_NAME = 'ixfa510d';
  const DATA_URL = 'gallery-data.json';
  const HIDDEN_KEY = 'falling-feathers-hidden-public-ids';

  const grid = document.getElementById('gallery-grid');
  const status = document.getElementById('gallery-status');
  const filters = document.getElementById('gallery-filters');
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightbox-image');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxClose = document.getElementById('lightbox-close');

  let allPhotos = [];

  const sections = [
    { key: 'ducks', label: 'Ducks', icon: '🦆', description: 'Pekins, Rouens, ducklings, rescues, and everyday duck life.' },
    { key: 'chickens', label: 'Chickens', icon: '🐔', description: 'The hens, Yolkie, new arrivals, and life around the coop.' },
    { key: 'quail', label: 'Quail', icon: '🪶', description: 'Our smallest birds, speckled eggs, and quiet moments.' },
    { key: 'babies', label: 'Babies', icon: '🐣', description: 'Chicks, ducklings, poults, goslings, and new beginnings.' },
    { key: 'rescues', label: 'Rescue Stories', icon: '❤️', description: 'Animals who needed a safe place to land.' },
    { key: 'eggs', label: 'Eggs', icon: '🥚', description: 'Chicken, duck, and quail eggs from the hollow.' },
    { key: 'around-the-hollow', label: 'Around the Hollow', icon: '🌲', description: 'The creek, woods, changing seasons, and peaceful corners.' },
    { key: 'farm-life', label: 'Farm Life', icon: '📸', description: 'Daily work, muddy boots, projects, and real life at the sanctuary.' },
    { key: 'other', label: 'More From the Hollow', icon: '🌿', description: 'Everything else that makes Falling Feathers Hollow special.' }
  ];

  const sectionKeys = sections.map(section => section.key);

  function getHiddenIds() {
    try { return JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]'); }
    catch { return []; }
  }

  function addSectionStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #gallery-grid{columns:initial!important;display:block!important}
      .gallery-section{margin:0 0 2.4rem;scroll-margin-top:130px}
      .gallery-section:last-child{margin-bottom:0}
      .gallery-section-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin:0 0 1rem;padding-bottom:.85rem;border-bottom:1px solid rgba(209,167,111,.35)}
      .gallery-section-heading h2{font-family:'Lora',serif;color:var(--deep);font-size:clamp(1.65rem,4vw,2.35rem);margin:0 0 .3rem}
      .gallery-section-heading p{margin:0;color:#6a5540;line-height:1.55}
      .gallery-section-count{flex:0 0 auto;background:#f6e5c8;color:#65411f;border-radius:999px;padding:.4rem .7rem;font-size:.78rem;font-weight:900}
      .gallery-section-grid{columns:1;column-gap:1rem}
      .gallery-section-grid .photo-card{break-inside:avoid;position:relative;background:white;border-radius:22px;overflow:hidden}
      .gallery-section-grid .photo-card>img{width:100%;height:auto;display:block}
      .photo-badge{position:absolute;top:.75rem;left:.75rem;background:rgba(36,26,18,.78);color:white;border-radius:999px;padding:.35rem .65rem;font-size:.74rem;font-weight:900;backdrop-filter:blur(8px)}
      .photo-info{padding:.8rem 1rem!important}
      .photo-info:empty{display:none}
      .photo-info h2{font-family:'Inter',sans-serif!important;font-size:1rem!important;line-height:1.3!important;margin:0!important;color:var(--deep)}
      .photo-info .photo-description{margin:.35rem 0 0;color:#6a5540;line-height:1.5;font-size:.9rem}
      .photo-info .photo-meta{margin:.35rem 0 0;color:#8a735b;font-size:.76rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
      @media(min-width:620px){.gallery-section-grid{columns:2}}
      @media(min-width:960px){.gallery-section-grid{columns:3}}
    `;
    document.head.appendChild(style);
  }

  function tagsForPhoto(photo) {
    return Array.isArray(photo.tags) ? photo.tags.map(tag => String(tag).toLowerCase()) : [];
  }

  function categoryFromPhoto(photo) {
    const tags = tagsForPhoto(photo);
    return sectionKeys.find(category => category !== 'other' && tags.includes(category)) || 'other';
  }

  function imageUrl(photo, width = 900) {
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,c_limit,w_${width}/${photo.public_id}.${photo.format}`;
  }

  function fullImageUrl(photo) {
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto/${photo.public_id}.${photo.format}`;
  }

  function photoTitle(photo) {
    return photo.context?.custom?.title || photo.context?.custom?.caption || photo.context?.title || photo.context?.caption || '';
  }

  function photoDescription(photo) {
    return photo.context?.custom?.description || photo.context?.description || '';
  }

  function formatDate(dateValue) {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function openLightbox(photo) {
    const title = photoTitle(photo);
    const description = photoDescription(photo);
    lightboxImage.src = fullImageUrl(photo);
    lightboxImage.alt = title || 'Photo from Falling Feathers Hollow';
    lightboxCaption.textContent = [title, description].filter(Boolean).join(' — ');
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    lightboxImage.src = '';
    document.body.style.overflow = '';
  }

  function createPhotoCard(photo, sectionLabel) {
    const title = photoTitle(photo);
    const description = photoDescription(photo);
    const date = formatDate(photo.created_at);
    const card = document.createElement('article');
    const image = document.createElement('img');
    const badge = document.createElement('span');
    const info = document.createElement('div');

    card.className = 'photo-card';
    card.tabIndex = 0;
    image.src = imageUrl(photo);
    image.alt = title || `Photo in ${sectionLabel}`;
    image.loading = 'lazy';
    badge.className = 'photo-badge';
    badge.textContent = sectionLabel;
    info.className = 'photo-info';

    if (title) {
      const heading = document.createElement('h2');
      heading.textContent = title;
      info.appendChild(heading);
    }

    if (description) {
      const descriptionText = document.createElement('p');
      descriptionText.className = 'photo-description';
      descriptionText.textContent = description;
      info.appendChild(descriptionText);
    }

    if ((title || description) && date) {
      const meta = document.createElement('p');
      meta.className = 'photo-meta';
      meta.textContent = date;
      info.appendChild(meta);
    }

    card.append(image, badge, info);
    card.addEventListener('click', () => openLightbox(photo));
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openLightbox(photo);
      }
    });
    return card;
  }

  function renderSectionNavigation(visibleSections) {
    filters.replaceChildren();
    visibleSections.forEach(section => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'filter-button';
      button.textContent = `${section.icon} ${section.label}`;
      button.addEventListener('click', () => {
        document.getElementById(`gallery-${section.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      filters.appendChild(button);
    });
  }

  function renderGallerySections() {
    grid.replaceChildren();
    const visibleSections = sections.filter(section => allPhotos.some(photo => categoryFromPhoto(photo) === section.key));
    renderSectionNavigation(visibleSections);

    visibleSections.forEach(section => {
      const photos = allPhotos.filter(photo => categoryFromPhoto(photo) === section.key);
      const wrapper = document.createElement('section');
      const headingWrap = document.createElement('div');
      const copy = document.createElement('div');
      const heading = document.createElement('h2');
      const description = document.createElement('p');
      const count = document.createElement('span');
      const sectionGrid = document.createElement('div');

      wrapper.className = 'gallery-section';
      wrapper.id = `gallery-${section.key}`;
      headingWrap.className = 'gallery-section-heading';
      heading.textContent = `${section.icon} ${section.label}`;
      description.textContent = section.description;
      count.className = 'gallery-section-count';
      count.textContent = `${photos.length} photo${photos.length === 1 ? '' : 's'}`;
      sectionGrid.className = 'gallery-section-grid';

      photos.forEach(photo => sectionGrid.appendChild(createPhotoCard(photo, section.label)));
      copy.append(heading, description);
      headingWrap.append(copy, count);
      wrapper.append(headingWrap, sectionGrid);
      grid.appendChild(wrapper);
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
      const hiddenIds = getHiddenIds();
      allPhotos = Array.isArray(data.resources)
        ? data.resources
            .filter(photo => !hiddenIds.includes(photo.public_id))
            .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
        : [];

      if (!allPhotos.length) {
        showMessage('No visible gallery photos yet.', 'Upload a photo through Hollow Admin, or restore a photo hidden on this phone.');
        filters.hidden = true;
        return;
      }

      status.hidden = true;
      filters.hidden = false;
      grid.hidden = false;
      renderGallerySections();
    } catch (error) {
      console.error('Gallery loading error:', error);
      showMessage('The gallery is waiting for its first secure sync.', 'Once the GitHub Cloudinary secrets are added, uploaded photos will appear automatically.');
      filters.hidden = true;
    }
  }

  addSectionStyles();
  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', event => {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeLightbox();
  });

  loadGallery();
})();
