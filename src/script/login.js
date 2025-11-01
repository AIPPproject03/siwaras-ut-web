// Determine login type dan mode
const loginType = window.LOGIN_TYPE || Utils.getUrlParam("type") || "wisuda";
const loginMode = Utils.getUrlParam("mode") || "admin"; // admin atau guest

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
const togglePassword = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");
const eyeIcon = document.getElementById("eyeIcon");

console.log("Toggle button:", togglePassword);
console.log("Password input:", passwordInput);
console.log("Eye icon:", eyeIcon);

if (togglePassword && passwordInput && eyeIcon) {
  togglePassword.addEventListener("click", function (e) {
    e.preventDefault();
    console.log("Toggle password clicked");

    const currentType = passwordInput.getAttribute("type");
    const newType = currentType === "password" ? "text" : "password";
    passwordInput.setAttribute("type", newType);

    console.log("Password type changed from", currentType, "to", newType);

    // Toggle icon opacity
    eyeIcon.style.opacity = newType === "password" ? "0.6" : "1";
  });
} else {
  console.error("Password toggle elements not found!");
}

// Handle login form submission
const loginForm = document.getElementById("loginForm");
console.log("Login form:", loginForm);

if (loginForm) {
  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    console.log("Form submitted");

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    console.log("Username:", username);
    console.log("Password length:", password.length);

    if (!username || !password) {
      alert("Username dan password harus diisi!");
      return;
    }

    Utils.showLoading(true);

    try {
      console.log("Calling API login...");

      // Verify login against API
      const result = await API.login(username, password);

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

        // Set session with admin data
        Auth.setSession(username, role, result.admin);

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

        // Show success message
        alert(`Login berhasil! Selamat datang, ${username}`);

        // Redirect based on login mode and type
        setTimeout(() => {
          if (loginMode === "admin") {
            // Admin mode - redirect to dashboard
            console.log("Redirecting to dashboard...");
            window.location.href = `dashboard.html?type=${loginType}`;
          } else {
            // Guest mode - redirect to guest page (read-only)
            console.log("Redirecting to guest page...");
            window.location.href = `guest.html?type=${loginType}`;
          }
        }, 500);
      } else {
        // Login failed
        console.error("Login failed:", result);
        throw new Error(result.error || "Username atau password salah!");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Login gagal: " + (error.message || "Terjadi kesalahan"));

      // Log failed login attempt
      try {
        await API.post("audit_Log", {
          username: username,
          action: `LOGIN_${loginType.toUpperCase()}_${loginMode.toUpperCase()}_FAILED`,
          details: `Login gagal: ${error.message} (${username})`,
        });
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
  if (session.role.startsWith("admin-")) {
    const type = session.role.split("-")[1];
    console.log("Redirecting logged in admin...");
    window.location.href = `dashboard.html?type=${type}`;
  } else if (session.role.startsWith("guest-")) {
    const type = session.role.split("-")[1];
    console.log("Redirecting logged in guest...");
    window.location.href = `guest.html?type=${type}`;
  }
}
