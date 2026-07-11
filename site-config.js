window.FFH_CONFIG = {
  apiBase: 'https://falling-feathers-admin.sidney-mozingo.workers.dev'
};

if (/\/admin\.html$/i.test(window.location.pathname)) {
  const script = document.createElement('script');
  script.src = 'admin-vision.js';
  script.defer = true;
  document.head.appendChild(script);
}
