/* =========================================================
   ISHWOR POUDEL — PORTFOLIO SCRIPT
   Vanilla JS. No external framework dependencies.
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initMobileMenu();
  initSmoothScroll();
  initActiveNavOnScroll();
  initScrollReveal();
  initTypingAnimation();
  initSkillBars();
  initCounters();
  initSkillsFilter();
  initProjectsFilter();
  initContactForm();
  initBackToTop();
  initParticles();
});

/* ---------------------------------------------------------
   1. STICKY NAVBAR — adds a solid background after scrolling
--------------------------------------------------------- */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const toggle = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 12);
  };
  toggle();
  window.addEventListener('scroll', toggle, { passive: true });
}

/* ---------------------------------------------------------
   2. MOBILE HAMBURGER MENU
--------------------------------------------------------- */
function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  if (!hamburger || !navLinks) return;

  hamburger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
  });

  // Close the menu whenever a nav link is tapped (mobile UX)
  navLinks.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });
}

/* ---------------------------------------------------------
   3. SMOOTH SCROLLING for in-page anchor links
--------------------------------------------------------- */
function initSmoothScroll() {
  const navHeight = document.getElementById('navbar')?.offsetHeight || 76;

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (!targetId || targetId === '#') return;
      const target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - (navHeight - 1);
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

/* ---------------------------------------------------------
   4. ACTIVE NAVIGATION INDICATOR (Intersection Observer)
--------------------------------------------------------- */
function initActiveNavOnScroll() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');
  if (!sections.length || !navLinks.length) return;

  const setActive = (id) => {
    navLinks.forEach((link) => {
      link.classList.toggle('active', link.dataset.section === id);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      // Pick the entry closest to the top of the viewport that's intersecting
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      if (visible.length > 0) {
        setActive(visible[0].target.id);
      }
    },
    { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
  );

  sections.forEach((section) => observer.observe(section));
}

/* ---------------------------------------------------------
   5. SCROLL REVEAL ANIMATIONS
--------------------------------------------------------- */
function initScrollReveal() {
  const revealEls = document.querySelectorAll('.reveal');
  if (!revealEls.length) return;

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealEls.forEach((el) => observer.observe(el));
}

/* ---------------------------------------------------------
   6. TYPING ANIMATION for the hero headline
--------------------------------------------------------- */
function initTypingAnimation() {
  const el = document.getElementById('typedText');
  if (!el) return;

  const phrases = [
    'Full-Stack Developer & Future Computer Engineer',
    'Building With Python, JavaScript & FastAPI',
    'Exploring AI, 3D Web & Software Engineering'
  ];

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    el.textContent = phrases[0];
    return;
  }

  let phraseIndex = 0;
  let charIndex = 0;
  let isDeleting = false;

  const TYPE_SPEED = 55;
  const DELETE_SPEED = 30;
  const PAUSE_AFTER_TYPE = 1800;
  const PAUSE_AFTER_DELETE = 400;

  function tick() {
    const currentPhrase = phrases[phraseIndex];

    if (!isDeleting) {
      charIndex++;
      el.textContent = currentPhrase.slice(0, charIndex);

      if (charIndex === currentPhrase.length) {
        isDeleting = true;
        setTimeout(tick, PAUSE_AFTER_TYPE);
        return;
      }
      setTimeout(tick, TYPE_SPEED);
    } else {
      charIndex--;
      el.textContent = currentPhrase.slice(0, charIndex);

      if (charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        setTimeout(tick, PAUSE_AFTER_DELETE);
        return;
      }
      setTimeout(tick, DELETE_SPEED);
    }
  }

  tick();
}

/* ---------------------------------------------------------
   7. ANIMATE SKILL LEVEL BARS when they enter the viewport
--------------------------------------------------------- */
function initSkillBars() {
  const bars = document.querySelectorAll('.skill-level');
  if (!bars.length) return;

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const level = entry.target.dataset.level || 0;
          const fill = entry.target.querySelector('.skill-level-fill');
          if (fill) fill.style.width = `${level}%`;
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.4 }
  );

  bars.forEach((bar) => observer.observe(bar));
}

/* ---------------------------------------------------------
   8. ANIMATED COUNTERS — only for real, provided statistics
--------------------------------------------------------- */
function initCounters() {
  const counters = document.querySelectorAll('.stat-number[data-count]');
  if (!counters.length) return;

  const animateCounter = (el) => {
    const target = parseInt(el.dataset.count, 10);
    if (Number.isNaN(target)) return;

    const duration = 1200;
    const startTime = performance.now();

    function update(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  };

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.6 }
  );

  counters.forEach((counter) => observer.observe(counter));
}

