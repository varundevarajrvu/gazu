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
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      io.unobserve(entry.target); // reveal once, never re-animate on scroll back
    });
  }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });

  targets.forEach(function (el) { io.observe(el); });
})();
