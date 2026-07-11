(() => {
  const API_BASE = String(window.FFH_CONFIG?.apiBase || '').trim().replace(/\/$/, '');

  function text(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
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
      <a class="quick" href="#flock-image-controls"><span>🐔</span><strong>Meet the flock</strong><small>Update group pictures and descriptions</small></a>
      <a class="quick" href="#egg-inventory"><span>🥚</span><strong>Egg availability</strong><small>Update counts, prices, and product photos</small></a>
      <a class="quick" href="#about-page-manager"><span>🌿</span><strong>About Jacy</strong><small>Change the main About page pictures</small></a>
      <a class="quick" href="gallery.html"><span>🌐</span><strong>View gallery</strong><small>Check what visitors currently see</small></a>
      <a class="quick" href="index.html"><span>🏡</span><strong>View website</strong><small>Open the public homepage</small></a>`;
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
    removeLegacyPanels();
    polishHeaderAndHero();
    polishOverview();
    buildQuickActions();
    polishSectionLabels();
    improveNavigationTargets();
    checkConnection();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
