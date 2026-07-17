(function () {
  var elements = document.querySelectorAll('.reveal');
  var journeyItems = document.querySelectorAll('.journey-item');

  if (!elements.length) {
    return;
  }

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    elements.forEach(function (el) {
      el.classList.add('is-visible');
    });

    journeyItems.forEach(function (item) {
      item.classList.add('is-current');
    });

    return;
  }

  document.documentElement.classList.add('reveal-enabled');

  var observer = new IntersectionObserver(function (entries, obs) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, {
    root: null,
    rootMargin: '0px 0px -10% 0px',
    threshold: 0.12
  });

  elements.forEach(function (el) {
    observer.observe(el);
  });

  if (journeyItems.length) {
    var activeObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-current');
        } else {
          entry.target.classList.remove('is-current');
        }
      });
    }, {
      root: null,
      rootMargin: '-18% 0px -18% 0px',
      threshold: 0.4
    });

    journeyItems.forEach(function (item) {
      activeObserver.observe(item);
    });
  }
})();
