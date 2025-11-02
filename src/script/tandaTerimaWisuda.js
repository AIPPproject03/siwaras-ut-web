let allData = [];
let masterBarangData = [];
let sortAscending = true;
const DB_TYPE = "wisuda";

// Current detail data
let currentTandaTerima = null;
let currentBarangList = [];
let currentFormData = {
  nama: "-",
  nip: "-",
  keterangan: "-",
};

// Check authentication
document.addEventListener("DOMContentLoaded", function () {
  const session = Auth.getSession();
  if (!session.username || session.role !== "admin-wisuda") {
    alert("Anda harus login sebagai Admin Wisuda!");
    window.location.href = "../../index.html";
    return;
  }

  // Set tanggal hari ini sebagai default
  document.getElementById("tanggalAdd").valueAsDate = new Date();

  loadData();
  loadMasterBarang();
  setupSearch();
  setupFormSubmit();
});

// ==================== LOAD DATA ====================
async function loadData() {
  Utils.showLoading(true);
  try {
    const result = await API.get("readTandaTerima", { limit: 1000 }, DB_TYPE);
    console.log("Tanda Terima:", result);

    allData = result.rows || [];
    renderTable(allData);
  } catch (error) {
    console.error("Error loading data:", error);
    alert("Gagal memuat data: " + error.message);
  } finally {
    Utils.showLoading(false);
  }
}

async function loadMasterBarang() {
  try {
    const result = await API.get("readMasterBarang", { limit: 1000 }, DB_TYPE);
    masterBarangData = result.rows || [];
    populateBarangDropdown();
  } catch (error) {
    console.error("Error loading master barang:", error);
  }
}

function populateBarangDropdown() {
  const select = document.getElementById("selectBarang");
  select.innerHTML = '<option value="">-- Pilih Barang --</option>';

  // Only show available items (stok > 0)
  const availableBarang = masterBarangData.filter((item) => item.stok > 0);

  availableBarang.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.kodeBarang;
    option.textContent = `${item.kodeBarang} - ${item.namaBarang} (Stok: ${item.stok} ${item.satuan})`;
    option.dataset.namaBarang = item.namaBarang;
    option.dataset.satuan = item.satuan;
    option.dataset.stok = item.stok;
    select.appendChild(option);
  });
}

// ==================== RENDER TABLE ====================
function renderTable(data) {
  const tbody = document.getElementById("tableBody");

  if (!data || data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted)">
          Tidak ada data tanda terima
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = data
    .map(
      (item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${item.id_tt || "-"}</td>
      <td>${item.keterangan || "-"}</td>
      <td>${Utils.formatDate(item.tanggal) || "-"}</td>
      <td>
        <span class="status-badge status-${
          item.status === "Selesai" ? "selesai" : "draft"
        }">
          ${item.status || "Draft"}
        </span>
      </td>
      <td>
        <div class="action-btns">
          <button class="btn-edit" onclick="openDetailModal('${
            item.id_tt
          }')" title="Detail">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
            </svg>
          </button>
          <button class="btn-delete" onclick="deleteTandaTerima('${
            item.id_tt
          }')" title="Hapus" ${item.status === "Selesai" ? "disabled" : ""}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `
    )
    .join("");
}

// ==================== SEARCH & SORT ====================
function setupSearch() {
  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("input", function (e) {
    const keyword = e.target.value.toLowerCase();
    const filtered = allData.filter(
      (item) =>
        item.id_tt?.toLowerCase().includes(keyword) ||
        item.keterangan?.toLowerCase().includes(keyword)
    );
    renderTable(filtered);
  });
}

function toggleSort() {
  sortAscending = !sortAscending;
  const sorted = [...allData].sort((a, b) => {
    const aVal = a.id_tt || "";
    const bVal = b.id_tt || "";
    return sortAscending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });
  renderTable(sorted);
}

// ==================== MODAL ADD TANDA TERIMA ====================
function openAddModal() {
  document.getElementById("tanggalAdd").valueAsDate = new Date();
  document.getElementById("keteranganAdd").value = "";
  document.getElementById("modalAdd").classList.add("show");
}

