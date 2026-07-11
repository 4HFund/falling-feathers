(() => {
  const path = window.location.pathname.toLowerCase();
  const setText = (selector, value, root = document) => {
    const node = root.querySelector(selector);
    if (node) node.textContent = value;
  };

  function ensureGalleryNavigation() {
    document.querySelectorAll('.links').forEach(links => {
      if (links.querySelector('a[href="gallery.html"]')) return;
      const flock = links.querySelector('a[href="profiles.html"]');
      if (!flock) return;
      const gallery = document.createElement('a');
      gallery.href = 'gallery.html';
      gallery.textContent = 'Gallery';
      flock.after(gallery);
    });
  }

  function removeRescueLanguage() {
    document.querySelectorAll('.pill').forEach(pill => {
      if (/rescues?/i.test(pill.textContent)) pill.remove();
    });
    document.querySelectorAll('.card, .value, .story-card').forEach(card => {
      const text = card.textContent.toLowerCase();
      if (text.includes('rescue & sanctuary care') || text.includes('rescues & special care')) card.remove();
    });
  }

  function polishHome() {
    document.title = 'Falling Feathers Hollow | Woman Veteran-Owned Hollow in Wheeling, WV';
    document.querySelector('meta[name="description"]')?.setAttribute('content', 'Falling Feathers Hollow is a woman veteran-owned, family-supported backyard hollow in Wheeling, West Virginia, centered on thoughtful animal care, seasonal eggs, and community connection.');
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', 'Meet the ducks, chickens, and quail of Falling Feathers Hollow and follow everyday life in our West Virginia hollow.');
    setText('.hero h1', 'A little Hollow with a lot of heart.');
    setText('.hero p', 'Falling Feathers Hollow is a family-supported backyard hollow tucked into the hills of Wheeling, West Virginia, where thoughtful animal care, seasonal eggs, and everyday moments come together.');
    setText('.mission-copy h2', 'Small-scale care with a whole lot of heart.');
    const missionParagraphs = document.querySelectorAll('.mission-copy p');
    if (missionParagraphs[0]) missionParagraphs[0].textContent = 'We are building a clean, intentional home where the animals come first. As the flock grows and changes, the standard stays the same: safe spaces, careful routines, and responsible stewardship.';
    if (missionParagraphs[1]) missionParagraphs[1].textContent = 'When the flock is laying and supply allows, we offer chicken, duck, and quail eggs with the same care and honesty that guides the rest of the Hollow.';
  }

  function polishAbout() {
    document.title = 'Meet Jacy | Falling Feathers Hollow';
    document.querySelector('meta[name="description"]')?.setAttribute('content', 'Meet Jacy Mozingo, U.S. Army veteran, mother of four, Christian, animal lover, and founder of Falling Feathers Hollow in Wheeling, West Virginia.');
    setText('.hero p', 'Falling Feathers Hollow is the vision of Jacy Mozingo, a U.S. Army veteran who served in Afghanistan, mother of four, Christian, and lifelong animal lover.');
    setText('.intro .kicker', 'Founder • Veteran • Mother • Christian');
    const fact = [...document.querySelectorAll('.fact')].find(item => item.textContent.includes('Served during the war in Afghanistan'));
    if (fact) setText('span', 'Served in Afghanistan.', fact);
    document.querySelectorAll('.story-card .kicker').forEach(node => {
      if (node.textContent.trim() === 'A huge animal lover') node.textContent = 'A lifelong love for animals';
    });
    document.querySelectorAll('.story-card p').forEach(node => {
      if (node.textContent.includes('rescues, and animals with special needs')) {
        node.textContent = 'What started with a love for ducks has grown into a caring home for chickens, quail, and animals that sometimes need a little extra attention. The goal is to remain personal, responsible, clean, and centered on the animals.';
      }
    });
  }

  function polishFlock() {
    document.querySelector('meta[name="description"]')?.setAttribute('content', 'Meet the ducks, chickens, and quail of Falling Feathers Hollow, a woman veteran-owned, family-supported backyard hollow in Wheeling, West Virginia.');
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', 'Meet the ducks, chickens, and quail cared for at Falling Feathers Hollow.');
    setText('.hero p', 'The flock at Falling Feathers Hollow grows and changes over time. This page highlights the animals currently shaping life here, with a focus on safe housing, clean routines, and thoughtful care.');
    document.querySelectorAll('.card h3').forEach(node => {
      if (node.textContent.trim() === 'Pip, Puddles & Their Young') node.textContent = 'Pip, Puddles & the Young Rouens';
    });
    document.querySelectorAll('.feature p').forEach(node => {
      node.textContent = 'The goal is to remain intentional, clean, trustworthy, and rooted in genuine care. The flock may grow, shift, and change, but the promise stays the same.';
    });
  }

  function polishGallery() {
    document.querySelector('meta[name="description"]')?.setAttribute('content', 'See the latest ducks, chickens, quail, eggs, and everyday life around Falling Feathers Hollow in Wheeling, West Virginia.');
    setText('.hero p', 'A living collection of feathers, muddy feet, fresh eggs, family moments, and the quiet beauty tucked into our West Virginia hollow.');
    const removeDisallowedFilters = () => {
      document.querySelectorAll('.filter-button').forEach(button => {
        if (/babies|rescue|farm life/i.test(button.textContent)) button.remove();
      });
    };
    removeDisallowedFilters();
    new MutationObserver(removeDisallowedFilters).observe(document.body, { childList: true, subtree: true });
  }

  function polishSupport() {
    document.querySelectorAll('.card p').forEach(node => {
      node.textContent = node.textContent.replace(/, and rescues/g, '').replace(/ and rescues/g, '');
    });
    const supporting = [...document.querySelectorAll('.section-heading p')].find(node => node.textContent.includes('ducks, ducklings, chickens, quail, and rescues'));
    if (supporting) supporting.textContent = 'A small, intentional, family-supported hollow caring for ducks, chickens, and quail in Wheeling, West Virginia.';
  }

  function normalizeEggCopy() {
    document.querySelectorAll('p').forEach(node => {
      node.innerHTML = node.innerHTML.replace(/Chicken, Duck, &amp; Quail Eggs/g, 'chicken, duck, and quail eggs').replace(/Chicken, Duck, & Quail Eggs/g, 'chicken, duck, and quail eggs');
    });
  }

  function init() {
    ensureGalleryNavigation();
    removeRescueLanguage();
    if (path.endsWith('/index.html') || path === '/' || path.endsWith('/falling-feathers/')) polishHome();
    if (path.endsWith('/about.html')) polishAbout();
    if (path.endsWith('/profiles.html')) polishFlock();
    if (path.endsWith('/gallery.html')) polishGallery();
    if (path.endsWith('/sponsor.html')) polishSupport();
    normalizeEggCopy();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();