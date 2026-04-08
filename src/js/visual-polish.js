document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  if (!body || !body.classList.contains('dashboard-page') && !body.classList.contains('auth-page')) {
    return;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealTargets = body.classList.contains('dashboard-page')
    ? ['.landing-nav', '.hero-copy', '.hero-preview', '.feature-card', '.trust-panel', '.cta-panel']
    : ['.auth-spotlight', '.auth-card'];

  const elements = revealTargets.flatMap((selector) => Array.from(document.querySelectorAll(selector)));

  elements.forEach((element, index) => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(18px) scale(0.985)';
    element.style.transition = 'opacity 700ms ease, transform 700ms ease';
    element.style.transitionDelay = `${Math.min(index * 60, 300)}ms`;
  });

  requestAnimationFrame(() => {
    elements.forEach((element) => {
      element.style.opacity = '1';
      element.style.transform = 'translateY(0) scale(1)';
    });
  });

  const heroTitle = body.classList.contains('dashboard-page') ? document.querySelector('.hero-title') : null;
  if (heroTitle) {
    const heroText = heroTitle.textContent || '';
    const heroLabel = heroText;
    heroTitle.setAttribute('aria-label', heroLabel);
    heroTitle.dataset.originalText = heroLabel;
    heroTitle.classList.add('wave-text');
    const words = heroText.trim().split(/\s+/);
    heroTitle.innerHTML = words.map((word) => {
      const letters = Array.from(word).map((character) => `<span class="wave-letter" aria-hidden="true">${character}</span>`).join('');
      return `<span class="wave-word" aria-hidden="true">${letters}</span>`;
    }).join('<span class="wave-space" aria-hidden="true">&nbsp;</span>');

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
  }

  if (reducedMotion) {
    return;
  }

  const motionLayer = document.createElement('div');
  motionLayer.style.position = 'fixed';
  motionLayer.style.inset = '0';
  motionLayer.style.pointerEvents = 'none';
  motionLayer.style.zIndex = '0';
  motionLayer.style.overflow = 'hidden';
  motionLayer.style.mixBlendMode = 'screen';
  body.appendChild(motionLayer);

  const makeOrb = (size, opacity, gradient) => {
    const orb = document.createElement('div');
    orb.style.position = 'absolute';
    orb.style.width = `${size}px`;
    orb.style.height = `${size}px`;
    orb.style.borderRadius = '999px';
    orb.style.opacity = `${opacity}`;
    orb.style.filter = 'blur(12px)';
    orb.style.background = gradient;
    orb.style.transition = 'transform 180ms ease-out, opacity 180ms ease-out';
    motionLayer.appendChild(orb);
    return orb;
  };

  const orbOne = makeOrb(240, 0.4, 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), rgba(255,255,255,0.14) 45%, transparent 70%)');
  const orbTwo = makeOrb(180, 0.28, 'radial-gradient(circle at 35% 35%, rgba(46,160,255,0.38), rgba(46,160,255,0.12) 45%, transparent 72%)');

  const tiltTargets = Array.from(document.querySelectorAll(
    '.feature-card, .trust-panel, .cta-panel, .auth-card, .auth-spotlight, .preview-card, .hero-primary, .hero-secondary, .nav-button, .cta-button, .auth-btn'
  ));

  tiltTargets.forEach((target) => {
    target.style.transition = `${target.style.transition ? `${target.style.transition}, ` : ''}transform 180ms ease, box-shadow 180ms ease`;

    target.addEventListener('pointermove', (event) => {
      const rect = target.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      const rotateX = ((0.5 - y) * 6).toFixed(2);
      const rotateY = ((x - 0.5) * 8).toFixed(2);
      target.style.transform = `translateY(-2px) perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.01)`;
    });

    target.addEventListener('pointerleave', () => {
      target.style.transform = 'translateY(0) perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)';
    });
  });

  let currentX = window.innerWidth * 0.5;
  let currentY = window.innerHeight * 0.35;
  let targetX = currentX;
  let targetY = currentY;

  const animate = () => {
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;

    const idleX = Math.sin(Date.now() * 0.0004) * 24;
    const idleY = Math.cos(Date.now() * 0.00035) * 18;

    orbOne.style.transform = `translate(${currentX * 0.28 + idleX}px, ${currentY * 0.18 + idleY}px)`;
    orbTwo.style.transform = `translate(${window.innerWidth - currentX * 0.22 - 220 + idleY}px, ${window.innerHeight - currentY * 0.22 - 180 + idleX}px)`;

    requestAnimationFrame(animate);
  };

  window.addEventListener('pointermove', (event) => {
    targetX = event.clientX;
    targetY = event.clientY;
  });

  animate();
});