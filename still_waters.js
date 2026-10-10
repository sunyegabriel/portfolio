const waterSections = document.querySelectorAll('.watersSection');

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.target.classList.toggle('is-in-view', entry.isIntersecting));
  }, { threshold: 0.16 });
  waterSections.forEach((section) => observer.observe(section));
}
