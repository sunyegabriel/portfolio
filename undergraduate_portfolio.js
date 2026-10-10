const undergraduateSteps = [...document.querySelectorAll('[data-undergraduate-step]')];
const undergraduateIndex = document.querySelector('[data-undergraduate-index]');
const undergraduateArtwork = document.querySelector('.undergraduateArtwork');

if (undergraduateSteps.length && undergraduateArtwork) {
  const setActiveStep = (step) => {
    undergraduateSteps.forEach((item) => item.classList.toggle('is-current', item === step));
    const index = String(undergraduateSteps.indexOf(step) + 1).padStart(2, '0');
    if (undergraduateIndex) undergraduateIndex.textContent = index;
    undergraduateArtwork.dataset.stage = index;
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) setActiveStep(entry.target);
    });
  }, { rootMargin: '-38% 0px -42% 0px', threshold: 0.01 });

  undergraduateSteps.forEach((step) => observer.observe(step));
}
