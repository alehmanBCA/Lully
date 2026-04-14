document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  if (!body || !body.classList.contains('dashboard-page')) {
    return;
  }
  const heroTitle = document.querySelector('.hero-title');
  if (!heroTitle) {
    return;
  }

  const originalText = heroTitle.textContent || '';
  const targetPhrase = 'a simple way to see how your baby is doing';
  const targetIndex = originalText.toLowerCase().indexOf(targetPhrase);

  if (targetIndex === -1) {
    return;
  }

  const beforeText = originalText.slice(0, targetIndex);
  const animatedText = originalText.slice(targetIndex, targetIndex + targetPhrase.length);
  const afterText = originalText.slice(targetIndex + targetPhrase.length);

  heroTitle.setAttribute('aria-label', originalText);
  heroTitle.classList.add('wave-text');
  heroTitle.textContent = '';

  if (beforeText) {
    const beforeSpan = document.createElement('span');
    beforeSpan.className = 'wave-static';
    beforeSpan.setAttribute('aria-hidden', 'true');
    beforeSpan.textContent = beforeText;
    heroTitle.appendChild(beforeSpan);
  }

  const words = animatedText.trim().split(/\s+/);
  words.forEach((word, wordIndex) => {
    const wordSpan = document.createElement('span');
    wordSpan.className = 'wave-word';
    wordSpan.setAttribute('aria-hidden', 'true');

    Array.from(word).forEach((character) => {
      const letterSpan = document.createElement('span');
      letterSpan.className = 'wave-letter';
      letterSpan.setAttribute('aria-hidden', 'true');
      letterSpan.textContent = character;
      wordSpan.appendChild(letterSpan);
    });

    heroTitle.appendChild(wordSpan);

    if (wordIndex < words.length - 1) {
      const spaceSpan = document.createElement('span');
      spaceSpan.className = 'wave-space';
      spaceSpan.setAttribute('aria-hidden', 'true');
      spaceSpan.textContent = ' ';
      heroTitle.appendChild(spaceSpan);
    }
  });

  if (afterText) {
    const afterSpan = document.createElement('span');
    afterSpan.className = 'wave-static';
    afterSpan.setAttribute('aria-hidden', 'true');
    afterSpan.textContent = afterText;
    heroTitle.appendChild(afterSpan);
  }

  const letters = Array.from(heroTitle.querySelectorAll('.wave-letter'));
  let releaseTimeoutId = null;

  letters.forEach((letter, index) => {
    letter.style.setProperty('--wave-delay', `${index * 45}ms`);
  });

  const activateWave = () => {
    if (releaseTimeoutId) {
      window.clearTimeout(releaseTimeoutId);
      releaseTimeoutId = null;
    }

    letters.forEach((letter) => {
      letter.style.transition = '';
      letter.style.animation = '';
      letter.style.transform = '';
    });

    heroTitle.classList.remove('wave-active');
    void heroTitle.offsetWidth;
    heroTitle.classList.add('wave-active');
  };

  const deactivateWave = () => {
    if (!heroTitle.classList.contains('wave-active')) {
      return;
    }

    letters.forEach((letter) => {
      const currentTransform = window.getComputedStyle(letter).transform;
      letter.style.animation = 'none';
      letter.style.transition = 'none';
      letter.style.transform = currentTransform === 'none' ? 'translateY(0)' : currentTransform;
    });

    heroTitle.classList.remove('wave-active');
    void heroTitle.offsetWidth;

    requestAnimationFrame(() => {
      letters.forEach((letter) => {
        letter.style.transition = 'transform 720ms cubic-bezier(0.22, 1, 0.36, 1)';
        letter.style.transform = 'translateY(0)';
      });
    });

    releaseTimeoutId = window.setTimeout(() => {
      letters.forEach((letter) => {
        letter.style.transition = '';
        letter.style.animation = '';
        letter.style.transform = '';
      });
      releaseTimeoutId = null;
    }, 760);
  };

  heroTitle.addEventListener('mouseenter', activateWave);
  heroTitle.addEventListener('focus', activateWave);
  heroTitle.addEventListener('mouseleave', deactivateWave);
  heroTitle.addEventListener('blur', deactivateWave);
});