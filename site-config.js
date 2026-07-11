window.FFH_CONFIG = {
  apiBase: 'https://falling-feathers-admin.sidney-mozingo.workers.dev'
};

function loadFfhScript(source) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = source;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Could not load ${source}`));
    document.head.appendChild(script);
  });
}

function whenDocumentReady() {
  if (document.readyState !== 'loading') return Promise.resolve();
  return new Promise(resolve => {
    document.addEventListener('DOMContentLoaded', resolve, { once: true });
  });
}

async function loadAdminFeatures() {
  await whenDocumentReady();

  const scripts = [
    'admin-site-bridge.js?v=20260711-integration1',
    'admin-recovery.js?v=20260711-integration1',
    'admin-vision.js?v=20260711-integration1',
    'homepage-gallery-control.js?v=20260711-integration1',
    'egg-inventory-admin.js?v=20260711-integration1',
    'egg-product-photos-admin.js?v=20260711-integration1',
    'flock-images-admin.js?v=20260711-integration1',
    'about-page-admin.js?v=20260711-integration1',
    'admin-quick-publish.js?v=20260711-integration1',
    'admin-presentation.js?v=20260711-integration1'
  ];

  for (const source of scripts) {
    await loadFfhScript(source);
  }
}

if (/\/admin\.html$/i.test(window.location.pathname)) {
  loadAdminFeatures().catch(error => {
    console.error(error);
    const notice = document.createElement('div');
    notice.style.cssText = 'margin:1rem;padding:1rem;border-radius:14px;background:#fff0ec;color:#8e3020;font-weight:800';
    notice.textContent = 'Some admin tools could not load. Refresh this page and try again.';
    document.querySelector('.app')?.prepend(notice);
  });
}

if (/\/profiles\.html$/i.test(window.location.pathname)) {
  loadFfhScript('flock-images-public.js?v=20260711-integration1');
}

if (/\/about\.html$/i.test(window.location.pathname)) {
  loadFfhScript('about-page-public.js?v=20260711-integration1');
}
