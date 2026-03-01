/* ===================================
   TableScan AI — main.js
   Vanilla JS — No dependencies
=================================== */

'use strict';

// ===================================
// 1. PARTICLE CANVAS (optimized)
// ===================================
(function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;

  // Skip on low-end / mobile to save battery
  const isMobile = window.innerWidth < 768;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) { canvas.style.display = 'none'; return; }

  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  let W, H;
  // Fewer particles on mobile
  const COUNT = isMobile ? 25 : 45;
  let particles = [];
  let frame = 0;

  function rand(a, b) { return Math.random() * (b - a) + a; }

  function resize() {
    // Use devicePixelRatio cap at 1 for canvas — no need for retina here
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function createParticle() {
    return {
      x: rand(0, W), y: rand(0, H),
      vx: rand(-0.2, 0.2), vy: rand(-0.3, -0.08),
      size: rand(0.8, 2),
      alpha: rand(0.08, 0.35),
      color: Math.random() > 0.5 ? 0 : 1, // 0=green 1=cyan
      pulse: rand(0, Math.PI * 2),
    };
  }

  // Pre-build connection colour lookup (avoid template literals in hot loop)
  function getLineAlpha(ratio) { return 0.05 * ratio; }

  function drawConnections() {
    // Only draw connections every 2 frames
    if (frame % 2 !== 0) return;
    const LIMIT = 90;
    const LIMIT2 = LIMIT * LIMIT;
    ctx.lineWidth = 0.5;
    for (let i = 0; i < particles.length - 1; i++) {
      const pi = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const pj = particles[j];
        const dx = pi.x - pj.x;
        const dy = pi.y - pj.y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < LIMIT2) {
          const ratio = 1 - Math.sqrt(dist2) / LIMIT;
          ctx.strokeStyle = `rgba(0,255,136,${getLineAlpha(ratio).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(pi.x, pi.y);
          ctx.lineTo(pj.x, pj.y);
          ctx.stroke();
        }
      }
    }
  }

  const COLORS = ['rgba(0,255,136,', 'rgba(0,212,255,'];

  function animate() {
    frame++;
    ctx.clearRect(0, 0, W, H);
    drawConnections();

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.pulse += 0.018;

      if (p.y < -5) { p.y = H + 5; p.x = rand(0, W); }
      if (p.x < -5) p.x = W + 5;
      if (p.x > W + 5) p.x = -5;

      const a = (p.alpha * (0.7 + 0.3 * Math.sin(p.pulse))).toFixed(3);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = COLORS[p.color] + a + ')';
      ctx.fill();
    }

    requestAnimationFrame(animate);
  }

  resize();
  particles = Array.from({ length: COUNT }, createParticle);
  animate();

  // Debounce resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 200);
  });
})();


// ===================================
// 2. NAVBAR SCROLL EFFECT
// ===================================
(function initNavbar() {
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.querySelector('.nav-links');
  const navCta = document.querySelector('.nav-cta');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  });

  hamburger?.addEventListener('click', () => {
    const open = navLinks.classList.toggle('mobile-open');
    hamburger.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', open);
    if (navCta) {
      navCta.style.display = open ? 'flex' : '';
      navCta.style.position = open ? 'fixed' : '';
      navCta.style.top = open ? '130px' : '';
      navCta.style.right = open ? '24px' : '';
    }
  });

  // Close menu on nav link click
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('mobile-open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', false);
    });
  });
})();


// ===================================
// 3 & 4. COUNTERS + SCROLL REVEAL (merged into 1 observer)
// ===================================
(function initObservers() {
  // Mark reveal elements
  document.querySelectorAll(
    '.feat-card, .step-item, .faq-item, .section-head, ' +
    '.hero-badge, .hero-title, .hero-desc, .hero-actions, .hero-stats, .tips-row'
  ).forEach((el, i) => {
    el.classList.add('reveal');
    if (el.dataset.delay) el.style.transitionDelay = el.dataset.delay * 0.1 + 's';
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;

      // Reveal animation
      el.classList.add('visible');

      // Counter animation (if applicable)
      const counter = el.dataset.count !== undefined ? el : el.querySelector('[data-count]');
      if (counter && counter.dataset.count) {
        const target = parseInt(counter.dataset.count);
        const duration = 1400;
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min((now - start) / duration, 1);
          counter.textContent = Math.floor((1 - Math.pow(1 - p, 3)) * target);
          if (p < 1) requestAnimationFrame(tick);
          else counter.textContent = target;
        };
        requestAnimationFrame(tick);
      }

      observer.unobserve(el);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

  // Observe both reveal elements and stat items
  document.querySelectorAll('.reveal, [data-count]').forEach(el => observer.observe(el));
})();


// ===================================
// 5. ADVANCED SETTINGS TOGGLE
// ===================================
const settingsToggle = document.getElementById('settingsToggle');
const advancedSettings = document.getElementById('advancedSettings');

settingsToggle?.addEventListener('click', () => {
  const isHidden = advancedSettings.hidden;
  advancedSettings.hidden = !isHidden;
  settingsToggle.setAttribute('aria-expanded', !isHidden ? 'false' : 'true');
});


// ===================================
// 6. FILE UPLOAD & PREVIEW
// ===================================
const imageInput = document.getElementById('imageInput');
const uploadZone = document.getElementById('uploadZone');
const uploadLabel = document.getElementById('uploadLabel');
const previewArea = document.getElementById('previewArea');
const previewImg = document.getElementById('previewImg');
const removeImg = document.getElementById('removeImg');
const convertBtn = document.getElementById('convertBtn');

let selectedFile = null;

function showPreview(file) {
  if (!file || !file.type.startsWith('image/')) {
    alert('الرجاء اختيار ملف صورة صالح (PNG, JPG, JPEG)');
    return;
  }
  selectedFile = file;
  const url = URL.createObjectURL(file);
  previewImg.src = url;
  uploadLabel.hidden = true;
  previewArea.hidden = false;
  convertBtn.disabled = false;
}

function clearFile() {
  selectedFile = null;
  imageInput.value = '';
  previewImg.src = '';
  URL.revokeObjectURL(previewImg.src);
  uploadLabel.hidden = false;
  previewArea.hidden = true;
  convertBtn.disabled = true;
  hideResult();
}

imageInput?.addEventListener('change', e => {
  if (e.target.files[0]) showPreview(e.target.files[0]);
});

removeImg?.addEventListener('click', clearFile);

// Drag & Drop
uploadZone?.addEventListener('dragover', e => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});
uploadZone?.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone?.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) {
    imageInput.files = e.dataTransfer.files;
    showPreview(file);
  }
});


// ===================================
// 7. CONVERT BUTTON & API CALL
// ===================================
const progressWrap = document.getElementById('progressWrap');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const resultArea = document.getElementById('resultArea');
const dataTable = document.getElementById('dataTable');
const exportBtn = document.getElementById('exportBtn');

let currentData = []; // Stored table data

function showProgress(pct, text) {
  progressWrap.hidden = false;
  progressBar.style.width = pct + '%';
  progressWrap.setAttribute('aria-valuenow', pct);
  progressText.textContent = text;
}

function hideProgress() {
  progressWrap.hidden = true;
  progressBar.style.width = '0%';
}

function showResult(data) {
  currentData = data;
  dataTable.innerHTML = '';
  resultArea.hidden = false;

  if (!data || data.length === 0) {
    dataTable.innerHTML = '<tr><td style="padding:20px;color:var(--text-dim);">لم يتم استخراج بيانات. حاول بصورة أوضح.</td></tr>';
    return;
  }

  // Header row
  const thead = dataTable.createTHead();
  const headerRow = thead.insertRow();
  data[0].forEach(cell => {
    const th = document.createElement('th');
    th.textContent = cell;
    headerRow.appendChild(th);
  });

  // Data rows (editable)
  const tbody = dataTable.createTBody();
  for (let i = 1; i < data.length; i++) {
    const row = tbody.insertRow();
    data[i].forEach((cell, j) => {
      const td = row.insertCell();
      td.textContent = cell;
      td.contentEditable = 'true';
      td.setAttribute('data-row', i);
      td.setAttribute('data-col', j);
      td.addEventListener('blur', e => {
        currentData[i][j] = e.target.textContent.trim();
      });
    });
    row.style.animation = `rowSlide 0.4s ease ${i * 0.04}s both`;
  }
}

function hideResult() {
  resultArea.hidden = true;
  dataTable.innerHTML = '';
  currentData = [];
}

convertBtn?.addEventListener('click', async () => {
  if (!selectedFile) return;

  const btnText = convertBtn.querySelector('.btn-text');
  const btnIcon = convertBtn.querySelector('.btn-icon');
  const btnLoader = convertBtn.querySelector('.btn-loader');
  const cols = document.getElementById('cols').value;
  const rows = document.getElementById('rows').value;

  // UI: loading state
  convertBtn.disabled = true;
  btnText.textContent = 'جاري التحليل...';
  btnIcon.hidden = true;
  btnLoader.hidden = false;
  hideResult();
  showProgress(10, 'جاري رفع الصورة...');

  try {
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('cols', cols);
    formData.append('rows', rows);

    showProgress(30, 'جاري تحليل الجدول بالذكاء الاصطناعي...');

    // Simulate progress while waiting
    let simulatedProgress = 30;
    const progressInterval = setInterval(() => {
      if (simulatedProgress < 80) {
        simulatedProgress += Math.random() * 8;
        showProgress(Math.min(simulatedProgress, 80), 'جاري معالجة البيانات...');
      }
    }, 400);

    const response = await fetch('/api/convert', {
      method: 'POST',
      body: formData,
    });

    clearInterval(progressInterval);
    showProgress(90, 'جاري تجميع النتائج...');

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'حدث خطأ في الخادم' }));
      throw new Error(err.message || 'فشل التحويل');
    }

    const result = await response.json();

    showProgress(100, 'اكتملت المعالجة!');
    setTimeout(() => {
      hideProgress();
      showResult(result.data);
      resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 500);

  } catch (err) {
    clearInterval && clearInterval();
    hideProgress();
    showErrorToast(err.message || 'حدث خطأ غير متوقع. حاول مرة أخرى.');
    console.error('[TableScan] Error:', err);
  } finally {
    convertBtn.disabled = false;
    btnText.textContent = 'حوّل إلى Excel';
    btnIcon.hidden = false;
    btnLoader.hidden = true;
  }
});


// ===================================
// 8. EXPORT TO EXCEL (XLSX via CSV)
// ===================================
exportBtn?.addEventListener('click', () => {
  if (!currentData || currentData.length === 0) return;

  // Build CSV
  const csv = currentData.map(row =>
    row.map(cell => {
      const s = String(cell).replace(/"/g, '""');
      return /[,"\n\r]/.test(s) ? `"${s}"` : s;
    }).join(',')
  ).join('\r\n');

  // BOM for Arabic/UTF-8 in Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tablescan_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showSuccessToast('تم تحميل الملف بنجاح!');
});


// ===================================
// 9. TOAST NOTIFICATIONS
// ===================================
function createToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✓' : '⚠'}</span>
    <span>${message}</span>
  `;

  Object.assign(toast.style, {
    position: 'fixed', bottom: '24px', left: '50%',
    transform: 'translateX(-50%) translateY(20px)',
    background: type === 'success'
      ? 'linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,212,255,0.1))'
      : 'rgba(255,100,0,0.15)',
    border: `1px solid ${type === 'success' ? 'rgba(0,255,136,0.4)' : 'rgba(255,100,0,0.4)'}`,
    color: type === 'success' ? 'var(--green)' : '#ff9944',
    padding: '12px 24px', borderRadius: '12px',
    backdropFilter: 'blur(20px)',
    fontFamily: 'var(--font)', fontSize: '0.9rem', fontWeight: '600',
    display: 'flex', alignItems: 'center', gap: '10px',
    zIndex: '9999', opacity: '0',
    transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  });

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => toast.remove(), 350);
  }, 3500);
}

function showSuccessToast(msg) { createToast(msg, 'success'); }
function showErrorToast(msg) { createToast(msg, 'error'); }


// ===================================
// 10. SMOOTH ANCHOR SCROLL
// ===================================
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = 80;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});


// ===================================
// 11. ACTIVE NAV LINK (SCROLL SPY)
// ===================================
(function initScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          link.classList.toggle(
            'active-nav',
            link.getAttribute('href') === `#${entry.target.id}`
          );
        });
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach(s => observer.observe(s));
})();


// Add active nav style dynamically
const activeNavStyle = document.createElement('style');
activeNavStyle.textContent = `.nav-link.active-nav { color: var(--green) !important; }`;
document.head.appendChild(activeNavStyle);
