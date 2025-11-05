let allData = [];
let sortAscending = true;
const DB_TYPE = "wisuda";

// Chart instances
let lineChartInstance = null;
let barChartInstance = null;

// Load data on page load
document.addEventListener("DOMContentLoaded", async function () {
  initTheme(); // Initialize theme first
  await loadData();
  setupSearch();
});

// ==================== THEME MANAGEMENT ====================
function initTheme() {
  const savedTheme = localStorage.getItem("siwaras_theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  console.log("Theme initialized:", savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "light" ? "dark" : "light";

  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("siwaras_theme", newTheme);

  if (window.toast) {
    toast.success(
      `Mode ${newTheme === "dark" ? "Gelap" : "Terang"} diaktifkan!`,
      "Tema Diubah"
    );
  }

  console.log("Theme changed to:", newTheme);

  // Re-render charts with new theme colors
  loadData();
}

// Helper: Get chart text color based on theme
function getChartTextColor() {
  const theme = document.documentElement.getAttribute("data-theme");
  return theme === "dark" ? "#ffffff" : "#475569";
}

// Helper: Get chart grid color based on theme
function getChartGridColor() {
  const theme = document.documentElement.getAttribute("data-theme");
  return theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)";
}

// ==================== DATA MANAGEMENT ====================
async function loadData() {
  Utils.showLoading(true);
  try {
    // Fetch data from Wisuda API
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

    // Update stats
    document.getElementById("totalMasuk").textContent =
      barangMasuk.rows?.length || 0;
    document.getElementById("totalKeluar").textContent =
      barangKeluar.rows?.length || 0;
    document.getElementById("totalBarang").textContent =
      masterBarang.rows?.length || 0;

    // Store data
    allData = masterBarang.rows || [];

    // Render table
    renderTable(allData);

    // Initialize charts
    initCharts(barangMasuk.rows || [], barangKeluar.rows || [], allData);
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
        item.namaBarang?.toLowerCase().includes(keyword)
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

  const textColor = getChartTextColor();
  const gridColor = getChartGridColor();

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
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointRadius: 5,
            pointHoverRadius: 7,
          },
          {
            label: "Barang Keluar",
            data: keluarData,
            borderColor: "#ef4444",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointRadius: 5,
            pointHoverRadius: 7,
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
              },
              color: textColor, // Dynamic color
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
            color: textColor, // Dynamic color
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            padding: 12,
            titleFont: {
              size: 14,
            },
            bodyFont: {
              size: 13,
            },
            displayColors: true,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              font: {
                size: 11,
              },
              color: textColor, // Dynamic color
            },
            grid: {
              color: gridColor, // Dynamic color
            },
          },
          x: {
            ticks: {
              font: {
                size: 11,
              },
              color: textColor, // Dynamic color
            },
            grid: {
              display: false,
            },
          },
        },
      },
    });
  }

  // ===== BAR CHART: Top 10 Barang (by Stok) =====
  const barCtx = document.getElementById("barChart");
  if (barCtx) {
    const sortedBarang = [...masterBarang]
      .sort((a, b) => (parseInt(b.stok) || 0) - (parseInt(a.stok) || 0))
      .slice(0, 10);

    const labels = sortedBarang.map((item) => item.namaBarang || "N/A");
    const data = sortedBarang.map((item) => parseInt(item.stok) || 0);

    const backgroundColors = data.map((_, index) => {
      const hue = 200 - index * 15;
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
            color: textColor, // Dynamic color
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            padding: 12,
            titleFont: {
              size: 14,
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
              stepSize: 1,
              font: {
                size: 11,
              },
              color: textColor, // Dynamic color
            },
            grid: {
              color: gridColor, // Dynamic color
            },
          },
          x: {
            ticks: {
              font: {
                size: 10,
              },
              maxRotation: 45,
              minRotation: 45,
              color: textColor, // Dynamic color
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
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split("T")[0]);
  }
  return dates;
}

// Helper: Format date label (e.g., "Senin, 20/01")
function formatDateLabel(dateStr) {
  const date = new Date(dateStr + "T00:00:00");
  const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const dayName = days[date.getDay()];
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${dayName}, ${day}/${month}`;
}

function handleLogout() {
  toast.confirm("Apakah Anda yakin ingin keluar?", () => {
    Auth.clearSession();
    toast.success("Logout berhasil!", "Goodbye!");
    setTimeout(() => {
      window.location.href = "../index.html";
    }, 1000);
  });
}
