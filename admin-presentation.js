(() => {
  const API_BASE = String(window.FFH_CONFIG?.apiBase || '').trim().replace(/\/$/, '');
  const SECTIONS = [
    { id: 'new-photo', icon: '📷', label: 'Share' },
    { id: 'homepage-manager', icon: '⭐', label: 'Homepage' },
    { id: 'sitewide-photo-manager', icon: '🖼️', label: 'Gallery' },
    { id: 'flock-image-controls', icon: '🐔', label: 'Flock' },
    { id: 'egg-inventory', icon: '🥚', label: 'Eggs' },
    { id: 'about-page-manager', icon: '🌿', label: 'About' }
  ];

  function text(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  }

  function addCleanStyles() {
    const style = document.createElement('style');
    style.textContent = `
      body{padding-bottom:calc(1rem + env(safe-area-inset-bottom))}
      .bottom-nav{display:none!important}
      .admin-section-nav{position:sticky;top:74px;z-index:490;margin:.7rem 0 1rem;padding:.48rem;background:rgba(255,250,241,.94);backdrop-filter:blur(18px);border:1px solid rgba(111,83,52,.13);border-radius:18px;box-shadow:0 10px 28px rgba(47,36,25,.09)}
      .admin-section-nav-inner{display:flex;gap:.42rem;overflow-x:auto;scrollbar-width:none;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}
      .admin-section-nav-inner::-webkit-scrollbar{display:none}
      .admin-section-link{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;gap:.38rem;min-height:43px;padding:.62rem .78rem;border-radius:13px;text-decoration:none;color:#604c38;font-size:.78rem;font-weight:900;white-space:nowrap;transition:background .16s ease,color .16s ease,transform .16s ease}
      .admin-section-link:hover{background:#f4e0c5;color:#3f2d1e}.admin-section-link:active{transform:scale(.98)}
      .admin-section-link.active{background:#203b2d;color:#fff;box-shadow:0 7px 18px rgba(32,59,45,.18)}
      .admin-section-link span{font-size:1rem}
      .panel,.hero{scroll-margin-top:145px}
      .panel{box-shadow:0 9px 28px rgba(75,59,42,.065)}
      .quick-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      .quick{min-height:116px;display:flex;flex-direction:column;justify-content:center}
      .quick:hover{border-color:rgba(32,59,45,.24);box-shadow:0 12px 28px rgba(75,59,42,.09)}
      @media(min-width:760px){
        .admin-section-nav{top:78px}.admin-section-nav-inner{justify-content:center;overflow:visible;flex-wrap:wrap}.admin-section-link{padding:.7rem .95rem;font-size:.82rem}
        .quick-grid{grid-template-columns:repeat(4,minmax(0,1fr))}
      }
      @media(max-width:560px){
        .admin-section-nav{top:72px;margin-left:-.2rem;margin-right:-.2rem;border-radius:15px;padding:.38rem}.admin-section-link{min-height:41px;padding:.58rem .7rem;font-size:.74rem}
        .hero{padding:1.55rem 1.2rem}.hero h1{font-size:clamp(2rem,10vw,3rem)}
        .section-title{align-items:flex-start}.section-title span{max-width:42%;text-align:right}
      }
    `;
    document.head.appendChild(style);
  }

  function removeLegacyPanels() {
    [...document.querySelectorAll('.panel')].forEach(panel => {
      const heading = panel.querySelector('.section-title h2')?.textContent.trim();
      if (heading === 'The sanctuary system' || heading === 'Build roadmap') panel.remove();
    });
  }

  function polishHeaderAndHero() {
    text('.status-pill span', 'Checking');
    text('.hero h1', 'Run the Hollow from one simple place.');
    text('.hero p', 'Share new moments, choose homepage photos, manage the gallery, update the flock, maintain egg availability, and control the About page from this private dashboard.');

    const actions = document.querySelector('.hero-actions');
    if (actions) {
      actions.innerHTML = '<a class="primary-link" href="#new-photo">📷 Share a Moment</a><a class="secondary-link" href="index.html">🏡 View Website</a>';
    }
  }

  function buildSectionNav() {
    if (document.getElementById('admin-section-nav')) return;
    const appbar = document.querySelector('.appbar');
    if (!appbar) return;

    const nav = document.createElement('nav');
    nav.id = 'admin-section-nav';
    nav.className = 'admin-section-nav';
    nav.setAttribute('aria-label', 'Admin sections');
    nav.innerHTML = `<div class="admin-section-nav-inner">
      <a class="admin-section-link active" href="#top"><span>🏠</span>Overview</a>
      ${SECTIONS.map(section => `<a class="admin-section-link" href="#${section.id}"><span>${section.icon}</span>${section.label}</a>`).join('')}
    </div>`;
    appbar.after(nav);
    document.querySelector('.app')?.setAttribute('id', 'top');

    nav.addEventListener('click', event => {
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', link.getAttribute('href'));
    });

    const targets = [document.querySelector('.hero'), ...SECTIONS.map(section => document.getElementById(section.id))].filter(Boolean);
    const observer = new IntersectionObserver(entries => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const id = visible.target.classList.contains('hero') ? 'top' : visible.target.id;
      nav.querySelectorAll('.admin-section-link').forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
      });
      const active = nav.querySelector('.admin-section-link.active');
      active?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, { rootMargin: '-145px 0px -58% 0px', threshold: [0.05, 0.25, 0.6] });
    targets.forEach(target => observer.observe(target));
  }

  function polishOverview() {
    const overview = document.querySelector('#dashboard-photo-count')?.closest('.panel');
    if (!overview) return;
    const heading = overview.querySelector('.section-title h2');
    const label = overview.querySelector('.section-title span');
    if (heading) heading.textContent = 'Gallery at a glance';
    if (label) label.textContent = 'Updates automatically';
  }

  function buildQuickActions() {
    const quickGrid = document.querySelector('.quick-grid');
    if (!quickGrid) return;
    quickGrid.innerHTML = `
      <a class="quick" href="#new-photo"><span>📷</span><strong>Share a moment</strong><small>Publish photos from your phone</small></a>
      <a class="quick" href="#homepage-manager"><span>⭐</span><strong>Homepage photos</strong><small>Choose the main images and wording</small></a>
      <a class="quick" href="#sitewide-photo-manager"><span>🖼️</span><strong>Gallery manager</strong><small>Edit, feature, hide, or delete photos</small></a>
      <a class="quick" href="#egg-inventory"><span>🥚</span><strong>Egg availability</strong><small>Update counts, prices, and photos</small></a>`;
  }

  function polishSectionLabels() {
    const uploadHeading = document.querySelector('#new-photo .section-title h2');
    if (uploadHeading) uploadHeading.textContent = 'Share a Hollow Moment';

    const recentPanel = document.getElementById('recent-grid')?.closest('.panel');
    const recentHeading = recentPanel?.querySelector('.section-title h2');
    if (recentHeading) recentHeading.textContent = 'Recent uploads from this device';

    const inventoryLabel = document.querySelector('#egg-inventory .section-title span');
    if (inventoryLabel) inventoryLabel.textContent = 'Live website controls';
  }

  function updateDashboard(resources) {
    const photos = Array.isArray(resources) ? resources : [];
    const visible = photos.filter(photo => photo.website_status !== 'hidden');
    const featured = photos.filter(photo => Boolean(photo.featured));
    text('#dashboard-photo-count', String(photos.length));
    text('#dashboard-featured-count', String(featured.length));
    text('#dashboard-visible-count', String(visible.length));
  }

  async function checkConnection() {
    const pill = document.querySelector('.status-pill');
    const dot = document.querySelector('.status-dot');
    if (!API_BASE) {
      text('.status-pill span', 'Setup needed');
      if (pill) pill.title = 'The secure admin service is not configured.';
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/gallery`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Request failed with ${response.status}`);
      const data = await response.json();
      updateDashboard(data.resources);
      text('.status-pill span', 'Ready');
      if (pill) pill.title = 'The public gallery service is responding.';
    } catch (error) {
      text('.status-pill span', 'Connection issue');
      if (pill) {
        pill.style.background = '#fff0ec';
        pill.style.color = '#8e3020';
        pill.title = error.message;
      }
      if (dot) {
        dot.style.background = '#a73d2a';
        dot.style.boxShadow = '0 0 0 4px rgba(167,61,42,.12)';
      }
    }
  }

  function improveNavigationTargets() {
    document.querySelectorAll('a[href="#photo-manager-mount"]').forEach(link => {
      link.setAttribute('href', '#sitewide-photo-manager');
    });
  }

  function init() {
    addCleanStyles();
    removeLegacyPanels();
    polishHeaderAndHero();
    polishOverview();
    buildQuickActions();
    polishSectionLabels();
    improveNavigationTargets();
    buildSectionNav();
    checkConnection();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