function closeAddModal() {
  document.getElementById("modalAdd").classList.remove("show");
  document.getElementById("addTandaTerimaForm").reset();
}

function setupFormSubmit() {
  const form = document.getElementById("addTandaTerimaForm");
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const session = Auth.getSession();
    const formData = {
      tanggal: document.getElementById("tanggalAdd").value,
      keterangan: document.getElementById("keteranganAdd").value.trim(),
      status: "Draft",
      createdBy: session.username,
    };

    Utils.showLoading(true);

    try {
      const result = await API.post("tandaTerima", formData, DB_TYPE);

      await Auth.logAudit(
        "CREATE_TANDA_TERIMA",
        `Tambah tanda terima: ${formData.keterangan}`
      );

      alert(`Berhasil membuat tanda terima!\nID: ${result.id_tt}`);

      closeAddModal();
      await loadData();
    } catch (error) {
      console.error("Error saving data:", error);
      alert("Gagal menyimpan data: " + error.message);
    } finally {
      Utils.showLoading(false);
    }
  });
}

// ==================== MODAL DETAIL ====================
async function openDetailModal(id_tt) {
  const item = allData.find((d) => d.id_tt === id_tt);
  if (!item) return;

  currentTandaTerima = item;

  // Set header info
  document.getElementById(
    "detailTitle"
  ).textContent = `Detail Tanda Terima - ${id_tt}`;
  document.getElementById("detailKeterangan").textContent = item.keterangan;
  document.getElementById("detailTanggal").textContent = Utils.formatDate(
    item.tanggal
  );
  document.getElementById("detailStatus").innerHTML = `
    <span class="status-badge status-${
      item.status === "Selesai" ? "selesai" : "draft"
    }">
      ${item.status}
    </span>
  `;

  // Load detail data
  await loadDetailData(id_tt);

  // Show/hide buttons based on status
  const isSelesai = item.status === "Selesai";
  document.getElementById("btnAddBarang").style.display = isSelesai
    ? "none"
    : "flex";
  document.getElementById("btnValidate").style.display = isSelesai
    ? "none"
    : "flex";
  document.getElementById("btnPDF").style.display = isSelesai ? "flex" : "none";

  // Disable editing if Selesai
  const editableCells = document.querySelectorAll(".editable");
  editableCells.forEach((cell) => {
    if (isSelesai) {
      cell.ondblclick = null;
      cell.style.cursor = "default";
    } else {
      cell.ondblclick = function () {
        editCell(this);
      };
      cell.style.cursor = "pointer";
    }
  });

  document.getElementById("modalDetail").classList.add("show");
}

async function loadDetailData(id_tt) {
  Utils.showLoading(true);

  try {
    // Load barang list
    const barangResult = await API.get(
      "readTandaTerimaBarang",
      { id_tt: id_tt },
      DB_TYPE
    );
    currentBarangList = barangResult.rows || [];
    renderBarangTable();

    // Load form data
    const formResult = await API.get(
      "readTandaTerimaFormData",
      { id_tt: id_tt },
      DB_TYPE
    );

    if (formResult.rows && formResult.rows.length > 0) {
      currentFormData = formResult.rows[0];
    } else {
      currentFormData = { nama: "-", nip: "-", keterangan: "-" };
    }
    renderFormData();
  } catch (error) {
    console.error("Error loading detail data:", error);
  } finally {
    Utils.showLoading(false);
  }
}

function closeDetailModal() {
  document.getElementById("modalDetail").classList.remove("show");
  currentTandaTerima = null;
  currentBarangList = [];
  currentFormData = { nama: "-", nip: "-", keterangan: "-" };
}

// ==================== RENDER BARANG TABLE ====================
function renderBarangTable() {
  const tbody = document.getElementById("tableBarang");

  if (!currentBarangList || currentBarangList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 20px; color: var(--text-muted)">
          Belum ada barang. Klik "Tambah Barang" untuk menambahkan.
        </td>
      </tr>
    `;
    return;
  }

  const isSelesai = currentTandaTerima?.status === "Selesai";

  tbody.innerHTML = currentBarangList
    .map(
      (item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${item.kodeBarang}</td>
      <td>${item.namaBarang}</td>
      <td>${item.satuan}</td>
      <td><strong>${item.jumlah}</strong></td>
      <td>
        ${
          !isSelesai
            ? `
          <button class="btn-delete-small" onclick="deleteBarangFromList('${item.kodeBarang}')">
            Hapus
          </button>
        `
            : "-"
        }
      </td>
    </tr>
  `
    )
    .join("");
}

