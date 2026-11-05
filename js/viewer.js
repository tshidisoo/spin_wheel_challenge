import { SETTINGS } from "./config.js";
import { createStore, isDemo } from "./store.js";
import { Wheel, finalRotation, spinProgress } from "./wheel.js";
import { burst } from "./confetti.js";

const $ = (id) => document.getElementById(id);
const REVEAL_MS = 1200; // pause on the winner's name before the winner card appears
const IDLE_DEG_PER_SEC = 24; // the box turns slowly while waiting
const BOX_TURNS_PER_WHEEL_TURN = 2; // and twice as fast as the wheel during a spin

document.title = SETTINGS.title;
$("title").textContent = SETTINGS.title;
$("subtitle").textContent = SETTINGS.subtitle;
$("demoBanner").hidden = !isDemo;

const wheel = new Wheel($("wheel"));
const box = $("box");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
let entries = [];
let state = null;
let dismissedSpin = null;
let celebratedSpin = null;

const store = await createStore();
store.onEntries((list) => { entries = list; });
store.onState((s) => { state = s; });

$("closeResult").addEventListener("click", () => {
  dismissedSpin = state?.spinId ?? null;
  $("result").hidden = true;
});

function setText(id, text) {
  const el = $(id);
  if (el.textContent !== text) el.textContent = text;
}

// Box angle comes from the shared clock, so every phone shows it at the same turn.
const idleAngle = (t) => (reduceMotion ? 0 : (t / 1000) * IDLE_DEG_PER_SEC);
function boxAngle(d, now) {
  if (!d) return idleAngle(now);
  if (now < d.startAt) return idleAngle(now);
  const a0 = idleAngle(d.startAt);
  const target = Math.ceil((a0 + d.turns * 360 * BOX_TURNS_PER_WHEEL_TURN) / 360) * 360; // ends facing front
  return a0 + (target - a0) * spinProgress(d, now);
}
function turnBox(deg) {
  box.style.transform = `rotateX(-16deg) rotateY(${(deg % 360).toFixed(2)}deg)`;
}

function frame() {
  const now = store.now();

  if (!state || state.status !== "spin" || !state.names?.length) {
    // Waiting screen
    const names = entries.map((e) => e.name);
    wheel.setNames(names);
    wheel.draw(0);
    turnBox(boxAngle(null, now));
    $("result").hidden = true;
    setText("ticker", "");
    setText("boxCaption", "What's in the box?");
    setText("status", "Next draw: " + SETTINGS.nextDrawText);
    setText("count", names.length === 1 ? "1 name in the draw" : `${names.length} names in the draw`);
    return requestAnimationFrame(frame);
  }

  const d = state;
  const end = d.startAt + d.duration;
  wheel.setNames(d.names);
  setText("count", `${d.names.length} names in this draw`);
  const winnerName = d.names[d.winner];
  turnBox(boxAngle(d, now));

  if (now < d.startAt) {
    wheel.draw(0);
    $("result").hidden = true;
    setText("ticker", "");
    setText("boxCaption", "What's in the box?");
    setText("status", `The draw starts in ${Math.ceil((d.startAt - now) / 1000)}…`);
  } else if (now < end) {
    const rot = finalRotation(d) * spinProgress(d, now);
    wheel.draw(rot);
    setText("ticker", d.names[wheel.indexAt(rot)] || "");
    setText("status", "Spinning…");
  } else {
    wheel.draw(finalRotation(d));
    setText("ticker", winnerName);
    const since = now - end;
    setText("status", `This week's winner: ${winnerName}`);
    if (since >= REVEAL_MS) {
      if (dismissedSpin !== d.spinId) {
        setText("winnerName", winnerName);
        setText("prizeText", d.prize);
        $("result").hidden = false;
      }
      if (celebratedSpin !== d.spinId) {
        celebratedSpin = d.spinId;
        if (since < REVEAL_MS + 8000) burst($("confetti"));
      }
    }
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
