let allData = [];
let masterBarangData = [];
let sortAscending = true;
const DB_TYPE = "sosprom";

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
  if (!session.username || session.role !== "admin-sosprom") {
    toast.error("Anda harus login sebagai Admin Sosprom!", "Akses Ditolak!");
    setTimeout(() => {
      window.location.href = "../../index.html";
    }, 1500);
    return;
  }

  document.getElementById("tanggalAdd").valueAsDate = new Date();

  loadData();
  loadMasterBarang();
  setupSearch();
  setupAddFormSubmit();
  setupAddBarangFormSubmit();
});

// ==================== LOAD DATA ====================
async function loadData() {
  Utils.showLoading(true);
  try {
    const result = await API.get("readTandaTerima", { limit: 1000 }, DB_TYPE);
    allData = result.rows || [];
    renderTable(allData);
  } catch (error) {
    console.error("Error loading data:", error);
    toast.error("Gagal memuat data: " + error.message, "Error!");
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
  if (!select) return;

  select.innerHTML = '<option value="">-- Pilih Barang --</option>';

  masterBarangData
    .filter((item) => parseInt(item.stok) > 0)
    .forEach((item) => {
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
      <td><strong>${item.id_tt || "-"}</strong></td>
      <td>${item.keterangan || "-"}</td>
      <td>${Utils.formatDate(item.tanggal) || "-"}</td>
      <td>
        <span class="status-badge status-${
          item.status?.toLowerCase() || "draft"
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
          }')" title="Hapus">
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
  document.getElementById("addTandaTerimaForm").reset();
  document.getElementById("tanggalAdd").valueAsDate = new Date();
  document.getElementById("modalAdd").classList.add("show");
}

function closeAddModal() {
  document.getElementById("modalAdd").classList.remove("show");
}

function setupAddFormSubmit() {
  const form = document.getElementById("addTandaTerimaForm");
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const session = Auth.getSession();
    const formData = {
      tanggal: document.getElementById("tanggalAdd").value,
      keterangan: document.getElementById("keteranganAdd").value.trim(),
      createdBy: session.username,
    };

    Utils.showLoading(true);

    try {
      const result = await API.post("tandaTerima", formData, DB_TYPE);
      await Auth.logAudit(
        "CREATE_TANDA_TERIMA",
        `Buat tanda terima ${result.id_tt} - ${formData.keterangan}`
      );

      toast.success(
        `Tanda terima berhasil dibuat!\nID: ${result.id_tt}`,
        "Berhasil!"
      );

      closeAddModal();
      await loadData();
    } catch (error) {
      console.error("Error saving data:", error);
      toast.error("Gagal menyimpan data: " + error.message, "Error!");
    } finally {
      Utils.showLoading(false);
    }
  });
}

// ==================== MODAL DETAIL ====================
async function openDetailModal(id_tt) {
  currentTandaTerima = allData.find((item) => item.id_tt === id_tt);
  if (!currentTandaTerima) return;

  document.getElementById("detailTitle").textContent = `Detail ${id_tt}`;
  document.getElementById("detailKeterangan").textContent =
    currentTandaTerima.keterangan || "-";
  document.getElementById("detailTanggal").textContent = Utils.formatDate(
    currentTandaTerima.tanggal
  );
  document.getElementById("detailStatus").textContent =
    currentTandaTerima.status || "Draft";

  // Show/hide buttons based on status
  const isDraft = currentTandaTerima.status === "Draft";
  document.getElementById("btnAddBarang").style.display = isDraft
    ? "flex"
    : "none";
  document.getElementById("btnValidate").style.display = isDraft
    ? "flex"
    : "none";
  document.getElementById("btnPDF").style.display = isDraft ? "none" : "flex";

  // Disable editing if not draft
  const editableCells = document.querySelectorAll(".editable");
  editableCells.forEach((cell) => {
    if (isDraft) {
      cell.style.cursor = "pointer";
      cell.ondblclick = function () {
        editCell(this);
      };
    } else {
      cell.style.cursor = "not-allowed";
      cell.ondblclick = null;
    }
  });

  await loadDetailData(id_tt);

  document.getElementById("modalDetail").classList.add("show");
}

