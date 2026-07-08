(function () {
  const codeBlock = document.querySelector("[data-code-src]");
  if (codeBlock) {
    fetch(codeBlock.dataset.codeSrc)
      .then((response) => response.text())
      .then((text) => {
        codeBlock.textContent = text;
      })
      .catch(() => {
        codeBlock.textContent = [
          "Unable to load Processing source.",
          "",
          "Open this page through the local server:",
          "http://localhost:8000/processing_works.html",
          "",
          "Direct file opening blocks browser access to data/processing/FaceParticleEffect.pde."
        ].join("\n");
      });
  }

  const track = document.getElementById("readingTrack");
  const slider = document.getElementById("readingSlider");
  if (track && slider) {
    let syncing = false;
    slider.addEventListener("input", () => {
      const maxScroll = track.scrollWidth - track.clientWidth;
      track.scrollLeft = maxScroll * (Number(slider.value) / 100);
    });
    track.addEventListener("scroll", () => {
      if (syncing) return;
      syncing = true;
      window.requestAnimationFrame(() => {
        const maxScroll = track.scrollWidth - track.clientWidth;
        slider.value = maxScroll > 0 ? String((track.scrollLeft / maxScroll) * 100) : "0";
        syncing = false;
      });
    });
  }
})();
