let allData = [];
let sortAscending = true;
const DB_TYPE = "sosprom"; // Database type untuk Sosprom

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

  loadDashboardData();
  setupSearch();
});

async function loadDashboardData() {
  Utils.showLoading(true);
  try {
    const masterBarang = await API.get(
      "readMasterBarang",
      { limit: 1000 },
      DB_TYPE
    );
    const barangMasuk = await API.get(
      "readBarangMasuk",
      { limit: 1000 },
      DB_TYPE
    );
    const barangKeluar = await API.get(
      "readBarangKeluar",
      { limit: 1000 },
      DB_TYPE
    );

    console.log("Master Barang:", masterBarang);
    console.log("Barang Masuk:", barangMasuk);
    console.log("Barang Keluar:", barangKeluar);

    document.getElementById("totalMasuk").textContent =
      barangMasuk.rows?.length || 0;
    document.getElementById("totalKeluar").textContent =
      barangKeluar.rows?.length || 0;
    document.getElementById("totalBarang").textContent =
      masterBarang.rows?.length || 0;

    allData = masterBarang.rows || [];
    renderTable(allData);
    initCharts();
  } catch (error) {
    console.error("Error loading data:", error);
    toast.error("Gagal memuat data: " + error.message, "Error!");
  } finally {
    Utils.showLoading(false);
  }
}

function renderTable(data) {
  const tbody = document.getElementById("tableBody");

  if (!data || data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-muted)">
          Tidak ada data
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
      <td>${item.kodeBarang || "-"}</td>
      <td>${item.namaBarang || "-"}</td>
      <td>${item.satuan || "-"}</td>
      <td>${item.stok || 0}</td>
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

function initCharts() {
  // Placeholder for charts
  // TODO: Implement with Chart.js or similar library
  console.log("Charts initialized (placeholder)");
}

function handleLogout() {
  toast.confirm("Apakah Anda yakin ingin keluar dari sistem?", async () => {
    try {
      await Auth.logAudit("LOGOUT_ADMIN_SOSPROM", "Admin Sosprom logout");
      Auth.clearSession();
      toast.success("Logout berhasil! Sampai jumpa", "Goodbye!");
      setTimeout(() => {
        window.location.href = "../../index.html";
      }, 1000);
    } catch (error) {
      console.error("Logout error:", error);
      Auth.clearSession();
      window.location.href = "../../index.html";
    }
  });
}
