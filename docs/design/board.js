// Board mockup. Draws the schedule from a small state table, the way the real app draws it from
// GET /api/contracts/:id/scheduler. Hours are measured from the window start (Fri 6 Nov, 8:00am PT).
(function () {
  var page = document.getElementById("bpage");
  var boardEl = document.getElementById("board");
  var personEl = document.getElementById("person");
  var chat = document.getElementById("chat");
  var END = 132, D = 10, G = 82;
  var DAYS = [[0, "Fri 6"], [16, "Sat 7"], [40, "Sun 8"], [64, "Mon 9"], [88, "Tue 10"], [112, "Wed 11"]];
  var PEOPLE = [
    { id: "alex", name: "Alex Chen", auth: "SAMPLE-AUTH-ALEX", cap: "SAMPLE-CAPTURE-ALEX" },
    { id: "sam", name: "Sam Ortiz", auth: "SAMPLE-AUTH-SAM", cap: "SAMPLE-CAPTURE-SAM" },
    { id: "jordan", name: "Jordan Lee", auth: "SAMPLE-AUTH-JORDAN", cap: "SAMPLE-CAPTURE-JORDAN" },
    { id: "maya", name: "Maya Shah", auth: "SAMPLE-AUTH-MAYA", cap: "SAMPLE-CAPTURE-MAYA" }
  ];
  function E(label, cls, s, e) { return { label: label, cls: cls, s: s, e: e }; }
  var held = E("Held", "held", 0, D), waiting = E("Waiting", "waiting", 0, D);
  var STATES = {
    collecting: { c: ["Collecting", "waiting"], held: "3 of 4 held", reason: "", now: 8,
      ev: { alex: held, sam: held, jordan: held, maya: waiting } },
    proposal: { c: ["Collecting", "waiting"], held: "3 of 4 held", reason: "", now: 8, proposed: D,
      ev: { alex: held, sam: held, jordan: held, maya: waiting } },
    kept: { c: ["Kept", "kept"], held: "4 of 4 held · 4 kept", now: D,
      reason: "Everyone held their share by the deadline, so Foldback captured all 4 holds.",
      ev: { alex: E("Kept", "kept", 9, END), sam: E("Kept", "kept", 9, END), jordan: E("Kept", "kept", 9, END), maya: E("Kept", "kept", 9, END) } },
    released: { c: ["Released", "released"], held: "0 of 4 held · 3 released", now: G,
      reason: "Maya Shah did not hold her share by Mon 9 Nov, 6:00pm PT, so Foldback released all 3 holds. Nobody was charged.",
      ev: { alex: E("Released", "released", G, END), sam: E("Released", "released", G, END), jordan: E("Released", "released", G, END), maya: E("Missed deadline", "waiting", D, D + 4) } },
    paused: { c: ["Paused", "attention"], held: "3 of 4 held", now: D,
      reason: "Maya Shah's hold result is unknown. Check payment to continue.",
      ev: { alex: held, sam: held, jordan: held, maya: E("Hold unknown", "failed", 8, 12) } }
  };
  var cur = { state: "collecting", now: 8, proposed: null, selected: "alex", status: null };
  var CLOCK = { 8: "Fri 6 Nov, 4:00pm PT", 10: "Fri 6 Nov, 6:00pm PT", 82: "Mon 9 Nov, 6:00pm PT" };
  function pct(h) { return (h / END * 100).toFixed(3) + "%"; }

  function barHtml(ev) {
    return '<span class="bar bar--' + ev.cls + '" style="left:' + pct(ev.s) + ";width:" + pct(ev.e - ev.s) +
      '"><span class="bar__t">' + ev.label + "</span></span>";
  }

  // A label that does not fit inside its bar moves beside it, so the word is never clipped.
  function fit() {
    boardEl.querySelectorAll(".bar").forEach(function (b) {
      var t = b.querySelector(".bar__t");
      b.classList.remove("bar--out"); t.classList.remove("bar__out");
      if (t.offsetWidth + 14 > b.clientWidth) { b.classList.add("bar--out"); t.classList.add("bar__out"); }
    });
  }
  window.addEventListener("resize", fit);

  function render() {
    var st = STATES[cur.state];
    var h = '<div class="brow brow--head"><div class="brow__name">Person</div><div class="brow__badge">Type</div><div class="btrack">';
    DAYS.forEach(function (d) { h += '<span class="dayl" style="left:' + pct(d[0]) + '">' + d[1] + "</span>"; });
    h += "</div></div>";
    PEOPLE.forEach(function (p) {
      var ev = st.ev[p.id];
      h += '<div class="brow" data-selected="' + (cur.selected === p.id) + '"><button class="brow__name" type="button" data-p="' + p.id +
        '" aria-pressed="' + (cur.selected === p.id) + '">' + p.name + '</button><div class="brow__badge"><span class="tag tag--badge">Sandbox</span></div><div class="btrack">' +
        barHtml(ev) + "</div></div>";
    });
    h += '<div class="board__foot"><div class="ftrack">';
    h += '<span class="mkl mkl--left" style="left:' + pct(cur.now) + '">Now</span>';
    h += '<span class="mkl" style="left:' + pct(D) + '">Deadline</span>';
    h += '<span class="mkl" style="left:' + pct(G) + '">Grace ends</span>';
    if (cur.proposed != null) h += '<span class="mkl l2" style="left:' + pct(cur.proposed) + '">Proposed</span>';
    h += "</div></div>";
    h += '<div class="bmarks">';
    DAYS.slice(1).forEach(function (d) { h += '<i class="mk mk--day" style="left:' + pct(d[0]) + '"></i>'; });
    h += '<i class="mk mk--deadline" style="left:' + pct(D) + '"></i><i class="mk mk--grace" style="left:' + pct(G) + '"></i>';
    h += '<i class="mk mk--now" style="left:' + pct(cur.now) + '"></i>';
    if (cur.proposed != null) h += '<i class="mk mk--proposed" style="left:' + pct(cur.proposed) + '"></i>';
    h += "</div>";
    boardEl.innerHTML = h;
    fit();

    var c = cur.status || st.c;
    var cs = document.getElementById("cstatus");
    cs.className = "tag tag--" + c[1]; cs.textContent = c[0];
    document.getElementById("held").textContent = st.held;
    document.getElementById("clock").textContent = "Now: " + (CLOCK[cur.now] || CLOCK[8]);
    document.getElementById("reason").textContent = st.reason || "";
    renderPerson();
    document.querySelectorAll("#chips [data-q]").forEach(function (b) {
      var done = cur.state === "kept" || cur.state === "released";
      b.hidden = done || (b.getAttribute("data-q") === "q3" && cur.state === "proposal");
    });
  }

  function renderPerson() {
    var p = PEOPLE.filter(function (x) { return x.id === cur.selected; })[0];
    if (!p) { personEl.innerHTML = '<p class="muted">Select a person on the schedule.</p>'; return; }
    var ev = STATES[cur.state].ev[p.id], hasHold = ev.label !== "Waiting" && ev.label !== "Missed deadline";
    var rows = "";
    rows += "<div><dt>Authorization</dt><dd class=\"num\">" + (hasHold ? p.auth : "No hold yet") + "</dd></div>";
    if (ev.label === "Held" || ev.label === "Hold unknown") rows += "<div><dt>Hold expires</dt><dd>Sat 5 Dec 2026</dd></div>";
    if (ev.label === "Kept") rows += '<div><dt>Capture</dt><dd class="num">' + p.cap + "</dd></div>";
    if (ev.label === "Released") rows += "<div><dt>Capture</dt><dd>Released (VOIDED)</dd></div>";
    var payable = ev.label === "Waiting";
    personEl.innerHTML =
      '<div class="pname"><strong>' + p.name + '</strong><span class="num">$80.00</span></div>' +
      '<div><span class="tag tag--' + ev.cls + '">' + ev.label + '</span> <span class="tag tag--badge">Sandbox</span></div>' +
      '<dl class="kv">' + rows + "</dl>" +
      (payable ? '<div class="btn-row"><button class="btn btn--sm" type="button" id="copy">Copy pay link</button><a class="btn btn--secondary btn--sm" href="pay.html">Open pay link</a></div>' : "");
    var copy = document.getElementById("copy");
    if (copy) copy.addEventListener("click", function () {
      copy.textContent = "Copied";
      setTimeout(function () { copy.textContent = "Copy pay link"; }, 1500);
    });
  }

  boardEl.addEventListener("click", function (e) {
    var b = e.target.closest("[data-p]");
    if (!b) return;
    cur.selected = b.getAttribute("data-p");
    render();
  });

  // Assistant
  var REPLIES = {
    q1: { me: "What happens if Maya doesn't pay?", ai: "If Maya Shah has not held her share by Mon 9 Nov, 6:00pm PT, all 3 holds are released and nobody is charged.", tool: "Simulated Mon 9 Nov, 6:00pm PT" },
    q2: { me: "Draft reminders for anyone unpaid", ai: "Here is a reminder for Maya Shah.", tool: "Drafted 1 reminder",
      draft: "Hi Maya, your $80.00 share of the cabin is still open. You have until Mon 9 Nov, 6:00pm PT to hold it with PayPal: https://foldback.example/pay/shr_maya" },
    q3: { me: "Move to the deadline", ai: "I can propose moving Now to the deadline. Approve it below to apply it.", tool: "Proposed a clock move to Fri 6 Nov, 6:00pm PT", proposal: true }
  };
  function add(cls, html) {
    var empty = document.getElementById("chat-empty"); if (empty) empty.remove();
    var d = document.createElement("div"); d.className = "msg " + cls; d.innerHTML = html; chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight; return d;
  }
  function esc(s) { var t = document.createElement("span"); t.textContent = s; return t.innerHTML; }
  function proposalCard() {
    var d = add("", '<div class="proposal"><span class="proposal__label">Move the clock</span><span class="small">Moves Now to Fri 6 Nov, 6:00pm PT</span><span class="btn-row"><button class="btn btn--blue btn--sm" type="button" data-act="approve">Approve</button><button class="btn btn--secondary btn--sm" type="button" data-act="dismiss">Dismiss</button></span></div>');
    d.setAttribute("data-proposal", "1");
  }
  function ask(key) {
    var r = REPLIES[key];
    add("msg--me", esc(r.me));
    var html = esc(r.ai);
    if (r.draft) html += '<div class="draft">' + esc(r.draft) + '</div><div class="btn-row" style="margin-top:var(--s-2)"><button class="btn btn--secondary btn--sm" type="button" data-act="copydraft">Copy</button></div>';
    html += '<span class="tool">' + esc(r.tool) + "</span>";
    add("", html);
    if (r.proposal) { cur.proposed = D; proposalCard(); render(); }
  }
  document.getElementById("chips").addEventListener("click", function (e) {
    var b = e.target.closest("[data-q]"); if (b) ask(b.getAttribute("data-q"));
  });
  chat.addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]"); if (!b) return;
    var act = b.getAttribute("data-act");
    if (act === "copydraft") { b.textContent = "Copied"; return; }
    var card = b.closest("[data-proposal]");
    if (act === "approve") { cur.now = D; cur.proposed = null; add("msg--sys", "Approved: Moves Now to Fri 6 Nov, 6:00pm PT"); }
    if (act === "dismiss") { cur.proposed = null; add("msg--sys", "Dismissed the proposal"); }
    if (card) card.remove();
    render();
  });
  document.getElementById("send").addEventListener("click", function () {
    var i = document.getElementById("askin"), v = i.value.trim();
    if (!v) return;
    add("msg--me", esc(v));
    add("", "I can simulate the rule, draft reminders, or propose moving the clock. I can't move money.");
    i.value = "";
  });

  // Demo controls
  function jump(now, status) { cur.now = now; cur.status = status; render(); }
  document.getElementById("adv-d").addEventListener("click", function () { jump(D, cur.state === "collecting" || cur.state === "proposal" ? ["In grace", "waiting"] : null); });
  document.getElementById("adv-g").addEventListener("click", function () { jump(G, cur.state === "collecting" || cur.state === "proposal" ? ["In grace", "waiting"] : null); });
  document.getElementById("resolve").addEventListener("click", function () {
    var b = document.querySelector('.seg button[data-state="released"]'); if (b) b.click();
  });

  page.addEventListener("statechange", function (e) {
    var s = e.detail, st = STATES[s];
    cur.state = s; cur.status = null; cur.now = st.now; cur.proposed = st.proposed == null ? null : st.proposed;
    var old = chat.querySelector("[data-proposal]"); if (old) old.remove();
    if (s === "proposal") proposalCard();
    render();
  });
  var s0 = page.getAttribute("data-state");
  if (s0 && STATES[s0]) { cur.state = s0; cur.now = STATES[s0].now; cur.proposed = STATES[s0].proposed == null ? null : STATES[s0].proposed; }
  render();
})();
