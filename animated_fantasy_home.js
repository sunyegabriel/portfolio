document.documentElement.classList.add('js');

const video = document.querySelector('video');
const film = document.querySelector('.film-frame');

if (video && film) {
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) video.preload = 'auto';
  }, { rootMargin: '240px' });
  observer.observe(film);
}

const revealItems = document.querySelectorAll('.motion-card, .render, .source-card');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.14 });

revealItems.forEach((item, index) => {
  item.style.transitionDelay = `${index % 3 * 90}ms`;
  revealObserver.observe(item);
});
