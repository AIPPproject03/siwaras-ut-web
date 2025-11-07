const CONFIG = {
  // Separate URLs for Wisuda and Sosprom
  WISUDA_URL:
    "https://script.google.com/macros/s/AKfycbxA2EDaXW-3ayhXT3aw82I22h8i0Con1Pa3a4vDMeeTgCMG2pSepM8lf-rsLaNLe-HgFw/exec",
  SOSPROM_URL:
    "https://script.google.com/macros/s/AKfycbwTaltCc9PmpVeALrF361F42jPyXwYL9EmAoGMVL7CFxlzY9Ex8wrwT_RxrmmacXNt4NQ/exec",

  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  REQUEST_TIMEOUT: 30000, // 30 seconds

  // Get base URL based on type
  getBaseUrl(dbType = "wisuda") {
    return dbType === "sosprom" ? this.SOSPROM_URL : this.WISUDA_URL;
  },

  ENDPOINTS: {
    // BATCH Endpoints (NEW - SUPER FAST)
    readDashboardAll: "readDashboardAll",
    readDashboardStats: "readDashboardStats",
    readMasterBarangLight: "readMasterBarangLight",

    // READ Operations
    readAudit: "readAudit",
    readAdmin: "readAdmin",
    readMasterBarang: "readMasterBarang",
    readBarangMasuk: "readBarangMasuk",
    readBarangKeluar: "readBarangKeluar",
    readTandaTerima: "readTandaTerima",
    readTandaTerimaBarang: "readTandaTerimaBarang",
    readTandaTerimaFormData: "readTandaTerimaFormData",

    // WRITE Operations
    login: "login",
    createAdmin: "admin",
    createMasterBarang: "masterBarang",
    updateMasterBarang: "updateMasterBarang",
    deleteMasterBarang: "deleteMasterBarang",
    createBarangMasuk: "barangMasuk",
    updateBarangMasuk: "updateBarangMasuk",
    deleteBarangMasuk: "deleteBarangMasuk",
    createBarangKeluar: "barangKeluar",
    updateBarangKeluar: "updateBarangKeluar",
    deleteBarangKeluar: "deleteBarangKeluar",
    createTandaTerima: "tandaTerima",
    updateTandaTerimaStatus: "updateTandaTerimaStatus",
    deleteTandaTerima: "deleteTandaTerima",
    addTandaTerimaBarang: "tandaTerimaBarang",
    deleteTandaTerimaBarang: "deleteTandaTerimaBarang",
    updateTandaTerimaFormData: "updateTandaTerimaFormData",
    auditLog: "audit_Log",
  },
};

// ==================== CACHE MANAGER ====================
const CacheManager = {
  prefix: "siwaras_cache_",

  _getCacheKey(type, params, dbType) {
    const paramStr = JSON.stringify(params || {});
    return `${this.prefix}${type}_${dbType}_${paramStr}`;
  },

  get(type, params, dbType) {
    const key = this._getCacheKey(type, params, dbType);
    const cached = sessionStorage.getItem(key);

    if (!cached) return null;

    try {
      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;

      if (age < CONFIG.CACHE_DURATION) {
        console.log(
          `✅ Cache HIT: ${type} (${dbType}) - age: ${Math.round(age / 1000)}s`
        );
        return data;
      } else {
        console.log(`⏰ Cache EXPIRED: ${type} (${dbType})`);
        this.remove(type, params, dbType);
        return null;
      }
    } catch (e) {
      console.error("Cache parse error:", e);
      return null;
    }
  },

  set(type, params, dbType, data) {
    const key = this._getCacheKey(type, params, dbType);
    const cached = {
      data,
      timestamp: Date.now(),
    };

    try {
      sessionStorage.setItem(key, JSON.stringify(cached));
      console.log(`💾 Cache SET: ${type} (${dbType})`);
    } catch (e) {
      console.error("Cache set error:", e);
      if (e.name === "QuotaExceededError") {
        this.clearOld();
        try {
          sessionStorage.setItem(key, JSON.stringify(cached));
        } catch (e2) {
          console.error("Cache set failed after clear:", e2);
        }
      }
    }
  },

  remove(type, params, dbType) {
    const key = this._getCacheKey(type, params, dbType);
    sessionStorage.removeItem(key);
  },

  invalidate(dbType = null) {
    const keys = Object.keys(sessionStorage);
    keys.forEach((key) => {
      if (key.startsWith(this.prefix)) {
        if (!dbType || key.includes(`_${dbType}_`)) {
          sessionStorage.removeItem(key);
        }
      }
    });
    console.log(`🗑️ Cache invalidated: ${dbType || "ALL"}`);
  },

  clearOld() {
    const keys = Object.keys(sessionStorage);
    const now = Date.now();

    keys.forEach((key) => {
      if (key.startsWith(this.prefix)) {
        try {
          const cached = JSON.parse(sessionStorage.getItem(key));
          const age = now - cached.timestamp;
          if (age > CONFIG.CACHE_DURATION) {
            sessionStorage.removeItem(key);
          }
        } catch (e) {
          sessionStorage.removeItem(key);
        }
      }
    });
  },
};

