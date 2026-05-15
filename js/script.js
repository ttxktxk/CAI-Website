// js/script.js
console.log('✅ script.js loaded');

document.addEventListener('DOMContentLoaded', () => {
  /* ========== 1) Submenu (รองรับมือถือ/ทัช + เดสก์ท็อป) ========== */
  const mqDesktop = window.matchMedia('(min-width: 901px)');
  const subItems = document.querySelectorAll('.nav .menu .has-sub > .sub-toggle');

  subItems.forEach(toggle => {
    const parentLi = toggle.closest('.has-sub');

    // คลิกบนจอเล็ก => เปิด/ปิด submenu
    toggle.addEventListener('click', (e) => {
      if (mqDesktop.matches) return; // เดสก์ท็อปใช้ :hover ใน CSS อยู่แล้ว
      e.preventDefault();
      const isOpen = parentLi.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });

    // โฟกัสด้วยคีย์บอร์ดบนเดสก์ท็อป
    toggle.addEventListener('focus', () => {
      if (mqDesktop.matches) parentLi.classList.add('open');
    });
    parentLi.addEventListener('focusout', (e) => {
      if (mqDesktop.matches && !parentLi.contains(e.relatedTarget)) {
        parentLi.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  });

  // คลิกนอกเมนู ปิด submenu ทุกอัน (จอเล็ก)
  document.addEventListener('click', (e) => {
    const opened = document.querySelectorAll('.nav .menu .has-sub.open');
    opened.forEach(li => {
      if (!li.contains(e.target) && !e.target.closest('.nav-toggle')) {
        li.classList.remove('open');
        const t = li.querySelector('.sub-toggle');
        t?.setAttribute('aria-expanded', 'false');
      }
    });
  });

  /* ========== 2) Mobile menu (ปุ่ม ☰) ========== */
  const toggle = document.querySelector('.nav-toggle');
const menu = document.querySelector('.menu');

if (toggle && menu) {
  toggle.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });
}

  /* ========== 3) News slider (เลื่อนข่าว + auto-play) ========== */
  const track = document.getElementById('newsTrack');
  const prev  = document.querySelector('.news-nav.prev');
  const next  = document.querySelector('.news-nav.next');
  const newsSlider = document.querySelector('.news-slider');

  if (track && newsSlider) {
    function cardWidth() {
      const card = track.querySelector('.news-card');
      if (!card) return 320;
      const gap = parseFloat(getComputedStyle(track).gap || 16);
      return card.getBoundingClientRect().width + gap;
    }

    function scrollByCard(dir) {
      track.scrollBy({ left: cardWidth() * dir, behavior: 'smooth' });
    }

    prev?.addEventListener('click', () => { scrollByCard(-1); resetAutoplay(); });
    next?.addEventListener('click', () => { scrollByCard( 1); resetAutoplay(); });

    // เลื่อนด้วยสกอร์ลเมาส์ (แนวตั้ง -> แปลงเป็นแนวนอน)
    track.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        track.scrollBy({ left: e.deltaY, behavior: 'smooth' });
        resetAutoplay();
      }
    }, { passive: false });

    // ----- Auto-play -----
    const AUTOPLAY_MS = 3500;
    const STEP = 1;
    let timer = null;

    function goNext() {
      const maxScroll = track.scrollWidth - track.clientWidth;
      const nextLeft  = track.scrollLeft + cardWidth() * STEP;

      if (nextLeft >= maxScroll - 2) {
        track.scrollTo({ left: 0, behavior: 'auto' });
      } else {
        track.scrollBy({ left: cardWidth() * STEP, behavior: 'smooth' });
      }
    }

    function startAutoplay() {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (timer) return;
      timer = setInterval(goNext, AUTOPLAY_MS);
    }
    function stopAutoplay() { clearInterval(timer); timer = null; }
    function resetAutoplay() { stopAutoplay(); startAutoplay(); }

    newsSlider.addEventListener('mouseenter', stopAutoplay);
    newsSlider.addEventListener('mouseleave', startAutoplay);
    newsSlider.addEventListener('focusin',   stopAutoplay);
    newsSlider.addEventListener('focusout',  startAutoplay);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopAutoplay(); else startAutoplay();
    });

    startAutoplay();
  }

  /* ========== 4) Faculty 3D tilt (ถ้ามี .fac-card) ========== */
  const facCards = document.querySelectorAll('.fac-card');
  facCards.forEach(card => {
    const max = 8; // องศาเอียงสูงสุด
    function tilt(e) {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      const rx = (0.5 - y) * max;
      const ry = (x - 0.5) * max;
      card.style.transform = `translateY(-6px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    }
    function reset() { card.style.transform = 'translateY(-6px)'; }

    card.addEventListener('mousemove', tilt);
    card.addEventListener('mouseleave', reset);
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-6px)';
    });
  });

  /* ========== 5) Hero Slider (Banner บนสุด) ========== */
  const heroSlider = document.querySelector('.hero-slider');
  const heroSlides = heroSlider ? Array.from(heroSlider.querySelectorAll('.hero-slide')) : [];

  if (heroSlider && heroSlides.length) {
    const prevBtn  = heroSlider.querySelector('.hero-nav.prev');
    const nextBtn  = heroSlider.querySelector('.hero-nav.next');
    const dotsWrap = heroSlider.querySelector('.hero-dots');

    const dots = [];
    let current = 0;

    // สร้างจุดตามจำนวนสไลด์
    heroSlides.forEach((_, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'hero-dot' + (index === 0 ? ' is-active' : '');
      dot.setAttribute('aria-label', `สไลด์ที่ ${index + 1}`);
      dot.addEventListener('click', () => goTo(index, true));
      dotsWrap.appendChild(dot);
      dots.push(dot);
    });

    function updateActive() {
      heroSlides.forEach((slide, i) => {
        slide.classList.toggle('is-active', i === current);
      });
      dots.forEach((dot, i) => {
        dot.classList.toggle('is-active', i === current);
      });
    }

    function goTo(targetIndex, fromUser = false) {
      const total = heroSlides.length;
      current = (targetIndex + total) % total;
      updateActive();
      if (fromUser) resetAuto();
    }

    // ปุ่มลูกศร ซ้าย/ขวา
    prevBtn?.addEventListener('click', () => goTo(current - 1, true));
    nextBtn?.addEventListener('click', () => goTo(current + 1, true));

    // Auto play
    const AUTO_MS = 5000;
    let autoTimer = null;

    function startAuto() {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (autoTimer) return;
      autoTimer = setInterval(() => {
        goTo(current + 1, false);
      }, AUTO_MS);
    }
    function stopAuto() {
      if (!autoTimer) return;
      clearInterval(autoTimer);
      autoTimer = null;
    }
    function resetAuto() {
      stopAuto();
      startAuto();
    }

    heroSlider.addEventListener('mouseenter', stopAuto);
    heroSlider.addEventListener('mouseleave', startAuto);
    heroSlider.addEventListener('focusin',   stopAuto);
    heroSlider.addEventListener('focusout',  startAuto);

    // ปัดซ้าย–ขวา บนมือถือ
    let touchStartX = null;
    heroSlider.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });

    heroSlider.addEventListener('touchend', (e) => {
      if (touchStartX === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) {
        if (dx < 0) goTo(current + 1, true); // ปัดซ้าย
        else        goTo(current - 1, true); // ปัดขวา
      }
      touchStartX = null;
    }, { passive: true });

    // ตั้งต้น
    updateActive();
    startAuto();
  }

});

  /* ========== 6) Robot Greeter – หุ่นยนต์โผล่มาทักตอนเปิดเว็บ ========== */
const robotGreeter = document.getElementById('robotGreeter');
if (robotGreeter) {
  const closeBtn = robotGreeter.querySelector('.robot-close');
  const videoEl  = robotGreeter.querySelector('.robot-video');

  // key สำหรับจำว่าดูไปแล้วใน session นี้
  const SEEN_KEY = 'cai_robot_seen';
  // อยากให้โชว์นานแค่ไหน (มิลลิวินาที) เช่น 5000 = 5 วินาที
  const AUTO_HIDE_MS = 2000;

  function showRobot() {
    robotGreeter.classList.add('is-visible');
    // พยายามสั่งให้วิดีโอเล่น (กันบาง browser ที่ไม่ auto เล่น)
    if (videoEl) {
      videoEl.play().catch(() => {});
    }
  }

  function hideRobot() {
    robotGreeter.classList.remove('is-visible');
    if (videoEl) {
      videoEl.pause();
    }
  }

  // ถ้ายังไม่เคยแสดงใน session นี้ ให้ดีเลย์แล้วค่อยโชว์ แล้วซ่อนอัตโนมัติ
  if (!sessionStorage.getItem(SEEN_KEY)) {
    setTimeout(() => {
      showRobot();
      sessionStorage.setItem(SEEN_KEY, '1');

      // ซ่อนเองหลังจาก AUTO_HIDE_MS
      setTimeout(hideRobot, AUTO_HIDE_MS);
    }, 1000); // ดีเลย์ 1 วินาทีหลังโหลดหน้า
  }

  // ปิดเมื่อกดปุ่ม X ด้วย
  closeBtn?.addEventListener('click', hideRobot);

  // ปิดเมื่อกด ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideRobot();
    }
  });

  // ถ้าไม่ใช้ loop และอยากให้หายตอนวิดีโอจบ ก็เพิ่มแบบนี้ได้
  if (videoEl && !videoEl.hasAttribute('loop')) {
    videoEl.addEventListener('ended', hideRobot);
  }
}

/* ========== About History: scroll reveal + counters ========== */
document.addEventListener('DOMContentLoaded', () => {
  const reveals = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window && reveals.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add('is-visible');

        // counter (นับขึ้น) ทำครั้งเดียว
        const counters = entry.target.querySelectorAll('.counter');
        counters.forEach(el => {
          if (el.dataset.done === '1') return;
          el.dataset.done = '1';

          const target = parseInt(el.getAttribute('data-target') || '0', 10);
          let current = 0;

          const step = Math.max(1, Math.floor(target / 35));
          const timer = setInterval(() => {
            current += step;
            if (current >= target) {
              current = target;
              clearInterval(timer);
            }
            el.textContent = String(current);
          }, 18);
        });

        io.unobserve(entry.target);
      });
    }, { threshold: 0.18 });

    reveals.forEach(el => io.observe(el));
  } else {
    // fallback: ถ้า browser เก่า
    reveals.forEach(el => el.classList.add('is-visible'));
    document.querySelectorAll('.counter').forEach(el => {
      el.textContent = el.getAttribute('data-target') || '0';
    });
  }
});

/* ===== Alumni Clean Slider (1 รูปต่อหน้า + dots + counter + autoplay) ===== */
document.addEventListener('DOMContentLoaded', () => {
  const track    = document.getElementById('alumniCleanTrack');
  const viewport = document.getElementById('alumniCleanViewport');
  const dotsWrap = document.getElementById('alumniCleanDots');

  const prevBtn  = document.getElementById('alumniCleanPrev');
  const nextBtn  = document.getElementById('alumniCleanNext');

  const indexEl  = document.getElementById('alumniCleanIndex');
  const totalEl  = document.getElementById('alumniCleanTotal');

  if (!track || !viewport || !dotsWrap) return;

  const slides = Array.from(track.querySelectorAll('.alumni-clean-slide'));
  if (!slides.length) return;

  let current = 0;
  const dots = [];

  if (totalEl) totalEl.textContent = String(slides.length);

  function pageWidth(){ return viewport.getBoundingClientRect().width; }

  function setCounter(){
    if (indexEl) indexEl.textContent = String(current + 1);
  }

  function setActiveDot(){
    dots.forEach((d, i) => d.classList.toggle('is-active', i === current));
  }

  function goTo(i, behavior='smooth'){
    current = Math.max(0, Math.min(i, slides.length - 1));
    track.scrollTo({ left: current * pageWidth(), behavior });
    setActiveDot();
    setCounter();
  }

  // dots
  slides.forEach((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'alumni-clean-dot' + (i === 0 ? ' is-active' : '');
    b.setAttribute('aria-label', `บัณฑิตลำดับที่ ${i + 1}`);
    b.addEventListener('click', () => { goTo(i, 'smooth'); resetAutoplay(); });
    dotsWrap.appendChild(b);
    dots.push(b);
  });

  // buttons
  prevBtn?.addEventListener('click', () => { goTo(current - 1, 'smooth'); resetAutoplay(); });
  nextBtn?.addEventListener('click', () => { goTo(current + 1, 'smooth'); resetAutoplay(); });

  // keyboard
  viewport.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft')  { goTo(current - 1, 'smooth'); resetAutoplay(); }
    if (e.key === 'ArrowRight') { goTo(current + 1, 'smooth'); resetAutoplay(); }
  });

  // update current while scrolling
  let ticking = false;
  track.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const w = pageWidth();
      const idx = Math.round(track.scrollLeft / w);
      const nextIndex = Math.max(0, Math.min(idx, slides.length - 1));
      if (nextIndex !== current){
        current = nextIndex;
        setActiveDot();
        setCounter();
      }
      ticking = false;
    });
  });

  // resize keep position
  window.addEventListener('resize', () => {
    track.scrollTo({ left: current * pageWidth(), behavior: 'auto' });
  });

  // autoplay (คลีนๆ)
  const AUTOPLAY_MS = 4200;
  let timer = null;

  function startAutoplay(){
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (timer) return;
    timer = setInterval(() => {
      const nextIndex = (current + 1) % slides.length;
      goTo(nextIndex, 'smooth');
    }, AUTOPLAY_MS);
  }
  function stopAutoplay(){ clearInterval(timer); timer = null; }
  function resetAutoplay(){ stopAutoplay(); startAutoplay(); }

  viewport.addEventListener('mouseenter', stopAutoplay);
  viewport.addEventListener('mouseleave', startAutoplay);
  viewport.addEventListener('focusin', stopAutoplay);
  viewport.addEventListener('focusout', startAutoplay);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAutoplay();
    else startAutoplay();
  });

  // init
  goTo(0, 'auto');
  startAutoplay();
});
document.addEventListener("DOMContentLoaded", () => {
  const cards = document.querySelectorAll(".reveal-fac");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.18 });

  cards.forEach(card => observer.observe(card));

  cards.forEach(card => {
    card.addEventListener("mousemove", e => {
      if (window.innerWidth <= 900) return;

      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const rotateX = ((y / rect.height) - 0.5) * -6;
      const rotateY = ((x / rect.width) - 0.5) * 6;

      card.style.transform =
        `translateY(-10px) scale(1.01) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
});

/* ===== Alumni Modern Filter ===== */
document.addEventListener('DOMContentLoaded', () => {
  const filterBtns = document.querySelectorAll('.alumni-filter button');
  const tiles = document.querySelectorAll('.alumni-tile');

  if (!filterBtns.length || !tiles.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;

      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      tiles.forEach(tile => {
        const year = tile.dataset.year;
        const show = filter === 'all' || year === filter;

        tile.classList.toggle('is-hidden', !show);
      });
    });
  });
});