// ==================== MODAL ADD BARANG ====================
function openAddBarangModal() {
  document.getElementById("selectBarang").value = "";
  document.getElementById("barangInfo").style.display = "none";
  document.getElementById("jumlahBarang").value = "";
  document.getElementById("modalAddBarang").classList.add("show");
}

function closeAddBarangModal() {
  document.getElementById("modalAddBarang").classList.remove("show");
  document.getElementById("addBarangForm").reset();
}

function updateBarangInfo() {
  const select = document.getElementById("selectBarang");
  const selectedOption = select.options[select.selectedIndex];
  const barangInfo = document.getElementById("barangInfo");

  if (select.value) {
    // Check if already added
    const isAlreadyAdded = currentBarangList.some(
      (item) => item.kodeBarang === select.value
    );

    if (isAlreadyAdded) {
      alert("Barang ini sudah ada dalam daftar!");
      select.value = "";
      barangInfo.style.display = "none";
      return;
    }

    // Show info
    barangInfo.style.display = "block";
    document.getElementById("infoKodeBarang").textContent = select.value;
    document.getElementById("infoNamaBarang").textContent =
      selectedOption.dataset.namaBarang || "-";
    document.getElementById("infoSatuan").textContent =
      selectedOption.dataset.satuan || "-";
    document.getElementById("infoStok").textContent =
      selectedOption.dataset.stok || "0";

    // Set max for jumlah input
    document.getElementById("jumlahBarang").max =
      selectedOption.dataset.stok || 0;
    document.getElementById("jumlahBarang").value = "";
  } else {
    barangInfo.style.display = "none";
  }
}

// Setup add barang form
document
  .getElementById("addBarangForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const select = document.getElementById("selectBarang");
    const selectedOption = select.options[select.selectedIndex];
    const jumlah = parseInt(document.getElementById("jumlahBarang").value);
    const stok = parseInt(selectedOption.dataset.stok);

    // Validate jumlah
    if (jumlah > stok) {
      alert(`Jumlah melebihi stok tersedia!\nStok tersedia: ${stok}`);
      return;
    }

    const barangData = {
      id_tt: currentTandaTerima.id_tt,
      kodeBarang: select.value,
      namaBarang: selectedOption.dataset.namaBarang,
      satuan: selectedOption.dataset.satuan,
      jumlah: jumlah,
    };

    Utils.showLoading(true);

    try {
      await API.post("tandaTerimaBarang", barangData, DB_TYPE);

      await Auth.logAudit(
        "ADD_BARANG_TANDA_TERIMA",
        `Tambah barang ${barangData.kodeBarang} ke tanda terima ${currentTandaTerima.id_tt}`
      );

      alert("Berhasil menambahkan barang ke daftar!");

      closeAddBarangModal();
      await loadDetailData(currentTandaTerima.id_tt);
    } catch (error) {
      console.error("Error adding barang:", error);
      alert("Gagal menambahkan barang: " + error.message);
    } finally {
      Utils.showLoading(false);
    }
  });

// ==================== DELETE BARANG FROM LIST ====================
async function deleteBarangFromList(kodeBarang) {
  if (!confirm(`Apakah Anda yakin ingin menghapus barang ${kodeBarang}?`))
    return;

  Utils.showLoading(true);

  try {
    await API.post(
      "deleteTandaTerimaBarang",
      {
        id_tt: currentTandaTerima.id_tt,
        kodeBarang: kodeBarang,
      },
      DB_TYPE
    );

    await Auth.logAudit(
      "DELETE_BARANG_TANDA_TERIMA",
      `Hapus barang ${kodeBarang} dari tanda terima ${currentTandaTerima.id_tt}`
    );

    alert("Berhasil menghapus barang dari daftar!");
    await loadDetailData(currentTandaTerima.id_tt);
  } catch (error) {
    console.error("Error deleting barang:", error);
    alert("Gagal menghapus barang: " + error.message);
  } finally {
    Utils.showLoading(false);
  }
}

