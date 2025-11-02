const wbook = SpreadsheetApp.getActive();
const TZ = "Asia/Makassar";

/** =======================
 *  Utilitas umum
 *  ======================= */
const SHEETS = {
  admin: "admin",
  audit: "audit_Log",
  mBarang: "masterBarang",
  bMasuk: "barangMasuk",
  bKeluar: "barangKeluar",
};

function _(name) {
  const sh = wbook.getSheetByName(name);
  if (!sh) throw new Error(`Sheet "${name}" tidak ditemukan`);
  return sh;
}

function nowISO() {
  // ISO tanpa milidetik, dengan offset +07:00
  return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function nextNumericIdByHeader(sheet, headerName) {
  const last = sheet.getLastRow();
  if (last <= 1) return 1; // belum ada data
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idx = headers.indexOf(headerName);
  if (idx === -1)
    throw new Error(
      `Header "${headerName}" tidak ditemukan di ${sheet.getName()}`
    );
  // ambil nilai id di baris terakhir (asumsi urutan append)
  const val = sheet.getRange(last, idx + 1).getValue();
  const num = parseInt(val, 10);
  return isNaN(num) ? 1 : num + 1;
}

function getHeaderIndexMap(sheet) {
  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map((h) => String(h).trim());
  const map = {};
  headers.forEach((h, i) => (map[h] = i)); // 0-based index
  return { headers, map };
}

// Format tanggal untuk ID: dd/MM/yy (pakai TZ yang sama)
function dateStrForId(d = new Date()) {
  return Utilities.formatDate(d, TZ, "dd'/'MM'/'yy");
}

// Ambil index kolom berdasarkan header (1-based)
function headerColIndex(sheet, headerName) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idx = headers.indexOf(headerName);
  if (idx === -1)
    throw new Error(
      `Header "${headerName}" tidak ditemukan di ${sheet.getName()}`
    );
  return idx + 1; // 1-based
}

/**
 * Menghasilkan ID harian unik: <prefix>-dd/MM/yy-<n>
 * - prefix: 'bm' atau 'bk'
 * - headerName: 'id_bm' atau 'id_bk'
 */
function nextDailyId(sheet, headerName, prefix) {
  const lastRow = sheet.getLastRow();
  const datePart = dateStrForId(new Date());
  const base = `${prefix}-${datePart}`; // contoh: "bm-27/10/25"
  if (lastRow <= 1) return `${base}-1`;

  const col = headerColIndex(sheet, headerName);
  const values = sheet.getRange(2, col, lastRow - 1, 1).getValues(); // kolom ID saja (tanpa header)

  let maxN = 0;
  for (let i = 0; i < values.length; i++) {
    const v = String(values[i][0] || "");
    if (v.startsWith(base + "-")) {
      const parts = v.split("-");
      const n = parseInt(parts[parts.length - 1], 10);
      if (Number.isFinite(n) && n > maxN) maxN = n;
    }
  }
  return `${base}-${maxN + 1}`;
}

function appendByObject(sheetName, obj) {
  const sheet = _(sheetName);
  const { headers, map } = getHeaderIndexMap(sheet);
  const row = new Array(headers.length).fill("");
  Object.keys(obj).forEach((k) => {
    if (map.hasOwnProperty(k)) row[map[k]] = obj[k];
  });
  sheet.appendRow(row);
  return row;
}

// Cari nomor baris (1-based) berdasarkan nilai di kolom header tertentu.
function findRowByKey(sheetName, headerName, keyValue) {
  const sheet = _(sheetName);
  const { headers, map } = getHeaderIndexMap(sheet);
  const colIdx0 = map[headerName];
  if (colIdx0 == null)
    throw new Error(`Header "${headerName}" tidak ditemukan di ${sheetName}`);
  const last = sheet.getLastRow();
  if (last <= 1) return -1;

  const col = colIdx0 + 1; // 1-based
  const values = sheet.getRange(2, col, last - 1, 1).getValues(); // dari baris 2
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(keyValue)) {
      return i + 2; // offset header
    }
  }
  return -1;
}

