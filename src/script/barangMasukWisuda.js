let allData = [];
let masterBarangData = [];
let sortAscending = true;
const DB_TYPE = "wisuda";

// Check authentication
document.addEventListener("DOMContentLoaded", function () {
  const session = Auth.getSession();
  if (!session.username || session.role !== "admin-wisuda") {
    toast.error("Anda harus login sebagai Admin Wisuda!", "Akses Ditolak!");
    setTimeout(() => {
      window.location.href = "../../index.html";
    }, 1500);
    return;
  }

  document.getElementById("tanggal").valueAsDate = new Date();
  loadData();
  loadMasterBarang();
  setupSearch();
  setupFormSubmit();
});

async function loadData() {
  Utils.showLoading(true);
  try {
    const result = await API.get("readBarangMasuk", { limit: 1000 }, DB_TYPE);
    console.log("Barang Masuk:", result);

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
    populateExistingBarangDropdown();
  } catch (error) {
    console.error("Error loading master barang:", error);
  }
}

function populateExistingBarangDropdown() {
  const select = document.getElementById("existingBarang");
  select.innerHTML = '<option value="">-- Pilih Barang --</option>';

  masterBarangData.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.kodeBarang;
    option.textContent = `${item.kodeBarang} - ${item.namaBarang} (Stok: ${item.stok} ${item.satuan})`;
    option.dataset.namaBarang = item.namaBarang;
    option.dataset.satuan = item.satuan;
    option.dataset.stok = item.stok;
    select.appendChild(option);
  });
}

function switchInputMode(mode) {
  const newBarangGroup = document.getElementById("newBarangGroup");
  const existingBarangGroup = document.getElementById("existingBarangGroup");
  const existingBarangDetails = document.getElementById(
    "existingBarangDetails"
  );

  if (mode === "new") {
    newBarangGroup.style.display = "block";
    existingBarangGroup.style.display = "none";
    existingBarangDetails.style.display = "none";

    // Set required on new barang fields
    document.getElementById("kodeBarang").required = true;
    document.getElementById("namaBarang").required = true;
    document.getElementById("satuan").required = true;
    document.getElementById("jumlah").required = true;
    document.getElementById("existingBarang").required = false;
    document.getElementById("jumlahExisting").required = false;
  } else {
    newBarangGroup.style.display = "none";
    existingBarangGroup.style.display = "block";

    // Set required on existing barang fields
    document.getElementById("kodeBarang").required = false;
    document.getElementById("namaBarang").required = false;
    document.getElementById("satuan").required = false;
    document.getElementById("jumlah").required = false;
    document.getElementById("existingBarang").required = true;
    document.getElementById("jumlahExisting").required = true;
  }

  // Clear form
  document.getElementById("existingBarang").value = "";
  fillExistingBarangData();
}

function fillExistingBarangData() {
  const select = document.getElementById("existingBarang");
  const selectedOption = select.options[select.selectedIndex];
  const existingBarangDetails = document.getElementById(
    "existingBarangDetails"
  );

  if (select.value) {
    // Show details
    existingBarangDetails.style.display = "block";

    // Fill display fields
    document.getElementById("displayKodeBarang").textContent = select.value;
    document.getElementById("displayNamaBarang").textContent =
      selectedOption.dataset.namaBarang || "-";
    document.getElementById("displaySatuan").textContent =
      selectedOption.dataset.satuan || "-";
    document.getElementById("displayStok").textContent =
      selectedOption.dataset.stok || "0";

    // Clear jumlah existing
    document.getElementById("jumlahExisting").value = "";
  } else {
    existingBarangDetails.style.display = "none";
  }
}

