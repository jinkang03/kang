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
      try { window.dispatchEvent(new CustomEvent('jk-lang', { detail: { lang: lang } })); } catch (e) {}
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

  /* ---------------- mobile nav ---------------- */
  function initMenu() {
    var btn = $('#navToggle');
    var nav = $('#siteNav');
    if (!btn || !nav) return;
    function setOpen(open) {
      nav.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? (root.lang.indexOf('zh') === 0 ? '关闭菜单' : 'Close menu') : (root.lang.indexOf('zh') === 0 ? '菜单' : 'Menu'));
    }
    btn.addEventListener('click', function () { setOpen(!nav.classList.contains('is-open')); });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
    window.addEventListener('jk-lang', function () { setOpen(nav.classList.contains('is-open')); });
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

  /* ---------------- days stay on Beijing; clock follows the visitor IP zone ---------------- */
  function validZone(tz) {
    if (!tz || typeof tz !== 'string') return '';
    try {
      new Intl.DateTimeFormat('en-GB', { timeZone: tz }).format();
      return tz;
    } catch (e) { return ''; }
  }
  function partsIn(zone, withDate) {
    var opt = {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hourCycle: 'h23'
    };
    if (zone) opt.timeZone = zone;
    if (!withDate) {
      delete opt.year; delete opt.month; delete opt.day;
    }
    var out = {};
    new Intl.DateTimeFormat('en-GB', opt).formatToParts(new Date()).forEach(function (p) {
      if (p.type !== 'literal') out[p.type] = p.value;
    });
    return out;
  }
  function beijingDays() {
    var p = partsIn('Asia/Shanghai', true);
    var today = Date.UTC(+p.year, +p.month - 1, +p.day);
    var start = Date.UTC(2003, 4, 15);
    return Math.round((today - start) / 86400000);
  }
  function initClock() {
    var el = $('#headTime');
    var dayEl = $('#dayCount');
    var ex = $('#exposure');
    var clockZone = '';

    function tick() {
      var p = partsIn(clockZone, false);
      if (el && p.hour) el.textContent = p.hour + ':' + p.minute + ':' + p.second;
      var days = beijingDays();
      if (dayEl) dayEl.textContent = days.toLocaleString('en-US');
      if (ex) ex.textContent = String(days).padStart(6, '0');
    }
    function useZone(tz) {
      tz = validZone(tz);
      if (!tz || tz === clockZone) return;
      clockZone = tz;
      if (el) el.title = tz;
      tick();
    }
    tick();
    setInterval(tick, 1000);

    function grab(url, pick) {
      return fetch(url).then(function (r) { return r.ok ? r.json() : null; }).then(pick).catch(function () { return ''; });
    }
    window.addEventListener('jk-ip-zone', function (e) {
      useZone(e.detail && e.detail.tz);
    });
    grab('https://get.geojs.io/v1/ip/geo.json', function (d) { return d && d.timezone; })
      .then(function (tz) { if (validZone(tz)) return tz; return grab('https://api.ip.sb/geoip', function (d) { return d && d.timezone; }); })
      .then(function (tz) { if (validZone(tz)) return tz; return grab('https://ipwho.is/', function (d) { return d && d.timezone && d.timezone.id; }); })
      .then(useZone)
      .catch(function () {});
  }

  /* ---------------- smooth scroll ---------------- */
  function initSmooth() {
    if (reduce || !window.Lenis) return;
    document.documentElement.style.scrollBehavior = 'auto';
    var lenis = new window.Lenis({
      duration: 1.05,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.1,
      anchors: false
    });
    function rafLoop(t) { lenis.raf(t); raf(rafLoop); }
    raf(rafLoop);
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href').slice(1);
      var target = id ? document.getElementById(id) : null;
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -72 });
    });
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


  /* ---------------- sound ---------------- */
  function initMusic() {
    var dock = $('#musicDock');
    var btn = $('#musicBtn');
    var label = $('#musicTrack');
    if (!dock || !btn) return;

    var TRACKS = [
      ['assets/music/01-Fading-Away.mp3', 'Fading Away'],
      ['assets/music/02-Journey-Capo-Productions.mp3', 'Journey'],
      ['assets/music/03-With-an-Orchid-Yanni.mp3', 'With an Orchid'],
      ['assets/music/04-Futari-no-Kimochi-Wada-Kaoru.mp3', 'Futari no Kimochi'],
      ['assets/music/05-Mo-Wen-Gui-Qi-Jiang-Xueer.m4a', 'Mo Wen Gui Qi'],
      ['assets/music/06-The-Truth-That-You-Leave-Pianoboy.m4a', 'The Truth That You Leave']
    ];

    var audio = null;
    var current = -1;
    var skips = 0;
    var userPaused = false;

    function soundLabel(playing) {
      var zh = root.lang.indexOf('zh') === 0;
      btn.setAttribute('aria-label', playing
        ? (zh ? '暂停背景音乐' : 'Pause background music')
        : (zh ? '播放背景音乐' : 'Play background music'));
    }

    function remember(on) {
      try { localStorage.setItem('jk_sound', on ? 'on' : 'off'); } catch (e) {}
    }

    function ensure() {
      if (audio) return audio;
      audio = new Audio();
      audio.preload = 'none';
      audio.volume = 0.5;
      audio.setAttribute('playsinline', '');
      audio.addEventListener('playing', function () {
        skips = 0;
        dock.classList.add('is-playing');
        btn.setAttribute('aria-pressed', 'true');
        soundLabel(true);
      });
      audio.addEventListener('pause', function () {
        dock.classList.remove('is-playing');
        btn.setAttribute('aria-pressed', 'false');
        soundLabel(false);
      });
      audio.addEventListener('ended', function () { next(); });
      audio.addEventListener('error', function () {
        if (skips >= TRACKS.length) return;
        skips++;
        next();
      });
      return audio;
    }

    function next() {
      var a = ensure();
      var i = Math.floor(Math.random() * TRACKS.length);
      if (TRACKS.length > 1 && i === current) i = (i + 1) % TRACKS.length;
      current = i;
      a.src = TRACKS[i][0];
      if (label) label.textContent = TRACKS[i][1];
      a.load();
      var p = a.play();
      if (p && p.catch) p.catch(function () {});
    }

    function play() {
      var a = ensure();
      if (!a.src) { next(); return; }
      var p = a.play();
      if (p && p.catch) p.catch(function () {});
    }

    btn.addEventListener('click', function () {
      var a = ensure();
      if (a.paused) {
        userPaused = false;
        remember(true);
        play();
      } else {
        userPaused = true;
        remember(false);
        a.pause();
      }
    });

    var pref = null;
    try { pref = localStorage.getItem('jk_sound'); } catch (e) {}
    var armed = pref === 'on';

    function arm(e) {
      if (userPaused || pref === 'off') return;
      if (e && e.target && e.target.closest && e.target.closest('#musicDock, #musicBtn')) return;
      if (armed && audio && !audio.paused) return;
      armed = true;
      remember(true);
      play();
    }
    if (armed) setTimeout(play, 1400);
    window.addEventListener('pointerdown', arm, { passive: true });
    window.addEventListener('keydown', arm);
    window.addEventListener('jk-lang', function () {
      soundLabel(audio && !audio.paused);
    });

    // duck the volume when a letter is being read
    var letters = $('#letters');
    if (letters && 'IntersectionObserver' in window) {
      var lio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!audio) return;
          audio.volume = en.isIntersecting ? 0.18 : 0.5;
        });
      }, { threshold: 0.5 });
      lio.observe(letters);
    }
  }

  /* ---------------- visitors ---------------- */
  function initVisitors() {
    var BOARD = 'https://kang-visitors.jinkang03.workers.dev/visitors';
    var btn = $('#visitorBtn');
    var panel = $('#visitorPanel');
    var scrim = $('#vpScrim');
    var close = $('#vpClose');
    var countEl = $('#visitorCount');
    if (!btn || !panel) return;

    var board = [];
    var you = null;
    var open = false;
    var lastFocus = null;

    function locOf(v) {
      if (!v) return '';
      var zh = root.lang.indexOf('zh') === 0;
      return zh ? (v.locZh || v.locEn || '') : (v.locEn || v.locZh || '');
    }
    function fmt(ts) {
      var d = new Date(Number(ts));
      if (isNaN(d.getTime())) return '—';
      var pad = function (n) { return n < 10 ? '0' + n : n; };
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
        ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }

    function render() {
      if (countEl) {
        countEl.textContent = board.length ? board.length : '0';
        btn.setAttribute('data-empty', board.length ? 'false' : 'true');
      }
      var ipEl = $('#vpIp'), locEl = $('#vpLoc'), ispEl = $('#vpIsp'), timeEl = $('#vpTime');
      var zh = root.lang.indexOf('zh') === 0;
      btn.setAttribute('aria-label', zh ? '最近访问' : 'Recent visitors');
      if (you) {
        if (ipEl) ipEl.textContent = you.ip || '—';
        if (locEl) locEl.textContent = locOf(you) || '—';
        if (ispEl) ispEl.textContent = you.isp || '—';
        if (timeEl) timeEl.textContent = fmt(you.ts);
      }
      var list = $('#vpList');
      if (!list) return;
      list.textContent = '';
      if (!board.length) {
        var li = document.createElement('li');
        li.className = 'vp-empty';
        li.textContent = root.lang.indexOf('zh') === 0 ? '还没有记录' : 'No visitors yet';
        list.appendChild(li);
        return;
      }
      board.slice(0, 40).forEach(function (v) {
        var li2 = document.createElement('li');
        li2.className = 'vp-item';
        var top = document.createElement('div');
        top.className = 'vp-item-top';
        var ip = document.createElement('span');
        ip.className = 'vp-i-ip';
        ip.textContent = v.ip;
        var t = document.createElement('span');
        t.className = 'vp-i-time';
        t.textContent = fmt(v.ts);
        top.append(ip, t);
        li2.appendChild(top);
        var loc = locOf(v);
        if (loc) {
          var l = document.createElement('span');
          l.className = 'vp-i-loc';
          l.textContent = loc;
          li2.appendChild(l);
        }
        list.appendChild(li2);
      });
    }

    function setOpen(v) {
      open = v;
      panel.classList.toggle('is-open', v);
      panel.setAttribute('aria-hidden', v ? 'false' : 'true');
      btn.setAttribute('aria-expanded', v ? 'true' : 'false');
      if (scrim) {
        scrim.hidden = false;
        requestAnimationFrame(function () { scrim.classList.toggle('is-on', v); });
        if (!v) setTimeout(function () { if (!open) scrim.hidden = true; }, 450);
      }
      document.body.style.overflow = v ? 'hidden' : '';
      if (v) {
        lastFocus = document.activeElement;
        if (close) close.focus();
      } else if (lastFocus && lastFocus.focus) {
        lastFocus.focus();
      }
    }

    btn.addEventListener('click', function () { setOpen(!open); });
    if (close) close.addEventListener('click', function () { setOpen(false); });
    if (scrim) scrim.addEventListener('click', function () { setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) setOpen(false);
    });
    window.addEventListener('jk-lang', function () { render(); });

    function load() {
      var opts = { method: 'POST' };
      return fetch(BOARD, opts)
        .then(function (r) { if (!r.ok) throw new Error('post'); return r.json(); })
        .then(function (d) {
          you = d.you || null;
          board = (d.visitors || []).filter(function (v) { return v && v.ip; });
          if (you && you.timezone) {
            try { window.dispatchEvent(new CustomEvent('jk-ip-zone', { detail: { tz: you.timezone } })); } catch (e) {}
          }
          render();
        })
        .catch(function () {
          return fetch(BOARD)
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) {
              if (!d) throw new Error('get');
              board = (d.visitors || []).filter(function (v) { return v && v.ip; });
              render();
            })
            .catch(function () {
              if (countEl) countEl.textContent = '—';
              btn.setAttribute('data-empty', 'true');
            });
        });
    }
    load();
  }

  /* ---------------- boot ---------------- */
  function boot() {
    initLang();
    initHeader();
    initIntro();
    initReveal();
    initIndexPreview();
    initMenu();
    initMagnets();
    initLetters();
    initRotator();
    initClock();
    initSmooth();
    initActiveNav();
    initParallax();
    initMusic();
    initVisitors();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