async function loadDetailData(id_tt) {
  try {
    // Load barang list
    const barangResult = await API.get(
      "readTandaTerimaBarang",
      { id_tt },
      DB_TYPE
    );
    currentBarangList = barangResult.rows || [];
    renderBarangTable();

    // Load form data
    const formResult = await API.get(
      "readTandaTerimaFormData",
      { id_tt },
      DB_TYPE
    );
    const formData = formResult.rows?.[0];

    if (formData) {
      currentFormData = {
        nama: formData.nama || "-",
        nip: formData.nip || "-",
        keterangan: formData.keterangan || "-",
      };
    } else {
      currentFormData = {
        nama: "-",
        nip: "-",
        keterangan: "-",
      };
    }

    // Update form data display
    document.querySelector('[data-field="nama"] .cell-value').textContent =
      currentFormData.nama;
    document.querySelector('[data-field="nip"] .cell-value').textContent =
      currentFormData.nip;
    document.querySelector(
      '[data-field="keterangan"] .cell-value'
    ).textContent = currentFormData.keterangan;
  } catch (error) {
    console.error("Error loading detail data:", error);
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

  if (currentBarangList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 20px; color: var(--text-muted)">
          Belum ada barang. Klik "Tambah Barang" untuk menambahkan.
        </td>
      </tr>
    `;
    return;
  }

  const isDraft = currentTandaTerima?.status === "Draft";

  tbody.innerHTML = currentBarangList
    .map(
      (item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td><strong>${item.kodeBarang || "-"}</strong></td>
      <td>${item.namaBarang || "-"}</td>
      <td>${item.satuan || "-"}</td>
      <td><strong>${item.jumlah || 0}</strong></td>
      <td>
        ${
          isDraft
            ? `
        <button class="btn-delete-small" onclick="deleteBarangFromList('${item.kodeBarang}')" title="Hapus">
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
  document.getElementById("addBarangForm").reset();
  document.getElementById("barangInfo").style.display = "none";
  populateBarangDropdown();
  document.getElementById("modalAddBarang").classList.add("show");
}

function closeAddBarangModal() {
  document.getElementById("modalAddBarang").classList.remove("show");
}

function updateBarangInfo() {
  const select = document.getElementById("selectBarang");
  const selectedOption = select.options[select.selectedIndex];
  const barangInfo = document.getElementById("barangInfo");

  if (select.value) {
    barangInfo.style.display = "block";
    document.getElementById("infoKodeBarang").textContent = select.value;
    document.getElementById("infoNamaBarang").textContent =
      selectedOption.dataset.namaBarang || "-";
    document.getElementById("infoSatuan").textContent =
      selectedOption.dataset.satuan || "-";
    document.getElementById("infoStok").textContent =
      selectedOption.dataset.stok || "0";
    document.getElementById("jumlahBarang").max = selectedOption.dataset.stok;
  } else {
    barangInfo.style.display = "none";
  }
}

// Setup add barang form
function setupAddBarangFormSubmit() {
  const form = document.getElementById("addBarangForm");
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const select = document.getElementById("selectBarang");
    const selectedOption = select.options[select.selectedIndex];
    const jumlah = parseInt(document.getElementById("jumlahBarang").value);
    const stok = parseInt(selectedOption.dataset.stok);

    if (jumlah > stok) {
      toast.warning(
        `Jumlah melebihi stok tersedia!\nStok tersedia: ${stok}`,
        "Peringatan!"
      );
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

      toast.success("Barang berhasil ditambahkan ke daftar!", "Berhasil!");

      closeAddBarangModal();
      await loadDetailData(currentTandaTerima.id_tt);
    } catch (error) {
      console.error("Error adding barang:", error);
      toast.error("Gagal menambahkan barang: " + error.message, "Error!");
    } finally {
      Utils.showLoading(false);
    }
  });
}

async function deleteBarangFromList(kodeBarang) {
  toast.confirm(
    `Apakah Anda yakin ingin menghapus barang ${kodeBarang} dari daftar?`,
    async () => {
      Utils.showLoading(true);

      try {
        await API.post(
          "deleteTandaTerimaBarang",
          { id_tt: currentTandaTerima.id_tt, kodeBarang: kodeBarang },
          DB_TYPE
        );
        await Auth.logAudit(
          "DELETE_BARANG_TANDA_TERIMA",
          `Hapus barang ${kodeBarang} dari tanda terima ${currentTandaTerima.id_tt}`
        );

        toast.success("Barang berhasil dihapus dari daftar!", "Berhasil!");
        await loadDetailData(currentTandaTerima.id_tt);
      } catch (error) {
        console.error("Error deleting barang:", error);
        toast.error("Gagal menghapus barang: " + error.message, "Error!");
      } finally {
        Utils.showLoading(false);
      }
    }
  );
}

