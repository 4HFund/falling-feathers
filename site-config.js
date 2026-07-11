window.FFH_CONFIG = {
  apiBase: 'https://falling-feathers-admin.sidney-mozingo.workers.dev'
};

if (/\/admin\.html$/i.test(window.location.pathname)) {
  ['admin-vision.js', 'egg-inventory-admin.js'].forEach(source => {
    const script = document.createElement('script');
    script.src = source;
    script.defer = true;
    document.head.appendChild(script);
  });
}
