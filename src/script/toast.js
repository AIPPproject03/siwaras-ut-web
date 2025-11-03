/**
 * Toast Notification System
 * Professional animated notifications to replace alert()
 */

class Toast {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    // Create toast container if not exists
    if (!document.querySelector(".toast-container")) {
      this.container = document.createElement("div");
      this.container.className = "toast-container";
      document.body.appendChild(this.container);
    } else {
      this.container = document.querySelector(".toast-container");
    }
  }

  /**
   * Show toast notification
   * @param {string} message - Main message
   * @param {string} type - Type: success, error, warning, info
   * @param {string} title - Optional title
   * @param {number} duration - Duration in ms (default: 3000)
   */
  show(message, type = "info", title = "", duration = 3000) {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    // Get icon based on type
    const icon = this.getIcon(type);

    // Build toast HTML
    toast.innerHTML = `
      <div class="toast-icon">
        ${icon}
      </div>
      <div class="toast-content">
        ${title ? `<p class="toast-title">${title}</p>` : ""}
        <p class="toast-message">${message}</p>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div class="toast-progress"></div>
    `;

    // Add to container
    this.container.appendChild(toast);

    // Trigger animation
    setTimeout(() => {
      toast.classList.add("show");

      // Add special animation for success/error
      if (type === "success") {
        setTimeout(() => toast.classList.add("bounce"), 100);
      } else if (type === "error") {
        setTimeout(() => toast.classList.add("shake"), 100);
      }
    }, 10);

    // Auto remove
    setTimeout(() => {
      this.hide(toast);
    }, duration);
  }

  hide(toast) {
    toast.classList.remove("show");
    toast.classList.add("hide");
    setTimeout(() => {
      toast.remove();
    }, 300);
  }

  getIcon(type) {
    const icons = {
      success: `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      `,
      error: `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      `,
      warning: `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      `,
      info: `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      `,
    };
    return icons[type] || icons.info;
  }

  // Convenience methods
  success(message, title = "Berhasil!") {
    this.show(message, "success", title);
  }

  error(message, title = "Error!") {
    this.show(message, "error", title, 4000);
  }

  warning(message, title = "Peringatan!") {
    this.show(message, "warning", title);
  }

  info(message, title = "") {
    this.show(message, "info", title);
  }

  // Confirmation dialog with callbacks
  confirm(message, onConfirm, onCancel, title = "Konfirmasi") {
    const confirmToast = document.createElement("div");
    confirmToast.className = "toast warning";
    confirmToast.style.maxWidth = "450px";

    confirmToast.innerHTML = `
      <div class="toast-icon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div class="toast-content">
        <p class="toast-title">${title}</p>
        <p class="toast-message">${message}</p>
        <div style="display: flex; gap: 8px; margin-top: 12px;">
          <button class="btn-confirm" style="flex: 1; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">
            Ya, Lanjutkan
          </button>
          <button class="btn-cancel" style="flex: 1; padding: 8px 16px; background: #e5e7eb; color: #374151; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">
            Batal
          </button>
        </div>
      </div>
    `;

    this.container.appendChild(confirmToast);

    setTimeout(() => confirmToast.classList.add("show"), 10);

    // Handle confirm
    confirmToast.querySelector(".btn-confirm").onclick = () => {
      this.hide(confirmToast);
      if (onConfirm) onConfirm();
    };

    // Handle cancel
    confirmToast.querySelector(".btn-cancel").onclick = () => {
      this.hide(confirmToast);
      if (onCancel) onCancel();
    };
  }
}

// Create global toast instance
const toast = new Toast();

// Make it available globally
window.toast = toast;
