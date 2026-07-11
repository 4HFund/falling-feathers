window.FFH_CONFIG = {
  apiBase: 'https://falling-feathers-admin.sidney-mozingo.workers.dev'
};

function loadFfhScript(source) {
  const script = document.createElement('script');
  script.src = source;
  script.async = false;
  document.head.appendChild(script);
}

if (/\/admin\.html$/i.test(window.location.pathname)) {
  [
    'admin-vision.js?v=20260710-2',
    'homepage-gallery-control.js?v=20260710-1',
    'egg-inventory-admin.js?v=20260710-1',
    'egg-product-photos-admin.js?v=20260711-1',
    'flock-images-admin.js?v=20260710-1',
    'about-page-admin.js?v=20260710-1',
    'admin-quick-publish.js?v=20260711-1'
  ].forEach(loadFfhScript);
}

if (/\/profiles\.html$/i.test(window.location.pathname)) {
  loadFfhScript('flock-images-public.js?v=20260710-1');
}

if (/\/about\.html$/i.test(window.location.pathname)) {
  loadFfhScript('about-page-public.js?v=20260710-1');
}