function renderTable(data) {
  const tbody = document.getElementById("tableBody");

  if (!data || data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted)">
          Tidak ada data barang masuk
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
      <td>${item.id_bm || "-"}</td>
      <td>${Utils.formatDate(item.tanggal) || "-"}</td>
      <td>${item.kodeBarang || "-"}</td>
      <td>${item.namaBarang || "-"}</td>
      <td><strong>${item.jumlah || 0}</strong></td>
      <td>${item.satuan || "-"}</td>
      <td>${item.keterangan || "-"}</td>
      <td>
        <div class="action-btns">
          <button class="btn-edit" onclick="openEditModal('${item.id_bm}')">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          </button>
          <button class="btn-delete" onclick="deleteBarangMasuk('${
            item.id_bm
          }')">
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

function setupSearch() {
  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("input", function (e) {
    const keyword = e.target.value.toLowerCase();
    const filtered = allData.filter(
      (item) =>
        item.id_bm?.toLowerCase().includes(keyword) ||
        item.kodeBarang?.toLowerCase().includes(keyword) ||
        item.namaBarang?.toLowerCase().includes(keyword) ||
        item.keterangan?.toLowerCase().includes(keyword)
    );
    renderTable(filtered);
  });
}

function toggleSort() {
  sortAscending = !sortAscending;
  const sorted = [...allData].sort((a, b) => {
    const aVal = a.id_bm || "";
    const bVal = b.id_bm || "";
    return sortAscending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });
  renderTable(sorted);
}

function openAddModal() {
  document.getElementById("modalTitle").textContent = "Tambah Barang Masuk";
  document.getElementById("editMode").value = "false";
  document.getElementById("barangMasukForm").reset();
  document.getElementById("tanggal").valueAsDate = new Date();

  // Reset to new barang mode
  document.querySelector('input[name="inputMode"][value="new"]').checked = true;
  switchInputMode("new");

  // Show mode selection only in add mode
  document.getElementById("modeSelectionGroup").style.display = "block";

  document.getElementById("modal").classList.add("show");
}

function openEditModal(id_bm) {
  const item = allData.find((d) => d.id_bm === id_bm);
  if (!item) return;

  document.getElementById("modalTitle").textContent = "Edit Barang Masuk";
  document.getElementById("editMode").value = "true";
  document.getElementById("originalIdBm").value = id_bm;

  // Hide mode selection in edit mode
  document.getElementById("modeSelectionGroup").style.display = "none";

  // Force to new barang mode for editing
  switchInputMode("new");

  const tanggalValue = item.tanggal ? item.tanggal.split("T")[0] : "";
  document.getElementById("tanggal").value = tanggalValue;
  document.getElementById("kodeBarang").value = item.kodeBarang || "";
  document.getElementById("namaBarang").value = item.namaBarang || "";
  document.getElementById("jumlah").value = item.jumlah || 0;
  document.getElementById("satuan").value = item.satuan || "";
  document.getElementById("keterangan").value = item.keterangan || "";

  document.getElementById("kodeBarang").disabled = true;
  document.getElementById("modal").classList.add("show");
}

function closeModal() {
  document.getElementById("modal").classList.remove("show");
  document.getElementById("barangMasukForm").reset();
  document.getElementById("kodeBarang").disabled = false;
}

function updateBarangInfo() {
  const select = document.getElementById("selectBarang");
  const selectedOption = select.options[select.selectedIndex];
  const barangInfo = document.getElementById("barangInfo");

  if (select.value) {
    const isAlreadyAdded = currentBarangList.some(
      (item) => item.kodeBarang === select.value
    );

    if (isAlreadyAdded) {
      toast.warning("Barang ini sudah ada dalam daftar!", "Peringatan!");
      select.value = "";
      barangInfo.style.display = "none";
      return;
    }

    barangInfo.style.display = "block";
    document.getElementById("displayKodeBarang").textContent = select.value;
    document.getElementById("displayNamaBarang").textContent =
      selectedOption.dataset.namaBarang || "-";
    document.getElementById("displaySatuan").textContent =
      selectedOption.dataset.satuan || "-";
    document.getElementById("displayStok").textContent =
      selectedOption.dataset.stok || "0";
  } else {
    barangInfo.style.display = "none";
  }
}

