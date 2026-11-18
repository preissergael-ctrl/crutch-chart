// Hash routes <-> view state. Pure: no DOM, safe to test in Node.
//   #/find  #/mood/<id>  #/method/<id>  #/chord/<symbol>  #/learn  #/learn/<id>  #/saved  #/about
//   #/prog?t=<tonic>&m=<mode>&r=<romans,comma>&id=<progressionId>&src=<source>
// Anything else gives { view: 'find', params: {} }.

const HOME = () => ({ view: 'find', params: {} });
const PLAIN = ['find', 'saved', 'about'];
const WITH_ID = ['mood', 'method'];
const PROG_ORDER = ['t', 'm', 'r', 'id', 'src'];

// Keep commas and colons readable in the hash; everything else is escaped ('#', '+', '/', spaces).
const enc = (s) => encodeURIComponent(String(s)).replace(/%2C/gi, ',').replace(/%3A/gi, ':');

function dec(s) {
  try { return decodeURIComponent(s); } catch { return null; }
}

function parseQuery(q) {
  const params = {};
  for (const part of q.split('&')) {
    if (!part) continue;
    const eq = part.indexOf('=');
    const key = dec(eq < 0 ? part : part.slice(0, eq));
    const raw = eq < 0 ? '' : part.slice(eq + 1);
    if (!key) continue;
    if (key === 'r') {
      const romans = raw.split(',').map(dec);
      if (romans.some((x) => x === null)) continue;
      params.r = romans.filter((x) => x !== '');
    } else {
      const val = dec(raw);
      if (val !== null) params[key] = val;
    }
  }
  return params;
}

export function parseRoute(hash) {
  const h = String(hash ?? '').replace(/^#\/?/, '');
  const qi = h.indexOf('?');
  const path = qi < 0 ? h : h.slice(0, qi);
  const query = qi < 0 ? '' : h.slice(qi + 1);
  const [view, ...rest] = path.split('/');
  const arg = rest.length ? dec(rest.join('/')) : '';

  if (PLAIN.includes(view) && !rest.length) return { view, params: {} };
  if (WITH_ID.includes(view)) return arg ? { view, params: { id: arg } } : HOME();
  if (view === 'chord') return arg ? { view, params: { symbol: arg } } : HOME();
  if (view === 'learn') return { view, params: arg ? { id: arg } : {} };
  if (view === 'prog') return { view, params: parseQuery(query) };
  return HOME();
}

export function routeHash(view, params = {}) {
  if (WITH_ID.includes(view) || (view === 'learn' && params.id)) return `#/${view}/${enc(params.id)}`;
  if (view === 'chord') return `#/chord/${encodeURIComponent(params.symbol)}`;
  if (view === 'prog') {
    const keys = [...PROG_ORDER, ...Object.keys(params).filter((k) => !PROG_ORDER.includes(k))];
    const parts = [];
    for (const k of keys) {
      const v = params[k];
      if (v === undefined || v === null) continue;
      const val = k === 'r' ? (Array.isArray(v) ? v : String(v).split(',')).map(enc).join(',') : enc(v);
      parts.push(`${enc(k)}=${val}`);
    }
    return parts.length ? `#/prog?${parts.join('&')}` : '#/prog';
  }
  if (view === 'learn' || PLAIN.includes(view)) return `#/${view}`;
  return '#/find';
}
