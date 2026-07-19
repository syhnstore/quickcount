const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ==================== KONFIGURASI (ubah sesuai kebutuhan) ====================
// Daftar nama/kode juri yang boleh login.
const DAFTAR_JURI = ['Juri 1', 'Juri 2', 'Juri 3', 'Juri 4'];
// Password bersama untuk semua juri. Ganti sebelum acara berlangsung.
const PASSWORD_JURI = 'lovebird2026';

// Nilai poin tetap per satu stick
const POINT_BIRU_TETAP = 40;
const POINT_KUNING_TETAP = 10;
// ===============================================================================

// Data disimpan sementara di memori (real-time, tidak permanen).
// Akan hilang setiap kali server di-restart atau "tidur" (di hosting gratis).
let penilaian = [];
let nextId = 1;

// Pengaturan kelas lomba, diatur oleh admin dari halaman backend
let settings = {
  hargaTiket: '',
  jenisBurung: '',
  pointMerah: null // diisi manual oleh admin SETELAH pengocokan fisik selesai
};

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Endpoint login sederhana untuk juri
app.post('/api/login', (req, res) => {
  const { nama, password } = req.body || {};
  if (password === PASSWORD_JURI && DAFTAR_JURI.includes(nama)) {
    res.json({ ok: true, nama });
  } else {
    res.status(401).json({ ok: false, message: 'Nama juri atau password salah.' });
  }
});

// Endpoint untuk ambil daftar nama juri (dipakai dropdown login)
app.get('/api/daftar-juri', (req, res) => {
  res.json(DAFTAR_JURI);
});

io.on('connection', (socket) => {
  socket.emit('init-data', {
    penilaian,
    settings,
    pointTetap: { biru: POINT_BIRU_TETAP, kuning: POINT_KUNING_TETAP }
  });

  socket.on('kirim-penilaian', (data) => {
    const gantangan = parseInt(data.gantangan);
    const sesi = data.sesi ? data.sesi.toString().trim() : '';
    const desainBox = data.desainBox;
    const juri = data.juri ? data.juri.toString().trim() : '';
    const stickMerah = parseFloat(data.stickMerah);
    const stickBiru = parseFloat(data.stickBiru);
    const stickKuning = parseFloat(data.stickKuning);

    if (
      isNaN(gantangan) || gantangan < 1 || gantangan > 60 ||
      !sesi ||
      !['A', 'B', 'C', 'D'].includes(desainBox) ||
      !DAFTAR_JURI.includes(juri) ||
      isNaN(stickMerah) || stickMerah < 0 ||
      isNaN(stickBiru) || stickBiru < 0 ||
      isNaN(stickKuning) || stickKuning < 0
    ) {
      socket.emit('error-penilaian', 'Data tidak valid, silakan periksa kembali.');
      return;
    }

    const entry = {
      id: nextId++,
      gantangan,
      sesi,
      desainBox,
      juri,
      stickMerah,
      stickBiru,
      stickKuning,
      waktu: new Date().toISOString()
    };

    penilaian.push(entry); // urutan kronologis, cocok untuk rekap/cetak di backend
    io.emit('penilaian-baru', entry);
  });

  socket.on('hapus-penilaian', (id) => {
    penilaian = penilaian.filter((p) => p.id !== id);
    io.emit('penilaian-dihapus', id);
  });

  socket.on('reset-semua', () => {
    penilaian = [];
    nextId = 1;
    io.emit('semua-direset');
  });

  socket.on('update-settings', (data) => {
    if (data.hargaTiket !== undefined) settings.hargaTiket = data.hargaTiket;
    if (data.jenisBurung !== undefined) settings.jenisBurung = data.jenisBurung;
    if (data.pointMerah !== undefined) {
      const pm = data.pointMerah === '' ? null : parseFloat(data.pointMerah);
      settings.pointMerah = pm === null || isNaN(pm) ? null : pm;
    }
    io.emit('settings-updated', settings);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});
