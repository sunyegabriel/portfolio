const readableIntro = document.querySelector('[data-readable-intro]');

if (readableIntro) {
  const introVideo = readableIntro.querySelector('video');
  const skipButton = readableIntro.querySelector('[data-readable-intro-skip]');
  let introFinished = false;

  const finishIntro = () => {
    if (introFinished) return;
    introFinished = true;
    readableIntro.classList.add('is-leaving');
    document.body.classList.remove('readableIntroPending');

    window.setTimeout(() => {
      introVideo.pause();
      readableIntro.remove();
    }, 650);
  };

  introVideo.addEventListener('ended', finishIntro, { once: true });
  introVideo.addEventListener('error', finishIntro, { once: true });
  skipButton.addEventListener('click', finishIntro);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    finishIntro();
  } else {
    const playback = introVideo.play();
    playback?.catch(() => readableIntro.classList.add('needs-interaction'));
    readableIntro.addEventListener('click', (event) => {
      if (event.target === skipButton || !introVideo.paused) return;
      introVideo.play().catch(finishIntro);
    });
  }
}