/* ===== Alumni Year Slider ===== */
document.addEventListener('DOMContentLoaded', () => {
  const alumniData = {
    "2568": [
      "assets/images/alumni/a1.jpg",
      "assets/images/alumni/a2.jpg",
      "assets/images/alumni/a3.jpg",
      "assets/images/alumni/a4.jpg"
    ],
    "2567": [
      "assets/images/alumni/a1.jpg",
      "assets/images/alumni/a2.jpg"
    ],
    "2566": [
      "assets/images/alumni/a3.jpg",
      "assets/images/alumni/a4.jpg"
    ]
  };

  const yearButtons = document.querySelectorAll('.alumni-year-tabs button');
  const mainImage = document.getElementById('alumniMainImage');
  const thumbsWrap = document.getElementById('alumniThumbs');
  const prevBtn = document.getElementById('alumniPrev');
  const nextBtn = document.getElementById('alumniNext');
  const yearLabel = document.getElementById('alumniYearLabel');
  const currentEl = document.getElementById('alumniCurrent');
  const totalEl = document.getElementById('alumniTotal');

  if (!yearButtons.length || !mainImage || !thumbsWrap) return;

  let currentYear = "2568";
  let currentIndex = 0;

  function renderSlider() {
    const images = alumniData[currentYear] || [];

    if (!images.length) return;

    mainImage.src = images[currentIndex];
    mainImage.alt = `บัณฑิต CAI ปีการศึกษา ${currentYear}`;

    yearLabel.textContent = `ปีการศึกษา ${currentYear}`;
    currentEl.textContent = String(currentIndex + 1);
    totalEl.textContent = String(images.length);

    thumbsWrap.innerHTML = "";

    images.forEach((src, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'alumni-thumb' + (index === currentIndex ? ' is-active' : '');
      btn.innerHTML = `<img src="${src}" alt="รูปบัณฑิต ${index + 1} ปี ${currentYear}">`;

      btn.addEventListener('click', () => {
        currentIndex = index;
        renderSlider();
      });

      thumbsWrap.appendChild(btn);
    });
  }

  function changeYear(year) {
    currentYear = year;
    currentIndex = 0;

    yearButtons.forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.year === year);
    });

    renderSlider();
  }

  prevBtn?.addEventListener('click', () => {
    const images = alumniData[currentYear];
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    renderSlider();
  });

  nextBtn?.addEventListener('click', () => {
    const images = alumniData[currentYear];
    currentIndex = (currentIndex + 1) % images.length;
    renderSlider();
  });

  yearButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      changeYear(btn.dataset.year);
    });
  });

  renderSlider();
});