function setupFormSubmit() {
  const form = document.getElementById("barangMasukForm");
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const editMode = document.getElementById("editMode").value === "true";
    const session = Auth.getSession();

    // Check which mode is active
    const inputMode =
      document.querySelector('input[name="inputMode"]:checked')?.value || "new";

    let formData;

    if (editMode) {
      // Edit mode - use new barang fields
      formData = {
        id_bm: document.getElementById("originalIdBm").value,
        tanggal: document.getElementById("tanggal").value,
        kodeBarang: document
          .getElementById("kodeBarang")
          .value.trim()
          .toUpperCase(),
        namaBarang: document.getElementById("namaBarang").value.trim(),
        jumlah: parseInt(document.getElementById("jumlah").value) || 0,
        satuan: document.getElementById("satuan").value.trim(),
        keterangan: document.getElementById("keterangan").value.trim(),
        updatedBy: session.username,
      };
    } else if (inputMode === "new") {
      // New barang mode
      formData = {
        tanggal: document.getElementById("tanggal").value,
        kodeBarang: document
          .getElementById("kodeBarang")
          .value.trim()
          .toUpperCase(),
        namaBarang: document.getElementById("namaBarang").value.trim(),
        jumlah: parseInt(document.getElementById("jumlah").value) || 0,
        satuan: document.getElementById("satuan").value.trim(),
        keterangan: document.getElementById("keterangan").value.trim(),
        createdBy: session.username,
      };
    } else {
      // Existing barang mode
      const select = document.getElementById("existingBarang");
      const selectedOption = select.options[select.selectedIndex];

      formData = {
        tanggal: document.getElementById("tanggal").value,
        kodeBarang: select.value.toUpperCase(),
        namaBarang: selectedOption.dataset.namaBarang,
        jumlah: parseInt(document.getElementById("jumlahExisting").value) || 0,
        satuan: selectedOption.dataset.satuan,
        keterangan: document.getElementById("keterangan").value.trim(),
        createdBy: session.username,
      };
    }

    Utils.showLoading(true);

    try {
      if (editMode) {
        await API.post("updateBarangMasuk", formData, DB_TYPE);
        await Auth.logAudit(
          "UPDATE_BARANG_MASUK",
          `Update barang masuk ${formData.id_bm}`
        );
        toast.success("Data barang masuk berhasil diperbarui!", "Berhasil!");
      } else {
        const result = await API.post("barangMasuk", formData, DB_TYPE);
        await Auth.logAudit(
          "CREATE_BARANG_MASUK",
          `Tambah barang masuk ${formData.kodeBarang} (${formData.jumlah} ${formData.satuan})`
        );

        const mode = inputMode === "new" ? "baru" : "existing";
        toast.success(
          `Barang masuk berhasil ditambahkan!\nID: ${result.id_bm} | Mode: ${mode}`,
          "Berhasil!"
        );
      }

      closeModal();
      await loadData();
      await loadMasterBarang();
    } catch (error) {
      console.error("Error saving data:", error);
      toast.error("Gagal menyimpan data: " + error.message, "Error!");
    } finally {
      Utils.showLoading(false);
    }
  });
}

async function deleteBarangMasuk(id_bm) {
  toast.confirm(
    `Apakah Anda yakin ingin menghapus barang masuk ${id_bm}? Tindakan ini tidak dapat dibatalkan.`,
    async () => {
      const session = Auth.getSession();
      Utils.showLoading(true);

      try {
        await API.post(
          "deleteBarangMasuk",
          { id_bm: id_bm, deletedBy: session.username },
          DB_TYPE
        );
        await Auth.logAudit(
          "DELETE_BARANG_MASUK",
          `Hapus barang masuk ${id_bm}`
        );

        toast.success("Barang masuk berhasil dihapus!", "Berhasil!");
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

function handleLogout() {
  toast.confirm("Apakah Anda yakin ingin keluar dari sistem?", async () => {
    try {
      await Auth.logAudit("LOGOUT_ADMIN_WISUDA", "Admin Wisuda logout");
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
