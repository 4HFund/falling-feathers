window.FFH_CONFIG = {
  apiBase: 'https://falling-feathers-admin.sidney-mozingo.workers.dev'
};

if (/\/admin\.html$/i.test(window.location.pathname)) {
  ['admin-vision.js?v=20260710-1', 'egg-inventory-admin.js?v=20260710-1'].forEach(source => {
    const script = document.createElement('script');
    script.src = source;
    script.async = false;
    document.head.appendChild(script);
  });
}
