/* GAZU — progressive enhancement only.
   The page is fully readable and navigable with this file absent: the reveal
   animation is opt-in via a .js flag, and the mobile menu degrades to the
   links still being reachable in the DOM. */

(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------ MOBILE NAV ------------------------------ */
  var menuBtn   = document.getElementById("menuBtn");
  var menuClose = document.getElementById("menuClose");
  var mobileNav = document.getElementById("mobileNav");

  function setMenu(open) {
    if (!mobileNav || !menuBtn) return;
    mobileNav.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
    // Lock the page behind the overlay rather than letting it scroll under.
    document.body.style.overflow = open ? "hidden" : "";
    if (open) {
      var first = mobileNav.querySelector("a, button");
      if (first) first.focus();
    } else {
      menuBtn.focus();
    }
  }

  if (menuBtn)   menuBtn.addEventListener("click", function () { setMenu(true); });
  if (menuClose) menuClose.addEventListener("click", function () { setMenu(false); });

  if (mobileNav) {
    // Close on navigation — the link still resolves, we only dismiss the overlay.
    mobileNav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && mobileNav && !mobileNav.hidden) setMenu(false);
  });

  // A resize past the mobile breakpoint must not leave the overlay stuck open.
  window.addEventListener("resize", function () {
    if (window.innerWidth > 767 && mobileNav && !mobileNav.hidden) setMenu(false);
  });

  /* ----------------------------- SCROLL REVEAL ---------------------------- */
  var targets = document.querySelectorAll(".reveal");

  if (reduced || !("IntersectionObserver" in window)) {
    // Show everything immediately — no observer, no animation.
    for (var i = 0; i < targets.length; i++) targets[i].classList.add("is-in");
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target); // reveal once, never re-animate on scroll back
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });

    targets.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------- HERO CAROUSEL ---------------------------- */
  /* Autoplay advances when the progress bar's CSS animation ends, so pausing
     is just animation-play-state — no timers to keep in sync. It pauses while
     the viewer hovers, focuses inside, opens a product, scrolls away, or
     presses Pause; reduced-motion users get no autoplay and no dissolve. */
  var heroEl = document.querySelector("[data-hero]");
  if (heroEl) initHero(heroEl);

  function initHero(hero) {
    var slides = [].slice.call(hero.querySelectorAll(".slide"));
    if (slides.length < 2) return;

    var region   = hero.querySelector(".hero-slides");
    var cta      = hero.querySelector("[data-hero-cta]");
    var counter  = hero.querySelector("[data-hero-count]");
    var progress = hero.querySelector("[data-hero-progress]");
    var nextCard = hero.querySelector("[data-hero-next]");
    var pauseBtn = hero.querySelector("[data-hero-pause]");
    var cartLink = document.querySelector("[data-cart]");
    var cartNum  = document.querySelector(".cart-count");

    var autoplay = !reduced;
    var index = 0;
    var busy = false;
    var holds = {};
    var bag = 0;

    if (!autoplay) hero.classList.add("no-autoplay");

    function pad(n) { return (n < 10 ? "0" : "") + n; }

    function hold(reason, on) {
      holds[reason] = on;
      var paused = !autoplay || Object.keys(holds).some(function (k) { return holds[k]; });
      hero.classList.toggle("is-paused", paused);
      hero.classList.toggle("is-user-paused", !!holds.user);
      // Announce slide changes only when the viewer is driving, never on autoplay.
      region.setAttribute("aria-live", autoplay && !holds.user ? "off" : "polite");
    }

    function restartProgress() {
      if (!progress) return;
      var bar = progress.firstElementChild;
      var fresh = bar.cloneNode(false);
      progress.replaceChild(fresh, bar);
    }

    function syncChrome() {
      var s = slides[index];
      var n = slides[(index + 1) % slides.length];
      if (cta) cta.textContent = "Shop " + s.dataset.domain;
      if (counter) counter.textContent = pad(index + 1) + " / " + pad(slides.length);
      if (nextCard) {
        nextCard.querySelector("img").src = n.querySelector(".slide-media img").currentSrc ||
                                            n.querySelector(".slide-media img").src;
        nextCard.querySelector("[data-hero-next-label]").textContent = n.dataset.domain;
        nextCard.setAttribute("aria-label", "Next product: " + n.dataset.domain);
      }
      restartProgress();
    }

    /* Sand dissolve: the element is redrawn on a canvas and cut into tiny
       square grains. A left-to-right gradient, roughened with noise, sets
       when each grain goes: "out" erases grains and lets a share of them
       drift off as specks; "in" lays grains down along the same ragged front. */
    var GRAIN = 1.5;                                    // CSS px per grain (min 2 device px)
    var DPR = Math.min(window.devicePixelRatio || 1, 2);

    // Paint the element's visible content (cover-fitted photo, or the word)
    // onto ctx in device pixels. Returns false if there is nothing to paint yet.
    function paintSource(ctx, el, w, h) {
      var img = el.querySelector("img");
      if (img) {
        if (!img.complete || !img.naturalWidth) return false;
        var s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
        var dw = img.naturalWidth * s, dh = img.naturalHeight * s;
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
        return true;
      }
      var text = el.firstElementChild;
      if (!text) return false;
      var cs = getComputedStyle(text);
      var box = el.getBoundingClientRect();
      var probe = document.createElement("span");       // sits on the baseline
      probe.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
      text.appendChild(probe);
      var pr = probe.getBoundingClientRect();
      text.removeChild(probe);
      var range = document.createRange();
      range.selectNodeContents(text);
      ctx.font = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
      if ("letterSpacing" in ctx) ctx.letterSpacing = cs.letterSpacing;
      ctx.fillStyle = cs.color;
      ctx.textBaseline = "alphabetic";
      ctx.fillText(text.textContent, range.getBoundingClientRect().left - box.left, pr.bottom - box.top);
      return true;
    }

    function dissolve(el, dir) {
      var w = el.offsetWidth, h = el.offsetHeight;
      if (!w || !h || !window.requestAnimationFrame) return Promise.resolve();

      var W = Math.round(w * DPR), H = Math.round(h * DPR);
      var src = document.createElement("canvas");
      src.width = W; src.height = H;
      var sctx = src.getContext("2d");
      sctx.scale(DPR, DPR);
      if (!paintSource(sctx, el, w, h)) return Promise.resolve();

      var pixels = null;
      try { pixels = sctx.getImageData(0, 0, W, H).data; } catch (e) { /* tainted: no specks */ }

      var layer = document.createElement("canvas");     // the grains that stay
      var fx = document.createElement("canvas");        // the grains in flight
      [layer, fx].forEach(function (c) {
        c.className = "grain-layer";
        c.setAttribute("aria-hidden", "true");
        c.width = W; c.height = H;
      });
      var ctx = layer.getContext("2d");
      var fctx = fx.getContext("2d");
      if (dir === "out") ctx.drawImage(src, 0, 0);

      // grain grid in whole device pixels, so erased cells leave no seams
      var g = Math.max(2, Math.round(GRAIN * DPR));
      var cols = Math.ceil(W / g), rows = Math.ceil(H / g);
      // ~70k–130k grains: typed arrays + a bucket sort keep setup to a few ms
      var n = cols * rows, m = 0, B = 1024;
      var cx = new Uint16Array(n), cy = new Uint16Array(n);
      var cpx = new Int32Array(n), cb = new Uint16Array(n);
      var counts = new Uint32Array(B + 1);
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var x = c * g, y = r * g, px = -1;
          if (pixels) {
            var i = ((Math.min(y + (g >> 1), H - 1) * W) + Math.min(x + (g >> 1), W - 1)) * 4;
            if (pixels[i + 3] < 24) { if (dir === "in") continue; } // empty space: nothing to lay down
            else px = i;
          }
          // the gradient front: mostly position, part noise
          var t0 = 0.68 * (c / cols) + 0.08 * (r / rows) + 0.24 * Math.random();
          var bk = Math.min(B - 1, (t0 * B) | 0);
          cx[m] = x; cy[m] = y; cpx[m] = px; cb[m] = bk;
          counts[bk + 1]++;
          m++;
        }
      }
      for (var q = 1; q <= B; q++) counts[q] += counts[q - 1];
      var order = new Uint32Array(m);
      for (var j = 0; j < m; j++) order[counts[cb[j]]++] = j;

      var OUT = dir === "out";
      function rgbAt(i) { return "rgb(" + pixels[i] + "," + pixels[i + 1] + "," + pixels[i + 2] + ")"; }
      var DUR = OUT ? 1200 : 1100;
      var SWEEP = OUT ? 0.7 : 1;        // out: grid clears early so specks can finish
      var specks = [];
      var k = 0;
      var start = null, last = null;

      el.appendChild(layer);
      el.appendChild(fx);
      el.classList.add("is-dissolving");

      return new Promise(function (resolve) {
        function frame(now) {
          if (start === null) { start = last = now; }
          var t = Math.min(1, (now - start) / DUR);
          var dt = Math.min(0.05, (now - last) / 1000);
          last = now;
          var front = Math.min(1, t / SWEEP) * B;
          var left = DUR * (1 - t);

          while (k < m && cb[order[k]] < front) {
            var id = order[k++];
            var gx = cx[id], gy = cy[id], gp = cpx[id];
            if (OUT) {
              ctx.clearRect(gx, gy, g, g);
              if (gp >= 0 && Math.random() < 0.16) {
                specks.push({ x: gx, y: gy, c: rgbAt(gp), age: 0,
                  life: Math.min(450 + Math.random() * 600, left) / 1000,
                  vx: (30 + Math.random() * 90) * DPR, vy: (-15 - Math.random() * 40) * DPR });
              }
            } else {
              ctx.drawImage(src, gx, gy, g, g, gx, gy, g, g);
              if (gp >= 0 && Math.random() < 0.05) {
                specks.push({ x: gx - 12 * DPR, y: gy - 5 * DPR, c: rgbAt(gp), age: 0,
                  life: 0.3 + Math.random() * 0.2, vx: 40 * DPR, vy: 16 * DPR });
              }
            }
          }

          fctx.clearRect(0, 0, W, H);
          for (var s = specks.length - 1; s >= 0; s--) {
            var p = specks[s];
            p.age += dt;
            if (p.age >= p.life) { specks.splice(s, 1); continue; }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 90 * DPR * dt;                         // sand falls
            fctx.globalAlpha = 1 - p.age / p.life;
            fctx.fillStyle = p.c;
            fctx.fillRect(p.x, p.y, g, g);
          }

          if (t < 1) { requestAnimationFrame(frame); return; }
          layer.remove();
          fx.remove();
          el.classList.remove("is-dissolving");
          resolve();
        }
        requestAnimationFrame(frame);
      });
    }

    function targets(slide) {
      return [slide.querySelector(".slide-word"), slide.querySelector(".slide-media")];
    }

    function go(to) {
      to = (to + slides.length) % slides.length;
      if (to === index || busy) return;
      var from = slides[index];
      var next = slides[to];
      setOpen(from, false);
      busy = true;

      function swap() {
        from.hidden = true;
        from.classList.remove("is-active", "is-leaving");
        next.hidden = false;
        next.classList.add("is-active");
        index = to;
        syncChrome();
        if (reduced) { busy = false; return; }
        next.classList.add("is-entering");
        Promise.all(targets(next).map(function (el) { return dissolve(el, "in"); })).then(function () {
          next.classList.remove("is-entering");
          busy = false;
        });
      }

      if (reduced) { swap(); return; }
      from.classList.add("is-leaving");
      Promise.all(targets(from).map(function (el) { return dissolve(el, "out"); })).then(swap);
    }

    /* size picker */
    function setOpen(slide, open) {
      var toggle = slide.querySelector(".pc-toggle");
      var sizes = slide.querySelector(".pc-sizes");
      if (!toggle || !sizes) return;
      slide.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      sizes.hidden = !open;
      if (!open) slide.querySelector(".pc-msg").textContent = "";
      hold("open", open);
    }

    function addToBag(slide) {
      var picked = slide.querySelector('.pc-sizes input:checked');
      var msg = slide.querySelector(".pc-msg");
      if (!picked) { msg.textContent = "Choose a size first."; return; }
      bag += 1;
      if (cartNum) cartNum.textContent = "(" + bag + ")";
      if (cartLink) cartLink.setAttribute("aria-label", "Cart, " + bag + (bag === 1 ? " item" : " items"));
      msg.textContent = "Added " + slide.querySelector(".pc-name").textContent +
                        ", " + picked.value + ", to your bag.";
    }

    hero.addEventListener("click", function (e) {
      var t = e.target;
      if (t.closest(".pc-toggle")) {
        var s = t.closest(".slide");
        setOpen(s, !s.classList.contains("is-open"));
      } else if (t.closest(".pc-add")) {
        addToBag(t.closest(".slide"));
      } else if (t.closest("[data-hero-prev]")) {
        go(index - 1);
      } else if (t.closest("[data-hero-next-btn]") || t.closest("[data-hero-next]")) {
        go(index + 1);
      } else if (t.closest("[data-hero-pause]")) {
        var paused = !holds.user;
        hold("user", paused);
        pauseBtn.setAttribute("aria-label", paused ? "Play slideshow" : "Pause slideshow");
      }
    });

    hero.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && slides[index].classList.contains("is-open")) {
        setOpen(slides[index], false);
        slides[index].querySelector(".pc-toggle").focus();
      }
    });

    // autoplay tick
    if (progress) progress.addEventListener("animationend", function () {
      if (!autoplay) return;
      if (busy) restartProgress();   // a manual change is mid-flight; retime
      else go(index + 1);
    });

    // pause reasons
    hero.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") hold("hover", true); });
    hero.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") hold("hover", false); });
    hero.addEventListener("focusin", function () { hold("focus", true); });
    hero.addEventListener("focusout", function (e) {
      if (!hero.contains(e.relatedTarget)) hold("focus", false);
    });
    document.addEventListener("visibilitychange", function () { hold("hidden", document.hidden); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        hold("offscreen", !entries[0].isIntersecting);
      }, { threshold: 0.25 }).observe(hero);
    }

    // touch swipe on the portrait
    var startX = null;
    region.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse") startX = e.clientX;
    });
    region.addEventListener("pointerup", function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 48) go(index + (dx < 0 ? 1 : -1));
    });
    region.addEventListener("pointercancel", function () { startX = null; });

    hold("init", false);
  }
})();