// ==================== REQUEST QUEUE ====================
const RequestQueue = {
  queue: new Map(),

  async execute(key, fn) {
    if (this.queue.has(key)) {
      console.log(`⏳ Request queued: ${key}`);
      return this.queue.get(key);
    }

    const promise = fn();
    this.queue.set(key, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.queue.delete(key);
    }
  },
};

// ==================== OPTIMIZED API HELPER ====================
const API = {
  // ===== NEW: BATCH REQUEST (3 calls → 1 call) =====
  async getDashboardAll(dbType = "wisuda", useCache = true) {
    if (useCache) {
      const cached = CacheManager.get("dashboardAll", {}, dbType);
      if (cached) return cached;
    }

    const requestKey = `BATCH_DASHBOARD_${dbType}`;

    return RequestQueue.execute(requestKey, async () => {
      const queryParams = new URLSearchParams({
        type: "readDashboardAll",
        _t: Date.now(),
      });

      const url = `${CONFIG.getBaseUrl(dbType)}?${queryParams}`;
      console.log(`🚀 API BATCH: Dashboard ALL (${dbType})`);

      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        CONFIG.REQUEST_TIMEOUT
      );

      try {
        const response = await fetch(url, {
          method: "GET",
          signal: controller.signal,
          redirect: "follow",
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data.ok) {
          throw new Error(data.error || "API Error");
        }

        const result = data.result;

        if (useCache) {
          CacheManager.set("dashboardAll", {}, dbType, result);
        }

        return result;
      } catch (error) {
        clearTimeout(timeout);
        if (error.name === "AbortError") {
          throw new Error("Request timeout - silakan coba lagi");
        }
        throw error;
      }
    });
  },

  // GET Request with caching
  async get(type, params = {}, dbType = "wisuda", useCache = true) {
    if (useCache) {
      const cached = CacheManager.get(type, params, dbType);
      if (cached) return cached;
    }

    const requestKey = `GET_${type}_${dbType}_${JSON.stringify(params)}`;

    return RequestQueue.execute(requestKey, async () => {
      const queryParams = new URLSearchParams({
        type,
        ...params,
        _t: Date.now(),
      });

      const url = `${CONFIG.getBaseUrl(dbType)}?${queryParams}`;
      console.log(`🌐 API GET: ${type} (${dbType})`);

      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        CONFIG.REQUEST_TIMEOUT
      );

      try {
        const response = await fetch(url, {
          method: "GET",
          signal: controller.signal,
          redirect: "follow",
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data.ok) {
          throw new Error(data.error || "API Error");
        }

        const result = data.result;

        if (useCache) {
          CacheManager.set(type, params, dbType, result);
        }

        return result;
      } catch (error) {
        clearTimeout(timeout);
        if (error.name === "AbortError") {
          throw new Error("Request timeout");
        }
        throw error;
      }
    });
  },

  // POST Request
  async post(type, data, dbType = "wisuda") {
    const requestKey = `POST_${type}_${dbType}_${Date.now()}`;

    return RequestQueue.execute(requestKey, async () => {
      console.log(`🌐 API POST: ${type} (${dbType})`);

      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        CONFIG.REQUEST_TIMEOUT
      );

      try {
        const response = await fetch(CONFIG.getBaseUrl(dbType), {
          method: "POST",
          signal: controller.signal,
          redirect: "follow",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify({ type, data }),
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const responseData = await response.json();

        if (!responseData.ok) {
          throw new Error(responseData.error || "API Error");
        }

        // Invalidate cache after successful write
        CacheManager.invalidate(dbType);

        return responseData.result;
      } catch (error) {
        clearTimeout(timeout);
        if (error.name === "AbortError") {
          throw new Error("Request timeout");
        }
        throw error;
      }
    });
  },

  async login(username, password, dbType = "wisuda") {
    try {
      console.log(`🔐 Login attempt: ${username} (${dbType})`);
      const result = await this.post("login", { username, password }, dbType);
      return result;
    } catch (error) {
      console.error("Login API Error:", error);
      throw error;
    }
  },
};

// ==================== AUTH HELPER ====================
const Auth = {
  setSession(username, role = "admin", adminData = {}, dbType = "wisuda") {
    sessionStorage.setItem("siwaras_user", username);
    sessionStorage.setItem("siwaras_role", role);
    sessionStorage.setItem("siwaras_db_type", dbType);
    sessionStorage.setItem("siwaras_login_time", new Date().toISOString());
    if (adminData.id_admin) {
      sessionStorage.setItem("siwaras_admin_id", adminData.id_admin);
    }
    console.log("Session set:", { username, role, dbType, adminData });
  },

  getSession() {
    return {
      username: sessionStorage.getItem("siwaras_user"),
      role: sessionStorage.getItem("siwaras_role"),
      dbType: sessionStorage.getItem("siwaras_db_type") || "wisuda",
      loginTime: sessionStorage.getItem("siwaras_login_time"),
      adminId: sessionStorage.getItem("siwaras_admin_id"),
    };
  },

  clearSession() {
    sessionStorage.removeItem("siwaras_user");
    sessionStorage.removeItem("siwaras_role");
    sessionStorage.removeItem("siwaras_db_type");
    sessionStorage.removeItem("siwaras_login_time");
    sessionStorage.removeItem("siwaras_admin_id");

    CacheManager.invalidate();

    console.log("Session cleared");
  },

  isLoggedIn() {
    return !!sessionStorage.getItem("siwaras_user");
  },

  async logAudit(action, details) {
    const session = this.getSession();
    if (!session.username) return;

    try {
      await API.post(
        "auditLog",
        {
          id_admin: session.adminId || "",
          username: session.username,
          action,
          details,
        },
        session.dbType
      );
    } catch (error) {
      console.warn("Audit log failed (non-critical):", error);
    }
  },
};

// ==================== UTILS ====================
const Utils = {
  formatDate(date) {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  },

  formatDateTime(date) {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  },

  showNotification(message, type = "info", title = "") {
    if (window.toast) {
      window.toast.show(message, type, title);
    } else {
      alert(message);
    }
  },

  showSuccess(message, title = "Berhasil!") {
    if (window.toast) {
      window.toast.success(message, title);
    } else {
      alert(message);
    }
  },

  showError(message, title = "Error!") {
    if (window.toast) {
      window.toast.error(message, title);
    } else {
      alert(message);
    }
  },

  showWarning(message, title = "Peringatan!") {
    if (window.toast) {
      window.toast.warning(message, title);
    } else {
      alert(message);
    }
  },

  showInfo(message, title = "") {
    if (window.toast) {
      window.toast.info(message, title);
    } else {
      alert(message);
    }
  },

  confirm(message, onConfirm, onCancel, title = "Konfirmasi") {
    if (window.toast) {
      window.toast.confirm(message, onConfirm, onCancel, title);
    } else {
      if (confirm(message)) {
        if (onConfirm) onConfirm();
      } else {
        if (onCancel) onCancel();
      }
    }
  },

  showLoading(show = true) {
    const loader = document.getElementById("loader");
    if (loader) {
      if (show) {
        loader.classList.add("show");
      } else {
        setTimeout(() => {
          loader.classList.remove("show");
        }, 300);
      }
    }
  },

  getUrlParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  },

  debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
};

window.addEventListener("DOMContentLoaded", () => {
  CacheManager.clearOld();
});
