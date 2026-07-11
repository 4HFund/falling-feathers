(() => {
  const PIN_KEY = 'falling-feathers-admin-pin';
  const PRODUCTS = [
    { key: 'chicken', label: 'Chicken Eggs', icon: '🥚', defaultPackage: 'dozen' },
    { key: 'duck', label: 'Duck Eggs', icon: '🦆', defaultPackage: 'half dozen' },
    { key: 'quail', label: 'Quail Eggs', icon: '🪶', defaultPackage: '18-count carton' }
  ];
  let inventory = null;

  function apiBase() {
    return String(window.FFH_CONFIG?.apiBase || localStorage.getItem('falling-feathers-worker-url') || '').trim().replace(/\/$/, '');
  }

  function adminPin() {
    return sessionStorage.getItem(PIN_KEY) || '';
  }

  async function api(path, options = {}) {
    let pin = adminPin();
    if (!pin) {
      pin = window.prompt('Enter your Hollow Admin PIN:') || '';
      if (!pin) throw new Error('PIN required.');
      sessionStorage.setItem(PIN_KEY, pin);
    }
    const response = await fetch(`${apiBase()}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Pin': pin,
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) sessionStorage.removeItem(PIN_KEY);
      throw new Error(data.error || `Request failed with ${response.status}`);
    }
    return data;
  }

  function defaultInventory() {
    return {
      public_message: 'Fresh eggs are offered when the flock is laying and supply allows.',
      pickup_note: 'Local pickup in the Wheeling, West Virginia area. Contact us to confirm availability.',
      products: {
        chicken: { count: 0, price: '5.00', package: 'dozen', available: false, public_note: '' },
        duck: { count: 0, price: '6.00', package: 'half dozen', available: false, public_note: '' },
        quail: { count: 0, price: '6.00', package: '18-count carton', available: false, public_note: '' }
      }
    };
  }

  function ensureStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .egg-inventory-grid{display:grid;gap:.8rem}.egg-inventory-card{background:#fff;border:1px solid var(--line);border-radius:20px;padding:1rem}.egg-card-top{display:flex;justify-content:space-between;align-items:center;gap:.8rem}.egg-card-title{display:flex;align-items:center;gap:.65rem}.egg-card-icon{font-size:2rem}.egg-card-title strong,.egg-card-title small{display:block}.egg-card-title small{color:var(--muted);margin-top:.15rem}.egg-availability{display:flex;align-items:center;gap:.4rem;font-size:.78rem;font-weight:900}.egg-availability input{width:23px;height:23px;accent-color:var(--green)}.egg-counter{display:grid;grid-template-columns:52px 1fr 52px;gap:.55rem;align-items:center;margin:1rem 0}.egg-counter button{height:48px;border:0;border-radius:14px;background:#f4e0c5;color:#5c4329;font-size:1.45rem;font-weight:900}.egg-counter input{height:48px;width:100%;text-align:center;border:1px solid rgba(75,59,42,.2);border-radius:14px;font-size:1.25rem;font-weight:900;color:var(--deep)}.egg-fields{display:grid;grid-template-columns:1fr 1.3fr;gap:.6rem}.egg-fields label,.egg-public-note label{display:block;font-size:.72rem;font-weight:900;color:var(--deep);margin-bottom:.32rem}.egg-fields input,.egg-fields select,.egg-public-note input{width:100%;padding:.78rem;border:1px solid rgba(75,59,42,.18);border-radius:11px;background:#fff}.egg-public-note{margin-top:.65rem}.inventory-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin:.8rem 0}.inventory-summary div{background:#fff;border:1px solid var(--line);border-radius:14px;padding:.75rem;text-align:center}.inventory-summary strong,.inventory-summary small{display:block}.inventory-summary strong{font-size:1.25rem;color:var(--deep)}.inventory-summary small{font-size:.66rem;color:var(--muted);margin-top:.2rem}.inventory-message{display:none;margin-top:.75rem;padding:.8rem;border-radius:12px;font-weight:800}.inventory-message.show{display:block}.inventory-message.success{background:var(--mint);color:var(--green)}.inventory-message.error{background:#fff0ec;color:#8e3020}.inventory-actions{display:grid;grid-template-columns:1fr 1fr;gap:.65rem}.inventory-secondary{border:1px solid rgba(75,59,42,.18);background:#fff;border-radius:15px;padding:.9rem;font-weight:900;color:var(--brown)}
      @media(min-width:760px){.egg-inventory-grid{grid-template-columns:repeat(3,1fr)}}
    `;
    document.head.appendChild(style);
  }

  function createPanel() {
    const records = document.getElementById('quick-records');
    const footer = document.querySelector('.footer');
    const panel = document.createElement('section');
    panel.className = 'panel vision-panel';
    panel.id = 'egg-inventory';
    panel.innerHTML = `
      <div class="section-title"><h2>Egg Inventory</h2><span>Live website availability</span></div>
      <p style="line-height:1.55;margin-top:0">Track how many eggs are ready, set prices, and control exactly what customers see on the Trading Post.</p>
      <button class="upload-button" id="inventory-load" type="button">Open Egg Inventory</button>
      <div id="inventory-editor" hidden>
        <div class="inventory-summary" id="inventory-summary"></div>
        <div class="egg-inventory-grid" id="egg-inventory-grid"></div>
        <div class="field"><label for="inventory-public-message">Public availability message</label><textarea id="inventory-public-message" maxlength="300"></textarea></div>
        <div class="field"><label for="inventory-pickup-note">Pickup or ordering note</label><textarea id="inventory-pickup-note" maxlength="300"></textarea></div>
        <div class="inventory-actions"><button class="inventory-secondary" id="inventory-refresh" type="button">Refresh</button><button class="upload-button" id="inventory-save" type="button" style="margin:0">Save & Update Website</button></div>
      </div>
      <div class="inventory-message" id="inventory-message" aria-live="polite"></div>`;
    (records || footer)?.before(panel);
    document.getElementById('inventory-load').addEventListener('click', loadInventory);
    document.getElementById('inventory-refresh').addEventListener('click', loadInventory);
    document.getElementById('inventory-save').addEventListener('click', saveInventory);
  }

  function showMessage(text, type = 'success') {
    const node = document.getElementById('inventory-message');
    node.textContent = text;
    node.className = `inventory-message show ${type}`;
  }

  function renderSummary() {
    const node = document.getElementById('inventory-summary');
    node.replaceChildren();
    PRODUCTS.forEach(product => {
      const data = inventory.products[product.key];
      const box = document.createElement('div');
      box.innerHTML = `<strong>${Math.max(0, Number(data.count) || 0)}</strong><small>${product.label}</small>`;
      node.appendChild(box);
    });
  }

  function renderInventory() {
    const grid = document.getElementById('egg-inventory-grid');
    grid.replaceChildren();
    PRODUCTS.forEach(product => {
      const data = inventory.products[product.key];
      const card = document.createElement('article');
      card.className = 'egg-inventory-card';
      card.dataset.product = product.key;
      card.innerHTML = `
        <div class="egg-card-top"><div class="egg-card-title"><span class="egg-card-icon">${product.icon}</span><div><strong>${product.label}</strong><small>Eggs currently on hand</small></div></div><label class="egg-availability"><input type="checkbox" data-field="available"> Available</label></div>
        <div class="egg-counter"><button type="button" data-change="-1" aria-label="Subtract one">−</button><input type="number" min="0" step="1" inputmode="numeric" data-field="count"><button type="button" data-change="1" aria-label="Add one">+</button></div>
        <div class="egg-fields"><div><label>Price ($)</label><input type="number" min="0" step="0.25" inputmode="decimal" data-field="price"></div><div><label>Sold as</label><input maxlength="40" data-field="package"></div></div>
        <div class="egg-public-note"><label>Optional public note</label><input maxlength="120" data-field="public_note" placeholder="Example: Limited supply this week"></div>`;
      card.querySelector('[data-field="available"]').checked = Boolean(data.available);
      card.querySelector('[data-field="count"]').value = Math.max(0, Number(data.count) || 0);
      card.querySelector('[data-field="price"]').value = data.price || '';
      card.querySelector('[data-field="package"]').value = data.package || product.defaultPackage;
      card.querySelector('[data-field="public_note"]').value = data.public_note || '';
      card.addEventListener('click', event => {
        const change = Number(event.target.closest('[data-change]')?.dataset.change || 0);
        if (!change) return;
        const count = card.querySelector('[data-field="count"]');
        count.value = Math.max(0, (Number(count.value) || 0) + change);
        if (Number(count.value) > 0) card.querySelector('[data-field="available"]').checked = true;
        collectInventory();
        renderSummary();
      });
      grid.appendChild(card);
    });
    document.getElementById('inventory-public-message').value = inventory.public_message || '';
    document.getElementById('inventory-pickup-note').value = inventory.pickup_note || '';
    renderSummary();
  }

  function collectInventory() {
    PRODUCTS.forEach(product => {
      const card = document.querySelector(`[data-product="${product.key}"]`);
      if (!card) return;
      inventory.products[product.key] = {
        count: Math.max(0, Math.floor(Number(card.querySelector('[data-field="count"]').value) || 0)),
        price: Number(card.querySelector('[data-field="price"]').value || 0).toFixed(2),
        package: card.querySelector('[data-field="package"]').value.trim() || product.defaultPackage,
        available: card.querySelector('[data-field="available"]').checked,
        public_note: card.querySelector('[data-field="public_note"]').value.trim()
      };
    });
    inventory.public_message = document.getElementById('inventory-public-message').value.trim();
    inventory.pickup_note = document.getElementById('inventory-pickup-note').value.trim();
    return inventory;
  }

  async function loadInventory() {
    try {
      showMessage('Loading live egg inventory…');
      const data = await api('/admin/eggs');
      inventory = data.inventory || defaultInventory();
      document.getElementById('inventory-editor').hidden = false;
      document.getElementById('inventory-load').textContent = 'Egg Inventory Loaded';
      renderInventory();
      showMessage(data.configured === false ? 'The inventory screen is ready, but Cloudflare storage still needs connected.' : 'Live inventory loaded.');
    } catch (error) {
      showMessage(error.message, 'error');
    }
  }

  async function saveInventory() {
    try {
      collectInventory();
      showMessage('Saving inventory and updating the public Trading Post…');
      const data = await api('/admin/eggs', { method: 'POST', body: JSON.stringify(inventory) });
      inventory = data.inventory;
      renderInventory();
      showMessage('Egg inventory saved. The Trading Post updates automatically.');
    } catch (error) {
      showMessage(error.message, 'error');
    }
  }

  function initialize() {
    ensureStyles();
    createPanel();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
  else initialize();
})();