// Update sebagian kolom pada baris tertentu (hanya field yang disediakan di obj).
function updateRowByObject(sheetName, row, obj) {
  const sheet = _(sheetName);
  const { headers, map } = getHeaderIndexMap(sheet);
  const rowVals = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
  Object.keys(obj).forEach((k) => {
    if (map.hasOwnProperty(k)) {
      rowVals[map[k]] = obj[k];
    }
  });
  sheet.getRange(row, 1, 1, headers.length).setValues([rowVals]);
}

/** =======================
 *  Admin
 *  ======================= */
// Header: id_admin | username | password
function addAdmin({ id_admin, username, password }) {
  const sheet = _(SHEETS.admin);
  const haveId = Boolean(id_admin);
  if (!haveId) {
    // auto id_admin: "adm-N" berdasarkan jumlah data
    const next = sheet.getLastRow() <= 1 ? 1 : sheet.getLastRow() - 1 + 1;
    id_admin = `adm-${next}`;
  }
  appendByObject(SHEETS.admin, { id_admin, username, password });
  logAudit({
    id_admin,
    username,
    action: "CREATE_ADMIN",
    details: `Admin ${username} dibuat`,
  });
  return { ok: true, id_admin };
}

/*******************************
 *  ADMIN READ & AUTH (LOGIN)
 *******************************/

// Baca semua admin (opsional limit). DEFAULT: tidak mengembalikan password.
function readAdminAll(limit = 1000, showPassword = false) {
  const sheet = _(SHEETS.admin);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { rows: [] };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]; // [id_admin, username, password]
  const count = Math.min(limit, lastRow - 1);
  const values = sheet.getRange(2, 1, count, headers.length).getValues();

  const rows = values.map((v) => {
    const obj = {};
    headers.forEach((h, i) => (obj[String(h)] = v[i]));
    // hide password unless explicitly requested
    if (!showPassword) delete obj.password;
    return obj;
  });
  return { rows };
}

// Baca satu admin by username. showPassword=false default.
function readAdminByUsername(username, showPassword = false) {
  if (!username) return { rows: [] };
  const row = findRowByKey(SHEETS.admin, "username", username);
  if (row === -1) return { rows: [] };
  const headers = _(SHEETS.admin)
    .getRange(1, 1, 1, _(SHEETS.admin).getLastColumn())
    .getValues()[0];
  const values = _(SHEETS.admin)
    .getRange(row, 1, 1, headers.length)
    .getValues()[0];
  const obj = {};
  headers.forEach((h, i) => (obj[String(h)] = values[i]));
  if (!showPassword) delete obj.password;
  return { rows: [obj] };
}

// Verifikasi login (username + password)
// Mengembalikan { ok:true, auth: true, admin: { id_admin, username } } jika sukses
// atau { ok:true, auth: false, error: 'Invalid credentials' } jika gagal.
function verifyLogin({ username = "", password = "" } = {}) {
  username = String(username || "").trim();
  password = String(password || "").trim();
  if (!username || !password) {
    return {
      ok: true,
      auth: false,
      error: "Username dan password wajib diisi",
    };
  }
  const row = findRowByKey(SHEETS.admin, "username", username);
  if (row === -1) {
    logAudit({
      username,
      action: "LOGIN_FAILED",
      details: `Login gagal: username tidak ditemukan (${username})`,
    });
    return { ok: true, auth: false, error: "Username atau password salah" };
  }
  // ambil password dari baris
  const headers = _(SHEETS.admin)
    .getRange(1, 1, 1, _(SHEETS.admin).getLastColumn())
    .getValues()[0];
  const values = _(SHEETS.admin)
    .getRange(row, 1, 1, headers.length)
    .getValues()[0];
  const adminObj = {};
  headers.forEach((h, i) => (adminObj[String(h)] = values[i]));

  const stored = String(adminObj.password || "");
  // Sederhana: bandingkan langsung (karena saat ini password disimpan plain text)
  // Jika nanti hashed, gantikan logika ini menjadi verifyHash(password, stored)
  if (password === stored) {
    logAudit({
      id_admin: adminObj.id_admin || "",
      username,
      action: "LOGIN_SUCCESS",
      details: `Login berhasil: ${username}`,
    });
    // jangan kirim password kembali
    return {
      ok: true,
      auth: true,
      admin: {
        id_admin: adminObj.id_admin || "",
        username: adminObj.username || "",
      },
    };
  } else {
    logAudit({
      id_admin: adminObj.id_admin || "",
      username,
      action: "LOGIN_FAILED",
      details: `Login gagal: password salah (${username})`,
    });
    return { ok: true, auth: false, error: "Username atau password salah" };
  }
}

