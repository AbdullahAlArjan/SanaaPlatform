// Wait for the DOM to load
document.addEventListener('DOMContentLoaded', () => {
    // Get the sort dropdown and posts container
    const sortSelect = document.getElementById('sortOptions');
    const postsContainer = document.getElementById('postsContainer');

    // Function to sort posts
    function sortPosts(sortValue = 'rating_high') {
        const postCards = Array.from(postsContainer.getElementsByClassName('post-card'));

        postCards.sort((a, b) => {
            const aRating = parseFloat(a.getAttribute('data-rating'));
            const bRating = parseFloat(b.getAttribute('data-rating'));
            const aPrice = parseFloat(a.getAttribute('data-price'));
            const bPrice = parseFloat(b.getAttribute('data-price'));

            switch (sortValue) {
                case 'rating_high':
                    return bRating - aRating;
                case 'rating_low':
                    return aRating - bRating;
                case 'price_high':
                    return bPrice - aPrice;
                case 'price_low':
                    return aPrice - bPrice;
                default:
                    return 0;
            }
        });

        // Clear and re-append sorted posts
        postsContainer.innerHTML = '';
        postCards.forEach(card => postsContainer.appendChild(card));
    }

    // Sort posts by highest rating by default
    sortPosts('rating_high');

    // Add event listener to the sort dropdown
    sortSelect.addEventListener('change', () => {
        const sortValue = sortSelect.value;
        sortPosts(sortValue);
    });
});