(() => {
  const FIVE_CATEGORIES = [
    ['ducks', '🦆', 'Ducks'],
    ['chickens', '🐔', 'Chickens'],
    ['quail', '🪶', 'Quail'],
    ['eggs', '🥚', 'Eggs'],
    ['around-the-hollow', '🌲', 'Around the Hollow']
  ];

  function restoreManagerMount() {
    if (document.getElementById('photo-manager-mount')) return;

    const mount = document.createElement('div');
    mount.id = 'photo-manager-mount';

    const sitewideManager = document.getElementById('sitewide-photo-manager');
    if (sitewideManager) {
      sitewideManager.before(mount);
      return;
    }

    const roadmapPanel = [...document.querySelectorAll('.panel')].find(panel =>
      panel.textContent.includes('Build roadmap')
    );
    if (roadmapPanel) roadmapPanel.before(mount);
    else document.querySelector('.app')?.appendChild(mount);
  }

  function normalizeUploadCategories() {
    const grid = document.getElementById('category-grid');
    if (!grid) return;

    const previous = grid.querySelector('.category.active')?.dataset.value;
    const selected = FIVE_CATEGORIES.some(([value]) => value === previous)
      ? previous
      : 'ducks';

    grid.replaceChildren(...FIVE_CATEGORIES.map(([value, icon, label]) => {
      const button = document.createElement('button');
      button.className = `category${value === selected ? ' active' : ''}`;
      button.type = 'button';
      button.dataset.value = value;
      button.innerHTML = `<span>${icon}</span>${label}`;
      return button;
    }));

    const active = grid.querySelector('.category.active');
    active?.click();
  }

  function recover() {
    restoreManagerMount();
    normalizeUploadCategories();
    document.documentElement.dataset.adminRecovery = 'ready';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', recover, { once: true });
  } else {
    recover();
  }
})();