/** =======================
 *  Audit Log
 *  ======================= */
// Header: id_log | id_admin | username | action | details | logAt
function logAudit({ id_admin = "", username = "", action = "", details = "" }) {
  const sheet = _(SHEETS.audit);
  const id_log = `log-${Utilities.formatDate(
    new Date(),
    TZ,
    "yyyyMMddHHmmss"
  )}`;
  const logAt = nowISO();
  appendByObject(SHEETS.audit, {
    id_log,
    id_admin,
    username,
    action,
    details,
    logAt,
  });
  return { ok: true, id_log };
}
// ==== Tambahan: Read Audit (read-only) ====
function readAudit(limit = 100) {
  const sheet = _(SHEETS.audit);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { rows: [] };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const startRow = Math.max(2, lastRow - limit + 1);
  const values = sheet
    .getRange(startRow, 1, lastRow - startRow + 1, sheet.getLastColumn())
    .getValues();

  const rows = values
    .map((v) => {
      const obj = {};
      headers.forEach((h, i) => (obj[String(h)] = v[i]));
      return {
        id_log: obj.id_log || "",
        id_admin: obj.id_admin || "",
        username: obj.username || "",
        action: obj.action || "",
        details: obj.details || "",
        logAt: obj.logAt || "",
      };
    })
    .reverse(); // terbaru duluan
  return { rows };
}

/** =======================
 *  READ DATA (GET ALL)
 *  ======================= */

