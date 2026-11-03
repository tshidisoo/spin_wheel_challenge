import { SETTINGS } from "./config.js";
import { createStore, isDemo } from "./store.js";

const $ = (id) => document.getElementById(id);
$("demoBanner").hidden = !isDemo;

const store = await createStore();
let entries = [];
let state = null;
let subscribed = false;

function show(panel) {
  for (const id of ["loginPanel", "notAdminPanel", "adminPanels"]) $(id).hidden = id !== panel;
}

// Fair random whole number below n.
function randomInt(n) {
  const max = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf); while (buf[0] >= max);
  return buf[0] % n;
}

store.onAuth((user) => {
  if (!user) return show("loginPanel");
  store.isAdmin(user.uid, (ok) => {
    if (!ok) { $("uid").textContent = user.uid; return show("notAdminPanel"); }
    show("adminPanels");
    if (!subscribed) { subscribed = true; subscribe(); }
  });
});

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("loginError").textContent = "";
  try { await store.signIn($("email").value.trim(), $("password").value); }
  catch { $("loginError").textContent = "That email and password didn't work."; }
});
document.querySelectorAll("[data-signout]").forEach((b) => b.addEventListener("click", () => store.signOut()));

function subscribe() {
  store.onEntries((list) => { entries = list; renderNames(); refreshDraw(); });
  store.onState((s) => { state = s; refreshDraw(); });
  store.onWinners(renderWinners);
  store.onRequests(renderRequests);
  let lastSettings;
  store.onSpinSettings((v) => {
    const key = JSON.stringify(v ?? null);
    if (key === lastSettings) return; // only refill the boxes when the saved values actually change
    lastSettings = key;
    if (document.activeElement !== $("spinSeconds")) $("spinSeconds").value = v?.seconds ?? SETTINGS.spinSeconds;
    if (document.activeElement !== $("spinTurns")) $("spinTurns").value = v?.turns ?? SETTINGS.spinTurns;
  });
  store.onNextPrize((p) => { if (document.activeElement !== $("prize")) $("prize").value = p; refreshDraw(); });
}

function renderNames() {
  $("nameCount").textContent = entries.length;
  const ul = $("nameList");
  ul.replaceChildren(...entries.map((e) => {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = e.name;
    const btn = document.createElement("button");
    btn.className = "remove";
    btn.textContent = "Remove";
    btn.addEventListener("click", () => store.removeName(e.id));
    li.append(span, btn);
    return li;
  }));
  $("clearBtn").hidden = entries.length === 0;
}

function renderRequests(list) {
  $("requestCount").textContent = list.length;
  const ul = $("requestList");
  if (!list.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No sign-ups waiting.";
    return ul.replaceChildren(li);
  }
  ul.replaceChildren(...list.map((r) => {
    const li = document.createElement("li");
    li.className = "request";
    const line = (text, cls) => {
      const p = document.createElement("p");
      if (cls) p.className = cls;
      p.textContent = text;
      return p;
    };
    const name = document.createElement("strong");
    name.textContent = r.name;
    const phone = document.createElement("p");
    const digits = (r.phone || "").replace(/\D/g, "");
    const wa = document.createElement("a");
    wa.href = "https://wa.me/" + digits;
    wa.target = "_blank";
    wa.rel = "noopener";
    wa.textContent = r.phone;
    phone.append("WhatsApp: ", wa);
    li.append(name, line(`Pledge: ${r.pledge} · Paid by ${r.method}${r.reference ? ` · Ref: ${r.reference}` : ""}`), phone);
    if (r.note) li.append(line(`"${r.note}"`, "note"));
    if (r.submittedAt) li.append(line("Sent " + new Date(r.submittedAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }), "meta"));

    const row = document.createElement("div");
    row.className = "row";
    const approve = document.createElement("button");
    approve.className = "btn small";
    approve.textContent = "Approve and add to wheel";
    approve.addEventListener("click", async () => {
      approve.disabled = true;
      try { await store.approveRequest(r); } catch (err) { alert("Couldn't approve: " + err.message); approve.disabled = false; }
    });
    const reject = document.createElement("button");
    reject.className = "btn secondary small";
    reject.textContent = "Reject";
    reject.addEventListener("click", () => {
      if (confirm(`Reject ${r.name}'s sign-up? It will be deleted.`)) store.rejectRequest(r.id);
    });
    row.append(approve, reject);
    li.append(row);
    return li;
  }));
}

