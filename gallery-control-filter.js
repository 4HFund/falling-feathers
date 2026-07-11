(() => {
  const originalFetch = window.fetch.bind(window);
  const isControlPhoto = photo => {
    const tags = Array.isArray(photo?.tags) ? photo.tags.map(String) : [];
    return tags.includes('website-control') || tags.some(tag =>
      tag.startsWith('egg-product-') ||
      tag.startsWith('flock-') ||
      tag.startsWith('about-')
    );
  };

  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const input = args[0];
    const url = typeof input === 'string' ? input : input?.url || '';
    if (!/\/gallery(?:\?|$)/.test(url) || !response.ok) return response;

    try {
      const data = await response.clone().json();
      if (!Array.isArray(data.resources)) return response;
      const headers = new Headers(response.headers);
      headers.delete('content-length');
      headers.delete('content-encoding');
      headers.set('content-type', 'application/json; charset=utf-8');
      return new Response(JSON.stringify({ ...data, resources: data.resources.filter(photo => !isControlPhoto(photo)) }), {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch {
      return response;
    }
  };
})();
