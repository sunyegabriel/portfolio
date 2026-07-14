const observer = new IntersectionObserver((entries)=>entries.forEach((entry)=>{if(entry.isIntersecting)entry.target.classList.add('visible')}),{threshold:.08});
document.querySelectorAll('.reveal').forEach((el)=>observer.observe(el));

const filterButtons = document.querySelectorAll('[data-filter]');
const projectCards = document.querySelectorAll('.projectCard[data-category]');

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;

    filterButtons.forEach((item) => item.classList.toggle('active', item === button));
    projectCards.forEach((card) => {
      const categories = card.dataset.category.split(' ');
      card.classList.toggle('is-hidden', filter !== 'all' && !categories.includes(filter));
    });
  });
});

document.querySelectorAll('[data-heritage-reveal]').forEach((reveal) => {
  const stage = reveal.querySelector('.heritageRevealStage');
  const handle = reveal.querySelector('[data-heritage-handle]');
  const reset = reveal.querySelector('[data-heritage-reset-view]');
  let dragging = false;

  const setSplit = (clientX) => {
    const rect = stage.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    stage.style.setProperty('--split', `${ratio * 100}%`);
  };

  const activate = () => {
    reveal.classList.add('is-active');
    stage.style.setProperty('--split', '100%');
  };

  reveal.addEventListener('click', () => {
    if (!reveal.classList.contains('is-active')) activate();
  });

  reset?.addEventListener('click', (event) => {
    event.stopPropagation();
    reveal.classList.remove('is-active');
    stage.style.setProperty('--split', '100%');
  });

  reveal.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate();
    }
  });

  handle?.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    if (!reveal.classList.contains('is-active')) activate();
    dragging = true;
    handle.setPointerCapture(event.pointerId);
    setSplit(event.clientX);
  });

  handle?.addEventListener('pointermove', (event) => {
    if (dragging) setSplit(event.clientX);
  });

  handle?.addEventListener('pointerup', (event) => {
    dragging = false;
    handle.releasePointerCapture(event.pointerId);
  });

  handle?.addEventListener('pointercancel', () => {
    dragging = false;
  });
});

document.body.classList.add('media-protection');

const protectedMediaSelector = 'img, canvas, video';

document.querySelectorAll(protectedMediaSelector).forEach((media) => {
  media.setAttribute('draggable', 'false');
  media.setAttribute('loading', media.getAttribute('loading') || 'lazy');
});

document.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

document.addEventListener('dragstart', (event) => {
  if (event.target.closest(protectedMediaSelector)) event.preventDefault();
});

document.addEventListener('copy', (event) => {
  if (window.getSelection().toString().length) return;
  event.preventDefault();
});

document.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  const blocked =
    key === 'f12' ||
    (event.ctrlKey && event.shiftKey && ['i', 'j', 'c'].includes(key)) ||
    (event.ctrlKey && ['s', 'u'].includes(key));

  if (blocked) {
    event.preventDefault();
    event.stopPropagation();
  }
});
