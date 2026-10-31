// Test de frappe, plugin NeoBase autonome (permission « storage » pour l'historique des scores, synchronisé).
const WORDS = ('le de un être et à il avoir ne je son que se qui ce dans en du elle au pour pas vous par sur faire plus dire me on mon lui nous comme mais pouvoir avec tout aller voir bien où sans tu ou leur homme si deux moi vouloir te femme venir quand grand celui notre devoir là jour prendre même votre rien petit encore aussi quelque dont mer trouver donner temps peu falloir sous parler alors main chose ton mettre vie savoir yeux passer autre après regarder toujours puis jamais cela aimer non heure croire monde donc enfant fois seul entre vers chez demander jeune très moment rester répondre tête père fille premier car entendre bon trois cœur terre contre voix penser quel arriver maison devant coup beau air mot nuit sentir vieux sembler moins tenir ami porte ouvrir mieux ville chat livre école musique jouer écran clavier étoile pixel couleur fenêtre soleil route lumière histoire matin soir rapide lent simple question réponse idée travail ensemble bientôt souvent parfois vrai faux image page lettre nombre jeu partie niveau').split(' ');
export default function (ctx) {
  const el = ctx.el;
  let ty = null, scores = [], best = {};
  const S = el('style');
  S.textContent = `
    .ty{padding:18px;display:flex;flex-direction:column;gap:12px}
    .ty .opts{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .ty select{background:color-mix(in srgb,var(--bg0,#0b031c) 70%,#000);color:#fff;border:2px solid var(--line2,#3a2a6e);font:14px var(--text,sans-serif);padding:6px 9px;outline:0}
    .ty .live{font:12px var(--title,monospace);color:var(--lilac,#d9c6ff);margin-left:auto}
    .ty .text{font:20px var(--text,sans-serif);line-height:1.9;max-height:170px;overflow:hidden;background:color-mix(in srgb,var(--line,#2a1d52) 35%,var(--bg0,#0b031c));padding:14px;box-shadow:inset 0 0 0 2px var(--line2,#3a2a6e);color:var(--muted,#8f7bb8)}
    .ty .text .ok{color:#8ee8a0} .ty .text .bad{color:#ff6a8a;text-decoration:underline}
    .ty .text .cur i.g{color:#8ee8a0} .ty .text .cur i.r{color:#ff6a8a} .ty .text .cur i.c{background:var(--magenta,#e01ec8);color:#fff} .ty .text .cur i.x{color:#ff6a8a}
    .ty input.in{font:18px var(--text,sans-serif);padding:10px 12px;background:color-mix(in srgb,var(--bg0,#0b031c) 70%,#000);color:#fff;border:2px solid var(--line2,#3a2a6e);outline:0}
    .ty input.in.wrong{border-color:#ff6a8a}
    .ty .res{display:none;flex-wrap:wrap;gap:16px;background:color-mix(in srgb,var(--line,#2a1d52) 35%,var(--bg0,#0b031c));padding:14px;box-shadow:inset 0 0 0 2px var(--line2,#3a2a6e)}
    .ty .res div{display:flex;flex-direction:column} .ty .res .label{font:9px var(--title,monospace);color:var(--muted,#8f7bb8)} .ty .res b{font:20px var(--title,monospace);color:#fff}
    .ty .rec{color:var(--pink,#ff5ad9);font:11px var(--title,monospace);align-self:center}
    .ty button{font:11px var(--title,monospace);color:#fff;border:0;padding:8px 12px;cursor:pointer;background:color-mix(in srgb,var(--magenta,#e01ec8) 80%,#000)}
    .ty .bestline{color:var(--muted,#8f7bb8);font-size:13px}`;
  const dur = el('select'); for (const [v, t] of [['15', '15 s'], ['30', '30 s'], ['60', '60 s'], ['w10', '10 mots'], ['w25', '25 mots'], ['w50', '50 mots']]) dur.append(Object.assign(el('option', '', t), {value: v})); dur.value = '30';
  const punct = el('input'); punct.type = 'checkbox'; const punctL = el('label'); punctL.append(punct, ' Ponctuation');
  const live = el('div', 'live'), restart = el('button', '', '↻ Recommencer');
  const opts = el('div', 'opts'); opts.append(dur, punctL, restart, live);
  const text = el('div', 'text'), input = el('input', 'in'); input.spellcheck = false; input.autocomplete = 'off';
  const res = el('div', 'res'), bestline = el('div', 'bestline');
  const wrap = el('div', 'ty'); wrap.append(opts, text, input, res, bestline);
  ctx.view.append(S, wrap);

  const mode = () => dur.value + (punct.checked ? 'p' : '');
  const elapsed = () => ty.started ? (Date.now() - ty.started) / 1000 : 0;
  const wpm = () => { const s = elapsed(); return s > 1 ? Math.round(ty.ok / 5 / (s / 60)) : 0; };
  function neu() {
    clearInterval(ty?.timer);
    let list = Array.from({length: 150}, () => WORDS[Math.floor(Math.random() * WORDS.length)]);
    if (punct.checked) { let cap = true; list = list.map(w => { if (cap) { w = w[0].toUpperCase() + w.slice(1); cap = false; } const r = Math.random(); if (r < .07) { cap = true; return w + '.'; } if (r < .1) { cap = true; return w + ' ?'; } return r < .17 ? w + ',' : w; }).join(' ').split(' '); }
    const m = dur.value, byWords = m.startsWith('w');
    if (byWords) list = list.slice(0, +m.slice(1));
    ty = {words: list, i: 0, typed: [], byWords, secs: byWords ? 0 : +m, left: byWords ? 0 : +m, started: 0, timer: null, ok: 0, bad: 0, keys: 0, errors: 0, done: false};
    input.value = ''; input.disabled = false; res.style.display = 'none'; render(); bestLine();
  }
  function render() {
    const cur = input.value;
    text.replaceChildren(...ty.words.map((w, k) => {
      if (k < ty.i) return el('span', ty.typed[k] === w ? 'ok' : 'bad', w);
      if (k > ty.i) return el('span', '', w);
      const s = el('span', 'cur');
      [...w].forEach((ch, j) => s.append(el('i', j < cur.length ? (cur[j] === ch ? 'g' : 'r') : j === cur.length ? 'c' : '', ch)));
      if (cur.length > w.length) s.append(el('i', 'r x', cur.slice(w.length)));
      return s;
    }));
    const acc = ty.keys ? Math.round((ty.keys - ty.errors) / ty.keys * 100) : 100;
    live.textContent = (ty.byWords ? ty.i + ' / ' + ty.words.length + ' mots' : ty.left + ' s') + ' · ' + wpm() + ' mots/min · ' + acc + ' %';
  }
  function end() {
    clearInterval(ty.timer); ty.done = true; input.disabled = true;
    const secs = elapsed(), w = Math.round(ty.ok / 5 / (secs / 60)), raw = Math.round((ty.ok + ty.bad) / 5 / (secs / 60)), acc = ty.keys ? Math.round((ty.keys - ty.errors) / ty.keys * 100) : 0;
    const good = ty.typed.filter((x, k) => x === ty.words[k]).length, m = mode();
    scores.push({wpm: w, acc, mode: m, t: Date.now()}); scores = scores.slice(-200);
    const rec = best[m] == null || w > best[m]; if (rec) best[m] = w;
    ctx.storage.set({scores, best});
    const stat = (l, v) => { const d = el('div'); d.append(el('span', 'label', l), el('b', '', v)); return d; };
    res.replaceChildren(stat('Vitesse', w + ' mots/min'), stat('Brute', raw + ' mots/min'), stat('Précision', acc + ' %'), stat('Mots justes', good + ' / ' + ty.typed.length), stat('Temps', Math.round(secs) + ' s'), el('div', 'rec', rec ? 'NOUVEAU RECORD !' : 'Record : ' + best[m] + ' mots/min'));
    res.style.display = 'flex'; bestLine();
  }
  function bestLine() { bestline.textContent = 'Record dans ce mode : ' + (best[mode()] ?? '—') + ' mots/min'; }
  input.oninput = e => {
    if (ty.done) return;
    if (!ty.started) { ty.started = Date.now(); ty.timer = setInterval(() => { if (!ty.byWords) { ty.left = Math.max(0, ty.secs - Math.floor(elapsed())); if (ty.left <= 0) return end(); } render(); }, 1000); }
    const v = e.target.value, target = ty.words[ty.i];
    if (e.inputType?.startsWith('insert')) { ty.keys++; const j = v.trimEnd().length - 1; if (j >= 0 && !/\s$/.test(v) && v[j] !== target[j]) ty.errors++; }
    if (/\s$/.test(v)) { const w = v.trim(); if (w) { ty.typed[ty.i] = w; if (w === target) ty.ok += w.length + 1; else ty.bad += Math.max(w.length, target.length); ty.i++; } e.target.value = ''; if (ty.byWords && ty.i >= ty.words.length) return end(); }
    input.classList.toggle('wrong', !ty.words[ty.i]?.startsWith(e.target.value));
    render();
  };
  input.onkeydown = e => { if (e.key === 'Tab' || e.key === 'Escape') { e.preventDefault(); neu(); input.focus(); } };
  restart.onclick = () => { neu(); input.focus(); };
  dur.onchange = punct.onchange = () => { neu(); input.focus(); };
  ctx.onOpen(async () => { const d = await ctx.storage.get(); if (d) { scores = d.scores || []; best = d.best || {}; } neu(); input.focus(); });
  ctx.onClose(() => clearInterval(ty?.timer));
}