/* ---------------------------------------------------------
   9. SKILLS FILTER (by category)
--------------------------------------------------------- */
function initSkillsFilter() {
  const filterBar = document.getElementById('skillsFilter');
  const cards = document.querySelectorAll('#skillsGrid .skill-card');
  if (!filterBar || !cards.length) return;

  filterBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;

    filterBar.querySelectorAll('.filter-btn').forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');

    const filter = btn.dataset.filter;
    cards.forEach((card) => {
      const match = filter === 'all' || card.dataset.category === filter;
      card.classList.toggle('hidden', !match);
    });
  });
}

/* ---------------------------------------------------------
   10. PROJECT FILTER (by status)
--------------------------------------------------------- */
function initProjectsFilter() {
  const filterBar = document.getElementById('projectsFilter');
  const cards = document.querySelectorAll('#projectsGrid .project-card');
  if (!filterBar || !cards.length) return;

  filterBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;

    filterBar.querySelectorAll('.filter-btn').forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');

    const filter = btn.dataset.filter;
    cards.forEach((card) => {
      const match = filter === 'all' || card.dataset.status === filter;
      card.classList.toggle('hidden', !match);
    });
  });
}

/* ---------------------------------------------------------
   11. CONTACT FORM VALIDATION
   Note: this form validates input in the browser only.
   No backend/email service is connected, so submissions
   are not actually sent anywhere yet.
--------------------------------------------------------- */
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const fields = {
    name: { el: document.getElementById('name'), error: document.getElementById('nameError') },
    email: { el: document.getElementById('email'), error: document.getElementById('emailError') },
    subject: { el: document.getElementById('subject'), error: document.getElementById('subjectError') },
    message: { el: document.getElementById('message'), error: document.getElementById('messageError') }
  };
  const formNote = document.getElementById('formNote');

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setError(field, message) {
    field.el.closest('.form-group').classList.add('error');
    field.error.textContent = message;
  }

  function clearError(field) {
    field.el.closest('.form-group').classList.remove('error');
    field.error.textContent = '';
  }

  function validateField(key) {
    const field = fields[key];
    const value = field.el.value.trim();

    if (value === '') {
      setError(field, 'This field is required.');
      return false;
    }
    if (key === 'email' && !emailPattern.test(value)) {
      setError(field, 'Please enter a valid email address.');
      return false;
    }
    if (key === 'message' && value.length < 10) {
      setError(field, 'Message should be at least 10 characters.');
      return false;
    }
    clearError(field);
    return true;
  }

  // Validate on blur for immediate feedback
  Object.keys(fields).forEach((key) => {
    fields[key].el.addEventListener('blur', () => validateField(key));
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const results = Object.keys(fields).map((key) => validateField(key));
    const isValid = results.every(Boolean);

    if (!isValid) {
      formNote.textContent = 'Please fix the highlighted fields before sending.';
      formNote.classList.add('error-note');
      return;
    }

    // No backend is connected yet — this only confirms the form is valid.
    formNote.classList.remove('error-note');
    formNote.textContent = 'Message validated. Connect a backend or email service to actually send it.';
    form.reset();
  });
}

/* ---------------------------------------------------------
   12. BACK TO TOP BUTTON
--------------------------------------------------------- */
function initBackToTop() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;

  window.addEventListener(
    'scroll',
    () => {
      btn.classList.toggle('visible', window.scrollY > 500);
    },
    { passive: true }
  );

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ---------------------------------------------------------
   13. LIGHTWEIGHT PARTICLE BACKGROUND (Canvas, no libraries)
   Subtle, slow-moving dots connected by faint lines behind
   the hero section. Respects prefers-reduced-motion.
--------------------------------------------------------- */
function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d');
  let particles = [];
  let width, height;
  let animationId;

  const PARTICLE_COUNT_DIVISOR = 14000; // lower = more particles
  const MAX_DISTANCE = 130;
  const COLOR = '79, 209, 197'; // matches --accent

  function resize() {
    const hero = canvas.parentElement;
    width = canvas.width = hero.offsetWidth;
    height = canvas.height = hero.offsetHeight;
  }

  function createParticles() {
    const count = Math.min(90, Math.floor((width * height) / PARTICLE_COUNT_DIVISOR));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.6 + 0.6
    }));
  }

  function step() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${COLOR}, 0.55)`;
      ctx.fill();
    });

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MAX_DISTANCE) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(${COLOR}, ${0.12 * (1 - dist / MAX_DISTANCE)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    animationId = requestAnimationFrame(step);
  }

  resize();
  createParticles();

  if (!prefersReducedMotion) {
    step();
  } else {
    // Draw a single static frame for reduced-motion users
    step();
    cancelAnimationFrame(animationId);
  }

  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      resize();
      createParticles();
    }, 200);
  });
}