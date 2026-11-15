/* =========================================================================
 * Registri tipe konten (setara "library" H5P).
 * Setiap tipe punya skema editor (mirip semantics.json H5P), parameter
 * contoh, dan pemetaan ke pustaka H5P resmi untuk ekspor .h5p.
 * ========================================================================= */
(function () {
  'use strict';

  function svgImg(label, c1, c2, extra) {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient></defs><rect width="800" height="450" fill="url(#g)"/>' + (extra || '') + '<text x="400" y="420" font-family="sans-serif" font-size="34" fill="#fff" text-anchor="middle" font-weight="bold">' + label + '</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  const SCENE = '<circle cx="640" cy="100" r="55" fill="#fde047"/><path d="M0 330 L180 160 L330 300 L470 140 L800 340 L800 450 L0 450Z" fill="#166534" opacity=".85"/><path d="M0 380 Q200 330 400 380 T800 370 L800 450 L0 450Z" fill="#0ea5e9"/>';

  const answersMC = {
    name: 'answers', type: 'list', label: 'Pilihan jawaban', itemLabel: 'Pilihan', min: 2, titleField: 'text',
    fields: [
      { name: 'text', type: 'text', label: 'Teks pilihan', required: true },
      { name: 'correct', type: 'boolean', label: 'Jawaban benar' },
      { name: 'feedback', type: 'text', label: 'Umpan balik saat dipilih', optional: true },
    ],
  };
  const behaviour = [
    { name: 'retry', type: 'boolean', label: 'Izinkan "Coba lagi"', default: true, group: 'Perilaku' },
    { name: 'showSolution', type: 'boolean', label: 'Izinkan "Tampilkan jawaban"', default: true, group: 'Perilaku' },
  ];

  const TYPES = [
    /* ------------------------------------------------------------ Kuis */
    {
      id: 'mc', name: 'Pilihan Ganda', icon: '☑️', category: 'Kuis & Soal', h5p: 'H5P.MultiChoice 1.16',
      desc: 'Pertanyaan dengan satu atau beberapa jawaban benar beserta umpan balik.',
      schema: [
        { name: 'question', type: 'textarea', label: 'Pertanyaan', required: true },
        { name: 'image', type: 'image', label: 'Gambar (opsional)' },
        answersMC,
        { name: 'randomize', type: 'boolean', label: 'Acak urutan pilihan', group: 'Perilaku' },
        { name: 'singlePoint', type: 'boolean', label: 'Beri 1 poin saja untuk seluruh soal', group: 'Perilaku' },
        ...behaviour,
        { name: 'feedbackCorrect', type: 'text', label: 'Pesan jika benar semua', group: 'Teks umpan balik' },
        { name: 'feedbackWrong', type: 'text', label: 'Pesan jika belum tepat', group: 'Teks umpan balik' },
      ],
      sample: {
        question: 'Planet manakah yang dijuluki "Planet Merah"?',
        answers: [
          { text: 'Mars', correct: true, feedback: 'Tepat! Warna merah berasal dari oksida besi.' },
          { text: 'Venus', correct: false, feedback: 'Venus adalah planet terpanas.' },
          { text: 'Jupiter', correct: false },
          { text: 'Merkurius', correct: false },
        ],
        randomize: true,
      },
    },
    {
      id: 'tf', name: 'Benar / Salah', icon: '✅', category: 'Kuis & Soal', h5p: 'H5P.TrueFalse 1.8',
      desc: 'Pernyataan sederhana yang harus dinilai benar atau salah.',
      schema: [
        { name: 'question', type: 'textarea', label: 'Pernyataan', required: true },
        { name: 'image', type: 'image', label: 'Gambar (opsional)' },
        { name: 'correct', type: 'select', label: 'Jawaban yang benar', options: [[true, 'Benar'], [false, 'Salah']], default: true },
        { name: 'feedbackCorrect', type: 'text', label: 'Umpan balik jika benar', group: 'Teks umpan balik' },
        { name: 'feedbackWrong', type: 'text', label: 'Umpan balik jika salah', group: 'Teks umpan balik' },
        ...behaviour,
      ],
      sample: { question: 'Air mendidih pada suhu 100 °C di permukaan laut.', correct: true },
    },
    {
      id: 'blanks', name: 'Isi Titik-Titik', icon: '✏️', category: 'Kuis & Soal', h5p: 'H5P.Blanks 1.14',
      desc: 'Teks dengan isian kosong. Tandai jawaban dengan *bintang*.',
      schema: [
        { name: 'intro', type: 'html', label: 'Instruksi' },
        { name: 'image', type: 'image', label: 'Gambar (opsional)' },
        { name: 'text', type: 'textarea', label: 'Teks', rows: 6, required: true,
          help: 'Apit jawaban dengan tanda bintang: *jawaban*. Jawaban alternatif dipisah "/": *Jakarta/DKI Jakarta*. Petunjuk setelah titik dua: *Jakarta:ibu kota lama*.' },
        { name: 'caseSensitive', type: 'boolean', label: 'Peka huruf besar/kecil', group: 'Perilaku' },
        ...behaviour,
      ],
      sample: {
        intro: '<p>Lengkapi kalimat berikut.</p>',
        text: 'Ibu kota Indonesia adalah *Jakarta/DKI Jakarta*.\nProklamasi kemerdekaan dibacakan pada tahun *1945:abad ke-20*.\nPulau terbesar di Indonesia adalah *Kalimantan/Borneo*.',
      },
    },
    {
      id: 'dragtext', name: 'Seret Kata', icon: '🔤', category: 'Kuis & Soal', h5p: 'H5P.DragText 1.10',
      desc: 'Seret kata yang tepat ke tempat kosong di dalam teks.',
      schema: [
        { name: 'intro', type: 'html', label: 'Instruksi' },
        { name: 'text', type: 'textarea', label: 'Teks', rows: 6, required: true, help: 'Tandai kata yang bisa diseret dengan *bintang*: Kucing adalah hewan *mamalia*.' },
        { name: 'distractors', type: 'list', label: 'Kata pengecoh', itemLabel: 'Kata', titleField: 'text', fields: [{ name: 'text', type: 'text', label: 'Kata' }] },
      ],
      sample: {
        intro: '<p>Seret kata ke tempat yang tepat.</p>',
        text: 'Tumbuhan membuat makanan melalui proses *fotosintesis*. Proses ini membutuhkan cahaya *matahari*, air, dan *karbon dioksida*.',
        distractors: [{ text: 'oksigen' }, { text: 'respirasi' }],
      },
    },
    {
      id: 'markwords', name: 'Tandai Kata', icon: '🖍️', category: 'Kuis & Soal', h5p: 'H5P.MarkTheWords 1.11',
      desc: 'Pengguna mengklik kata-kata tertentu di dalam teks.',
      schema: [
        { name: 'intro', type: 'html', label: 'Instruksi', required: true },
        { name: 'text', type: 'textarea', label: 'Teks', rows: 6, required: true, help: 'Tandai kata yang benar dengan *bintang*.' },
      ],
      sample: { intro: '<p>Klik semua <b>kata kerja</b> pada kalimat berikut.</p>', text: 'Adik *berlari* ke taman lalu *bermain* bola bersama teman. Setelah lelah, mereka *minum* es teh.' },
    },
    {
      id: 'singlechoice', name: 'Set Pilihan Tunggal', icon: '🎯', category: 'Kuis & Soal', h5p: 'H5P.SingleChoiceSet 1.11',
      desc: 'Rangkaian soal cepat; jawaban pertama selalu yang benar (urutan diacak).',
      schema: [
        { name: 'items', type: 'list', label: 'Soal', itemLabel: 'Soal', min: 1, titleField: 'question', fields: [
          { name: 'question', type: 'text', label: 'Pertanyaan', required: true },
          { name: 'answers', type: 'list', label: 'Jawaban (yang pertama = benar)', itemLabel: 'Jawaban', min: 2, titleField: 'text', fields: [{ name: 'text', type: 'text', label: 'Jawaban' }] },
        ] },
      ],
      sample: {
        items: [
          { question: '7 × 8 = ?', answers: [{ text: '56' }, { text: '54' }, { text: '64' }] },
          { question: 'Sinonim kata "cerdas"', answers: [{ text: 'pandai' }, { text: 'malas' }, { text: 'lambat' }] },
          { question: 'Benua terluas di dunia', answers: [{ text: 'Asia' }, { text: 'Afrika' }, { text: 'Eropa' }] },
        ],
      },
    },
    {
      id: 'questionset', name: 'Kuis (Set Soal)', icon: '📝', category: 'Kuis & Soal', h5p: 'H5P.QuestionSet 1.20',
      desc: 'Gabungkan beberapa jenis soal menjadi satu kuis dengan nilai kelulusan.',
      schema: [
        { name: 'introTitle', type: 'text', label: 'Judul halaman pembuka', group: 'Halaman pembuka' },
        { name: 'introText', type: 'html', label: 'Teks pembuka', group: 'Halaman pembuka' },
        { name: 'introImage', type: 'image', label: 'Gambar pembuka', group: 'Halaman pembuka' },
        { name: 'skipIntro', type: 'boolean', label: 'Lewati halaman pembuka', group: 'Halaman pembuka' },
        { name: 'questions', type: 'list', label: 'Daftar soal', itemLabel: 'Soal', min: 1, titleField: 'question', fields: [
          { name: 'qtype', type: 'select', label: 'Jenis soal', options: [['mc', 'Pilihan ganda'], ['tf', 'Benar/Salah'], ['blanks', 'Isi titik-titik'], ['dragtext', 'Seret kata'], ['markwords', 'Tandai kata']], default: 'mc' },
          { name: 'question', type: 'textarea', label: 'Pertanyaan / Pernyataan', showIf: { field: 'qtype', in: ['mc', 'tf'] } },
          { name: 'image', type: 'image', label: 'Gambar', showIf: { field: 'qtype', in: ['mc', 'tf'] } },
          Object.assign({}, answersMC, { showIf: { field: 'qtype', in: ['mc'] } }),
          { name: 'correct', type: 'select', label: 'Jawaban benar', options: [[true, 'Benar'], [false, 'Salah']], default: true, showIf: { field: 'qtype', in: ['tf'] } },
          { name: 'intro', type: 'text', label: 'Instruksi', showIf: { field: 'qtype', in: ['blanks', 'dragtext', 'markwords'] } },
          { name: 'text', type: 'textarea', label: 'Teks (tandai jawaban dengan *bintang*)', showIf: { field: 'qtype', in: ['blanks', 'dragtext', 'markwords'] } },
        ] },
        { name: 'randomize', type: 'boolean', label: 'Acak urutan soal', group: 'Pengaturan' },
        { name: 'passPercent', type: 'number', label: 'Nilai lulus (%)', min: 0, max: 100, default: 60, group: 'Pengaturan' },
        { name: 'allowRetry', type: 'boolean', label: 'Izinkan coba lagi per soal', default: true, group: 'Pengaturan' },
        { name: 'allowSolution', type: 'boolean', label: 'Izinkan tampilkan jawaban', default: true, group: 'Pengaturan' },
        { name: 'passText', type: 'text', label: 'Pesan lulus', group: 'Pengaturan' },
        { name: 'failText', type: 'text', label: 'Pesan tidak lulus', group: 'Pengaturan' },
      ],
      sample: {
        introTitle: 'Kuis Pengetahuan Umum',
        introText: '<p>Uji pengetahuanmu dengan 3 soal singkat.</p>',
        passPercent: 60,
        questions: [
          { qtype: 'mc', question: 'Hewan manakah yang termasuk mamalia?', answers: [{ text: 'Paus', correct: true }, { text: 'Hiu' }, { text: 'Penyu' }] },
          { qtype: 'tf', question: 'Matahari terbit dari arah barat.', correct: false },
          { qtype: 'blanks', intro: 'Lengkapi:', text: 'Indonesia merdeka pada tanggal 17 *Agustus* 1945.' },
        ],
      },
    },
    {
      id: 'essay', name: 'Esai', icon: '🧾', category: 'Kuis & Soal', h5p: 'H5P.Essay 1.5',
      desc: 'Jawaban uraian dengan penilaian otomatis berbasis kata kunci.',
      schema: [
        { name: 'task', type: 'html', label: 'Tugas / pertanyaan', required: true },
        { name: 'placeholder', type: 'text', label: 'Teks bantuan di kotak jawaban' },
        { name: 'keywords', type: 'list', label: 'Kata kunci penilaian', itemLabel: 'Kata kunci', titleField: 'keyword', fields: [
          { name: 'keyword', type: 'text', label: 'Kata kunci', required: true },
          { name: 'alternatives', type: 'text', label: 'Alternatif (pisahkan dengan koma)' },
          { name: 'points', type: 'number', label: 'Poin', default: 1, min: 1 },
          { name: 'feedbackMissed', type: 'text', label: 'Umpan balik jika tidak ditemukan' },
        ] },
        { name: 'sample', type: 'html', label: 'Contoh jawaban' },
        { name: 'minChars', type: 'number', label: 'Minimal karakter', min: 0, group: 'Pengaturan' },
        { name: 'maxChars', type: 'number', label: 'Maksimal karakter', min: 0, group: 'Pengaturan' },
        { name: 'passPercent', type: 'number', label: 'Nilai lulus (%)', min: 0, max: 100, default: 50, group: 'Pengaturan' },
      ],
      sample: {
        task: '<p>Jelaskan secara singkat proses terjadinya hujan.</p>',
        keywords: [
          { keyword: 'penguapan', alternatives: 'evaporasi', points: 1, feedbackMissed: 'Sebutkan proses penguapan air.' },
          { keyword: 'kondensasi', alternatives: 'pengembunan', points: 1, feedbackMissed: 'Jelaskan pembentukan awan.' },
          { keyword: 'presipitasi', alternatives: 'turun hujan,hujan turun', points: 1, feedbackMissed: 'Sebutkan presipitasi.' },
        ],
        sample: '<p>Air menguap (evaporasi), uap mengembun membentuk awan (kondensasi), lalu jatuh sebagai hujan (presipitasi).</p>',
        minChars: 30,
      },
    },
    {
      id: 'summary', name: 'Ringkasan', icon: '📋', category: 'Kuis & Soal', h5p: 'H5P.Summary 1.10',
      desc: 'Pilih pernyataan benar secara bertahap untuk membangun ringkasan.',
      schema: [
        { name: 'intro', type: 'html', label: 'Pengantar' },
        { name: 'groups', type: 'list', label: 'Kelompok pernyataan', itemLabel: 'Kelompok', min: 1, fields: [
          { name: 'statements', type: 'list', label: 'Pernyataan (yang pertama = benar)', itemLabel: 'Pernyataan', min: 2, titleField: 'text', fields: [{ name: 'text', type: 'text', label: 'Pernyataan' }] },
        ] },
      ],
      sample: {
        intro: '<p>Pilih pernyataan yang benar tentang tata surya.</p>',
        groups: [
          { statements: [{ text: 'Matahari adalah pusat tata surya.' }, { text: 'Bumi adalah pusat tata surya.' }] },
          { statements: [{ text: 'Bulan adalah satelit alami Bumi.' }, { text: 'Bulan adalah sebuah planet.' }, { text: 'Bulan memancarkan cahaya sendiri.' }] },
        ],
      },
    },
    {
      id: 'sortpar', name: 'Urutkan Paragraf', icon: '🔢', category: 'Kuis & Soal', h5p: 'H5P.SortParagraphs 0.11',
      desc: 'Susun potongan teks ke dalam urutan yang benar.',
      schema: [
        { name: 'intro', type: 'html', label: 'Instruksi' },
        { name: 'paragraphs', type: 'list', label: 'Paragraf (urutan benar)', itemLabel: 'Paragraf', min: 2, titleField: 'text', fields: [{ name: 'text', type: 'textarea', label: 'Teks', rows: 2 }] },
      ],
      sample: {
        intro: '<p>Urutkan langkah membuat teh.</p>',
        paragraphs: [{ text: 'Didihkan air.' }, { text: 'Masukkan kantong teh ke cangkir.' }, { text: 'Tuang air panas ke cangkir.' }, { text: 'Tambahkan gula secukupnya lalu aduk.' }],
      },
    },
    /* ------------------------------------------------------ Kartu & Game */
    {
      id: 'flashcards', name: 'Flashcard', icon: '🃏', category: 'Kartu & Permainan', h5p: 'H5P.Flashcards 1.7',
      desc: 'Kartu bergambar dengan jawaban yang diketik pengguna.',
      schema: [
        { name: 'intro', type: 'html', label: 'Deskripsi tugas' },
        { name: 'cards', type: 'list', label: 'Kartu', itemLabel: 'Kartu', min: 1, titleField: 'question', fields: [
          { name: 'question', type: 'text', label: 'Pertanyaan', required: true },
          { name: 'answer', type: 'text', label: 'Jawaban', required: true },
          { name: 'image', type: 'image', label: 'Gambar' },
          { name: 'tip', type: 'text', label: 'Petunjuk' },
        ] },
        { name: 'caseSensitive', type: 'boolean', label: 'Peka huruf besar/kecil', group: 'Perilaku' },
      ],
      sample: {
        intro: '<p>Terjemahkan kata berikut ke bahasa Inggris.</p>',
        cards: [{ question: 'Kucing', answer: 'Cat', tip: 'Meow' }, { question: 'Anjing', answer: 'Dog' }, { question: 'Burung', answer: 'Bird' }],
      },
    },
    {
      id: 'dialogcards', name: 'Kartu Dialog', icon: '💬', category: 'Kartu & Permainan', h5p: 'H5P.Dialogcards 1.9',
      desc: 'Kartu bolak-balik untuk menghafal istilah, kosakata, atau konsep.',
      schema: [
        { name: 'intro', type: 'html', label: 'Deskripsi' },
        { name: 'cards', type: 'list', label: 'Kartu', itemLabel: 'Kartu', min: 1, titleField: 'front', fields: [
          { name: 'front', type: 'textarea', label: 'Sisi depan', rows: 2, required: true },
          { name: 'back', type: 'textarea', label: 'Sisi belakang', rows: 2, required: true },
          { name: 'image', type: 'image', label: 'Gambar' },
        ] },
      ],
      sample: { intro: '<p>Klik kartu untuk melihat artinya.</p>', cards: [{ front: 'Fotosintesis', back: 'Proses tumbuhan membuat makanan menggunakan cahaya.' }, { front: 'Ekosistem', back: 'Hubungan timbal balik makhluk hidup dengan lingkungannya.' }] },
    },
    {
      id: 'memory', name: 'Permainan Memori', icon: '🧠', category: 'Kartu & Permainan', h5p: 'H5P.MemoryGame 1.3',
      desc: 'Cari pasangan kartu yang cocok. Kartu bisa berisi teks atau gambar.',
      schema: [
        { name: 'cards', type: 'list', label: 'Pasangan kartu', itemLabel: 'Pasangan', min: 2, titleField: 'text', fields: [
          { name: 'text', type: 'text', label: 'Teks kartu' },
          { name: 'image', type: 'image', label: 'Gambar kartu' },
          { name: 'matchText', type: 'text', label: 'Teks pasangan (kosongkan jika identik)' },
          { name: 'matchImage', type: 'image', label: 'Gambar pasangan' },
        ] },
      ],
      sample: { cards: [{ text: '🍎', matchText: 'Apel' }, { text: '🍌', matchText: 'Pisang' }, { text: '🍇', matchText: 'Anggur' }, { text: '🍊', matchText: 'Jeruk' }, { text: '🍉', matchText: 'Semangka' }, { text: '🍓', matchText: 'Stroberi' }] },
    },
    {
      id: 'guess', name: 'Tebak Jawaban', icon: '❓', category: 'Kartu & Permainan', h5p: 'H5P.GuessTheAnswer 1.5',
      desc: 'Gambar dengan pertanyaan dan jawaban tersembunyi.',
      schema: [
        { name: 'question', type: 'text', label: 'Pertanyaan', required: true },
        { name: 'image', type: 'image', label: 'Gambar' },
        { name: 'solution', type: 'text', label: 'Jawaban', required: true },
      ],
      sample: { question: 'Hewan apa yang memiliki belalai panjang?', solution: 'Gajah 🐘' },
    },
    /* ------------------------------------------------------- Multimedia */
    {
      id: 'presentation', name: 'Presentasi Kursus', icon: '🖥️', category: 'Multimedia', h5p: 'H5P.CoursePresentation 1.25',
      desc: 'Slide presentasi dengan teks, gambar, dan kuis di dalam slide.',
      schema: [
        { name: 'slides', type: 'list', label: 'Slide', itemLabel: 'Slide', min: 1, titleField: 'title', fields: [
          { name: 'title', type: 'text', label: 'Judul slide' },
          { name: 'content', type: 'html', label: 'Isi slide' },
          { name: 'image', type: 'image', label: 'Gambar' },
          { name: 'layout', type: 'select', label: 'Tata letak', options: [['top', 'Teks di atas, gambar di bawah'], ['left', 'Teks kiri, gambar kanan'], ['right', 'Gambar kiri, teks kanan'], ['center', 'Tengah']], default: 'top' },
          { name: 'bg', type: 'color', label: 'Warna latar' },
          { name: 'fg', type: 'color', label: 'Warna teks' },
          { name: 'hasQuiz', type: 'boolean', label: 'Tambahkan kuis pada slide ini' },
          { name: 'quizQuestion', type: 'text', label: 'Pertanyaan kuis', showIf: { field: 'hasQuiz', in: [true] } },
          Object.assign({}, answersMC, { name: 'quizAnswers', showIf: { field: 'hasQuiz', in: [true] } }),
        ] },
      ],
      sample: {
        slides: [
          { title: 'Siklus Air', content: '<p>Air di bumi terus bergerak dalam sebuah siklus.</p><ul><li>Evaporasi</li><li>Kondensasi</li><li>Presipitasi</li></ul>', layout: 'top', bg: '#e0f2fe' },
          { title: 'Evaporasi', content: '<p>Panas matahari mengubah air menjadi uap.</p>', layout: 'left' },
          { title: 'Cek Pemahaman', content: '<p>Jawab pertanyaan berikut.</p>', hasQuiz: true, quizQuestion: 'Proses air menjadi uap disebut…', quizAnswers: [{ text: 'Evaporasi', correct: true }, { text: 'Kondensasi' }, { text: 'Infiltrasi' }] },
        ],
      },
    },
    {
      id: 'ivideo', name: 'Video Interaktif', icon: '🎬', category: 'Multimedia', h5p: 'H5P.InteractiveVideo 1.26',
      desc: 'Video yang berhenti otomatis untuk menampilkan info atau pertanyaan.',
      schema: [
        { name: 'video', type: 'video', label: 'Video', required: true, help: 'Tempel tautan YouTube (youtube.com/watch?v=…, youtu.be/…, shorts) atau URL langsung ke berkas MP4/WebM, atau unggah berkas kecil.' },
        { name: 'poster', type: 'image', label: 'Gambar sampul' },
        { name: 'interactions', type: 'list', label: 'Interaksi', itemLabel: 'Interaksi', titleField: 'title', fields: [
          { name: 'time', type: 'number', label: 'Waktu muncul (detik)', min: 0, default: 0 },
          { name: 'kind', type: 'select', label: 'Jenis', options: [['text', 'Teks/Info'], ['mc', 'Pilihan ganda'], ['tf', 'Benar/Salah']], default: 'text' },
          { name: 'title', type: 'text', label: 'Judul' },
          { name: 'content', type: 'html', label: 'Isi', showIf: { field: 'kind', in: ['text'] } },
          { name: 'image', type: 'image', label: 'Gambar', showIf: { field: 'kind', in: ['text'] } },
          { name: 'question', type: 'text', label: 'Pertanyaan', showIf: { field: 'kind', in: ['mc', 'tf'] } },
          Object.assign({}, answersMC, { showIf: { field: 'kind', in: ['mc'] } }),
          { name: 'correct', type: 'select', label: 'Jawaban benar', options: [[true, 'Benar'], [false, 'Salah']], default: true, showIf: { field: 'kind', in: ['tf'] } },
        ] },
      ],
      sample: {
        video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        interactions: [
          { time: 2, kind: 'text', title: 'Perhatikan!', content: '<p>Lihat bagaimana kelopak bunga bergerak.</p>' },
          { time: 4, kind: 'tf', title: 'Pertanyaan', question: 'Video ini memperlihatkan seekor kupu-kupu.', correct: false },
        ],
      },
    },
    {
      id: 'hotspots', name: 'Gambar Hotspot', icon: '📍', category: 'Multimedia', h5p: 'H5P.ImageHotspots 1.10',
      desc: 'Gambar dengan titik-titik yang dapat diklik untuk menampilkan info.',
      schema: [
        { name: 'image', type: 'image', label: 'Gambar latar', required: true },
        { name: 'alt', type: 'text', label: 'Teks alternatif gambar' },
        { name: 'hotspots', type: 'list', label: 'Hotspot', itemLabel: 'Hotspot', titleField: 'title', picker: true, fields: [
          { name: 'x', type: 'number', label: 'Posisi X (%)', min: 0, max: 100, default: 50 },
          { name: 'y', type: 'number', label: 'Posisi Y (%)', min: 0, max: 100, default: 50 },
          { name: 'title', type: 'text', label: 'Judul' },
          { name: 'content', type: 'html', label: 'Isi' },
          { name: 'image', type: 'image', label: 'Gambar dalam popup' },
        ] },
        { name: 'color', type: 'color', label: 'Warna hotspot', group: 'Tampilan' },
        { name: 'icon', type: 'select', label: 'Ikon', options: [['plus', 'Plus (+)'], ['info', 'Info (i)'], ['number', 'Nomor']], default: 'plus', group: 'Tampilan' },
      ],
      sample: { image: svgImg('Lanskap Alam', '#38bdf8', '#a5f3fc', SCENE), alt: 'Ilustrasi lanskap', hotspots: [{ x: 80, y: 22, title: 'Matahari', content: '<p>Sumber energi utama bagi kehidupan di Bumi.</p>' }, { x: 40, y: 45, title: 'Pegunungan', content: '<p>Gunung terbentuk dari aktivitas tektonik dan vulkanik.</p>' }, { x: 50, y: 88, title: 'Sungai', content: '<p>Klik <b>Pilih posisi di gambar</b> pada editor untuk memindahkan hotspot.</p>' }] },
    },
    {
      id: 'slider', name: 'Slider Gambar', icon: '🖼️', category: 'Multimedia', h5p: 'H5P.ImageSlider 1.1',
      desc: 'Galeri gambar yang dapat digeser dengan keterangan.',
      schema: [
        { name: 'slides', type: 'list', label: 'Gambar', itemLabel: 'Gambar', min: 1, titleField: 'caption', fields: [
          { name: 'image', type: 'image', label: 'Gambar', required: true },
          { name: 'caption', type: 'text', label: 'Keterangan' },
          { name: 'alt', type: 'text', label: 'Teks alternatif' },
        ] },
        { name: 'autoplay', type: 'boolean', label: 'Putar otomatis', group: 'Pengaturan' },
        { name: 'interval', type: 'number', label: 'Jeda (detik)', min: 1, default: 4, group: 'Pengaturan' },
      ],
      sample: { slides: [{ image: svgImg('Pagi', '#f59e0b', '#fde68a', SCENE), caption: 'Suasana pagi hari' }, { image: svgImg('Siang', '#0ea5e9', '#bae6fd', SCENE), caption: 'Suasana siang hari' }, { image: svgImg('Malam', '#1e1b4b', '#4338ca', SCENE), caption: 'Suasana malam hari' }] },
    },
    {
      id: 'chart', name: 'Grafik', icon: '📊', category: 'Multimedia', h5p: 'H5P.Chart 1.2',
      desc: 'Diagram batang atau lingkaran dari data sederhana.',
      schema: [
        { name: 'title', type: 'text', label: 'Judul grafik' },
        { name: 'chartType', type: 'select', label: 'Jenis grafik', options: [['bar', 'Batang'], ['pie', 'Lingkaran']], default: 'bar' },
        { name: 'items', type: 'list', label: 'Data', itemLabel: 'Data', min: 1, titleField: 'label', fields: [
          { name: 'label', type: 'text', label: 'Label' },
          { name: 'value', type: 'number', label: 'Nilai', default: 0 },
          { name: 'color', type: 'color', label: 'Warna' },
        ] },
      ],
      sample: { title: 'Jumlah Siswa per Kelas', chartType: 'bar', items: [{ label: 'VII', value: 32 }, { label: 'VIII', value: 28 }, { label: 'IX', value: 30 }] },
    },
    /* --------------------------------------------------- Tata Letak */
    {
      id: 'accordion', name: 'Akordeon', icon: '🪗', category: 'Tata Letak & Teks', h5p: 'H5P.Accordion 1.0',
      desc: 'Panel teks yang dapat dibuka-tutup untuk menghemat ruang.',
      schema: [
        { name: 'panels', type: 'list', label: 'Panel', itemLabel: 'Panel', min: 1, titleField: 'title', fields: [
          { name: 'title', type: 'text', label: 'Judul', required: true },
          { name: 'content', type: 'html', label: 'Isi' },
        ] },
        { name: 'single', type: 'boolean', label: 'Hanya satu panel terbuka', group: 'Perilaku' },
      ],
      sample: {
        panels: [
          { title: 'Apa itu H5P?', content: '<p>H5P adalah kerangka kerja untuk membuat konten HTML5 interaktif.</p>' },
          { title: 'Bagaimana cara menyimpannya?', content: '<p>Konten di aplikasi ini disimpan di <b>Local Storage</b> peramban Anda.</p>' },
        ],
      },
    },
    {
      id: 'text', name: 'Halaman Teks', icon: '📄', category: 'Tata Letak & Teks', h5p: 'H5P.AdvancedText 1.1',
      desc: 'Halaman berisi teks berformat dan gambar.',
      schema: [
        { name: 'image', type: 'image', label: 'Gambar header' },
        { name: 'content', type: 'html', label: 'Isi', required: true, tall: true },
      ],
      sample: { content: '<h2>Selamat datang</h2><p>Tulis materi Anda di sini. Gunakan toolbar untuk <b>tebal</b>, <i>miring</i>, daftar, dan tautan.</p>' },
    },
  ];

  const CATEGORIES = ['Kuis & Soal', 'Kartu & Permainan', 'Multimedia', 'Tata Letak & Teks'];

  function byId(id) { return TYPES.find((t) => t.id === id); }

  function defaultsFor(schema) {
    const o = {};
    schema.forEach((f) => {
      if (f.type === 'list') {
        o[f.name] = [];
        for (let i = 0; i < (f.min || 0); i++) o[f.name].push(defaultsFor(f.fields));
      } else if (f.type === 'boolean') o[f.name] = f.default != null ? f.default : false;
      else if (f.default !== undefined) o[f.name] = f.default;
      else o[f.name] = '';
    });
    return o;
  }

  function merge(def, val) {
    if (Array.isArray(val)) return val;
    if (val && typeof val === 'object') {
      const out = Object.assign({}, def);
      for (const k in val) out[k] = merge(def ? def[k] : undefined, val[k]);
      return out;
    }
    return val === undefined ? def : val;
  }

  function newParams(typeId, withSample) {
    const t = byId(typeId);
    const d = defaultsFor(t.schema);
    return withSample ? merge(d, JSON.parse(JSON.stringify(t.sample || {}))) : d;
  }

  /* Validasi sederhana: mengembalikan daftar pesan */
  function validate(typeId, params) {
    const t = byId(typeId);
    const errs = [];
    (function walk(schema, obj, path) {
      schema.forEach((f) => {
        if (f.showIf && obj && f.showIf.in.indexOf(obj[f.showIf.field]) < 0) return;
        const v = obj ? obj[f.name] : undefined;
        const label = path + f.label;
        if (f.type === 'list') {
          const a = Array.isArray(v) ? v : [];
          if (f.min && a.length < f.min) errs.push(label + ': minimal ' + f.min + ' ' + (f.itemLabel || 'item').toLowerCase() + '.');
          a.forEach((it, i) => walk(f.fields, it, label + ' #' + (i + 1) + ' › '));
        } else if (f.required && (v == null || String(v).replace(/<[^>]*>/g, '').trim() === '')) errs.push(label + ' wajib diisi.');
      });
    })(t.schema, params, '');
    if (typeId === 'mc' && params.answers && !params.answers.some((a) => a.correct)) errs.push('Tandai minimal satu jawaban benar.');
    if ((typeId === 'blanks' || typeId === 'dragtext' || typeId === 'markwords') && !/\*[^*]+\*/.test(params.text || '')) errs.push('Teks belum memiliki jawaban bertanda *bintang*.');
    return errs;
  }

  window.LumiTypes = { TYPES: TYPES, CATEGORIES: CATEGORIES, byId: byId, newParams: newParams, defaultsFor: defaultsFor, validate: validate };
})();
