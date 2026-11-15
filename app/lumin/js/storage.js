/* =========================================================================
 * Lapisan penyimpanan berbasis localStorage.
 * Kunci:
 *   lumiweb.contents  -> array konten
 *   lumiweb.trash     -> array konten terhapus
 *   lumiweb.results   -> array hasil percobaan pengguna
 *   lumiweb.settings  -> objek pengaturan
 *   lumiweb.recent    -> array id terakhir dibuka
 * ========================================================================= */
(function () {
  'use strict';
  const P = 'lumiweb.';
  const listeners = [];

  function read(key, def) {
    try {
      const v = localStorage.getItem(P + key);
      return v == null ? def : JSON.parse(v);
    } catch (e) { return def; }
  }
  function write(key, val) {
    try {
      localStorage.setItem(P + key, JSON.stringify(val));
      listeners.forEach((fn) => fn(key));
      return true;
    } catch (e) {
      const full = e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014);
      throw new Error(full ? 'Penyimpanan peramban penuh. Hapus konten lama, kosongkan sampah, atau gunakan gambar yang lebih kecil.' : 'Gagal menyimpan: ' + e.message);
    }
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  const DEFAULT_SETTINGS = {
    theme: 'system', accent: '#22318f', editorView: 'split', autosave: true, autosaveDelay: 1500, view: 'grid', sort: 'updated',
    author: '', license: 'CC BY 4.0', language: 'id', confirmDelete: true, livePreview: true, sidebarCollapsed: false, trashDays: 30,
  };

  const Store = {
    uid: uid,
    clone: clone,
    onChange(fn) { listeners.push(fn); },

    /* ---------- konten */
    all() { return read('contents', []); },
    get(id) { return this.all().find((c) => c.id === id) || null; },
    save(content) {
      const list = this.all();
      const now = new Date().toISOString();
      content.updated = now;
      if (!content.created) content.created = now;
      const i = list.findIndex((c) => c.id === content.id);
      if (i >= 0) list[i] = content; else list.unshift(content);
      write('contents', list);
      return content;
    },
    create(type, title, params, meta) {
      const s = this.settings();
      const c = {
        id: uid(), type: type, title: title || 'Tanpa judul', params: params || {},
        meta: Object.assign({ author: s.author, license: s.license, language: s.language, description: '', tags: [] }, meta || {}),
        favorite: false, folder: '', views: 0,
      };
      return this.save(c);
    },
    duplicate(id) {
      const c = this.get(id);
      if (!c) return null;
      const d = clone(c);
      d.id = uid(); d.title = c.title + ' (salinan)'; d.created = null; d.views = 0;
      return this.save(d);
    },
    remove(id) {
      const list = this.all();
      const c = list.find((x) => x.id === id);
      if (!c) return;
      write('contents', list.filter((x) => x.id !== id));
      const trash = read('trash', []);
      c.deleted = new Date().toISOString();
      trash.unshift(c);
      write('trash', trash);
      this.setRecent(this.recent().filter((r) => r !== id));
    },
    patch(id, fields) {
      const c = this.get(id);
      if (!c) return null;
      Object.assign(c, fields);
      return this.save(c);
    },
    bumpViews(id) {
      const list = this.all();
      const c = list.find((x) => x.id === id);
      if (c) { c.views = (c.views || 0) + 1; write('contents', list); }
    },

    /* ---------- sampah */
    trash() { return read('trash', []); },
    restore(id) {
      const trash = this.trash();
      const c = trash.find((x) => x.id === id);
      if (!c) return;
      delete c.deleted;
      write('trash', trash.filter((x) => x.id !== id));
      const list = this.all(); list.unshift(c); write('contents', list);
    },
    purge(id) { write('trash', this.trash().filter((x) => x.id !== id)); },
    emptyTrash() { write('trash', []); },
    autoPurge() {
      const days = Number(this.settings().trashDays) || 0;
      if (!days) return;
      const limit = Date.now() - days * 864e5;
      const t = this.trash();
      const keep = t.filter((x) => new Date(x.deleted).getTime() > limit);
      if (keep.length !== t.length) write('trash', keep);
    },

    /* ---------- folder */
    folders() {
      const set = new Set(read('folders', []));
      this.all().forEach((c) => { if (c.folder) set.add(c.folder); });
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    },
    addFolder(name) { const f = read('folders', []); if (f.indexOf(name) < 0) { f.push(name); write('folders', f); } },
    renameFolder(oldN, newN) {
      write('folders', read('folders', []).map((f) => (f === oldN ? newN : f)));
      const list = this.all(); list.forEach((c) => { if (c.folder === oldN) c.folder = newN; }); write('contents', list);
    },
    removeFolder(name) {
      write('folders', read('folders', []).filter((f) => f !== name));
      const list = this.all(); list.forEach((c) => { if (c.folder === name) c.folder = ''; }); write('contents', list);
    },

    /* ---------- tag */
    tags() {
      const m = {};
      this.all().forEach((c) => ((c.meta && c.meta.tags) || []).forEach((t) => (m[t] = (m[t] || 0) + 1)));
      return Object.keys(m).sort().map((k) => ({ name: k, count: m[k] }));
    },

    /* ---------- hasil */
    results(contentId) { const r = read('results', []); return contentId ? r.filter((x) => x.contentId === contentId) : r; },
    addResult(r) {
      const list = read('results', []);
      list.unshift(Object.assign({ id: uid(), date: new Date().toISOString() }, r));
      if (list.length > 2000) list.length = 2000;
      write('results', list);
    },
    clearResults(contentId) { write('results', contentId ? read('results', []).filter((x) => x.contentId !== contentId) : []); },

    /* ---------- riwayat */
    recent() { return read('recent', []); },
    setRecent(a) { write('recent', a.slice(0, 12)); },
    touch(id) { this.setRecent([id].concat(this.recent().filter((x) => x !== id))); },

    /* ---------- pengaturan */
    settings() { return Object.assign({}, DEFAULT_SETTINGS, read('settings', {})); },
    setSettings(s) { write('settings', Object.assign(this.settings(), s)); },
    resetSettings() { write('settings', {}); },

    /* ---------- cadangan */
    backup() {
      return {
        app: 'Lumin', format: 'backup', version: 1, exported: new Date().toISOString(),
        contents: this.all(), trash: this.trash(), results: read('results', []), settings: read('settings', {}), folders: read('folders', []),
      };
    },
    restoreBackup(data, mode) {
      if (!data || data.format !== 'backup' || !Array.isArray(data.contents)) throw new Error('File cadangan tidak valid.');
      if (mode === 'replace') {
        write('contents', data.contents);
        write('trash', data.trash || []);
        write('results', data.results || []);
        write('folders', data.folders || []);
        if (data.settings) write('settings', data.settings);
        return data.contents.length;
      }
      const list = this.all();
      const ids = new Set(list.map((c) => c.id));
      let n = 0;
      data.contents.forEach((c) => { if (ids.has(c.id)) c.id = uid(); list.push(c); n++; });
      write('contents', list);
      write('results', read('results', []).concat(data.results || []));
      return n;
    },
    wipe() { Object.keys(localStorage).filter((k) => k.indexOf(P) === 0).forEach((k) => localStorage.removeItem(k)); },

    /* ---------- kuota */
    usage() {
      let bytes = 0;
      const per = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        const v = localStorage.getItem(k) || '';
        const b = (k.length + v.length) * 2;
        bytes += b;
        if (k.indexOf(P) === 0) per[k.slice(P.length)] = b;
      }
      return { bytes: bytes, per: per, quota: 5 * 1024 * 1024 };
    },
    sizeOf(obj) { return JSON.stringify(obj).length * 2; },
  };

  window.LumiStore = Store;
})();
