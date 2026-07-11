(() => {
  const CLOUD_NAME = 'ixfa510d';
  const PRODUCTS = [
    { key: 'chicken', label: 'Chicken Eggs', icon: '🥚', description: 'Familiar, versatile eggs for everyday breakfasts, baking, and family meals.' },
    { key: 'duck', label: 'Duck Eggs', icon: '🦆', description: 'Larger eggs with rich yolks, popular for baking, hearty breakfasts, and special recipes.' },
    { key: 'quail', label: 'Quail Eggs', icon: '🪶', description: 'Small speckled eggs for unique meals, snacks, and occasional pet toppers.' }
  ];

  const apiBase = String(window.FFH_CONFIG?.apiBase || '').trim().replace(/\/$/, '');
  const rotations = [];

  function money(value) {
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0 ? `$${amount.toFixed(2)}` : 'Ask for price';
  }

  function imageUrl(photo, width = 900) {
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,c_fill,w_${width},h_${Math.round(width * .75)}/${photo.public_id}.${photo.format}`;
  }

  function photosFor(product, gallery) {
    return [1, 2, 3]
      .map(slot => gallery.find(photo => Array.isArray(photo.tags) && photo.tags.includes(`egg-product-${product}-${slot}`)))
      .filter(Boolean);
  }

  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .egg-product-rotator{position:relative;overflow:hidden;border-radius:18px;margin:-.15rem -.15rem 1rem;background:linear-gradient(135deg,#f5e6ce,#e8d7ba);aspect-ratio:4/3}
      .egg-product-rotator img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .45s ease}
      .egg-product-rotator img.active{opacity:1}
      .egg-product-dots{position:absolute;left:50%;bottom:.65rem;transform:translateX(-50%);display:flex;gap:.35rem;z-index:2}
      .egg-product-dot{width:8px;height:8px;border:0;border-radius:50%;padding:0;background:rgba(255,255,255,.55);box-shadow:0 1px 5px rgba(0,0,0,.2)}
      .egg-product-dot.active{background:#fff;transform:scale(1.18)}
      .egg-product-count{position:absolute;top:.65rem;right:.65rem;z-index:2;border-radius:999px;padding:.28rem .52rem;background:rgba(32,59,45,.82);color:#fff;font-size:.68rem;font-weight:900}
      @media(prefers-reduced-motion:reduce){.egg-product-rotator img{transition:none}}
    `;
    document.head.appendChild(style);
  }

  function createRotator(product, photos) {
    if (!photos.length) return null;
    const rotator = document.createElement('div');
    rotator.className = 'egg-product-rotator';
    rotator.setAttribute('aria-label', `${product.label} photos`);

    photos.forEach((photo, index) => {
      const img = document.createElement('img');
      img.src = imageUrl(photo);
      img.alt = `${product.label} photo ${index + 1}`;
      img.loading = index === 0 ? 'eager' : 'lazy';
      if (index === 0) img.classList.add('active');
      rotator.appendChild(img);
    });

    if (photos.length > 1) {
      const count = document.createElement('span');
      count.className = 'egg-product-count';
      count.textContent = `1 / ${photos.length}`;
      rotator.appendChild(count);

      const dots = document.createElement('div');
      dots.className = 'egg-product-dots';
      photos.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = `egg-product-dot${index === 0 ? ' active' : ''}`;
        dot.setAttribute('aria-label', `Show ${product.label} photo ${index + 1}`);
        dots.appendChild(dot);
      });
      rotator.appendChild(dots);

      let current = 0;
      const show = index => {
        current = (index + photos.length) % photos.length;
        rotator.querySelectorAll('img').forEach((img, i) => img.classList.toggle('active', i === current));
        rotator.querySelectorAll('.egg-product-dot').forEach((dot, i) => dot.classList.toggle('active', i === current));
        count.textContent = `${current + 1} / ${photos.length}`;
      };

      dots.addEventListener('click', event => {
        const dot = event.target.closest('.egg-product-dot');
        if (!dot) return;
        show([...dots.children].indexOf(dot));
      });

      const timer = window.setInterval(() => show(current + 1), 4200);
      rotations.push(timer);
    }

    return rotator;
  }

  function render(inventory, gallery = []) {
    const grid = document.getElementById('live-egg-grid');
    if (!grid) return;
    grid.replaceChildren();

    PRODUCTS.forEach(product => {
      const data = inventory.products?.[product.key] || {};
      const available = Boolean(data.available) && Number(data.count) > 0;
      const card = document.createElement('article');
      card.className = `card live-egg-card ${available ? 'is-available' : 'is-unavailable'}`;
      card.innerHTML = `
        <div class="live-egg-top"><div class="icon">${product.icon}</div><span class="availability-badge"></span></div>
        <h3>${product.label}</h3>
        <p>${product.description}</p>
        <div class="live-egg-details"><strong class="live-price"></strong><span class="live-package"></span></div>
        <p class="live-note"></p>`;

      const rotator = createRotator(product, photosFor(product.key, gallery));
      if (rotator) card.prepend(rotator);

      card.querySelector('.availability-badge').textContent = available ? 'Available now' : 'Currently unavailable';
      card.querySelector('.live-price').textContent = available ? money(data.price) : 'Check back soon';
      card.querySelector('.live-package').textContent = available && data.package ? `per ${data.package}` : '';
      const note = card.querySelector('.live-note');
      note.textContent = data.public_note || (available ? `${Number(data.count)} egg${Number(data.count) === 1 ? '' : 's'} currently on hand.` : 'Availability changes with the flock and season.');
      grid.appendChild(card);
    });

    const publicMessage = document.getElementById('live-availability-message');
    const pickupNote = document.getElementById('live-pickup-note');
    if (publicMessage) publicMessage.textContent = inventory.public_message || 'Fresh eggs are offered when the flock is laying and supply allows.';
    if (pickupNote) pickupNote.textContent = inventory.pickup_note || 'Contact us to confirm current availability and pickup details.';
    const updated = document.getElementById('inventory-updated');
    if (updated && inventory.updated_at) {
      const date = new Date(inventory.updated_at);
      updated.textContent = Number.isNaN(date.getTime()) ? '' : `Updated ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }
  }

  async function load() {
    if (!apiBase) return;
    try {
      const [inventoryResponse, galleryResponse] = await Promise.all([
        fetch(`${apiBase}/eggs`, { cache: 'no-store' }),
        fetch(`${apiBase}/gallery`, { cache: 'no-store' })
      ]);
      if (!inventoryResponse.ok) throw new Error(`Egg inventory returned ${inventoryResponse.status}`);
      const inventoryData = await inventoryResponse.json();
      const galleryData = galleryResponse.ok ? await galleryResponse.json() : { resources: [] };
      if (inventoryData.inventory) render(inventoryData.inventory, Array.isArray(galleryData.resources) ? galleryData.resources : []);
    } catch (error) {
      console.error('Egg inventory could not load:', error);
    }
  }

  addStyles();
  load();
})();