function renderWinners(list) {
  const ul = $("winnerList");
  if (!list.length) {
    const li = document.createElement("li");
    li.textContent = "No draws yet.";
    return ul.replaceChildren(li);
  }
  ul.replaceChildren(...list.map((w) => {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = `${w.name}: ${w.prize}`;
    const when = document.createElement("small");
    when.textContent = new Date(w.at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    li.append(span, when);
    return li;
  }));
}

function refreshDraw() {
  const prize = $("prize").value.trim();
  const spinning = state?.status === "spin" && store.now() < state.startAt + state.duration + 3000;
  $("spinBtn").disabled = !entries.length || !prize || spinning;
  $("resetBtn").disabled = !state || state.status !== "spin";
  let msg = "";
  if (spinning) msg = "Spinning on everyone's screen now…";
  else if (state?.status === "spin") msg = `Last winner: ${state.names[state.winner]} (${state.prize}). Viewers can still see the result.`;
  else if (!entries.length) msg = "Add names before spinning.";
  else if (!prize) msg = "Type this week's prize to enable the spin.";
  else msg = "Ready. Everyone with the page open will see the spin.";
  $("drawStatus").textContent = msg;
}
setInterval(refreshDraw, 1000);

let prizeTimer;
$("prize").addEventListener("input", () => {
  refreshDraw();
  clearTimeout(prizeTimer);
  prizeTimer = setTimeout(() => store.setNextPrize($("prize").value.trim()), 500);
});

// Whole number within [min, max], or the fallback when the box is empty or invalid.
function clampInput(el, fallback) {
  const n = Math.round(Number(el.value));
  if (!el.value || !Number.isFinite(n)) return fallback;
  return Math.min(Number(el.max), Math.max(Number(el.min), n));
}
const spinSeconds = () => clampInput($("spinSeconds"), SETTINGS.spinSeconds);
const spinTurns = () => clampInput($("spinTurns"), SETTINGS.spinTurns);

let settingsTimer;
for (const id of ["spinSeconds", "spinTurns"]) {
  $(id).addEventListener("input", () => {
    clearTimeout(settingsTimer);
    settingsTimer = setTimeout(() => store.setSpinSettings({ seconds: spinSeconds(), turns: spinTurns() }), 500);
  });
  $(id).addEventListener("change", () => { $(id).value = id === "spinSeconds" ? spinSeconds() : spinTurns(); });
}

$("spinBtn").addEventListener("click", async () => {
  const prize = $("prize").value.trim();
  const names = entries.map((e) => e.name);
  if (!names.length || !prize) return;
  const seconds = spinSeconds();
  const turns = spinTurns();
  if (!confirm(`Spin now for "${prize}" with ${names.length} names?\n${turns} turns over ${seconds} seconds.`)) return;
  $("spinBtn").disabled = true;
  const winner = randomInt(names.length);
  const startAt = store.now() + SETTINGS.countdownSeconds * 1000;
  const draw = {
    status: "spin",
    spinId: startAt,
    names,
    winner,
    jitter: (randomInt(1000) / 1000 - 0.5) * 0.7, // where inside the winner's slice the pointer stops
    turns,
    prize,
    startAt,
    duration: seconds * 1000,
  };
  try {
    await store.setState(draw);
    await store.addWinner({ name: names[winner], prize, at: startAt });
    clearTimeout(prizeTimer);
    await store.setNextPrize("");
    $("prize").value = "";
  } catch (err) {
    alert("The spin couldn't be saved: " + err.message);
  }
  refreshDraw();
});

$("resetBtn").addEventListener("click", () => store.setState({ status: "idle" }));

$("addForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const names = $("newNames").value.split("\n").map((n) => n.trim()).filter(Boolean);
  if (!names.length) return;
  await store.addNames(names);
  $("newNames").value = "";
});

$("clearBtn").addEventListener("click", () => {
  if (confirm(`Remove all ${entries.length} names from the wheel?`)) store.clearNames();
});
