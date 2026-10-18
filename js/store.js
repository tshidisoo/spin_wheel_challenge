// One small data layer used by both pages.
// Firebase Realtime Database when configured, otherwise a local demo store.
import { FIREBASE_CONFIG } from "./config.js";

const FB = "https://www.gstatic.com/firebasejs/10.12.2/";
export const isDemo = !FIREBASE_CONFIG.apiKey;

export function createStore() {
  return isDemo ? demoStore() : firebaseStore();
}

async function firebaseStore() {
  const [{ initializeApp }, dbm, authm] = await Promise.all([
    import(FB + "firebase-app.js"),
    import(FB + "firebase-database.js"),
    import(FB + "firebase-auth.js"),
  ]);
  const { getDatabase, ref, onValue, set, push, remove, update, serverTimestamp } = dbm;
  const app = initializeApp(FIREBASE_CONFIG);
  const db = getDatabase(app);
  const auth = authm.getAuth(app);

  // Server clock offset keeps every phone on the same moment of the spin.
  let offset = 0;
  onValue(ref(db, ".info/serverTimeOffset"), (s) => (offset = s.val() || 0));

  const list = (snap) => {
    const out = [];
    snap.forEach((c) => { out.push({ id: c.key, ...c.val() }); });
    return out;
  };

  return {
    now: () => Date.now() + offset,
    onEntries: (cb) => onValue(ref(db, "entries"), (s) => cb(list(s))),
    onState: (cb) => onValue(ref(db, "state"), (s) => cb(s.val())),
    onWinners: (cb) => onValue(ref(db, "winners"), (s) => cb(list(s).reverse())),
    onNextPrize: (cb) => onValue(ref(db, "admin/nextPrize"), (s) => cb(s.val() || "")),
    onAuth: (cb) => authm.onAuthStateChanged(auth, cb),
    isAdmin: (uid, cb) => onValue(ref(db, "admins/" + uid), (s) => cb(s.val() === true), () => cb(false)),
    signIn: (email, pw) => authm.signInWithEmailAndPassword(auth, email, pw),
    signOut: () => authm.signOut(auth),
    addNames: (names) => {
      const updates = {};
      for (const name of names) {
        updates["entries/" + push(ref(db, "entries")).key] = { name, addedAt: serverTimestamp() };
      }
      return update(ref(db), updates);
    },
    removeName: (id) => remove(ref(db, "entries/" + id)),
    clearNames: () => remove(ref(db, "entries")),
    setNextPrize: (p) => set(ref(db, "admin/nextPrize"), p),
    setState: (st) => set(ref(db, "state"), st),
    addWinner: (w) => push(ref(db, "winners"), w),
  };
}

function demoStore() {
  const KEY = "spinbox-demo";
  const fresh = () => ({ entries: [], state: null, winners: [], nextPrize: "" });
  const load = () => {
    try { return { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) || "{}") }; }
    catch { return fresh(); }
  };
  let data = load();
  let nextId = Date.now();
  const subs = new Set();
  const emit = () => subs.forEach((f) => f());
  const save = async () => {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
    emit();
  };
  addEventListener("storage", (e) => { if (e.key === KEY) { data = load(); emit(); } });
  const watch = (get, cb) => { const f = () => cb(get()); subs.add(f); f(); return () => subs.delete(f); };

  return Promise.resolve({
    now: () => Date.now(),
    onEntries: (cb) => watch(() => data.entries, cb),
    onState: (cb) => watch(() => data.state, cb),
    onWinners: (cb) => watch(() => [...data.winners].reverse(), cb),
    onNextPrize: (cb) => watch(() => data.nextPrize, cb),
    onAuth: (cb) => cb({ uid: "demo", email: "demo" }),
    isAdmin: (uid, cb) => cb(true),
    signIn: async () => {},
    signOut: async () => {},
    addNames: (names) => {
      for (const name of names) data.entries.push({ id: String(nextId++), name, addedAt: Date.now() });
      return save();
    },
    removeName: (id) => { data.entries = data.entries.filter((e) => e.id !== id); return save(); },
    clearNames: () => { data.entries = []; return save(); },
    setNextPrize: (p) => { data.nextPrize = p; return save(); },
    setState: (st) => { data.state = st; return save(); },
    addWinner: (w) => { data.winners.push({ id: String(nextId++), ...w }); return save(); },
  });
}
