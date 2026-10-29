// Mockup behavior only. Nothing here ships; the real app is React. Kept small and dependency free.
(function () {
  var root = document.documentElement;

  // Theme: remembered choice, else light. Storage can be blocked, so it is wrapped.
  function savedTheme() {
    try { return localStorage.getItem("fb-theme"); } catch (e) { return null; }
  }
  var theme = savedTheme() || "light";
  root.setAttribute("data-theme", theme);
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-theme-toggle]");
    if (!t) return;
    theme = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", theme);
    try { localStorage.setItem("fb-theme", theme); } catch (err) { /* ignore */ }
    t.textContent = theme === "dark" ? "Light theme" : "Dark theme";
  });
  document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
    b.textContent = theme === "dark" ? "Light theme" : "Dark theme";
  });

  // The choice applies to every page and every open tab: other tabs get a storage event.
  window.addEventListener("storage", function (e) {
    if (e.key !== "fb-theme" || !e.newValue) return;
    theme = e.newValue;
    root.setAttribute("data-theme", theme);
    document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
      b.textContent = theme === "dark" ? "Light theme" : "Dark theme";
    });
  });

  // Mobile menu.
  document.querySelectorAll(".nav__toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var menu = document.getElementById(btn.getAttribute("aria-controls"));
      var open = menu.getAttribute("data-open") !== "true";
      menu.setAttribute("data-open", String(open));
      btn.setAttribute("aria-expanded", String(open));
    });
  });

  // Generic state switcher: <div class="seg" data-switch="#target"> buttons carry data-state.
  // Elements inside the target with data-only="a b" show only in those states.
  function setState(target, state) {
    target.setAttribute("data-state", state);
    target.querySelectorAll("[data-only]").forEach(function (el) {
      el.hidden = el.getAttribute("data-only").split(" ").indexOf(state) === -1;
    });
    target.querySelectorAll("[data-text]").forEach(function (el) {
      var map = JSON.parse(el.getAttribute("data-text"));
      if (map[state] !== undefined) el.textContent = map[state];
    });
    target.dispatchEvent(new CustomEvent("statechange", { detail: state }));
  }
  document.querySelectorAll("[data-switch]").forEach(function (seg) {
    var target = document.querySelector(seg.getAttribute("data-switch"));
    var buttons = seg.querySelectorAll("button");
    function pick(btn) {
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
      setState(target, btn.getAttribute("data-state"));
    }
    buttons.forEach(function (b) { b.addEventListener("click", function () { pick(b); }); });
    pick(seg.querySelector('[aria-pressed="true"]') || buttons[0]);
  });
  window.fbSetState = setState;

  // Scroll reveal: one gentle rise per block, landing page only.
  var reveals = document.querySelectorAll(".reveal");
  if (reveals.length) {
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
        });
      }, { threshold: 0.12 });
      reveals.forEach(function (el) { io.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add("in"); });
    }
  }
})();
