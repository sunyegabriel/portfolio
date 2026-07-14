const heritageSearch = document.querySelector('[data-heritage-search]');
const heritageForm = document.querySelector('.heritageSearch');
const heritageReset = document.querySelector('[data-heritage-reset]');
const heritageCards = Array.from(document.querySelectorAll('[data-heritage-card]'));
const heritageCount = document.querySelector('[data-heritage-count]');
const heritageEmpty = document.querySelector('[data-heritage-empty]');
const heritageChecks = Array.from(document.querySelectorAll('[data-heritage-filter]'));

const normalize = (value) => value.toLowerCase().trim();

function activeValues(group) {
  return heritageChecks
    .filter((check) => check.dataset.group === group && check.checked)
    .map((check) => check.value);
}

function groupPass(card, group) {
  const values = activeValues(group);
  return values.length === 0 || values.includes(card.dataset[group]);
}

function applyHeritageFilters() {
  const query = normalize(heritageSearch ? heritageSearch.value : '');
  let visible = 0;

  heritageCards.forEach((card) => {
    const text = normalize(card.dataset.search || card.textContent);
    const matches =
      text.includes(query) &&
      groupPass(card, 'era') &&
      groupPass(card, 'location') &&
      groupPass(card, 'type');

    card.classList.toggle('is-hidden', !matches);
    if (matches) visible += 1;
  });

  if (heritageCount) {
    heritageCount.textContent = `${visible} ${visible === 1 ? 'object' : 'objects'} to explore`;
  }
  if (heritageEmpty) {
    heritageEmpty.hidden = visible !== 0;
  }
}

heritageSearch?.addEventListener('input', applyHeritageFilters);
heritageForm?.addEventListener('submit', (event) => event.preventDefault());
heritageChecks.forEach((check) => check.addEventListener('change', applyHeritageFilters));
heritageReset?.addEventListener('click', () => {
  if (heritageSearch) heritageSearch.value = '';
  heritageChecks.forEach((check) => {
    check.checked = false;
  });
  applyHeritageFilters();
});

applyHeritageFilters();
