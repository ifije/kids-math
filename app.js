/* Kids Math — all app logic. No dependencies, no build step.
   Data lives in data/*.json. See data/README.md for the format. */
(() => {
  'use strict';

  const SUBJECT_FILES = ['data/multiplication.json', 'data/algebra.json', 'data/assessment.json', 'data/advanced.json'];
  const STORE_KEY = 'kidsmath.v1';
  const MINUS = '\u2212';

  // ---------------------------------------------------------------- storage
  function loadStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveStore() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* private mode etc. */ }
  }
  const store = loadStore();
  store.sessions = store.sessions || [];   // {subject, levelId, levelName, date, correct, total, seconds}
  store.facts = store.facts || {};         // key -> {seen, wrong}

  // ---------------------------------------------------------------- helpers
  const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  function rndNonZero(lo, hi) {
    if (lo === 0 && hi === 0) return 1;
    let v; do { v = rnd(lo, hi); } while (v === 0); return v;
  }
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function weightedPick(items, weights) {
    let total = 0; for (const w of weights) total += w;
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtNum = n => (n < 0 ? MINUS + Math.abs(n) : String(n));
  const fmtTime = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const factKey = (a, b) => `${Math.min(a, b)}x${Math.max(a, b)}`;

  // "ax" with 1x -> x, -1x -> -x
  function term(coef, v = 'x') {
    if (coef === 1) return v;
    if (coef === -1) return MINUS + v;
    return fmtNum(coef) + v;
  }
  // "ax + b" / "ax - b" / "ax" (b = 0)
  function linear(a, b, v = 'x') {
    if (b === 0) return term(a, v);
    return `${term(a, v)} ${b < 0 ? MINUS : '+'} ${Math.abs(b)}`;
  }

  // ---------------------------------------------------------------- generators
  // Each returns {q, a, key, hint?, explain?}. `key` groups stats (e.g. "7x8").
  const GEN = {
    multiplication(spec) {
      const tables = spec.tables || [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      const [mlo, mhi] = spec.multipliers || [1, 12];
      const pairs = [];
      for (const t of tables) for (let m = mlo; m <= mhi; m++) pairs.push([t, m]);
      let pair;
      if (spec.adaptive) {
        const weights = pairs.map(([t, m]) => {
          const f = store.facts[factKey(t, m)];
          if (!f || !f.seen) return 2;                 // unseen: slightly favoured
          return 1 + 5 * (f.wrong / f.seen);           // 100% wrong -> 6x weight
        });
        pair = weightedPick(pairs, weights);
      } else {
        pair = pick(pairs);
      }
      let [a, b] = pair;
      if (Math.random() < 0.5) [a, b] = [b, a];
      const key = factKey(a, b);
      if (spec.format === 'missing-factor') {
        return { q: `${a} × ? = ${a * b}`, a: b, key, hint: `What times ${a} gives ${a * b}?`, explain: `${a} × ${b} = ${a * b}` };
      }
      return { q: `${a} × ${b}`, a: a * b, key };
    },

    evaluate(spec) {
      const a = rndNonZero(...(spec.coefficient || [-6, 9]));
      const b = rnd(...(spec.constant || [-12, 12]));
      const v = rnd(...(spec.value || [-6, 9]));
      return {
        q: `Evaluate  ${linear(a, b)}\nwhen x = ${fmtNum(v)}`,
        a: a * v + b, key: 'evaluate',
        hint: `Replace x with ${fmtNum(v)}, then multiply before you add.`,
        explain: `${fmtNum(a)} × ${v < 0 ? '(' + fmtNum(v) + ')' : v} ${b < 0 ? MINUS : '+'} ${Math.abs(b)} = ${fmtNum(a * v + b)}`,
      };
    },

    'one-step'(spec) {
      const [lo, hi] = spec.range || [1, 12];
      const neg = !!spec.negatives;
      const sgn = () => (neg && Math.random() < 0.5 ? -1 : 1);
      const op = pick(['add', 'sub', 'mul', 'div']);
      let x, b, q, hint;
      if (op === 'add') {
        x = rnd(lo, hi) * sgn(); b = rnd(lo, hi) * sgn();
        q = `${linear(1, b)} = ${fmtNum(x + b)}`;
        hint = `${b < 0 ? 'Add' : 'Subtract'} ${Math.abs(b)} ${b < 0 ? 'to' : 'from'} both sides.`;
      } else if (op === 'sub') {
        x = rnd(lo, hi) * sgn(); b = rnd(lo, hi);
        q = `x ${MINUS} ${b} = ${fmtNum(x - b)}`;
        hint = `Add ${b} to both sides.`;
      } else if (op === 'mul') {
        x = rnd(lo, hi) * sgn(); b = rndNonZero(2, hi) * sgn();
        q = `${term(b)} = ${fmtNum(b * x)}`;
        hint = `Divide both sides by ${fmtNum(b)}.`;
      } else {
        b = rnd(2, Math.max(2, Math.min(hi, 9))); x = rnd(lo, hi) * sgn() * b;
        q = `x/${b} = ${fmtNum(x / b)}`;
        hint = `Multiply both sides by ${b}.`;
      }
      return { q: 'Solve for x:\n' + q, a: x, key: 'one-step', hint, explain: `x = ${fmtNum(x)}` };
    },

    'two-step'(spec) {
      const a = rndNonZero(...(spec.coefficient || [2, 9]));
      const b = rndNonZero(...(spec.constant || [1, 15])) * (Math.random() < 0.5 ? -1 : 1);
      const x = rnd(...(spec.solution || [-9, 12]));
      const c = a * x + b;
      return {
        q: `Solve for x:\n${linear(a, b)} = ${fmtNum(c)}`, a: x, key: 'two-step',
        hint: `First ${b < 0 ? 'add' : 'subtract'} ${Math.abs(b)} ${b < 0 ? 'to' : 'from'} both sides, then divide by ${fmtNum(a)}.`,
        explain: `${term(a)} = ${fmtNum(c - b)}, so x = ${fmtNum(x)}`,
      };
    },

    distributive(spec) {
      const a = rndNonZero(...(spec.coefficient || [2, 6]));
      const b = rndNonZero(...(spec.constant || [-8, 8]));
      const x = rnd(...(spec.solution || [-8, 10]));
      const c = a * (x + b);
      return {
        q: `Solve for x:\n${fmtNum(a)}(${linear(1, b)}) = ${fmtNum(c)}`, a: x, key: 'distributive',
        hint: `Divide both sides by ${fmtNum(a)} first, or multiply out the bracket.`,
        explain: `${linear(1, b)} = ${fmtNum(c / a)}, so x = ${fmtNum(x)}`,
      };
    },

    'both-sides'(spec) {
      const [clo, chi] = spec.coefficient || [2, 9];
      const a = rndNonZero(clo, chi);
      let c; do { c = rndNonZero(clo, chi); } while (c === a);
      const b = rnd(...(spec.constant || [-12, 12]));
      const x = rnd(...(spec.solution || [-8, 10]));
      const d = a * x + b - c * x;
      return {
        q: `Solve for x:\n${linear(a, b)} = ${linear(c, d)}`, a: x, key: 'both-sides',
        hint: `Move the x terms to one side: ${term(a - c)} = ${fmtNum(d - b)}.`,
        explain: `${term(a - c)} = ${fmtNum(d - b)}, so x = ${fmtNum(x)}`,
      };
    },

    mix(spec) {
      const sub = pick(spec.generators || []);
      if (!sub) throw new Error('mix generator needs a "generators" list');
      return generate(sub);
    },
  };

  function generate(spec) {
    const fn = GEN[spec.type];
    if (!fn) throw new Error(`Unknown generator type "${spec.type}"`);
    return fn(spec);
  }

  // ---------------------------------------------------------------- answers
  function normalize(s) {
    return String(s).toLowerCase().replace(/\s+/g, '').replace(/\u2212/g, '-').replace(/,/g, '')
      .replace(/^[a-z]=/, '').replace(/^\+/, '');
  }
  function toNumber(s) {
    if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
    const m = s.match(/^(-?\d+)\/(-?\d+)$/);
    if (m && Number(m[2]) !== 0) return Number(m[1]) / Number(m[2]);
    return null;
  }
  function isCorrect(given, q) {
    const g = normalize(given);
    if (!g) return false;
    const answers = [q.a].concat(q.accept || []).map(normalize);
    if (answers.includes(g)) return true;
    const gn = toNumber(g);
    if (gn === null) return false;
    return answers.some(a => { const an = toNumber(a); return an !== null && Math.abs(an - gn) < 1e-9; });
  }

  // ---------------------------------------------------------------- sessions
  function buildSession(level) {
    const count = level.count || 10;
    const fixed = shuffle((level.questions || []).map(q => Object.assign({ key: 'fixed:' + level.id }, q)));
    if (!level.generator) return fixed.slice(0, count);

    const nFixed = Math.min(fixed.length, Math.floor(count / 2));
    const out = fixed.slice(0, nFixed);
    const seen = new Set(out.map(q => q.q));
    let guard = 0;
    while (out.length < count && guard < count * 40) {
      guard++;
      const q = generate(level.generator);
      if (seen.has(q.q) && guard < count * 20) continue;  // avoid repeats while we can
      seen.add(q.q); out.push(q);
    }
    return shuffle(out);
  }

  function recordFact(key, wrong) {
    if (!key || key.startsWith('fixed:')) return;
    const f = store.facts[key] || (store.facts[key] = { seen: 0, wrong: 0 });
    f.seen++; if (wrong) f.wrong++;
  }

  function lastSessionFor(levelId) {
    for (let i = store.sessions.length - 1; i >= 0; i--) if (store.sessions[i].levelId === levelId) return store.sessions[i];
    return null;
  }
  function bestTimeFor(levelId, total) {
    let best = null;
    for (const s of store.sessions) if (s.levelId === levelId && s.total === total && s.correct === s.total) best = best === null ? s.seconds : Math.min(best, s.seconds);
    return best;
  }

  // ---------------------------------------------------------------- state + render
  const app = document.getElementById('app');
  let subjects = [];
  const state = { screen: 'home', subject: null, level: null, quiz: null };
  let timerId = null;

  function go(screen, patch = {}) {
    Object.assign(state, patch, { screen });
    window.scrollTo(0, 0);
    render();
  }

  function render() {
    if (timerId && state.screen !== 'quiz') { clearInterval(timerId); timerId = null; }
    const views = { home: viewHome, levels: viewLevels, quiz: viewQuiz, results: viewResults, progress: viewProgress };
    app.innerHTML = views[state.screen]();
    bind();
  }

  // Delegated click handling via data-action attributes.
  function bind() {
    app.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', ev => { ev.preventDefault(); handle(el.dataset); });
    });
  }

  function handle(d) {
    switch (d.action) {
      case 'home': go('home'); break;
      case 'subject': go('levels', { subject: subjects[Number(d.i)] }); break;
      case 'levels': go('levels'); break;
      case 'progress': go('progress'); break;
      case 'start': startQuiz(state.subject.levels.find(l => l.id === d.id)); break;
      case 'again': startQuiz(state.level); break;
      case 'misses': startMisses(); break;
      case 'key': keyPress(d.k); break;
      case 'reset': resetProgress(); break;
    }
  }

  function viewHome() {
    const cards = subjects.map((s, i) => `
      <button class="card subject" data-action="subject" data-i="${i}">
        <div class="icon ${esc(s.color || 'blue')}">${esc(s.icon || '?')}</div>
        <div class="body">
          <div class="name">${esc(s.subject)}</div>
          <div class="desc">${s.levels.length} levels</div>
        </div>
      </button>`).join('');
    const n = store.sessions.length;
    return `
      <div class="screen">
        <h1>Math Practice</h1>
        <p class="muted">Pick a subject.</p>
        <div class="cards two">${cards}</div>
        <div class="footer">
          <button class="btn ghost" data-action="progress">Progress${n ? ` (${n} session${n === 1 ? '' : 's'})` : ''}</button>
        </div>
      </div>`;
  }

  function viewLevels() {
    const s = state.subject;
    const cards = s.levels.map(l => {
      const last = lastSessionFor(l.id);
      const meta = last ? `<div class="meta"><b>${Math.round(100 * last.correct / last.total)}%</b>last time</div>` : `<div class="meta small">new</div>`;
      return `
        <button class="card" data-action="start" data-id="${esc(l.id)}">
          <div class="body">
            <div class="name">${esc(l.name)}</div>
            <div class="desc">${esc(l.description || '')} · ${l.count || 10} questions</div>
          </div>
          ${meta}
        </button>`;
    }).join('');
    return `
      <div class="screen">
        <div class="topbar">
          <button class="btn ghost" data-action="home">‹ Home</button>
          <div class="title">${esc(s.subject)}</div>
          <button class="btn ghost" data-action="progress">Progress</button>
        </div>
        <div class="cards">${cards}</div>
      </div>`;
  }

  // ---------------------------------------------------------------- quiz
  function startQuiz(level) {
    const questions = buildSession(level);
    if (!questions.length) { alert('This level has no questions.'); return; }
    state.level = level;
    state.quiz = {
      questions, i: 0, input: '', streak: 0, bestStreak: 0, correct: 0,
      misses: [], phase: 'answer', // 'answer' | 'wrong' (waiting for Next)
      start: Date.now(), seconds: 0, hintShown: false,
    };
    go('quiz');
    timerId = setInterval(() => {
      const el = document.getElementById('timer');
      if (el) { state.quiz.seconds = Math.floor((Date.now() - state.quiz.start) / 1000); el.textContent = fmtTime(state.quiz.seconds); }
    }, 500);
  }

  function startMisses() {
    const q = state.quiz;
    const level = {
      id: state.level.id, name: state.level.name + ' (misses)', count: q.misses.length,
      questions: q.misses.map(m => Object.assign({}, m.q)),
    };
    startQuiz(level);
  }

  function currentQ() { return state.quiz.questions[state.quiz.i]; }

  function viewQuiz() {
    const z = state.quiz, q = currentQ(), total = z.questions.length;
    const long = q.q.length > 24 || q.q.includes('\n');
    const italic = s => esc(s).replace(/\b([xyzmnw])\b/g, '<span class="var">$1</span>');
    const lines = q.q.split('\n');
    const qText = '<div class="qt">' + lines.map((ln, i) =>
      `<div class="${i === 0 && lines.length > 1 && /:\s*$/.test(ln) ? 'lead' : 'line'}">${italic(ln)}</div>`).join('') + '</div>';
    const hasHint = !!q.hint;
    return `
      <div class="screen quiz">
        <div class="topbar">
          <button class="btn ghost" data-action="levels">‹ Quit</button>
          <div class="title">${esc(state.level.name)}</div>
          <div class="spacer"></div>
        </div>
        <div class="status">
          <span>${z.i + 1} / ${total}</span>
          <span class="streak">${z.streak >= 3 ? `🔥 ${z.streak}` : ''}</span>
          <span id="timer">${fmtTime(z.seconds)}</span>
        </div>
        <div class="progressbar"><div style="width:${(100 * z.i / total).toFixed(1)}%"></div></div>
        <div class="question ${long ? 'long' : ''}">${qText}</div>
        <div class="answer" id="answer"><span class="label">=</span><span id="answer-text"></span><span class="caret"></span></div>
        <div class="feedback" id="feedback"></div>
        <div class="keypad">
          ${['7', '8', '9'].map(k => key(k)).join('')}${key('⌫', 'back', 'fn')}
          ${['4', '5', '6'].map(k => key(k)).join('')}${key('±', 'neg', 'fn')}
          ${['1', '2', '3'].map(k => key(k)).join('')}${key('/', '/', 'fn')}
          ${key('.', '.', 'fn')}${key('0')}${key('Hint', 'hint', 'fn', !hasHint)}
          <button class="key check" id="check" data-action="key" data-k="enter">Check</button>
        </div>
      </div>`;
  }
  function key(label, k = label, cls = '', disabled = false) {
    return `<button class="key ${cls}" data-action="key" data-k="${esc(k)}" ${disabled ? 'disabled' : ''}>${esc(label)}</button>`;
  }

  function keyPress(k) {
    const z = state.quiz; if (!z) return;
    if (z.phase === 'wrong') { if (k === 'enter') nextQuestion(); return; }
    if (k === 'enter') { submit(); return; }
    if (k === 'back') z.input = z.input.slice(0, -1);
    else if (k === 'neg') z.input = z.input.startsWith('-') ? z.input.slice(1) : '-' + z.input;
    else if (k === 'hint') { showHint(); return; }
    else if (/^[0-9./]$/.test(k) && z.input.length < 10) z.input += k;
    const el = document.getElementById('answer-text');
    if (el) el.textContent = z.input.replace(/-/g, MINUS);
  }

  function showHint() {
    const q = currentQ(); if (!q.hint) return;
    state.quiz.hintShown = true;
    const fb = document.getElementById('feedback');
    fb.className = 'feedback'; fb.innerHTML = `<div class="muted">${esc(q.hint)}</div>`;
  }

  function submit() {
    const z = state.quiz, q = currentQ();
    if (!z.input || z.input === '-') return;
    const ok = isCorrect(z.input, q);
    recordFact(q.key, !ok);
    const ans = document.getElementById('answer'), fb = document.getElementById('feedback');
    if (ok) {
      z.correct++; z.streak++; z.bestStreak = Math.max(z.bestStreak, z.streak);
      ans.className = 'answer good'; fb.className = 'feedback good';
      fb.innerHTML = `<div>${pick(['Correct!', 'Yes!', 'Nice!', 'Got it!', 'Right!'])}</div>`;
      z.phase = 'locked';
      setTimeout(nextQuestion, 550);
    } else {
      z.streak = 0;
      z.misses.push({ q, given: z.input });
      ans.className = 'answer bad'; fb.className = 'feedback bad';
      fb.innerHTML = `<div>Not quite. The answer is <b>${esc(fmtNum(q.a))}</b>.` + (q.explain ? `<span class="explain">${esc(q.explain)}</span>` : '') + '</div>';
      z.phase = 'wrong';
      const btn = document.getElementById('check'); btn.textContent = 'Next'; btn.classList.add('next');
    }
  }

  function nextQuestion() {
    const z = state.quiz;
    z.i++; z.input = ''; z.phase = 'answer'; z.hintShown = false;
    if (z.i >= z.questions.length) finish(); else render();
  }

  function finish() {
    const z = state.quiz;
    z.seconds = Math.floor((Date.now() - z.start) / 1000);
    store.sessions.push({
      subject: state.subject ? state.subject.subject : '', levelId: state.level.id, levelName: state.level.name,
      date: new Date().toISOString(), correct: z.correct, total: z.questions.length, seconds: z.seconds,
    });
    if (store.sessions.length > 300) store.sessions = store.sessions.slice(-300);
    saveStore();
    go('results');
  }

  function viewResults() {
    const z = state.quiz, total = z.questions.length, pct = Math.round(100 * z.correct / total);
    const best = bestTimeFor(state.level.id, total);
    const headline = pct === 100 ? '🎉 Perfect!' : pct >= 80 ? 'Great work!' : pct >= 60 ? 'Good effort!' : 'Keep practicing!';
    const misses = z.misses.length ? `
      <div class="list">
        <div class="head">Ones to look at</div>
        ${z.misses.map(m => `<div class="item"><div class="q">${esc(m.q.q.replace('Solve for x:\n', ''))}</div><div class="a"><s>${esc(m.given.replace(/-/g, MINUS))}</s> → <b>${esc(fmtNum(m.q.a))}</b></div></div>`).join('')}
      </div>` : '';
    return `
      <div class="screen">
        <div class="topbar">
          <button class="btn ghost" data-action="levels">‹ Levels</button>
          <div class="title">${esc(state.level.name)}</div>
          <div class="spacer"></div>
        </div>
        <div class="score">
          <div class="big">${z.correct} / ${total}</div>
          <div class="sub">${headline} · ${pct}% · ${fmtTime(z.seconds)}${best !== null && best === z.seconds && pct === 100 ? ' · new best time!' : best !== null ? ` · best ${fmtTime(best)}` : ''}${z.bestStreak >= 5 ? ` · best streak ${z.bestStreak}` : ''}</div>
        </div>
        ${misses}
        <div class="row">
          ${z.misses.length ? `<button class="btn" data-action="misses">Practice the ${z.misses.length} missed</button>` : ''}
          <button class="btn primary" data-action="again">Play again</button>
        </div>
        <div class="footer"><button class="btn ghost" data-action="home">Home</button></div>
      </div>`;
  }

  // ---------------------------------------------------------------- progress
  function viewProgress() {
    const recent = store.sessions.slice(-15).reverse();
    const rows = recent.map(s => {
      const d = new Date(s.date);
      return `<tr><td>${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td><td>${esc(s.levelName)}</td><td class="num">${s.correct}/${s.total}</td><td class="num">${fmtTime(s.seconds)}</td></tr>`;
    }).join('');
    const table = recent.length
      ? `<div class="list"><table><thead><tr><th>Date</th><th>Level</th><th class="num">Score</th><th class="num">Time</th></tr></thead><tbody>${rows}</tbody></table></div>`
      : `<p class="muted">No sessions yet.</p>`;

    // 12x12 multiplication grid
    let cells = `<div class="h">×</div>`;
    for (let c = 1; c <= 12; c++) cells += `<div class="h">${c}</div>`;
    let anyFacts = false;
    for (let r = 1; r <= 12; r++) {
      cells += `<div class="h">${r}</div>`;
      for (let c = 1; c <= 12; c++) {
        const f = store.facts[factKey(r, c)];
        let cls = '', title = `${r} × ${c}`;
        if (f && f.seen) {
          anyFacts = true;
          const acc = 1 - f.wrong / f.seen;
          cls = acc >= 0.9 ? 'good' : acc >= 0.7 ? 'ok' : 'bad';
          title += `: ${f.seen - f.wrong}/${f.seen}`;
        }
        cells += `<div class="c ${cls}" title="${title}">${r * c}</div>`;
      }
    }
    const grid = anyFacts ? `
      <h2>Multiplication facts</h2>
      <div class="legend"><span><i style="background:var(--good)"></i>90%+</span><span><i style="background:var(--orange)"></i>70–89%</span><span><i style="background:var(--bad)"></i>under 70%</span><span><i style="background:var(--line)"></i>not tried</span></div>
      <div class="grid-wrap"><div class="grid">${cells}</div></div>` : '';

    return `
      <div class="screen">
        <div class="topbar">
          <button class="btn ghost" data-action="home">‹ Home</button>
          <div class="title">Progress</div>
          <div class="spacer"></div>
        </div>
        <h2>Recent sessions</h2>
        ${table}
        ${grid}
        <div class="footer"><button class="btn ghost danger" data-action="reset">Reset all progress on this device</button></div>
      </div>`;
  }

  function resetProgress() {
    if (!confirm('Erase all scores and history on this device?')) return;
    store.sessions = []; store.facts = {}; saveStore(); render();
  }

  // ---------------------------------------------------------------- keyboard
  document.addEventListener('keydown', ev => {
    if (state.screen !== 'quiz') return;
    const k = ev.key;
    if (/^[0-9./]$/.test(k)) keyPress(k);
    else if (k === '-') keyPress('neg');
    else if (k === 'Backspace') keyPress('back');
    else if (k === 'Enter') keyPress('enter');
    else if (k === '?' || k === 'h') keyPress('hint');
    else return;
    ev.preventDefault();
  });

  // ---------------------------------------------------------------- boot
  function validateSubject(s, file) {
    if (!s || !Array.isArray(s.levels)) throw new Error(`${file}: expected {"subject", "levels": [...]}`);
    for (const l of s.levels) {
      if (!l.id || !l.name) throw new Error(`${file}: every level needs "id" and "name"`);
      if (!l.generator && !(l.questions && l.questions.length)) throw new Error(`${file}: level "${l.id}" needs a "generator" or "questions"`);
      if (l.generator && !GEN[l.generator.type]) throw new Error(`${file}: level "${l.id}" has unknown generator type "${l.generator.type}"`);
      for (const q of l.questions || []) if (q.q === undefined || q.a === undefined) throw new Error(`${file}: a question in "${l.id}" is missing "q" or "a"`);
    }
  }

  Promise.all(SUBJECT_FILES.map(f => fetch(f, { cache: 'no-cache' }).then(r => {
    if (!r.ok) throw new Error(`${f}: HTTP ${r.status}`);
    return r.json().catch(e => { throw new Error(`${f}: invalid JSON (${e.message})`); });
  }).then(s => { validateSubject(s, f); return s; })))
    .then(list => { subjects = list; render(); })
    .catch(err => {
      const isFile = location.protocol === 'file:';
      app.innerHTML = `<div class="screen center"><h2>Could not load questions</h2>
        <div class="error">${esc(err.message)}${isFile ? '\n\nThis page cannot read data files when opened directly from disk.\nRun scripts/serve.sh and open the address it prints.' : ''}</div></div>`;
    });
})();
