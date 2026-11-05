const STORAGE_KEY = 'quran-oyen.learning-plans.v1';
const VERSION = 1;
const own = (object,key) => Object.prototype.hasOwnProperty.call(object,key);

function safeStorage(candidateProvided,candidate) {
  try {
    const value = candidateProvided ? candidate : globalThis.localStorage;
    return value && typeof value.getItem === 'function' && typeof value.setItem === 'function' && typeof value.removeItem === 'function' ? value : null;
  } catch { return null; }
}
function cloneState(state) {
  return state ? {startedAt:state.startedAt,completedAt:state.completedAt,completed:[...state.completed],notes:{...state.notes},lastDay:state.lastDay} : null;
}
const validDateString = value => typeof value === 'string' && value.length > 0;

export function createLearningStore(plans,{storage,now = () => new Date().toISOString()} = {}) {
  const catalog = new Map(), backing = new Map();
  if (Array.isArray(plans)) for (const plan of plans) {
    if (!plan || (typeof plan.id !== 'string' && typeof plan.id !== 'number') || !Array.isArray(plan.lessons)) continue;
    const id = String(plan.id);
    if (!catalog.has(id)) catalog.set(id,{id,total:plan.lessons.length});
  }
  let persistent = true;
  const store = safeStorage(arguments.length > 1 && arguments[1] && own(arguments[1],'storage'),storage);
  function read() {
    if (!store) { persistent = false; return false; }
    let raw;
    try { raw = store.getItem(STORAGE_KEY); } catch { persistent = false; return false; }
    const incoming = new Map();
    if (raw != null && raw !== '') {
      let parsed;
      try { parsed = JSON.parse(raw); } catch { return false; }
      if (!parsed || parsed.version !== VERSION || !parsed.plans || typeof parsed.plans !== 'object' || Array.isArray(parsed.plans)) return false;
      for (const [id,value] of Object.entries(parsed.plans)) {
        const plan = catalog.get(id);
        if (!plan || !value || typeof value !== 'object' || Array.isArray(value) || !validDateString(value.startedAt)) continue;
        const completed = Array.isArray(value.completed) ? [...new Set(value.completed.filter(day => Number.isInteger(day) && day >= 1 && day <= plan.total))].sort((a,b) => a-b) : [];
        const notes = {};
        if (value.notes && typeof value.notes === 'object' && !Array.isArray(value.notes)) for (const [day,text] of Object.entries(value.notes)) {
          const n = Number(day);
          if (Number.isInteger(n) && n >= 1 && n <= plan.total && typeof text === 'string') notes[String(n)] = text.slice(0,2000);
        }
        const lastDay = Number.isInteger(value.lastDay) && value.lastDay >= 1 && value.lastDay <= plan.total ? value.lastDay : (completed.at(-1) || 1);
        incoming.set(id,{startedAt:value.startedAt,completedAt:validDateString(value.completedAt) ? value.completedAt : null,completed,notes,lastDay});
      }
    }
    backing.clear();
    for (const [id,state] of incoming) backing.set(id,state);
    return true;
  }
  function write() {
    if (!store) { persistent = false; return false; }
    const plansOut = Object.create(null);
    for (const [id,state] of backing) plansOut[id] = state;
    try { store.setItem(STORAGE_KEY,JSON.stringify({version:VERSION,plans:plansOut})); return true; }
    catch { persistent = false; return false; }
  }
  // Refresh before applying the current field-level operation. This prevents a
  // stale tab from writing its old whole-catalog snapshot over newer progress.
  // When storage fails, retain the session's in-memory data instead of clearing it.
  function syncLatest() { if (persistent) read(); }
  function timestamp() {
    try { const value = now(); return typeof value === 'string' ? value : new Date(value).toISOString(); }
    catch { return new Date().toISOString(); }
  }
  const planFor = id => catalog.get(String(id));
  const dayFor = (plan,day) => Number.isInteger(day) && day >= 1 && day <= plan.total;
  function ensure(id) {
    const key = String(id);
    if (!catalog.has(key)) return null;
    let state = backing.get(key);
    if (!state) { state = {startedAt:timestamp(),completedAt:null,completed:[],notes:{},lastDay:1}; backing.set(key,state); }
    return state;
  }
  read();
  return {
    get persistent() { return persistent; },
    get(id) { return cloneState(backing.get(String(id)) || null); },
    enroll(id) { if (!planFor(id)) return null; syncLatest(); const state = ensure(id); write(); return cloneState(state); },
    visit(id,day) { const plan = planFor(id); if (!plan || !dayFor(plan,day)) return null; syncLatest(); const state = backing.get(String(id)); if (!state) return null; state.lastDay = day; write(); return cloneState(state); },
    complete(id,day) {
      const plan = planFor(id); if (!plan || !dayFor(plan,day)) return null;
      syncLatest(); const state = ensure(id);
      if (!state.completed.includes(day)) state.completed.push(day);
      state.completed.sort((a,b) => a-b);
      if (state.completed.length === plan.total && plan.total > 0 && !state.completedAt) state.completedAt = timestamp();
      write(); return cloneState(state);
    },
    uncomplete(id,day) {
      const plan = planFor(id); if (!plan || !dayFor(plan,day)) return null;
      syncLatest(); const state = backing.get(String(id)); if (!state) return null;
      state.completed = state.completed.filter(value => value !== day); state.completedAt = null; write(); return cloneState(state);
    },
    saveNote(id,day,text) {
      const plan = planFor(id); if (!plan || !dayFor(plan,day) || typeof text !== 'string') return null;
      syncLatest(); const state = ensure(id); state.notes[String(day)] = text.trim().slice(0,2000); write(); return cloneState(state);
    },
    reset(id) { const key = String(id); if (!catalog.has(key)) return false; syncLatest(); const existed = backing.delete(key); write(); return existed; },
    reload() { return read(); },
    progress(id) {
      const plan = planFor(id); if (!plan) return null;
      const state = backing.get(String(id)), done = state ? state.completed.length : 0, total = plan.total, finished = total > 0 && done === total;
      return {started:!!state,done,total,percent:total ? Math.round(done*100/total) : 0,finished,nextDay:finished ? total : (state ? (Array.from({length:total},(_,i) => i+1).find(day => !state.completed.includes(day)) || total) : (total ? 1 : 0)),lastDay:state ? state.lastDay : 0};
    },
  };
}