// ==================== EDIT CELL (DOUBLE CLICK) ====================
function editCell(cell) {
  // Check if already editing or not draft
  if (
    cell.classList.contains("editing") ||
    currentTandaTerima?.status !== "Draft"
  ) {
    return;
  }

  const valueSpan = cell.querySelector(".cell-value");
  const input = cell.querySelector(".cell-input");
  const currentValue = valueSpan.textContent;

  // Show input, hide span
  valueSpan.style.display = "none";
  input.style.display = "block";
  input.value = currentValue === "-" ? "" : currentValue;
  input.focus();
  input.select();

  cell.classList.add("editing");

  // Handle blur (save)
  input.onblur = function () {
    saveCell(cell);
  };

  // Handle Enter key
  input.onkeydown = function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveCell(cell);
    } else if (e.key === "Escape") {
      cancelEdit(cell);
    }
  };
}

async function saveCell(cell) {
  const valueSpan = cell.querySelector(".cell-value");
  const input = cell.querySelector(".cell-input");
  const field = cell.dataset.field;
  const newValue = input.value.trim() || "-";

  // Update display
  valueSpan.textContent = newValue;
  valueSpan.style.display = "block";
  input.style.display = "none";
  cell.classList.remove("editing");

  // Update current form data
  currentFormData[field] = newValue;

  // Save to backend
  try {
    await API.post(
      "updateTandaTerimaFormData",
      { id_tt: currentTandaTerima.id_tt, ...currentFormData },
      DB_TYPE
    );
    await Auth.logAudit(
      "UPDATE_FORM_DATA_TANDA_TERIMA",
      `Update ${field} tanda terima ${currentTandaTerima.id_tt}`
    );
  } catch (error) {
    console.error("Error saving cell:", error);
    toast.error("Gagal menyimpan perubahan: " + error.message, "Error!");
  }
}

function cancelEdit(cell) {
  const valueSpan = cell.querySelector(".cell-value");
  const input = cell.querySelector(".cell-input");

  valueSpan.style.display = "block";
  input.style.display = "none";
  cell.classList.remove("editing");
}

// ==================== VALIDATE & PDF ====================
async function validateTandaTerima() {
  if (currentBarangList.length === 0) {
    toast.warning(
      "Belum ada barang dalam daftar!\nTambahkan minimal 1 barang.",
      "Peringatan!"
    );
    return;
  }

  if (
    currentFormData.nama === "-" ||
    currentFormData.nama === "" ||
    currentFormData.nip === "-" ||
    currentFormData.nip === ""
  ) {
    toast.warning(
      "Data penerima belum lengkap!\nPastikan Nama dan NIP/NIM sudah diisi.",
      "Peringatan!"
    );
    return;
  }

  toast.confirm(
    "Validasi data akan mengubah status menjadi Selesai dan tidak dapat diubah lagi.\n\nLanjutkan?",
    async () => {
      Utils.showLoading(true);

      try {
        const session = Auth.getSession();

        // Create barang keluar entries
        for (const item of currentBarangList) {
          await API.post(
            "barangKeluar",
            {
              tanggal: currentTandaTerima.tanggal,
              kodeBarang: item.kodeBarang,
              namaBarang: item.namaBarang,
              jumlah: item.jumlah,
              satuan: item.satuan,
              keterangan: `Tanda Terima ${currentTandaTerima.id_tt}: ${currentTandaTerima.keterangan}`,
              createdBy: session.username,
            },
            DB_TYPE
          );
        }

        // Update tanda terima status
        await API.post(
          "updateTandaTerimaStatus",
          {
            id_tt: currentTandaTerima.id_tt,
            status: "Selesai",
            validatedBy: session.username,
          },
          DB_TYPE
        );
        await Auth.logAudit(
          "VALIDATE_TANDA_TERIMA",
          `Validasi dan finalisasi tanda terima ${currentTandaTerima.id_tt}`
        );

        toast.success(
          "Validasi berhasil!\n\nStatus diubah menjadi Selesai.\nStok barang telah dikurangi.\nSilakan cetak PDF.",
          "Berhasil!"
        );

        closeDetailModal();
        await loadData();
      } catch (error) {
        console.error("Error validating:", error);
        toast.error("Gagal validasi: " + error.message, "Error!");
      } finally {
        Utils.showLoading(false);
      }
    }
  );
}

