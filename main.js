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
