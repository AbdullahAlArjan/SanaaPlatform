// Sorting functionality
const sortSelect = document.getElementById('sortOptions');
const postsContainer = document.querySelector('.posts-container');
let postCards = Array.from(document.querySelectorAll('.post-card')); // Changed to let for re-sorting after currency conversion

let isUSD = true;
const exchangeRate = 0.709;

function getCurrentPrice(card) {
    const priceElement = card.querySelector('.price');
    const priceText = priceElement.textContent;
    
    if (priceText.includes('$')) {
        return parseFloat(priceText.replace('$', ''));
    } else {
        return parseFloat(priceText.replace(' JOD', ''));
    }
}

function sortPosts() {
    const sortValue = sortSelect.value;

    // Sort the post cards based on the selected option
    postCards.sort((a, b) => {
        const aRating = parseFloat(a.getAttribute('data-rating'));
        const bRating = parseFloat(b.getAttribute('data-rating'));
        const aPrice = getCurrentPrice(a);
        const bPrice = getCurrentPrice(b);

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

// Currency conversion functionality
document.addEventListener('DOMContentLoaded', function() {
    const currencyToggle = document.getElementById('currencyToggle');

    currencyToggle.addEventListener('click', function() {
        const priceElements = document.querySelectorAll('.price');
        
        priceElements.forEach(element => {
            let priceText = element.textContent;
            
            if (isUSD) {
                // Convert USD to JOD
                const usdAmount = parseFloat(priceText.replace('$', ''));
                const jodAmount = (usdAmount * exchangeRate).toFixed(0);
                element.textContent = `${jodAmount} JOD`;
            } else {
                // Convert JOD back to USD
                const jodAmount = parseFloat(priceText.replace(' JOD', ''));
                const usdAmount = (jodAmount / exchangeRate).toFixed(0);
                element.textContent = `$${usdAmount}`;
            }
        });
        
        // Toggle the state and button text
        isUSD = !isUSD;
        currencyToggle.textContent = isUSD ? 'JOD → USD' : 'USD → JOD';
        
        // Re-sort after currency conversion to maintain correct order
        sortPosts();
    });

    // Initial sort
    sortSelect.value = 'rating_high';
    sortPosts();
});