// ==================== GENERATE PDF ====================
async function generatePDF() {
  if (currentTandaTerima.status !== "Selesai") {
    toast.warning(
      "Tanda terima harus divalidasi terlebih dahulu!",
      "Peringatan!"
    );
    return;
  }

  if (typeof window.jspdf === "undefined") {
    toast.error(
      "Library PDF belum ter-load. Silakan refresh halaman dan coba lagi.",
      "Error!"
    );
    console.error("jsPDF library not loaded");
    return;
  }

  Utils.showLoading(true);

  try {
    const { jsPDF } = window.jspdf;

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

    // ===== HEADER WITH LOGO (Landscape orientation) =====
    const logoWidth = 25; // Width lebih panjang
    const logoHeight = 18; // Height lebih pendek (landscape ratio)
    const logoYPos = yPos;

    if (logoBase64) {
      // Add logo on the left with landscape aspect ratio
      doc.addImage(logoBase64, "PNG", margin, logoYPos, logoWidth, logoHeight);
    }

    // ===== HEADER TEXT (beside logo, vertically centered) =====
    const headerStartX = margin + logoWidth + 6; // Space after logo
    const logoCenter = logoYPos + logoHeight / 2; // Center of logo vertically

    // Calculate text positions to center with logo
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    const line1Height = 16 * 0.352778; // Convert pt to mm
    const line2Height = 10 * 0.352778;
    const line3Height = 9 * 0.352778;
    const totalTextHeight = line1Height + line2Height + line3Height + 2 + 2; // +2 for spacing
    const textStartY = logoCenter - totalTextHeight / 2 + line1Height / 2;

    doc.text("UNIVERSITAS TERBUKA", headerStartX, textStartY);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      "UPBJJ-UT PALANGKA RAYA",
      headerStartX,
      textStartY + line1Height + 2
    );

    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text(
      "Sistem Inventori Wisuda & Rangkaian Sosprom (SIWARAS)",
      headerStartX,
      textStartY + line1Height + line2Height + 4
    );

    // Move yPos past the header section
    yPos =
      Math.max(
        logoYPos + logoHeight,
        textStartY + line1Height + line2Height + line3Height + 4
      ) + 3;

    // Line separator
    doc.setLineWidth(0.8);
    doc.setDrawColor(41, 128, 185);
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

    const tableData = currentBarangList.map((item, index) => [
      String(index + 1),
      String(item.kodeBarang || "-"),
      String(item.namaBarang || "-"),
      String(item.satuan || "-"),
      String(item.jumlah || 0),
    ]);

    const tableWidth = pageWidth - 2 * margin;
    const colWidths = {
      no: 15,
      kode: 30,
      satuan: 25,
      jumlah: 20,
    };

    const namaBarangWidth =
      tableWidth -
      colWidths.no -
      colWidths.kode -
      colWidths.satuan -
      colWidths.jumlah;

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
        2: { halign: "left", cellWidth: namaBarangWidth },
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

    const printDate = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Palangka Raya, ${printDate}`, margin, yPos);

    yPos += 10;

    const col1X = margin + 25;
    const col2X = pageWidth - margin - 55;

    doc.setFont("helvetica", "bold");
    doc.text("Yang Menyerahkan,", col1X, yPos);
    doc.text("Yang Menerima,", col2X, yPos);

    yPos += 20;

    doc.setLineWidth(0.5);
    doc.line(col1X - 5, yPos, col1X + 50, yPos);
    doc.line(col2X - 5, yPos, col2X + 50, yPos);

    yPos += 5;

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

    await Auth.logAudit(
      "GENERATE_PDF_TANDA_TERIMA",
      `Generate PDF tanda terima ${currentTandaTerima.id_tt}`
    );

    toast.success("PDF berhasil dibuat dan diunduh!", "Berhasil!");
  } catch (error) {
    console.error("Error generating PDF:", error);
    toast.error("Gagal membuat PDF: " + error.message, "Error!");
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
    toast.warning(
      "Tanda terima yang sudah Selesai tidak dapat dihapus!",
      "Peringatan!"
    );
    return;
  }

  toast.confirm(
    `Apakah Anda yakin ingin menghapus tanda terima ${id_tt}?`,
    async () => {
      const session = Auth.getSession();
      Utils.showLoading(true);

      try {
        await API.post(
          "deleteTandaTerima",
          { id_tt: id_tt, deletedBy: session.username },
          DB_TYPE
        );
        await Auth.logAudit(
          "DELETE_TANDA_TERIMA",
          `Hapus tanda terima ${id_tt}`
        );

        toast.success("Tanda terima berhasil dihapus!", "Berhasil!");
        await loadData();
      } catch (error) {
        console.error("Error deleting data:", error);
        toast.error("Gagal menghapus data: " + error.message, "Error!");
      } finally {
        Utils.showLoading(false);
      }
    }
  );
}

// At end - handleLogout
function handleLogout() {
  toast.confirm("Apakah Anda yakin ingin keluar?", async () => {
    try {
      await Auth.logAudit("LOGOUT_ADMIN_SOSPROM", "Admin Sosprom logout");
      Auth.clearSession();
      toast.success("Logout berhasil!", "Goodbye!");
      setTimeout(() => {
        window.location.href = "../../index.html";
      }, 1000);
    } catch (error) {
      Auth.clearSession();
      window.location.href = "../../index.html";
    }
  });
}
