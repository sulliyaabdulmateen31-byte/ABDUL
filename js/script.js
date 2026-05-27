(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // -----------------------
  // Theme (dark mode support)
  // -----------------------
  const themeToggle = $('#themeToggle');
  const setTheme = (t) => {
    const root = document.documentElement;
    root.setAttribute('data-theme', t);
    try { localStorage.setItem('madrasa-theme', t); } catch {}
  };
  const initTheme = () => {
    let t = 'dark';
    try {
      const saved = localStorage.getItem('madrasa-theme');
      if (saved === 'light' || saved === 'dark') t = saved;
      else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) t = 'light';
    } catch {}
    setTheme(t);
  };

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      setTheme(current === 'dark' ? 'light' : 'dark');
    });
  }
  initTheme();

  // -----------------------
  // Mobile menu
  // -----------------------
  const menuBtn = $('#menuBtn');
  const navMobile = $('#navMobile');
  const setMenuOpen = (open) => {
    if (!navMobile) return;
    navMobile.classList.toggle('open', !!open);
    if (menuBtn) menuBtn.setAttribute('aria-expanded', String(!!open));
  };

  if (menuBtn && navMobile) {
    menuBtn.addEventListener('click', () => setMenuOpen(!navMobile.classList.contains('open')));
    $$('.nav-mobile a, .nav-links a').forEach((a) => {
      a.addEventListener('click', () => setMenuOpen(false));
    });
  }

  // -----------------------
  // Scroll reveal
  // -----------------------
  const revealEls = $$('[data-reveal]');
  const obs = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          obs.unobserve(e.target);
        }
      }
    },
    { root: null, threshold: 0.12 }
  );
  revealEls.forEach((el) => obs.observe(el));

  // -----------------------
  // Active next prayer (demo)
  // -----------------------
  const parseTime = (t) => {
    const [h, m] = String(t).split(':').map(Number);
    return h * 60 + m;
  };

  const timings = [
    { name: 'Fajr', el: '#fajrTime', value: '05:10' },
    { name: 'Dhuhr', el: null, value: '12:30' },
    { name: 'Asr', el: null, value: '16:10' },
    { name: 'Maghrib', el: null, value: '18:45' },
    { name: 'Isha', el: '#ishaTime', value: '20:10' }
  ];

  const highlightNext = () => {
    const nextName = $('#nextPrayer');
    const nextTime = $('#nextPrayerTime');
    const pills = $$('.time-pill');
    if (!nextName || !nextTime || pills.length === 0) return;

    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    let next = timings.find((x) => parseTime(x.value) >= nowMin);
    if (!next) next = timings[0];

    nextName.textContent = next.name;
    nextTime.textContent = next.value;

    // Soft highlight
    pills.forEach((p) => p.style.filter = 'none');
    const match = next.el ? $(next.el) : pills.find((p) => p.textContent.trim() === next.value);
    if (match && match.style) {
      match.style.filter = 'drop-shadow(0 10px 30px rgba(214,178,94,.30))';
      match.style.borderColor = 'rgba(214,178,94,.8)';
    }
  };
  setInterval(highlightNext, 30000);
  highlightNext();

  // -----------------------
  // Animated counters
  // -----------------------
  const animateCounter = (el, to, duration = 900) => {
    const start = performance.now();
    const from = 0;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const val = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      el.textContent = String(val);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  // Start counters when visible
  const counterEls = $$('[data-count]');
  if ('IntersectionObserver' in window) {
    const cObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const el = e.target;
            const to = Number(el.getAttribute('data-count') || '0');
            animateCounter(el, to, 900);
            cObs.unobserve(el);
          }
        });
      },
      { threshold: 0.2 }
    );
    counterEls.forEach((el) => cObs.observe(el));
  }

  // -----------------------
  // Gallery modal
  // -----------------------
  const modal = $('#modal');
  const closeModalEls = $$('[data-close-modal]');
  const modalThumb = $('#modalThumb');
  const modalTitle = $('#modalTitle');
  const modalSub = $('#modalSub');

  const openModal = (card) => {
    if (!modal) return;
    const thumb = $('.gallery-thumb', card);
    const placeholder = thumb ? thumb.getAttribute('data-placeholder') || 'Gallery' : 'Gallery';
    const title = $('.gallery-title', card)?.textContent?.trim() || 'Gallery';
    const sub = $('.gallery-sub', card)?.textContent?.trim() || 'Coming soon';

    if (modalThumb && placeholder) modalThumb.setAttribute('title', placeholder);
    if (modalTitle) modalTitle.textContent = title;
    if (modalSub) modalSub.textContent = sub;

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  $$('.gallery-card').forEach((card) => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => openModal(card));
  });

  closeModalEls.forEach((btn) => btn.addEventListener('click', closeModal));
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('modal-backdrop')) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }

  // -----------------------
  // Donation interactivity
  // -----------------------
  const amountBtns = $$('.amount-btn');
  const customAmount = $('#customAmount');
  const donationStatus = $('#donationStatus');

  let chosen = null;

  const setChosen = (amtEl) => {
    amountBtns.forEach((b) => b.classList.remove('active'));
    amtEl.classList.add('active');
    chosen = amtEl ? amtEl.getAttribute('data-amt') : null;
    if (donationStatus) donationStatus.textContent = `Selected ₹${chosen}. Click Continue.`;
  };

  amountBtns.forEach((b) => b.addEventListener('click', () => setChosen(b)));

  if (customAmount) {
    customAmount.addEventListener('input', () => {
      chosen = customAmount.value ? String(customAmount.value) : null;
      amountBtns.forEach((b) => b.classList.remove('active'));
      if (donationStatus) donationStatus.textContent = chosen ? `Custom amount ₹${chosen} ready. Click Continue.` : '';
    });
  }

  const donateBtn = $('#donateBtn');
  if (donateBtn) {
    donateBtn.addEventListener('click', () => {
      const name = $('#donorName')?.value?.trim();
      const amt = chosen || customAmount?.value?.trim();
      if (!amt) {
        if (donationStatus) donationStatus.textContent = 'Please select or enter an amount.';
        return;
      }
      if (donationStatus) donationStatus.textContent = `Thank you${name ? ' ' + name : ''}! Demo: ₹${amt} saved (no payment).`;
    });
  }

  // -----------------------
  // Forms (demo submission)
  // -----------------------
  const handleDemoForm = (form, statusEl, successMsg) => {
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      // Basic validation: ensure required fields exist; browser handles required, but keep status.
      if (statusEl) statusEl.textContent = 'Submitting...';
      window.setTimeout(() => {
        if (statusEl) statusEl.textContent = successMsg;
        // Reset but keep premium feel
        form.reset();
        if (statusEl) statusEl.textContent = successMsg;
      }, 650);
    });
  };

  handleDemoForm($('#admissionForm'), $('#formStatus'), 'Request submitted! Demo only—admin will contact you soon.');
  handleDemoForm($('#contactForm'), $('#contactStatus'), 'Message sent! Demo only—thank you for reaching out.');
  handleDemoForm($('#subscribeForm'), $('#subscribeStatus'), 'Subscribed! Demo only—watch for announcements.');

  // -----------------------
  // 3D-ish background parallax / geometry (canvas)
  // -----------------------
  const canvas = $('#geoCanvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  let W = 0, H = 0, DPR = 1;
  const pts = [];

  const resize = () => {
    if (!canvas || !ctx) return;
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    pts.length = 0;
    const count = Math.max(55, Math.floor((W * H) / 35000));
    for (let i = 0; i < count; i++) {
      pts.push({
        x: Math.random() * W,
        y: Math.random() * H,
        z: Math.random() * 1,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18
      });
    }
  };

  const themeIsLight = () => (document.documentElement.getAttribute('data-theme') || 'dark') === 'light';

  const draw = (t) => {
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, W, H);

    const light = themeIsLight();
    const baseA = light ? 0.20 : 0.32;

    // Gentle motion
    const time = t * 0.001;
    const parX = (window.__parallaxX || 0) * 12;
    const parY = (window.__parallaxY || 0) * 12;

    // Lines
    ctx.lineWidth = 1;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -20) p.x = W + 20;
      if (p.x > W + 20) p.x = -20;
      if (p.y < -20) p.y = H + 20;
      if (p.y > H + 20) p.y = -20;

      const r = 90 + p.z * 130;
      const cx = p.x + Math.sin(time + p.z * 6) * 10 + parX;
      const cy = p.y + Math.cos(time + p.z * 6) * 10 + parY;

      // draw node
      ctx.fillStyle = `rgba(214,178,94,${baseA * (0.35 + p.z * 0.45)})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 1.4 + p.z * 1.4, 0, Math.PI * 2);
      ctx.fill();

      // connections
      for (let j = i + 1; j < pts.length; j++) {
        const q = pts[j];
        const qx = q.x + parX;
        const qy = q.y + parY;
        const dx = cx - qx;
        const dy = cy - qy;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < r) {
          const a = (1 - d / r) * baseA * 0.75;
          ctx.strokeStyle = `rgba(29,185,84,${a})`;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(qx, qy);
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(draw);
  };

  const onParallax = (e) => {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = (e.clientY / window.innerHeight) * 2 - 1;
    window.__parallaxX = x;
    window.__parallaxY = y;
  };

  if (canvas && ctx) {
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onParallax, { passive: true });
    requestAnimationFrame(draw);
  }

  // Parallax for donation card
  const donationCard = $('[data-parallax]');
  const onMoveCard = (e) => {
    if (!donationCard) return;
    const r = donationCard.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const rx = (py - 0.5) * -10;
    const ry = (px - 0.5) * 10;
    donationCard.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;
  };
  const resetCard = () => {
    if (!donationCard) return;
    donationCard.style.transform = '';
  };
  if (donationCard) {
    donationCard.addEventListener('mousemove', onMoveCard, { passive: true });
    donationCard.addEventListener('mouseleave', resetCard, { passive: true });
  }

  // Smooth anchor offset for sticky navbar
  const navbar = $('#siteNavbar');
  const navH = navbar ? navbar.getBoundingClientRect().height : 72;
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - (navH + 6);
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  // Footer year
  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());
})();

