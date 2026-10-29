// Scroll scenes. Writes one number, --p (0 to 1: how far the scene has travelled through the viewport),
// onto each [data-scroll] element. All motion is CSS that reads --p, so there is no animation library.
// In the real app this is the useScrollProgress hook. Under reduced motion the scenes rest in their composed state.
(function () {
  var scenes = [].slice.call(document.querySelectorAll("[data-scroll]"));
  if (!scenes.length) return;
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) {
    scenes.forEach(function (s) { s.style.setProperty("--p", "0.6"); });
    return;
  }
  var queued = false;
  function update() {
    var vh = window.innerHeight;
    scenes.forEach(function (s) {
      var r = s.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      var p = (vh - r.top) / (vh + r.height);
      s.style.setProperty("--p", Math.max(0, Math.min(1, p)).toFixed(4));
    });
    queued = false;
  }
  function onScroll() { if (!queued) { queued = true; requestAnimationFrame(update); } }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
})();
