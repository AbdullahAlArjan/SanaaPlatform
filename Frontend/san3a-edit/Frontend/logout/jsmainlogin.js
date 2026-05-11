// Toggle dropdown on avatar click
const userAvatar = document.getElementById("userAvatar");
const dropdownContent = document.getElementById("dropdownContent");

userAvatar.addEventListener("click", (e) => {
    e.stopPropagation(); // Prevent closing when clicking avatar
    dropdownContent.classList.toggle("show");
});

// Close dropdown when clicking outside
document.addEventListener("click", () => {
    dropdownContent.classList.remove("show");
});

// Logout function (optional)
const logoutBtn = document.getElementById("logoutBtn");
logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
   window.location.href = "index.html"
});