// ==================== EDITABLE TABLE ====================
function renderFormData() {
  document.querySelector('[data-field="nama"] .cell-value').textContent =
    currentFormData.nama || "-";
  document.querySelector('[data-field="nip"] .cell-value').textContent =
    currentFormData.nip || "-";
  document.querySelector('[data-field="keterangan"] .cell-value').textContent =
    currentFormData.keterangan || "-";
}

function editCell(cell) {
  const isSelesai = currentTandaTerima?.status === "Selesai";
  if (isSelesai) return;

  const field = cell.dataset.field;
  const valueSpan = cell.querySelector(".cell-value");
  const input = cell.querySelector(".cell-input");

  // Set current value
  input.value = currentFormData[field] === "-" ? "" : currentFormData[field];

  // Show input, hide span
  valueSpan.style.display = "none";
  input.style.display = "block";
  input.focus();
  input.select();

  cell.classList.add("editing");

  // Handle blur (save)
  input.onblur = async function () {
    await saveCell(cell, field, input.value.trim());
  };

  // Handle Enter key
  input.onkeydown = function (e) {
    if (e.key === "Enter") {
      input.blur();
    }
    if (e.key === "Escape") {
      cancelEdit(cell, valueSpan, input);
    }
  };
}

function cancelEdit(cell, valueSpan, input) {
  valueSpan.style.display = "block";
  input.style.display = "none";
  cell.classList.remove("editing");
}

async function saveCell(cell, field, newValue) {
  const valueSpan = cell.querySelector(".cell-value");
  const input = cell.querySelector(".cell-input");

  // If empty, set to "-"
  if (!newValue) {
    newValue = "-";
  }

  // Update local data
  currentFormData[field] = newValue;

  // Update display
  valueSpan.textContent = newValue;
  valueSpan.style.display = "block";
  input.style.display = "none";
  cell.classList.remove("editing");

  // Save to backend
  Utils.showLoading(true);

  try {
    await API.post(
      "updateTandaTerimaFormData",
      {
        id_tt: currentTandaTerima.id_tt,
        ...currentFormData,
      },
      DB_TYPE
    );

    await Auth.logAudit(
      "UPDATE_FORM_DATA_TANDA_TERIMA",
      `Update ${field} tanda terima ${currentTandaTerima.id_tt}`
    );
  } catch (error) {
    console.error("Error saving form data:", error);
    alert("Gagal menyimpan data: " + error.message);
  } finally {
    Utils.showLoading(false);
  }
}

// ==================== VALIDATE TANDA TERIMA ====================
async function validateTandaTerima() {
  // Check if barang list is not empty
  if (!currentBarangList || currentBarangList.length === 0) {
    alert("Belum ada barang dalam daftar!\nTambahkan minimal 1 barang.");
    return;
  }

  // Check if form data is filled
  if (
    !currentFormData.nama ||
    currentFormData.nama === "-" ||
    !currentFormData.nip ||
    currentFormData.nip === "-"
  ) {
    alert(
      "Data penerima belum lengkap!\nPastikan Nama dan NIP/NIM sudah diisi."
    );
    return;
  }

  if (
    !confirm(
      "Validasi data akan mengubah status menjadi Selesai dan tidak dapat diubah lagi.\n\nLanjutkan?"
    )
  )
    return;

  Utils.showLoading(true);

  try {
    const session = Auth.getSession();

    // Update status to Selesai
    await API.post(
      "updateTandaTerimaStatus",
      {
        id_tt: currentTandaTerima.id_tt,
        status: "Selesai",
        updatedBy: session.username,
      },
      DB_TYPE
    );

    // Update stok master barang (deduct)
    for (const barang of currentBarangList) {
      await API.post(
        "barangKeluar",
        {
          id_tt: currentTandaTerima.id_tt,
          kodeBarang: barang.kodeBarang,
          namaBarang: barang.namaBarang,
          jumlah: barang.jumlah,
          satuan: barang.satuan,
          tanggal: currentTandaTerima.tanggal,
          keterangan: `Barang keluar untuk: ${currentTandaTerima.keterangan}`,
          createdBy: session.username,
        },
        DB_TYPE
      );
    }

    await Auth.logAudit(
      "VALIDATE_TANDA_TERIMA",
      `Validasi dan finalisasi tanda terima ${currentTandaTerima.id_tt}`
    );

    alert(
      "Validasi berhasil!\n\nStatus diubah menjadi Selesai.\nStok barang telah dikurangi.\nSilakan cetak PDF."
    );

    closeDetailModal();
    await loadData();
    await loadMasterBarang();
  } catch (error) {
    console.error("Error validating:", error);
    alert("Gagal validasi data: " + error.message);
  } finally {
    Utils.showLoading(false);
  }
}

