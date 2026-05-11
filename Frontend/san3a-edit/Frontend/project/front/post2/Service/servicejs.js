// Simulate login status (replace with your actual authentication logic)
let isLoggedIn = false; // Set to false by default
const user = {
    name: "Omar",
    avatar: "image/m1.png",
};

// DOM Elements
const loginLink = document.getElementById('login-link');
const registerLink = document.getElementById('register-link');
const userProfile = document.getElementById('user-profile');
const userAvatar = document.querySelector('.user-avatar');
const username = document.querySelector('.username');
const submitCommentBtn = document.getElementById('submit-comment');
const commentInput = document.getElementById('comment-input');

// Function to update the UI based on login status
function updateUI() {
    if (isLoggedIn) {
        // Hide login and register links
        loginLink.style.display = 'none';
        registerLink.style.display = 'none';

        // Show user profile
        userProfile.style.display = 'flex';
        userAvatar.src = user.avatar;
        username.textContent = user.name;
    } else {
        // Show login and register links
        loginLink.style.display = 'inline';
        registerLink.style.display = 'inline';

        // Hide user profile
        userProfile.style.display = 'none';
    }
}

// Simulate login (for demonstration purposes)
function login() {
    isLoggedIn = true;
    updateUI();
}

// Simulate logout (for demonstration purposes)
function logout() {
    isLoggedIn = false;
    updateUI();
}

// Update the UI on page load
updateUI();

// Comment Submission Functionality
submitCommentBtn.addEventListener('click', function (event) {
    if (!isLoggedIn) {
        event.preventDefault(); // Prevent the default form submission
        loginModal.style.display = 'flex'; // Show the modal
        return; // Exit the function to prevent adding the comment
    }

    const commentText = commentInput.value.trim();

    if (commentText) {
        const commentsList = document.querySelector('.comments-list');

        // Create new comment element
        const newComment = document.createElement('div');
        newComment.classList.add('comment');

        // Add comment author (logged-in user)
        const commentAuthor = document.createElement('div');
        commentAuthor.classList.add('comment-author');
        commentAuthor.innerHTML = `
            <img src="${user.avatar}" alt="User Avatar">
            <span>${user.name}</span>
        `;

        // Add comment text
        const commentTextElement = document.createElement('p');
        commentTextElement.classList.add('comment-text');
        commentTextElement.textContent = commentText;

        // Append elements to new comment
        newComment.appendChild(commentAuthor);
        newComment.appendChild(commentTextElement);

        // Add new comment to the list
        commentsList.prepend(newComment);

        // Clear input
        commentInput.value = '';
    }
});

// Login/Register Modal Functionality
const loginModal = document.getElementById('login-modal');
const closeModalBtn = document.querySelector('.close-modal');

// Close modal when the close button is clicked
closeModalBtn.addEventListener('click', function () {
    loginModal.style.display = 'none';
});

// Close modal when clicking outside the modal
window.addEventListener('click', function (event) {
    if (event.target === loginModal) {
        loginModal.style.display = 'none';
    }
});



// Rating System Functionality
const stars = document.querySelectorAll('.rating .star');
const ratingDisplay = document.querySelector('.rating-display');

stars.forEach((star, index) => {
    star.addEventListener('click', () => {
        // Update the rating value
        const ratingValue = index + 1;

        // Highlight selected stars
        stars.forEach((s, i) => {
            if (i <= index) {
                s.classList.add('active');
            } else {
                s.classList.remove('active');
            }
        });

        // Update the rating display
        ratingDisplay.textContent = `Rating: ${ratingValue}/5`;
    });
});

// Interactive Buttons
const buttons = document.querySelectorAll('.btn');
buttons.forEach(button => {
    button.addEventListener('mouseenter', () => {
        button.style.transform = 'scale(1.05)';
    });
    button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
    });
});