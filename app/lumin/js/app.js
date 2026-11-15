/* =========================================================================
 * Lumin — aplikasi utama (router, navigasi, tampilan, editor, pemutar)
 * ========================================================================= */
(function () {
  'use strict';
  const S = window.LumiStore, T = window.LumiTypes, X = window.LumiExport, E = window.LumiEditor, P = window.LumiPlayer, I = window.Icon;

  /* ================================================================ util */
  function h(tag, props) {
    const el = document.createElement(tag);
    if (props) for (const k in props) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') { for (const s in v) { if (s.indexOf('--') === 0) el.style.setProperty(s, v[s]); else el.style[s] = v[s]; } }
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (let i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) { if (c == null || c === false) return; if (Array.isArray(c)) c.forEach((x) => add(el, x)); else el.append(c instanceof Node ? c : document.createTextNode(String(c))); }
  const $ = (s, r) => (r || document).querySelector(s);
  const main = $('#main');
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
  const MOD = isMac ? '⌘' : 'Ctrl';
  const K = (s) => s.replace(/Mod/g, MOD);
  function fmtDate(iso, withTime) {
    if (!iso) return '–';
    const opt = withTime ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(iso).toLocaleString('id-ID', opt);
  }
  function relTime(iso) {
    if (!iso) return '–';
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 45) return 'baru saja';
    if (s < 3600) return Math.max(1, Math.floor(s / 60)) + ' mnt lalu';
    if (s < 86400) return Math.floor(s / 3600) + ' jam lalu';
    if (s < 86400 * 7) return Math.floor(s / 86400) + ' hari lalu';
    return fmtDate(iso);
  }
  function debounce(fn, ms) { let t; return function () { const a = arguments; clearTimeout(t); t = setTimeout(() => fn.apply(null, a), ms); }; }
  function thumbOf(c) {
    if (c.type === 'ivideo' && c.params && !c.params.poster) { const y = P.ytId && P.ytId(c.params.video); if (y) return 'https://i.ytimg.com/vi/' + y + '/hqdefault.jpg'; }
    let found = '';
    (function walk(o) {
      if (found || !o || typeof o !== 'object') return;
      for (const k of ['image', 'introImage', 'poster']) if (typeof o[k] === 'string' && o[k]) { found = o[k]; return; }
      for (const k in o) if (o[k] && typeof o[k] === 'object') walk(o[k]);
    })(c.params);
    return found;
  }

  /* ========================================================= meta tipe */
  const TM = {
    mc: ['list-checks', '#4f46e5'], tf: ['check-circle', '#059669'], blanks: ['text-cursor', '#0284c7'], dragtext: ['move', '#d97706'],
    markwords: ['highlighter', '#ca8a04'], singlechoice: ['target', '#e11d48'], questionset: ['clipboard', '#7c3aed'], essay: ['file-text', '#475569'],
    summary: ['list-tree', '#0d9488'], sortpar: ['arrow-up-down', '#ea580c'], flashcards: ['layers', '#db2777'], dialogcards: ['message', '#0891b2'],
    memory: ['cards', '#c026d3'], guess: ['lightbulb', '#65a30d'], presentation: ['presentation', '#2563eb'], ivideo: ['play-square', '#dc2626'],
    hotspots: ['map-pin', '#16a34a'], slider: ['images', '#9333ea'], chart: ['chart', '#0369a1'], accordion: ['rows', '#57534e'], text: ['type', '#52525b'],
  };
  const hue = (id) => (TM[id] || ['file', '#71717a'])[1];
  function tile(id, cls, size) { return h('span', { class: 'tile ' + (cls || ''), style: { '--hue': hue(id) } }, I((TM[id] || ['file'])[0], size || 18)); }
  function typeName(id) { const t = T.byId(id); return t ? t.name : id; }

  /* ========================================================= toast/modal */
  const App = {
    toast(msg, kind, ms) {
      const t = h('div', { class: 'toast ' + (kind || ''), role: 'status' }, I({ ok: 'check', error: 'alert', warn: 'alert' }[kind] || 'info', 16), h('span', { text: msg }));
      $('#toasts').append(t);
      setTimeout(() => { t.style.transition = 'opacity .25s, transform .25s'; t.style.opacity = '0'; t.style.transform = 'translateY(6px)'; setTimeout(() => t.remove(), 260); }, ms || 2600);
    },
    modal(o) {
      const prevFocus = document.activeElement;
      const back = h('div', { class: 'modal-back' + (o.top ? ' top' : '') });
      const body = h('div', { class: 'modal-body' });
      add(body, o.body);
      const foot = h('div', { class: 'modal-foot' });
      let closed = false;
      const close = () => { if (closed) return; closed = true; back.remove(); document.removeEventListener('keydown', onKey, true); if (o.onClose) o.onClose(); if (prevFocus && prevFocus.focus && document.body.contains(prevFocus)) prevFocus.focus(); };
      function setButtons(btns) {
        foot.innerHTML = '';
        foot.hidden = !btns || !btns.length;
        (btns || []).forEach((b) => {
          foot.append(h('button', { type: 'button', class: 'btn ' + (b.primary ? 'primary' : b.danger ? 'danger-solid' : b.ghost ? 'ghost' : '') + (b.left ? ' left' : ''), onClick: () => { if (b.onClick && b.onClick() === false) return; if (!b.keep) close(); } }, b.icon ? I(b.icon, 16) : null, b.label));
        });
      }
      setButtons(o.buttons === undefined ? [{ label: 'Tutup' }] : o.buttons);
      const head = o.title ? h('div', { class: 'modal-head' }, o.headIcon || null, h('div', null, h('h3', { text: o.title }), h('div', { class: 'sub', text: o.sub || '' })), h('button', { type: 'button', class: 'icon-btn sm', 'aria-label': 'Tutup', onClick: close }, I('x', 16))) : null;
      const box = h('div', { class: 'modal ' + (o.size || ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': o.title || 'Dialog' }, head, o.raw ? o.raw : body, foot);
      back.append(box);
      back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
        else if (e.key === 'Enter' && o.enterSubmits !== false && e.target.tagName === 'INPUT' && e.target.type !== 'search') { const pb = foot.querySelector('.primary'); if (pb) { e.preventDefault(); pb.click(); } }
      }
      document.addEventListener('keydown', onKey, true);
      $('#modal-root').append(back);
      setTimeout(() => { const f = box.querySelector('[autofocus]') || box.querySelector('input:not([type=hidden]):not([type=radio]),select,textarea') || foot.querySelector('.primary') || box.querySelector('button'); if (f) f.focus(); }, 30);
      return { close: close, body: body, box: box, setButtons: setButtons };
    },
    confirm(title, msg, okLabel, danger) {
      return new Promise((res) => {
        let ok = false;
        App.modal({ title: title, body: h('p', { class: 'muted', text: msg }), onClose: () => res(ok), buttons: [{ label: 'Batal', ghost: true }, { label: okLabel || 'Lanjutkan', primary: !danger, danger: danger, onClick: () => { ok = true; } }] });
      });
    },
    prompt(title, labelText, value, placeholder) {
      return new Promise((res) => {
        let out = null;
        const inp = h('input', { class: 'input', value: value || '', placeholder: placeholder || '' });
        App.modal({ title: title, body: h('label', { class: 'field' }, h('span', { text: labelText }), inp), onClose: () => res(out), buttons: [{ label: 'Batal', ghost: true }, { label: 'Simpan', primary: true, onClick: () => { out = inp.value.trim(); } }] });
        setTimeout(() => inp.select(), 40);
      });
    },
  };
  window.App = App;

  /* ================================================================ tema */
  function applyTheme() {
    const s = S.settings();
    if (s.theme === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', s.theme);
    document.documentElement.style.setProperty('--ink', s.accent);
    document.documentElement.style.setProperty('--ink-deep', 'color-mix(in srgb, ' + s.accent + ' 78%, #000)');
    document.querySelector('meta[name=theme-color]').setAttribute('content', s.accent);
    document.body.classList.toggle('sb-collapsed', !!s.sidebarCollapsed);
    const tb = $('#btn-theme');
    if (tb) { tb.innerHTML = ''; tb.append(I({ system: 'monitor', light: 'sun', dark: 'moon' }[s.theme] || 'monitor', 18)); tb.title = 'Tema: ' + { system: 'ikuti sistem', light: 'terang', dark: 'gelap' }[s.theme]; }
  }
  function setTheme(t) { S.setSettings({ theme: t }); applyTheme(); }
  function cycleTheme() {
    const order = ['system', 'light', 'dark'];
    const next = order[(order.indexOf(S.settings().theme) + 1) % 3];
    setTheme(next);
    App.toast('Tema ' + { system: 'mengikuti sistem', light: 'terang', dark: 'gelap' }[next]);
  }

  let ED = null; // sesi editor aktif

  /* ================================================================ shell */
  function buildShell() {
    const sb = $('#sidebar');
    const navItem = (href, icon, label, key, countId) => h('a', { href: href, 'data-nav': key, title: label }, I(icon, 18), h('span', { class: 'lbl', text: label }), countId ? h('span', { class: 'count', id: countId }) : null);
    sb.append(
      h('div', { class: 'brand-row' },
        h('a', { class: 'brand', href: '#/home', 'aria-label': 'Lumin, beranda' }, h('img', { src: 'assets/icon.svg', alt: '', width: 32, height: 32 }), h('span', { text: 'Lumin' })),
        h('button', { type: 'button', class: 'icon-btn sm hide-mobile', title: 'Ciutkan sidebar (' + MOD + '+\\)', 'aria-label': 'Ciutkan sidebar', onClick: toggleSidebar }, I('sidebar', 16))),
      h('button', { type: 'button', class: 'btn primary block btn-create', title: 'Buat konten (Alt+N)', onClick: () => openCreate() }, I('plus', 16), h('span', { text: 'Buat konten' })),
      h('nav', { class: 'nav' },
        navItem('#/home', 'home', 'Beranda', 'home'),
        navItem('#/library', 'book', 'Pustaka', 'library', 'count-all'),
        navItem('#/library?fav=1', 'star', 'Favorit', 'fav', 'count-fav'),
        navItem('#/new', 'shapes', 'Tipe konten', 'new'),
        navItem('#/results', 'chart', 'Hasil', 'results'),
        navItem('#/trash', 'trash', 'Sampah', 'trash', 'count-trash')),
      h('div', { class: 'sb-folders' },
        h('div', { class: 'nav-label' }, h('span', { text: 'Folder' }), h('button', { type: 'button', class: 'icon-btn sm', title: 'Folder baru', 'aria-label': 'Folder baru', onClick: newFolder }, I('plus', 14))),
        h('nav', { class: 'nav', id: 'folder-list' })),
      h('nav', { class: 'nav', style: { marginTop: 'auto' } },
        navItem('#/settings', 'settings', 'Pengaturan', 'settings'),
        navItem('#/help', 'help', 'Bantuan', 'help')),
      h('div', { class: 'sb-foot', id: 'storage-meter' }));

    const tb = $('#topbar');
    tb.append(
      h('button', { type: 'button', class: 'icon-btn only-mobile', 'aria-label': 'Menu', onClick: toggleSidebar }, I('menu', 20)),
      h('nav', { class: 'menubar', id: 'menubar', 'aria-label': 'Menu aplikasi' }),
      h('span', { class: 'spacer' }),
      h('button', { type: 'button', class: 'cmd-trigger', onClick: openPalette, 'aria-label': 'Cari atau jalankan perintah' }, I('search', 16), h('span', { class: 'cmd-text', text: 'Cari atau jalankan perintah…' }), h('span', { class: 'kbd', text: MOD + ' K' })),
      h('button', { type: 'button', class: 'icon-btn', id: 'btn-theme', 'aria-label': 'Ganti tema', onClick: cycleTheme }));
    $('#scrim').addEventListener('click', () => document.body.classList.remove('sb-open'));
  }
  async function newFolder() {
    const n = await App.prompt('Folder baru', 'Nama folder', '', 'mis. Kelas 7');
    if (n) { S.addFolder(n); refreshSidebar(); go('#/library?folder=' + encodeURIComponent(n)); }
  }
  function toggleSidebar() {
    if (window.innerWidth <= 760) { document.body.classList.toggle('sb-open'); return; }
    S.setSettings({ sidebarCollapsed: !S.settings().sidebarCollapsed }); applyTheme();
  }
  function refreshSidebar() {
    const all = S.all();
    const setc = (id, n) => { const e = $('#' + id); if (e) e.textContent = n || ''; };
    setc('count-all', all.length); setc('count-fav', all.filter((c) => c.favorite).length); setc('count-trash', S.trash().length);
    const r = currentRoute();
    document.querySelectorAll('.sidebar .nav a[data-nav]').forEach((a) => {
      const n = a.dataset.nav;
      let on = n === r.path;
      if (n === 'library') on = r.path === 'library' && !r.q.get('fav') && !r.q.get('folder');
      if (n === 'fav') on = r.path === 'library' && !!r.q.get('fav');
      a.classList.toggle('active', on);
    });
    const fl = $('#folder-list'); fl.innerHTML = '';
    const folders = S.folders();
    if (!folders.length) fl.append(h('div', { class: 'faint small', style: { padding: '.15rem .65rem' }, text: 'Belum ada folder' }));
    folders.forEach((f) => fl.append(h('a', { href: '#/library?folder=' + encodeURIComponent(f), class: r.q.get('folder') === f ? 'active' : '', title: f }, I('folder', 18), h('span', { class: 'lbl', text: f }), h('span', { class: 'count', text: String(all.filter((c) => c.folder === f).length) }))));
    const u = S.usage();
    const pct = Math.min(100, Math.round((u.bytes / u.quota) * 100));
    const m = $('#storage-meter'); m.innerHTML = '';
    m.append(h('div', { class: 'row' }, I('drive', 14), h('span', { text: 'Penyimpanan lokal' }), h('span', { class: 'spacer' }), h('span', { text: pct + '%' })),
      h('div', { class: 'meter' + (pct > 90 ? ' full' : pct > 70 ? ' warn' : '') }, h('i', { style: { width: Math.max(pct, 1.5) + '%' } })),
      h('div', { class: 'faint', text: E.fmtBytes(u.bytes) + ' dari ±' + E.fmtBytes(u.quota) }));
  }

  /* ================================================================= menu */
  function menuDef() {
    const inEd = !!ED;
    const hasContent = inEd || currentRoute().path === 'play';
    const s = S.settings();
    return [
      { label: 'Berkas', items: [
        { icon: 'file-plus', label: 'Konten baru…', hint: 'Alt+N', act: () => openCreate() },
        { icon: 'book', label: 'Buka pustaka', hint: 'Alt+L', act: () => go('#/library') },
        { icon: 'upload', label: 'Impor .h5p / .json…', hint: K('Mod+O'), act: openImport },
        { sep: true },
        { icon: 'save', label: 'Simpan', hint: K('Mod+S'), act: () => saveEditor(true), disabled: !inEd },
        { icon: 'copy', label: 'Simpan sebagai salinan', act: saveAsCopy, disabled: !inEd },
        { icon: 'download', label: 'Ekspor', disabled: !hasContent, sub: [
          { icon: 'package', label: 'Paket H5P (.h5p)', act: () => doExport('h5p') },
          { icon: 'globe', label: 'HTML mandiri (.html)', act: () => doExport('html') },
          { icon: 'graduation', label: 'SCORM 1.2 (.zip)', act: () => doExport('scorm') },
          { icon: 'braces', label: 'Proyek Lumin (.json)', act: () => doExport('json') },
        ] },
        { icon: 'printer', label: 'Cetak…', hint: K('Mod+P'), act: () => window.print() },
        { sep: true },
        { icon: 'archive', label: 'Cadangkan semua data', act: backupNow },
        { icon: 'restore', label: 'Pulihkan dari cadangan…', act: openImport },
        { sep: true },
        { icon: 'x', label: 'Tutup editor', act: () => go('#/library'), disabled: !inEd },
      ] },
      { label: 'Edit', items: [
        { icon: 'undo', label: 'Urungkan', hint: K('Mod+Z'), act: undo, disabled: !inEd || ED.hi <= 0 },
        { icon: 'redo', label: 'Ulangi', hint: K('Mod+Y'), act: redo, disabled: !inEd || ED.hi >= ED.history.length - 1 },
        { sep: true },
        { icon: 'pencil', label: 'Ganti nama…', hint: 'F2', act: renameCurrent, disabled: !hasContent },
        { icon: 'info', label: 'Detail & lisensi', act: () => setTab('meta'), disabled: !inEd },
        { icon: 'copy', label: 'Gandakan', act: () => { const id = currentId(); if (id) { const d = S.duplicate(id); App.toast('Salinan dibuat', 'ok'); go('#/edit/' + d.id); } }, disabled: !hasContent },
        { icon: 'star', label: 'Favorit', act: () => { const id = currentId(); if (id) toggleFav(id); }, disabled: !hasContent },
        { sep: true },
        { icon: 'trash', label: 'Hapus', danger: true, act: () => { const id = currentId(); if (id) deleteContents([id], true); }, disabled: !hasContent },
      ] },
      { label: 'Tampilan', items: [
        { icon: 'form', label: 'Editor: formulir saja', check: s.editorView === 'form', act: () => setEditorView('form') },
        { icon: 'split', label: 'Editor: formulir + pratinjau', check: s.editorView === 'split', act: () => setEditorView('split') },
        { icon: 'eye', label: 'Editor: pratinjau saja', check: s.editorView === 'preview', act: () => setEditorView('preview') },
        { sep: true },
        { icon: 'play', label: 'Mode putar', hint: K('Mod+Enter'), act: playCurrent, disabled: !hasContent },
        { icon: 'maximize', label: 'Layar penuh', act: () => { if (document.fullscreenElement) document.exitFullscreen(); else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen(); } },
        { icon: 'sidebar', label: 'Sidebar lebar', hint: K('Mod+\\'), check: !s.sidebarCollapsed, act: toggleSidebar },
        { sep: true },
        { icon: 'grid', label: 'Pustaka: kisi', check: s.view === 'grid', act: () => { S.setSettings({ view: 'grid' }); rerender(); } },
        { icon: 'list', label: 'Pustaka: daftar', check: s.view === 'list', act: () => { S.setSettings({ view: 'list' }); rerender(); } },
        { sep: true },
        { icon: 'sun', label: 'Tema', sub: [
          { icon: 'monitor', label: 'Ikuti sistem', check: s.theme === 'system', act: () => setTheme('system') },
          { icon: 'sun', label: 'Terang', check: s.theme === 'light', act: () => setTheme('light') },
          { icon: 'moon', label: 'Gelap', check: s.theme === 'dark', act: () => setTheme('dark') },
        ] },
      ] },
      { label: 'Alat', items: [
        { icon: 'search', label: 'Palet perintah', hint: K('Mod+K'), act: openPalette },
        { icon: 'shield', label: 'Periksa kelengkapan', act: () => setTab('issues'), disabled: !inEd },
        { sep: true },
        { icon: 'chart', label: 'Hasil & analitik', act: () => go('#/results') },
        { icon: 'trash', label: 'Sampah', act: () => go('#/trash') },
        { icon: 'settings', label: 'Pengaturan', hint: K('Mod+,'), act: () => go('#/settings') },
      ] },
      { label: 'Bantuan', items: [
        { icon: 'book', label: 'Panduan', act: () => go('#/help') },
        { icon: 'keyboard', label: 'Pintasan keyboard', hint: '?', act: showShortcuts },
        { icon: 'shapes', label: 'Semua tipe konten', act: () => go('#/new') },
        { sep: true },
        { icon: 'info', label: 'Tentang Lumin', act: showAbout },
      ] },
    ];
  }
  let menubarBuilt = false;
  function buildMenubar() {
    if (menubarBuilt) return;
    menubarBuilt = true;
    const bar = $('#menubar');
    let anyOpen = false;
    menuDef().forEach((m) => {
      const wrap = h('div', { class: 'menu' });
      wrap.dataset.label = m.label;
      const b = h('button', { type: 'button', 'aria-haspopup': 'true', 'aria-expanded': 'false', text: m.label });
      const pop = h('div', { class: 'menu-pop', role: 'menu' });
      b.addEventListener('click', (e) => { e.stopPropagation(); const open = !wrap.classList.contains('open'); closeAll(); if (open) openMenu(wrap); });
      b.addEventListener('mouseenter', () => { if (anyOpen && !wrap.classList.contains('open')) { closeAll(); openMenu(wrap); } });
      wrap.append(b, pop);
      bar.append(wrap);
    });
    function openMenu(w) {
      const def = menuDef().find((x) => x.label === w.dataset.label);
      const pop = w.querySelector('.menu-pop'); pop.innerHTML = '';
      fillMenu(pop, def.items, closeAll);
      w.classList.add('open'); w.firstChild.setAttribute('aria-expanded', 'true'); anyOpen = true;
      const first = pop.querySelector('.menu-item:not(:disabled)'); if (first) first.focus();
    }
    function closeAll() { bar.querySelectorAll('.menu.open').forEach((x) => { x.classList.remove('open'); x.firstChild.setAttribute('aria-expanded', 'false'); }); anyOpen = false; }
    document.addEventListener('click', closeAll);
    bar.addEventListener('keydown', (e) => {
      const open = bar.querySelector('.menu.open');
      if (!open) return;
      const items = Array.from(open.querySelectorAll(':scope > .menu-pop > .menu-item:not(:disabled)'));
      const idx = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); (items[idx + 1] || items[0]).focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); (items[idx - 1] || items[items.length - 1]).focus(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const ws = Array.from(bar.children); const wi = ws.indexOf(open);
        closeAll(); openMenu(ws[(wi + (e.key === 'ArrowRight' ? 1 : ws.length - 1)) % ws.length]);
      } else if (e.key === 'Escape') { closeAll(); open.firstChild.focus(); }
    });
  }
  function fillMenu(pop, items, closeAll) {
    items.forEach((it) => {
      if (it.sep) { pop.append(h('div', { class: 'menu-sep', role: 'separator' })); return; }
      const lead = it.check != null ? h('span', { class: 'tick' }, it.check ? I('check', 15) : null) : I(it.icon || 'info', 16);
      const b = h('button', { type: 'button', class: 'menu-item' + (it.sub ? ' has-sub' : '') + (it.danger ? ' danger' : ''), role: 'menuitem', disabled: it.disabled || null },
        lead, h('span', { text: it.label }), it.hint ? h('span', { class: 'hint', text: it.hint }) : null, it.sub ? h('span', { class: 'hint' }, I('chevron-right', 14)) : null);
      if (it.sub) {
        const sp = h('div', { class: 'menu-pop', role: 'menu' });
        fillMenu(sp, it.sub, closeAll);
        b.append(sp);
        b.addEventListener('click', (e) => e.stopPropagation());
      } else b.addEventListener('click', (e) => { e.stopPropagation(); closeAll(); if (it.act) it.act(); });
      pop.append(b);
    });
  }
  function popMenu(anchor, items) {
    document.querySelectorAll('.ctx-menu').forEach((x) => x.remove());
    const pop = h('div', { class: 'menu-pop ctx-menu', role: 'menu', style: { display: 'block', position: 'fixed' } });
    const close = () => { pop.remove(); document.removeEventListener('click', close); };
    fillMenu(pop, items, close);
    document.body.append(pop);
    const r = anchor.getBoundingClientRect(), pr = pop.getBoundingClientRect();
    pop.style.left = Math.max(8, Math.min(window.innerWidth - pr.width - 8, r.right - pr.width)) + 'px';
    if (pop.offsetLeft + pr.width * 2 + 16 > window.innerWidth) pop.classList.add('flip');
    pop.style.top = (r.bottom + pr.height + 8 > window.innerHeight ? Math.max(8, r.top - pr.height - 6) : r.bottom + 6) + 'px';
    setTimeout(() => document.addEventListener('click', close), 0);
    pop.addEventListener('keydown', (e) => {
      const its = Array.from(pop.querySelectorAll(':scope > .menu-item:not(:disabled)'));
      const i = its.indexOf(document.activeElement);
      if (e.key === 'Escape') { close(); anchor.focus(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); (its[i + 1] || its[0]).focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); (its[i - 1] || its[its.length - 1]).focus(); }
    });
    const f = pop.querySelector('.menu-item'); if (f) f.focus();
  }

  /* ========================================================= palet perintah */
  function openPalette() {
    if ($('.palette')) return;
    const input = h('input', { type: 'text', placeholder: 'Cari konten, tipe, atau perintah…', 'aria-label': 'Cari', autocomplete: 'off', spellcheck: 'false' });
    const list = h('div', { class: 'palette-list', role: 'listbox' });
    const raw = h('div', null,
      h('div', { class: 'palette-input' }, I('search', 18), input, h('span', { class: 'kbd', text: 'Esc' })),
      list,
      h('div', { class: 'palette-foot' }, h('span', null, h('span', { class: 'kbd', text: '↑↓' }), ' pilih'), h('span', null, h('span', { class: 'kbd', text: '↵' }), ' buka')));
    const m = App.modal({ size: 'palette', top: true, raw: raw, buttons: [], enterSubmits: false });
    let flat = [], act = 0;
    const id = currentId();
    const cmds = [
      { icon: 'file-plus', label: 'Buat konten baru', hint: 'Alt+N', run: () => openCreate() },
      { icon: 'upload', label: 'Impor berkas .h5p / .json', run: openImport },
      { icon: 'book', label: 'Buka pustaka', run: () => go('#/library') },
      { icon: 'star', label: 'Lihat favorit', run: () => go('#/library?fav=1') },
      { icon: 'chart', label: 'Hasil & analitik', run: () => go('#/results') },
      { icon: 'trash', label: 'Sampah', run: () => go('#/trash') },
      { icon: 'settings', label: 'Pengaturan', run: () => go('#/settings') },
      { icon: 'archive', label: 'Unduh cadangan semua data', run: backupNow },
      { icon: 'moon', label: 'Ganti tema', run: cycleTheme },
      { icon: 'keyboard', label: 'Pintasan keyboard', run: showShortcuts },
      { icon: 'help', label: 'Panduan', run: () => go('#/help') },
    ];
    if (id) cmds.unshift(
      { icon: 'play', label: 'Putar konten ini', hint: K('Mod+↵'), run: playCurrent },
      { icon: 'download', label: 'Ekspor konten ini…', hint: K('Mod+E'), run: () => exportDialog(id) },
      { icon: 'pencil', label: 'Ganti nama konten ini', hint: 'F2', run: renameCurrent });
    function draw() {
      const q = input.value.toLowerCase().trim();
      const groups = [];
      const contents = S.all().filter((c) => !q || c.title.toLowerCase().indexOf(q) >= 0 || typeName(c.type).toLowerCase().indexOf(q) >= 0);
      const recent = q ? contents : S.recent().map((x) => S.get(x)).filter(Boolean);
      if (recent.length) groups.push({ name: q ? 'Konten' : 'Terakhir dibuka', items: recent.slice(0, 6).map((c) => ({ node: tile(c.type, '', 14), label: c.title, hint: typeName(c.type), run: () => go('#/edit/' + c.id) })) });
      if (q) {
        const types = T.TYPES.filter((t) => (t.name + ' ' + t.desc).toLowerCase().indexOf(q) >= 0);
        if (types.length) groups.push({ name: 'Buat baru', items: types.slice(0, 5).map((t) => ({ node: tile(t.id, '', 14), label: 'Buat ' + t.name, run: () => openCreate(t.id) })) });
      }
      const c2 = cmds.filter((c) => !q || c.label.toLowerCase().indexOf(q) >= 0);
      if (c2.length) groups.push({ name: 'Perintah', items: c2 });
      list.innerHTML = ''; flat = [];
      groups.forEach((g) => {
        list.append(h('div', { class: 'palette-group', text: g.name }));
        g.items.forEach((it) => {
          const idx = flat.length;
          const b = h('button', { type: 'button', class: 'palette-item', role: 'option' }, it.node || I(it.icon, 16), h('span', { text: it.label }), it.hint ? h('span', { class: 'hint', text: it.hint }) : null);
          b.addEventListener('mousemove', () => { if (act !== idx) { act = idx; mark(); } });
          b.addEventListener('click', () => run(idx));
          list.append(b); flat.push({ el: b, run: it.run });
        });
      });
      if (!flat.length) list.append(h('div', { class: 'palette-empty', text: 'Tidak ada hasil untuk "' + input.value + '"' }));
      act = 0; mark();
    }
    function mark() { flat.forEach((f, i) => f.el.classList.toggle('act', i === act)); if (flat[act]) flat[act].el.scrollIntoView({ block: 'nearest' }); }
    function run(i) { const f = flat[i]; if (!f) return; m.close(); setTimeout(f.run, 0); }
    input.addEventListener('input', draw);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); act = Math.min(flat.length - 1, act + 1); mark(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); act = Math.max(0, act - 1); mark(); }
      else if (e.key === 'Enter') { e.preventDefault(); run(act); }
    });
    draw();
    setTimeout(() => input.focus(), 20);
  }

  /* ================================================================ router */
  function currentRoute() {
    const raw = (location.hash || '#/home').slice(2);
    const [pathPart, qs] = raw.split('?');
    const parts = pathPart.split('/');
    return { path: parts[0] || 'home', id: parts[1] ? decodeURIComponent(parts[1]) : null, q: new URLSearchParams(qs || '') };
  }
  function currentId() { const r = currentRoute(); return (r.path === 'edit' || r.path === 'play') ? r.id : null; }
  function go(hash) { if (location.hash === hash) rerender(); else location.hash = hash; }
  function onRoute() {
    const r = currentRoute();
    if (ED && !(r.path === 'edit' && r.id === ED.c.id)) {
      if (ED.dirty && (S.settings().autosave || confirm('Ada perubahan yang belum disimpan. Simpan sekarang?'))) saveEditor(false);
      ED = null;
    }
    document.body.classList.remove('sb-open');
    document.querySelectorAll('.bulkbar, .ctx-menu').forEach((x) => x.remove());
    render(r);
  }
  function rerender() { document.querySelectorAll('.bulkbar').forEach((x) => x.remove()); render(currentRoute()); }
  function render(r) {
    main.innerHTML = '';
    main.className = 'main' + (r.path === 'edit' ? ' full' : '');
    const views = { home: viewHome, new: viewTypes, library: viewLibrary, edit: viewEdit, play: viewPlay, results: viewResults, trash: viewTrash, settings: viewSettings, help: viewHelp };
    (views[r.path] || viewHome)(r);
    refreshSidebar();
    buildMenubar();
    const titles = { home: 'Beranda', new: 'Tipe konten', library: 'Pustaka', results: 'Hasil', trash: 'Sampah', settings: 'Pengaturan', help: 'Bantuan' };
    const c = r.id ? S.get(r.id) : null;
    document.title = c ? c.title + ' – Lumin' : (titles[r.path] ? titles[r.path] + ' – Lumin' : 'Lumin');
    if (r.path !== 'edit') { main.focus({ preventScroll: true }); window.scrollTo(0, 0); }
  }
  function pageHead(title, sub, actions) {
    return h('div', { class: 'page-head' }, h('div', null, h('h1', { text: title }), h('div', { class: 'sub', text: sub || '' })), actions && actions.length ? h('div', { class: 'actions' }, actions) : null);
  }
  function emptyState(icon, title, text, action) {
    return h('div', { class: 'empty' }, h('div', { class: 'empty-ico' }, I(icon, 24)), h('h3', { text: title }), text ? h('p', { text: text }) : null, action || null);
  }

  /* ================================================================ beranda */
  function viewHome() {
    const all = S.all();
    const res = S.results();
    const hr = new Date().getHours();
    const greet = hr < 11 ? 'Selamat pagi' : hr < 15 ? 'Selamat siang' : hr < 19 ? 'Selamat sore' : 'Selamat malam';
    const name = (S.settings().author || '').trim();
    const QUICK = ['questionset', 'mc', 'flashcards', 'presentation', 'ivideo', 'dragtext', 'blanks', 'hotspots'];
    let pick = S.settings().lastType && T.byId(S.settings().lastType) ? S.settings().lastType : 'questionset';
    if (QUICK.indexOf(pick) < 0) QUICK.splice(QUICK.length - 1, 1, pick);

    const left = h('div', { class: 'home-main' });
    left.append(h('div', { class: 'greet' },
      h('div', { class: 'hello', text: greet + (name ? ', ' + name.split(' ')[0] : '') + '.' }),
      h('h1', null, h('span', { class: 'mark', text: 'Apa yang ingin Anda ajarkan hari ini?' }))));

    // komposer: tulis judul, pilih tipe, buat
    const titleIn = h('input', { type: 'text', placeholder: 'Tulis judul materi, misalnya “Siklus air”', 'aria-label': 'Judul materi', maxlength: 140 });
    const sample = h('input', { type: 'checkbox', class: 'check', checked: true });
    const desc = h('div', { class: 'desc' });
    const chips = h('div', { class: 'comp-types', role: 'group', 'aria-label': 'Tipe konten' });
    function drawChips() {
      chips.innerHTML = '';
      QUICK.forEach((id) => chips.append(h('button', { type: 'button', class: 'comp-chip', style: { '--hue': hue(id) }, 'aria-pressed': String(pick === id), onClick: () => { pick = id; drawChips(); titleIn.focus(); } }, I((TM[id] || ['file'])[0], 16), typeName(id))));
      chips.append(h('button', { type: 'button', class: 'comp-chip', style: { '--hue': 'var(--muted)' }, onClick: () => openCreate() }, I('shapes', 16), 'Tipe lain'));
      desc.textContent = T.byId(pick).desc;
    }
    function create() {
      const t = T.byId(pick);
      const c = S.create(pick, titleIn.value.trim() || t.name + ' baru', T.newParams(pick, sample.checked));
      S.setSettings({ lastType: pick });
      go('#/edit/' + c.id);
    }
    titleIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); create(); } });
    drawChips();
    left.append(h('div', { class: 'composer' },
      h('label', { class: 'comp-write' }, h('span', { class: 'comp-label', text: 'Judul materi' }), titleIn),
      chips,
      h('div', { class: 'comp-foot' }, desc,
        h('label', null, sample, 'Isi dengan contoh'),
        h('button', { type: 'button', class: 'btn primary', onClick: create }, I('plus', 16), 'Buat konten'))));

    // daftar lanjutkan
    const recent = S.recent().map((id) => S.get(id)).filter(Boolean);
    const list = (recent.length ? recent : all).slice(0, 7);
    if (list.length) {
      const rl = h('div', { class: 'r-list' });
      list.forEach((c) => rl.append(h('div', { class: 'r-row', role: 'link', tabindex: '0', onClick: () => go('#/edit/' + c.id), onKeydown: (e) => { if (e.key === 'Enter') go('#/edit/' + c.id); } },
        tile(c.type, '', 17), h('span', { class: 'r-title', text: c.title }), h('span', { class: 'r-type', text: typeName(c.type) }), h('span', { class: 'r-time', text: relTime(c.updated) }))));
      left.append(h('div', { class: 'recent' }, h('div', { class: 'section-head' }, h('h2', { text: recent.length ? 'Lanjutkan' : 'Konten terbaru' }), h('a', { class: 'link', href: '#/library' }, 'Buka pustaka', I('chevron-right', 14))), rl));
    } else {
      left.append(h('div', { class: 'recent card' }, emptyState('sparkles', 'Pustaka Anda masih kosong', 'Tulis judul materi di atas lalu tekan Enter, atau impor berkas .h5p yang sudah Anda punya.', h('button', { type: 'button', class: 'btn', onClick: openImport }, I('upload', 16), 'Impor .h5p'))));
    }

    // kolom samping
    const avg = res.length ? Math.round(res.reduce((a, r) => a + (r.pct || 0), 0) / res.length) + '%' : '–';
    const today = res.filter((r) => new Date(r.date).toDateString() === new Date().toDateString()).length;
    const aside = h('aside', { class: 'aside', 'aria-label': 'Ringkasan' },
      h('div', null, h('h2', { text: 'Ringkasan' }), h('div', { class: 'figs' },
        h('div', { class: 'fig' }, h('b', { text: String(all.length) }), h('span', { text: 'konten' })),
        h('div', { class: 'fig' }, h('b', { text: String(all.filter((c) => c.favorite).length) }), h('span', { text: 'favorit' })),
        h('div', { class: 'fig' }, h('b', { text: String(res.length) }), h('span', { text: 'percobaan siswa' })),
        h('div', { class: 'fig' }, h('b', { text: avg }), h('span', { text: 'rata-rata skor' })))),
      h('div', { class: 'note' },
        h('p', null, 'Semua karya Anda tersimpan di peramban ini saja. ', h('a', { href: '#/settings', onClick: (e) => { e.preventDefault(); backupNow(); }, text: 'Unduh cadangan' }), ' sesekali agar aman.'),
        h('p', null, 'Tekan ', h('span', { class: 'kbd', text: MOD + ' K' }), ' untuk mencari konten atau perintah apa saja.')),
      today ? h('p', { class: 'muted small', text: today + ' percobaan tercatat hari ini.' }) : null);
    main.append(h('div', { class: 'home' }, left, aside));
    setTimeout(() => { if (!('ontouchstart' in window)) titleIn.focus({ preventScroll: true }); }, 50);
  }
  function statBox(icon, label, num) { return h('div', { class: 'stat' }, h('div', { class: 'lbl' }, I(icon, 14), label), h('div', { class: 'num', text: String(num) })); }

  /* ============================================================ tipe konten */
  function typeCard(t, onClick) {
    return h('button', { type: 'button', class: 'type-card', onClick: onClick || (() => openCreate(t.id)) }, tile(t.id, 'lg', 20), h('div', null, h('b', { text: t.name }), h('p', { text: t.desc })));
  }
  function viewTypes(r) {
    let cat = r.q.get('cat') || '', q = '';
    main.append(pageHead('Tipe konten', T.TYPES.length + ' tipe konten interaktif siap pakai. Pilih salah satu untuk mulai membuat.'));
    const search = h('input', { class: 'input', type: 'search', placeholder: 'Cari tipe konten…' });
    const pills = h('div', { class: 'chips' });
    const out = h('div');
    main.append(h('div', { class: 'toolbar' }, h('label', { class: 'search-field' }, I('search', 16), search), pills), out);
    function draw() {
      pills.innerHTML = '';
      [''].concat(T.CATEGORIES).forEach((c) => pills.append(h('button', { type: 'button', class: 'pill' + (c === cat ? ' on' : ''), text: c || 'Semua', onClick: () => { cat = c; draw(); } })));
      out.innerHTML = '';
      T.CATEGORIES.filter((c) => !cat || c === cat).forEach((c) => {
        const list = T.TYPES.filter((t) => t.category === c && (!q || (t.name + ' ' + t.desc).toLowerCase().indexOf(q) >= 0));
        if (!list.length) return;
        const g = h('div', { class: 'type-grid' });
        list.forEach((t) => g.append(typeCard(t)));
        out.append(h('div', { class: 'cat-head' }, c, h('span', { class: 'badge', text: String(list.length) })), g);
      });
      if (!out.children.length) out.append(emptyState('search', 'Tidak ditemukan', 'Coba kata kunci lain.'));
    }
    search.addEventListener('input', () => { q = search.value.toLowerCase().trim(); draw(); });
    draw();
  }

  /* ============================================== dialog buat konten (2 langkah) */
  function openCreate(typeId) {
    let cat = '', q = '';
    const m = App.modal({ title: 'Buat konten baru', sub: 'Pilih tipe konten interaktif', size: 'wide', body: h('div'), buttons: [] });
    const hTitle = m.box.querySelector('.modal-head h3'), hSub = m.box.querySelector('.modal-head .sub');
    function step1() {
      hTitle.textContent = 'Buat konten baru'; hSub.textContent = 'Pilih tipe konten interaktif';
      m.box.className = 'modal wide';
      const search = h('input', { class: 'input', type: 'search', placeholder: 'Cari tipe…' });
      const pills = h('div', { class: 'chips' });
      const grid = h('div', { class: 'create-grid' });
      function draw() {
        pills.innerHTML = '';
        [''].concat(T.CATEGORIES).forEach((c) => pills.append(h('button', { type: 'button', class: 'pill' + (c === cat ? ' on' : ''), text: c || 'Semua', onClick: () => { cat = c; draw(); } })));
        grid.innerHTML = '';
        const list = T.TYPES.filter((t) => (!cat || t.category === cat) && (!q || (t.name + ' ' + t.desc).toLowerCase().indexOf(q) >= 0));
        list.forEach((t) => grid.append(typeCard(t, () => step2(t.id))));
        if (!list.length) grid.append(h('div', { class: 'muted', style: { padding: '1rem' }, text: 'Tidak ada tipe yang cocok.' }));
      }
      search.addEventListener('input', () => { q = search.value.toLowerCase().trim(); draw(); });
      search.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const f = grid.querySelector('.type-card'); if (f) f.click(); } });
      m.body.innerHTML = '';
      m.body.append(h('div', { class: 'create-wrap' }, h('div', { class: 'toolbar', style: { margin: 0 } }, h('label', { class: 'search-field' }, I('search', 16), search), pills), grid));
      m.setButtons([]);
      draw();
      setTimeout(() => search.focus(), 30);
    }
    function step2(id) {
      const t = T.byId(id);
      m.box.className = 'modal mid';
      hTitle.textContent = 'Konten baru'; hSub.textContent = 'Beri judul lalu mulai mengedit';
      const title = h('input', { class: 'input', value: t.name + ' baru' });
      const r1 = h('input', { type: 'radio', name: 'start', checked: true });
      const r2 = h('input', { type: 'radio', name: 'start' });
      const folders = S.folders();
      const folderSel = h('select', { class: 'input' }, h('option', { value: '', text: 'Tanpa folder' }), folders.map((f) => h('option', { value: f, text: f })));
      const rq = currentRoute().q.get('folder'); if (rq) folderSel.value = rq;
      m.body.innerHTML = '';
      m.body.append(
        typeId ? null : h('button', { type: 'button', class: 'step-back', onClick: step1 }, I('chevron-left', 14), 'Ganti tipe'),
        h('div', { class: 'sel-type' }, tile(id, 'lg', 20), h('div', null, h('b', { text: t.name }), h('p', { text: t.desc }))),
        h('div', { class: 'stack' },
          h('label', { class: 'field' }, h('span', { text: 'Judul' }), title),
          h('div', { class: 'field' }, h('span', { text: 'Mulai dari' }),
            h('div', { class: 'choice-grid' },
              h('label', { class: 'choice' }, r1, h('div', null, h('b', { text: 'Contoh' }), h('small', { text: 'Terisi contoh yang bisa diubah' }))),
              h('label', { class: 'choice' }, r2, h('div', null, h('b', { text: 'Kosong' }), h('small', { text: 'Mulai dari formulir kosong' }))))),
          folders.length ? h('label', { class: 'field' }, h('span', { text: 'Folder' }), folderSel) : null));
      m.setButtons([{ label: 'Batal', ghost: true }, { label: 'Buat & edit', primary: true, onClick: () => {
        const c = S.create(id, title.value.trim() || t.name, T.newParams(id, r1.checked));
        if (folderSel.value) S.patch(c.id, { folder: folderSel.value });
        go('#/edit/' + c.id);
      } }]);
      setTimeout(() => { title.focus(); title.select(); }, 30);
    }
    if (typeId) step2(typeId); else step1();
  }

  /* ================================================================ pustaka */
  const selected = new Set();
  function viewLibrary(r) {
    const s = S.settings();
    const st = { q: r.q.get('q') || '', type: r.q.get('type') || '', folder: r.q.get('folder') || '', tag: r.q.get('tag') || '', fav: !!r.q.get('fav'), sort: r.q.get('sort') || s.sort };
    let title = 'Pustaka';
    if (st.fav) title = 'Favorit';
    if (st.folder) title = st.folder;
    const actions = [];
    if (st.folder) actions.push(h('button', { type: 'button', class: 'btn ghost', title: 'Opsi folder', 'aria-label': 'Opsi folder', onClick: (e) => { e.stopPropagation(); popMenu(e.currentTarget, [
      { icon: 'pencil', label: 'Ganti nama folder', act: async () => { const n = await App.prompt('Ganti nama folder', 'Nama baru', st.folder); if (n && n !== st.folder) { S.renameFolder(st.folder, n); go('#/library?folder=' + encodeURIComponent(n)); } } },
      { icon: 'trash', label: 'Hapus folder', danger: true, act: async () => { if (await App.confirm('Hapus folder?', 'Konten di dalamnya tidak ikut terhapus.', 'Hapus folder', true)) { S.removeFolder(st.folder); go('#/library'); } } },
    ]); } }, I('more', 18)));
    actions.push(h('button', { type: 'button', class: 'btn', onClick: openImport }, I('upload', 16), 'Impor'), h('button', { type: 'button', class: 'btn primary', onClick: () => openCreate() }, I('plus', 16), 'Buat konten'));
    const head = pageHead(title, ' ', actions);
    main.append(head);
    const sub = head.querySelector('.sub');

    const search = h('input', { class: 'input', type: 'search', placeholder: 'Cari judul, tag, penulis…', value: st.q });
    const typeSel = h('select', { class: 'input', 'aria-label': 'Filter tipe' }, h('option', { value: '', text: 'Semua tipe' }), T.TYPES.map((t) => h('option', { value: t.id, text: t.name })));
    typeSel.value = st.type;
    const sortSel = h('select', { class: 'input', 'aria-label': 'Urutkan' }, [['updated', 'Terakhir diubah'], ['created', 'Terbaru dibuat'], ['title', 'Judul A–Z'], ['type', 'Tipe'], ['views', 'Paling sering diputar']].map((o) => h('option', { value: o[0], text: o[1] })));
    sortSel.value = st.sort;
    const seg = h('div', { class: 'seg icons', role: 'group', 'aria-label': 'Tampilan' },
      h('button', { type: 'button', class: s.view === 'grid' ? 'on' : '', title: 'Kisi', 'aria-label': 'Kisi', onClick: () => { S.setSettings({ view: 'grid' }); rerender(); } }, I('grid', 16)),
      h('button', { type: 'button', class: s.view === 'list' ? 'on' : '', title: 'Daftar', 'aria-label': 'Daftar', onClick: () => { S.setSettings({ view: 'list' }); rerender(); } }, I('list', 16)));
    main.append(h('div', { class: 'toolbar' }, h('label', { class: 'search-field' }, I('search', 16), search), typeSel, sortSel, seg));
    const tags = S.tags();
    const tagRow = h('div', { class: 'chips', style: { marginTop: '-.5rem', marginBottom: '1.25rem' } });
    if (tags.length) main.append(tagRow);
    const out = h('div');
    main.append(out);
    let bulk = null;

    function list() {
      const q = st.q.toLowerCase();
      const l = S.all().filter((c) => {
        if (st.fav && !c.favorite) return false;
        if (st.folder && c.folder !== st.folder) return false;
        if (st.tag && !((c.meta && c.meta.tags) || []).includes(st.tag)) return false;
        if (st.type && c.type !== st.type) return false;
        if (q) {
          const hay = [c.title, c.meta && c.meta.description, c.meta && c.meta.author, ((c.meta && c.meta.tags) || []).join(' '), typeName(c.type)].join(' ').toLowerCase();
          if (hay.indexOf(q) < 0) return false;
        }
        return true;
      });
      const by = {
        updated: (a, b) => (b.updated || '').localeCompare(a.updated || ''), created: (a, b) => (b.created || '').localeCompare(a.created || ''),
        title: (a, b) => a.title.localeCompare(b.title, 'id'), type: (a, b) => typeName(a.type).localeCompare(typeName(b.type)) || a.title.localeCompare(b.title),
        views: (a, b) => (b.views || 0) - (a.views || 0),
      };
      return l.sort(by[st.sort] || by.updated);
    }
    function draw() {
      tagRow.innerHTML = '';
      tags.forEach((t) => tagRow.append(h('button', { type: 'button', class: 'pill' + (st.tag === t.name ? ' on' : ''), onClick: () => { st.tag = st.tag === t.name ? '' : t.name; upd(); } }, I('tag', 12), t.name)));
      const l = list();
      sub.textContent = l.length + ' konten' + (st.tag ? ' dengan tag "' + st.tag + '"' : '');
      Array.from(selected).forEach((id) => { if (!S.get(id)) selected.delete(id); });
      out.innerHTML = '';
      if (!l.length) {
        const filtered = st.q || st.type || st.tag;
        out.append(h('div', { class: 'card' }, filtered
          ? emptyState('search', 'Tidak ada yang cocok', 'Coba ubah kata kunci atau filter.', h('button', { type: 'button', class: 'btn', onClick: () => { st.q = ''; st.type = ''; st.tag = ''; search.value = ''; typeSel.value = ''; upd(); } }, 'Hapus filter'))
          : emptyState(st.fav ? 'star' : 'book', st.fav ? 'Belum ada favorit' : 'Belum ada konten', st.fav ? 'Tandai konten dengan bintang agar mudah ditemukan.' : 'Buat konten pertama Anda atau impor berkas .h5p.', st.fav ? null : h('button', { type: 'button', class: 'btn primary', onClick: () => openCreate() }, I('plus', 16), 'Buat konten'))));
        drawBulk(l); return;
      }
      if (s.view === 'list') {
        const allCb = h('input', { type: 'checkbox', class: 'check', 'aria-label': 'Pilih semua', checked: l.every((c) => selected.has(c.id)) || null });
        allCb.addEventListener('change', () => { l.forEach((c) => (allCb.checked ? selected.add(c.id) : selected.delete(c.id))); draw(); });
        const box = h('div', { class: 'list-view' }, h('div', { class: 'l-row head' }, allCb, h('span', { text: 'Judul' }), h('span', { text: 'Tipe' }), h('span', { text: 'Diubah' }), h('span')));
        l.forEach((c) => {
          const cb = h('input', { type: 'checkbox', class: 'check', checked: selected.has(c.id) || null, 'aria-label': 'Pilih ' + c.title });
          cb.addEventListener('change', () => { cb.checked ? selected.add(c.id) : selected.delete(c.id); drawBulk(l); });
          box.append(h('div', { class: 'l-row' }, cb,
            h('div', { class: 'l-title', onClick: () => go('#/edit/' + c.id) }, tile(c.type, '', 16), h('div', { style: { minWidth: 0 } }, h('b', { text: c.title }), h('small', { text: [c.favorite ? '★ Favorit' : '', c.folder].filter(Boolean).join(' · ') || typeName(c.type) }))),
            h('span', { class: 'muted small', text: typeName(c.type) }), h('span', { class: 'muted small', text: relTime(c.updated) }),
            h('button', { type: 'button', class: 'icon-btn sm', 'aria-label': 'Opsi', onClick: (e) => { e.stopPropagation(); popMenu(e.currentTarget, cardMenu(c)); } }, I('more', 16))));
        });
        out.append(box);
      } else {
        const g = h('div', { class: 'lib-grid' + (selected.size ? ' selecting' : '') });
        l.forEach((c) => g.append(contentCard(c, true, () => { g.classList.toggle('selecting', selected.size > 0); drawBulk(l); })));
        out.append(g);
      }
      drawBulk(l);
    }
    function drawBulk(l) {
      if (bulk) { bulk.remove(); bulk = null; }
      if (!selected.size) return;
      const ids = Array.from(selected);
      bulk = h('div', { class: 'bulkbar', role: 'toolbar', 'aria-label': 'Aksi terpilih' },
        h('b', { text: ids.length + ' dipilih' }),
        h('button', { type: 'button', class: 'btn sm', onClick: () => { l.forEach((c) => selected.add(c.id)); draw(); } }, 'Pilih semua'),
        h('span', { class: 'sep' }),
        h('button', { type: 'button', class: 'btn sm', onClick: () => moveToFolder(ids, draw) }, I('folder', 15), 'Pindahkan'),
        h('button', { type: 'button', class: 'btn sm', onClick: async () => { const t = await App.prompt('Tambah tag', 'Tag (pisahkan dengan koma)', '', 'mis. kelas7, ipa'); if (!t) return; const tg = t.split(',').map((x) => x.trim()).filter(Boolean); ids.forEach((id) => { const c = S.get(id); c.meta = c.meta || {}; c.meta.tags = Array.from(new Set((c.meta.tags || []).concat(tg))); S.save(c); }); App.toast('Tag ditambahkan', 'ok'); rerender(); } }, I('tag', 15), 'Tag'),
        h('button', { type: 'button', class: 'btn sm', onClick: () => X.exportBundle(ids.map((id) => S.get(id))) }, I('download', 15), 'Ekspor'),
        h('button', { type: 'button', class: 'btn sm danger', onClick: () => deleteContents(ids).then((ok) => { if (ok) { selected.clear(); draw(); } }) }, I('trash', 15), 'Hapus'),
        h('span', { class: 'sep' }),
        h('button', { type: 'button', class: 'btn sm', title: 'Batal pilih', 'aria-label': 'Batal pilih', onClick: () => { selected.clear(); draw(); } }, I('x', 15)));
      document.body.append(bulk);
    }
    function upd() {
      const p = new URLSearchParams();
      if (st.q) p.set('q', st.q); if (st.type) p.set('type', st.type); if (st.folder) p.set('folder', st.folder);
      if (st.tag) p.set('tag', st.tag); if (st.fav) p.set('fav', '1');
      const nh = '#/library' + (p.toString() ? '?' + p.toString() : '');
      if (location.hash !== nh) history.replaceState(null, '', nh);
      draw();
    }
    search.addEventListener('input', debounce(() => { st.q = search.value.trim(); upd(); }, 180));
    typeSel.addEventListener('change', () => { st.type = typeSel.value; upd(); });
    sortSel.addEventListener('change', () => { st.sort = sortSel.value; S.setSettings({ sort: st.sort }); upd(); });
    draw();
  }
  function cardMenu(c) {
    return [
      { icon: 'pencil', label: 'Edit', act: () => go('#/edit/' + c.id) },
      { icon: 'play', label: 'Putar', act: () => go('#/play/' + c.id) },
      { sep: true },
      { icon: 'type', label: 'Ganti nama', act: () => renameContent(c.id) },
      { icon: 'copy', label: 'Gandakan', act: () => { S.duplicate(c.id); App.toast('Salinan dibuat', 'ok'); rerender(); } },
      { icon: 'folder', label: 'Pindahkan ke folder…', act: () => moveToFolder([c.id], rerender) },
      { icon: 'star', label: c.favorite ? 'Hapus dari favorit' : 'Tambah ke favorit', act: () => { toggleFav(c.id); rerender(); } },
      { icon: 'download', label: 'Ekspor', sub: [
        { icon: 'package', label: 'Paket H5P (.h5p)', act: () => doExport('h5p', c.id) },
        { icon: 'globe', label: 'HTML mandiri', act: () => doExport('html', c.id) },
        { icon: 'graduation', label: 'SCORM 1.2', act: () => doExport('scorm', c.id) },
        { icon: 'braces', label: 'JSON', act: () => doExport('json', c.id) },
      ] },
      { sep: true },
      { icon: 'trash', label: 'Hapus', danger: true, act: () => deleteContents([c.id]).then((ok) => ok && rerender()) },
    ];
  }
  function contentCard(c, selectable, onSel) {
    const th = thumbOf(c);
    const card = h('div', { class: 'c-card' + (selectable && selected.has(c.id) ? ' selected' : '') });
    const top = h('div', { class: 'c-top' });
    if (selectable) {
      const cb = h('input', { type: 'checkbox', class: 'c-check', 'aria-label': 'Pilih ' + c.title, checked: selected.has(c.id) || null });
      cb.addEventListener('change', () => { cb.checked ? selected.add(c.id) : selected.delete(c.id); card.classList.toggle('selected', cb.checked); if (onSel) onSel(); });
      top.append(cb);
    } else top.append(h('span'));
    const fav = h('button', { type: 'button', class: 'c-fav' + (c.favorite ? ' on' : ''), title: c.favorite ? 'Hapus dari favorit' : 'Tambah ke favorit', 'aria-label': 'Favorit', 'aria-pressed': String(!!c.favorite) }, I('star', 16));
    fav.addEventListener('click', (e) => { e.stopPropagation(); toggleFav(c.id); fav.classList.toggle('on'); });
    top.append(fav);
    card.append(top,
      h('div', { class: 'c-thumb', style: { '--hue': hue(c.type) }, onClick: () => go('#/play/' + c.id), title: 'Putar' },
        th ? h('img', { src: th, alt: '', loading: 'lazy' }) : I((TM[c.type] || ['file'])[0], 34),
        h('div', { class: 'play-hover' }, I('play', 20))),
      h('div', { class: 'c-body' },
        h('div', { class: 'c-title', text: c.title, title: c.title, onClick: () => go('#/edit/' + c.id) }),
        h('div', { class: 'c-meta' }, h('span', { text: typeName(c.type) }), h('span', { class: 'dot' }), h('span', { text: relTime(c.updated) }))),
      h('button', { type: 'button', class: 'icon-btn sm c-more', 'aria-label': 'Opsi', onClick: (e) => { e.stopPropagation(); popMenu(e.currentTarget, cardMenu(c)); } }, I('more', 16)));
    return card;
  }
  function toggleFav(id) { const c = S.get(id); if (!c) return; S.patch(id, { favorite: !c.favorite }); refreshSidebar(); App.toast(!c.favorite ? 'Ditambahkan ke favorit' : 'Dihapus dari favorit'); }
  function moveToFolder(ids, after) {
    const folders = S.folders();
    const sel = h('select', { class: 'input' }, h('option', { value: '', text: 'Tanpa folder' }), folders.map((f) => h('option', { value: f, text: f })), h('option', { value: '__new', text: '+ Folder baru…' }));
    const nn = h('input', { class: 'input', placeholder: 'Nama folder baru', hidden: true });
    sel.addEventListener('change', () => { nn.hidden = sel.value !== '__new'; if (!nn.hidden) nn.focus(); });
    App.modal({ title: 'Pindahkan ke folder', sub: ids.length + ' konten', body: h('div', { class: 'stack' }, h('label', { class: 'field' }, h('span', { text: 'Folder tujuan' }), sel), nn), buttons: [{ label: 'Batal', ghost: true }, { label: 'Pindahkan', primary: true, onClick: () => {
      let f = sel.value;
      if (f === '__new') { f = nn.value.trim(); if (!f) return false; S.addFolder(f); }
      ids.forEach((id) => S.patch(id, { folder: f }));
      App.toast(ids.length + ' konten dipindahkan', 'ok'); refreshSidebar(); if (after) after();
    } }] });
  }
  async function renameContent(id) {
    const c = S.get(id);
    const n = await App.prompt('Ganti nama', 'Judul', c.title);
    if (!n) return;
    if (ED && ED.c.id === id) { ED.c.title = n; const t = $('.ed-title'); if (t) t.value = n; changed(); }
    else { S.patch(id, { title: n }); rerender(); }
  }
  function renameCurrent() { const id = currentId(); if (id) renameContent(id); }
  async function deleteContents(ids, navigate) {
    if (S.settings().confirmDelete) {
      const ok = await App.confirm(ids.length === 1 ? 'Hapus konten?' : 'Hapus ' + ids.length + ' konten?', 'Konten akan dipindahkan ke Sampah dan masih bisa dipulihkan.', 'Pindahkan ke sampah', true);
      if (!ok) return false;
    }
    ids.forEach((id) => S.remove(id));
    if (ED && ids.indexOf(ED.c.id) >= 0) ED = null;
    App.toast(ids.length + ' konten dipindahkan ke sampah', 'ok');
    refreshSidebar();
    if (navigate) go('#/library');
    return true;
  }

  /* ================================================================= editor */
  function viewEdit(r) {
    const stored = S.get(r.id);
    if (!stored) { main.className = 'main'; main.append(h('div', { class: 'card' }, emptyState('alert', 'Konten tidak ditemukan', 'Mungkin sudah dihapus.', h('a', { class: 'btn', href: '#/library' }, 'Kembali ke pustaka')))); return; }
    S.touch(stored.id);
    if (!ED || ED.c.id !== stored.id) {
      const c = S.clone(stored);
      const t = T.byId(c.type);
      c.params = Object.assign(T.defaultsFor(t.schema), c.params || {});
      c.meta = Object.assign({ tags: [] }, c.meta || {});
      c.settings = c.settings || {};
      ED = { c: c, dirty: false, history: [], hi: -1, tab: 'content', device: 'desktop' };
      pushHistory(true);
    }
    const c = ED.c, s = S.settings();
    const titleInp = h('input', { class: 'ed-title', value: c.title, 'aria-label': 'Judul konten', placeholder: 'Judul konten' });
    titleInp.addEventListener('input', () => { c.title = titleInp.value; changed(); });
    const status = h('button', { type: 'button', class: 'ed-status btn ghost sm', onClick: () => saveEditor(true) });
    const undoB = h('button', { type: 'button', class: 'icon-btn hide-mobile', title: 'Urungkan (' + MOD + '+Z)', 'aria-label': 'Urungkan', onClick: undo }, I('undo', 18));
    const redoB = h('button', { type: 'button', class: 'icon-btn hide-mobile', title: 'Ulangi (' + MOD + '+Y)', 'aria-label': 'Ulangi', onClick: redo }, I('redo', 18));
    const view = s.editorView || 'split';
    const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Mode tampilan editor', id: 'ed-seg' },
      [['form', 'form', 'Formulir'], ['split', 'split', 'Split'], ['preview', 'eye', 'Pratinjau']].map((v) =>
        h('button', { type: 'button', 'data-v': v[0], class: (view === v[0] ? 'on' : '') + (v[0] === 'split' ? ' opt-split' : ''), title: v[2], 'aria-pressed': String(view === v[0]), onClick: () => setEditorView(v[0]) }, I(v[1], 15), h('span', { class: 'hide-mobile', text: v[2] }))));
    ED.ui = { undoB: undoB, redoB: redoB, status: status };
    const head = h('div', { class: 'ed-head' },
      h('a', { class: 'icon-btn', href: '#/library', title: 'Kembali ke pustaka', 'aria-label': 'Kembali' }, I('arrow-left', 18)),
      tile(c.type, 'hide-mobile', 16), titleInp, status,
      h('span', { class: 'spacer' }),
      undoB, redoB, h('span', { class: 'ed-vsep hide-mobile' }), seg, h('span', { class: 'ed-vsep hide-mobile' }),
      h('button', { type: 'button', class: 'btn ghost', title: 'Putar (' + MOD + '+Enter)', onClick: playCurrent }, I('play', 15), h('span', { class: 'hide-mobile', text: 'Putar' })),
      s.autosave ? null : h('button', { type: 'button', class: 'btn', onClick: () => saveEditor(true) }, I('save', 15), h('span', { class: 'hide-mobile', text: 'Simpan' })),
      h('button', { type: 'button', class: 'btn primary', onClick: () => exportDialog(c.id) }, I('download', 15), h('span', { class: 'hide-mobile', text: 'Ekspor' })),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Opsi lainnya', onClick: (e) => { e.stopPropagation(); popMenu(e.currentTarget, [
        { icon: 'copy', label: 'Simpan sebagai salinan', act: saveAsCopy },
        { icon: 'star', label: S.get(c.id) && S.get(c.id).favorite ? 'Hapus dari favorit' : 'Tambah ke favorit', act: () => toggleFav(c.id) },
        { icon: 'info', label: 'Detail & lisensi', act: () => setTab('meta') },
        { sep: true },
        { icon: 'trash', label: 'Hapus konten', danger: true, act: () => deleteContents([c.id], true) },
      ]); } }, I('more', 18)));

    const tabs = h('div', { class: 'ed-tabs', role: 'tablist' });
    const pane = h('div', { class: 'ed-pane' });
    const form = h('div', { class: 'ed-form' }, tabs, h('div', { class: 'ed-form-inner' }, pane));
    const paper = h('div', { class: 'paper w-' + ED.device });
    const devSeg = h('div', { class: 'seg icons' }, [['desktop', 'monitor', 'Desktop'], ['tablet', 'tablet', 'Tablet'], ['mobile', 'phone', 'Ponsel']].map((d) =>
      h('button', { type: 'button', class: ED.device === d[0] ? 'on' : '', title: d[2], 'aria-label': d[2], onClick: (e) => { ED.device = d[0]; paper.className = 'paper w-' + d[0]; devSeg.querySelectorAll('button').forEach((b) => b.classList.remove('on')); e.currentTarget.classList.add('on'); } }, I(d[1], 15))));
    const preview = h('div', { class: 'ed-preview' },
      h('div', { class: 'ed-preview-bar' }, h('span', { class: 'live', text: 'Pratinjau langsung' }), h('span', { class: 'spacer' }), devSeg,
        h('button', { type: 'button', class: 'icon-btn sm', title: 'Muat ulang pratinjau', 'aria-label': 'Muat ulang', onClick: () => renderPreview(true) }, I('refresh', 15))),
      h('div', { class: 'ed-preview-scroll' }, paper));
    main.append(h('div', { class: 'editor' }, head, h('div', { class: 'ed-body v-' + view, id: 'ed-body' }, form, preview)));
    ED.ui.paper = paper; ED.ui.pane = pane; ED.ui.tabs = tabs;
    drawTabs(); drawPane(); renderPreview(true); updateStatus();
  }
  function setEditorView(v) {
    S.setSettings({ editorView: v });
    const b = $('#ed-body');
    if (!b) { App.toast('Mode editor: ' + { form: 'formulir', split: 'formulir + pratinjau', preview: 'pratinjau' }[v]); return; }
    b.className = 'ed-body v-' + v;
    document.querySelectorAll('#ed-seg button').forEach((x) => { const on = x.dataset.v === v; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
    renderPreview(true);
  }
  function drawTabs() {
    const tabs = ED.ui.tabs;
    tabs.innerHTML = '';
    const n = T.validate(ED.c.type, ED.c.params).length;
    [['content', 'Konten'], ['meta', 'Detail'], ['look', 'Tampilan'], ['issues', 'Periksa']].forEach(([id, label]) => {
      tabs.append(h('button', { type: 'button', role: 'tab', 'aria-selected': String(ED.tab === id), class: ED.tab === id ? 'on' : '', onClick: () => setTab(id) },
        label, id === 'issues' && n ? h('span', { class: 'badge warn', text: String(n) }) : null));
    });
  }
  function setTab(id) { if (!ED) return; ED.tab = id; drawTabs(); drawPane(); const f = $('.ed-form'); if (f) f.scrollTop = 0; }
  function drawPane() {
    const pane = ED.ui.pane, c = ED.c, t = T.byId(c.type);
    pane.innerHTML = '';
    if (ED.tab === 'content') {
      pane.append(h('div', { class: 'ed-intro' }, tile(c.type, 'lg', 20), h('div', null, h('b', { text: t.name }), h('p', { text: t.desc }))));
      const host = h('div');
      pane.append(host);
      E.build(host, t.schema, c.params, { onChange: changed, root: c.params });
    } else if (ED.tab === 'meta') {
      const m = c.meta;
      const fld = (label, key, el, full) => { el.value = m[key] || ''; el.addEventListener('input', () => { m[key] = el.value; changed(); }); return h('label', { class: 'field' + (full ? ' full' : '') }, h('span', { text: label }), el); };
      const titleI = h('input', { class: 'input', value: c.title });
      titleI.addEventListener('input', () => { c.title = titleI.value; const tt = $('.ed-title'); if (tt) tt.value = c.title; changed(); });
      const tags = h('input', { class: 'input', value: (m.tags || []).join(', '), placeholder: 'mis. matematika, kelas 7' });
      tags.addEventListener('input', () => { m.tags = tags.value.split(',').map((x) => x.trim()).filter(Boolean); changed(); });
      const folderSel = h('select', { class: 'input' }, h('option', { value: '', text: 'Tanpa folder' }), S.folders().map((x) => h('option', { value: x, text: x })), h('option', { value: '__new', text: '+ Folder baru…' }));
      folderSel.value = c.folder || '';
      folderSel.addEventListener('change', async () => {
        if (folderSel.value === '__new') { const n = await App.prompt('Folder baru', 'Nama folder'); if (n) { S.addFolder(n); c.folder = n; } drawPane(); }
        else c.folder = folderSel.value;
        changed();
      });
      const lic = h('select', { class: 'input' }, ['CC BY 4.0', 'CC BY-SA 4.0', 'CC BY-NC 4.0', 'CC BY-NC-SA 4.0', 'CC BY-ND 4.0', 'CC BY-NC-ND 4.0', 'CC0 1.0', 'Domain publik', 'Hak cipta', 'Tidak ditentukan'].map((x) => h('option', { value: x, text: x })));
      const lang = h('select', { class: 'input' }, [['id', 'Bahasa Indonesia'], ['en', 'English'], ['jv', 'Basa Jawa'], ['su', 'Basa Sunda'], ['ms', 'Bahasa Melayu'], ['ar', 'العربية']].map((x) => h('option', { value: x[0], text: x[1] })));
      pane.append(h('div', { class: 'form-grid' },
        h('label', { class: 'field full' }, h('span', { text: 'Judul' }), titleI),
        fld('Deskripsi', 'description', h('textarea', { class: 'input', rows: 3, placeholder: 'Ringkasan singkat isi konten' }), true),
        h('label', { class: 'field' }, h('span', { text: 'Folder' }), folderSel),
        h('label', { class: 'field' }, h('span', { text: 'Tag' }), tags),
        fld('Penulis', 'author', h('input', { class: 'input' })),
        fld('Tahun', 'year', h('input', { class: 'input', type: 'number', min: 1900, max: 2100 })),
        fld('Lisensi', 'license', lic),
        fld('Bahasa', 'language', lang),
        fld('Sumber', 'source', h('input', { class: 'input', type: 'url', placeholder: 'https://…' }), true)));
      pane.append(h('hr'), h('dl', { class: 'kv' },
        h('dt', { text: 'Dibuat' }), h('dd', { text: fmtDate(c.created, true) }),
        h('dt', { text: 'Diubah' }), h('dd', { text: fmtDate(c.updated, true) }),
        h('dt', { text: 'Ukuran data' }), h('dd', { text: E.fmtBytes(S.sizeOf(c)) }),
        h('dt', { text: 'Pustaka H5P' }), h('dd', null, h('code', { text: t.h5p }))));
    } else if (ED.tab === 'look') {
      const st = c.settings;
      const colors = ['#22318f', '#1d4ed8', '#0f766e', '#166534', '#9a3412', '#be123c', '#6b21a8', '#1f2937'];
      const sw = h('div', { class: 'swatches' });
      const custom = h('input', { type: 'color', value: st.accent || S.settings().accent, title: 'Warna kustom', 'aria-label': 'Warna kustom' });
      const drawSw = () => {
        sw.innerHTML = '';
        sw.append(h('button', { type: 'button', class: 'pill' + (!st.accent ? ' on' : ''), text: 'Bawaan', onClick: () => { delete st.accent; drawSw(); changed(); } }));
        colors.forEach((col) => sw.append(h('button', { type: 'button', class: 'swatch' + (st.accent === col ? ' on' : ''), style: { background: col }, 'aria-label': col, onClick: () => { st.accent = col; drawSw(); changed(); } }, st.accent === col ? I('check', 14) : null)));
        sw.append(custom);
      };
      drawSw();
      custom.addEventListener('input', () => { st.accent = custom.value; drawSw(); changed(); });
      pane.append(h('div', { class: 'field' }, h('span', { text: 'Warna aksen' }), h('p', { class: 'fe-help', text: 'Dipakai untuk tombol dan sorotan saat konten diputar maupun diekspor.' }), sw));
    } else if (ED.tab === 'issues') {
      const issues = T.validate(c.type, c.params);
      if (!c.title.trim()) issues.unshift('Judul konten masih kosong.');
      pane.append(issues.length
        ? h('div', { class: 'stack' }, h('p', { class: 'muted', text: issues.length + ' hal perlu diperiksa sebelum dibagikan:' }), h('ul', { class: 'issues' }, issues.map((x) => h('li', null, I('alert', 16), h('span', { text: x })))))
        : h('div', { class: 'ok-box' }, I('check-circle', 20), 'Semua lengkap. Konten siap diputar dan diekspor.'));
      const size = S.sizeOf(c);
      add(pane, [h('hr'), h('h3', { text: 'Format ekspor', style: { marginBottom: '.75rem' } }),
        h('div', { class: 'choice-list' },
          exportInfo('package', 'Paket H5P', 'Untuk Moodle, WordPress, atau Lumi (pustaka ' + t.h5p + ').'),
          exportInfo('globe', 'HTML mandiri', 'Satu berkas, bisa diputar tanpa internet.'),
          exportInfo('graduation', 'SCORM 1.2', 'Untuk LMS, mengirim skor dan status lulus.')),
        size > 1024 * 1024 ? h('p', { class: 'fe-help', style: { marginTop: '1rem' }, text: 'Ukuran konten ' + E.fmtBytes(size) + ' — pertimbangkan gambar yang lebih kecil.' }) : null]);
    }
  }
  function exportInfo(icon, title, desc) { return h('div', { class: 'choice', style: { cursor: 'default', alignItems: 'center' } }, h('span', { class: 'tile', style: { '--hue': 'var(--accent)' } }, I(icon, 16)), h('div', null, h('b', { text: title }), h('small', { text: desc }))); }

  const renderPreviewD = debounce(() => renderPreview(true), 300);
  function renderPreview(now) {
    if (!now) { renderPreviewD(); return; }
    if (!ED || !ED.ui || !ED.ui.paper) return;
    if ((S.settings().editorView || 'split') === 'form') return;
    const sc = ED.ui.paper.parentNode.scrollTop;
    P.render(ED.ui.paper, ED.c, { onResult: () => {} });
    ED.ui.paper.parentNode.scrollTop = sc;
  }
  const autosave = debounce(() => { if (ED && ED.dirty && S.settings().autosave) saveEditor(false, true); }, 1200);
  const historyPush = debounce(() => pushHistory(), 450);
  function changed() {
    if (!ED) return;
    ED.dirty = true;
    updateStatus(); renderPreview(); historyPush(); autosave();
    const n = T.validate(ED.c.type, ED.c.params).length;
    const b = ED.ui.tabs.querySelector('.badge');
    if ((n > 0) !== !!b || (b && b.textContent !== String(n))) drawTabs();
  }
  function snapshot() { return JSON.stringify({ title: ED.c.title, params: ED.c.params, meta: ED.c.meta, settings: ED.c.settings, folder: ED.c.folder }); }
  function pushHistory(initial) {
    if (!ED) return;
    const snap = snapshot();
    if (!initial && ED.history[ED.hi] === snap) return;
    ED.history = ED.history.slice(0, ED.hi + 1);
    ED.history.push(snap);
    if (ED.history.length > 100) ED.history.shift();
    ED.hi = ED.history.length - 1;
    updateStatus();
  }
  function restoreSnap(i) {
    Object.assign(ED.c, JSON.parse(ED.history[i]));
    ED.hi = i; ED.dirty = true;
    const tt = $('.ed-title'); if (tt) tt.value = ED.c.title;
    drawTabs(); drawPane(); renderPreview(true); updateStatus(); autosave();
  }
  function undo() { if (!ED) return; pushHistory(); if (ED.hi > 0) restoreSnap(ED.hi - 1); }
  function redo() { if (!ED) return; if (ED.hi < ED.history.length - 1) restoreSnap(ED.hi + 1); }
  function updateStatus() {
    if (!ED || !ED.ui) return;
    const st = ED.ui.status;
    st.textContent = ED.dirty ? (S.settings().autosave ? 'Menyimpan…' : 'Belum disimpan') : 'Tersimpan';
    st.className = 'ed-status btn ghost sm hide-mobile' + (ED.dirty ? ' dirty' : '');
    st.title = (ED.savedAt ? 'Disimpan ' + relTime(ED.savedAt) + ' · ' : '') + 'Klik untuk menyimpan (' + MOD + '+S)';
    ED.ui.undoB.disabled = ED.hi <= 0;
    ED.ui.redoB.disabled = ED.hi >= ED.history.length - 1;
  }
  function saveEditor(notify, silent) {
    if (!ED) return false;
    try {
      const stored = S.get(ED.c.id) || {};
      const toSave = Object.assign({}, stored, S.clone(ED.c));
      toSave.title = (toSave.title || '').trim() || 'Tanpa judul';
      const saved = S.save(toSave);
      ED.c.updated = saved.updated; ED.c.created = saved.created;
      ED.dirty = false; ED.savedAt = saved.updated; ED.warned = false;
      updateStatus(); refreshSidebar();
      if (notify) App.toast('Tersimpan', 'ok', 1600);
      return true;
    } catch (e) {
      if (!silent || !ED.warned) App.toast(e.message, 'error', 6000);
      if (silent) ED.warned = true;
      return false;
    }
  }
  function saveAsCopy() {
    if (!ED) return;
    const c = S.clone(ED.c);
    c.id = S.uid(); c.title = c.title + ' (salinan)'; c.created = null; c.views = 0;
    try { S.save(c); ED.dirty = false; App.toast('Disimpan sebagai salinan', 'ok'); go('#/edit/' + c.id); } catch (e) { App.toast(e.message, 'error'); }
  }
  function playCurrent() { const id = currentId(); if (!id) return; if (ED) saveEditor(false); go('#/play/' + id); }

  /* ================================================================= putar */
  function viewPlay(r) {
    const c = S.get(r.id);
    if (!c) { main.append(h('div', { class: 'card' }, emptyState('alert', 'Konten tidak ditemukan', null, h('a', { class: 'btn', href: '#/library' }, 'Kembali')))); return; }
    S.touch(c.id); S.bumpViews(c.id);
    const paper = h('div', { class: 'paper', id: 'play-paper' });
    const attempts = h('div', { class: 'attempts' });
    main.append(h('div', { class: 'play' },
      h('div', { class: 'play-head' },
        h('a', { class: 'icon-btn', href: '#/library', title: 'Kembali', 'aria-label': 'Kembali' }, I('arrow-left', 18)),
        h('div', { style: { minWidth: 0 } }, h('div', { class: 'crumb' }, tile(c.type, '', 12), typeName(c.type)), h('h1', { text: c.title })),
        h('span', { class: 'spacer' }),
        h('button', { type: 'button', class: 'icon-btn', title: 'Mulai ulang', 'aria-label': 'Mulai ulang', onClick: () => draw() }, I('refresh', 18)),
        h('button', { type: 'button', class: 'icon-btn', title: 'Layar penuh', 'aria-label': 'Layar penuh', onClick: () => { if (paper.requestFullscreen) paper.requestFullscreen(); } }, I('maximize', 18)),
        h('button', { type: 'button', class: 'btn', onClick: () => exportDialog(c.id) }, I('download', 15), h('span', { class: 'hide-mobile', text: 'Ekspor' })),
        h('a', { class: 'btn primary', href: '#/edit/' + c.id }, I('pencil', 15), 'Edit')),
      paper, attempts));
    function draw() {
      P.render(paper, c, { showTitle: false, onResult: (score, max, extra) => {
        const pct = max ? Math.round((score / max) * 100) : 0;
        try { S.addResult({ contentId: c.id, title: c.title, type: c.type, score: score, max: max, pct: pct, extra: extra }); } catch (e) { App.toast(e.message, 'error'); }
        App.toast('Skor dicatat: ' + score + '/' + max + ' (' + pct + '%)', 'ok');
        drawAttempts();
      } });
    }
    function drawAttempts() {
      const res = S.results(c.id);
      attempts.innerHTML = '';
      if (!res.length) return;
      const best = Math.max.apply(null, res.map((x) => x.pct));
      const avg = Math.round(res.reduce((a, x) => a + x.pct, 0) / res.length);
      attempts.append(h('div', { class: 'card section' },
        h('div', { class: 'card-head' }, h('h2', { text: 'Riwayat percobaan' }), h('span', { class: 'badge', text: String(res.length) }), h('span', { class: 'spacer' }),
          h('span', { class: 'muted small hide-mobile', text: 'Terbaik ' + best + '%, rata-rata ' + avg + '%' }),
          h('button', { type: 'button', class: 'icon-btn sm danger', title: 'Hapus riwayat', 'aria-label': 'Hapus riwayat', onClick: async () => { if (await App.confirm('Hapus riwayat?', 'Semua hasil untuk konten ini akan dihapus.', 'Hapus', true)) { S.clearResults(c.id); drawAttempts(); } } }, I('trash', 15))),
        h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' },
          h('thead', null, h('tr', null, h('th', { text: 'Waktu' }), h('th', { text: 'Skor' }), h('th', { text: 'Persentase' }))),
          h('tbody', null, res.slice(0, 10).map((x) => h('tr', null, h('td', { class: 'muted', text: fmtDate(x.date, true) }), h('td', { text: x.score + ' / ' + x.max }), h('td', null, scoreEl(x.pct)))))))));
    }
    draw(); drawAttempts();
  }
  function scoreEl(pct) { return h('span', { class: 'score ' + (pct >= 70 ? 'good' : pct >= 40 ? 'mid' : ''), text: pct + '%' }); }

  /* ================================================================= hasil */
  function viewResults() {
    const res = S.results();
    main.append(pageHead('Hasil', 'Skor dicatat setiap kali konten diselesaikan dalam mode putar.', res.length ? [
      h('button', { type: 'button', class: 'btn', onClick: () => exportCSV(res) }, I('download', 15), 'Unduh CSV'),
      h('button', { type: 'button', class: 'btn danger', onClick: async () => { if (await App.confirm('Hapus semua hasil?', 'Seluruh riwayat percobaan akan dihapus permanen.', 'Hapus semua', true)) { S.clearResults(); rerender(); } } }, I('trash', 15), 'Hapus semua'),
    ] : null));
    if (!res.length) { main.append(h('div', { class: 'card' }, emptyState('chart', 'Belum ada hasil', 'Putar dan selesaikan sebuah konten untuk mulai mencatat skor.', h('a', { class: 'btn primary', href: '#/library' }, 'Buka pustaka')))); return; }
    const avg = Math.round(res.reduce((a, r) => a + r.pct, 0) / res.length);
    const passed = res.filter((r) => r.pct >= 50).length;
    const today = res.filter((r) => new Date(r.date).toDateString() === new Date().toDateString()).length;
    main.append(h('div', { class: 'stats' }, statBox('target', 'Total percobaan', res.length), statBox('percent', 'Rata-rata skor', avg + '%'), statBox('award', 'Skor ≥ 50%', Math.round((passed / res.length) * 100) + '%'), statBox('calendar', 'Hari ini', today)));
    const by = {};
    res.forEach((r) => { (by[r.contentId] = by[r.contentId] || []).push(r); });
    const rows = Object.keys(by).map((id) => {
      const l = by[id];
      return { id: id, title: (S.get(id) || {}).title || l[0].title, type: l[0].type, n: l.length, avg: Math.round(l.reduce((a, r) => a + r.pct, 0) / l.length), best: Math.max.apply(null, l.map((r) => r.pct)), last: l[0].date, exists: !!S.get(id) };
    }).sort((a, b) => b.n - a.n);
    main.append(h('div', { class: 'card section' }, h('div', { class: 'card-head' }, h('h2', { text: 'Rata-rata per konten' })),
      h('div', { class: 'bars' }, rows.slice(0, 10).map((r) => h('div', { class: 'bar-row' }, h('span', { title: r.title, text: r.title }), h('div', { class: 'bar' }, h('i', { style: { width: Math.max(r.avg, 1) + '%' } })), scoreEl(r.avg))))));
    main.append(h('div', { class: 'card section' }, h('div', { class: 'card-head' }, h('h2', { text: 'Per konten' })), h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' },
      h('thead', null, h('tr', null, ['Konten', 'Tipe', 'Percobaan', 'Rata-rata', 'Terbaik', 'Terakhir', ''].map((x) => h('th', { text: x })))),
      h('tbody', null, rows.map((r) => h('tr', null,
        h('td', null, r.exists ? h('span', { class: 'link', text: r.title, onClick: () => go('#/play/' + r.id) }) : h('span', { class: 'muted', text: r.title + ' (terhapus)' })),
        h('td', { class: 'muted', text: typeName(r.type) }), h('td', { text: String(r.n) }), h('td', null, scoreEl(r.avg)), h('td', null, scoreEl(r.best)), h('td', { class: 'muted', text: relTime(r.last) }),
        h('td', null, h('button', { type: 'button', class: 'icon-btn sm danger', title: 'Hapus hasil', 'aria-label': 'Hapus hasil', onClick: () => { S.clearResults(r.id); rerender(); } }, I('trash', 15))))))))));
    main.append(h('div', { class: 'card section' }, h('div', { class: 'card-head' }, h('h2', { text: 'Percobaan terbaru' })), h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' },
      h('thead', null, h('tr', null, ['Waktu', 'Konten', 'Skor', 'Persentase'].map((x) => h('th', { text: x })))),
      h('tbody', null, res.slice(0, 30).map((r) => h('tr', null, h('td', { class: 'muted', text: fmtDate(r.date, true) }), h('td', { text: r.title }), h('td', { text: r.score + ' / ' + r.max }), h('td', null, scoreEl(r.pct)))))))));
  }
  function exportCSV(res) {
    const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const lines = [['Waktu', 'ID Konten', 'Judul', 'Tipe', 'Skor', 'Maks', 'Persen'].join(',')].concat(res.map((r) => [r.date, r.contentId, r.title, typeName(r.type), r.score, r.max, r.pct].map(esc).join(',')));
    X.download(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv' }), 'hasil-lumin-' + new Date().toISOString().slice(0, 10) + '.csv');
  }

  /* ================================================================= sampah */
  function viewTrash() {
    const tr = S.trash();
    const days = S.settings().trashDays;
    main.append(pageHead('Sampah', days ? 'Konten dihapus permanen otomatis setelah ' + days + ' hari.' : 'Penghapusan otomatis nonaktif.', tr.length ? [
      h('button', { type: 'button', class: 'btn', onClick: () => { tr.forEach((c) => S.restore(c.id)); App.toast('Semua konten dipulihkan', 'ok'); rerender(); } }, I('restore', 15), 'Pulihkan semua'),
      h('button', { type: 'button', class: 'btn danger', onClick: async () => { if (await App.confirm('Kosongkan sampah?', tr.length + ' konten akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.', 'Hapus permanen', true)) { S.emptyTrash(); rerender(); } } }, I('trash', 15), 'Kosongkan'),
    ] : null));
    if (!tr.length) { main.append(h('div', { class: 'card' }, emptyState('trash', 'Sampah kosong', 'Konten yang Anda hapus akan muncul di sini.'))); return; }
    const cols = { gridTemplateColumns: 'minmax(0,1fr) 140px auto' };
    const box = h('div', { class: 'list-view' }, h('div', { class: 'l-row head', style: cols }, h('span', { text: 'Judul' }), h('span', { text: 'Dihapus' }), h('span')));
    tr.forEach((c) => box.append(h('div', { class: 'l-row', style: cols },
      h('div', { class: 'l-title', style: { cursor: 'default' } }, tile(c.type, '', 16), h('div', { style: { minWidth: 0 } }, h('b', { text: c.title }), h('small', { text: typeName(c.type) }))),
      h('span', { class: 'muted small', text: relTime(c.deleted) }),
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn sm', onClick: () => { S.restore(c.id); App.toast('Dipulihkan', 'ok'); rerender(); } }, I('restore', 14), 'Pulihkan'),
        h('button', { type: 'button', class: 'icon-btn sm danger', title: 'Hapus permanen', 'aria-label': 'Hapus permanen', onClick: async () => { if (await App.confirm('Hapus permanen?', '"' + c.title + '" akan dihapus selamanya.', 'Hapus', true)) { S.purge(c.id); rerender(); } } }, I('x', 15))))));
    main.append(box);
  }

  /* ============================================================= pengaturan */
  function viewSettings() {
    const s = S.settings();
    const set = (k, v, quiet) => { const o = {}; o[k] = v; S.setSettings(o); applyTheme(); refreshSidebar(); if (!quiet) App.toast('Disimpan', 'ok', 1200); };
    const row = (title, desc, control) => h('div', { class: 'set-row' }, h('div', null, h('div', { class: 't', text: title }), desc ? h('div', { class: 'd', text: desc }) : null), control);
    const sw = (k) => { const i = h('input', { type: 'checkbox', class: 'switch', checked: !!s[k] || null, 'aria-label': k }); i.addEventListener('change', () => set(k, i.checked)); return i; };
    const sel = (k, opts) => { const e = h('select', { class: 'input' }, opts.map((o) => h('option', { value: o[0], text: o[1] }))); e.value = s[k]; e.addEventListener('change', () => set(k, /^\d+$/.test(e.value) ? Number(e.value) : e.value)); return e; };
    const inp = (k, ph) => { const e = h('input', { class: 'input', value: s[k] || '', placeholder: ph || '' }); e.addEventListener('change', () => set(k, e.value.trim())); return e; };
    const themeSeg = h('div', { class: 'seg' }, [['system', 'monitor', 'Sistem'], ['light', 'sun', 'Terang'], ['dark', 'moon', 'Gelap']].map((t) =>
      h('button', { type: 'button', class: s.theme === t[0] ? 'on' : '', onClick: () => { set('theme', t[0], true); rerender(); } }, I(t[1], 15), t[2])));
    const sws = h('div', { class: 'swatches' });
    ['#22318f', '#1d4ed8', '#0f766e', '#166534', '#9a3412', '#be123c', '#6b21a8', '#1f2937'].forEach((col) => sws.append(h('button', { type: 'button', class: 'swatch' + (s.accent === col ? ' on' : ''), style: { background: col }, 'aria-label': col, onClick: () => { set('accent', col, true); rerender(); } }, s.accent === col ? I('check', 14) : null)));
    const ci = h('input', { type: 'color', value: s.accent, title: 'Warna kustom', 'aria-label': 'Warna kustom' });
    ci.addEventListener('change', () => { set('accent', ci.value, true); rerender(); });
    sws.append(ci);
    const u = S.usage();
    const pct = Math.min(100, (u.bytes / u.quota) * 100);
    const group = (id, title, desc, rows) => h('section', { class: 'set-group', id: 'set-' + id }, h('h2', { text: title }), h('p', { text: desc }), h('div', { class: 'card' }, rows));

    main.append(pageHead('Pengaturan', 'Disimpan di Local Storage peramban ini.'));
    main.append(h('div', { class: 'settings' },
      h('nav', { class: 'set-nav' }, [['look', 'palette', 'Tampilan'], ['editor', 'pencil', 'Editor'], ['meta', 'file-text', 'Metadata'], ['storage', 'drive', 'Penyimpanan'], ['data', 'archive', 'Data']].map((x) =>
        h('a', { href: '#/settings', onClick: (e) => { e.preventDefault(); $('#set-' + x[0]).scrollIntoView({ behavior: 'smooth' }); } }, I(x[1], 16), x[2]))),
      h('div', null,
        group('look', 'Tampilan', 'Sesuaikan tampilan aplikasi.', [
          row('Tema', null, themeSeg),
          row('Warna aksen', 'Warna utama tombol dan sorotan', sws),
          row('Tampilan pustaka', null, sel('view', [['grid', 'Kisi'], ['list', 'Daftar']])),
          row('Sidebar ringkas', 'Hanya tampilkan ikon', sw('sidebarCollapsed'))]),
        group('editor', 'Editor', 'Perilaku saat mengedit konten.', [
          row('Simpan otomatis', 'Perubahan disimpan saat Anda mengetik', sw('autosave')),
          row('Mode tampilan', 'Tata letak bawaan editor', sel('editorView', [['split', 'Formulir + pratinjau'], ['form', 'Formulir saja'], ['preview', 'Pratinjau saja']])),
          row('Konfirmasi hapus', 'Tanyakan sebelum memindahkan ke sampah', sw('confirmDelete')),
          row('Hapus sampah otomatis', null, sel('trashDays', [[0, 'Tidak pernah'], [7, 'Setelah 7 hari'], [30, 'Setelah 30 hari'], [90, 'Setelah 90 hari']]))]),
        group('meta', 'Metadata bawaan', 'Diisi otomatis pada setiap konten baru.', [
          row('Nama penulis', null, inp('author', 'Nama Anda')),
          row('Lisensi', null, sel('license', ['CC BY 4.0', 'CC BY-SA 4.0', 'CC BY-NC 4.0', 'CC BY-NC-SA 4.0', 'CC0 1.0', 'Hak cipta', 'Tidak ditentukan'].map((x) => [x, x]))),
          row('Bahasa', null, sel('language', [['id', 'Bahasa Indonesia'], ['en', 'English'], ['jv', 'Basa Jawa'], ['su', 'Basa Sunda'], ['ms', 'Bahasa Melayu']]))]),
        group('storage', 'Penyimpanan', 'Local Storage dibatasi sekitar 5 MB per situs.', [
          h('div', { class: 'set-row', style: { display: 'block' } },
            h('div', { class: 'row' }, h('span', { class: 't', text: E.fmtBytes(u.bytes) + ' terpakai' }), h('span', { class: 'spacer' }), h('span', { class: 'muted small', text: Math.round(pct) + '% dari ±' + E.fmtBytes(u.quota) })),
            h('div', { class: 'meter' + (pct > 90 ? ' full' : pct > 70 ? ' warn' : ''), style: { height: '6px', margin: '.7rem 0' } }, h('i', { style: { width: Math.max(pct, 1) + '%' } })),
            h('div', { class: 'row wrap muted small', style: { gap: '1.25rem' } }, [['contents', 'Konten'], ['trash', 'Sampah'], ['results', 'Hasil'], ['settings', 'Pengaturan']].map((k) => h('span', { text: k[1] + ': ' + E.fmtBytes(u.per[k[0]] || 0) }))))]),
        group('data', 'Data', 'Cadangkan atau pindahkan data ke perangkat lain.', [
          row('Unduh cadangan', 'Seluruh konten, hasil, dan pengaturan dalam satu berkas', h('button', { type: 'button', class: 'btn', onClick: backupNow }, I('download', 15), 'Unduh')),
          row('Pulihkan cadangan', 'Gabungkan atau ganti data dari berkas cadangan', h('button', { type: 'button', class: 'btn', onClick: openImport }, I('upload', 15), 'Pilih berkas')),
          row('Atur ulang pengaturan', 'Kembalikan semua pengaturan ke bawaan', h('button', { type: 'button', class: 'btn', onClick: async () => { if (await App.confirm('Atur ulang pengaturan?', 'Konten tidak terpengaruh.', 'Atur ulang')) { S.resetSettings(); S.setSettings({ editorView: 'split' }); applyTheme(); rerender(); } } }, 'Atur ulang')),
          row('Hapus semua data', 'Menghapus permanen seluruh data dari peramban ini', h('button', { type: 'button', class: 'btn danger', onClick: async () => {
            if (!(await App.confirm('Hapus semua data?', 'SEMUA konten, sampah, hasil, dan pengaturan akan dihapus permanen. Unduh cadangan terlebih dahulu jika perlu.', 'Hapus semua', true))) return;
            S.wipe(); ED = null; S.setSettings({ editorView: 'split' }); applyTheme(); App.toast('Semua data dihapus', 'ok'); go('#/home');
          } }, 'Hapus'))]))));
  }

  /* ================================================================ bantuan */
  const SHORTCUTS = [
    ['Palet perintah & pencarian', 'Mod K'], ['Konten baru', 'Alt N'], ['Pustaka', 'Alt L'], ['Simpan', 'Mod S'],
    ['Urungkan', 'Mod Z'], ['Ulangi', 'Mod Y'], ['Putar konten', 'Mod ↵'], ['Ekspor', 'Mod E'], ['Impor', 'Mod O'],
    ['Ganti mode editor', 'Mod ⇧ P'], ['Ganti nama', 'F2'], ['Sidebar', 'Mod \\'], ['Pengaturan', 'Mod ,'], ['Daftar pintasan', '?'],
  ];
  function shortcutList() {
    return h('div', { class: 'kbd-list' }, SHORTCUTS.map((x) => [h('span', { text: x[0] }), h('span', { class: 'keys' }, K(x[1]).split(' ').map((k) => h('span', { class: 'kbd', text: k })))]));
  }
  function viewHelp() {
    main.append(pageHead('Bantuan', 'Panduan singkat membuat dan membagikan konten interaktif.'));
    main.append(h('div', { class: 'grid help-grid' },
      h('div', { class: 'card pad prose', html: `
        <h3>Memulai</h3>
        <ol>
          <li>Klik <b>Buat konten</b> dan pilih salah satu dari ${T.TYPES.length} tipe.</li>
          <li>Isi formulir di kiri — pratinjau di kanan diperbarui otomatis.</li>
          <li>Perubahan tersimpan otomatis di <b>Local Storage</b>.</li>
          <li>Klik <b>Putar</b> untuk mencoba seperti pelajar; skor tercatat di <b>Hasil</b>.</li>
        </ol>
        <h3>Menandai jawaban dalam teks</h3>
        <ul>
          <li><b>Isi Titik-Titik</b>: <code>*Jakarta*</code>, alternatif <code>*Jakarta/DKI*</code>, petunjuk <code>*Jakarta:ibu kota*</code>.</li>
          <li><b>Seret Kata</b> &amp; <b>Tandai Kata</b>: apit kata benar dengan bintang, mis. <code>*fotosintesis*</code>.</li>
          <li><b>Set Pilihan Tunggal</b> &amp; <b>Ringkasan</b>: jawaban pertama selalu yang benar — urutan diacak saat diputar.</li>
        </ul>
        <h3>Ekspor</h3>
        <ul>
          <li><b>.h5p</b> — untuk Moodle, WordPress, atau Lumi; juga bisa diimpor kembali.</li>
          <li><b>HTML mandiri</b> — satu berkas, bisa dibuka tanpa internet atau disematkan dengan iframe.</li>
          <li><b>SCORM 1.2</b> — untuk LMS, mengirim skor dan status lulus.</li>
          <li><b>JSON</b> — format asli untuk memindahkan konten antar perangkat.</li>
        </ul>
        <h3>Penyimpanan</h3>
        <p>Data hanya ada di peramban ini (±5 MB). Unduh cadangan secara berkala dari Pengaturan, terutama sebelum membersihkan data peramban.</p>` }),
      h('div', { class: 'card pad' }, h('h2', { text: 'Pintasan keyboard', style: { marginBottom: '.75rem' } }), shortcutList())));
  }
  function showShortcuts() { App.modal({ title: 'Pintasan keyboard', size: 'mid', body: shortcutList() }); }
  function showAbout() {
    App.modal({ title: 'Lumin', sub: 'Pembuat konten interaktif H5P di peramban', headIcon: h('img', { src: 'assets/icon.svg', width: 40, height: 40, alt: '', style: { borderRadius: '10px' } }), body: h('div', { class: 'stack' },
      h('p', { class: 'muted', text: T.TYPES.length + ' tipe konten interaktif. Ekspor ke H5P, HTML, SCORM 1.2, dan JSON; impor berkas .h5p. Semua tersimpan di perangkat Anda, tanpa server.' }),
      h('p', { class: 'faint small', text: 'Terinspirasi dari Lumi Education. H5P adalah merek dagang H5P Group; Lumin adalah proyek independen.' })) });
  }

  /* ================================================================ ekspor */
  function exportDialog(id) {
    const c = ED && ED.c.id === id ? ED.c : S.get(id);
    if (!c) return;
    const opts = [
      ['h5p', 'package', 'Paket H5P (.h5p)', 'Untuk Moodle, WordPress, atau Lumi'],
      ['html', 'globe', 'HTML mandiri (.html)', 'Satu berkas, bisa dibuka tanpa internet'],
      ['scorm', 'graduation', 'SCORM 1.2 (.zip)', 'Untuk LMS; mengirim skor dan status lulus'],
      ['json', 'braces', 'Proyek Lumin (.json)', 'Untuk memindahkan konten ke perangkat lain'],
    ];
    let choice = 'h5p';
    const mastery = h('input', { class: 'input narrow', type: 'number', min: 0, max: 100, value: 50 });
    const masteryRow = h('label', { class: 'field', hidden: true }, h('span', { text: 'Nilai kelulusan (%)' }), mastery);
    const body = h('div', { class: 'stack' }, h('div', { class: 'choice-list' }, opts.map((o) => {
      const r = h('input', { type: 'radio', name: 'exp', checked: o[0] === choice || null });
      r.addEventListener('change', () => { choice = o[0]; masteryRow.hidden = choice !== 'scorm'; });
      return h('label', { class: 'choice', style: { alignItems: 'center' } }, r, h('span', { class: 'tile', style: { '--hue': 'var(--accent)' } }, I(o[1], 16)), h('div', null, h('b', { text: o[2] }), h('small', { text: o[3] })));
    })), masteryRow);
    App.modal({ title: 'Ekspor', sub: c.title, size: 'mid', body: body, buttons: [{ label: 'Batal', ghost: true }, { label: 'Unduh', icon: 'download', primary: true, onClick: () => doExport(choice, id, Number(mastery.value)) }] });
  }
  function doExport(kind, id, mastery) {
    id = id || currentId();
    if (!id) return;
    if (ED && ED.c.id === id && ED.dirty) saveEditor(false);
    const c = S.get(id);
    if (!c) return;
    try {
      if (kind === 'h5p') X.exportH5P(c);
      else if (kind === 'html') X.exportHTML(c);
      else if (kind === 'scorm') X.exportSCORM(c, mastery || 50);
      else X.exportJSON(c);
      App.toast('Berkas diunduh', 'ok');
    } catch (e) { App.toast('Gagal mengekspor: ' + e.message, 'error', 6000); console.error(e); }
  }
  function backupNow() { X.exportBackup(); App.toast('Cadangan diunduh', 'ok'); }

  /* ================================================================= impor */
  function openImport() { const i = $('#import-input'); i.value = ''; i.click(); }
  async function importFiles(files) {
    let count = 0, lastId = null;
    for (const f of files) {
      try {
        const r = await X.importFile(f);
        if (r.kind === 'backup') {
          const mode = await new Promise((res) => {
            let m = null;
            App.modal({ title: 'Pulihkan cadangan', sub: r.data.contents.length + ' konten, dibuat ' + fmtDate(r.data.exported, true), body: h('p', { class: 'muted', text: '"Gabungkan" menambahkan konten ke pustaka saat ini. "Ganti semua" menimpa seluruh data yang ada.' }),
              onClose: () => res(m), buttons: [{ label: 'Ganti semua', danger: true, left: true, onClick: () => { m = 'replace'; } }, { label: 'Batal', ghost: true }, { label: 'Gabungkan', primary: true, onClick: () => { m = 'merge'; } }] });
          });
          if (!mode) continue;
          const n = S.restoreBackup(r.data, mode);
          ED = null; applyTheme();
          App.toast(n + ' konten dipulihkan', 'ok');
          count += n;
        } else {
          r.items.forEach((d) => {
            const c = S.create(d.type, d.title, d.params, d.meta);
            if (d.settings) S.patch(c.id, { settings: d.settings });
            lastId = c.id; count++;
          });
          App.toast('Diimpor: ' + f.name, 'ok');
        }
      } catch (e) { App.toast(f.name + ': ' + e.message, 'error', 7000); console.error(e); }
    }
    refreshSidebar();
    if (count === 1 && lastId) go('#/edit/' + lastId);
    else if (count) go('#/library');
  }

  /* ============================================================= keyboard */
  function inText(e) { const t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable); }
  document.addEventListener('keydown', (e) => {
    if ($('.modal-back')) return;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (mod && k === 'k') { e.preventDefault(); openPalette(); }
    else if (mod && k === 's') { e.preventDefault(); if (ED) saveEditor(true); }
    else if (mod && !e.shiftKey && k === 'z' && !inText(e)) { e.preventDefault(); undo(); }
    else if (mod && (k === 'y' || (e.shiftKey && k === 'z')) && !inText(e)) { e.preventDefault(); redo(); }
    else if (mod && k === 'o') { e.preventDefault(); openImport(); }
    else if (mod && k === 'e') { const id = currentId(); if (id) { e.preventDefault(); exportDialog(id); } }
    else if (mod && k === 'enter') { const id = currentId(); if (id) { e.preventDefault(); if (ED) playCurrent(); else go('#/edit/' + id); } }
    else if (mod && e.shiftKey && k === 'p') { e.preventDefault(); const order = ['split', 'form', 'preview']; setEditorView(order[(order.indexOf(S.settings().editorView || 'split') + 1) % 3]); }
    else if (mod && e.key === '\\') { e.preventDefault(); toggleSidebar(); }
    else if (mod && e.key === ',') { e.preventDefault(); go('#/settings'); }
    else if (e.altKey && k === 'n') { e.preventDefault(); openCreate(); }
    else if (e.altKey && k === 'l') { e.preventDefault(); go('#/library'); }
    else if (e.key === 'F2' && currentId()) { e.preventDefault(); renameCurrent(); }
    else if (e.key === '?' && !inText(e)) { e.preventDefault(); showShortcuts(); }
    else if (e.key === '/' && !inText(e)) { e.preventDefault(); openPalette(); }
  });

  /* ================================================================== init */
  function init() {
    let ok = true;
    try { localStorage.setItem('lumiweb.__t', '1'); localStorage.removeItem('lumiweb.__t'); } catch (e) { ok = false; }
    buildShell();
    if (!ok) { main.append(h('div', { class: 'card' }, emptyState('alert', 'Local Storage tidak tersedia', 'Mungkin Anda dalam mode privat atau penyimpanan situs diblokir. Konten tidak dapat disimpan.'))); return; }
    const s = S.settings();
    if (!s.editorView) S.setSettings({ editorView: s.livePreview === false ? 'form' : 'split' });
    if (['#2563eb', '#4f46e5'].indexOf(s.accent) >= 0) S.setSettings({ accent: '#22318f' });
    applyTheme();
    S.autoPurge();
    if (!localStorage.getItem('lumiweb.contents')) seed();
    $('#import-input').addEventListener('change', (e) => importFiles(Array.from(e.target.files)));
    window.addEventListener('dragover', (e) => { if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files') && !(e.target.closest && e.target.closest('.fe-drop'))) e.preventDefault(); });
    window.addEventListener('drop', (e) => {
      if (e.target.closest && e.target.closest('.fe-drop, .rt-area')) return;
      const files = Array.from((e.dataTransfer && e.dataTransfer.files) || []).filter((f) => /\.(h5p|json|zip)$/i.test(f.name));
      if (files.length) { e.preventDefault(); importFiles(files); }
    });
    window.addEventListener('beforeunload', (e) => {
      if (ED && ED.dirty) { if (S.settings().autosave) saveEditor(false, true); else { e.preventDefault(); e.returnValue = ''; } }
    });
    window.addEventListener('storage', (e) => { if (e.key && e.key.indexOf('lumiweb.') === 0 && !ED) refreshSidebar(); });
    window.addEventListener('hashchange', onRoute);
    setInterval(updateStatus, 30000);
    onRoute();
  }
  function seed() {
    try {
      S.addFolder('Contoh');
      ['questionset', 'presentation', 'dragtext', 'flashcards', 'hotspots', 'memory', 'accordion'].forEach((id) => {
        const t = T.byId(id);
        const c = S.create(id, 'Contoh: ' + t.name, T.newParams(id, true), { tags: ['contoh'], description: 'Konten contoh bawaan Lumin.' });
        S.patch(c.id, { folder: 'Contoh' });
      });
    } catch (e) { /* abaikan */ }
  }

  init();
})();
