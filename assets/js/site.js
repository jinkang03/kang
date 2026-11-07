/* ==========================================================================
   Jin Kang — Light Log
   Vanilla, dependency-free. Everything degrades gracefully.
   ========================================================================== */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var raf = window.requestAnimationFrame.bind(window);

  /* ---------------- i18n ---------------- */
  function initLang() {
    var btn = $('#langBtn');
    // only leaf nodes carry translatable text — never swap a container's innerHTML
    var nodes = $$('[data-zh]').filter(function (el) { return el.children.length === 0; });
    nodes.forEach(function (el) {
      el.dataset.en = el.textContent;
    });

    function apply(lang, persist) {
      root.lang = lang === 'zh' ? 'zh-CN' : 'en';
      document.title = lang === 'zh' ? 'Jin Kang · 光记' : 'Jin Kang — Light Log';
      nodes.forEach(function (el) {
        var zh = el.getAttribute('data-zh');
        var en = el.dataset.en;
        el.textContent = lang === 'zh' && zh ? zh : en;
      });
      if (btn) {
        var on = $('.lang__on', btn), off = $('.lang__off', btn);
        if (on) on.textContent = lang === 'zh' ? '中' : 'EN';
        if (off) off.textContent = lang === 'zh' ? 'EN' : '中';
      }
      if (persist) { try { localStorage.setItem('jk_lang', lang); } catch (e) {} }
    }

    var saved = null;
    try { saved = localStorage.getItem('jk_lang'); } catch (e) {}
    var initial = saved || ((navigator.language || 'en').toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en');
    apply(initial, false);

    if (btn) {
      btn.addEventListener('click', function () {
        var next = root.lang.indexOf('zh') === 0 ? 'en' : 'zh';
        apply(next, true);
      });
    }
  }

  /* ---------------- header ---------------- */
  function initHeader() {
    var head = $('#siteHead');
    var bar = $('#progressBar');
    var last = window.scrollY;
    var ticking = false;

    function frame() {
      var y = window.scrollY;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.width = (h > 0 ? Math.min(1, y / h) * 100 : 0) + '%';
      if (head) {
        head.classList.toggle('is-solid', y > 24);
        if (y > 160 && y > last + 2) head.classList.add('is-hidden');
        else if (y < last - 2 || y < 160) head.classList.remove('is-hidden');
      }
      last = y;
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { raf(frame); ticking = true; }
    }, { passive: true });
    frame();
  }

  /* ---------------- hero intro ---------------- */
  function initIntro() {
    var go = function () { root.classList.add('is-loaded'); };
    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go);
    setTimeout(go, 900);
  }

  /* ---------------- reveal ---------------- */
  function initReveal() {
    var targets = $$('.frame, .sec-head, .pullquote, .letter, .about__quote, .about__portrait, .about__facts, .index-list li, .contact__list li');
    targets.forEach(function (el) { el.setAttribute('data-reveal', ''); });

    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var delay = Math.min(el.dataset.delay || 0, 3) * 70;
        setTimeout(function () { el.classList.add('is-in'); }, delay);
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    targets.forEach(function (el, i) {
      if (!el.dataset.delay) el.dataset.delay = String(i % 3);
      io.observe(el);
    });

    // frames also drive their image settle
    var fio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); fio.unobserve(e.target); }
      });
    }, { threshold: 0.18 });
    $$('.frame').forEach(function (f) { fio.observe(f); });

    // contact headline
    var ct = $('.contact__title');
    if (ct) {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { ct.classList.add('is-in'); cio.disconnect(); }
        });
      }, { threshold: 0.3 });
      cio.observe(ct);
    }
  }

  /* ---------------- index hover preview ---------------- */
  function initIndexPreview() {
    if (!fine) return;
    var preview = $('#indexPreview');
    var img = $('#indexPreviewImg');
    var list = $('#indexList');
    if (!preview || !img || !list) return;

    var mx = 0, my = 0, cx = 0, cy = 0, on = false, running = false;

    function loop() {
      cx += (mx - cx) * 0.14;
      cy += (my - cy) * 0.14;
      preview.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0) translate(-50%,-50%)';
      if (on || Math.abs(mx - cx) > 0.4 || Math.abs(my - cy) > 0.4) {
        raf(loop);
      } else {
        running = false;
      }
    }
    function kick() { if (!running) { running = true; raf(loop); } }

    list.addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (!on) { cx = mx; cy = my; }
      kick();
    }, { passive: true });

    $$('a', list).forEach(function (a) {
      a.addEventListener('pointerenter', function () {
        var src = a.getAttribute('data-img');
        if (!src) return;
        img.src = src;
        on = true;
        preview.classList.add('is-on');
        kick();
      });
      a.addEventListener('pointerleave', function () {
        on = false;
        preview.classList.remove('is-on');
      });
    });
  }

  /* ---------------- custom cursor ---------------- */
  function initCursor() {
    if (!fine || reduce) return;
    var el = $('.cursor');
    var label = $('.cursor__label');
    if (!el) return;

    var x = window.innerWidth / 2, y = window.innerHeight / 2, tx = x, ty = y;

    document.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      el.classList.add('is-on');
    }, { passive: true });

    (function loop() {
      x += (tx - x) * 0.2;
      y += (ty - y) * 0.2;
      el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) translate(-50%,-50%)';
      raf(loop);
    })();

    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest && e.target.closest('a, button, [data-magnet]');
      if (!t) { el.classList.remove('is-grow'); return; }
      var text = t.getAttribute('data-cursor') || (t.classList.contains('index-list') ? 'View' : '');
      if (label) label.textContent = text;
      el.classList.toggle('is-grow', !!text);
    });
  }

  /* ---------------- magnetic links ---------------- */
  function initMagnets() {
    if (!fine || reduce) return;
    $$('[data-magnet]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - r.left - r.width / 2) / r.width;
        var dy = (e.clientY - r.top - r.height / 2) / r.height;
        el.style.transform = 'translate(' + (dx * 8).toFixed(2) + 'px,' + (dy * 5).toFixed(2) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------------- letters ---------------- */
  function initLetters() {
    var track = $('#letterTrack');
    if (!track) return;
    var cards = $$('.letter', track);
    var pips = $('#letterPips');
    var prev = $('#letterPrev');
    var next = $('#letterNext');

    cards.forEach(function (c) {
      var bg = c.getAttribute('data-bg');
      if (bg) {
        // resolve against the document, not this stylesheet — custom properties
        // are resolved relative to the file that declares them
        var abs = new URL(bg, document.baseURI).href;
        c.style.setProperty('--bg', 'url("' + abs + '")');
      }
    });

    if (pips) {
      cards.forEach(function (c, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
        b.setAttribute('aria-label', 'Letter ' + (i + 1));
        b.addEventListener('click', function () { goTo(i); });
        pips.appendChild(b);
      });
    }

    function currentIndex() {
      var center = track.scrollLeft + track.clientWidth / 2;
      var best = 0, bestD = Infinity;
      cards.forEach(function (c, i) {
        var d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - center);
        if (d < bestD) { bestD = d; best = i; }
      });
      return best;
    }
    function goTo(i) {
      var idx = Math.max(0, Math.min(cards.length - 1, i));
      var c = cards[idx];
      track.scrollTo({ left: c.offsetLeft - (track.clientWidth - c.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
    }
    function sync() {
      var i = currentIndex();
      if (pips) $$('button', pips).forEach(function (b, n) {
        b.setAttribute('aria-selected', n === i ? 'true' : 'false');
      });
      if (prev) prev.disabled = i === 0;
      if (next) next.disabled = i === cards.length - 1;
    }

    if (prev) prev.addEventListener('click', function () { goTo(currentIndex() - 1); });
    if (next) next.addEventListener('click', function () { goTo(currentIndex() + 1); });

    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(currentIndex() + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(currentIndex() - 1); }
    });

    var st = null;
    track.addEventListener('scroll', function () {
      if (st) return;
      st = setTimeout(function () { sync(); st = null; }, 90);
    }, { passive: true });

    sync();
  }

  /* ---------------- about rotator ---------------- */
  function initRotator() {
    var box = $('#aboutRotator');
    if (!box) return;
    var items = $$('p', box);
    if (items.length < 2) return;
    var i = 0;
    items[0].classList.add('is-on');
    if (reduce) return;
    setInterval(function () {
      items[i].classList.remove('is-on');
      i = (i + 1) % items.length;
      items[i].classList.add('is-on');
    }, 7000);
  }

  /* ---------------- ticker ---------------- */
  function initTicker() {
    var track = $('#tickerTrack');
    if (!track) return;
    track.innerHTML += track.innerHTML;
  }

  /* ---------------- clock + exposure ---------------- */
  function initClock() {
    var el = $('#headTime');
    if (!el) return;
    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    function tick() {
      var d = new Date();
      el.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    }
    tick();
    setInterval(tick, 1000);

    var ex = $('#exposure');
    if (ex) {
      var start = new Date(2003, 4, 15);
      var days = Math.ceil((Date.now() - start.getTime()) / 86400000);
      ex.textContent = String(days).padStart(6, '0');
    }
  }

  /* ---------------- active nav ---------------- */
  function initActiveNav() {
    var links = $$('[data-nav]');
    if (!links.length || !('IntersectionObserver' in window)) return;
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove('is-active'); });
        var a = map[e.target.id];
        if (a) a.classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    $$('main section[id]').forEach(function (s) { io.observe(s); });
  }

  /* ---------------- parallax ---------------- */
  function initParallax() {
    if (reduce) return;
    var els = $$('[data-parallax]');
    if (!els.length) return;
    var ticking = false;
    function frame() {
      var vh = window.innerHeight;
      els.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var mid = (r.top + r.height / 2 - vh / 2) / vh;
        el.style.setProperty('--py', (mid * -16).toFixed(2) + 'px');
        var img = el.firstElementChild;
        if (img) img.style.translate = '0 ' + (mid * -18).toFixed(2) + 'px';
      });
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { raf(frame); ticking = true; }
    }, { passive: true });
    frame();
  }

  /* ---------------- boot ---------------- */
  function boot() {
    initLang();
    initHeader();
    initIntro();
    initReveal();
    initIndexPreview();
    initCursor();
    initMagnets();
    initLetters();
    initRotator();
    initTicker();
    initClock();
    initActiveNav();
    initParallax();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
