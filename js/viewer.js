import { SETTINGS } from "./config.js";
import { createStore, isDemo } from "./store.js";
import { Wheel, finalRotation, spinProgress } from "./wheel.js";
import { burst } from "./confetti.js";

const $ = (id) => document.getElementById(id);
const REVEAL_MS = 1200; // pause on the winner's name before the winner card appears

document.title = SETTINGS.title;
$("title").textContent = SETTINGS.title;
$("subtitle").textContent = SETTINGS.subtitle;
$("demoBanner").hidden = !isDemo;

const wheel = new Wheel($("wheel"));
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

function frame() {
  const now = store.now();

  if (!state || state.status !== "spin" || !state.names?.length) {
    // Waiting screen
    const names = entries.map((e) => e.name);
    wheel.setNames(names);
    wheel.draw(0);
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