// Baca semua data dari sheet apapun (mengembalikan array of objects)
function readAll(sheetName, limit = 1000) {
  const sheet = _(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { rows: [] };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const count = Math.min(limit, lastRow - 1);
  const values = sheet.getRange(2, 1, count, headers.length).getValues();

  const rows = values.map((v) => {
    const obj = {};
    headers.forEach((h, i) => (obj[String(h)] = v[i]));
    return obj;
  });
  return { rows };
}

/** =======================
 *  Master Barang
 *  ======================= */
// Header: kodeBarang | namaBarang | satuan | stok | createdAt | createdBy | updatedBy
function addMasterBarang({
  kodeBarang,
  namaBarang,
  satuan,
  stok = 0,
  createdBy = "",
  updatedBy = "",
}) {
  const createdAt = nowISO();
  appendByObject(SHEETS.mBarang, {
    kodeBarang,
    namaBarang,
    satuan,
    stok,
    createdAt,
    createdBy,
    updatedBy,
  });
  logAudit({
    username: createdBy,
    action: "CREATE_MASTER_BARANG",
    details: `Tambah ${kodeBarang} - ${namaBarang}`,
  });
  return { ok: true, kodeBarang };
}
// body: { kodeBarang, ...field-yg-ingin-diupdate }
function updateMasterBarang(data) {
  const { kodeBarang, ...rest } = data || {};
  if (!kodeBarang) throw new Error("kodeBarang wajib diisi untuk update");
  const row = findRowByKey(SHEETS.mBarang, "kodeBarang", kodeBarang);
  if (row === -1)
    throw new Error(`masterBarang dengan kode ${kodeBarang} tidak ditemukan`);
  // sentuh updatedBy & timestamp
  rest.updatedBy = rest.updatedBy || rest.createdBy || "";
  rest.updatedAt = nowISO();
  updateRowByObject(SHEETS.mBarang, row, rest);
  logAudit({
    username: rest.updatedBy || "",
    action: "UPDATE_MASTER_BARANG",
    details: `Ubah ${kodeBarang}`,
  });
  return { ok: true, kodeBarang, row };
}
// DELETE masterBarang by kodeBarang
function deleteMasterBarang({ kodeBarang, deletedBy = "" }) {
  if (!kodeBarang) throw new Error("kodeBarang wajib diisi untuk delete");
  const row = findRowByKey(SHEETS.mBarang, "kodeBarang", kodeBarang);
  if (row === -1)
    throw new Error(`masterBarang dengan kode ${kodeBarang} tidak ditemukan`);
  _(SHEETS.mBarang).deleteRow(row);
  logAudit({
    username: deletedBy,
    action: "DELETE_MASTER_BARANG",
    details: `Hapus ${kodeBarang}`,
  });
  return { ok: true, kodeBarang, deleted: true };
}

// ==== Master Barang ====
function readMasterBarang(limit = 1000) {
  const { rows } = readAll(SHEETS.mBarang, limit);
  return { rows };
}

/** =======================
 *  Barang Masuk
 *  ======================= */
// Header: id_bm | tanggal | kodeBarang | namaBarang | jumlah | satuan | keterangan | createdAt | createdBy
function addBarangMasuk({
  tanggal,
  kodeBarang,
  namaBarang,
  jumlah,
  satuan,
  keterangan = "",
  createdBy = "",
}) {
  const sheet = _(SHEETS.bMasuk);
  const id_bm = nextDailyId(sheet, "id_bm", "bm");
  const createdAt = nowISO();

  // Tambahkan ke sheet barangMasuk
  appendByObject(SHEETS.bMasuk, {
    id_bm,
    tanggal,
    kodeBarang,
    namaBarang,
    jumlah,
    satuan,
    keterangan,
    createdAt,
    createdBy,
  });

  // Cek apakah barang sudah ada di masterBarang
  const existingRow = findRowByKey(SHEETS.mBarang, "kodeBarang", kodeBarang);

  if (existingRow === -1) {
    // Barang belum ada, tambahkan ke masterBarang dengan stok awal = jumlah
    appendByObject(SHEETS.mBarang, {
      kodeBarang,
      namaBarang,
      satuan,
      stok: jumlah,
      createdAt: nowISO(),
      createdBy: createdBy,
      updatedBy: createdBy,
    });

    logAudit({
      username: createdBy,
      action: "AUTO_CREATE_MASTER_BARANG",
      details: `Auto-create masterBarang ${kodeBarang} dari barang masuk ${id_bm}`,
    });
  } else {
    // Barang sudah ada, update stok dengan menambahkan jumlah
    const sheetMaster = _(SHEETS.mBarang);
    const { headers, map } = getHeaderIndexMap(sheetMaster);
    const stokColIdx = map["stok"];

    if (stokColIdx != null) {
      const currentStok =
        sheetMaster.getRange(existingRow, stokColIdx + 1).getValue() || 0;
      const newStok = Number(currentStok) + Number(jumlah);

      sheetMaster.getRange(existingRow, stokColIdx + 1).setValue(newStok);

      // Update updatedBy dan updatedAt
      const updatedByIdx = map["updatedBy"];
      const updatedAtIdx = map["updatedAt"];
      if (updatedByIdx != null) {
        sheetMaster.getRange(existingRow, updatedByIdx + 1).setValue(createdBy);
      }
      if (updatedAtIdx != null) {
        sheetMaster.getRange(existingRow, updatedAtIdx + 1).setValue(nowISO());
      }

      logAudit({
        username: createdBy,
        action: "AUTO_UPDATE_STOK_MASTER_BARANG",
        details: `Update stok ${kodeBarang} dari ${currentStok} menjadi ${newStok} (BM#${id_bm})`,
      });
    }
  }

  logAudit({
    username: createdBy,
    action: "CREATE_BM",
    details: `BM#${id_bm} ${kodeBarang} (${jumlah} ${satuan})`,
  });

  return { ok: true, id_bm };
}

// PATCH/UPDATE barangMasuk by id_bm
// body minimal: { id_bm, ...kolom-yang-diubah }
function updateBarangMasuk(data) {
  const { id_bm, ...rest } = data || {};
  if (!id_bm) throw new Error("id_bm wajib diisi untuk update");
  const row = findRowByKey(SHEETS.bMasuk, "id_bm", id_bm);
  if (row === -1)
    throw new Error(`barangMasuk dengan id_bm ${id_bm} tidak ditemukan`);
  rest.updatedAt = nowISO();
  updateRowByObject(SHEETS.bMasuk, row, rest);
  logAudit({
    username: rest.updatedBy || "",
    action: "UPDATE_BM",
    details: `Ubah BM#${id_bm}`,
  });
  return { ok: true, id_bm, row };
}

// DELETE barangMasuk by id_bm
function deleteBarangMasuk({ id_bm, deletedBy = "" }) {
  if (!id_bm) throw new Error("id_bm wajib diisi untuk delete");
  const row = findRowByKey(SHEETS.bMasuk, "id_bm", id_bm);
  if (row === -1)
    throw new Error(`barangMasuk dengan id_bm ${id_bm} tidak ditemukan`);
  _(SHEETS.bMasuk).deleteRow(row);
  logAudit({
    username: deletedBy,
    action: "DELETE_BM",
    details: `Hapus BM#${id_bm}`,
  });
  return { ok: true, id_bm, deleted: true };
}
// ==== Barang Masuk ====
function readBarangMasuk(limit = 1000) {
  const { rows } = readAll(SHEETS.bMasuk, limit);
  return { rows };
}

/** =======================
 *  Barang Keluar
 *  ======================= */
// Header: id_bk | tanggal | kodeBarang | namaBarang | jumlah | satuan | penerima | event | createdAt | createdBy
function addBarangKeluar({
  tanggal,
  kodeBarang,
  namaBarang,
  jumlah,
  satuan,
  penerima = "",
  event = "",
  createdBy = "",
}) {
  const sheet = _(SHEETS.bKeluar);
  const id_bk = nextDailyId(sheet, "id_bk", "bk"); // <-- ID unik harian
  const createdAt = nowISO();
  appendByObject(SHEETS.bKeluar, {
    id_bk,
    tanggal,
    kodeBarang,
    namaBarang,
    jumlah,
    satuan,
    penerima,
    event,
    createdAt,
    createdBy,
  });
  logAudit({
    username: createdBy,
    action: "CREATE_BK",
    details: `BK#${id_bk} ${kodeBarang} -> ${penerima} (${event})`,
  });
  return { ok: true, id_bk };
}
// PATCH/UPDATE barangKeluar by id_bk
function updateBarangKeluar(data) {
  const { id_bk, ...rest } = data || {};
  if (!id_bk) throw new Error("id_bk wajib diisi untuk update");
  const row = findRowByKey(SHEETS.bKeluar, "id_bk", id_bk);
  if (row === -1)
    throw new Error(`barangKeluar dengan id_bk ${id_bk} tidak ditemukan`);
  rest.updatedAt = nowISO();
  updateRowByObject(SHEETS.bKeluar, row, rest);
  logAudit({
    username: rest.updatedBy || "",
    action: "UPDATE_BK",
    details: `Ubah BK#${id_bk}`,
  });
  return { ok: true, id_bk, row };
}

// DELETE barangKeluar by id_bk
function deleteBarangKeluar({ id_bk, deletedBy = "" }) {
  if (!id_bk) throw new Error("id_bk wajib diisi untuk delete");
  const row = findRowByKey(SHEETS.bKeluar, "id_bk", id_bk);
  if (row === -1)
    throw new Error(`barangKeluar dengan id_bk ${id_bk} tidak ditemukan`);
  _(SHEETS.bKeluar).deleteRow(row);
  logAudit({
    username: deletedBy,
    action: "DELETE_BK",
    details: `Hapus BK#${id_bk}`,
  });
  return { ok: true, id_bk, deleted: true };
}

// ==== Barang Keluar ====
function readBarangKeluar(limit = 1000) {
  const { rows } = readAll(SHEETS.bKeluar, limit);
  return { rows };
}

/** =======================
 *  Webhook sederhana (optional)
 *  ======================= */
// Kirim POST JSON ke Web App:
// { "type": "barangMasuk", "data": { "tanggal": "2025-10-27", ... } }
function doPost(e) {
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    const body =
      e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    const type = (body.type || "").toString();
    const data = body.data || {};
    let result;

    switch (type) {
      case "admin":
        result = addAdmin(data);
        break;
      case "login":
        result = verifyLogin(data);
        break;
      case "audit_Log":
        result = logAudit(data);
        break;
      // MASTER BARANG
      case "masterBarang":
        result = addMasterBarang(data);
        break;
      case "updateMasterBarang":
        result = updateMasterBarang(data);
        break;
      case "deleteMasterBarang":
        result = deleteMasterBarang(data);
        break;
      // BARANG MASUK
      case "barangMasuk":
        result = addBarangMasuk(data);
        break;
      case "updateBarangMasuk":
        result = updateBarangMasuk(data);
        break;
      case "deleteBarangMasuk":
        result = deleteBarangMasuk(data);
        break;
      // BARANG KELUAR
      case "barangKeluar":
        result = addBarangKeluar(data);
        break;
      case "updateBarangKeluar":
        result = updateBarangKeluar(data);
        break;
      case "deleteBarangKeluar":
        result = deleteBarangKeluar(data);
        break;
      // READ AUDIT LOG
      case "readAudit":
        result = readAudit((data && data.limit) || 100);
        break;
      default:
        throw new Error(
          "Tipe tidak dikenali. Gunakan: admin | audit_Log | masterBarang | barangMasuk | barangKeluar"
        );
    }

    return ContentService.createTextOutput(
      JSON.stringify({ ok: true, type, result })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    // --- kumpulkan parameter ---
    const params = e && e.parameter ? e.parameter : {};
    let type = (params.type || params.t || "").toString().trim();
    let limitStr = (params.limit || "").toString().trim();

    // Fallback kalau e.parameter kosong (beberapa kasus Postman/URL encoding)
    if (
      !type &&
      e &&
      typeof e.queryString === "string" &&
      e.queryString.length
    ) {
      const qs = e.queryString.split("&");
      const kv = {};
      qs.forEach((p) => {
        const [k, v] = p.split("=");
        if (k) kv[decodeURIComponent(k)] = v ? decodeURIComponent(v) : "";
      });
      if (!type) type = (kv.type || kv.t || "").toString().trim();
      if (!limitStr) limitStr = (kv.limit || "").toString().trim();
    }

    // Healthcheck jika tanpa type
    if (!type) {
      return ContentService.createTextOutput(
        JSON.stringify({
          ok: true,
          service: "SIWARAS Apps Script",
          time: nowISO(),
          hint: "Untuk readAudit gunakan ?type=readAudit&limit=50",
          received: {
            parameter: e && e.parameter ? e.parameter : null,
            queryString:
              e && typeof e.queryString === "string" ? e.queryString : null,
          },
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Router GET
    switch (type) {
      case "readAudit": {
        const n = parseInt(limitStr, 10);
        const limit = Number.isFinite(n) && n > 0 ? n : 100;
        const result = readAudit(limit);
        return ContentService.createTextOutput(
          JSON.stringify({ ok: true, type, result })
        ).setMimeType(ContentService.MimeType.JSON);
      }
      case "readAdmin": {
        // params: username (optional), limit (optional), showPassword (optional 1/0)
        const username = (params.username || "").toString().trim();
        const showPassword =
          params.showPassword === "1" || params.showPassword === "true";
        const n = parseInt(limitStr, 10);
        const limit = Number.isFinite(n) && n > 0 ? n : 1000;

        let result;
        if (username) {
          result = readAdminByUsername(username, showPassword);
        } else {
          result = readAdminAll(limit, showPassword);
        }
        return ContentService.createTextOutput(
          JSON.stringify({ ok: true, type: "readAdmin", result })
        ).setMimeType(ContentService.MimeType.JSON);
      }
      case "readMasterBarang": {
        const n = parseInt(limitStr, 10);
        const limit = Number.isFinite(n) && n > 0 ? n : 1000;
        const result = readMasterBarang(limit);
        return ContentService.createTextOutput(
          JSON.stringify({ ok: true, type, result })
        ).setMimeType(ContentService.MimeType.JSON);
      }
      case "readBarangMasuk": {
        const n = parseInt(limitStr, 10);
        const limit = Number.isFinite(n) && n > 0 ? n : 1000;
        const result = readBarangMasuk(limit);
        return ContentService.createTextOutput(
          JSON.stringify({ ok: true, type, result })
        ).setMimeType(ContentService.MimeType.JSON);
      }
      case "readBarangKeluar": {
        const n = parseInt(limitStr, 10);
        const limit = Number.isFinite(n) && n > 0 ? n : 1000;
        const result = readBarangKeluar(limit);
        return ContentService.createTextOutput(
          JSON.stringify({ ok: true, type, result })
        ).setMimeType(ContentService.MimeType.JSON);
      }
      default:
        return ContentService.createTextOutput(
          JSON.stringify({
            ok: false,
            error:
              "Tipe GET tidak dikenali. Gunakan: readAudit | readMasterBarang | readBarangMasuk | readBarangKeluar",
            receivedType: type,
          })
        ).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
