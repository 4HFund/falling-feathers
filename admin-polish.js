(() => {
  const setText = (node, value) => { if (node && node.textContent !== value) node.textContent = value; };

  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .jacy-status-card{display:flex;align-items:center;justify-content:space-between;gap:1rem;background:linear-gradient(135deg,#eaf4e6,#fffdf8);border:1px solid rgba(73,99,62,.22);border-radius:20px;padding:1rem 1.1rem;margin:1rem 0;box-shadow:0 10px 28px rgba(47,75,53,.08)}
      .jacy-status-copy{display:flex;align-items:center;gap:.8rem}.jacy-status-icon{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:#203b2d;color:#fff;font-size:1.25rem}.jacy-status-copy strong,.jacy-status-copy small{display:block}.jacy-status-copy strong{color:#203b2d}.jacy-status-copy small{color:#6f5a44;margin-top:.18rem;line-height:1.35}.jacy-status-badge{white-space:nowrap;border-radius:999px;padding:.48rem .7rem;background:#203b2d;color:#fff;font-size:.72rem;font-weight:900}
      .admin-hidden-development{display:none!important}
      @media(max-width:520px){.jacy-status-card{align-items:flex-start}.jacy-status-badge{font-size:.65rem}.jacy-status-copy small{font-size:.75rem}}
    `;
    document.head.appendChild(style);
  }

  function panelHeading(panel) {
    return panel?.querySelector('.section-title h2')?.textContent.trim() || '';
  }

  function hideDevelopmentSections() {
    document.querySelectorAll('.panel').forEach(panel => {
      const heading = panelHeading(panel).toLowerCase();
      if (heading === 'build roadmap' || heading === 'the sanctuary system') panel.classList.add('admin-hidden-development');
    });
    document.querySelectorAll('.module.coming').forEach(item => item.classList.add('admin-hidden-development'));
  }

  function replacePrototypeLanguage() {
    document.querySelectorAll('.section-title span').forEach(span => {
      const text = span.textContent.trim().toLowerCase();
      if (text.includes('phase 1')) setText(span, 'Live');
      if (text === 'our shared vision') setText(span, 'Hollow tools');
      if (text === 'designed in phases') setText(span, 'Future tools');
    });
    document.querySelectorAll('*').forEach(node => {
      if (!node.children.length && node.textContent.trim() === 'Coming next') setText(node, 'Planned');
    });
  }

  function personalizeHero() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    setText(hero.querySelector('h1'), 'Welcome back, Jacy.');
    setText(hero.querySelector('p'), 'Here’s what’s happening around the Hollow. Update eggs, share new moments, and keep the website looking fresh from your phone.');
  }

  function addStatusCard() {
    if (document.getElementById('jacy-site-status')) return;
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const card = document.createElement('section');
    card.className = 'jacy-status-card';
    card.id = 'jacy-site-status';
    card.innerHTML = `<div class="jacy-status-copy"><span class="jacy-status-icon">✓</span><div><strong>Website status</strong><small>Egg inventory, photo publishing, flock controls, and public pages are connected.</small></div></div><span class="jacy-status-badge">Everything online</span>`;
    hero.after(card);
  }

  function cleanPhotoManager() {
    document.querySelectorAll('.manager-card').forEach(card => {
      const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
      const controlPhoto = title.includes('product photo') || title.includes('flock picture') || title.includes('hero photo') || title.includes('meet jacy portrait') || title.includes('family & service photo') || title.includes('animal care photo');
      card.classList.toggle('admin-hidden-development', controlPhoto);
    });
    setText(document.querySelector('#sitewide-photo-manager > p'), 'Manage the Hollow moments shared in the public gallery. Page design pictures are handled in their own sections.');
  }

  function polish() {
    personalizeHero();
    addStatusCard();
    hideDevelopmentSections();
    replacePrototypeLanguage();
    cleanPhotoManager();
  }

  function init() {
    addStyles();
    polish();
    new MutationObserver(polish).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
