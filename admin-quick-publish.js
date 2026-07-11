(() => {
  const CLOUD_NAME = 'ixfa510d';
  const UPLOAD_PRESET = 'ml_default';
  const RECENT_KEY = 'falling-feathers-recent-uploads';
  const ALBUM_KEY = 'falling-feathers-selected-album';
  const albums = [
    { key: 'ducks', short: 'Ducks', full: 'Ducks', icon: '🦆', help: 'Ducks and ducklings' },
    { key: 'chickens', short: 'Chickens', full: 'Chickens', icon: '🐔', help: 'Chickens and chicks' },
    { key: 'quail', short: 'Quail', full: 'Quail', icon: '🪶', help: 'Quail and quail chicks' },
    { key: 'eggs', short: 'Eggs', full: 'Eggs', icon: '🥚', help: 'Collections, availability, incubator and hatch updates' },
    { key: 'around-the-hollow', short: 'Around', full: 'Around the Hollow', icon: '🌲', help: 'Property, pets, wildlife, projects and scenery' }
  ];

  const validAlbum = value => albums.some(album => album.key === value);
  let selected = validAlbum(sessionStorage.getItem(ALBUM_KEY)) ? sessionStorage.getItem(ALBUM_KEY) : 'ducks';
  let uploadCount = 0;

  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #new-photo{padding-top:1rem}
      #new-photo .section-title{margin-bottom:.45rem}
      .album-sticky{position:sticky;top:76px;z-index:420;margin:0 -.35rem .8rem;padding:.45rem .35rem .55rem;background:rgba(255,253,248,.96);backdrop-filter:blur(14px);border-bottom:1px solid rgba(111,83,52,.12)}
      .album-quick-nav{display:flex;gap:.45rem;overflow-x:auto;white-space:nowrap;scrollbar-width:none;padding:.15rem .05rem;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}
      .album-quick-nav::-webkit-scrollbar{display:none}
      .album-chip{flex:0 0 auto;min-height:46px;display:inline-flex;align-items:center;justify-content:center;gap:.38rem;border:1px solid rgba(75,59,42,.18);border-radius:999px;padding:.68rem .88rem;background:#fffaf1;color:#4b3b2a;font-weight:900;box-shadow:0 3px 10px rgba(75,59,42,.04);transition:background .16s ease,color .16s ease,border-color .16s ease,transform .16s ease}
      .album-chip:active{transform:scale(.98)}
      .album-chip.active{background:#203b2d;color:#fff;border-color:#203b2d;box-shadow:0 7px 18px rgba(32,59,45,.2)}
      .album-chip span{font-size:1rem;line-height:1}
      .publishing-status{display:flex;align-items:center;justify-content:space-between;gap:.7rem;padding:.42rem .18rem 0;font-size:.78rem;color:#6f5a44}
      .publishing-status strong{color:#203b2d}
      .album-help{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right}
      #new-photo .field{margin:.8rem 0}
      #new-photo .field textarea{min-height:90px}
      #new-photo .toggle{margin-top:.8rem}
      #new-photo .upload-button{margin-top:.8rem}
      @media(max-width:560px){.album-sticky{top:73px}.album-chip{min-height:44px;padding:.64rem .78rem;font-size:.84rem}.album-help{display:none}}
    `;
    document.head.appendChild(style);
  }

  function album() {
    return albums.find(item => item.key === selected) || albums[0];
  }

  function updateStatus() {
    document.querySelectorAll('.album-chip').forEach(button => {
      const active = button.dataset.value === selected;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const current = album();
    const status = document.getElementById('publishing-status');
    if (status) status.innerHTML = `<span>Publishing to: <strong>${current.full}</strong></span><span class="album-help">${current.help}</span>`;
    sessionStorage.setItem(ALBUM_KEY, selected);
  }

  function buildNavigator() {
    const oldGrid = document.getElementById('category-grid');
    if (!oldGrid) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'album-sticky';
    wrapper.innerHTML = `<div class="album-quick-nav" role="group" aria-label="Choose an album"></div><div class="publishing-status" id="publishing-status"></div>`;
    const nav = wrapper.querySelector('.album-quick-nav');
    albums.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'album-chip';
      button.dataset.value = item.key;
      button.innerHTML = `<span aria-hidden="true">${item.icon}</span>${item.short}`;
      button.addEventListener('click', () => {
        selected = item.key;
        updateStatus();
        button.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      });
      nav.appendChild(button);
    });
    oldGrid.replaceWith(wrapper);
    updateStatus();
  }

  function getRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
    catch { return []; }
  }

  function saveRecent(item) {
    localStorage.setItem(RECENT_KEY, JSON.stringify([item, ...getRecent()].slice(0, 12)));
  }

  function showResult(text, type = 'success') {
    const result = document.getElementById('result');
    if (!result) return;
    result.textContent = text;
    result.className = `result show ${type}`;
  }

  function replaceUploadButton() {
    const original = document.getElementById('upload-button');
    if (!original) return;
    const button = original.cloneNode(true);
    button.textContent = 'Choose Photos and Publish';
    original.replaceWith(button);

    button.addEventListener('click', () => {
      const titleInput = document.getElementById('title');
      const storyInput = document.getElementById('story');
      const featuredInput = document.getElementById('featured');
      const title = titleInput.value.trim();
      const story = storyInput.value.trim();

      if (!title) {
        titleInput.focus();
        showResult('Add a short title before publishing.', 'error');
        return;
      }

      const chosenAlbum = album();
      const tags = ['website-gallery', chosenAlbum.key];
      if (featuredInput.checked) tags.push('featured');
      uploadCount = 0;
      showResult(`Ready to publish to ${chosenAlbum.full}.`);

      const widget = cloudinary.createUploadWidget({
        cloudName: CLOUD_NAME,
        uploadPreset: UPLOAD_PRESET,
        multiple: true,
        sources: ['local', 'camera'],
        resourceType: 'image',
        clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'heic'],
        maxFileSize: 12000000,
        tags,
        folder: `falling-feathers/${chosenAlbum.key}`,
        context: { title, description: story },
        showAdvancedOptions: false,
        cropping: false
      }, (error, uploadResult) => {
        if (error) {
          showResult(`Upload failed: ${error.message || 'Unknown error'}`, 'error');
          return;
        }
        if (uploadResult?.event === 'success') {
          uploadCount += 1;
          const info = uploadResult.info;
          saveRecent({
            filename: info.original_filename || 'Uploaded photo',
            title,
            story,
            category: chosenAlbum.key,
            thumbnail: info.thumbnail_url || info.secure_url,
            publicId: info.public_id
          });
          showResult(`${uploadCount} photo${uploadCount === 1 ? '' : 's'} published to ${chosenAlbum.full}. Your album selection is still saved.`);
          titleInput.value = '';
          storyInput.value = '';
          featuredInput.checked = false;
        }
      });
      widget.open();
    });
  }

  function simplifyPhotoManagerCategories() {
    const apply = () => {
      ['manager-category', 'manager-edit-category'].forEach(id => {
        const select = document.getElementById(id);
        if (!select || select.dataset.simplified === 'true') return;
        const current = select.value;
        select.replaceChildren();
        if (id === 'manager-category') select.append(new Option('All categories', 'all'));
        albums.forEach(item => select.append(new Option(`${item.icon} ${item.full}`, item.key)));
        const legacyMap = { babies: 'around-the-hollow', rescues: 'around-the-hollow', 'farm-life': 'around-the-hollow' };
        select.value = validAlbum(current) ? current : (legacyMap[current] || (id === 'manager-category' ? 'all' : 'around-the-hollow'));
        select.dataset.simplified = 'true';
      });
    };
    apply();
    new MutationObserver(apply).observe(document.body, { childList: true, subtree: true });
  }

  function updateCopy() {
    const heading = document.querySelector('#new-photo .section-title h2');
    if (heading) heading.textContent = 'Share a Hollow Moment';
    const oldLabel = document.getElementById('selected-label');
    if (oldLabel) oldLabel.remove();
    const titleLabel = document.querySelector('label[for="title"]');
    if (titleLabel) titleLabel.textContent = 'Title';
    const title = document.getElementById('title');
    if (title) title.placeholder = 'Example: Ducklings exploring the creek';
    const storyLabel = document.querySelector('label[for="story"]');
    if (storyLabel) storyLabel.innerHTML = 'Description <span style="font-weight:600;color:var(--muted)">(optional)</span>';
    const heroCopy = document.querySelector('.hero p');
    if (heroCopy) heroCopy.textContent = 'Share moments, manage the gallery, and care for the public story of Falling Feathers Hollow from one simple mobile dashboard.';
  }

  function init() {
    if (!document.getElementById('new-photo')) return;
    addStyles();
    updateCopy();
    buildNavigator();
    replaceUploadButton();
    simplifyPhotoManagerCategories();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
