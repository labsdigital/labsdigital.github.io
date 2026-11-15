/* =========================================================================
 * Lumin Player
 * Mesin pemutar (runtime) untuk semua tipe konten interaktif.
 * Seluruh modul dibungkus dalam satu fungsi agar bisa diserialisasi
 * (Function.toString) dan disematkan ke file HTML mandiri saat ekspor.
 * ========================================================================= */
function LumiPlayerFactory() {
  'use strict';

  /* ---------------------------------------------------------------- utils */
  const ALLOWED = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'P', 'BR', 'UL', 'OL', 'LI', 'A', 'H2', 'H3', 'H4',
    'BLOCKQUOTE', 'SPAN', 'DIV', 'SUB', 'SUP', 'CODE', 'PRE', 'IMG', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'HR', 'FONT', 'MARK']);
  const DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'FORM', 'INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'SVG', 'MATH']);

  function safeUrl(u, img) {
    u = String(u || '').trim();
    if (/^(https?:|mailto:|#|\/|\.\/)/i.test(u)) return u;
    if (img && /^data:image\/(png|jpe?g|gif|webp|svg\+xml);/i.test(u)) return u;
    if (!/^[a-z]+:/i.test(u)) return u;
    return '';
  }

  function sanitize(html) {
    if (html == null) return '';
    const doc = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html');
    const root = doc.body.firstChild;
    (function walk(node) {
      Array.from(node.childNodes).forEach((c) => {
        if (c.nodeType === 8) { c.remove(); return; }
        if (c.nodeType !== 1) return;
        if (DROP.has(c.tagName)) { c.remove(); return; }
        if (!ALLOWED.has(c.tagName)) {
          walk(c);
          while (c.firstChild) node.insertBefore(c.firstChild, c);
          c.remove();
          return;
        }
        Array.from(c.attributes).forEach((a) => {
          const n = a.name.toLowerCase();
          if (n === 'href' && c.tagName === 'A') {
            const v = safeUrl(a.value);
            if (v) { c.setAttribute('href', v); c.setAttribute('target', '_blank'); c.setAttribute('rel', 'noopener'); } else c.removeAttribute('href');
          } else if (n === 'src' && c.tagName === 'IMG') {
            const v = safeUrl(a.value, true);
            if (v) c.setAttribute('src', v); else c.removeAttribute('src');
          } else if (n === 'alt' || n === 'title' || n === 'colspan' || n === 'rowspan' || n === 'target' || n === 'rel') {
            /* aman */
          } else if (n === 'style') {
            const keep = a.value.split(';').filter((d) => /^\s*(color|background-color|text-align|font-weight|font-style|text-decoration)\s*:/i.test(d) && !/url\(|expression/i.test(d));
            if (keep.length) c.setAttribute('style', keep.join(';')); else c.removeAttribute('style');
          } else if (n === 'color' && c.tagName === 'FONT') {
            /* aman */
          } else c.removeAttribute(a.name);
        });
        walk(c);
      });
    })(root);
    return root.innerHTML;
  }

  function h(tag, props) {
    const el = document.createElement(tag);
    if (props) {
      for (const k in props) {
        const v = props[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'html') el.innerHTML = sanitize(v);
        else if (k === 'text') el.textContent = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'src') { const s = safeUrl(v, true); if (s) el.setAttribute('src', s); }
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (let i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function put(el) { for (let i = 1; i < arguments.length; i++) append(el, arguments[i]); }
  function append(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach((x) => append(el, x)); return; }
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function norm(s, cs) { s = String(s || '').trim().replace(/\s+/g, ' '); return cs ? s : s.toLowerCase(); }
  function arr(x) { return Array.isArray(x) ? x : []; }
  function hasText(x) { return x != null && String(x).replace(/<[^>]*>/g, '').trim() !== ''; }
  function img(src, alt, cls) { return src ? h('img', { src: src, alt: alt || '', class: cls || 'lp-img', loading: 'lazy' }) : null; }
  function fmtTime(s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

  /* --------------------------------------------------------------- shared UI */
  function btn(label, onClick, cls) {
    return h('button', { type: 'button', class: 'lp-btn ' + (cls || ''), onClick: onClick }, label);
  }
  function scoreBar(score, max) {
    const pct = max ? Math.round((score / max) * 100) : 0;
    return h('div', { class: 'lp-score' },
      h('div', { class: 'lp-score-text' }, 'Skor Anda: ', h('b', null, score + ' / ' + max), ' (' + pct + '%)'),
      h('div', { class: 'lp-score-track' }, h('div', { class: 'lp-score-fill' + (pct >= 50 ? ' good' : ''), style: { width: pct + '%' } })));
  }
  function feedback(el, ok, msg) {
    el.innerHTML = '';
    el.className = 'lp-feedback ' + (ok === true ? 'ok' : ok === false ? 'bad' : 'info');
    if (msg) el.textContent = msg;
  }
  function makeCtx(base) {
    return {
      embedded: !!(base && base.embedded),
      result: function (score, max, extra) { if (base && base.result) base.result(score, max, extra); },
    };
  }

  /* ========================================================== RENDERERS */
  const R = {};

  /* ------------------------------------------------------ Pilihan Ganda */
  R.mc = function (root, p, ctx) {
    const answers = arr(p.answers).filter((a) => hasText(a.text));
    const nCorrect = answers.filter((a) => a.correct).length;
    const single = nCorrect <= 1;
    const order = p.randomize ? shuffle(answers) : answers;
    const wrap = h('div', { class: 'lp-mc' });
    if (p.image) wrap.append(img(p.image, '', 'lp-img lp-qimg'));
    wrap.append(h('div', { class: 'lp-question', text: p.question || '' }));
    if (!single) wrap.append(h('div', { class: 'lp-hint', text: 'Pilih ' + nCorrect + ' jawaban yang benar.' }));
    const list = h('div', { class: 'lp-options', role: single ? 'radiogroup' : 'group' });
    const name = 'mc' + Math.random().toString(36).slice(2);
    const items = order.map((a) => {
      const input = h('input', { type: single ? 'radio' : 'checkbox', name: name });
      const fb = h('div', { class: 'lp-opt-fb' });
      const row = h('label', { class: 'lp-option' }, input, h('span', { class: 'lp-opt-text', text: a.text }), fb);
      list.append(row);
      return { a: a, input: input, row: row, fb: fb };
    });
    wrap.append(list);
    const fbEl = h('div', { class: 'lp-feedback' });
    const bar = h('div', { class: 'lp-actions' });
    wrap.append(fbEl, bar);
    root.append(wrap);

    let checked = false;
    function check() {
      if (checked) return;
      checked = true;
      let score = 0;
      items.forEach((it) => {
        it.input.disabled = true;
        const sel = it.input.checked;
        if (sel && it.a.correct) { score++; it.row.classList.add('correct'); }
        else if (sel && !it.a.correct) { score--; it.row.classList.add('wrong'); }
        if (sel && hasText(it.a.feedback)) it.fb.textContent = it.a.feedback;
      });
      score = Math.max(0, score);
      const max = p.singlePoint ? 1 : Math.max(1, nCorrect);
      if (p.singlePoint) score = score === nCorrect && !items.some((i) => i.input.checked && !i.a.correct) ? 1 : 0;
      const full = score === max;
      feedback(fbEl, full, full ? (p.feedbackCorrect || 'Benar! Kerja bagus.') : (p.feedbackWrong || 'Belum tepat.'));
      fbEl.append(scoreBar(score, max));
      ctx.result(score, max);
      renderBar(full);
    }
    function showSolution() {
      items.forEach((it) => { if (it.a.correct) it.row.classList.add('solution'); });
    }
    function reset() {
      checked = false;
      items.forEach((it) => { it.input.disabled = false; it.input.checked = false; it.row.className = 'lp-option'; it.fb.textContent = ''; });
      fbEl.className = 'lp-feedback'; fbEl.innerHTML = '';
      renderBar();
    }
    function renderBar(full) {
      bar.innerHTML = '';
      if (!checked) bar.append(btn('Periksa', check, 'primary'));
      else {
        if (p.showSolution !== false && !full) bar.append(btn('Tampilkan jawaban', showSolution));
        if (p.retry !== false) bar.append(btn('Coba lagi', reset));
      }
    }
    renderBar();
    return { check: check, max: p.singlePoint ? 1 : Math.max(1, nCorrect) };
  };

  /* ---------------------------------------------------------- Benar/Salah */
  R.tf = function (root, p, ctx) {
    const wrap = h('div', { class: 'lp-tf' });
    if (p.image) wrap.append(img(p.image, '', 'lp-img lp-qimg'));
    wrap.append(h('div', { class: 'lp-question', text: p.question || '' }));
    let choice = null, checked = false;
    const bTrue = h('button', { type: 'button', class: 'lp-tf-btn' }, '✔ Benar');
    const bFalse = h('button', { type: 'button', class: 'lp-tf-btn' }, '✘ Salah');
    const correctVal = p.correct === true || p.correct === 'true';
    function pick(v) { if (checked) return; choice = v; bTrue.classList.toggle('sel', v === true); bFalse.classList.toggle('sel', v === false); }
    bTrue.onclick = () => pick(true); bFalse.onclick = () => pick(false);
    const fbEl = h('div', { class: 'lp-feedback' });
    const bar = h('div', { class: 'lp-actions' });
    wrap.append(h('div', { class: 'lp-tf-row' }, bTrue, bFalse), fbEl, bar);
    root.append(wrap);
    function check() {
      if (checked) return;
      if (choice === null) { feedback(fbEl, null, 'Pilih salah satu jawaban terlebih dahulu.'); return; }
      checked = true;
      const ok = choice === correctVal;
      (choice ? bTrue : bFalse).classList.add(ok ? 'correct' : 'wrong');
      feedback(fbEl, ok, ok ? (p.feedbackCorrect || 'Benar!') : (p.feedbackWrong || 'Salah.'));
      fbEl.append(scoreBar(ok ? 1 : 0, 1));
      ctx.result(ok ? 1 : 0, 1);
      renderBar(ok);
    }
    function reset() { checked = false; choice = null; [bTrue, bFalse].forEach((b) => (b.className = 'lp-tf-btn')); fbEl.className = 'lp-feedback'; fbEl.innerHTML = ''; renderBar(); }
    function renderBar(ok) {
      bar.innerHTML = '';
      if (!checked) bar.append(btn('Periksa', check, 'primary'));
      else {
        if (!ok && p.showSolution !== false) bar.append(btn('Tampilkan jawaban', () => (correctVal ? bTrue : bFalse).classList.add('solution')));
        if (p.retry !== false) bar.append(btn('Coba lagi', reset));
      }
    }
    renderBar();
    return { check: check, max: 1 };
  };

  /* ---------------------------------------------------- Isian (Blanks) */
  function parseMarked(text) {
    // memecah teks bertanda *jawaban* menjadi bagian
    const parts = [];
    const re = /\*([^*\n]+)\*/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) parts.push({ t: 'text', v: text.slice(last, m.index) });
      parts.push({ t: 'mark', v: m[1] });
      last = re.lastIndex;
    }
    if (last < text.length) parts.push({ t: 'text', v: text.slice(last) });
    return parts;
  }
  function textNodes(s) {
    const out = [];
    String(s).split('\n').forEach((line, i) => { if (i) out.push(h('br')); if (line) out.push(document.createTextNode(line)); });
    return out;
  }

  R.blanks = function (root, p, ctx) {
    const wrap = h('div', { class: 'lp-blanks' });
    if (hasText(p.intro)) wrap.append(h('div', { class: 'lp-intro', html: p.intro }));
    if (p.image) wrap.append(img(p.image));
    const body = h('div', { class: 'lp-blank-text' });
    const blanks = [];
    parseMarked(p.text || '').forEach((part) => {
      if (part.t === 'text') { append(body, textNodes(part.v)); return; }
      const [ans, tip] = part.v.split(':');
      const alts = ans.split('/').map((s) => s.trim()).filter(Boolean);
      const size = Math.max(4, Math.max.apply(null, alts.map((a) => a.length)) + 1);
      const input = h('input', { type: 'text', class: 'lp-blank', size: size, autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Isian' });
      const sol = h('span', { class: 'lp-blank-sol' });
      const span = h('span', { class: 'lp-blank-wrap' }, input, tip ? h('span', { class: 'lp-tip', title: tip, text: '?' }) : null, sol);
      body.append(span);
      blanks.push({ alts: alts, input: input, sol: sol });
    });
    const fbEl = h('div', { class: 'lp-feedback' });
    const bar = h('div', { class: 'lp-actions' });
    wrap.append(body, fbEl, bar);
    root.append(wrap);
    let checked = false;
    function check() {
      checked = true;
      let score = 0;
      blanks.forEach((b) => {
        b.input.disabled = true;
        const ok = b.alts.some((a) => norm(a, p.caseSensitive) === norm(b.input.value, p.caseSensitive));
        b.input.classList.add(ok ? 'correct' : 'wrong');
        if (ok) score++;
      });
      const max = blanks.length;
      feedback(fbEl, score === max, score === max ? 'Sempurna! Semua isian benar.' : 'Beberapa isian belum tepat.');
      fbEl.append(scoreBar(score, max));
      ctx.result(score, max);
      renderBar(score === max);
    }
    function reset() { checked = false; blanks.forEach((b) => { b.input.disabled = false; b.input.value = ''; b.input.className = 'lp-blank'; b.sol.textContent = ''; }); fbEl.className = 'lp-feedback'; fbEl.innerHTML = ''; renderBar(); }
    function renderBar(full) {
      bar.innerHTML = '';
      if (!checked) bar.append(btn('Periksa', check, 'primary'));
      else {
        if (!full && p.showSolution !== false) bar.append(btn('Tampilkan jawaban', () => blanks.forEach((b) => { if (b.input.classList.contains('wrong')) b.sol.textContent = b.alts[0]; })));
        if (p.retry !== false) bar.append(btn('Coba lagi', reset));
      }
    }
    renderBar();
    return { check: check, max: blanks.length };
  };

  /* ------------------------------------------------------ Seret Kata */
  R.dragtext = function (root, p, ctx) {
    const wrap = h('div', { class: 'lp-drag' });
    if (hasText(p.intro)) wrap.append(h('div', { class: 'lp-intro', html: p.intro }));
    const body = h('div', { class: 'lp-drag-text' });
    const zones = [];
    const words = [];
    parseMarked(p.text || '').forEach((part) => {
      if (part.t === 'text') { append(body, textNodes(part.v)); return; }
      const word = part.v.split(':')[0].trim();
      const zone = h('span', { class: 'lp-zone', tabindex: '0', role: 'button', 'aria-label': 'Area jatuh' });
      zones.push({ word: word, el: zone, filled: null });
      words.push(word);
      body.append(zone);
    });
    const bank = h('div', { class: 'lp-bank' });
    let selected = null, checked = false;
    function makeChip(w) {
      const chip = h('span', { class: 'lp-chip', draggable: 'true', tabindex: '0', text: w });
      chip.addEventListener('dragstart', (e) => { if (checked) { e.preventDefault(); return; } selected = chip; e.dataTransfer.setData('text/plain', w); chip.classList.add('dragging'); });
      chip.addEventListener('dragend', () => chip.classList.remove('dragging'));
      chip.addEventListener('click', () => { if (checked) return; if (selected) selected.classList.remove('sel'); selected = selected === chip ? null : chip; if (selected) chip.classList.add('sel'); });
      chip.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); chip.click(); } });
      return chip;
    }
    function placeIn(z, chip) {
      if (checked || !chip) return;
      const fromZone = zones.find((zz) => zz.filled === chip);
      if (fromZone) fromZone.filled = null;
      if (z.filled) bank.append(z.filled);
      z.filled = chip; z.el.innerHTML = ''; z.el.append(chip);
      chip.classList.remove('sel'); selected = null;
      zones.forEach((zz) => { if (!zz.filled) zz.el.innerHTML = ''; });
    }
    zones.forEach((z) => {
      z.el.addEventListener('dragover', (e) => { e.preventDefault(); z.el.classList.add('over'); });
      z.el.addEventListener('dragleave', () => z.el.classList.remove('over'));
      z.el.addEventListener('drop', (e) => { e.preventDefault(); z.el.classList.remove('over'); placeIn(z, selected); });
      z.el.addEventListener('click', (e) => {
        if (checked) return;
        if (selected) placeIn(z, selected);
        else if (z.filled && e.target === z.filled) { /* pilih chip di zona */ }
      });
      z.el.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && selected) { e.preventDefault(); placeIn(z, selected); } });
    });
    bank.addEventListener('dragover', (e) => e.preventDefault());
    bank.addEventListener('drop', (e) => { e.preventDefault(); if (selected && !checked) { const z = zones.find((zz) => zz.filled === selected); if (z) z.filled = null; bank.append(selected); selected = null; } });
    shuffle(words.concat(arr(p.distractors).map((d) => d.text || d).filter(Boolean))).forEach((w) => bank.append(makeChip(w)));
    const fbEl = h('div', { class: 'lp-feedback' });
    const bar = h('div', { class: 'lp-actions' });
    wrap.append(body, h('div', { class: 'lp-hint', text: 'Seret kata ke tempat kosong, atau klik kata lalu klik tempat kosong.' }), bank, fbEl, bar);
    root.append(wrap);
    function check() {
      checked = true;
      let score = 0;
      zones.forEach((z) => {
        const ok = z.filled && norm(z.filled.textContent) === norm(z.word);
        z.el.classList.add(ok ? 'correct' : 'wrong');
        if (ok) score++;
      });
      feedback(fbEl, score === zones.length, score === zones.length ? 'Hebat! Semua kata tepat.' : 'Beberapa kata belum tepat.');
      fbEl.append(scoreBar(score, zones.length));
      ctx.result(score, zones.length);
      renderBar(score === zones.length);
    }
    function reset() {
      checked = false;
      zones.forEach((z) => { if (z.filled) bank.append(z.filled); z.filled = null; z.el.className = 'lp-zone'; z.el.innerHTML = ''; });
      const chips = Array.from(bank.children); bank.innerHTML = ''; shuffle(chips).forEach((c) => bank.append(c));
      fbEl.className = 'lp-feedback'; fbEl.innerHTML = ''; renderBar();
    }
    function renderBar(full) {
      bar.innerHTML = '';
      if (!checked) bar.append(btn('Periksa', check, 'primary'));
      else {
        if (!full) bar.append(btn('Tampilkan jawaban', () => zones.forEach((z) => { if (z.el.classList.contains('wrong')) z.el.setAttribute('data-sol', z.word); })));
        bar.append(btn('Coba lagi', reset));
      }
    }
    renderBar();
    return { check: check, max: zones.length };
  };

  /* ---------------------------------------------------- Tandai Kata */
  R.markwords = function (root, p, ctx) {
    const wrap = h('div', { class: 'lp-mark' });
    if (hasText(p.intro)) wrap.append(h('div', { class: 'lp-intro', html: p.intro }));
    const body = h('div', { class: 'lp-mark-text' });
    const tokens = [];
    parseMarked(p.text || '').forEach((part) => {
      if (part.t === 'mark') {
        const el = h('span', { class: 'lp-word', tabindex: '0', role: 'checkbox', 'aria-checked': 'false', text: part.v });
        tokens.push({ el: el, correct: true }); body.append(el);
        return;
      }
      part.v.split(/(\s+)/).forEach((w) => {
        if (!w) return;
        if (/^\s+$/.test(w)) { append(body, textNodes(w.replace(/[ \t]+/g, ' '))); return; }
        const m = w.match(/^([^\wÀ-ž]*)([\s\S]*?)([^\wÀ-ž]*)$/);
        if (m && m[2]) {
          if (m[1]) body.append(m[1]);
          const el = h('span', { class: 'lp-word', tabindex: '0', role: 'checkbox', 'aria-checked': 'false', text: m[2] });
          tokens.push({ el: el, correct: false }); body.append(el);
          if (m[3]) body.append(m[3]);
        } else body.append(w);
      });
    });
    let checked = false;
    tokens.forEach((t) => {
      const toggle = () => { if (checked) return; t.el.classList.toggle('sel'); t.el.setAttribute('aria-checked', t.el.classList.contains('sel')); };
      t.el.addEventListener('click', toggle);
      t.el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    });
    const max = tokens.filter((t) => t.correct).length;
    const fbEl = h('div', { class: 'lp-feedback' });
    const bar = h('div', { class: 'lp-actions' });
    wrap.append(body, fbEl, bar);
    root.append(wrap);
    function check() {
      checked = true; let score = 0;
      tokens.forEach((t) => {
        const sel = t.el.classList.contains('sel');
        if (sel && t.correct) { score++; t.el.classList.add('correct'); }
        else if (sel) { score--; t.el.classList.add('wrong'); }
      });
      score = Math.max(0, score);
      feedback(fbEl, score === max, score === max ? 'Luar biasa!' : 'Masih ada yang terlewat atau keliru.');
      fbEl.append(scoreBar(score, max));
      ctx.result(score, max);
      renderBar(score === max);
    }
    function reset() { checked = false; tokens.forEach((t) => (t.el.className = 'lp-word')); fbEl.className = 'lp-feedback'; fbEl.innerHTML = ''; renderBar(); }
    function renderBar(full) {
      bar.innerHTML = '';
      if (!checked) bar.append(btn('Periksa', check, 'primary'));
      else {
        if (!full) bar.append(btn('Tampilkan jawaban', () => tokens.forEach((t) => { if (t.correct) t.el.classList.add('solution'); })));
        bar.append(btn('Coba lagi', reset));
      }
    }
    renderBar();
    return { check: check, max: max };
  };

  /* --------------------------------------------------------- Flashcards */
  R.flashcards = function (root, p, ctx) {
    const cards = arr(p.cards).filter((c) => hasText(c.question) || c.image);
    const wrap = h('div', { class: 'lp-flash' });
    if (hasText(p.intro)) wrap.append(h('div', { class: 'lp-intro', html: p.intro }));
    if (!cards.length) { wrap.append(h('p', { text: 'Belum ada kartu.' })); root.append(wrap); return; }
    let idx = 0;
    const state = cards.map(() => ({ answer: '', checked: false, ok: false }));
    const stage = h('div', { class: 'lp-flash-stage' });
    const counter = h('div', { class: 'lp-counter' });
    const nav = h('div', { class: 'lp-actions center' });
    wrap.append(counter, stage, nav);
    root.append(wrap);
    function done() { return state.every((s) => s.checked); }
    function render() {
      const c = cards[idx], s = state[idx];
      stage.innerHTML = '';
      counter.textContent = 'Kartu ' + (idx + 1) + ' dari ' + cards.length;
      const card = h('div', { class: 'lp-fcard' + (s.checked ? ' flipped' : '') });
      const front = h('div', { class: 'lp-fface front' }, img(c.image, '', 'lp-img'), h('div', { class: 'lp-fq', text: c.question || '' }), c.tip ? h('div', { class: 'lp-hint', text: 'Petunjuk: ' + c.tip }) : null);
      const back = h('div', { class: 'lp-fface back' }, h('div', { class: 'lp-hint', text: 'Jawaban:' }), h('div', { class: 'lp-fq', text: c.answer || '' }));
      card.append(h('div', { class: 'lp-finner' }, front, back));
      const input = h('input', { type: 'text', class: 'lp-input', placeholder: 'Ketik jawaban Anda…', value: s.answer, disabled: s.checked });
      input.addEventListener('input', () => (s.answer = input.value));
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkCard(); });
      const fb = h('div', { class: 'lp-feedback' });
      if (s.checked) feedback(fb, s.ok, s.ok ? 'Benar!' : 'Jawaban benar: ' + c.answer);
      stage.append(card, h('div', { class: 'lp-flash-input' }, input, s.checked ? null : btn('Periksa', checkCard, 'primary')), fb);
      function checkCard() {
        if (s.checked) return;
        s.checked = true;
        s.ok = norm(s.answer, p.caseSensitive) === norm(c.answer, p.caseSensitive);
        render();
        if (done()) finish();
      }
      nav.innerHTML = '';
      nav.append(btn('‹ Sebelumnya', () => { if (idx > 0) { idx--; render(); } }, idx === 0 ? 'disabled' : ''));
      nav.append(btn('Balik kartu', () => card.classList.toggle('flipped')));
      nav.append(btn('Berikutnya ›', () => { if (idx < cards.length - 1) { idx++; render(); } }, idx === cards.length - 1 ? 'disabled' : ''));
      if (done()) nav.append(btn('Ulangi', () => { state.forEach((x) => { x.answer = ''; x.checked = false; x.ok = false; }); idx = 0; render(); }));
    }
    function finish() {
      const score = state.filter((s) => s.ok).length;
      stage.append(scoreBar(score, cards.length));
      ctx.result(score, cards.length);
    }
    render();
  };

  /* ------------------------------------------------------- Kartu Dialog */
  R.dialogcards = function (root, p) {
    const cards = arr(p.cards).filter((c) => hasText(c.front) || c.image);
    const wrap = h('div', { class: 'lp-dialog' });
    if (hasText(p.intro)) wrap.append(h('div', { class: 'lp-intro', html: p.intro }));
    if (!cards.length) { wrap.append(h('p', { text: 'Belum ada kartu.' })); root.append(wrap); return; }
    let idx = 0;
    const stage = h('div');
    wrap.append(stage);
    root.append(wrap);
    function render() {
      const c = cards[idx];
      stage.innerHTML = '';
      const card = h('div', { class: 'lp-fcard dialog' });
      card.append(h('div', { class: 'lp-finner' },
        h('div', { class: 'lp-fface front' }, img(c.image, '', 'lp-img'), h('div', { class: 'lp-fq', text: c.front || '' })),
        h('div', { class: 'lp-fface back' }, h('div', { class: 'lp-fq', text: c.back || '' }))));
      card.addEventListener('click', () => card.classList.toggle('flipped'));
      stage.append(h('div', { class: 'lp-counter', text: 'Kartu ' + (idx + 1) + ' / ' + cards.length }), card,
        h('div', { class: 'lp-actions center' },
          btn('‹', () => { idx = (idx - 1 + cards.length) % cards.length; render(); }),
          btn('Balik', () => card.classList.toggle('flipped'), 'primary'),
          btn('›', () => { idx = (idx + 1) % cards.length; render(); })));
    }
    render();
  };

  /* ---------------------------------------------------------- Akordeon */
  R.accordion = function (root, p) {
    const wrap = h('div', { class: 'lp-acc' });
    arr(p.panels).forEach((pn, i) => {
      const body = h('div', { class: 'lp-acc-body', html: pn.content || '' });
      const head = h('button', { type: 'button', class: 'lp-acc-head', 'aria-expanded': 'false' }, h('span', { class: 'lp-acc-ico', text: '+' }), h('span', { text: pn.title || 'Panel ' + (i + 1) }));
      const item = h('div', { class: 'lp-acc-item' }, head, body);
      head.addEventListener('click', () => {
        const open = !item.classList.contains('open');
        if (p.single) wrap.querySelectorAll('.lp-acc-item.open').forEach((x) => { x.classList.remove('open'); x.firstChild.setAttribute('aria-expanded', 'false'); x.querySelector('.lp-acc-ico').textContent = '+'; });
        item.classList.toggle('open', open); head.setAttribute('aria-expanded', open);
        head.querySelector('.lp-acc-ico').textContent = open ? '−' : '+';
      });
      wrap.append(item);
    });
    root.append(wrap);
  };

  /* -------------------------------------------------------- Kuis (Set Soal) */
  R.questionset = function (root, p, ctx) {
    const qs = arr(p.questions);
    const wrap = h('div', { class: 'lp-qs' });
    root.append(wrap);
    const pass = Number(p.passPercent) || 50;
    let results = [];
    let order = [];
    function start() {
      order = p.randomize ? shuffle(qs.map((_, i) => i)) : qs.map((_, i) => i);
      results = order.map(() => ({ score: 0, max: 1, answered: false }));
      renderQ(0);
    }
    function intro() {
      wrap.innerHTML = '';
      wrap.append(h('div', { class: 'lp-qs-intro' },
        p.introImage ? img(p.introImage) : null,
        h('h2', { text: p.introTitle || 'Kuis' }),
        hasText(p.introText) ? h('div', { html: p.introText }) : null,
        h('p', { class: 'lp-hint', text: qs.length + ' pertanyaan · Nilai lulus ' + pass + '%' }),
        btn('Mulai Kuis', start, 'primary big')));
    }
    function renderQ(i) {
      wrap.innerHTML = '';
      const dots = h('div', { class: 'lp-dots' });
      order.forEach((_, k) => dots.append(h('span', { class: 'lp-dot' + (k === i ? ' cur' : '') + (results[k].answered ? ' done' : '') })));
      const host = h('div', { class: 'lp-qs-q' });
      wrap.append(h('div', { class: 'lp-counter', text: 'Pertanyaan ' + (i + 1) + ' dari ' + order.length }), dots, host);
      const q = qs[order[i]];
      const sub = { embedded: true, result: (s, m) => { results[i] = { score: s, max: m, answered: true }; dots.children[i].classList.add('done'); } };
      const type = q.qtype || 'mc';
      const params = Object.assign({}, q, { retry: p.allowRetry !== false, showSolution: p.allowSolution !== false });
      const r = R[type] ? R[type](host, params, makeCtx(sub)) : null;
      if (r && r.max) results[i].max = r.max;
      wrap.append(h('div', { class: 'lp-actions spread' },
        i > 0 ? btn('‹ Sebelumnya', () => renderQ(i - 1)) : h('span'),
        i < order.length - 1 ? btn('Berikutnya ›', () => renderQ(i + 1), 'primary') : btn('Selesai', finish, 'primary')));
    }
    function finish() {
      const score = results.reduce((a, r) => a + r.score, 0);
      const max = results.reduce((a, r) => a + r.max, 0);
      const pct = max ? Math.round((score / max) * 100) : 0;
      const passed = pct >= pass;
      wrap.innerHTML = '';
      wrap.append(h('div', { class: 'lp-qs-end' },
        h('div', { class: 'lp-big-ico', text: passed ? '🏆' : '📘' }),
        h('h2', { text: passed ? (p.passText || 'Selamat, Anda lulus!') : (p.failText || 'Belum lulus, coba lagi!') }),
        scoreBar(score, max),
        h('table', { class: 'lp-table' },
          h('thead', null, h('tr', null, h('th', { text: '#' }), h('th', { text: 'Pertanyaan' }), h('th', { text: 'Skor' }))),
          h('tbody', null, order.map((qi, k) => h('tr', null, h('td', { text: k + 1 }), h('td', { text: (qs[qi].question || qs[qi].text || '').replace(/\*([^*]*)\*/g, '$1').replace(/:[^*\s]*/g, '').slice(0, 80) }), h('td', { text: (results[k].answered ? results[k].score : 0) + '/' + results[k].max }))))),
        h('div', { class: 'lp-actions center' }, btn('Ulangi Kuis', start, 'primary'))));
      ctx.result(score, max, { passed: passed });
    }
    if (p.skipIntro) start(); else intro();
  };

  /* ---------------------------------------------------- Set Pilihan Tunggal */
  R.singlechoice = function (root, p, ctx) {
    const items = arr(p.items).filter((it) => hasText(it.question) && arr(it.answers).length);
    const wrap = h('div', { class: 'lp-scs' });
    root.append(wrap);
    let idx = 0, score = 0;
    function render() {
      wrap.innerHTML = '';
      if (idx >= items.length) {
        wrap.append(h('div', { class: 'lp-qs-end' }, h('div', { class: 'lp-big-ico', text: '🎯' }), h('h2', { text: 'Hasil' }), scoreBar(score, items.length),
          h('div', { class: 'lp-actions center' }, btn('Ulangi', () => { idx = 0; score = 0; render(); }, 'primary'))));
        ctx.result(score, items.length);
        return;
      }
      const it = items[idx];
      const correct = it.answers[0].text;
      const prog = h('div', { class: 'lp-score-track' }, h('div', { class: 'lp-score-fill', style: { width: (idx / items.length) * 100 + '%' } }));
      const grid = h('div', { class: 'lp-scs-grid' });
      let answered = false;
      shuffle(it.answers.filter((a) => hasText(a.text))).forEach((a) => {
        const b = h('button', { type: 'button', class: 'lp-scs-opt', text: a.text });
        b.addEventListener('click', () => {
          if (answered) return; answered = true;
          const ok = a.text === correct;
          if (ok) score++;
          b.classList.add(ok ? 'correct' : 'wrong');
          if (!ok) grid.querySelectorAll('button').forEach((x) => { if (x.textContent === correct) x.classList.add('solution'); });
          setTimeout(() => { idx++; render(); }, ok ? 900 : 1700);
        });
        grid.append(b);
      });
      wrap.append(prog, h('div', { class: 'lp-counter', text: (idx + 1) + ' / ' + items.length }), h('div', { class: 'lp-question', text: it.question }), grid);
    }
    render();
  };

  /* ------------------------------------------------------------ Ringkasan */
  R.summary = function (root, p, ctx) {
    const groups = arr(p.groups).map((g) => arr(g.statements).map((s) => s.text).filter(hasText)).filter((g) => g.length);
    const wrap = h('div', { class: 'lp-summary' });
    if (hasText(p.intro)) wrap.append(h('div', { class: 'lp-intro', html: p.intro }));
    const chosen = h('ul', { class: 'lp-sum-chosen' });
    const stage = h('div');
    wrap.append(stage, chosen);
    root.append(wrap);
    let idx = 0, mistakes = 0;
    function render() {
      stage.innerHTML = '';
      if (idx >= groups.length) {
        const score = Math.max(0, groups.length - mistakes);
        stage.append(h('div', { class: 'lp-feedback ok', text: 'Selesai! Kesalahan: ' + mistakes }), scoreBar(score, groups.length),
          h('div', { class: 'lp-actions' }, btn('Ulangi', () => { idx = 0; mistakes = 0; chosen.innerHTML = ''; render(); })));
        ctx.result(score, groups.length);
        return;
      }
      const g = groups[idx];
      stage.append(h('div', { class: 'lp-counter', text: 'Langkah ' + (idx + 1) + ' dari ' + groups.length + ' — pilih pernyataan yang benar' }));
      const list = h('div', { class: 'lp-options' });
      shuffle(g).forEach((s) => {
        const b = h('button', { type: 'button', class: 'lp-option lp-sum-opt', text: s });
        b.addEventListener('click', () => {
          if (s === g[0]) { chosen.append(h('li', { text: s })); idx++; render(); }
          else if (!b.classList.contains('wrong')) { mistakes++; b.classList.add('wrong'); b.disabled = true; }
        });
        list.append(b);
      });
      stage.append(list);
    }
    render();
  };

  /* -------------------------------------------------------------- Esai */
  R.essay = function (root, p, ctx) {
    const kws = arr(p.keywords).filter((k) => hasText(k.keyword));
    const max = kws.reduce((a, k) => a + (Number(k.points) || 1), 0) || 1;
    const wrap = h('div', { class: 'lp-essay' });
    wrap.append(h('div', { class: 'lp-intro', html: p.task || '' }));
    const ta = h('textarea', { class: 'lp-input', rows: '8', placeholder: p.placeholder || 'Tulis jawaban Anda di sini…' });
    const counter = h('div', { class: 'lp-hint' });
    const minC = Number(p.minChars) || 0, maxC = Number(p.maxChars) || 0;
    function upd() { counter.textContent = ta.value.length + ' karakter' + (minC ? ' · minimal ' + minC : '') + (maxC ? ' · maksimal ' + maxC : ''); }
    ta.addEventListener('input', upd); upd();
    if (maxC) ta.setAttribute('maxlength', maxC);
    const fbEl = h('div', { class: 'lp-feedback' });
    const bar = h('div', { class: 'lp-actions' });
    wrap.append(ta, counter, fbEl, bar);
    root.append(wrap);
    let checked = false;
    function check() {
      if (ta.value.length < minC) { feedback(fbEl, null, 'Jawaban minimal ' + minC + ' karakter.'); return; }
      checked = true; ta.disabled = true;
      const txt = norm(ta.value);
      let score = 0; const found = [], missing = [];
      kws.forEach((k) => {
        const alts = [k.keyword].concat(String(k.alternatives || '').split(',')).map((x) => norm(x)).filter(Boolean);
        if (alts.some((a) => txt.indexOf(a) >= 0)) { score += Number(k.points) || 1; found.push(k); } else missing.push(k);
      });
      score = Math.min(score, max);
      const pct = Math.round((score / max) * 100);
      const pass = Number(p.passPercent) || 50;
      feedback(fbEl, pct >= pass, pct >= pass ? 'Jawaban Anda sudah mencakup poin penting.' : 'Jawaban Anda masih kurang lengkap.');
      const fl = h('div', { class: 'lp-kw' });
      found.forEach((k) => fl.append(h('span', { class: 'lp-tag ok', text: '✔ ' + k.keyword })));
      missing.forEach((k) => fl.append(h('span', { class: 'lp-tag', text: '○ ' + (k.feedbackMissed || '?') })));
      fbEl.append(fl, scoreBar(score, max));
      if (hasText(p.sample)) fbEl.append(h('details', { class: 'lp-sample' }, h('summary', { text: 'Contoh jawaban' }), h('div', { html: p.sample })));
      ctx.result(score, max);
      bar.innerHTML = '';
      bar.append(btn('Coba lagi', () => { checked = false; ta.disabled = false; fbEl.className = 'lp-feedback'; fbEl.innerHTML = ''; renderBar(); }));
    }
    function renderBar() { bar.innerHTML = ''; if (!checked) bar.append(btn('Periksa', check, 'primary')); }
    renderBar();
    return { check: check, max: max };
  };

  /* ------------------------------------------------------- Gambar Hotspot */
  R.hotspots = function (root, p) {
    const wrap = h('div', { class: 'lp-hot' });
    if (!p.image) { wrap.append(h('p', { class: 'lp-hint', text: 'Tambahkan gambar latar.' })); root.append(wrap); return; }
    const stage = h('div', { class: 'lp-hot-stage' }, img(p.image, p.alt || '', 'lp-hot-img'));
    const pop = h('div', { class: 'lp-hot-pop', hidden: true });
    arr(p.hotspots).forEach((s, i) => {
      const b = h('button', { type: 'button', class: 'lp-hot-btn', style: { left: (Number(s.x) || 0) + '%', top: (Number(s.y) || 0) + '%', background: p.color || '' }, 'aria-label': s.title || 'Hotspot ' + (i + 1), text: p.icon === 'number' ? String(i + 1) : p.icon === 'info' ? 'i' : '+' });
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        pop.hidden = false; pop.innerHTML = '';
        put(pop, h('button', { type: 'button', class: 'lp-close', 'aria-label': 'Tutup', onClick: () => (pop.hidden = true) }, '×'),
          s.title ? h('h3', { text: s.title }) : null, img(s.image), h('div', { html: s.content || '' }));
        stage.querySelectorAll('.lp-hot-btn').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
      });
      stage.append(b);
    });
    stage.addEventListener('click', () => (pop.hidden = true));
    stage.append(pop);
    wrap.append(stage);
    root.append(wrap);
  };

  /* --------------------------------------------------- Presentasi Kursus */
  R.presentation = function (root, p, ctx) {
    const slides = arr(p.slides);
    const wrap = h('div', { class: 'lp-pres' });
    root.append(wrap);
    if (!slides.length) { wrap.append(h('p', { text: 'Belum ada slide.' })); return; }
    let idx = 0;
    const scores = slides.map(() => null);
    const view = h('div', { class: 'lp-slide-view' });
    const nav = h('div', { class: 'lp-pres-nav' });
    const prog = h('div', { class: 'lp-pres-prog' });
    wrap.append(view, prog, nav);
    function render() {
      const s = slides[idx];
      view.innerHTML = '';
      const slide = h('div', { class: 'lp-slide lp-layout-' + (s.layout || 'top'), style: { background: s.bg || '', color: s.fg || '' } });
      if (s.title) slide.append(h('h2', { class: 'lp-slide-title', text: s.title }));
      const cols = h('div', { class: 'lp-slide-cols' });
      const txt = hasText(s.content) ? h('div', { class: 'lp-slide-text', html: s.content }) : null;
      put(cols, txt, img(s.image, '', 'lp-img lp-slide-img'));
      slide.append(cols);
      if (s.hasQuiz && hasText(s.quizQuestion)) {
        const host = h('div', { class: 'lp-slide-quiz' });
        R.mc(host, { question: s.quizQuestion, answers: s.quizAnswers, retry: true }, makeCtx({ embedded: true, result: (sc, m) => (scores[idx] = { s: sc, m: m }) }));
        slide.append(host);
      }
      view.append(slide);
      prog.innerHTML = '';
      slides.forEach((x, k) => prog.append(h('button', { type: 'button', class: 'lp-pdot' + (k === idx ? ' cur' : '') + (x.hasQuiz ? ' quiz' : ''), title: x.title || 'Slide ' + (k + 1), onClick: () => { idx = k; render(); } })));
      nav.innerHTML = '';
      nav.append(btn('‹', () => { if (idx > 0) { idx--; render(); } }, idx === 0 ? 'disabled' : ''),
        h('span', { class: 'lp-counter', text: (idx + 1) + ' / ' + slides.length }),
        btn('›', () => { if (idx < slides.length - 1) { idx++; render(); } else summary(); }),
        btn('⛶', () => { const el = wrap; if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen(); }, 'ghost'));
    }
    function summary() {
      const qi = slides.map((s, k) => k).filter((k) => slides[k].hasQuiz && hasText(slides[k].quizQuestion));
      if (!qi.length) return;
      const score = qi.reduce((a, k) => a + (scores[k] ? scores[k].s : 0), 0);
      const max = qi.reduce((a, k) => a + (scores[k] ? scores[k].m : 1), 0);
      view.innerHTML = '';
      view.append(h('div', { class: 'lp-slide' }, h('h2', { class: 'lp-slide-title', text: 'Ringkasan' }), scoreBar(score, max),
        h('div', { class: 'lp-actions' }, btn('Kembali ke awal', () => { idx = 0; render(); }, 'primary'))));
      ctx.result(score, max);
    }
    wrap.tabIndex = 0;
    wrap.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' && idx < slides.length - 1) { idx++; render(); }
      if (e.key === 'ArrowLeft' && idx > 0) { idx--; render(); }
    });
    render();
  };

  /* --------------------------------------------------- Video Interaktif */
  function ytId(url) {
    const u = String(url || '').trim();
    if (/^[\w-]{11}$/.test(u)) return u;
    const m = u.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/|v\/|e\/))([\w-]{11})/i);
    return m ? m[1] : null;
  }
  function ytStart(url) {
    const m = String(url || '').match(/[?&#](?:t|start)=(\d+h)?(\d+m)?(\d+)s?/);
    if (!m) return 0;
    return (parseInt(m[1]) || 0) * 3600 + (parseInt(m[2]) || 0) * 60 + (parseInt(m[3]) || 0);
  }
  let ytApi = null;
  function loadYT() {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    if (ytApi) return ytApi;
    ytApi = new Promise((res, rej) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () { if (prev) try { prev(); } catch (e) { /* abaikan */ } res(window.YT); };
      const sc = document.createElement('script');
      sc.src = 'https://www.youtube.com/iframe_api';
      sc.async = true;
      sc.onerror = () => { ytApi = null; rej(new Error('YouTube API gagal dimuat')); };
      document.head.append(sc);
      setTimeout(() => { if (!(window.YT && window.YT.Player)) rej(new Error('timeout')); }, 12000);
    });
    return ytApi;
  }

  /* Adapter pemutar: HTML5 <video> atau YouTube, dengan API yang sama */
  function html5Adapter(host, src, poster) {
    const v = h('video', { class: 'lp-video', src: src, poster: poster || null, controls: true, playsinline: true, preload: 'metadata' });
    host.append(v);
    const a = { tick: null, ended: null, error: null,
      play: () => { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); }, pause: () => v.pause(),
      seek: (t) => { v.currentTime = t; }, time: () => v.currentTime || 0 };
    v.addEventListener('timeupdate', () => a.tick && a.tick(v.currentTime));
    v.addEventListener('ended', () => a.ended && a.ended());
    v.addEventListener('error', () => a.error && a.error('Video tidak dapat dimuat. Periksa URL (harus tautan langsung ke berkas MP4/WebM) atau gunakan tautan YouTube.'));
    return a;
  }
  function ytAdapter(host, id, start, wrap) {
    const box = h('div', { class: 'lp-yt' });
    const target = h('div');
    box.append(target);
    host.append(box);
    let player = null, timer = null, queued = [];
    const a = { tick: null, ended: null, error: null,
      play: () => (player && player.playVideo ? player.playVideo() : queued.push('play')),
      pause: () => player && player.pauseVideo && player.pauseVideo(),
      seek: (t) => { if (player && player.seekTo) player.seekTo(t, true); },
      time: () => (player && player.getCurrentTime ? player.getCurrentTime() || 0 : 0) };
    function fallback() {
      box.innerHTML = '';
      box.append(h('iframe', { src: 'https://www.youtube-nocookie.com/embed/' + id + (start ? '?start=' + start : ''), allowfullscreen: true, title: 'Video YouTube', frameborder: '0', allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen' }));
      if (a.error) a.error('Interaksi berbasis waktu tidak aktif karena YouTube API tidak dapat dimuat (periksa koneksi internet).', true);
    }
    loadYT().then((YT) => {
      if (!document.body.contains(box)) return;
      player = new YT.Player(target, {
        videoId: id, width: '100%', height: '100%',
        playerVars: Object.assign({ rel: 0, modestbranding: 1, playsinline: 1, start: start || 0 }, location.protocol.indexOf('http') === 0 ? { origin: location.origin } : {}),
        events: {
          onReady: () => { queued.forEach((q) => q === 'play' && player.playVideo()); queued = []; },
          onStateChange: (e) => {
            if (e.data === 1) { clearInterval(timer); timer = setInterval(() => { if (!document.body.contains(box)) { clearInterval(timer); try { player.destroy(); } catch (x) { /* abaikan */ } return; } if (a.tick) a.tick(a.time()); }, 250); }
            else { clearInterval(timer); if (a.tick) a.tick(a.time()); }
            if (e.data === 0 && a.ended) a.ended();
          },
          onError: (e) => { if (a.error) a.error({ 2: 'ID video YouTube tidak valid.', 5: 'Video tidak dapat diputar di pemutar HTML5.', 100: 'Video YouTube tidak ditemukan atau bersifat privat.', 101: 'Pemilik video tidak mengizinkan video ini disematkan.', 150: 'Pemilik video tidak mengizinkan video ini disematkan.', 153: 'YouTube menolak pemutaran dari halaman lokal (file://). Buka melalui server web atau unggah ke situs/LMS.' }[e.data] || 'Video YouTube gagal diputar (kode ' + e.data + ').'); },
        },
      });
    }).catch(fallback);
    return a;
  }

  R.ivideo = function (root, p, ctx) {
    const wrap = h('div', { class: 'lp-ivideo' });
    root.append(wrap);
    const src = String(p.video || '').trim();
    if (!src) { wrap.append(h('p', { class: 'lp-hint', text: 'Masukkan tautan YouTube, URL video MP4/WebM, atau unggah berkas video.' })); return; }
    const ints = arr(p.interactions).map((x, i) => Object.assign({ _i: i, _shown: false }, x)).sort((a, b) => (Number(a.time) || 0) - (Number(b.time) || 0));
    const scores = {};
    const overlay = h('div', { class: 'lp-vo', hidden: true });
    const media = h('div', { class: 'lp-vmedia' });
    const stage = h('div', { class: 'lp-vstage' }, media, overlay);
    const note = h('div', { class: 'lp-feedback', hidden: true });
    const markers = h('div', { class: 'lp-vmarkers' });
    wrap.append(stage, note, markers);
    const yid = ytId(src);
    const player = yid ? ytAdapter(media, yid, ytStart(src), wrap) : html5Adapter(media, src, p.poster);
    player.error = (msg, info) => { note.hidden = false; note.className = 'lp-feedback ' + (info ? 'info' : 'bad'); note.textContent = msg; };
    ints.forEach((it) => {
      markers.append(h('button', { type: 'button', class: 'lp-chip', onClick: () => { player.seek(Number(it.time) || 0); lastT = Number(it.time) || 0; show(it); } }, fmtTime(it.time) + ' · ' + (it.title || (it.kind === 'text' ? 'Info' : 'Pertanyaan'))));
    });
    let lastT = 0;
    player.tick = (t) => {
      if (!overlay.hidden) return;
      if (t < lastT - 1) ints.forEach((it) => { if ((Number(it.time) || 0) > t) it._shown = false; });
      for (const it of ints) { const at = Number(it.time) || 0; if (!it._shown && at <= t && at > lastT - 1.2) { show(it); break; } }
      lastT = t;
    };
    player.ended = () => {
      const keys = ints.filter((i) => i.kind === 'mc' || i.kind === 'tf');
      if (!keys.length) return;
      const s = keys.reduce((a, i) => a + (scores[i._i] ? scores[i._i].s : 0), 0);
      const m = keys.reduce((a, i) => a + (scores[i._i] ? scores[i._i].m : 1), 0);
      overlay.hidden = false; overlay.innerHTML = '';
      overlay.append(h('div', { class: 'lp-vo-card' }, h('h3', { text: 'Video selesai' }), scoreBar(s, m), h('div', { class: 'lp-actions' }, btn('Tutup', () => (overlay.hidden = true), 'primary'))));
      ctx.result(s, m);
    };
    function show(it) {
      it._shown = true;
      player.pause();
      overlay.hidden = false; overlay.innerHTML = '';
      const card = h('div', { class: 'lp-vo-card' });
      if (it.title) card.append(h('h3', { text: it.title }));
      if (it.kind === 'mc') R.mc(card, { question: it.question, answers: it.answers, retry: true }, makeCtx({ result: (s, m) => (scores[it._i] = { s: s, m: m }) }));
      else if (it.kind === 'tf') R.tf(card, { question: it.question, correct: it.correct }, makeCtx({ result: (s, m) => (scores[it._i] = { s: s, m: m }) }));
      else put(card, h('div', { html: it.content || '' }), img(it.image));
      card.append(h('div', { class: 'lp-actions' }, btn('Lanjutkan ▶', () => { overlay.hidden = true; player.play(); }, 'primary')));
      overlay.append(card);
    }
  };
  R.ivideo.ytId = ytId;

  /* --------------------------------------------------------- Slider Gambar */
  R.slider = function (root, p) {
    const slides = arr(p.slides).filter((s) => s.image);
    const wrap = h('div', { class: 'lp-slider' });
    root.append(wrap);
    if (!slides.length) { wrap.append(h('p', { class: 'lp-hint', text: 'Tambahkan gambar.' })); return; }
    let idx = 0, timer = null;
    const view = h('div', { class: 'lp-slider-view' });
    const dots = h('div', { class: 'lp-dots center' });
    wrap.append(view, dots);
    function render() {
      const s = slides[idx];
      view.innerHTML = '';
      put(view, img(s.image, s.alt || s.caption || '', 'lp-slider-img'),
        hasText(s.caption) ? h('div', { class: 'lp-caption', text: s.caption }) : null,
        h('button', { type: 'button', class: 'lp-snav prev', 'aria-label': 'Sebelumnya', onClick: () => go(-1) }, '‹'),
        h('button', { type: 'button', class: 'lp-snav next', 'aria-label': 'Berikutnya', onClick: () => go(1) }, '›'));
      dots.innerHTML = '';
      slides.forEach((_, k) => dots.append(h('button', { type: 'button', class: 'lp-dot' + (k === idx ? ' cur' : ''), 'aria-label': 'Slide ' + (k + 1), onClick: () => { idx = k; render(); } })));
    }
    function go(d) { idx = (idx + d + slides.length) % slides.length; render(); }
    if (p.autoplay) { timer = setInterval(() => { if (!document.body.contains(wrap)) clearInterval(timer); else go(1); }, (Number(p.interval) || 4) * 1000); }
    render();
  };

  /* -------------------------------------------------------- Permainan Memori */
  R.memory = function (root, p, ctx) {
    const pairs = arr(p.cards).filter((c) => hasText(c.text) || c.image);
    const wrap = h('div', { class: 'lp-memory' });
    root.append(wrap);
    if (pairs.length < 2) { wrap.append(h('p', { class: 'lp-hint', text: 'Tambahkan minimal 2 pasang kartu.' })); return; }
    let moves, matched, open, lock, t0, timerId;
    const stats = h('div', { class: 'lp-mem-stats' });
    const grid = h('div', { class: 'lp-mem-grid' });
    wrap.append(stats, grid);
    function setup() {
      moves = 0; matched = 0; open = []; lock = false; t0 = Date.now();
      clearInterval(timerId);
      timerId = setInterval(() => { if (!document.body.contains(wrap)) clearInterval(timerId); else upd(); }, 1000);
      const deck = [];
      pairs.forEach((c, i) => {
        deck.push({ id: i, text: c.text, image: c.image });
        deck.push({ id: i, text: hasText(c.matchText) || c.matchImage ? c.matchText : c.text, image: hasText(c.matchText) || c.matchImage ? c.matchImage : c.image });
      });
      grid.innerHTML = '';
      grid.style.gridTemplateColumns = 'repeat(' + Math.min(6, Math.ceil(Math.sqrt(deck.length))) + ', 1fr)';
      shuffle(deck).forEach((d) => {
        const card = h('button', { type: 'button', class: 'lp-mem-card', 'aria-label': 'Kartu' },
          h('span', { class: 'lp-mem-back', text: '?' }),
          h('span', { class: 'lp-mem-front' }, img(d.image, '', 'lp-mem-img'), hasText(d.text) ? h('span', { text: d.text }) : null));
        card.addEventListener('click', () => flip(card, d));
        grid.append(card);
      });
      upd();
    }
    function upd() { stats.textContent = 'Langkah: ' + moves + ' · Pasangan: ' + matched + '/' + pairs.length + ' · Waktu: ' + fmtTime((Date.now() - t0) / 1000); }
    function flip(card, d) {
      if (lock || card.classList.contains('open') || card.classList.contains('done')) return;
      card.classList.add('open'); open.push({ card: card, d: d });
      if (open.length === 2) {
        moves++;
        const [a, b] = open;
        if (a.d.id === b.d.id) {
          a.card.classList.add('done'); b.card.classList.add('done'); open = []; matched++;
          if (matched === pairs.length) {
            clearInterval(timerId); upd();
            wrap.append(h('div', { class: 'lp-feedback ok', text: 'Selamat! Selesai dalam ' + moves + ' langkah.' }), h('div', { class: 'lp-actions center' }, btn('Main lagi', () => { wrap.querySelectorAll('.lp-feedback, .lp-actions').forEach((x) => x.remove()); setup(); }, 'primary')));
            ctx.result(pairs.length, pairs.length, { moves: moves });
          }
        } else {
          lock = true;
          setTimeout(() => { a.card.classList.remove('open'); b.card.classList.remove('open'); open = []; lock = false; }, 900);
        }
      }
      upd();
    }
    setup();
  };

  /* ---------------------------------------------------------- Tebak Jawaban */
  R.guess = function (root, p) {
    const sol = h('div', { class: 'lp-guess-sol', hidden: true, text: p.solution || '' });
    root.append(h('div', { class: 'lp-guess' },
      h('div', { class: 'lp-question', text: p.question || '' }), img(p.image),
      h('div', { class: 'lp-actions center' }, btn('Lihat jawaban', function () { sol.hidden = !sol.hidden; this.textContent = sol.hidden ? 'Lihat jawaban' : 'Sembunyikan'; }, 'primary')), sol));
  };

  /* -------------------------------------------------------- Urutkan Paragraf */
  R.sortpar = function (root, p, ctx) {
    const paras = arr(p.paragraphs).map((x) => x.text).filter(hasText);
    const wrap = h('div', { class: 'lp-sort' });
    if (hasText(p.intro)) wrap.append(h('div', { class: 'lp-intro', html: p.intro }));
    root.append(wrap);
    if (paras.length < 2) { wrap.append(h('p', { class: 'lp-hint', text: 'Tambahkan minimal 2 paragraf.' })); return; }
    const list = h('ol', { class: 'lp-sort-list' });
    const fbEl = h('div', { class: 'lp-feedback' });
    const bar = h('div', { class: 'lp-actions' });
    wrap.append(list, fbEl, bar);
    let checked = false, dragEl = null;
    function fill() {
      list.innerHTML = '';
      let order = shuffle(paras.map((_, i) => i));
      let guard = 0;
      while (order.every((v, i) => v === i) && guard++ < 10) order = shuffle(order);
      order.forEach((i) => list.append(item(i)));
    }
    function item(i) {
      const li = h('li', { class: 'lp-sort-item', draggable: 'true', 'data-i': i },
        h('span', { class: 'lp-grip', text: '⋮⋮' }), h('span', { class: 'lp-sort-text', text: paras[i] }),
        h('span', { class: 'lp-sort-btns' },
          h('button', { type: 'button', class: 'lp-mini', 'aria-label': 'Naik', onClick: () => { if (!checked && li.previousSibling) list.insertBefore(li, li.previousSibling); } }, '▲'),
          h('button', { type: 'button', class: 'lp-mini', 'aria-label': 'Turun', onClick: () => { if (!checked && li.nextSibling) list.insertBefore(li.nextSibling, li); } }, '▼')));
      li.addEventListener('dragstart', () => { if (checked) return; dragEl = li; li.classList.add('dragging'); });
      li.addEventListener('dragend', () => { li.classList.remove('dragging'); dragEl = null; });
      li.addEventListener('dragover', (e) => {
        e.preventDefault(); if (!dragEl || dragEl === li) return;
        const r = li.getBoundingClientRect();
        list.insertBefore(dragEl, e.clientY < r.top + r.height / 2 ? li : li.nextSibling);
      });
      return li;
    }
    function check() {
      checked = true; let score = 0;
      Array.from(list.children).forEach((li, pos) => {
        const ok = Number(li.getAttribute('data-i')) === pos;
        li.classList.add(ok ? 'correct' : 'wrong'); if (ok) score++;
      });
      feedback(fbEl, score === paras.length, score === paras.length ? 'Urutan sudah benar!' : 'Urutan belum tepat.');
      fbEl.append(scoreBar(score, paras.length));
      ctx.result(score, paras.length);
      bar.innerHTML = '';
      if (score < paras.length) bar.append(btn('Tampilkan jawaban', () => { list.innerHTML = ''; paras.forEach((_, i) => { const li = item(i); li.classList.add('solution'); list.append(li); }); }));
      bar.append(btn('Coba lagi', () => { checked = false; fbEl.className = 'lp-feedback'; fbEl.innerHTML = ''; fill(); bar.innerHTML = ''; bar.append(btn('Periksa', check, 'primary')); }));
    }
    fill();
    bar.append(btn('Periksa', check, 'primary'));
  };

  /* ------------------------------------------------------------- Grafik */
  R.chart = function (root, p) {
    const items = arr(p.items).filter((x) => hasText(x.label));
    const palette = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];
    const wrap = h('div', { class: 'lp-chart' });
    if (p.title) wrap.append(h('h3', { class: 'lp-chart-title', text: p.title }));
    root.append(wrap);
    if (!items.length) { wrap.append(h('p', { class: 'lp-hint', text: 'Tambahkan data.' })); return; }
    const NS = 'http://www.w3.org/2000/svg';
    const sv = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
    const vals = items.map((x) => Math.max(0, Number(x.value) || 0));
    const total = vals.reduce((a, b) => a + b, 0) || 1;
    const color = (i) => items[i].color || palette[i % palette.length];
    let svg;
    if (p.chartType === 'pie') {
      svg = sv('svg', { viewBox: '-110 -110 220 220', class: 'lp-svg pie', role: 'img', 'aria-label': p.title || 'Diagram lingkaran' });
      let a0 = -Math.PI / 2;
      vals.forEach((v, i) => {
        const a1 = a0 + (v / total) * Math.PI * 2;
        const large = a1 - a0 > Math.PI ? 1 : 0;
        const path = vals.filter((x) => x > 0).length === 1 && v > 0
          ? sv('circle', { r: 100, fill: color(i) })
          : sv('path', { d: 'M0,0 L' + 100 * Math.cos(a0) + ',' + 100 * Math.sin(a0) + ' A100,100 0 ' + large + ' 1 ' + 100 * Math.cos(a1) + ',' + 100 * Math.sin(a1) + ' Z', fill: color(i), stroke: '#fff', 'stroke-width': 2 });
        const t = document.createElementNS(NS, 'title'); t.textContent = items[i].label + ': ' + v; path.append(t);
        svg.append(path); a0 = a1;
      });
    } else {
      const maxV = Math.max.apply(null, vals) || 1;
      const W = 600, H = 300, pad = 40, bw = (W - pad * 2) / items.length;
      svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + (H + 40), class: 'lp-svg bar', role: 'img', 'aria-label': p.title || 'Diagram batang' });
      svg.append(sv('line', { x1: pad, y1: H, x2: W - pad, y2: H, stroke: 'currentColor', 'stroke-opacity': 0.3 }));
      vals.forEach((v, i) => {
        const bh = (v / maxV) * (H - 30);
        const x = pad + i * bw + bw * 0.15;
        const r = sv('rect', { x: x, y: H - bh, width: bw * 0.7, height: bh, rx: 4, fill: color(i) });
        const t = document.createElementNS(NS, 'title'); t.textContent = items[i].label + ': ' + v; r.append(t);
        const val = sv('text', { x: x + bw * 0.35, y: H - bh - 6, 'text-anchor': 'middle', 'font-size': 14, fill: 'currentColor' }); val.textContent = v;
        const lab = sv('text', { x: x + bw * 0.35, y: H + 22, 'text-anchor': 'middle', 'font-size': 14, fill: 'currentColor' }); lab.textContent = items[i].label;
        svg.append(r, val, lab);
      });
    }
    wrap.append(svg);
    const legend = h('div', { class: 'lp-legend' });
    items.forEach((x, i) => legend.append(h('span', { class: 'lp-leg' }, h('i', { style: { background: color(i) } }), x.label + ' (' + vals[i] + (p.chartType === 'pie' ? ', ' + Math.round((vals[i] / total) * 100) + '%' : '') + ')')));
    wrap.append(legend);
  };

  /* -------------------------------------------------------- Teks / Halaman */
  R.text = function (root, p) {
    root.append(h('div', { class: 'lp-page' }, p.image ? img(p.image) : null, h('div', { class: 'lp-page-body', html: p.content || '' })));
  };

  /* ============================================================== API */
  let cssInjected = false;
  function injectCss() {
    if (cssInjected || document.getElementById('lumi-player-css')) { cssInjected = true; return; }
    const st = document.createElement('style');
    st.id = 'lumi-player-css';
    st.textContent = LumiPlayerFactory.CSS || '';
    document.head.append(st);
    cssInjected = true;
  }

  function render(container, content, opts) {
    opts = opts || {};
    injectCss();
    container.innerHTML = '';
    const root = h('div', { class: 'lp' });
    if (content.settings && content.settings.accent) root.style.setProperty('--lp-accent', content.settings.accent);
    if (opts.showTitle !== false && content.title) root.append(h('h1', { class: 'lp-title', text: content.title }));
    const body = h('div', { class: 'lp-body' });
    root.append(body);
    container.append(root);
    const fn = R[content.type];
    if (!fn) { body.append(h('p', { text: 'Tipe konten tidak dikenal: ' + content.type })); return; }
    try {
      fn(body, content.params || {}, makeCtx({ result: function (s, m, extra) { if (opts.onResult) opts.onResult(s, m, extra || {}); } }));
    } catch (e) {
      body.append(h('pre', { class: 'lp-feedback bad', text: 'Gagal menampilkan konten: ' + e.message }));
      if (window.console) console.error(e);
    }
    const meta = content.meta || {};
    if (opts.showMeta !== false && (meta.author || meta.license)) {
      root.append(h('div', { class: 'lp-footer', text: [meta.author ? 'Penulis: ' + meta.author : '', meta.license ? 'Lisensi: ' + meta.license : ''].filter(Boolean).join(' · ') }));
    }
  }

  return { render: render, sanitize: sanitize, renderers: R, ytId: ytId, version: '1.1.0' };
}