document.addEventListener('DOMContentLoaded', () => {
  const alumniImages = [
    "assets/images/alumni/a1.jpg",
    "assets/images/alumni/a2.jpg",
    "assets/images/alumni/a3.jpg",
    "assets/images/alumni/a4.jpg",
    "assets/images/alumni/a5.jpg",
    "assets/images/alumni/a6.jpg"
  ];

  const img = document.getElementById('alumniFeatureImage');
  const prev = document.getElementById('alumniFeaturePrev');
  const next = document.getElementById('alumniFeatureNext');
  const current = document.getElementById('alumniFeatureCurrent');
  const total = document.getElementById('alumniFeatureTotal');

  if (!img || !prev || !next) return;

  let index = 0;
  total.textContent = alumniImages.length;

  function showImage(){
    img.src = alumniImages[index];
    current.textContent = index + 1;
  }

  prev.addEventListener('click', () => {
    index = (index - 1 + alumniImages.length) % alumniImages.length;
    showImage();
  });

  next.addEventListener('click', () => {
    index = (index + 1) % alumniImages.length;
    showImage();
  });

  setInterval(() => {
    index = (index + 1) % alumniImages.length;
    showImage();
  }, 3500);

  showImage();
});

document.addEventListener("click", () => {

  const aboutVideo = document.getElementById("aboutVideo");

  if (aboutVideo) {
    aboutVideo.muted = false;
    aboutVideo.volume = 1;

    aboutVideo.play();
  }

}, { once:true });

function toggleAboutSound(){
  const video = document.getElementById("aboutVideo");
  const btn = document.querySelector(".about-sound-btn");

  if (!video) return;

  video.muted = !video.muted;
  video.volume = 1;

  if (!video.muted) {
    video.play();
    btn.textContent = "🔇 ปิดเสียง";
  } else {
    btn.textContent = "🔊 เปิดเสียง";
  }
}