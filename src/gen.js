// Letter Web puzzle generator. Shared between the page and the Node test.
function makeRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildTrie(words) {
  const root = {};
  for (const w of words) {
    let n = root;
    for (const ch of w) n = n[ch] || (n[ch] = {});
    n.$ = w;
  }
  return root;
}

// `words` is ordered easiest to hardest, so a word's position is its difficulty (0 = easiest, 1 = hardest).
//   pool:   which words the board is built from
//   cap:    the hardest word that still counts as a puzzle word (harder ones traced are bonus words)
//   min/max: how many puzzle words a board may have
const LEVELS = {
  easy:   { pool: [0, 0.40],    cap: 0.45, 4: { maxLen: 7,  min: 7,  max: 12 }, 5: { maxLen: 8,  min: 12, max: 18 } },
  medium: { pool: [0.10, 0.80], cap: 0.85, 4: { maxLen: 9,  min: 9,  max: 15 }, 5: { maxLen: 10, min: 15, max: 24 } },
  hard:   { pool: [0.50, 1],    cap: 1,    4: { minLen: 6, maxLen: 10, min: 11, max: 18 }, 5: { minLen: 6, maxLen: 12, min: 18, max: 30 } },
};

// Keep -ing/-ed words from taking over a board.
const FORM_LIMIT = { 4: 2, 5: 3 };   // most -ing/-ed words the board may be built from
const FORM_SHARE = 0.25;             // most of a board's puzzle words that may end in -ing/-ed
const isForm = (w) => /(ing|ed)$/.test(w);

const trieCache = new Map();
function levelTrie(words, level) {
  const key = level + ":" + words.length;
  if (!trieCache.has(key)) trieCache.set(key, buildTrie(words.slice(0, Math.ceil(words.length * LEVELS[level].cap))));
  return trieCache.get(key);
}

function generatePuzzle(N, seed, words, level) {
  level = LEVELS[level] ? level : "medium";
  const L = LEVELS[level], cfg = L[N];
  const trie = levelTrie(words, level);
  const rand = makeRng(seed);
  const C = N * N;
  const adj = [];
  for (let i = 0; i < C; i++) {
    const r = Math.floor(i / N), c = i % N, list = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < N && cc >= 0 && cc < N) list.push(rr * N + cc);
    }
    adj.push(list);
  }
  const ek = (a, b) => (a < b ? a + "-" + b : b + "-" + a);
  const pool = words
    .slice(Math.floor(words.length * L.pool[0]), Math.ceil(words.length * L.pool[1]))
    .filter((w) => w.length >= (cfg.minLen || 4) && w.length <= cfg.maxLen);
  // Some -ing/-ed words are welcome (tracing one also reveals its root), up to FORM_LIMIT.
  const forms = pool.filter(isForm), plain = pool.filter((w) => !isForm(w));
  let formsPlaced = 0;
  const pick = () => {
    const src = formsPlaced < FORM_LIMIT[N] && rand() < 0.2 ? forms : plain;
    return src[Math.floor(rand() * src.length)];
  };

  function findPaths(word, letters, limit) {
    const out = [], path = [], used = new Uint8Array(C);
    function dfs(i, k) {
      if (out.length >= limit) return;
      if (letters[i] !== null && letters[i] !== word[k]) return;
      path.push(i); used[i] = 1;
      if (k === word.length - 1) out.push(path.slice());
      else {
        const nb = adj[i].slice().sort(() => rand() - 0.5);
        for (const j of nb) if (!used[j]) dfs(j, k + 1);
      }
      path.pop(); used[i] = 0;
    }
    const starts = [...Array(C).keys()].sort(() => rand() - 0.5);
    for (const s of starts) dfs(s, 0);
    return out;
  }

  // Every word in the list that can be traced along the edges (no cell twice).
  function enumerate(letters, edgeSet, placed) {
    const nb = Array.from({ length: C }, () => []);
    for (const e of edgeSet) {
      const [a, b] = e.split("-").map(Number);
      nb[a].push(b); nb[b].push(a);
    }
    const found = new Map();
    for (const p of placed) found.set(p.word, p.path);
    const used = new Uint8Array(C), path = [];
    function dfs(i, node) {
      const n = node[letters[i]];
      if (!n) return;
      path.push(i); used[i] = 1;
      if (n.$ && !found.has(n.$)) found.set(n.$, path.slice());
      for (const j of nb[i]) if (!used[j]) dfs(j, n);
      path.pop(); used[i] = 0;
    }
    for (let i = 0; i < C; i++) dfs(i, trie);
    return [...found].map(([word, path]) => ({ word, path }));
  }

  function tryPlace(letters, placed, usedWords, mode) {
    let best = null;
    for (let k = 0; k < 50; k++) {
      const w = pick();
      if (usedWords.has(w)) continue;
      const paths = findPaths(w, letters, 12);
      for (const p of paths) {
        let fresh = 0;
        for (const i of p) if (letters[i] === null) fresh++;
        const overlap = p.length - fresh;
        if (mode === "fill") {
          if (fresh === 0) continue;
          if (placed.length && overlap === 0) continue;
        } else if (fresh !== 0) continue;
        const score = fresh * 1.0 + overlap * 1.6 + rand() * 2;
        if (!best || score > best.score) best = { word: w, path: p, score };
      }
    }
    return best;
  }

  function apply(b, letters, edges, placed, usedWords) {
    b.path.forEach((i, k) => (letters[i] = b.word[k]));
    for (let k = 1; k < b.path.length; k++) edges.add(ek(b.path[k - 1], b.path[k]));
    placed.push({ word: b.word, path: b.path });
    usedWords.add(b.word);
    if (isForm(b.word)) formsPlaced++;
  }

  for (let attempt = 0; attempt < 60; attempt++) {
    const letters = Array(C).fill(null), edges = new Set(), placed = [], usedWords = new Set();
    formsPlaced = 0;
    let steps = 0;
    while (letters.includes(null) && steps++ < 60) {
      const b = tryPlace(letters, placed, usedWords, "fill");
      if (b) apply(b, letters, edges, placed, usedWords);
    }
    if (letters.includes(null)) continue;
    let targets = enumerate(letters, edges, placed);
    let extra = 0;
    while (targets.length < cfg.min && extra++ < 12) {
      const b = tryPlace(letters, placed, usedWords, "dense");
      if (!b) break;
      apply(b, letters, edges, placed, usedWords);
      targets = enumerate(letters, edges, placed);
    }
    if (targets.length < cfg.min || targets.length > cfg.max) continue;
    if (targets.filter((t) => isForm(t.word)).length > Math.max(2, Math.floor(targets.length * FORM_SHARE))) continue;
    return { size: N, seed, level, letters, words: targets };
  }
  return null;
}

if (typeof module !== "undefined") module.exports = { generatePuzzle, buildTrie, makeRng, LEVELS };
