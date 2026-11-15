/* =========================================================================
 * Editor formulir berbasis skema (mirip H5P Editor / semantics).
 * ========================================================================= */
(function () {
  'use strict';
  const sanitize = (s) => window.LumiPlayer.sanitize(s);
  const openState = new WeakMap();
  const ic = (n, sz, cls) => window.Icon(n, sz || 16, cls);

  function h(tag, props) {
    const el = document.createElement(tag);
    if (props) for (const k in props) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (let i = 2; i < arguments.length; i++) {
      const c = arguments[i];
      if (c == null || c === false) continue;
      (Array.isArray(c) ? c : [c]).forEach((x) => x != null && x !== false && el.append(x instanceof Node ? x : document.createTextNode(String(x))));
    }
    return el;
  }

  /* --------------------------------------------------- gambar & berkas */
  function readAsDataURL(file) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(file); });
  }
  async function compressImage(file, maxDim, quality) {
    const url = await readAsDataURL(file);
    if (/image\/(gif|svg)/.test(file.type)) return url;
    const imgEl = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const scale = Math.min(1, maxDim / Math.max(imgEl.width, imgEl.height));
    if (scale === 1 && file.size < 250 * 1024) return url;
    const c = document.createElement('canvas');
    c.width = Math.round(imgEl.width * scale); c.height = Math.round(imgEl.height * scale);
    const ctx = c.getContext('2d');
    const png = file.type === 'image/png' && file.size < 400 * 1024;
    if (!png) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
    ctx.drawImage(imgEl, 0, 0, c.width, c.height);
    const out = c.toDataURL(png ? 'image/png' : 'image/jpeg', quality);
    return out.length < url.length ? out : url;
  }
  function pickFile(accept) {
    return new Promise((res) => {
      const i = h('input', { type: 'file', accept: accept, style: 'display:none' });
      i.addEventListener('change', () => { res(i.files[0] || null); i.remove(); });
      document.body.append(i); i.click();
    });
  }
  function fmtBytes(n) { return n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(2) + ' MB'; }

  /* ----------------------------------------------------- rich text */
  function richText(value, onInput, tall) {
    const area = h('div', { class: 'rt-area' + (tall ? ' tall' : ''), contenteditable: 'true', role: 'textbox', 'aria-multiline': 'true' });
    area.innerHTML = sanitize(value || '');
    const cmd = (c, v) => { area.focus(); document.execCommand(c, false, v); emit(); };
    const tb = (label, title, fn) => h('button', { type: 'button', class: 'rt-btn', title: title, 'aria-label': title, onMousedown: (e) => e.preventDefault(), onClick: fn }, label);
    const toolbar = h('div', { class: 'rt-toolbar' },
      tb('B', 'Tebal (Ctrl+B)', () => cmd('bold')),
      tb(h('i', { style: 'font-family:serif;font-size:.95rem' }, 'I'), 'Miring (Ctrl+I)', () => cmd('italic')),
      tb(h('u', null, 'U'), 'Garis bawah (Ctrl+U)', () => cmd('underline')),
      tb(h('s', null, 'S'), 'Coret', () => cmd('strikeThrough')),
      h('span', { class: 'rt-sep' }),
      tb('H2', 'Judul', () => cmd('formatBlock', '<h2>')),
      tb('H3', 'Subjudul', () => cmd('formatBlock', '<h3>')),
      tb(ic('align-left'), 'Paragraf', () => cmd('formatBlock', '<p>')),
      tb(ic('quote'), 'Kutipan', () => cmd('formatBlock', '<blockquote>')),
      h('span', { class: 'rt-sep' }),
      tb(ic('list'), 'Daftar berpoin', () => cmd('insertUnorderedList')),
      tb(ic('list-ordered'), 'Daftar bernomor', () => cmd('insertOrderedList')),
      tb(ic('align-center'), 'Rata tengah', () => cmd('justifyCenter')),
      h('span', { class: 'rt-sep' }),
      tb(ic('link'), 'Sisipkan tautan', () => { const u = prompt('Alamat tautan (https://…)', 'https://'); if (u) cmd('createLink', u); }),
      tb(ic('unlink'), 'Hapus tautan', () => cmd('unlink')),
      tb(ic('image'), 'Sisipkan gambar', async () => {
        const sel = window.getSelection(); const range = sel.rangeCount ? sel.getRangeAt(0) : null;
        const f = await pickFile('image/*'); if (!f) return;
        const url = await compressImage(f, 1000, 0.82);
        area.focus(); if (range) { sel.removeAllRanges(); sel.addRange(range); }
        document.execCommand('insertImage', false, url); emit();
      }),
      tb(ic('eraser'), 'Hapus format', () => { cmd('removeFormat'); cmd('formatBlock', '<p>'); }),
    );
    function emit() { onInput(sanitize(area.innerHTML)); }
    area.addEventListener('input', emit);
    area.addEventListener('paste', (e) => {
      e.preventDefault();
      const html = e.clipboardData.getData('text/html');
      const text = e.clipboardData.getData('text/plain');
      if (html) document.execCommand('insertHTML', false, sanitize(html));
      else document.execCommand('insertText', false, text);
      emit();
    });
    return h('div', { class: 'rt' }, toolbar, area);
  }

  /* ------------------------------------------------------ builder */
  function build(container, schema, obj, ctx) {
    container.innerHTML = '';
    const rows = [];
    const groups = {};
    const main = h('div', { class: 'fe-fields' });
    container.append(main);
    schema.forEach((f) => {
      if (obj[f.name] === undefined) {
        if (f.type === 'list') obj[f.name] = [];
        else if (f.default !== undefined) obj[f.name] = f.default;
      }
      const row = field(f, obj, ctx, () => updateVisibility());
      rows.push({ f: f, el: row });
      if (f.group) {
        if (!groups[f.group]) {
          const body = h('div', { class: 'fe-group-body' });
          const det = h('details', { class: 'fe-group' }, h('summary', { text: f.group }), body);
          groups[f.group] = body;
          container.append(det);
        }
        groups[f.group].append(row);
      } else main.append(row);
    });
    function updateVisibility() {
      rows.forEach((r) => { if (r.f.showIf) r.el.hidden = r.f.showIf.in.map(String).indexOf(String(obj[r.f.showIf.field])) < 0; });
    }
    updateVisibility();
  }

  function label(f, forId) {
    return h('label', { class: 'fe-label', for: forId || null }, f.label, f.required ? h('span', { class: 'fe-req', title: 'Wajib', text: ' *' }) : null);
  }
  function help(f) { return f.help ? h('div', { class: 'fe-help', text: f.help }) : null; }
  let idc = 0;

  function field(f, obj, ctx, onVis) {
    const id = 'fe' + (++idc);
    const changed = () => { ctx.onChange(); onVis(); };
    const set = (v) => { obj[f.name] = v; changed(); };
    let input;
    switch (f.type) {
      case 'text':
        input = h('input', { id: id, type: 'text', class: 'input', value: obj[f.name] || '', placeholder: f.placeholder || '' });
        input.addEventListener('input', () => set(input.value));
        return h('div', { class: 'fe-row' }, label(f, id), input, help(f));
      case 'textarea':
        input = h('textarea', { id: id, class: 'input', rows: f.rows || 3, placeholder: f.placeholder || '' });
        input.value = obj[f.name] || '';
        input.addEventListener('input', () => set(input.value));
        return h('div', { class: 'fe-row' }, label(f, id), input, help(f));
      case 'number':
        input = h('input', { id: id, type: 'number', class: 'input narrow', value: obj[f.name] != null ? obj[f.name] : '', min: f.min, max: f.max, step: f.step || 'any' });
        input.addEventListener('input', () => set(input.value === '' ? '' : Number(input.value)));
        return h('div', { class: 'fe-row' }, label(f, id), input, help(f));
      case 'boolean':
        input = h('input', { id: id, type: 'checkbox', class: 'switch' });
        input.checked = !!obj[f.name];
        input.addEventListener('change', () => set(input.checked));
        return h('div', { class: 'fe-row fe-inline' }, input, h('label', { for: id, class: 'fe-label', text: f.label }), help(f));
      case 'select': {
        input = h('select', { id: id, class: 'input' });
        f.options.forEach((o, i) => { const op = h('option', { value: i, text: o[1] }); if (String(o[0]) === String(obj[f.name])) op.selected = true; input.append(op); });
        if (obj[f.name] === '' || obj[f.name] == null) obj[f.name] = f.options[0][0];
        input.addEventListener('change', () => set(f.options[input.value][0]));
        return h('div', { class: 'fe-row' }, label(f, id), input, help(f));
      }
      case 'color': {
        input = h('input', { id: id, type: 'color', value: obj[f.name] || '#ffffff' });
        const clr = h('button', { type: 'button', class: 'btn sm ghost', text: 'Bawaan' });
        const sw = h('span', { class: 'fe-color-val', text: obj[f.name] || 'bawaan' });
        input.addEventListener('input', () => { sw.textContent = input.value; set(input.value); });
        clr.addEventListener('click', () => { sw.textContent = 'bawaan'; set(''); });
        return h('div', { class: 'fe-row' }, label(f, id), h('div', { class: 'fe-color' }, input, sw, clr), help(f));
      }
      case 'html': {
        const lab = label(f);
        return h('div', { class: 'fe-row' }, lab, richText(obj[f.name], (v) => set(v), f.tall), help(f));
      }
      case 'image':
        return h('div', { class: 'fe-row' }, label(f), mediaField(f, obj, set, 'image'), help(f));
      case 'video':
        return h('div', { class: 'fe-row' }, label(f), mediaField(f, obj, set, 'video'), help(f));
      case 'list':
        return listField(f, obj, ctx, onVis);
      default:
        return h('div', { text: 'Tipe bidang tidak dikenal: ' + f.type });
    }
  }

  function ytIdOf(u) { return window.LumiPlayer && LumiPlayer.ytId ? LumiPlayer.ytId(u) : null; }
  function mediaField(f, obj, set, kind) {
    const wrap = h('div', { class: 'fe-media' });
    function render() {
      wrap.innerHTML = '';
      const v = String(obj[f.name] || '').trim();
      const yid = kind === 'video' ? ytIdOf(v) : null;
      if (v) {
        let prev;
        if (kind === 'image') prev = h('img', { src: v, alt: '', class: 'fe-thumb' });
        else if (yid) prev = h('img', { src: 'https://i.ytimg.com/vi/' + yid + '/mqdefault.jpg', alt: '', class: 'fe-thumb' });
        else prev = h('video', { src: v, class: 'fe-thumb', preload: 'metadata', muted: true });
        const info = v.indexOf('data:') === 0 ? 'Berkas lokal · ' + fmtBytes(Math.round(v.length * 0.75)) : yid ? 'YouTube · ' + yid : v;
        wrap.append(h('div', { class: 'fe-media-has' }, prev,
          h('div', { class: 'fe-media-info' },
            h('div', { class: 'muted small', title: v.indexOf('data:') === 0 ? '' : v, text: info.length > 90 ? info.slice(0, 90) + '…' : info }),
            h('div', { class: 'row' },
              h('button', { type: 'button', class: 'btn sm', onClick: upload }, ic('upload', 14), 'Unggah'),
              h('button', { type: 'button', class: 'btn sm ghost danger', onClick: () => { set(''); render(); } }, ic('trash', 14), 'Hapus')))));
      } else {
        const drop = h('div', { class: 'fe-drop', tabindex: '0', role: 'button' },
          ic(kind === 'image' ? 'image' : 'video', 24),
          h('div', null, h('b', { text: 'Pilih berkas' }), ' atau seret ke sini'),
          h('div', { class: 'muted small', text: kind === 'image' ? 'JPG, PNG, GIF, WebP, SVG — otomatis dikompres' : 'MP4/WebM. Untuk YouTube, tempel tautannya di bawah.' }));
        drop.addEventListener('click', upload);
        drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); upload(); } });
        drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
        drop.addEventListener('dragleave', () => drop.classList.remove('over'));
        drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files[0]) handle(e.dataTransfer.files[0]); });
        wrap.append(drop);
      }
      // kolom URL selalu tersedia (termasuk saat sudah ada video) agar mudah diganti
      const url = h('input', { type: 'text', inputmode: 'url', class: 'input', autocomplete: 'off', spellcheck: 'false',
        value: v && v.indexOf('data:') !== 0 ? v : '',
        placeholder: kind === 'image' ? 'Tempel URL gambar (https://…)' : 'Tempel tautan YouTube atau URL video MP4/WebM' });
      const apply = h('button', { type: 'button', class: 'btn', onClick: () => applyUrl() }, ic('link', 15), 'Pakai');
      const msg = h('div', { class: 'fe-help', hidden: true });
      function applyUrl() {
        const u = url.value.trim();
        if (!u) { if (v && v.indexOf('data:') !== 0) { set(''); render(); } return; }
        if (kind === 'video' && !ytIdOf(u) && !/^(https?:)?\/\//i.test(u) && !/^data:video\//.test(u)) {
          msg.hidden = false; msg.style.color = 'var(--danger)';
          msg.textContent = 'URL tidak dikenali. Gunakan tautan YouTube (youtube.com/watch?v=…, youtu.be/…) atau URL langsung ke berkas .mp4/.webm.';
          return;
        }
        if (u === v) return;
        set(u); render();
      }
      url.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); applyUrl(); } });
      url.addEventListener('paste', () => setTimeout(applyUrl, 0));
      url.addEventListener('change', applyUrl);
      wrap.append(h('div', { class: 'fe-url' }, url, apply), msg);
      if (kind === 'video' && yid) wrap.append(h('div', { class: 'fe-help', text: 'Video YouTube didukung penuh: video berhenti otomatis pada waktu interaksi. Waktu mulai (?t=…) pada tautan juga dipakai.' }));
    }
    async function upload() { const file = await pickFile(kind === 'image' ? 'image/*' : 'video/*'); if (file) handle(file); }
    async function handle(file) {
      try {
        if (kind === 'image') {
          if (!/^image\//.test(file.type)) throw new Error('Berkas bukan gambar.');
          set(await compressImage(file, 1280, 0.82));
        } else {
          if (!/^video\//.test(file.type)) throw new Error('Berkas bukan video.');
          if (file.size > 3 * 1024 * 1024 && !confirm('Video berukuran ' + fmtBytes(file.size) + '. Local Storage biasanya dibatasi ±5 MB. Tetap lanjutkan?')) return;
          set(await readAsDataURL(file));
        }
        render();
      } catch (e) { (window.App && App.toast ? App.toast(e.message, 'error') : alert(e.message)); }
    }
    render();
    return wrap;
  }

  function listField(f, obj, ctx, onVis) {
    if (!Array.isArray(obj[f.name])) obj[f.name] = [];
    const arr = obj[f.name];
    const wrap = h('div', { class: 'fe-row fe-list' });
    const head = h('div', { class: 'fe-list-head' }, h('span', { class: 'fe-label', text: f.label }), h('span', { class: 'badge', text: String(arr.length) }));
    const items = h('div', { class: 'fe-items' });
    const addBtn = h('button', { type: 'button', class: 'btn block fe-add' }, ic('plus', 16), 'Tambah ' + (f.itemLabel || 'item').toLowerCase());
    wrap.append(head, items, addBtn);
    function titleOf(it, i) {
      let t = f.titleField ? it[f.titleField] : '';
      t = String(t || '').replace(/<[^>]*>/g, '').trim();
      return t ? t.slice(0, 80) : (f.itemLabel || 'Item') + ' ' + (i + 1);
    }
    function render() {
      items.innerHTML = '';
      head.lastChild.textContent = String(arr.length);
      arr.forEach((it, i) => {
        if (!openState.has(it)) openState.set(it, arr.length <= 3);
        const card = h('div', { class: 'fe-item' + (openState.get(it) ? ' open' : '') });
        const isAns = f.name === 'answers' || f.name === 'quizAnswers';
        const num = h('span', { class: 'fe-item-num' + (isAns && it.correct ? ' ok' : ''), title: isAns && it.correct ? 'Jawaban benar' : '' }, isAns && it.correct ? ic('check', 13) : String(i + 1));
        const hasT = f.titleField && String(it[f.titleField] || '').replace(/<[^>]*>/g, '').trim();
        const title = h('span', { class: 'fe-item-title' + (hasT ? '' : ' empty'), text: titleOf(it, i) });
        const toggle = h('button', { type: 'button', class: 'fe-item-toggle', 'aria-expanded': String(openState.get(it)) }, num, title, ic('chevron-down', 16, 'caret'));
        toggle.addEventListener('click', () => { const o = !openState.get(it); openState.set(it, o); card.classList.toggle('open', o); toggle.setAttribute('aria-expanded', o); });
        const tools = h('div', { class: 'fe-item-tools' },
          iconBtn(ic('arrow-up', 15), 'Naikkan', () => move(i, -1), i === 0),
          iconBtn(ic('arrow-down', 15), 'Turunkan', () => move(i, 1), i === arr.length - 1),
          iconBtn(ic('copy', 15), 'Gandakan', () => { const c = JSON.parse(JSON.stringify(it)); arr.splice(i + 1, 0, c); openState.set(c, true); changed(); }),
          iconBtn(ic('trash', 15), 'Hapus', () => {
            if (f.min && arr.length <= f.min) { (window.App ? App.toast('Minimal ' + f.min + ' ' + (f.itemLabel || 'item').toLowerCase() + '.', 'warn') : 0); return; }
            arr.splice(i, 1); changed();
          }, false, 'danger'));
        const body = h('div', { class: 'fe-item-body' });
        build(body, f.fields, it, { onChange: () => { const tt = titleOf(it, i); title.textContent = tt; title.classList.toggle('empty', !(f.titleField && String(it[f.titleField] || '').replace(/<[^>]*>/g, '').trim())); if (isAns) { num.className = 'fe-item-num' + (it.correct ? ' ok' : ''); num.innerHTML = ''; num.append(it.correct ? ic('check', 13) : String(i + 1)); } ctx.onChange(); }, root: ctx.root });
        if (f.picker) body.prepend(h('button', { type: 'button', class: 'btn sm', onClick: () => pickPoint(ctx.root, it, () => { render(); ctx.onChange(); }) }, ic('map-pin', 14), 'Pilih posisi di gambar'));
        card.append(h('div', { class: 'fe-item-head' }, toggle, tools), body);
        items.append(card);
      });
    }
    function move(i, d) { const j = i + d; if (j < 0 || j >= arr.length) return; const t = arr[i]; arr[i] = arr[j]; arr[j] = t; changed(); }
    function changed() { render(); ctx.onChange(); onVis(); }
    addBtn.addEventListener('click', () => {
      const it = window.LumiTypes.defaultsFor(f.fields);
      arr.push(it); openState.set(it, true); changed();
      setTimeout(() => { const last = items.lastChild; if (last) { last.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); const inp = last.querySelector('input,textarea,[contenteditable]'); if (inp) inp.focus(); } }, 30);
    });
    render();
    return wrap;
  }
  function iconBtn(t, title, fn, disabled, cls) {
    return h('button', { type: 'button', class: 'icon-btn sm ' + (cls || ''), title: title, 'aria-label': title, disabled: disabled || null, onClick: fn }, t);
  }

  function pickPoint(root, item, done) {
    if (!root || !root.image) { window.App && App.toast('Tambahkan gambar latar terlebih dahulu.', 'warn'); return; }
    const dot = h('span', { class: 'pick-dot', style: 'left:' + (item.x || 50) + '%;top:' + (item.y || 50) + '%' });
    const imgEl = h('img', { src: root.image, alt: '' });
    const stage = h('div', { class: 'pick-stage' }, imgEl, dot);
    const others = (root.hotspots || []).filter((x) => x !== item);
    others.forEach((o) => stage.append(h('span', { class: 'pick-dot other', style: 'left:' + o.x + '%;top:' + o.y + '%' })));
    stage.addEventListener('click', (e) => {
      const r = imgEl.getBoundingClientRect();
      const x = Math.round(((e.clientX - r.left) / r.width) * 1000) / 10;
      const y = Math.round(((e.clientY - r.top) / r.height) * 1000) / 10;
      item.x = Math.min(100, Math.max(0, x)); item.y = Math.min(100, Math.max(0, y));
      dot.style.left = item.x + '%'; dot.style.top = item.y + '%';
    });
    window.App.modal({ title: 'Posisi hotspot', sub: 'Klik pada gambar untuk menempatkan titik', body: stage, size: 'wide', buttons: [{ label: 'Selesai', primary: true, onClick: done }] });
  }

  window.LumiEditor = { build: build, compressImage: compressImage, pickFile: pickFile, fmtBytes: fmtBytes, richText: richText };
})();
