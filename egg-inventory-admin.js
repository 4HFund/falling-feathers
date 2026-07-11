(() => {
  const PIN_KEY = 'falling-feathers-admin-pin';
  const PRODUCTS = [
    { key: 'chicken', label: 'Chicken Eggs', icon: '🥚', defaultPackage: 'dozen' },
    { key: 'duck', label: 'Duck Eggs', icon: '🦆', defaultPackage: 'half dozen' },
    { key: 'quail', label: 'Quail Eggs', icon: '🪶', defaultPackage: '18-count carton' }
  ];

  let inventory = null;
  let busy = false;

  function apiBase() {
    return String(window.FFH_CONFIG?.apiBase || '').trim().replace(/\/$/, '');
  }

  function getPin() {
    return sessionStorage.getItem(PIN_KEY) || '';
  }

  async function api(path, options = {}) {
    let pin = getPin();
    if (!pin) {
      pin = window.prompt('Enter your Hollow Admin PIN:') || '';
      if (!pin) throw new Error('PIN required.');
      sessionStorage.setItem(PIN_KEY, pin);
    }

    const response = await fetch(`${apiBase()}${path}`, {
      ...options,
      cache: 'no-store',
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

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .egg-inventory-grid{display:grid;gap:.8rem}.egg-inventory-card{background:#fff;border:1px solid var(--line);border-radius:20px;padding:1rem}.egg-card-top{display:flex;justify-content:space-between;align-items:center;gap:.8rem}.egg-card-title{display:flex;align-items:center;gap:.65rem}.egg-card-icon{font-size:2rem}.egg-card-title strong,.egg-card-title small{display:block}.egg-card-title small{color:var(--muted);margin-top:.15rem}.egg-availability{display:flex;align-items:center;gap:.4rem;font-size:.78rem;font-weight:900}.egg-availability input{width:23px;height:23px;accent-color:var(--green)}
      .egg-counter{display:grid;grid-template-columns:52px 1fr 52px;gap:.55rem;align-items:center;margin:1rem 0}.egg-counter button{height:48px;border:0;border-radius:14px;background:#f4e0c5;color:#5c4329;font-size:1.45rem;font-weight:900}.egg-counter input{height:48px;width:100%;text-align:center;border:1px solid rgba(75,59,42,.2);border-radius:14px;font-size:1.25rem;font-weight:900;color:var(--deep)}
      .egg-fields{display:grid;grid-template-columns:1fr 1.3fr;gap:.6rem}.egg-fields label,.egg-public-note label{display:block;font-size:.72rem;font-weight:900;color:var(--deep);margin-bottom:.32rem}.egg-fields input,.egg-public-note input{width:100%;padding:.78rem;border:1px solid rgba(75,59,42,.18);border-radius:11px;background:#fff}.egg-public-note{margin-top:.65rem}
      .inventory-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;margin:.8rem 0}.inventory-summary div{background:#fff;border:1px solid var(--line);border-radius:14px;padding:.75rem;text-align:center}.inventory-summary strong,.inventory-summary small{display:block}.inventory-summary strong{font-size:1.25rem;color:var(--deep)}.inventory-summary small{font-size:.63rem;color:var(--muted);margin-top:.2rem}.inventory-total{background:var(--green)!important;color:#fff}.inventory-total strong,.inventory-total small{color:#fff!important}
      .inventory-message{display:none;margin-top:.75rem;padding:.8rem;border-radius:12px;font-weight:800;line-height:1.4}.inventory-message.show{display:block}.inventory-message.loading{background:#fff7df;color:#6c4d16}.inventory-message.success{background:var(--mint);color:var(--green)}.inventory-message.error{background:#fff0ec;color:#8e3020}.inventory-actions{display:grid;grid-template-columns:1fr 1fr;gap:.65rem}.inventory-secondary{border:1px solid rgba(75,59,42,.18);background:#fff;border-radius:15px;padding:.9rem;font-weight:900;color:var(--brown)}.inventory-actions button:disabled,.egg-inventory-card button:disabled,.egg-inventory-card input:disabled{opacity:.55}
      @media(min-width:760px){.egg-inventory-grid{grid-template-columns:repeat(3,1fr)}}
    `;
    document.head.appendChild(style);
  }

  function createPanel() {
    if (document.getElementById('egg-inventory')) return;
    const footer = document.querySelector('.footer');
    const panel = document.createElement('section');
    panel.className = 'panel vision-panel';
    panel.id = 'egg-inventory';
    panel.innerHTML = `
      <div class="section-title"><h2>Egg Inventory</h2><span>Phase 1 live</span></div>
      <p style="line-height:1.55;margin-top:0">Update chicken, duck, and quail egg counts. Saving here updates the public Eggs page.</p>
      <div class="inventory-summary" id="inventory-summary"></div>
      <div id="inventory-editor" hidden>
        <div class="egg-inventory-grid" id="egg-inventory-grid"></div>
        <div class="field"><label for="inventory-public-message">Public availability message</label><textarea id="inventory-public-message" maxlength="300"></textarea></div>
        <div class="field"><label for="inventory-pickup-note">Pickup or ordering note</label><textarea id="inventory-pickup-note" maxlength="300"></textarea></div>
        <div class="inventory-actions"><button class="inventory-secondary" id="inventory-refresh" type="button">↻ Refresh</button><button class="upload-button" id="inventory-save" type="button" style="margin:0">Save Inventory</button></div>
      </div>
      <div class="inventory-message" id="inventory-message" aria-live="polite"></div>`;
    footer.before(panel);
    document.getElementById('inventory-refresh').addEventListener('click', loadInventory);
    document.getElementById('inventory-save').addEventListener('click', saveInventory);
  }

  function setBusy(value) {
    busy = value;
    document.querySelectorAll('#egg-inventory button,#egg-inventory input,#egg-inventory textarea').forEach(control => {
      control.disabled = value;
    });
  }

  function showMessage(text, type = 'success', autoHide = false) {
    const node = document.getElementById('inventory-message');
    node.textContent = text;
    node.className = `inventory-message show ${type}`;
    if (autoHide) {
      window.setTimeout(() => {
        if (node.textContent === text) node.className = 'inventory-message';
      }, 3500);
    }
  }

  function renderSummary() {
    const node = document.getElementById('inventory-summary');
    if (!node || !inventory) return;
    node.replaceChildren();
    let total = 0;

    PRODUCTS.forEach(product => {
      const data = inventory.products[product.key];
      const count = Math.max(0, Number(data.count) || 0);
      total += count;
      const box = document.createElement('div');
      box.innerHTML = `<strong>${count}</strong><small>${product.label}</small>`;
      node.appendChild(box);
    });

    const totalBox = document.createElement('div');
    totalBox.className = 'inventory-total';
    totalBox.innerHTML = `<strong>${total}</strong><small>Total Eggs</small>`;
    node.appendChild(totalBox);
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
        <div class="egg-card-top">
          <div class="egg-card-title"><span class="egg-card-icon">${product.icon}</span><div><strong>${product.label}</strong><small>Eggs currently on hand</small></div></div>
          <label class="egg-availability"><input type="checkbox" data-field="available"> Available</label>
        </div>
        <div class="egg-counter"><button type="button" data-change="-1" aria-label="Subtract one">−</button><input type="number" min="0" step="1" inputmode="numeric" data-field="count"><button type="button" data-change="1" aria-label="Add one">+</button></div>
        <div class="egg-fields"><div><label>Price ($)</label><input type="number" min="0" step="0.25" inputmode="decimal" data-field="price"></div><div><label>Sold as</label><input maxlength="40" data-field="package"></div></div>
        <div class="egg-public-note"><label>Optional public note</label><input maxlength="120" data-field="public_note" placeholder="Example: Limited supply this week"></div>`;

      card.querySelector('[data-field="available"]').checked = Boolean(data.available);
      card.querySelector('[data-field="count"]').value = Math.max(0, Number(data.count) || 0);
      card.querySelector('[data-field="price"]').value = data.price || '';
      card.querySelector('[data-field="package"]').value = data.package || product.defaultPackage;
      card.querySelector('[data-field="public_note"]').value = data.public_note || '';

      card.addEventListener('click', event => {
        if (busy) return;
        const button = event.target.closest('[data-change]');
        if (!button) return;
        const countInput = card.querySelector('[data-field="count"]');
        countInput.value = Math.max(0, (Number(countInput.value) || 0) + Number(button.dataset.change));
        card.querySelector('[data-field="available"]').checked = Number(countInput.value) > 0;
        collectInventory();
        renderSummary();
      });

      card.addEventListener('input', () => {
        collectInventory();
        renderSummary();
      });
      grid.appendChild(card);
    });

    document.getElementById('inventory-public-message').value = inventory.public_message || '';
    document.getElementById('inventory-pickup-note').value = inventory.pickup_note || '';
    document.getElementById('inventory-editor').hidden = false;
    renderSummary();
  }

  function collectInventory() {
    if (!inventory) return defaultInventory();
    PRODUCTS.forEach(product => {
      const card = document.querySelector(`[data-product="${product.key}"]`);
      if (!card) return;
      const count = Math.max(0, Math.floor(Number(card.querySelector('[data-field="count"]').value) || 0));
      inventory.products[product.key] = {
        count,
        price: Number(card.querySelector('[data-field="price"]').value || 0).toFixed(2),
        package: card.querySelector('[data-field="package"]').value.trim() || product.defaultPackage,
        available: card.querySelector('[data-field="available"]').checked && count > 0,
        public_note: card.querySelector('[data-field="public_note"]').value.trim()
      };
    });
    inventory.public_message = document.getElementById('inventory-public-message').value.trim();
    inventory.pickup_note = document.getElementById('inventory-pickup-note').value.trim();
    return inventory;
  }

  async function loadInventory() {
    if (busy) return;
    setBusy(true);
    showMessage('Loading live egg inventory…', 'loading');
    try {
      const data = await api('/admin/eggs');
      if (data.configured === false) throw new Error('Cloudflare egg storage is not connected to this deployment yet.');
      inventory = data.inventory || defaultInventory();
      renderInventory();
      showMessage('Live inventory loaded.', 'success', true);
    } catch (error) {
      inventory = defaultInventory();
      renderInventory();
      showMessage(error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function saveInventory() {
    if (busy || !inventory) return;
    collectInventory();
    setBusy(true);
    showMessage('Saving inventory and updating the public Eggs page…', 'loading');
    try {
      const data = await api('/admin/eggs', { method: 'POST', body: JSON.stringify(inventory) });
      inventory = data.inventory;
      renderInventory();
      showMessage('Inventory saved and published.', 'success', true);
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  function initialize() {
    injectStyles();
    createPanel();
    window.setTimeout(loadInventory, 450);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
  else initialize();
})();
