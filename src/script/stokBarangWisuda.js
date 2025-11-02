let allData = [];
let sortAscending = true;
const DB_TYPE = "wisuda";

// Check authentication
document.addEventListener("DOMContentLoaded", function () {
  const session = Auth.getSession();
  if (!session.username || session.role !== "admin-wisuda") {
    alert("Anda harus login sebagai Admin Wisuda!");
    window.location.href = "../../index.html";
    return;
  }

  loadData();
  setupSearch();
  setupFormSubmit();
});

async function loadData() {
  Utils.showLoading(true);
  try {
    const result = await API.get("readMasterBarang", { limit: 1000 }, DB_TYPE);
    console.log("Master Barang:", result);

    allData = result.rows || [];
    renderTable(allData);
  } catch (error) {
    console.error("Error loading data:", error);
    alert("Gagal memuat data: " + error.message);
  } finally {
    Utils.showLoading(false);
  }
}

function renderTable(data) {
  const tbody = document.getElementById("tableBody");

  if (!data || data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted)">
          Tidak ada data barang. Tambahkan melalui <a href="barangMasukWisuda.html" style="color: var(--primary); text-decoration: underline;">Barang Masuk</a>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = data
    .map((item, index) => {
      const stok = parseInt(item.stok) || 0;
      const statusClass = stok > 0 ? "status-tersedia" : "status-habis";
      const statusText = stok > 0 ? "Tersedia" : "Tidak Tersedia";

      return `
    <tr>
      <td>${index + 1}</td>
      <td><strong>${item.kodeBarang || "-"}</strong></td>
      <td>${item.namaBarang || "-"}</td>
      <td>${item.satuan || "-"}</td>
      <td><strong>${stok}</strong></td>
      <td><span class="status-badge ${statusClass}">${statusText}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn-edit" onclick="openEditModal('${
            item.kodeBarang
          }')" title="Edit">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          </button>
          <button class="btn-delete" onclick="deleteBarang('${
            item.kodeBarang
          }')" title="Hapus">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `;
    })
    .join("");
}

function setupSearch() {
  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("input", function (e) {
    const keyword = e.target.value.toLowerCase();
    const filtered = allData.filter(
      (item) =>
        item.kodeBarang?.toLowerCase().includes(keyword) ||
        item.namaBarang?.toLowerCase().includes(keyword) ||
        item.satuan?.toLowerCase().includes(keyword)
    );
    renderTable(filtered);
  });
}

function toggleSort() {
  sortAscending = !sortAscending;
  const sorted = [...allData].sort((a, b) => {
    const aVal = a.kodeBarang || "";
    const bVal = b.kodeBarang || "";
    return sortAscending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });
  renderTable(sorted);
}

function openEditModal(kodeBarang) {
  const item = allData.find((d) => d.kodeBarang === kodeBarang);
  if (!item) return;

  document.getElementById("kodeBarang").value = item.kodeBarang || "";
  document.getElementById("namaBarang").value = item.namaBarang || "";
  document.getElementById("satuan").value = item.satuan || "";
  document.getElementById("stok").value = item.stok || 0;

  document.getElementById("modal").classList.add("show");
}

function closeModal() {
  document.getElementById("modal").classList.remove("show");
  document.getElementById("barangForm").reset();
}

function setupFormSubmit() {
  const form = document.getElementById("barangForm");
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const session = Auth.getSession();
    const formData = {
      kodeBarang: document.getElementById("kodeBarang").value.trim(),
      namaBarang: document.getElementById("namaBarang").value.trim(),
      satuan: document.getElementById("satuan").value.trim(),
      updatedBy: session.username,
    };

    if (
      !confirm(
        `Apakah Anda yakin ingin mengupdate barang ${formData.kodeBarang}?`
      )
    ) {
      return;
    }

    Utils.showLoading(true);

    try {
      await API.post("updateMasterBarang", formData, DB_TYPE);
      await Auth.logAudit(
        "UPDATE_MASTER_BARANG",
        `Update barang ${formData.kodeBarang}`
      );
      alert("Berhasil mengupdate barang!");
      closeModal();
      await loadData();
    } catch (error) {
      console.error("Error updating data:", error);
      alert("Gagal mengupdate data: " + error.message);
    } finally {
      Utils.showLoading(false);
    }
  });
}

async function deleteBarang(kodeBarang) {
  const item = allData.find((d) => d.kodeBarang === kodeBarang);
  if (!item) return;

  const confirmMsg =
    `Apakah Anda yakin ingin menghapus barang berikut?\n\n` +
    `Kode: ${item.kodeBarang}\n` +
    `Nama: ${item.namaBarang}\n` +
    `Stok: ${item.stok} ${item.satuan}\n\n` +
    `⚠️ PERINGATAN: Data barang akan dihapus permanen!`;

  if (!confirm(confirmMsg)) return;

  const session = Auth.getSession();
  Utils.showLoading(true);

  try {
    await API.post(
      "deleteMasterBarang",
      {
        kodeBarang: kodeBarang,
        deletedBy: session.username,
      },
      DB_TYPE
    );

    await Auth.logAudit(
      "DELETE_MASTER_BARANG",
      `Hapus barang ${kodeBarang} - ${item.namaBarang}`
    );

    alert("Berhasil menghapus barang!");
    await loadData();
  } catch (error) {
    console.error("Error deleting data:", error);
    alert("Gagal menghapus data: " + error.message);
  } finally {
    Utils.showLoading(false);
  }
}

function redirectToBarangMasuk() {
  window.location.href = "barangMasukWisuda.html";
}

function showInfoModal() {
  document.getElementById("infoModal").classList.add("show");
}

function closeInfoModal() {
  document.getElementById("infoModal").classList.remove("show");
}

function handleLogout() {
  if (confirm("Apakah Anda yakin ingin keluar?")) {
    Auth.logAudit("LOGOUT_ADMIN_WISUDA", "Admin Wisuda logout");
    Auth.clearSession();
    window.location.href = "../../index.html";
  }
}
