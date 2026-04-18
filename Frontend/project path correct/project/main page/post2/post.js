  // Sorting functionality
  const sortSelect = document.getElementById('sortOptions');
  const postsContainer = document.querySelector('.posts-container');
  const postCards = Array.from(document.querySelectorAll('.post-card'));

  function sortPosts() {
      const sortValue = sortSelect.value;

      // Sort the post cards based on the selected option
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

      // Clear the container and re-append sorted cards
      postsContainer.innerHTML = '';
      postCards.forEach(card => postsContainer.appendChild(card));
  }

  // Event listener for sorting
  sortSelect.addEventListener('change', sortPosts);

  // Initial sort (optional)
  sortSelect.value = 'rating_high';
  sortPosts();