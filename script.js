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
     presses Pause; reduced-motion users get no autoplay and no glitch. */
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

    /* Glitch: copy the element's content into N horizontal strips and shear
       them sideways. "out" tears the image apart, "in" pulls it together. */
    var STRIPS = 9;
    function glitch(el, dir) {
      if (!el.animate) return Promise.resolve();
      var layer = document.createElement("div");
      layer.className = "glitch-layer";
      layer.setAttribute("aria-hidden", "true");
      var w = el.offsetWidth || 200;
      var anims = [];
      for (var i = 0; i < STRIPS; i++) {
        var strip = document.createElement("div");
        strip.className = "glitch-strip";
        var top = (i * 100) / STRIPS;
        var bottom = 100 - ((i + 1) * 100) / STRIPS;
        strip.style.clipPath = "inset(" + top + "% 0 " + bottom + "% 0)";
        strip.innerHTML = el.innerHTML;
        layer.appendChild(strip);

        var dx  = (Math.random() * 2 - 1) * w * 0.16;
        var dx2 = dx * (1.8 + Math.random());
        var frames = [
          { transform: "translateX(0)", opacity: 1 },
          { transform: "translateX(" + dx + "px)", opacity: 1, offset: 0.35 },
          { transform: "translateX(" + dx2 + "px)", opacity: 0 }
        ];
        if (dir === "in") frames = frames.reverse().map(function (f, k) {
          var g = { transform: f.transform, opacity: f.opacity };
          if (k === 1) g.offset = 0.65;
          return g;
        });
        anims.push(strip.animate(frames, {
          duration: 380,
          delay: Math.random() * 140,
          easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
          fill: "both"
        }));
      }
      el.appendChild(layer);
      el.classList.add("is-glitching");
      return Promise.all(anims.map(function (a) { return a.finished; })).then(function () {
        layer.remove();
        el.classList.remove("is-glitching");
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
        Promise.all(targets(next).map(function (el) { return glitch(el, "in"); })).then(function () {
          next.classList.remove("is-entering");
          busy = false;
        });
      }

      if (reduced) { swap(); return; }
      from.classList.add("is-leaving");
      Promise.all(targets(from).map(function (el) { return glitch(el, "out"); })).then(swap);
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
