(() => {
  const PRODUCTS = [
    { key: 'chicken', label: 'Chicken Eggs', icon: '🥚', description: 'Familiar, versatile eggs for everyday breakfasts, baking, and family meals.' },
    { key: 'duck', label: 'Duck Eggs', icon: '🦆', description: 'Larger eggs with rich yolks, popular for baking, hearty breakfasts, and special recipes.' },
    { key: 'quail', label: 'Quail Eggs', icon: '🪶', description: 'Small speckled eggs for unique meals, snacks, and occasional pet toppers.' }
  ];

  const apiBase = String(window.FFH_CONFIG?.apiBase || '').trim().replace(/\/$/, '');

  function money(value) {
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0 ? `$${amount.toFixed(2)}` : 'Ask for price';
  }

  function render(inventory) {
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
      const response = await fetch(`${apiBase}/eggs`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Egg inventory returned ${response.status}`);
      const data = await response.json();
      if (data.inventory) render(data.inventory);
    } catch (error) {
      console.error('Egg inventory could not load:', error);
    }
  }

  load();
})();
