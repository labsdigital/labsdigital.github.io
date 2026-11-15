/* =========================================================================
 * Ekspor & impor: JSON proyek, HTML mandiri, paket SCORM 1.2, paket .h5p
 * ========================================================================= */
(function () {
  'use strict';
  const T = window.LumiTypes;

  function slug(s) {
    return String(s || 'konten').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'konten';
  }
  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function escHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function safeJson(o) { return JSON.stringify(o).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'); }
  function exportable(c) {
    return { app: 'Lumin', format: 'content', version: 1, id: c.id, type: c.type, title: c.title, params: c.params, meta: c.meta, settings: c.settings, created: c.created, updated: c.updated };
  }

  /* ---------------------------------------------------------- JSON */
  function exportJSON(c) {
    download(new Blob([JSON.stringify(exportable(c), null, 2)], { type: 'application/json' }), slug(c.title) + '.lumin.json');
  }

  /* ---------------------------------------------------------- HTML */
  function buildHTML(c, opts) {
    opts = opts || {};
    const accent = (c.settings && c.settings.accent) || (window.LumiStore && LumiStore.settings().accent) || '#22318f';
    const data = Object.assign(exportable(c), { settings: { accent: accent } });
    const scorm = opts.scorm ? `
  var API=null;(function(w){for(var i=0;i<10&&w;i++){if(w.API){API=w.API;break;}if(w===w.parent)break;w=w.parent;}if(!API&&window.opener&&window.opener.API)API=window.opener.API;})(window);
  if(API){try{API.LMSInitialize("");var st=API.LMSGetValue("cmi.core.lesson_status");if(!st||st==="not attempted")API.LMSSetValue("cmi.core.lesson_status","incomplete");API.LMSCommit("");}catch(e){}}
  window.addEventListener("beforeunload",function(){if(API){try{API.LMSCommit("");API.LMSFinish("");}catch(e){}}});
  function report(s,m,x){if(!API)return;try{var pct=m?Math.round(s/m*100):100;API.LMSSetValue("cmi.core.score.raw",String(pct));API.LMSSetValue("cmi.core.score.min","0");API.LMSSetValue("cmi.core.score.max","100");API.LMSSetValue("cmi.core.lesson_status",pct>=${Number(opts.mastery) || 50}?"passed":"failed");API.LMSCommit("");}catch(e){}}
  if(API&&${JSON.stringify(['accordion', 'text', 'hotspots', 'slider', 'chart', 'dialogcards', 'guess'].indexOf(c.type) >= 0)}){try{API.LMSSetValue("cmi.core.lesson_status","completed");API.LMSCommit("");}catch(e){}}` : 'function report(){}';
    return `<!DOCTYPE html>
<html lang="${escHtml((c.meta && c.meta.language) || 'id')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="Lumin">
<title>${escHtml(c.title || 'Konten Interaktif')}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Schibsted+Grotesk:wght@600;700;800&display=swap">
<style>
html{background:#f3f5fa}
body{margin:0;padding:32px 16px;font-family:"Atkinson Hyperlegible",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#18181b}
#lumi-content{max-width:860px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e7e7ea;box-shadow:0 8px 30px rgba(0,0,0,.05)}
@media(max-width:600px){body{padding:8px}#lumi-content{padding:16px}}
</style>
</head>
<body>
<main id="lumi-content"></main>
<noscript>Aktifkan JavaScript untuk menampilkan konten interaktif ini.</noscript>
<script>
${LumiPlayerFactory.toString()}
LumiPlayerFactory.CSS = ${JSON.stringify(LumiPlayerFactory.CSS)};
(function(){
  ${scorm}
  var DATA = ${safeJson(data)};
  var player = LumiPlayerFactory();
  player.render(document.getElementById("lumi-content"), DATA, { onResult: function(s,m,x){ report(s,m,x); try{ if(window.parent!==window) window.parent.postMessage({source:"lumiweb",type:"result",score:s,max:m},"*"); }catch(e){} } });
})();
</script>
</body>
</html>`;
  }
  function exportHTML(c) {
    download(new Blob([buildHTML(c)], { type: 'text/html' }), slug(c.title) + '.html');
  }

  /* ---------------------------------------------------------- SCORM */
  function exportSCORM(c, mastery) {
    const id = 'LUMIWEB-' + c.id;
    const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${id}" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations default="ORG-1">
    <organization identifier="ORG-1">
      <title>${escHtml(c.title)}</title>
      <item identifier="ITEM-1" identifierref="RES-1" isvisible="true">
        <title>${escHtml(c.title)}</title>
        <adlcp:masteryscore>${Number(mastery) || 50}</adlcp:masteryscore>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-1" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>`;
    const blob = LumiZip.create([
      { name: 'imsmanifest.xml', data: manifest },
      { name: 'index.html', data: buildHTML(c, { scorm: true, mastery: mastery }) },
    ]);
    download(blob, slug(c.title) + '.scorm.zip');
  }

  /* ---------------------------------------------------------- H5P */
  const p = (s) => (s ? '<p>' + escHtml(s).replace(/\n/g, '<br>') + '</p>' : '');
  const div = (s) => (s ? '<div>' + escHtml(s) + '</div>' : '');
  const strip = (s) => String(s || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>\s*<p>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
  const file = (src) => (src ? { path: src, mime: mimeOf(src), copyright: { license: 'U' } } : undefined);
  let subId = 0;
  function sid() { subId++; return 'lw-' + Date.now().toString(36) + '-' + subId; }
  function imageLib(src) { return src ? { library: 'H5P.Image 1.1', params: { file: file(src), alt: '' }, subContentId: sid(), metadata: { contentType: 'Image', license: 'U' } } : undefined; }
  function mimeOf(src) {
    if (window.LumiPlayer && LumiPlayer.ytId && /youtu/i.test(String(src)) && LumiPlayer.ytId(src)) return 'video/YouTube';
    const m = String(src).match(/^data:([^;,]+)/);
    if (m) return m[1];
    const ext = (String(src).split('?')[0].split('.').pop() || '').toLowerCase();
    return { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', mp4: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg' }[ext] || 'application/octet-stream';
  }
  const libName = (id) => T.byId(id).h5p;

  const TO = {
    mc: (q) => ({
      question: p(q.question), media: q.image ? { type: imageLib(q.image) } : undefined,
      answers: (q.answers || []).map((a) => ({ text: div(a.text), correct: !!a.correct, tipsAndFeedback: { tip: '', chosenFeedback: div(a.feedback), notChosenFeedback: '' } })),
      behaviour: { enableRetry: q.retry !== false, enableSolutionsButton: q.showSolution !== false, enableCheckButton: true, type: 'auto', singlePoint: !!q.singlePoint, randomAnswers: !!q.randomize, showSolutionsRequiresInput: true, confirmCheckDialog: false, confirmRetryDialog: false, autoCheck: false, passPercentage: 100, showScorePoints: true },
      overallFeedback: [{ from: 0, to: 100 }],
      UI: { checkAnswerButton: 'Periksa', submitAnswerButton: 'Kirim', showSolutionButton: 'Tampilkan jawaban', tryAgainButton: 'Coba lagi', correctText: 'Benar!', incorrectText: 'Salah!' },
    }),
    tf: (q) => ({
      question: p(q.question), correct: String(q.correct === true || q.correct === 'true'), media: q.image ? { type: imageLib(q.image) } : undefined,
      behaviour: { enableRetry: q.retry !== false, enableSolutionsButton: q.showSolution !== false, enableCheckButton: true, confirmCheckDialog: false, confirmRetryDialog: false, autoCheck: false, feedbackOnCorrect: q.feedbackCorrect || '', feedbackOnWrong: q.feedbackWrong || '' },
      l10n: { trueText: 'Benar', falseText: 'Salah', checkAnswer: 'Periksa', showSolutionButton: 'Tampilkan jawaban', tryAgain: 'Coba lagi' },
    }),
    blanks: (q) => ({
      text: q.intro || '', media: q.image ? { type: imageLib(q.image) } : undefined,
      questions: String(q.text || '').split('\n').filter((l) => l.trim()).map((l) => '<p>' + escHtml(l) + '</p>'),
      behaviour: { enableRetry: q.retry !== false, enableSolutionsButton: q.showSolution !== false, enableCheckButton: true, caseSensitive: !!q.caseSensitive, showSolutionsRequiresInput: true, autoCheck: false, separateLines: false, confirmCheckDialog: false, confirmRetryDialog: false, acceptSpellingErrors: false },
      overallFeedback: [{ from: 0, to: 100 }], showSolutions: 'Tampilkan jawaban', tryAgain: 'Coba lagi', checkAnswer: 'Periksa',
    }),
    dragtext: (q) => ({
      taskDescription: q.intro || '', textField: String(q.text || ''),
      distractors: (q.distractors || []).map((d) => '*' + (d.text || '') + '*').join(' '),
      behaviour: { enableRetry: true, enableSolutionsButton: true, enableCheckButton: true, instantFeedback: false },
      overallFeedback: [{ from: 0, to: 100 }], checkAnswer: 'Periksa', tryAgain: 'Coba lagi', showSolution: 'Tampilkan jawaban',
    }),
    markwords: (q) => ({
      taskDescription: q.intro || '', textField: String(q.text || '').split('\n').map((l) => '<p>' + escHtml(l) + '</p>').join(''),
      behaviour: { enableRetry: true, enableSolutionsButton: true, enableCheckButton: true, showScorePoints: true },
      overallFeedback: [{ from: 0, to: 100 }], checkAnswerButton: 'Periksa', tryAgainButton: 'Coba lagi', showSolutionButton: 'Tampilkan jawaban',
    }),
    flashcards: (q) => ({ description: strip(q.intro), caseSensitive: !!q.caseSensitive, cards: (q.cards || []).map((c) => ({ text: c.question, answer: c.answer, tip: c.tip || '', image: file(c.image) })) }),
    dialogcards: (q) => ({
      description: q.intro || '', mode: 'normal',
      dialogs: (q.cards || []).map((c) => ({ text: p(c.front), answer: p(c.back), image: file(c.image), tips: {} })),
      behaviour: { enableRetry: true, disableBackwardsNavigation: false, scaleTextNotCard: false, randomCards: false },
    }),
    accordion: (q) => ({ hTag: 'h2', panels: (q.panels || []).map((pn) => ({ title: pn.title, content: { library: 'H5P.AdvancedText 1.1', params: { text: pn.content || '' }, subContentId: sid(), metadata: { contentType: 'Text', license: 'U' } } })) }),
    text: (q) => ({ text: (q.image ? '<p><img src="' + q.image + '"></p>' : '') + (q.content || '') }),
    singlechoice: (q) => ({
      choices: (q.items || []).map((it) => ({ question: p(it.question), answers: (it.answers || []).map((a) => p(a.text)), subContentId: sid() })),
      behaviour: { autoContinue: true, timeoutCorrect: 2000, timeoutWrong: 3000, soundEffectsEnabled: false, enableRetry: true, enableSolutionsButton: true, passPercentage: 100 },
      overallFeedback: [{ from: 0, to: 100 }],
    }),
    summary: (q) => ({ intro: q.intro || '', summaries: (q.groups || []).map((g) => ({ summary: (g.statements || []).map((s) => p(s.text)), subContentId: sid() })), overallFeedback: [{ from: 0, to: 100 }] }),
    essay: (q) => ({
      taskDescription: q.task || '', placeholderText: q.placeholder || '', solution: { sample: q.sample || '' },
      keywords: (q.keywords || []).map((k) => ({ keyword: k.keyword, alternatives: String(k.alternatives || '').split(',').map((s) => s.trim()).filter(Boolean), options: { points: Number(k.points) || 1, occurrences: 1, caseSensitive: false, forgiveMistakes: false, feedbackMissed: k.feedbackMissed || '', feedbackIncluded: '' } })),
      behaviour: { minimumLength: Number(q.minChars) || 0, maximumLength: Number(q.maxChars) || undefined, inputFieldSize: '10', enableRetry: true, ignoreScoring: false, percentagePassing: Number(q.passPercent) || 50, percentageMastering: 100 },
      overallFeedback: [{ from: 0, to: 100 }],
    }),
    sortpar: (q) => ({ taskDescription: q.intro || '', paragraphs: (q.paragraphs || []).map((x) => p(x.text)), behaviour: { enableRetry: true, enableSolutionsButton: true, scoringMode: 'positions', duplicatesInterchangeable: true } }),
    guess: (q) => ({ taskDescription: q.question, solutionLabel: 'Klik untuk melihat jawaban', solutionText: q.solution, media: q.image ? { type: imageLib(q.image) } : undefined }),
    memory: (q) => ({
      cards: (q.cards || []).map((c) => ({ image: file(c.image), match: file(c.matchImage), description: c.matchText || c.text || '', imageAlt: c.text || '' })),
      behaviour: { useGrid: true, allowRetry: true },
    }),
    chart: (q) => ({ graphMode: q.chartType === 'pie' ? 'pieChart' : 'barChart', listOfTypes: (q.items || []).map((i, k) => ({ text: i.label, value: Number(i.value) || 0, color: i.color || ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed'][k % 5], fontColor: '#ffffff' })) }),
    hotspots: (q) => ({
      image: file(q.image), backgroundImageAltText: q.alt || '', color: q.color || '#981d99', iconType: 'icon', icon: q.icon === 'info' ? 'info' : 'plus',
      hotspots: (q.hotspots || []).map((h) => ({ position: { x: Number(h.x) || 0, y: Number(h.y) || 0 }, alwaysFullscreen: false, header: h.title || '', content: [{ library: 'H5P.Text 1.1', params: { text: h.content || '' }, subContentId: sid() }].concat(h.image ? [imageLib(h.image)] : []) })),
    }),
    slider: (q) => ({ imageSlides: (q.slides || []).map((s) => ({ library: 'H5P.ImageSlide 1.1', subContentId: sid(), params: { image: imageLib(s.image) } })), aspectRatioMode: 'auto' }),
    questionset: (q) => ({
      introPage: { showIntroPage: !q.skipIntro, title: q.introTitle || '', introduction: q.introText || '', startButtonText: 'Mulai Kuis', backgroundImage: file(q.introImage) },
      progressType: 'dots', passPercentage: Number(q.passPercent) || 50, randomQuestions: !!q.randomize, disableBackwardsNavigation: false,
      questions: (q.questions || []).map((x) => { const t = x.qtype || 'mc'; return { library: libName(t), params: TO[t](x), subContentId: sid(), metadata: { contentType: T.byId(t).name, title: strip(x.question || x.text).slice(0, 60), license: 'U' } }; }),
      endGame: { showResultPage: true, showSolutionButton: q.allowSolution !== false, showRetryButton: true, noResultMessage: 'Selesai', message: 'Hasil Anda:', overallFeedback: [{ from: 0, to: 100, feedback: '' }], solutionButtonText: 'Tampilkan jawaban', retryButtonText: 'Ulangi', finishButtonText: 'Selesai', showAnimations: false, skippable: false },
      texts: { prevButton: 'Sebelumnya', nextButton: 'Berikutnya', finishButton: 'Selesai', textualProgress: 'Pertanyaan: @current dari @total' },
    }),
    presentation: (q) => ({
      presentation: {
        slides: (q.slides || []).map((s) => {
          const els = [];
          if (s.title || s.content) els.push({ x: 4, y: 4, width: s.image && s.layout !== 'top' ? 46 : 92, height: s.image && s.layout === 'top' ? 40 : 60, action: { library: 'H5P.AdvancedText 1.1', params: { text: (s.title ? '<h2>' + escHtml(s.title) + '</h2>' : '') + (s.content || '') }, subContentId: sid() }, alwaysDisplayComments: false, backgroundOpacity: 0, displayAsButton: false, invisible: false, solution: '' });
          if (s.image) els.push({ x: s.layout === 'top' ? 20 : 52, y: s.layout === 'top' ? 46 : 10, width: s.layout === 'top' ? 60 : 44, height: s.layout === 'top' ? 40 : 60, action: imageLib(s.image), alwaysDisplayComments: false, backgroundOpacity: 0, displayAsButton: false, invisible: false });
          if (s.hasQuiz) els.push({ x: 10, y: 66, width: 80, height: 30, action: { library: libName('mc'), params: TO.mc({ question: s.quizQuestion, answers: s.quizAnswers }), subContentId: sid() }, alwaysDisplayComments: false, backgroundOpacity: 0, displayAsButton: true, buttonSize: 'big', title: 'Kuis', invisible: false });
          return { elements: els, keywords: s.title ? [{ main: s.title }] : [], slideBackgroundSelector: s.bg ? { fillSlideBackground: s.bg } : {} };
        }),
        keywordListEnabled: true, keywordListAlwaysShow: false, globalBackgroundSelector: {},
      },
      override: { activeSurface: false, hideSummarySlide: false, enablePrintButton: false, social: { showFacebookShare: false, showTwitterShare: false, showGoogleShare: false } },
    }),
    ivideo: (q) => ({
      interactiveVideo: {
        video: { startScreenOptions: { title: 'Video interaktif', hideStartTitle: false }, files: q.video ? [{ path: q.video, mime: mimeOf(q.video), copyright: { license: 'U' } }] : [], textTracks: { videoTrack: [] } },
        assets: {
          interactions: (q.interactions || []).map((it) => {
            const t = Number(it.time) || 0;
            const action = it.kind === 'mc' ? { library: libName('mc'), params: TO.mc(it), subContentId: sid() }
              : it.kind === 'tf' ? { library: libName('tf'), params: TO.tf(it), subContentId: sid() }
                : { library: 'H5P.Text 1.1', params: { text: (it.title ? '<h3>' + escHtml(it.title) + '</h3>' : '') + (it.content || '') }, subContentId: sid() };
            return { x: 35, y: 25, width: 30, height: 30, duration: { from: t, to: t + 10 }, libraryTitle: it.kind === 'text' ? 'Text' : 'Question', action: action, pause: true, displayType: it.kind === 'text' ? 'button' : 'poster', buttonOnMobile: false, adaptivity: { correct: { allowOptOut: false }, wrong: { allowOptOut: false }, requireCompletion: false }, label: it.title ? '<p>' + escHtml(it.title) + '</p>' : '' };
          }),
          bookmarks: [], endscreens: [],
        },
        summary: { task: { library: 'H5P.Summary 1.10', params: { intro: '', summaries: [{}], overallFeedback: [{ from: 0, to: 100 }] }, subContentId: sid() }, displayAt: 3 },
      },
      override: { autoplay: false, loop: false, showBookmarksmenuOnLoad: false, showRewind10: false, preventSkipping: false, deactivateSound: false },
    }),
  };

  const SUB_LIBS = {
    mc: ['H5P.Image 1.1'], tf: ['H5P.Image 1.1'], blanks: ['H5P.Image 1.1'], guess: ['H5P.Image 1.1'], hotspots: ['H5P.Text 1.1', 'H5P.Image 1.1'],
    accordion: ['H5P.AdvancedText 1.1'], slider: ['H5P.ImageSlide 1.1', 'H5P.Image 1.1'],
    questionset: ['H5P.MultiChoice 1.16', 'H5P.TrueFalse 1.8', 'H5P.Blanks 1.14', 'H5P.DragText 1.10', 'H5P.MarkTheWords 1.11', 'H5P.Image 1.1'],
    presentation: ['H5P.AdvancedText 1.1', 'H5P.Image 1.1', 'H5P.MultiChoice 1.16'],
    ivideo: ['H5P.Video 1.6', 'H5P.Text 1.1', 'H5P.MultiChoice 1.16', 'H5P.TrueFalse 1.8', 'H5P.Summary 1.10'],
  };
  function depOf(lib) {
    const m = lib.match(/^(\S+) (\d+)\.(\d+)$/);
    return { machineName: m[1], majorVersion: Number(m[2]), minorVersion: Number(m[3]) };
  }

  function dataUrlToBytes(u) {
    const i = u.indexOf(',');
    const meta = u.slice(5, i);
    const body = u.slice(i + 1);
    if (/;base64/.test(meta)) { const bin = atob(body); const out = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) out[k] = bin.charCodeAt(k); return out; }
    return new TextEncoder().encode(decodeURIComponent(body));
  }
  function extOf(mime) { return ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'video/mp4': 'mp4', 'video/webm': 'webm' })[mime] || 'bin'; }

  function buildH5P(c) {
    subId = 0;
    const params = JSON.parse(JSON.stringify(TO[c.type] ? TO[c.type](c.params || {}) : {}));
    const files = [];
    let n = 0;
    // pindahkan data URL ke file terpisah
    (function walk(o) {
      if (!o || typeof o !== 'object') return;
      for (const k in o) {
        const v = o[k];
        if (k === 'path' && typeof v === 'string' && v.indexOf('data:') === 0) {
          const mime = mimeOf(v);
          const folder = mime.indexOf('video') === 0 ? 'videos' : 'images';
          const name = folder + '/' + (folder === 'videos' ? 'video' : 'image') + '-' + (++n) + '.' + extOf(mime);
          files.push({ name: 'content/' + name, data: dataUrlToBytes(v) });
          o[k] = name;
        } else if (typeof v === 'string' && v.indexOf('src="data:') >= 0) {
          o[k] = v.replace(/src="(data:[^"]+)"/g, (m, d) => { const mime = mimeOf(d); const name = 'images/image-' + (++n) + '.' + extOf(mime); files.push({ name: 'content/' + name, data: dataUrlToBytes(d) }); return 'src="' + name + '"'; });
        } else walk(v);
      }
    })(params);
    const t = T.byId(c.type);
    const main = depOf(t.h5p);
    const deps = [main].concat((SUB_LIBS[c.type] || []).map(depOf));
    const meta = c.meta || {};
    const licMap = { 'CC BY 4.0': 'CC BY', 'CC BY-SA 4.0': 'CC BY-SA', 'CC BY-NC 4.0': 'CC BY-NC', 'CC BY-NC-SA 4.0': 'CC BY-NC-SA', 'CC BY-ND 4.0': 'CC BY-ND', 'CC BY-NC-ND 4.0': 'CC BY-NC-ND', 'CC0 1.0': 'CC0 1.0', 'Hak cipta': 'C', 'Domain publik': 'PD' };
    const h5pJson = {
      title: c.title, language: meta.language || 'id', mainLibrary: main.machineName, embedTypes: ['iframe'],
      license: licMap[meta.license] || 'U', licenseVersion: /4\.0/.test(meta.license || '') ? '4.0' : undefined,
      authors: meta.author ? [{ name: meta.author, role: 'Author' }] : [],
      defaultLanguage: meta.language || 'id', preloadedDependencies: deps, extraTitle: c.title,
    };
    files.unshift(
      { name: 'h5p.json', data: JSON.stringify(h5pJson, null, 2) },
      { name: 'content/content.json', data: JSON.stringify(params) },
      { name: 'content/lumiweb.json', data: JSON.stringify(exportable(c)) },
    );
    return LumiZip.create(files);
  }
  function exportH5P(c) { download(buildH5P(c), slug(c.title) + '.h5p'); }

  /* ------------------------------------------------------------ IMPOR */
  function bytesToDataUrl(u8, mime) {
    let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return 'data:' + mime + ';base64,' + btoa(s);
  }
  const FROM = {
    'H5P.MultiChoice': (q, f) => ({ question: strip(q.question), image: f(q.media && q.media.type && q.media.type.params && q.media.type.params.file), answers: (q.answers || []).map((a) => ({ text: strip(a.text), correct: !!a.correct, feedback: strip(a.tipsAndFeedback && a.tipsAndFeedback.chosenFeedback) })), randomize: !!(q.behaviour && q.behaviour.randomAnswers), singlePoint: !!(q.behaviour && q.behaviour.singlePoint), retry: !(q.behaviour && q.behaviour.enableRetry === false), showSolution: !(q.behaviour && q.behaviour.enableSolutionsButton === false) }),
    'H5P.TrueFalse': (q, f) => ({ question: strip(q.question), correct: String(q.correct) === 'true', image: f(q.media && q.media.type && q.media.type.params && q.media.type.params.file), retry: true, showSolution: true }),
    'H5P.Blanks': (q) => ({ intro: q.text || '', text: (q.questions || []).map(strip).join('\n'), caseSensitive: !!(q.behaviour && q.behaviour.caseSensitive), retry: true, showSolution: true }),
    'H5P.DragText': (q) => ({ intro: q.taskDescription || '', text: strip(q.textField), distractors: (String(q.distractors || '').match(/\*([^*]+)\*/g) || []).map((d) => ({ text: d.replace(/\*/g, '') })) }),
    'H5P.MarkTheWords': (q) => ({ intro: q.taskDescription || '', text: strip(q.textField) }),
    'H5P.Flashcards': (q, f) => ({ intro: q.description ? '<p>' + escHtml(q.description) + '</p>' : '', caseSensitive: !!q.caseSensitive, cards: (q.cards || []).map((c) => ({ question: strip(c.text), answer: strip(c.answer), tip: strip(c.tip), image: f(c.image) })) }),
    'H5P.Dialogcards': (q, f) => ({ intro: q.description || '', cards: (q.dialogs || []).map((d) => ({ front: strip(d.text), back: strip(d.answer), image: f(d.image) })) }),
    'H5P.Accordion': (q) => ({ panels: (q.panels || []).map((pn) => ({ title: pn.title, content: (pn.content && pn.content.params && pn.content.params.text) || '' })) }),
    'H5P.AdvancedText': (q) => ({ content: q.text || '' }),
    'H5P.SingleChoiceSet': (q) => ({ items: (q.choices || []).map((c) => ({ question: strip(c.question), answers: (c.answers || []).map((a) => ({ text: strip(a) })) })) }),
    'H5P.Summary': (q) => ({ intro: q.intro || '', groups: (q.summaries || []).map((s) => ({ statements: (s.summary || []).map((x) => ({ text: strip(x) })) })) }),
    'H5P.Essay': (q) => ({ task: q.taskDescription || '', placeholder: q.placeholderText || '', sample: (q.solution && q.solution.sample) || '', keywords: (q.keywords || []).map((k) => ({ keyword: k.keyword, alternatives: (k.alternatives || []).join(', '), points: (k.options && k.options.points) || 1, feedbackMissed: k.options && k.options.feedbackMissed })), minChars: q.behaviour && q.behaviour.minimumLength, passPercent: q.behaviour && q.behaviour.percentagePassing }),
    'H5P.GuessTheAnswer': (q, f) => ({ question: strip(q.taskDescription), solution: q.solutionText, image: f(q.media && q.media.type && q.media.type.params && q.media.type.params.file) }),
    'H5P.ImageHotspots': (q, f) => ({ image: f(q.image), alt: q.backgroundImageAltText, color: q.color, hotspots: (q.hotspots || []).map((h) => ({ x: h.position && h.position.x, y: h.position && h.position.y, title: h.header, content: (h.content || []).map((c) => (c.params && c.params.text) || '').join('') })) }),
    'H5P.Chart': (q) => ({ chartType: q.graphMode === 'pieChart' ? 'pie' : 'bar', items: (q.listOfTypes || []).map((i) => ({ label: i.text, value: i.value, color: i.color })) }),
    'H5P.SortParagraphs': (q) => ({ intro: q.taskDescription || '', paragraphs: (q.paragraphs || []).map((x) => ({ text: strip(x) })) }),
    'H5P.QuestionSet': (q, f) => {
      const map = { 'H5P.MultiChoice': 'mc', 'H5P.TrueFalse': 'tf', 'H5P.Blanks': 'blanks', 'H5P.DragText': 'dragtext', 'H5P.MarkTheWords': 'markwords' };
      return {
        introTitle: q.introPage && q.introPage.title, introText: q.introPage && q.introPage.introduction, skipIntro: !(q.introPage && q.introPage.showIntroPage),
        passPercent: q.passPercentage, randomize: !!q.randomQuestions,
        questions: (q.questions || []).map((x) => { const n = String(x.library || '').split(' ')[0]; const t = map[n]; return t ? Object.assign({ qtype: t }, FROM[n](x.params || {}, f)) : null; }).filter(Boolean),
      };
    },
  };
  const LIB2TYPE = { 'H5P.MultiChoice': 'mc', 'H5P.TrueFalse': 'tf', 'H5P.Blanks': 'blanks', 'H5P.DragText': 'dragtext', 'H5P.MarkTheWords': 'markwords', 'H5P.Flashcards': 'flashcards', 'H5P.Dialogcards': 'dialogcards', 'H5P.Accordion': 'accordion', 'H5P.AdvancedText': 'text', 'H5P.SingleChoiceSet': 'singlechoice', 'H5P.Summary': 'summary', 'H5P.Essay': 'essay', 'H5P.GuessTheAnswer': 'guess', 'H5P.ImageHotspots': 'hotspots', 'H5P.Chart': 'chart', 'H5P.SortParagraphs': 'sortpar', 'H5P.QuestionSet': 'questionset' };

  async function importH5P(buffer) {
    const files = await LumiZip.read(buffer);
    const dec = new TextDecoder();
    if (files['content/lumiweb.json']) {
      const d = JSON.parse(dec.decode(files['content/lumiweb.json']));
      return [d];
    }
    if (!files['h5p.json'] || !files['content/content.json']) throw new Error('Paket H5P tidak lengkap (h5p.json / content.json tidak ditemukan).');
    const h5p = JSON.parse(dec.decode(files['h5p.json']));
    const content = JSON.parse(dec.decode(files['content/content.json']));
    const lib = h5p.mainLibrary;
    const type = LIB2TYPE[lib];
    if (!type) throw new Error('Tipe konten "' + lib + '" belum didukung untuk diimpor. Tipe yang didukung: ' + Object.keys(LIB2TYPE).join(', '));
    const f = (fo) => {
      if (!fo || !fo.path) return '';
      if (/^(https?:|data:)/.test(fo.path)) return fo.path;
      const key = 'content/' + fo.path.replace(/#tmp$/, '');
      return files[key] ? bytesToDataUrl(files[key], fo.mime || mimeOf(fo.path)) : '';
    };
    const params = FROM[lib](content, f);
    const author = (h5p.authors && h5p.authors[0] && h5p.authors[0].name) || '';
    return [{ type: type, title: h5p.title || 'Impor H5P', params: params, meta: { author: author, license: h5p.license || '', language: h5p.language || 'id', tags: ['impor-h5p'] } }];
  }

  /** Mengembalikan {kind:'contents'|'backup', items|data} */
  async function importFile(file) {
    const name = file.name.toLowerCase();
    if (name.endsWith('.h5p') || name.endsWith('.zip')) {
      return { kind: 'contents', items: await importH5P(await file.arrayBuffer()) };
    }
    const text = await file.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { throw new Error('File bukan JSON yang valid.'); }
    if (data.format === 'backup') return { kind: 'backup', data: data };
    const list = Array.isArray(data) ? data : data.format === 'bundle' ? data.contents : [data];
    list.forEach((d) => { if (!d || !d.type || !T.byId(d.type)) throw new Error('Tipe konten tidak dikenal di dalam file.'); });
    return { kind: 'contents', items: list };
  }

  function exportBundle(list, name) {
    download(new Blob([JSON.stringify({ app: 'Lumin', format: 'bundle', version: 1, contents: list.map(exportable) }, null, 2)], { type: 'application/json' }), (name || 'konten-terpilih') + '.lumin.json');
  }
  function exportBackup() {
    const d = LumiStore.backup();
    download(new Blob([JSON.stringify(d)], { type: 'application/json' }), 'lumin-cadangan-' + new Date().toISOString().slice(0, 10) + '.json');
  }

  window.LumiExport = { exportJSON, exportHTML, exportSCORM, exportH5P, exportBundle, exportBackup, buildHTML, buildH5P, importFile, download, slug };
})();
