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

  // Check if jsPDF is loaded
  if (typeof window.jspdf === "undefined") {
    alert("Library PDF belum ter-load. Silakan refresh halaman dan coba lagi.");
    console.error("jsPDF library not loaded");
    return;
  }

  Utils.showLoading(true);

  try {
    const { jsPDF } = window.jspdf;

    // Additional check
    if (!jsPDF) {
      throw new Error("jsPDF constructor not available");
    }

    const doc = new jsPDF();

    // Configuration
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = margin;

    // ===== LOAD AND ADD LOGO =====
    const logoBase64 = await loadLogoAsBase64();

    // ===== HEADER WITH LOGO =====
    const logoSize = 20; // Reduced from 25 to 20
    const logoYPos = yPos + 2; // Adjust vertical position

    if (logoBase64) {
      // Add logo on the left with consistent aspect ratio
      doc.addImage(logoBase64, "PNG", margin, logoYPos, logoSize, logoSize);
    }

    // ===== HEADER TEXT (beside logo) =====
    const headerStartX = margin + logoSize + 5; // Space after logo
    const headerStartY = yPos + 3;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("UNIVERSITAS TERBUKA", headerStartX, headerStartY);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("UPBJJ-UT PALANGKA RAYA", headerStartX, headerStartY + 6);

    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text(
      "Sistem Inventori Wisuda & Rangkaian Sosprom (SIWARAS)",
      headerStartX,
      headerStartY + 11
    );

    // Move yPos past the header section
    yPos = Math.max(logoYPos + logoSize, headerStartY + 11) + 5;

    // Line separator
    doc.setLineWidth(0.8);
    doc.setDrawColor(41, 128, 185); // Blue color
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    // ===== TITLE =====
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    const titleWidth = doc.getTextWidth("TANDA TERIMA BARANG KELUAR");
    doc.text("TANDA TERIMA BARANG KELUAR", (pageWidth - titleWidth) / 2, yPos);
    yPos += 10;

    // ===== DOCUMENT INFO =====
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const infoData = [
      ["ID Tanda Terima", ":", String(currentTandaTerima.id_tt || "-")],
      [
        "Tanggal",
        ":",
        String(Utils.formatDate(currentTandaTerima.tanggal) || "-"),
      ],
      ["Keterangan", ":", String(currentTandaTerima.keterangan || "-")],
      ["Status", ":", String(currentTandaTerima.status || "-")],
    ];

    infoData.forEach((row) => {
      doc.text(String(row[0]), margin, yPos);
      doc.text(String(row[1]), margin + 40, yPos);

      // Wrap long text if needed
      const textValue = String(row[2]);
      if (textValue.length > 50) {
        const splitText = doc.splitTextToSize(
          textValue,
          pageWidth - margin - 50
        );
        doc.text(splitText, margin + 45, yPos);
        yPos += splitText.length * 5;
      } else {
        doc.text(textValue, margin + 45, yPos);
        yPos += 6;
      }
    });

    yPos += 5;

    // ===== TABLE BARANG =====
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Daftar Barang:", margin, yPos);
    yPos += 7;

    // Prepare table data with string conversion
    const tableData = currentBarangList.map((item, index) => [
      String(index + 1),
      String(item.kodeBarang || "-"),
      String(item.namaBarang || "-"),
      String(item.satuan || "-"),
      String(item.jumlah || 0),
    ]);

    // Calculate dynamic column widths for full page width
    const tableWidth = pageWidth - 2 * margin;
    const colWidths = {
      no: 15,
      kode: 30,
      satuan: 25,
      jumlah: 20,
    };

    // Calculate remaining width for nama barang (dynamic)
    const namaBarangWidth =
      tableWidth -
      colWidths.no -
      colWidths.kode -
      colWidths.satuan -
      colWidths.jumlah;

    // Add table with full width
    doc.autoTable({
      startY: yPos,
      head: [["No", "Kode Barang", "Nama Barang", "Satuan", "Jumlah"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: {
        0: { halign: "center", cellWidth: colWidths.no },
        1: { halign: "center", cellWidth: colWidths.kode },
        2: { halign: "left", cellWidth: namaBarangWidth }, // Dynamic width
        3: { halign: "center", cellWidth: colWidths.satuan },
        4: { halign: "center", cellWidth: colWidths.jumlah },
      },
      margin: { left: margin, right: margin },
      tableWidth: "auto",
      styles: {
        overflow: "linebreak",
        cellWidth: "wrap",
      },
    });

    yPos = doc.lastAutoTable.finalY + 10;

    // ===== DATA PENERIMA =====
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Data Penerima:", margin, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const penerimaData = [
      ["Nama", ":", String(currentFormData.nama || "-")],
      ["NIP/NIM", ":", String(currentFormData.nip || "-")],
      ["Keterangan", ":", String(currentFormData.keterangan || "-")],
    ];

    penerimaData.forEach((row) => {
      doc.text(String(row[0]), margin, yPos);
      doc.text(String(row[1]), margin + 30, yPos);

      // Wrap long text if needed
      const textValue = String(row[2]);
      if (textValue.length > 60) {
        const splitText = doc.splitTextToSize(
          textValue,
          pageWidth - margin - 40
        );
        doc.text(splitText, margin + 35, yPos);
        yPos += splitText.length * 5;
      } else {
        doc.text(textValue, margin + 35, yPos);
        yPos += 6;
      }
    });

    yPos += 10;

    // ===== SIGNATURE SECTION =====
    const signatureY = pageHeight - 55;
    yPos = Math.max(yPos, signatureY);

    // Tanggal cetak
    const printDate = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Palangka Raya, ${printDate}`, margin, yPos);

    yPos += 10;

    // Columns for signatures with better spacing
    const col1X = margin + 25;
    const col2X = pageWidth - margin - 55;

    // Yang Menyerahkan
    doc.setFont("helvetica", "bold");
    doc.text("Yang Menyerahkan,", col1X, yPos);

    // Yang Menerima
    doc.text("Yang Menerima,", col2X, yPos);

    yPos += 20;

    // Signature lines
    doc.setLineWidth(0.5);
    doc.line(col1X - 5, yPos, col1X + 50, yPos);
    doc.line(col2X - 5, yPos, col2X + 50, yPos);

    yPos += 5;

    // Names under signature
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(String(currentTandaTerima.createdBy || "Admin"), col1X, yPos);
    doc.text(String(currentFormData.nama || "-"), col2X, yPos);

    // ===== FOOTER =====
    const footerY = pageHeight - 10;
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120);
    const footerText = `Dokumen ini dicetak otomatis oleh SIWARAS UT pada ${new Date().toLocaleString(
      "id-ID"
    )}`;
    const footerWidth = doc.getTextWidth(footerText);
    doc.text(footerText, (pageWidth - footerWidth) / 2, footerY);

    // ===== SAVE PDF =====
    const fileName = `TandaTerima_${
      currentTandaTerima.id_tt
    }_${Date.now()}.pdf`;
    doc.save(fileName);

    // Log audit
    await Auth.logAudit(
      "GENERATE_PDF_TANDA_TERIMA",
      `Generate PDF tanda terima ${currentTandaTerima.id_tt}`
    );

    alert("PDF berhasil dibuat dan diunduh!");
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Gagal membuat PDF: " + error.message);
  } finally {
    Utils.showLoading(false);
  }
}

// Helper function to load logo as base64
async function loadLogoAsBase64() {
  try {
    const logoPath = "../../assets/icon/logo-ut.png";

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = function () {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL("image/png");
        resolve(dataURL);
      };

      img.onerror = function () {
        console.warn("Could not load logo image");
        resolve(null);
      };

      img.src = logoPath;
    });
  } catch (error) {
    console.error("Error loading logo:", error);
    return null;
  }
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
