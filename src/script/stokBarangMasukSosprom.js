let allData = [];
let sortAscending = true;
const DB_TYPE = "sosprom";

// Check authentication
document.addEventListener("DOMContentLoaded", function () {
  const session = Auth.getSession();
  if (!session.username || session.role !== "admin-sosprom") {
    alert("Anda harus login sebagai Admin Sosprom!");
    window.location.href = "../../index.html";
    return;
  }

  loadData();
  setupSearch();
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
      <td>${item.createdBy || "-"}</td>
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

function handleLogout() {
  if (confirm("Apakah Anda yakin ingin keluar?")) {
    Auth.logAudit("LOGOUT_ADMIN_SOSPROM", "Admin Sosprom logout");
    Auth.clearSession();
    window.location.href = "../../index.html";
  }
}
