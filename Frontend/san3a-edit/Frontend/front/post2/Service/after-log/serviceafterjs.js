// Comment Submission Functionality
document.getElementById('submit-comment').addEventListener('click', function () {
    const commentInput = document.getElementById('comment-input');
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
            <img src="https://via.placeholder.com/40" alt="User Avatar">
            <span>John Doe</span>
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

// Image Slider Functionality
let currentImageIndex = 0;
const images = document.querySelectorAll('.service-images img');

function showNextImage() {
    // Hide all images
    images.forEach(img => img.style.display = 'none');
    
    // Show the current image
    images[currentImageIndex].style.display = 'block';
    
    // Move to the next image
    currentImageIndex = (currentImageIndex + 1) % images.length;
}

// Start the image slider
setInterval(showNextImage, 5000); // Change image every 5 seconds

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