// ==================== GENERATE PDF ====================
async function generatePDF() {
  if (currentTandaTerima.status !== "Selesai") {
    alert("Tanda terima harus divalidasi terlebih dahulu!");
    return;
  }

  Utils.showLoading(true);

  try {
    // Prepare data for PDF
    const pdfData = {
      id_tt: currentTandaTerima.id_tt,
      tanggal: Utils.formatDate(currentTandaTerima.tanggal),
      keterangan: currentTandaTerima.keterangan,
      barangList: currentBarangList,
      penerima: currentFormData,
    };

    // Call API to generate PDF
    const response = await API.post("generateTandaTerimaPDF", pdfData, DB_TYPE);

    // Download PDF
    if (response.pdfUrl) {
      window.open(response.pdfUrl, "_blank");
    } else if (response.pdfBase64) {
      // Convert base64 to blob and download
      const blob = base64toBlob(response.pdfBase64, "application/pdf");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `TandaTerima_${currentTandaTerima.id_tt}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }

    await Auth.logAudit(
      "GENERATE_PDF_TANDA_TERIMA",
      `Generate PDF tanda terima ${currentTandaTerima.id_tt}`
    );

    alert("PDF berhasil dibuat!");
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Gagal membuat PDF: " + error.message);
  } finally {
    Utils.showLoading(false);
  }
}

function base64toBlob(base64Data, contentType) {
  contentType = contentType || "";
  const sliceSize = 1024;
  const byteCharacters = atob(base64Data);
  const bytesLength = byteCharacters.length;
  const slicesCount = Math.ceil(bytesLength / sliceSize);
  const byteArrays = new Array(slicesCount);

  for (let sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
    const begin = sliceIndex * sliceSize;
    const end = Math.min(begin + sliceSize, bytesLength);

    const bytes = new Array(end - begin);
    for (let offset = begin, i = 0; offset < end; ++i, ++offset) {
      bytes[i] = byteCharacters[offset].charCodeAt(0);
    }
    byteArrays[sliceIndex] = new Uint8Array(bytes);
  }
  return new Blob(byteArrays, { type: contentType });
}

// ==================== DELETE TANDA TERIMA ====================
async function deleteTandaTerima(id_tt) {
  const item = allData.find((d) => d.id_tt === id_tt);

  if (item.status === "Selesai") {
    alert("Tanda terima yang sudah Selesai tidak dapat dihapus!");
    return;
  }

  if (!confirm(`Apakah Anda yakin ingin menghapus tanda terima ${id_tt}?`))
    return;

  const session = Auth.getSession();
  Utils.showLoading(true);

  try {
    await API.post(
      "deleteTandaTerima",
      {
        id_tt: id_tt,
        deletedBy: session.username,
      },
      DB_TYPE
    );

    await Auth.logAudit("DELETE_TANDA_TERIMA", `Hapus tanda terima ${id_tt}`);

    alert("Berhasil menghapus tanda terima!");
    await loadData();
  } catch (error) {
    console.error("Error deleting data:", error);
    alert("Gagal menghapus data: " + error.message);
  } finally {
    Utils.showLoading(false);
  }
}

// ==================== LOGOUT ====================
function handleLogout() {
  if (confirm("Apakah Anda yakin ingin keluar?")) {
    Auth.logAudit("LOGOUT_ADMIN_WISUDA", "Admin Wisuda logout");
    Auth.clearSession();
    window.location.href = "../../index.html";
  }
}
