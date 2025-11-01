// Handle dropdown menu
document.addEventListener("DOMContentLoaded", function () {
  const dropdown = document.querySelector(".dropdown");
  const dropdownToggle = document.getElementById("adminDropdown");
  const dropdownMenu = document.getElementById("adminMenu");

  if (dropdownToggle && dropdownMenu) {
    // Toggle dropdown on button click
    dropdownToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      dropdown.classList.toggle("active");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", function (e) {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove("active");
      }
    });

    // Prevent dropdown menu clicks from closing the dropdown
    dropdownMenu.addEventListener("click", function (e) {
      e.stopPropagation();
    });
  }
});
