(() => {
  const setText = (node, value) => { if (node && node.textContent !== value) node.textContent = value; };

  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .jacy-status-card{display:flex;align-items:center;justify-content:space-between;gap:1rem;background:linear-gradient(135deg,#eaf4e6,#fffdf8);border:1px solid rgba(73,99,62,.22);border-radius:20px;padding:1rem 1.1rem;margin:1rem 0;box-shadow:0 10px 28px rgba(47,75,53,.08)}
      .jacy-status-copy{display:flex;align-items:center;gap:.8rem}.jacy-status-icon{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:#203b2d;color:#fff;font-size:1.25rem}.jacy-status-copy strong,.jacy-status-copy small{display:block}.jacy-status-copy strong{color:#203b2d}.jacy-status-copy small{color:#6f5a44;margin-top:.18rem;line-height:1.35}.jacy-status-badge{white-space:nowrap;border-radius:999px;padding:.48rem .7rem;background:#f4e0c5;color:#5c4329;font-size:.72rem;font-weight:900}
      .admin-hidden-development{display:none!important}.admin-locked{display:none!important}.admin-unlock-note{background:#fff7df;border:1px solid #ead59a;border-radius:16px;padding:1rem;margin:1rem 0;line-height:1.5}
      @media(max-width:520px){.jacy-status-card{align-items:flex-start}.jacy-status-badge{font-size:.65rem}.jacy-status-copy small{font-size:.75rem}}
    `;
    document.head.appendChild(style);
  }

  function hideDevelopmentSections() {
    document.querySelectorAll('.panel').forEach(panel => {
      const heading = panel.querySelector('.section-title h2')?.textContent.trim().toLowerCase() || '';
      if (heading === 'build roadmap' || heading === 'the sanctuary system') panel.classList.add('admin-hidden-development');
    });
    document.querySelectorAll('.module.coming').forEach(item => item.classList.add('admin-hidden-development'));
  }

  function personalizeHero() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    setText(hero.querySelector('h1'), 'Welcome back, Jacy.');
    setText(hero.querySelector('p'), 'Update eggs, share new moments, and keep the public website fresh from one simple dashboard.');
  }

  function addStatusCard() {
    if (document.getElementById('jacy-site-status')) return;
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const card = document.createElement('section');
    card.className = 'jacy-status-card';
    card.id = 'jacy-site-status';
    card.innerHTML = `<div class="jacy-status-copy"><span class="jacy-status-icon">✓</span><div><strong>Website tools</strong><small>Egg inventory, photo publishing, flock controls, and public pages are connected.</small></div></div><span class="jacy-status-badge">Ready to manage</span>`;
    hero.after(card);
  }

  function neutralizeStaticOnlineBadge() {
    const badge = document.querySelector('.status-pill span');
    if (badge) badge.textContent = 'Admin dashboard';
    const dot = document.querySelector('.status-dot');
    if (dot) dot.style.display = 'none';
  }

  function clarifyLocalUploads() {
    setText(document.querySelector('#dashboard-local-count')?.nextElementSibling, 'Uploads in this browser');
    document.querySelectorAll('.section-title h2').forEach(heading => {
      if (heading.textContent.trim() === 'Recent phone uploads') heading.textContent = 'Recent uploads from this browser';
    });
  }

  function gatePublishingUntilUnlocked() {
    const publishPanel = document.getElementById('new-photo');
    const managerContent = document.getElementById('manager-content');
    if (!publishPanel || !managerContent) return;
    const unlocked = !managerContent.hidden;
    publishPanel.classList.toggle('admin-locked', !unlocked);
    let note = document.getElementById('admin-unlock-note');
    if (!unlocked && !note) {
      note = document.createElement('div');
      note.id = 'admin-unlock-note';
      note.className = 'admin-unlock-note';
      note.innerHTML = '<strong>Unlock the Photo Manager first.</strong><br>Publishing controls stay hidden until the admin PIN is accepted.';
      document.getElementById('sitewide-photo-manager')?.before(note);
    }
    if (unlocked) note?.remove();
  }

  function improveUploadCopy() {
    setText(document.querySelector('#new-photo .section-title h2'), 'Share a Hollow Moment');
    setText(document.getElementById('upload-button'), 'Choose Photos and Publish');
  }

  function polish() {
    personalizeHero();
    addStatusCard();
    hideDevelopmentSections();
    neutralizeStaticOnlineBadge();
    clarifyLocalUploads();
    improveUploadCopy();
    gatePublishingUntilUnlocked();
  }

  function init() {
    addStyles();
    polish();
    new MutationObserver(polish).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
