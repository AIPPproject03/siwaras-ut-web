# 🎓 SIWARAS UT - Sistem Inventori Wisuda & Rangkaian Sosprom

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![Status](https://img.shields.io/badge/status-production-success.svg)

**SIWARAS UT** adalah sistem informasi manajemen inventori berbasis web yang dikembangkan untuk **Universitas Terbuka Palangka Raya** untuk mengelola barang inventori pada kegiatan Wisuda dan Rangkaian Sosialisasi Program (Sosprom).

## 📋 Daftar Isi

- [Fitur Utama](#-fitur-utama)
- [Teknologi yang Digunakan](#-teknologi-yang-digunakan)
- [Struktur Project](#-struktur-project)
- [Instalasi](#-instalasi)
- [Konfigurasi](#-konfigurasi)
- [Penggunaan](#-penggunaan)
- [Dark Mode](#-dark-mode)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [Screenshot](#-screenshot)
- [Kontribusi](#-kontribusi)
- [Lisensi](#-lisensi)
- [Tim Pengembang](#-tim-pengembang)

## ✨ Fitur Utama

### 🔐 Sistem Autentikasi

- **Multi-role Access**: Admin Wisuda, Admin Sosprom, dan Guest
- **Session Management**: Persistent login dengan localStorage
- **Audit Logging**: Tracking semua aktivitas user

### 📦 Manajemen Inventori

- **Master Data Barang**: CRUD lengkap dengan kode barang otomatis
- **Barang Masuk**: Input barang baru dan existing dengan validasi stok
- **Stok Barang**: Monitoring real-time stok barang
- **Tanda Terima**: Manajemen barang keluar dengan workflow approval

### 📊 Dashboard & Analytics

- **Real-time Statistics**: Total barang masuk, keluar, dan stok
- **Interactive Charts**: Line chart (trend 7 hari) dan bar chart (top 10 barang)
- **Data Visualization**: Chart.js untuk visualisasi data yang menarik

### 📄 Tanda Terima Barang Keluar

- **Draft System**: Simpan sebagai draft sebelum finalisasi
- **Inline Editing**: Edit data penerima langsung di tabel
- **PDF Generation**: Export tanda terima ke PDF dengan jsPDF
- **Digital Signature**: Template untuk tanda tangan digital
- **Validation Workflow**: Status Draft → Selesai

### 🎨 User Experience

- **Dark Mode**: Toggle light/dark theme dengan persistent storage
- **Responsive Design**: Mobile-friendly untuk semua device
- **Toast Notifications**: Feedback real-time untuk setiap aksi
- **Loading States**: Smooth loading dengan spinner overlay
- **Search & Sort**: Cari dan urutkan data dengan mudah

### 🔍 Guest Access

- **Public Dashboard**: Lihat data inventori tanpa login
- **Read-only Access**: Monitoring untuk stakeholder eksternal

## 🛠 Teknologi yang Digunakan

### Frontend

- **HTML5** - Semantic markup
- **CSS3** - Custom properties, Flexbox, Grid
- **JavaScript (ES6+)** - Vanilla JS, async/await
- **Chart.js** - Data visualization
- **jsPDF** - PDF generation
- **jsPDF-AutoTable** - Table plugin untuk PDF

### Backend

- **Google Apps Script** - Server-side logic
- **Google Sheets** - Database (NoSQL-like)
- **Apps Script Web App** - RESTful API

### Tools & Libraries

- **Git** - Version control
- **Visual Studio Code** - IDE

## 📁 Struktur Project

```
siwaras-ut-web/
├── .env                          # Environment variables
├── .gitignore                    # Git ignore rules
├── Kode.gs                       # Google Apps Script backend
├── README.MD                     # Project documentation
├── SIWARAS API DOC              # API documentation
│
└── src/
    ├── index.html               # Landing page
    │
    ├── assets/
    │   ├── icon/               # Icons & logos
    │   ├── img/                # Images
    │   └── style/              # CSS files
    │       ├── main.css        # Global styles & CSS variables
    │       ├── dashboard.css   # Dashboard layout
    │       ├── stokBarang.css  # Inventory styles
    │       ├── tandaTerima.css # Receipt styles
    │       ├── guest.css       # Guest view styles
    │       ├── login.css       # Login page styles
    │       ├── landingPage.css # Landing page styles
    │       └── toast.css       # Notification styles
    │
    ├── pages/
    │   ├── guestSosprom.html       # Guest view Sosprom
    │   ├── guestWisuda.html        # Guest view Wisuda
    │   ├── loginSosprom.html       # Login Sosprom
    │   ├── loginWisuda.html        # Login Wisuda
    │   │
    │   ├── sosprom/
    │   │   ├── adminSosprom.html           # Dashboard Sosprom
    │   │   ├── barangMasukSosprom.html     # Input barang masuk
    │   │   ├── stokBarangSosprom.html      # Manajemen stok
    │   │   └── tandaTerimaSosprom.html     # Tanda terima keluar
    │   │
    │   └── wisuda/
    │       ├── adminWisuda.html            # Dashboard Wisuda
    │       ├── barangMasukWisuda.html      # Input barang masuk
    │       ├── stokBarangWisuda.html       # Manajemen stok
    │       └── tandaTerimaWisuda.html      # Tanda terima keluar
    │
    └── script/
        ├── config.js                      # API configuration
        ├── landing.js                     # Landing page logic
        ├── login.js                       # Login handler
        ├── toast.js                       # Toast notification
        │
        ├── adminSosprom.js                # Sosprom dashboard
        ├── adminWisuda.js                 # Wisuda dashboard
        │
        ├── barangMasukSosprom.js          # Sosprom incoming
        ├── barangMasukWisuda.js           # Wisuda incoming
        │
        ├── stokBarangSosprom.js           # Sosprom stock
        ├── stokBarangWisuda.js            # Wisuda stock
        │
        ├── stokBarangMasukSosprom.js      # Sosprom stock view
        ├── stokBarangMasukWisuda.js       # Wisuda stock view
        │
        ├── tandaTerimaSosprom.js          # Sosprom receipt
        ├── tandaTerimaWisuda.js           # Wisuda receipt
        │
        ├── guestSosprom.js                # Sosprom public view
        └── guestWisuda.js                 # Wisuda public view
```

## 🚀 Instalasi

### Prerequisites

- Modern web browser (Chrome, Firefox, Edge, Safari)
- Google Account (untuk backend)
- Git

### Clone Repository

```bash
git clone https://github.com/AIPPproject03/siwaras-ut-web.git
cd siwaras-ut-web
```

### Setup Backend (Google Apps Script)

1. Buka [Google Apps Script](https://script.google.com)
2. Buat project baru: **"SIWARAS UT API"**
3. Copy-paste isi file `Kode.gs` ke editor
4. Create Google Sheets dengan nama: **"SIWARAS_UT_DB"**
5. Buat sheets berikut:

   - `admin` - Data admin
   - `audit_Log` - Log aktivitas
   - `masterBarang` - Master data barang
   - `barangMasuk` - Transaksi masuk
   - `barangKeluar` - Transaksi keluar
   - `tandaTerima` - Header tanda terima
   - `tandaTerimaBarang` - Detail barang keluar
   - `tandaTerimaFormData` - Data penerima

6. Deploy sebagai Web App:
   - **Execute as**: Me
   - **Who has access**: Anyone
   - Copy **Web App URL**

### Setup Frontend

1. Edit `src/script/config.js`:

```javascript
const CONFIG = {
  API_URL: "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE",
  // ...
};
```

2. Buka `src/index.html` di browser

### Setup Admin User (First Time)

```javascript
// Di Google Apps Script, jalankan function ini:
function setupAdminWisuda() {
  appendByObject("admin", {
    username: "admin_wisuda",
    password: "admin123",
    nama: "Administrator Wisuda",
    email: "admin.wisuda@ut.ac.id",
    createdAt: nowISO(),
  });
}

function setupAdminSosprom() {
  appendByObject("admin", {
    username: "admin_sosprom",
    password: "admin123",
    nama: "Administrator Sosprom",
    email: "admin.sosprom@ut.ac.id",
    createdAt: nowISO(),
  });
}
```

## ⚙️ Konfigurasi

### Environment Variables (`.env`)

```env
# Google Apps Script
GAS_SCRIPT_ID=your_script_id_here
GAS_DEPLOYMENT_ID=your_deployment_id_here

# API Configuration
API_URL=your_web_app_url_here

# Database Type
DB_TYPE_WISUDA=wisuda
DB_TYPE_SOSPROM=sosprom

# Theme
DEFAULT_THEME=light
```

### CSS Variables (`src/assets/style/main.css`)

```css
:root {
  /* Colors */
  --primary: #0284c7;
  --danger: #ef4444;
  --success: #10b981;
  --warning: #f59e0b;

  /* Light Mode */
  --bg: #f8fafc;
  --surface: #ffffff;
  --text: #1e293b;

  /* Dark Mode (data-theme="dark") */
  /* Automatically applied */
}
```

## 📖 Penggunaan

### Login sebagai Admin

1. Buka halaman login: `src/pages/loginWisuda.html` atau `/pages/loginSosprom.html`
2. Masukkan credentials:
   - **Username**: `admin_wisuda` / `admin_sosprom`
   - **Password**: `admin123`
3. Klik **Masuk**

### Dashboard Admin

Setelah login, Anda akan melihat:

- **Stats Cards**: Total barang masuk, keluar, dan stok
- **Line Chart**: Trend barang masuk/keluar 7 hari terakhir
- **Bar Chart**: Top 10 barang berdasarkan stok
- **Data Table**: Daftar semua barang dengan search & sort

### Barang Masuk

1. Klik menu **"Barang Masuk"** di sidebar
2. Pilih mode input:
   - **Barang Baru**: Input barang yang belum ada di master
   - **Barang Existing**: Pilih dari dropdown
3. Isi form:
   - Tanggal
   - Kode Barang (auto-generate atau manual)
   - Nama Barang
   - Satuan
   - Jumlah
   - Keterangan (optional)
4. Klik **Simpan**

### Stok Barang

1. Klik menu **"Stok Barang"** di sidebar
2. Lihat daftar barang dengan:
   - **Search**: Cari berdasarkan kode/nama
   - **Sort**: Urutkan A-Z atau Z-A
   - **Info**: Klik tombol **ℹ️** untuk panduan
3. Edit stok (hanya jumlah, tidak bisa edit master barang dari sini)

### Tanda Terima Barang Keluar

#### Buat Tanda Terima Baru

1. Klik menu **"Tanda Terima"** di sidebar
2. Klik tombol **"Tambah Tanda Terima"**
3. Isi:
   - Tanggal
   - Keterangan (misal: Wisuda Periode 2025.1)
4. Klik **"Buat Tanda Terima"**
5. Status: **Draft**

#### Tambah Barang ke Tanda Terima

1. Klik tombol **"Lihat Detail"** pada tanda terima
2. Di section **"Daftar Barang"**, klik **"+ Tambah Barang"**
3. Pilih barang dari dropdown
4. Masukkan jumlah (sistem akan validasi dengan stok)
5. Klik **"Tambah"**

#### Edit Data Penerima

1. Di section **"Data Penerima"**, klik cell yang ingin diedit
2. Edit langsung (inline editing)
3. Klik di luar cell untuk menyimpan

#### Validasi Tanda Terima

1. Pastikan:
   - Minimal 1 barang sudah ditambahkan
   - Nama dan NIP/NIM penerima sudah diisi
2. Klik tombol **"Validasi Data"**
3. Konfirmasi: Status akan berubah menjadi **"Selesai"**
4. ⚠️ **Setelah divalidasi, data tidak bisa diedit lagi**

#### Export PDF

1. Setelah divalidasi (status **"Selesai"**)
2. Klik tombol **"Cetak PDF"**
3. PDF akan otomatis ter-download dengan format:
   ```
   Tanda_Terima_[ID]_[Timestamp].pdf
   ```

### Guest View

1. Buka: `src/pages/guestWisuda.html` atau `src/pages/guestSosprom.html`
2. Tidak perlu login
3. Lihat:
   - Statistics (read-only)
   - Charts
   - Data table (search & sort)

## 🌗 Dark Mode

### Toggle Dark Mode

1. Klik icon **🌙** / **☀️** di header (kanan atas)
2. Theme akan otomatis disimpan di **localStorage**
3. Preference tersimpan untuk semua halaman

### Theme Synchronization

- Theme yang dipilih akan **sync otomatis** di:
  - Admin Wisuda ↔ Admin Sosprom
  - Guest Wisuda ↔ Guest Sosprom
- Menggunakan **single localStorage key**: `siwaras_theme`

### Custom Theme

Edit di `src/assets/style/main.css`:

```css
[data-theme="dark"] {
  --bg: #1a1d29; /* Background utama */
  --surface: #252936; /* Card, modal, sidebar */
  --text: #ffffff; /* Text utama */
  --text-soft: #ffffff; /* Text secondary */
  --line: rgba(255, 255, 255, 0.1); /* Border */
}
```

## 📡 API Documentation

### Base URL

```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

### Authentication

```javascript
POST /exec
Content-Type: application/json

{
  "type": "login",
  "data": {
    "username": "admin_wisuda",
    "password": "admin123"
  },
  "dbType": "wisuda"
}

Response:
{
  "ok": true,
  "type": "login",
  "result": {
    "auth": true,
    "admin": {
      "username": "admin_wisuda",
      "nama": "Administrator Wisuda",
      "email": "admin.wisuda@ut.ac.id"
    }
  }
}
```

### READ Operations (GET)

```javascript
GET /exec?type=readMasterBarang&limit=1000&dbType=wisuda

Response:
{
  "ok": true,
  "type": "readMasterBarang",
  "result": {
    "rows": [
      {
        "kodeBarang": "1110102010001",
        "namaBarang": "Pin Wisuda (ATK)",
        "satuan": "pcs",
        "stok": 6
      }
    ]
  }
}
```

### WRITE Operations (POST)

```javascript
POST /exec
Content-Type: application/json

{
  "type": "barangMasuk",
  "data": {
    "tanggal": "2025-01-15",
    "kodeBarang": "1110102010001",
    "namaBarang": "Pin Wisuda (ATK)",
    "satuan": "pcs",
    "jumlah": 100,
    "keterangan": "Pembelian bulan Januari",
    "createdBy": "admin_wisuda"
  },
  "dbType": "wisuda"
}

Response:
{
  "ok": true,
  "type": "barangMasuk",
  "result": {
    "id_bm": "bm-250115-0001"
  }
}
```

### Endpoints

| Method | Type                        | Description                 |
| ------ | --------------------------- | --------------------------- |
| GET    | `readMasterBarang`          | Get all master barang       |
| GET    | `readBarangMasuk`           | Get incoming transactions   |
| GET    | `readBarangKeluar`          | Get outgoing transactions   |
| GET    | `readTandaTerima`           | Get all receipts            |
| GET    | `readTandaTerimaBarang`     | Get receipt items           |
| GET    | `readTandaTerimaFormData`   | Get recipient data          |
| POST   | `login`                     | Authenticate user           |
| POST   | `masterBarang`              | Create master barang        |
| POST   | `barangMasuk`               | Create incoming transaction |
| POST   | `tandaTerima`               | Create receipt              |
| POST   | `tandaTerimaBarang`         | Add item to receipt         |
| POST   | `updateTandaTerimaStatus`   | Update receipt status       |
| POST   | `updateTandaTerimaFormData` | Update recipient data       |
| POST   | `deleteTandaTerima`         | Delete receipt              |
| POST   | `deleteTandaTerimaBarang`   | Remove item from receipt    |

📝 **Full API Documentation**: Lihat file `SIWARAS API DOC`

## 🗄 Database Schema

### Sheet: `admin`

| Column    | Type     | Description                   |
| --------- | -------- | ----------------------------- |
| username  | TEXT     | Unique username               |
| password  | TEXT     | Plain text (production: hash) |
| nama      | TEXT     | Full name                     |
| email     | TEXT     | Email address                 |
| createdAt | DATETIME | ISO 8601 timestamp            |

### Sheet: `masterBarang`

| Column     | Type     | Description                          |
| ---------- | -------- | ------------------------------------ |
| kodeBarang | TEXT     | Primary key, format: `1110102010001` |
| namaBarang | TEXT     | Item name                            |
| satuan     | TEXT     | Unit (pcs, box, set, dll)            |
| stok       | NUMBER   | Current stock                        |
| createdAt  | DATETIME | ISO 8601 timestamp                   |

### Sheet: `barangMasuk`

| Column     | Type     | Description                           |
| ---------- | -------- | ------------------------------------- |
| id_bm      | TEXT     | Primary key, format: `bm-YYMMDD-NNNN` |
| tanggal    | DATE     | Transaction date                      |
| kodeBarang | TEXT     | Foreign key → masterBarang            |
| namaBarang | TEXT     | Item name (denormalized)              |
| satuan     | TEXT     | Unit                                  |
| jumlah     | NUMBER   | Quantity                              |
| keterangan | TEXT     | Notes (optional)                      |
| createdAt  | DATETIME | ISO 8601 timestamp                    |
| createdBy  | TEXT     | Username                              |

### Sheet: `tandaTerima`

| Column     | Type     | Description                           |
| ---------- | -------- | ------------------------------------- |
| id_tt      | TEXT     | Primary key, format: `tt-YYMMDD-NNNN` |
| tanggal    | DATE     | Receipt date                          |
| keterangan | TEXT     | Description/Event                     |
| status     | TEXT     | `Draft` or `Selesai`                  |
| createdAt  | DATETIME | ISO 8601 timestamp                    |
| createdBy  | TEXT     | Username                              |
| updatedBy  | TEXT     | Last updater                          |

### Sheet: `tandaTerimaBarang`

| Column     | Type     | Description                |
| ---------- | -------- | -------------------------- |
| id_tt      | TEXT     | Foreign key → tandaTerima  |
| kodeBarang | TEXT     | Foreign key → masterBarang |
| namaBarang | TEXT     | Item name (denormalized)   |
| satuan     | TEXT     | Unit                       |
| jumlah     | NUMBER   | Quantity                   |
| createdAt  | DATETIME | ISO 8601 timestamp         |

### Sheet: `tandaTerimaFormData`

| Column     | Type     | Description               |
| ---------- | -------- | ------------------------- |
| id_tt      | TEXT     | Foreign key → tandaTerima |
| nama       | TEXT     | Recipient name            |
| nip        | TEXT     | NIP/NIM                   |
| keterangan | TEXT     | Additional notes          |
| updatedAt  | DATETIME | Last update timestamp     |

### Sheet: `audit_Log`

| Column    | Type     | Description        |
| --------- | -------- | ------------------ |
| timestamp | DATETIME | ISO 8601 timestamp |
| username  | TEXT     | Actor              |
| action    | TEXT     | Action type        |
| details   | TEXT     | Action details     |

## 🤝 Kontribusi

Kontribusi sangat dihargai! Untuk berkontribusi:

1. **Fork** repository ini
2. Buat **feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit** changes (`git commit -m 'Add some AmazingFeature'`)
4. **Push** ke branch (`git push origin feature/AmazingFeature`)
5. Buat **Pull Request**

### Coding Standards

- **JavaScript**: ES6+ syntax, async/await
- **CSS**: BEM naming convention
- **Commit**: Conventional Commits format
- **Comments**: JSDoc untuk functions

### Bug Reports

Laporkan bug via [GitHub Issues](https://github.com/AIPPproject03/siwaras-ut-web/issues) dengan:

- **Deskripsi** jelas
- **Steps to reproduce**
- **Expected behavior**
- **Screenshots** (jika perlu)
- **Environment** (browser, OS)

## 📄 Lisensi

Project ini dilisensikan di bawah **MIT License** - lihat file LICENSE untuk detail.

```
MIT License

Copyright (c) 2025 Universitas Terbuka Palangka Raya

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 👥 Tim Pengembang

### Development Team

- **Project Lead**: [Your Name]
- **Backend Developer**: [Developer Name]
- **Frontend Developer**: [Developer Name]
- **UI/UX Designer**: [Designer Name]

### Client

**Universitas Terbuka Palangka Raya**

- **Alamat**: Jl. G. Obos No.30, Palangka Raya, Kalimantan Tengah
- **Website**: [https://www.ut.ac.id](https://www.ut.ac.id)
- **Email**: ut-palangkaraya@ut.ac.id

## 🙏 Acknowledgments

- **Chart.js** - Beautiful charts
- **jsPDF** - PDF generation
- **Google Apps Script** - Backend infrastructure
- **Universitas Terbuka** - Project sponsor

## 📞 Kontak & Support

- **Email**: support@ut-palangkaraya.ac.id
- **GitHub Issues**: [Report a bug](https://github.com/AIPPproject03/siwaras-ut-web/issues)
- **Documentation**: [Wiki](https://github.com/AIPPproject03/siwaras-ut-web/wiki)

---

**Made with ❤️ for Universitas Terbuka Palangka Raya**

© 2025 SIWARAS UT. All Rights Reserved.
