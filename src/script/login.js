// Determine login type dan mode
const loginType = window.LOGIN_TYPE || Utils.getUrlParam("type") || "wisuda";
const loginMode = Utils.getUrlParam("mode") || "admin";

console.log("Login Type:", loginType);
console.log("Login Mode:", loginMode);

// Update page title based on login type
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM Content Loaded");
  const titleElement = document.querySelector(".login-title");
  if (titleElement) {
    const prefix = loginMode === "admin" ? "Admin" : "";
    if (loginType === "sosprom") {
      titleElement.textContent = `${prefix} Sistem Inventori Sosprom`.trim();
      document.title = `Login - ${prefix} Sistem Inventori Sosprom`.trim();
    } else {
      titleElement.textContent = `${prefix} Sistem Inventori Wisuda`.trim();
      document.title = `Login - ${prefix} Sistem Inventori Wisuda`.trim();
    }
    console.log("Title element found:", titleElement.textContent);
  }
});

// Toggle password visibility
const togglePasswordBtn = document.getElementById("togglePassword");
if (togglePasswordBtn) {
  togglePasswordBtn.addEventListener("click", function () {
    const passwordInput = document.getElementById("password");
    const eyeIcon = document.getElementById("eyeIcon");

    if (passwordInput.type === "password") {
      passwordInput.type = "text";
      eyeIcon.innerHTML = `
        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 001 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
      `;
    } else {
      passwordInput.type = "password";
      eyeIcon.innerHTML = `
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
      `;
    }
  });
}

// Handle form submission
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    console.log("Form submitted");

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    console.log("Username:", username);
    console.log("Password length:", password.length);

    if (!username || !password) {
      toast.warning("Username dan password harus diisi!", "Peringatan!");
      return;
    }

    Utils.showLoading(true);

    try {
      console.log("Calling API login...");

      // Verify login against API with correct database type
      const result = await API.login(username, password, loginType);

      console.log("Login result:", result);

      // Check if authentication successful
      if (result.auth === true && result.admin) {
        console.log("Login successful!");

        // Determine role based on login type and mode
        const role =
          loginMode === "admin"
            ? loginType === "sosprom"
              ? "admin-sosprom"
              : "admin-wisuda"
            : loginType === "sosprom"
            ? "guest-sosprom"
            : "guest-wisuda";

        console.log("Role:", role);

        // Set session with admin data and database type
        Auth.setSession(username, role, result.admin, loginType);

        // Log successful login
        try {
          await Auth.logAudit(
            `LOGIN_${loginType.toUpperCase()}_${loginMode.toUpperCase()}`,
            `User ${username} login sebagai ${
              loginMode === "admin" ? "Admin" : "Guest"
            } ${loginType === "sosprom" ? "Sosprom" : "Wisuda"}`
          );
        } catch (auditError) {
          console.warn("Audit log error (non-critical):", auditError);
        }

        // Show success message with toast
        toast.success(`Selamat datang, ${username}!`, "Login Berhasil!");

        // Redirect based on login mode and type
        setTimeout(() => {
          if (loginMode === "admin") {
            // Admin mode - redirect to admin dashboard
            console.log("Redirecting to admin dashboard...");
            if (loginType === "sosprom") {
              window.location.href = "sosprom/adminSosprom.html";
            } else {
              window.location.href = "wisuda/adminWisuda.html";
            }
          } else {
            // Guest mode - redirect to guest page (read-only)
            console.log("Redirecting to guest page...");
            if (loginType === "sosprom") {
              window.location.href = "guestSosprom.html";
            } else {
              window.location.href = "guestWisuda.html";
            }
          }
        }, 1500); // Delay to show toast
      } else {
        // Login failed
        console.error("Login failed:", result);
        throw new Error(result.error || "Username atau password salah!");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error(
        error.message || "Terjadi kesalahan saat login",
        "Login Gagal!"
      );

      // Log failed login attempt
      try {
        await API.post(
          "audit_Log",
          {
            username: username,
            action: `LOGIN_${loginType.toUpperCase()}_${loginMode.toUpperCase()}_FAILED`,
            details: `Login gagal: ${error.message} (${username})`,
          },
          loginType
        );
      } catch (auditError) {
        console.error("Audit log error:", auditError);
      }
    } finally {
      Utils.showLoading(false);
    }
  });
} else {
  console.error("Login form not found!");
}

// Check if already logged in
if (Auth.isLoggedIn()) {
  console.log("User already logged in");
  const session = Auth.getSession();
  console.log("Session:", session);

  // Redirect based on role
  if (session.role === "admin-sosprom") {
    console.log("Redirecting logged in admin sosprom...");
    window.location.href = "sosprom/adminSosprom.html";
  } else if (session.role === "admin-wisuda") {
    console.log("Redirecting logged in admin wisuda...");
    window.location.href = "wisuda/adminWisuda.html";
  } else if (session.role === "guest-sosprom") {
    console.log("Redirecting logged in guest sosprom...");
    window.location.href = "guestSosprom.html";
  } else if (session.role === "guest-wisuda") {
    console.log("Redirecting logged in guest wisuda...");
    window.location.href = "guestWisuda.html";
  }
}
