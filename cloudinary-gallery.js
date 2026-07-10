(() => {
  const CLOUD_NAME = 'ixfa510d';
  const FALLBACK_URL = 'gallery-data.json';
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

  function apiBase() {
    return String(window.FFH_CONFIG?.apiBase || '').trim().replace(/\/$/, '');
  }

  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #gallery-grid{columns:initial!important;display:block!important}
      .gallery-section{margin:0 0 2.4rem;scroll-margin-top:130px}.gallery-section:last-child{margin-bottom:0}
      .gallery-section-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin:0 0 1rem;padding-bottom:.85rem;border-bottom:1px solid rgba(209,167,111,.35)}
      .gallery-section-heading h2{font-family:'Lora',serif;color:var(--deep);font-size:clamp(1.65rem,4vw,2.35rem);margin:0 0 .3rem}.gallery-section-heading p{margin:0;color:#6a5540;line-height:1.55}
      .gallery-section-count{flex:0 0 auto;background:#f6e5c8;color:#65411f;border-radius:999px;padding:.4rem .7rem;font-size:.78rem;font-weight:900}
      .gallery-section-grid{columns:1;column-gap:1rem}.gallery-section-grid .photo-card{break-inside:avoid;position:relative;background:white;border-radius:22px;overflow:hidden}.gallery-section-grid .photo-card>img{width:100%;height:auto;display:block}
      .photo-badge{position:absolute;top:.75rem;left:.75rem;background:rgba(36,26,18,.78);color:white;border-radius:999px;padding:.35rem .65rem;font-size:.74rem;font-weight:900;backdrop-filter:blur(8px)}
      .photo-featured{position:absolute;top:.75rem;right:.75rem;background:#c7941f;color:#fff;border-radius:999px;padding:.35rem .6rem;font-size:.72rem;font-weight:900}
      .photo-info{padding:.8rem 1rem!important}.photo-info:empty{display:none}.photo-info h2{font-family:'Inter',sans-serif!important;font-size:1rem!important;line-height:1.3!important;margin:0!important;color:var(--deep)}
      .photo-info .photo-description{margin:.35rem 0 0;color:#6a5540;line-height:1.5;font-size:.9rem}.photo-info .photo-meta{margin:.35rem 0 0;color:#8a735b;font-size:.76rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
      @media(min-width:620px){.gallery-section-grid{columns:2}}@media(min-width:960px){.gallery-section-grid{columns:3}}
    `;
    document.head.appendChild(style);
  }

  function tags(photo) { return Array.isArray(photo.tags) ? photo.tags.map(String) : []; }
  function category(photo) { return photo.category || sectionKeys.find(key => key !== 'other' && tags(photo).includes(key)) || 'other'; }
  function title(photo) { return photo.context?.custom?.title || photo.context?.title || ''; }
  function description(photo) { return photo.context?.custom?.description || photo.context?.description || ''; }
  function dateLabel(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}); }
  function imageUrl(photo,width=900){return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,c_limit,w_${width}/${photo.public_id}.${photo.format}`;}
  function fullImageUrl(photo){return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto/${photo.public_id}.${photo.format}`;}

  function openLightbox(photo) {
    lightboxImage.src = fullImageUrl(photo);
    lightboxImage.alt = title(photo) || 'Photo from Falling Feathers Hollow';
    lightboxCaption.textContent = [title(photo), description(photo)].filter(Boolean).join(' — ');
    lightbox.classList.add('open'); document.body.style.overflow='hidden';
  }
  function closeLightbox(){lightbox.classList.remove('open');lightboxImage.src='';document.body.style.overflow='';}

  function photoCard(photo, sectionLabel) {
    const card=document.createElement('article'), image=document.createElement('img'), badge=document.createElement('span'), info=document.createElement('div');
    card.className='photo-card';card.tabIndex=0;image.src=imageUrl(photo);image.alt=title(photo)||`Photo in ${sectionLabel}`;image.loading='lazy';badge.className='photo-badge';badge.textContent=sectionLabel;info.className='photo-info';
    if(photo.featured||tags(photo).includes('featured')){const featured=document.createElement('span');featured.className='photo-featured';featured.textContent='★ Featured';card.appendChild(featured);}
    if(title(photo)){const heading=document.createElement('h2');heading.textContent=title(photo);info.appendChild(heading);}
    if(description(photo)){const copy=document.createElement('p');copy.className='photo-description';copy.textContent=description(photo);info.appendChild(copy);}
    if((title(photo)||description(photo))&&dateLabel(photo.created_at)){const meta=document.createElement('p');meta.className='photo-meta';meta.textContent=dateLabel(photo.created_at);info.appendChild(meta);}
    card.prepend(image,badge);card.appendChild(info);card.addEventListener('click',()=>openLightbox(photo));card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openLightbox(photo);}});return card;
  }

  function renderNavigation(visible) {
    filters.replaceChildren();
    visible.forEach(section=>{const button=document.createElement('button');button.type='button';button.className='filter-button';button.textContent=`${section.icon} ${section.label}`;button.addEventListener('click',()=>document.getElementById(`gallery-${section.key}`)?.scrollIntoView({behavior:'smooth',block:'start'}));filters.appendChild(button);});
  }

  function render() {
    grid.replaceChildren();
    const visible=sections.filter(section=>allPhotos.some(photo=>category(photo)===section.key));renderNavigation(visible);
    visible.forEach(section=>{const photos=allPhotos.filter(photo=>category(photo)===section.key),wrapper=document.createElement('section'),headingWrap=document.createElement('div'),copy=document.createElement('div'),heading=document.createElement('h2'),descriptionText=document.createElement('p'),count=document.createElement('span'),sectionGrid=document.createElement('div');wrapper.className='gallery-section';wrapper.id=`gallery-${section.key}`;headingWrap.className='gallery-section-heading';heading.textContent=`${section.icon} ${section.label}`;descriptionText.textContent=section.description;count.className='gallery-section-count';count.textContent=`${photos.length} photo${photos.length===1?'':'s'}`;sectionGrid.className='gallery-section-grid';photos.forEach(photo=>sectionGrid.appendChild(photoCard(photo,section.label)));copy.append(heading,descriptionText);headingWrap.append(copy,count);wrapper.append(headingWrap,sectionGrid);grid.appendChild(wrapper);});
  }

  function showMessage(headline,detail){status.replaceChildren();const wrapper=document.createElement('div'),strong=document.createElement('strong');wrapper.className='empty-note';strong.textContent=headline;wrapper.append(strong,document.createElement('br'),document.createTextNode(detail));status.appendChild(wrapper);}

  async function fetchGallery() {
    const base=apiBase();
    if(base){const response=await fetch(`${base}/gallery`,{cache:'no-store'});if(!response.ok)throw new Error(`Gallery API returned ${response.status}`);return response.json();}
    const response=await fetch(`${FALLBACK_URL}?v=${Date.now()}`,{cache:'no-store'});if(!response.ok)throw new Error(`Fallback gallery returned ${response.status}`);return response.json();
  }

  async function load() {
    try {
      const data=await fetchGallery();allPhotos=Array.isArray(data.resources)?data.resources.filter(photo=>photo.website_status!=='hidden').sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||''))):[];
      if(!allPhotos.length){showMessage('No gallery photos yet.','New photos will appear here after they are published from Hollow Admin.');filters.hidden=true;return;}
      status.hidden=true;filters.hidden=false;grid.hidden=false;render();
    } catch(error){console.error(error);showMessage('The gallery could not load.','Please try refreshing in a moment.');filters.hidden=true;}
  }

  addStyles();lightboxClose.addEventListener('click',closeLightbox);lightbox.addEventListener('click',event=>{if(event.target===lightbox)closeLightbox();});document.addEventListener('keydown',event=>{if(event.key==='Escape')closeLightbox();});load();
})();