LumiPlayerFactory.CSS = `
.lp{--lp-accent:#22318f;--lp-hl:#ffe14d;--lp-hl-soft:#fff6c2;--lp-ok:#15803d;--lp-okbg:#ecfdf3;--lp-bad:#b42318;--lp-badbg:#fef3f2;--lp-bd:#e4e4e7;--lp-soft:#f4f4f5;font:16px/1.65 "Atkinson Hyperlegible",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#18181b;max-width:100%;-webkit-font-smoothing:antialiased}
.lp *{box-sizing:border-box}
.lp-title{font:800 1.6rem/1.2 "Schibsted Grotesk",ui-sans-serif,system-ui,sans-serif;letter-spacing:-.025em;margin:0 0 1.1rem}
.lp-img{max-width:100%;height:auto;border-radius:12px;display:block;margin:.5rem 0 1rem}
.lp-qimg{max-height:320px}
.lp-question{font:700 1.15rem/1.4 "Schibsted Grotesk",ui-sans-serif,system-ui,sans-serif;letter-spacing:-.01em;margin:.25rem 0 1rem}
.lp-intro{margin:0 0 .8rem}
.lp-hint{font-size:.86rem;color:#71717a;margin:.3rem 0}
.lp-btn{font:600 .92rem/1 "Schibsted Grotesk",ui-sans-serif,system-ui,sans-serif;height:40px;padding:0 1.1rem;border-radius:10px;border:1px solid var(--lp-bd);background:#fff;color:inherit;cursor:pointer;transition:background .15s,transform .05s,box-shadow .15s;box-shadow:0 1px 2px rgba(0,0,0,.05)}
.lp-btn:hover{background:var(--lp-soft)}
.lp-btn:active{transform:translateY(1px)}
.lp-btn.primary{background:var(--lp-accent);border-color:var(--lp-accent);color:#fff;box-shadow:0 2px 0 color-mix(in srgb,var(--lp-accent) 75%,#000)}
.lp-btn.primary:hover{filter:brightness(1.08)}
.lp-btn.big{font-size:1rem;height:48px;padding:0 1.8rem}
.lp-btn.disabled{opacity:.4;pointer-events:none}
.lp-btn.ghost{border-color:transparent}
.lp-btn:focus-visible,.lp-option:focus-within,.lp-word:focus-visible,.lp-chip:focus-visible,.lp-zone:focus-visible{outline:3px solid var(--lp-accent);outline-offset:2px}
.lp-actions{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1.25rem;align-items:center}
.lp-actions.center{justify-content:center}
.lp-actions.spread{justify-content:space-between}
.lp-options{display:flex;flex-direction:column;gap:.5rem}
.lp-option{display:flex;align-items:center;gap:.75rem;padding:.8rem 1rem;border:1px solid var(--lp-bd);border-radius:12px;cursor:pointer;flex-wrap:wrap;background:#fff;color:inherit;font:inherit;text-align:left;transition:border-color .12s,background .12s}
.lp-option:hover{border-color:#a1a1aa;background:#fafafa}
.lp-option:has(input:checked){border-color:var(--lp-accent);background:var(--lp-hl-soft);box-shadow:0 0 0 1px var(--lp-accent)}
.lp-option input{width:1.1rem;height:1.1rem;accent-color:var(--lp-accent)}
.lp-opt-text{flex:1}
.lp-opt-fb{width:100%;font-size:.88rem;opacity:.85}
.lp-opt-fb:empty{display:none}
.lp .correct{background:var(--lp-okbg)!important;border-color:var(--lp-ok)!important;color:#14532d!important}
.lp .wrong{background:var(--lp-badbg)!important;border-color:var(--lp-bad)!important;color:#7f1d1d!important}
.lp .solution{outline:2px dashed var(--lp-ok);outline-offset:2px}
.lp-feedback{margin-top:.8rem;border-radius:8px}
.lp-feedback.ok,.lp-feedback.bad,.lp-feedback.info{padding:.85rem 1rem;border-radius:12px;font-size:.92rem}
.lp-feedback.ok{background:var(--lp-okbg);color:#14532d}
.lp-feedback.bad{background:var(--lp-badbg);color:#7f1d1d}
.lp-feedback.info{background:var(--lp-soft)}
.lp-score{margin-top:.6rem}
.lp-score-text{font-size:.92rem;margin-bottom:.3rem}
.lp-score-track{height:6px;border-radius:99px;background:rgba(0,0,0,.08);overflow:hidden}
.lp-score-fill{height:100%;background:#f59e0b;border-radius:99px;transition:width .5s}
.lp-score-fill.good{background:var(--lp-ok)}
.lp-tf-row{display:flex;gap:.6rem}
.lp-tf-btn{flex:1;font:inherit;padding:1rem;border-radius:12px;border:1px solid var(--lp-bd);background:#fff;color:inherit;cursor:pointer;font-weight:600;transition:all .12s}
.lp-tf-btn:hover{border-color:#a1a1aa}
.lp-tf-btn.sel{border-color:var(--lp-accent);background:var(--lp-hl-soft);box-shadow:0 0 0 1px var(--lp-accent)}
.lp-blank-text,.lp-drag-text,.lp-mark-text{line-height:2.3}
.lp-blank{font:inherit;padding:.1rem .5rem;border:1px solid #d4d4d8;background:#fff;color:inherit;border-radius:8px;min-width:4ch;outline:none}
.lp-blank:focus{border-color:var(--lp-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--lp-accent) 18%,transparent)}
.lp-blank.correct,.lp-blank.wrong{border-radius:4px}
.lp-blank-sol{color:var(--lp-ok);font-weight:600;margin-left:.25rem}
.lp-tip{display:inline-grid;place-items:center;width:1.2rem;height:1.2rem;border-radius:50%;background:var(--lp-accent);color:#fff;font-size:.75rem;margin-left:.2rem;cursor:help;vertical-align:middle}
.lp-zone{display:inline-block;min-width:6rem;min-height:1.9rem;padding:0 .2rem;border:1.5px dashed #a1a1aa;background:var(--lp-soft);border-radius:8px;vertical-align:middle;line-height:1.9rem;text-align:center;position:relative}
.lp-zone.over{background:rgba(37,99,235,.18)}
.lp-zone[data-sol]::after{content:"→ " attr(data-sol);font-size:.8rem;color:var(--lp-ok);font-weight:600;margin-left:.3rem}
.lp-bank{display:flex;flex-wrap:wrap;gap:.5rem;padding:1rem;background:var(--lp-soft);border-radius:12px;min-height:3rem;margin-top:.5rem}
.lp-chip{display:inline-block;padding:.3rem .8rem;border-radius:8px;background:#fff;color:#18181b;box-shadow:0 1px 2px rgba(0,0,0,.08),0 0 0 1px #d4d4d8;cursor:grab;user-select:none;font:inherit;font-size:.95rem;border:none;line-height:1.5}
.lp-chip.sel{background:var(--lp-hl);box-shadow:0 0 0 2px var(--lp-accent);color:#1b2147}
.lp-chip.dragging{opacity:.5}
.lp-zone .lp-chip{cursor:pointer}
.lp-word{cursor:pointer;padding:.05rem .15rem;border-radius:4px}
.lp-word:hover{background:var(--lp-soft)}
.lp-word.sel{background:var(--lp-hl);color:#1b2147}
.lp-counter{font-size:.88rem;opacity:.75;margin:.3rem 0 .6rem;text-align:center}
.lp-fcard{perspective:1200px;margin:0 auto;max-width:480px;min-height:260px;cursor:pointer}
.lp-finner{position:relative;width:100%;min-height:260px;transition:transform .6s;transform-style:preserve-3d}
.lp-fcard.flipped .lp-finner{transform:rotateY(180deg)}
.lp-fface{color:#111;position:absolute;inset:0;border:1px solid var(--lp-bd);border-radius:18px;padding:1.2rem;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;backface-visibility:hidden;-webkit-backface-visibility:hidden;background:var(--lp-card,#fff);box-shadow:0 6px 20px rgba(0,0,0,.08);overflow:auto}
.lp-fface.back{transform:rotateY(180deg);background:var(--lp-card2,#eff6ff)}
.lp-fface .lp-img{max-height:140px}
.lp-fq{font-size:1.2rem;font-weight:600}
.lp-flash-input{display:flex;gap:.5rem;max-width:480px;margin:1rem auto 0}
.lp-input{font:inherit;width:100%;padding:.6rem .85rem;border-radius:10px;border:1px solid #d4d4d8;background:#fff;color:inherit;outline:none}
.lp-input:focus{border-color:var(--lp-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--lp-accent) 18%,transparent)}
textarea.lp-input{resize:vertical}
.lp-acc-item{border-bottom:1px solid var(--lp-bd);overflow:hidden}
.lp-acc-item:first-child{border-top:1px solid var(--lp-bd)}
.lp-acc-head{width:100%;text-align:left;font:inherit;font-weight:600;padding:1rem .25rem;background:transparent;border:none;color:inherit;cursor:pointer;display:flex;gap:.7rem;align-items:center}
.lp-acc-ico{display:inline-grid;place-items:center;width:1.5rem;height:1.5rem;border-radius:7px;background:var(--lp-soft);color:var(--lp-accent);font-size:1rem;flex:none;order:2;margin-left:auto}
.lp-acc-body{display:none;padding:0 .25rem 1rem;color:#3f3f46}
.lp-acc-item.open .lp-acc-body{display:block}
.lp-dots{display:flex;gap:.35rem;flex-wrap:wrap;margin:.4rem 0 1rem;justify-content:center}
.lp-dot{width:12px;height:12px;border-radius:50%;background:rgba(127,127,127,.3);border:none;padding:0;cursor:pointer}
.lp-dot.done{background:var(--lp-ok)}
.lp-dot.cur{box-shadow:0 0 0 3px var(--lp-accent)}
.lp-qs-intro,.lp-qs-end{text-align:center;padding:1rem}
.lp-qs-intro .lp-img{margin:0 auto 1rem;max-height:260px}
.lp-big-ico{font-size:3.5rem}
.lp-table{width:100%;border-collapse:collapse;margin-top:1rem;font-size:.92rem;text-align:left}
.lp-table th,.lp-table td{border-bottom:1px solid var(--lp-bd);padding:.45rem .5rem}
.lp-scs-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.6rem}
.lp-scs-opt{font:inherit;padding:1.1rem;border-radius:12px;border:1px solid var(--lp-bd);background:#fff;color:inherit;cursor:pointer;font-weight:500;transition:all .12s}
.lp-scs-opt:hover{background:var(--lp-soft)}
.lp-sum-chosen{margin-top:1rem;padding-left:1.2rem}
.lp-sum-chosen li{margin:.3rem 0;color:var(--lp-ok)}
.lp-kw{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.5rem}
.lp-tag{font-size:.82rem;padding:.15rem .55rem;border-radius:99px;background:rgba(127,127,127,.18)}
.lp-tag.ok{background:#bbf7d0;color:#14532d}
.lp-sample{margin-top:.7rem}
.lp-hot-stage{position:relative;display:block;width:100%}
.lp-hot-img{display:block;width:100%;height:auto;border-radius:8px}
.lp-hot-btn{position:absolute;transform:translate(-50%,-50%);width:2.1rem;height:2.1rem;border-radius:50%;border:3px solid #fff;background:var(--lp-accent);color:#fff;font-weight:700;font-size:1.05rem;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.35);animation:lp-pulse 2s infinite}
.lp-hot-btn.active{transform:translate(-50%,-50%) scale(1.15)}
@keyframes lp-pulse{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,.7),0 2px 10px rgba(0,0,0,.35)}50%{box-shadow:0 0 0 8px rgba(255,255,255,0),0 2px 10px rgba(0,0,0,.35)}}
.lp-hot-pop{position:absolute;left:5%;right:5%;bottom:5%;max-height:70%;overflow:auto;background:var(--lp-card,#fff);color:#111;border-radius:12px;padding:1rem 1.2rem;box-shadow:0 10px 30px rgba(0,0,0,.35)}
.lp-hot-pop h3{margin:0 0 .4rem}
.lp-close{position:absolute;top:.3rem;right:.5rem;border:none;background:transparent;font-size:1.5rem;cursor:pointer;color:inherit}
.lp-slide-view{border:1px solid var(--lp-bd);border-radius:16px;overflow:hidden;aspect-ratio:16/9;display:flex}
.lp-slide{color:#111;flex:1;padding:1.5rem 2rem;overflow:auto;background:var(--lp-card,#fff)}
.lp-slide-title{margin:0 0 .8rem;font-size:1.6rem}
.lp-slide-cols{display:flex;gap:1.2rem;align-items:flex-start}
.lp-slide-cols>*{flex:1;min-width:0}
.lp-layout-top .lp-slide-cols{flex-direction:column}
.lp-layout-right .lp-slide-cols{flex-direction:row-reverse}
.lp-layout-center{text-align:center}
.lp-layout-center .lp-slide-cols{flex-direction:column;align-items:center}
.lp-slide-img{max-height:300px;object-fit:contain}
.lp-slide-quiz{margin-top:1rem;padding:1rem;border:1px dashed var(--lp-bd);border-radius:10px}
.lp-pres-prog{display:flex;gap:4px;margin:.6rem 0}
.lp-pdot{flex:1;height:6px;border-radius:3px;border:none;background:rgba(127,127,127,.25);cursor:pointer;padding:0}
.lp-pdot.cur{background:var(--lp-accent)}
.lp-pdot.quiz{outline:1px solid #f59e0b}
.lp-pres-nav{display:flex;gap:.5rem;justify-content:center;align-items:center}
.lp-pres-nav .lp-counter{margin:0 .5rem}
.lp-pres:fullscreen{background:#fff;padding:1rem;display:flex;flex-direction:column}
.lp-pres:fullscreen .lp-slide-view{flex:1;aspect-ratio:auto}
.lp-vstage{position:relative}
.lp-video{width:100%;border-radius:10px;background:#000;display:block}
.lp-vo{position:absolute;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:1rem;border-radius:10px}
.lp-vo[hidden]{display:none}
.lp-vo-card{background:var(--lp-card,#fff);color:#111;border-radius:12px;padding:1.2rem;max-width:560px;width:100%;max-height:100%;overflow:auto}
.lp-vo-card h3{margin-top:0}
.lp-vmarkers{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.6rem}
.lp-yt{position:relative;aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden}
.lp-yt iframe,.lp-yt>div{position:absolute;inset:0;width:100%;height:100%;border:0}
.lp-vo{z-index:2}
.lp-slider-view{position:relative;border-radius:12px;overflow:hidden;background:#000}
.lp-slider-img{display:block;width:100%;max-height:520px;object-fit:contain}
.lp-caption{position:absolute;left:0;right:0;bottom:0;padding:.7rem 1rem;background:linear-gradient(transparent,rgba(0,0,0,.75));color:#fff}
.lp-snav{position:absolute;top:50%;transform:translateY(-50%);width:2.6rem;height:2.6rem;border-radius:50%;border:none;background:rgba(255,255,255,.85);color:#111;font-size:1.6rem;cursor:pointer;line-height:1}
.lp-snav.prev{left:.6rem}.lp-snav.next{right:.6rem}
.lp-mem-stats{text-align:center;margin-bottom:.8rem;font-size:.92rem;opacity:.8}
.lp-mem-grid{display:grid;gap:.6rem;max-width:640px;margin:0 auto}
.lp-mem-card{position:relative;aspect-ratio:1;border:none;padding:0;border-radius:12px;cursor:pointer;font:inherit;background:transparent;perspective:600px}
.lp-mem-back,.lp-mem-front{position:absolute;inset:0;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;backface-visibility:hidden;-webkit-backface-visibility:hidden;transition:transform .45s;padding:.3rem;overflow:hidden;text-align:center;font-size:.9rem}
.lp-mem-back{background:var(--lp-accent);color:#fff;font-size:1.8rem;font-weight:700}
.lp-mem-front{background:var(--lp-card,#fff);color:#111;border:2px solid var(--lp-bd);transform:rotateY(180deg)}
.lp-mem-card.open .lp-mem-back,.lp-mem-card.done .lp-mem-back{transform:rotateY(180deg)}
.lp-mem-card.open .lp-mem-front,.lp-mem-card.done .lp-mem-front{transform:rotateY(0)}
.lp-mem-card.done .lp-mem-front{border-color:var(--lp-ok);background:var(--lp-okbg)}
.lp-mem-img{max-width:100%;max-height:70%;object-fit:contain}
.lp-guess{text-align:center}
.lp-guess .lp-img{margin:0 auto}
.lp-guess-sol{margin-top:1rem;padding:1rem;border-radius:10px;background:var(--lp-okbg);color:#14532d;font-size:1.2rem;font-weight:600}
.lp-sort-list{list-style:none;padding:0;margin:0;counter-reset:s}
.lp-sort-item{display:flex;align-items:center;gap:.7rem;padding:.8rem 1rem;margin-bottom:.5rem;border:1px solid var(--lp-bd);border-radius:12px;cursor:grab;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.04)}
.lp-sort-item.dragging{opacity:.4}
.lp-grip{opacity:.4;letter-spacing:-3px}
.lp-sort-text{flex:1}
.lp-sort-btns{display:flex;gap:.2rem}
.lp-mini{border:1px solid var(--lp-bd);background:transparent;color:inherit;border-radius:6px;cursor:pointer;font-size:.7rem;padding:.2rem .4rem}
.lp-chart{text-align:center}
.lp-svg{max-width:100%;color:inherit}
.lp-svg.pie{max-width:320px}
.lp-legend{display:flex;flex-wrap:wrap;justify-content:center;gap:.4rem 1rem;margin-top:.8rem;font-size:.9rem}
.lp-leg i{display:inline-block;width:.8rem;height:.8rem;border-radius:3px;margin-right:.35rem;vertical-align:middle}
.lp-page-body img{max-width:100%}
.lp-footer{margin-top:1.75rem;padding-top:.75rem;border-top:1px solid var(--lp-bd);font-size:.78rem;color:#a1a1aa}
@media (max-width:600px){.lp-slide{padding:1rem}.lp-slide-cols{flex-direction:column!important}.lp-slide-view{aspect-ratio:auto;min-height:300px}.lp-tf-row{flex-direction:column}}
`;

if (typeof window !== 'undefined') window.LumiPlayer = LumiPlayerFactory();
