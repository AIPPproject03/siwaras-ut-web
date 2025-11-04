let allData = [];
let sortAscending = true;
const DB_TYPE = "sosprom";

// Chart instances
let lineChartInstance = null;
let barChartInstance = null;

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
    initCharts(
      barangMasuk.rows || [],
      barangKeluar.rows || [],
      masterBarang.rows || []
    );
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

// ==================== CHARTS ====================
function initCharts(barangMasuk, barangKeluar, masterBarang) {
  // Destroy existing charts
  if (lineChartInstance) lineChartInstance.destroy();
  if (barChartInstance) barChartInstance.destroy();

  // ===== LINE CHART: Trend Barang Masuk & Keluar (Last 7 Days) =====
  const lineCtx = document.getElementById("lineChart");
  if (lineCtx) {
    const last7Days = getLast7Days();
    const masukData = last7Days.map(
      (date) =>
        barangMasuk.filter(
          (item) => item.tanggal && item.tanggal.split("T")[0] === date
        ).length
    );
    const keluarData = last7Days.map(
      (date) =>
        barangKeluar.filter(
          (item) => item.tanggal && item.tanggal.split("T")[0] === date
        ).length
    );

    const labels = last7Days.map((date) => formatDateLabel(date));

    lineChartInstance = new Chart(lineCtx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Barang Masuk",
            data: masukData,
            borderColor: "#10b981",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            tension: 0.4,
            fill: true,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: "#10b981",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
          },
          {
            label: "Barang Keluar",
            data: keluarData,
            borderColor: "#ef4444",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            tension: 0.4,
            fill: true,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: "#ef4444",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              usePointStyle: true,
              padding: 15,
              font: {
                size: 12,
                weight: "600",
              },
            },
          },
          title: {
            display: true,
            text: "Trend Barang Masuk & Keluar (7 Hari Terakhir)",
            font: {
              size: 16,
              weight: "bold",
            },
            padding: {
              bottom: 20,
            },
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            padding: 12,
            titleFont: {
              size: 14,
              weight: "bold",
            },
            bodyFont: {
              size: 13,
            },
            callbacks: {
              label: function (context) {
                return `${context.dataset.label}: ${context.parsed.y} item`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              font: {
                size: 12,
              },
            },
            grid: {
              color: "rgba(0, 0, 0, 0.05)",
            },
          },
          x: {
            ticks: {
              font: {
                size: 11,
              },
            },
            grid: {
              display: false,
            },
          },
        },
      },
    });
  }

  // ===== BAR CHART: Top 10 Barang (By Stock) =====
  const barCtx = document.getElementById("barChart");
  if (barCtx) {
    const sortedBarang = [...masterBarang]
      .sort((a, b) => (parseInt(b.stok) || 0) - (parseInt(a.stok) || 0))
      .slice(0, 10);

    const labels = sortedBarang.map((item) => item.namaBarang || "N/A");
    const data = sortedBarang.map((item) => parseInt(item.stok) || 0);

    // Generate gradient colors
    const backgroundColors = data.map((_, index) => {
      const hue = 200 - index * 15; // From blue to purple
      return `hsla(${hue}, 70%, 60%, 0.8)`;
    });

    const borderColors = data.map((_, index) => {
      const hue = 200 - index * 15;
      return `hsla(${hue}, 70%, 50%, 1)`;
    });

    barChartInstance = new Chart(barCtx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Jumlah Stok",
            data: data,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 2,
            borderRadius: 8,
            barPercentage: 0.7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          title: {
            display: true,
            text: "Top 10 Barang (Berdasarkan Stok)",
            font: {
              size: 16,
              weight: "bold",
            },
            padding: {
              bottom: 20,
            },
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            padding: 12,
            titleFont: {
              size: 14,
              weight: "bold",
            },
            bodyFont: {
              size: 13,
            },
            callbacks: {
              label: function (context) {
                return `Stok: ${context.parsed.y} unit`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 5,
              font: {
                size: 12,
              },
            },
            grid: {
              color: "rgba(0, 0, 0, 0.05)",
            },
          },
          x: {
            ticks: {
              font: {
                size: 10,
              },
              maxRotation: 45,
              minRotation: 45,
            },
            grid: {
              display: false,
            },
          },
        },
      },
    });
  }
}

// Helper: Get last 7 days in YYYY-MM-DD format
function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(date.toISOString().split("T")[0]);
  }
  return days;
}

// Helper: Format date label (e.g., "Senin, 20/01")
function formatDateLabel(dateStr) {
  const date = new Date(dateStr + "T00:00:00");
  const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const day = days[date.getDay()];
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}, ${dd}/${mm}`;
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
