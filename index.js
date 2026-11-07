// Test de frappe : ton appli d'origine (HTML et code inchangés), livrée en plugin.
// Ses données sont dans le dossier du plugin, que NeoDex sauvegarde (synchro cloud et sauvegardes) ; à la première ouverture elle reprend ce que tu avais dans NeoDex.
// Elle tourne dans le bac à sable de NeoDex, avec ses outils d'interface (ctx.host) et seulement les autorisations de son plugin.json.
const HTML = "<div class=\"appWrap\">\n      <div class=\"agHead\"><span class=\"label\">Test de frappe</span><span class=\"hint\" id=\"tyBest\"></span><div class=\"agNav\"><label class=\"check\" style=\"font-size:14px\"><input type=\"checkbox\" id=\"tyPunct\"> Ponctuation et majuscules</label><select class=\"f\" id=\"tyDur\" style=\"width:130px;font-size:14px;padding:6px 10px\"><option value=\"15\">15 s</option><option value=\"30\" selected>30 s</option><option value=\"60\">60 s</option><option value=\"120\">2 min</option><option value=\"w25\">25 mots</option><option value=\"w50\">50 mots</option></select><button class=\"btn px\" id=\"tyRestart\">RECOMMENCER</button></div></div>\n      <div class=\"sysCard px\"><div id=\"tyText\"></div><input class=\"f\" id=\"tyIn\" spellcheck=\"false\" autocomplete=\"off\" placeholder=\"Commence à taper : le chrono démarre à la première lettre\"><div class=\"tyProg\" id=\"tyProg\"></div><div class=\"tyBar\"><span id=\"tyLive\" class=\"label\"></span><span class=\"hint\">Tab ou Échap : recommencer</span></div><div class=\"tyKb\" id=\"tyKb\"></div></div>\n      <div class=\"sysCard px tyRes\" id=\"tyRes\" style=\"display:none\"></div>\n      <div class=\"sysCard px\"><span class=\"label\">Tes 20 dernières parties · mots par minute</span><div id=\"tyChart\" class=\"colChart\"></div></div>\n    </div>";
/*CSS-MOVED*/ const CSS = `#tyText{display:flex;flex-wrap:wrap;gap:0 12px;font:22px/36px var(--text);color:var(--muted);height:128px;overflow:hidden;padding:10px 14px;background:#0a0618 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'%3E%3Crect width='1' height='1' fill='%23170f2e'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%23130b26'/%3E%3C/svg%3E");background-size:8px 8px;image-rendering:pixelated;box-shadow:inset 0 0 0 3px #2a1d52,inset 6px 6px 0 #05010b,4px 4px 0 #05010b}
#tyText i.c{box-shadow:none;background:var(--pink);color:#0a0618;animation:tyBlink 1s steps(1) infinite}
@keyframes tyBlink{50%{background:transparent;color:var(--muted);box-shadow:inset 0 -4px 0 var(--pink)}}
.tyProg{display:flex;gap:2px;height:10px;margin:2px 0}.tyProg i{flex:1;background:#1c1238;box-shadow:inset -2px -2px 0 rgba(0,0,0,.35)}.tyProg i.on{background:var(--pink)}
.tyKb{display:flex;flex-direction:column;align-items:center;gap:4px;margin-top:6px;user-select:none}.tyKb div{display:flex;gap:4px}
.tyKb b{display:grid;place-items:center;width:30px;height:30px;font:12px var(--title);color:#d9c6ff;background:#1c1238;box-shadow:inset -3px -3px 0 #0e0820,inset 3px 3px 0 #2e2256,0 3px 0 #05010b;transition:transform .05s}
.tyKb b.sp{width:260px}.tyKb b.g{background:#2f7a46;color:#fff;transform:translateY(2px);box-shadow:inset -3px -3px 0 #1e5030,inset 3px 3px 0 #5fbf6a}
.tyKb b.r{background:#8a2c3c;color:#fff;transform:translateY(2px);box-shadow:inset -3px -3px 0 #5a1a26,inset 3px 3px 0 #d8584a}
.tyKb b.next{box-shadow:inset 0 0 0 2px var(--pink),0 3px 0 #05010b}
#tyText .ok{color:var(--lilac)}
#tyText .bad{color:var(--red);text-decoration:line-through}
#tyText .cur{color:var(--muted)}
#tyText i{font-style:normal}
#tyText i.g{color:#fff}
#tyText i.r{color:var(--red);background:rgba(255,79,109,.18)}
#tyText i.x{opacity:.7}
.tyRes{flex-direction:row;flex-wrap:wrap;align-items:center;gap:18px 34px}
.tyRes>div{display:flex;flex-direction:column;gap:6px}
.tyRes b{font:18px var(--title);color:#fff}
.tyRec{font:10px var(--title);color:var(--pink)}
.tyCurve{width:300px;height:60px;image-rendering:pixelated;background:#0a0618;box-shadow:inset 0 0 0 2px #2a1d52}
#tyIn{font-size:20px}
#tyIn.wrong{box-shadow:inset 0 0 0 3px var(--red)}
.tyBar{display:flex;justify-content:space-between;align-items:center}
#tyRes{color:var(--pink);font-size:17px}
`;  // le style de ce plugin (il utilise les variables du thème de NeoDex)
export default async function (ctx) {
  const view = ctx.view;
  if (!ctx.host) { view.textContent = "Ce plugin doit être approuvé par NeoDex pour s'ouvrir."; return; }
  const { el, toast, sfx, ask, newTab, pixIcon, PIX, WX } = ctx.host;
  const folder = ctx.folder, legacy = ctx.legacy || {};
  ctx.host.addStyle(CSS);
  view.innerHTML = HTML;
  const $ = id => id === "typingApp" ? view : view.querySelector('#' + id);  // les identifiants de ta vue, sans toucher à ceux du reste de NeoDex
  const doc = async n => { try { return await folder.read(n); } catch { return null; } };
  const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const LEGACY_API = ["games"];
  const api = async (n, data) => {
    if (data !== undefined) { await folder.write(n, data); return true; }
    let v = await doc(n);
    if (v == null && legacy.api && LEGACY_API.includes(n)) { v = await legacy.api(n).catch(() => null); if (v != null) await folder.write(n, v); }  // première ouverture : tu retrouves tes données d'avant
    return v;
  };
  let games = await doc('games');
  if (games == null) { const old = legacy.api ? await legacy.api('games').catch(() => null) : null; games = { typing: old?.typing || [], best: Object.fromEntries(Object.entries(old?.best || {}).filter(([k]) => k.startsWith('typing'))) }; if (old) await folder.write('games', games); }
  games = { typing: [], best: {}, ...games };
  let gamesTimer = null;
  const saveGames = () => { clearTimeout(gamesTimer); gamesTimer = setTimeout(() => { gamesTimer = null; folder.write('games', games).catch(() => {}); }, 500); };
  const best = (k, v, higher = true) => { const b = games.best[k]; if (b == null || (higher ? v > b : v < b)) { games.best[k] = v; saveGames(); return true; } return false; };
  // ---- ton code d'origine ----
  /* ---------- Test de frappe: modes by time or by number of words, optional punctuation, letter by letter feedback ---------- */
  const TY_WORDS = ('le de un être et à il avoir ne je son que se qui ce dans en du elle au pour pas vous par sur faire plus dire me on mon lui nous comme mais pouvoir avec tout aller voir bien où sans tu ou leur homme si deux moi vouloir te femme venir quand grand celui notre devoir là jour prendre même votre rien petit encore aussi quelque dont mer trouver donner temps peu falloir sous parler alors main chose ton mettre vie savoir yeux passer autre après regarder toujours puis jamais cela aimer non heure croire cent monde donc enfant fois seul entre vers chez demander jeune jusque très moment rester répondre tête père fille mille premier car entendre bon trois cœur an quatre terre contre voix penser quel arriver maison devant coup beau connaître devenir air mot nuit sentir vieux sembler moins tenir ami porte ouvrir partir pendant mieux depuis ville chat livre école musique jouer écran clavier étoile pixel couleur fenêtre soleil route lumière histoire matin soir rapide lent simple question réponse idée travail ensemble bientôt souvent parfois vrai faux image page lettre nombre jeu partie niveau').split(' ');
  let ty = null;
  const tyMode = () => $('tyDur').value;  // "30" = seconds, "w25" = number of words
  function tyNew() {
    clearInterval(ty?.timer);
    let list = Array.from({length: 150}, () => TY_WORDS[Math.floor(Math.random() * TY_WORDS.length)]);
    if ($('tyPunct').checked) {  // a capital after each full stop or question mark, some commas
      let cap = true;
      list = list.map(w => { if (cap) { w = w[0].toUpperCase() + w.slice(1); cap = false; } const r = Math.random(); if (r < .07) { cap = true; return w + '.'; } if (r < .1) { cap = true; return w + ' ?'; } return r < .17 ? w + ',' : w; }).join(' ').split(' ');
    }
    const m = tyMode(), byWords = m.startsWith('w');
    if (byWords) list = list.slice(0, +m.slice(1));
    ty = {words: list, i: 0, typed: [], byWords, secs: byWords ? 0 : +m, left: byWords ? 0 : +m, started: 0, timer: null, ok: 0, bad: 0, keys: 0, errors: 0, curve: [], done: false};
    $('tyIn').value = ''; $('tyIn').disabled = false; $('tyRes').replaceChildren(); $('tyRes').style.display = 'none'; tyRender(); tyHist();
  }
  const tyElapsed = () => ty.started ? (Date.now() - ty.started) / 1000 : 0;
  const tyWpm = () => { const s = tyElapsed(); return s > 1 ? Math.round(ty.ok / 5 / (s / 60)) : 0; };
  function tyRender() {
    const box = $('tyText'), cur = $('tyIn').value;
    box.replaceChildren(...ty.words.map((w, k) => {
      if (k < ty.i) return el('span', ty.typed[k] === w ? 'ok' : 'bad', w);
      if (k > ty.i) return el('span', '', w);
      const s = el('span', 'cur');  // the current word, letter by letter
      [...w].forEach((ch, j) => s.append(el('i', j < cur.length ? (cur[j] === ch ? 'g' : 'r') : j === cur.length ? 'c' : '', ch)));
      if (cur.length > w.length) s.append(el('i', 'r x', cur.slice(w.length)));
      return s;
    }));
    const c = box.querySelector('.cur'); if (c) box.scrollTop = c.offsetTop - box.offsetTop - 36 > 0 ? c.offsetTop - box.offsetTop - 36 : 0;
    const acc = ty.keys ? Math.round((ty.keys - ty.errors) / ty.keys * 100) : 100;
    const done = ty.byWords ? ty.i / ty.words.length : ty.secs ? 1 - ty.left / ty.secs : 0, n = Math.round(done * 30);
    $('tyProg').replaceChildren(...Array.from({length: 30}, (_, k) => el('i', k < n ? 'on' : '')));
    const nx = (ty.words[ty.i] || '')[cur.length] ?? ' '; $('tyKb').querySelectorAll('b').forEach(b => b.classList.toggle('next', b.dataset.k === nx.toLowerCase()));
    $('tyLive').textContent = (ty.byWords ? ty.i + ' / ' + ty.words.length + ' mots' : ty.left + ' s') + ' · ' + tyWpm() + ' mots/min · ' + acc + ' %';
  }
  function tyEnd() {
    clearInterval(ty.timer); ty.done = true; $('tyIn').disabled = true;
    const secs = tyElapsed(), wpm = Math.round(ty.ok / 5 / (secs / 60)), raw = Math.round((ty.ok + ty.bad) / 5 / (secs / 60)), acc = ty.keys ? Math.round((ty.keys - ty.errors) / ty.keys * 100) : 0;
    const good = ty.typed.filter((w, k) => w === ty.words[k]).length, mode = tyMode() + ($('tyPunct').checked ? 'p' : '');
    games.typing.push({wpm, raw, acc, mode, secs: Math.round(secs), t: Date.now()}); games.typing = games.typing.slice(-200);
    const rec = best('typing' + mode, wpm); saveGames();
    const card = $('tyRes'), stat = (label, value) => { const d = el('div'); d.append(el('span', 'label', label), el('b', '', value)); return d; };
    card.replaceChildren(stat('Vitesse', wpm + ' mots/min'), stat('Brute', raw + ' mots/min'), stat('Précision', acc + ' %'), stat('Mots justes', good + ' / ' + ty.typed.length), stat('Temps', Math.round(secs) + ' s'),
      el('div', 'tyRec', rec ? 'NOUVEAU RECORD !' : 'Record : ' + games.best['typing' + mode] + ' mots/min'), el('div', 'hint', 'Tab ou Échap : recommencer'));
    const cv = el('canvas', 'tyCurve'); cv.width = 300; cv.height = 60; card.append(cv);
    const g = cv.getContext('2d'), mx = Math.max(20, ...ty.curve); g.fillStyle = '#8a5cf0';
    ty.curve.forEach((v, i) => { const h = Math.max(1, v / mx * 56); g.fillRect(Math.floor(i * 300 / ty.curve.length), 60 - h, Math.max(1, Math.floor(300 / ty.curve.length) - 1), h); });
    card.style.display = ''; sfx(rec ? 'launch' : 'notify'); tyHist();
  }
  function tyHist() {
    const h = (games?.typing || []).filter(x => (x.mode || String(x.secs)) === tyMode() + ($('tyPunct').checked ? 'p' : '')), last = h.slice(-20), max = Math.max(40, ...last.map(x => x.wpm));
    $('tyBest').textContent = 'Record dans ce mode : ' + (games?.best['typing' + tyMode() + ($('tyPunct').checked ? 'p' : '')] ?? '—') + ' mots/min';
    $('tyChart').replaceChildren(...(last.length ? last.map(x => { const c = el('div', 'col'), b = el('div', 'bar'); b.style.height = x.wpm / max * 120 + 'px'; c.title = new Date(x.t).toLocaleString('fr-FR', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}) + ' : ' + x.wpm + ' mots/min, ' + x.acc + ' %'; c.append(b, el('span', '', String(x.wpm))); return c; }) : [el('div', 'hint', 'Tes parties dans ce mode apparaîtront ici.')]));
  }
  $('tyIn').oninput = e => {
    if (ty.done) return;
    if (!ty.started) {
      ty.started = Date.now();
      ty.timer = setInterval(() => { ty.curve.push(tyWpm()); if (!ty.byWords) { ty.left = Math.max(0, ty.secs - Math.floor(tyElapsed())); if (ty.left <= 0) return tyEnd(); } tyRender(); }, 1000);
    }
    const v = e.target.value, target = ty.words[ty.i];
    if (e.inputType?.startsWith('insert')) { ty.keys++; const j = v.trimEnd().length - 1; if (j >= 0 && !/\s$/.test(v) && v[j] !== target[j]) ty.errors++; }
    if (/\s$/.test(v)) {  // a space validates the word
      const w = v.trim();
      if (w) { ty.typed[ty.i] = w; if (w === target) ty.ok += w.length + 1; else ty.bad += Math.max(w.length, target.length); ty.i++; }
      e.target.value = '';
      if (ty.byWords && ty.i >= ty.words.length) return tyEnd();
    }
    $('tyIn').classList.toggle('wrong', !ty.words[ty.i]?.startsWith(e.target.value));
    tyRender();
  };
  // un clavier AZERTY en pixels : la touche suivante est entourée, celle que tu frappes s'allume (verte si juste, rouge sinon)
  $('tyKb').replaceChildren(...['azertyuiop', 'qsdfghjklm', 'wxcvbn,.', ' '].map(r => { const d = el('div'); for (const k of r) { const b = el('b', k === ' ' ? 'sp' : '', k === ' ' ? 'ESPACE' : k.toUpperCase()); b.dataset.k = k; d.append(b); } return d; }));
  const tyFlash = (k, ok) => { const b = [...$('tyKb').querySelectorAll('b')].find(x => x.dataset.k === k); if (!b) return; b.classList.remove('g', 'r'); b.classList.add(ok ? 'g' : 'r'); setTimeout(() => b.classList.remove('g', 'r'), 140); };
  $('tyIn').onkeydown = e => {
    if (e.key === 'Tab' || e.key === 'Escape') { e.preventDefault(); tyNew(); $('tyIn').focus(); return; }
    if (e.key.length === 1 && ty && !ty.done) { const want = (ty.words[ty.i] || '')[$('tyIn').value.length] ?? ' '; tyFlash(e.key.toLowerCase(), e.key === want); }
  };
  $('tyRestart').onclick = () => { tyNew(); $('tyIn').focus(); };
  $('tyDur').onchange = $('tyPunct').onchange = () => { tyNew(); $('tyIn').focus(); };
  // ---- fin ----
  ctx.onOpen(() => { if (!ty) tyNew(); tyHist(); setTimeout(() => $('tyIn').focus()); });
  ctx.onClose(() => { clearInterval(ty?.timer); });
}
