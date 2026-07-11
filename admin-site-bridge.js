(() => {
  const originalFetch = window.fetch.bind(window);
  const legacyCategories = {
    babies: 'around-the-hollow',
    rescues: 'around-the-hollow',
    'farm-life': 'around-the-hollow'
  };

  window.fetch = (input, options = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    const isAdminPhotoUpdate = /\/admin\/photo(?:\?|$)/.test(url) && String(options.method || 'GET').toUpperCase() === 'POST';

    if (isAdminPhotoUpdate && typeof options.body === 'string') {
      try {
        const payload = JSON.parse(options.body);
        if (payload.action === 'edit' && legacyCategories[payload.category]) {
          payload.category = legacyCategories[payload.category];
          options = { ...options, body: JSON.stringify(payload) };
        }
      } catch {
        // Leave non-JSON requests unchanged.
      }
    }

    return originalFetch(input, options);
  };
})();
