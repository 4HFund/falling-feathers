(() => {
  const CLOUD_NAME = 'ixfa510d';
  const FALLBACK_URL = 'gallery-data.json';
  const grid = document.getElementById('gallery-grid');
  const status = document.getElementById('gallery-status');
  const filters = document.getElementById('gallery-filters');
  const cinema = document.getElementById('gallery-cinema');
  const cinemaSlides = document.getElementById('cinema-slides');
  const cinemaPause = document.getElementById('cinema-pause');
  const cinemaNext = document.getElementById('cinema-next');
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightbox-image');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');
  let allPhotos = [];
  let activePhotos = [];
  let cinemaIndex = 0;
  let lightboxIndex = 0;
  let cinemaTimer = null;
  let cinemaPlaying = true;

  const sections = [
    { key: 'ducks', label: 'Ducks', icon: '🦆' },
    { key: 'chickens', label: 'Chickens', icon: '🐔' },
    { key: 'quail', label: 'Quail', icon: '🪶' },
    { key: 'babies', label: 'Babies', icon: '🐣' },
    { key: 'rescues', label: 'Rescue Stories', icon: '❤️' },
    { key: 'eggs', label: 'Eggs', icon: '🥚' },
    { key: 'around-the-hollow', label: 'Around the Hollow', icon: '🌲' },
    { key: 'farm-life', label: 'Farm Life', icon: '📸' },
    { key: 'other', label: 'More From the Hollow', icon: '🌿' }
  ];
  const sectionKeys = sections.map(section => section.key);

  function apiBase() {
    return String(window.FFH_CONFIG?.apiBase || '').trim().replace(/\/$/, '');
  }

  function tags(photo) { return Array.isArray(photo.tags) ? photo.tags.map(String) : []; }
  function category(photo) { return photo.category || sectionKeys.find(key => key !== 'other' && tags(photo).includes(key)) || 'other'; }
  function title(photo) { return photo.context?.custom?.title || photo.context?.title || ''; }
  function description(photo) { return photo.context?.custom?.description || photo.context?.description || ''; }
  function sectionFor(photo) { return sections.find(section => section.key === category(photo)) || sections.at(-1); }
  function dateLabel(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}); }
  function imageUrl(photo,width=1000){return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,c_limit,w_${width}/${photo.public_id}.${photo.format}`;}
  function cinemaUrl(photo){return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,c_fill,w_1600,h_950/${photo.public_id}.${photo.format}`;}
  function fullImageUrl(photo){return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto/${photo.public_id}.${photo.format}`;}

  function openLightbox(index) {
    lightboxIndex = index;
    const photo = activePhotos[index];
    if (!photo) return;
    lightboxImage.src = fullImageUrl(photo);
    lightboxImage.alt = title(photo) || 'Photo from Falling Feathers Hollow';
    lightboxCaption.textContent = [title(photo), description(photo)].filter(Boolean).join(' — ');
    lightbox.classList.add('open');
    document.body.style.overflow='hidden';
  }

  function moveLightbox(direction) {
    if (!activePhotos.length) return;
    lightboxIndex = (lightboxIndex + direction + activePhotos.length) % activePhotos.length;
    openLightbox(lightboxIndex);
  }

  function closeLightbox(){lightbox.classList.remove('open');lightboxImage.src='';document.body.style.overflow='';}

  function photoCard(photo, index) {
    const card=document.createElement('article');
    const image=document.createElement('img');
    const info=document.createElement('div');
    card.className='photo-card';
    card.tabIndex=0;
    image.src=imageUrl(photo);
    image.alt=title(photo)||'Photo from Falling Feathers Hollow';
    image.loading='lazy';
    info.className='photo-info';

    if(title(photo)){
      const heading=document.createElement('h2');
      heading.textContent=title(photo);
      info.appendChild(heading);
    }
    if(description(photo)){
      const copy=document.createElement('p');
      copy.textContent=description(photo);
      info.appendChild(copy);
    }
    if(dateLabel(photo.created_at)){
      const meta=document.createElement('p');
      meta.style.cssText='margin-top:.45rem;font-size:.74rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#8a735b';
      meta.textContent=`${sectionFor(photo).icon} ${sectionFor(photo).label} · ${dateLabel(photo.created_at)}`;
      info.appendChild(meta);
    }

    card.append(image,info);
    card.addEventListener('click',()=>openLightbox(index));
    card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openLightbox(index);}});
    return card;
  }

  function renderFilters() {
    filters.replaceChildren();
    const options = [{key:'all',label:'All Moments',icon:'✨'}, ...sections.filter(section=>allPhotos.some(photo=>category(photo)===section.key))];
    options.forEach((section,index)=>{
      const button=document.createElement('button');
      button.type='button';
      button.className=`filter-button${index===0?' active':''}`;
      button.textContent=`${section.icon} ${section.label}`;
      button.addEventListener('click',()=>{
        filters.querySelectorAll('.filter-button').forEach(item=>item.classList.remove('active'));
        button.classList.add('active');
        activePhotos = section.key==='all' ? [...allPhotos] : allPhotos.filter(photo=>category(photo)===section.key);
        renderGrid();
        buildCinema();
      });
      filters.appendChild(button);
    });
  }

  function renderGrid() {
    grid.replaceChildren();
    activePhotos.forEach((photo,index)=>grid.appendChild(photoCard(photo,index)));
    requestAnimationFrame(()=>{
      const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}}),{threshold:.08});
      grid.querySelectorAll('.photo-card').forEach(card=>observer.observe(card));
    });
  }

  function buildCinema() {
    clearInterval(cinemaTimer);
    cinemaSlides.replaceChildren();
    const featured = activePhotos.filter(photo=>photo.featured||tags(photo).includes('featured'));
    const source = (featured.length ? featured : activePhotos).slice(0,10);
    if (!source.length) {
      cinema.hidden = true;
      return;
    }

    source.forEach((photo,index)=>{
      const slide=document.createElement('article');
      slide.className=`cinema-slide${index===0?' active':''}`;
      slide.innerHTML=`<img src="${cinemaUrl(photo)}" alt=""><div class="cinema-overlay"></div><div class="cinema-copy"><span>${sectionFor(photo).icon} ${sectionFor(photo).label}</span><h2></h2><p></p></div>`;
      slide.querySelector('img').alt=title(photo)||'Featured photo from Falling Feathers Hollow';
      slide.querySelector('h2').textContent=title(photo)||'Life at the Hollow';
      slide.querySelector('p').textContent=description(photo)||'A moment from our flock, rescues, and everyday life in the hollow.';
      slide.addEventListener('click',()=>openLightbox(activePhotos.indexOf(photo)));
      cinemaSlides.appendChild(slide);
    });

    cinema.hidden=false;
    cinemaIndex=0;
    cinemaPlaying=true;
    cinemaPause.textContent='Ⅱ';
    startCinema();
  }

  function showCinema(index) {
    const slides=[...cinemaSlides.children];
    if(!slides.length)return;
    cinemaIndex=(index+slides.length)%slides.length;
    slides.forEach((slide,i)=>slide.classList.toggle('active',i===cinemaIndex));
  }

  function startCinema() {
    clearInterval(cinemaTimer);
    if(!cinemaPlaying)return;
    cinemaTimer=setInterval(()=>showCinema(cinemaIndex+1),5200);
  }

  function toggleCinema() {
    cinemaPlaying=!cinemaPlaying;
    cinemaPause.textContent=cinemaPlaying?'Ⅱ':'▶';
    startCinema();
  }

  function showMessage(headline,detail){status.replaceChildren();const wrapper=document.createElement('div'),strong=document.createElement('strong');wrapper.className='empty-note';strong.textContent=headline;wrapper.append(strong,document.createElement('br'),document.createTextNode(detail));status.appendChild(wrapper);}

  async function fetchGallery() {
    const base=apiBase();
    if(base){const response=await fetch(`${base}/gallery`,{cache:'no-store'});if(!response.ok)throw new Error(`Gallery API returned ${response.status}`);return response.json();}
    const response=await fetch(`${FALLBACK_URL}?v=${Date.now()}`,{cache:'no-store'});if(!response.ok)throw new Error(`Fallback gallery returned ${response.status}`);return response.json();
  }

  async function load() {
    try {
      const data=await fetchGallery();
      allPhotos=Array.isArray(data.resources)?data.resources.filter(photo=>photo.website_status!=='hidden').sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||''))):[];
      if(!allPhotos.length){showMessage('No gallery photos yet.','New photos will appear here after they are published from Hollow Admin.');filters.hidden=true;return;}
      activePhotos=[...allPhotos];
      status.hidden=true;
      filters.hidden=false;
      grid.hidden=false;
      renderFilters();
      renderGrid();
      buildCinema();
    } catch(error){console.error(error);showMessage('The gallery could not load.','Please try refreshing in a moment.');filters.hidden=true;}
  }

  cinemaPause.addEventListener('click',toggleCinema);
  cinemaNext.addEventListener('click',()=>{showCinema(cinemaIndex+1);startCinema();});
  lightboxClose.addEventListener('click',closeLightbox);
  lightboxPrev.addEventListener('click',()=>moveLightbox(-1));
  lightboxNext.addEventListener('click',()=>moveLightbox(1));
  lightbox.addEventListener('click',event=>{if(event.target===lightbox)closeLightbox();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeLightbox();if(lightbox.classList.contains('open')&&event.key==='ArrowLeft')moveLightbox(-1);if(lightbox.classList.contains('open')&&event.key==='ArrowRight')moveLightbox(1);});
  load();
})();
