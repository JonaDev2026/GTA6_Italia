    const menu = document.getElementById('menu');
    const nav = document.getElementById('nav');
    menu.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menu.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      nav.classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
    }));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {threshold: .12});
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    const postsFeed = document.querySelector('.posts-feed');
    const postCards = postsFeed ? [...postsFeed.querySelectorAll('.post-card')] : [];
    const postDots = [...document.querySelectorAll('.posts-dot')];

    if (postsFeed && postCards.length && postDots.length) {
      const setActivePost = () => {
        let activeIndex = 0;
        let nearestDistance = Infinity;
        postCards.forEach((card, index) => {
          const distance = Math.abs(card.offsetLeft - postsFeed.scrollLeft);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            activeIndex = index;
          }
        });
        postDots.forEach((dot, index) => {
          const active = index === activeIndex;
          dot.classList.toggle('active', active);
          dot.setAttribute('aria-current', String(active));
        });
      };

      postDots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
          postCards[index]?.scrollIntoView({behavior: 'smooth', block: 'nearest', inline: 'start'});
        });
      });

      postsFeed.addEventListener('scroll', setActivePost, {passive: true});
      window.addEventListener('resize', setActivePost);
      setActivePost();

      let autoplayTimer;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      const startAutoplay = () => {
        if (autoplayTimer || reducedMotion.matches || document.hidden) return;
        autoplayTimer = window.setInterval(() => {
          const currentIndex = postDots.findIndex(dot => dot.classList.contains('active'));
          const nextIndex = (currentIndex + 1) % postCards.length;
          postCards[nextIndex].scrollIntoView({behavior: 'smooth', block: 'nearest', inline: 'start'});
        }, 5000);
      };
      const stopAutoplay = () => {
        window.clearInterval(autoplayTimer);
        autoplayTimer = undefined;
      };

      postsFeed.addEventListener('pointerenter', stopAutoplay);
      postsFeed.addEventListener('pointerleave', startAutoplay);
      postsFeed.addEventListener('focusin', stopAutoplay);
      postsFeed.addEventListener('focusout', event => {
        if (!postsFeed.contains(event.relatedTarget)) startAutoplay();
      });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopAutoplay();
        else startAutoplay();
      });
      reducedMotion.addEventListener?.('change', () => {
        if (reducedMotion.matches) stopAutoplay();
        else startAutoplay();
      });
      startAutoplay();
    }
