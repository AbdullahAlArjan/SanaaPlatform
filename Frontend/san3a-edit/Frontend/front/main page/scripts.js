// ============ Global Variables ============
let isLoggedIn = localStorage.getItem('isLoggedIn') === 'true' || false;
const authButtons = document.getElementById('authButtons');
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');

// ============ Authentication Functions ============
const updateAuthState = () => {
  if (isLoggedIn) {
    const userData = JSON.parse(localStorage.getItem('user') || {});
    authButtons.innerHTML = `
      <img src="${userData.profileImg || 'default-profile.png'}" 
           alt="Profile" 
           class="profile-icon"
           onclick="window.location.href='profile.html'">
    `;
  } else {
    authButtons.innerHTML = `
      <button id="loginBtn" class="auth-btn">Login</button>
      <button id="registerBtn" class="auth-btn">Register</button>
    `;
    attachAuthListeners();
  }
};

const handleLogin = (email, password) => {
  // Simulated API call
  setTimeout(() => {
    const user = {
      email,
      profileImg: 'profile-icon.png',
      joinDate: new Date().toISOString()
    };
    
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('isLoggedIn', 'true');
    isLoggedIn = true;
    updateAuthState();
    window.location.href = 'index.html';
  }, 1000);
};

// ============ Search Functions ============
const validateSearch = query => {
  const sanitized = query
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  return sanitized.length >= 3;
};

const handleSearch = e => {
  e.preventDefault();
  
  if (!validateSearch(searchInput.value)) {
    alert('Please enter at least 3 characters');
    return;
  }

  const searchQuery = encodeURIComponent(searchInput.value.trim());
  window.location.href = `services.html?search=${searchQuery}`;
};

// ============ Event Listeners ============
const attachAuthListeners = () => {
  document.getElementById('loginBtn')?.addEventListener('click', () => {
    window.location.href = 'Login/Login.html';  // Relative path
  });

  document.getElementById('registerBtn')?.addEventListener('click', () => {
    window.location.href = 'Login/register.html';  // Relative path
  });
};

const handleImageError = img => {
  img.target.src = 'default-profile.png';
  img.target.alt = 'Default Profile';
};

// ============ Initialization ============
const initializeApp = () => {
  // Authentication
  updateAuthState();
  
  // Search Form
  if (searchForm) {
    searchForm.addEventListener('submit', handleSearch);
  }

  // Event Delegation for Dynamic Elements
  document.addEventListener('click', e => {
    if (e.target.classList.contains('category-card')) {
      localStorage.setItem('selectedCategory', e.target.textContent);
    }
  });

  // Image Error Handling
  document.querySelectorAll('img').forEach(img => {
    img.addEventListener('error', handleImageError);
  });
};

// ============ Start Application ============
document.addEventListener('DOMContentLoaded', initializeApp);