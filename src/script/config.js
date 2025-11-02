const API_CONFIG = {
  WISUDA_URL:
    "https://script.google.com/macros/s/AKfycbxA2EDaXW-3ayhXT3aw82I22h8i0Con1Pa3a4vDMeeTgCMG2pSepM8lf-rsLaNLe-HgFw/exec",
  SOSPROM_URL:
    "https://script.google.com/macros/s/AKfycbwTaltCc9PmpVeALrF361F42jPyXwYL9EmAoGMVL7CFxlzY9Ex8wrwT_RxrmmacXNt4NQ/exec",

  // Get base URL based on type
  getBaseUrl(type = "wisuda") {
    return type === "sosprom" ? this.SOSPROM_URL : this.WISUDA_URL;
  },

  ENDPOINTS: {
    // READ Operations (GET)
    readAudit: "readAudit",
    readAdmin: "readAdmin",
    readMasterBarang: "readMasterBarang",
    readBarangMasuk: "readBarangMasuk",
    readBarangKeluar: "readBarangKeluar",

    // WRITE Operations (POST)
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
    auditLog: "audit_Log",
  },
};

// API Helper Functions
const API = {
  // GET Request with database type support
  async get(type, params = {}, dbType = "wisuda") {
    try {
      const queryParams = new URLSearchParams({
        type,
        ...params,
      });
      const baseUrl = API_CONFIG.getBaseUrl(dbType);
      const url = `${baseUrl}?${queryParams}`;

      console.log(`GET Request [${dbType}]:`, url);

      const response = await fetch(url, {
        method: "GET",
        redirect: "follow",
      });

      console.log("GET Response status:", response.status);

      const data = await response.json();
      console.log("GET Response data:", data);

      if (!data.ok) throw new Error(data.error || "Request failed");
      return data.result;
    } catch (error) {
      console.error("API GET Error:", error);
      throw error;
    }
  },

  // POST Request with database type support
  async post(type, data, dbType = "wisuda") {
    try {
      const payload = JSON.stringify({ type, data });
      const baseUrl = API_CONFIG.getBaseUrl(dbType);

      console.log(`POST Request [${dbType}]:`, { type, data });

      const response = await fetch(baseUrl, {
        method: "POST",
        redirect: "follow",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: payload,
      });

      console.log("POST Response status:", response.status);

      const result = await response.json();
      console.log("POST Response data:", result);

      if (!result.ok) throw new Error(result.error || "Request failed");
      return result.result;
    } catch (error) {
      console.error("API POST Error:", error);
      throw error;
    }
  },

  // Login dengan verifikasi ke backend
  async login(username, password, dbType = "wisuda") {
    try {
      console.log(`Attempting login [${dbType}] for:`, username);
      const result = await this.post("login", { username, password }, dbType);
      console.log("Login result:", result);
      return result;
    } catch (error) {
      console.error("Login API Error:", error);
      throw error;
    }
  },
};

// Auth Helper
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
    console.log("Session cleared");
  },

  isLoggedIn() {
    return !!sessionStorage.getItem("siwaras_user");
  },

  async logAudit(action, details) {
    const session = this.getSession();
    try {
      await API.post(
        "audit_Log",
        {
          id_admin: session.adminId || "",
          username: session.username || "",
          action,
          details,
        },
        session.dbType
      );
      console.log("Audit logged:", { action, details, dbType: session.dbType });
    } catch (error) {
      console.error("Audit log error:", error);
      // Don't throw error, audit log failure shouldn't stop the app
    }
  },
};

// Utility Functions
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

  showNotification(message, type = "info") {
    // Simple alert for now - can be replaced with toast library
    alert(message);
  },

  showLoading(show = true) {
    const loader = document.getElementById("loader");
    if (loader) {
      loader.style.display = show ? "flex" : "none";
    }
  },

  // Get URL parameter
  getUrlParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  },
};
