// script.js
document.addEventListener('DOMContentLoaded', () => {
    // Sample posts data
    const posts = [
        {
            id: 1,
            title: "Logo Design",
            provider: "Abd",
            price: 100,
            rating: 4.8,
            image: "images/logo1.png",
            providerImage: "images/a2.jpeg"
        },
        {
            id: 2,
            title: "WebSite Design",
            provider: "Sarah Mohammed",
            price: 500,
            rating: 4.9,
            image: "images/service2.jpg",
            providerImage: "images/provider2.jpg"
        },
        {
            id: 3,
            title: "Landscape Design",
            provider: "Omar Khaled",
            price: 150,
            rating: 4.5,
            image: "images/service3.jpg",
            providerImage: "images/provider3.jpg"
        },
        {
            id: 4,
            title: "Business Card Design",
            provider: "Lina Mahmoud",
            price: 300,
            rating: 4.7,
            image: "images/service4.jpg",
            providerImage: "images/provider4.jpg"
        }

        //if you need to add others
    ];

    // Function to render posts
    function renderPosts(sortedPosts) {
        const container = document.querySelector('.posts-container');
        container.innerHTML = '';
        
        sortedPosts.forEach(post => {
            const card = document.createElement('div');
            card.className = 'post-card';
            card.innerHTML = `
                <img src="${post.image}" alt="${post.title}" class="post-image">
                <div class="post-details">
                    <h3>${post.title}</h3>
                    <div class="price-rating">
                        <span class="price">$${post.price}</span>
                        <div class="rating">⭐ ${post.rating}</div>
                    </div>
                    <div class="provider-info">
                        <img src="${post.providerImage}" alt="${post.provider}" class="provider-image">
                        <span>${post.provider}</span>
                    </div>
                </div>
            `;
            
            card.addEventListener('click', () => {
                window.location.href = `Service/Service.html`;
            });
            
            container.appendChild(card);
        });
    }

    // Sorting functionality
    const sortSelect = document.getElementById('sortOptions');
    
    function sortPosts() {
        const sortValue = sortSelect.value;
        let sorted = [...posts];

        switch(sortValue) {
            case 'rating_high':
                sorted.sort((a, b) => b.rating - a.rating);
                break;
            case 'rating_low':
                sorted.sort((a, b) => a.rating - b.rating);
                break;
            case 'price_high':
                sorted.sort((a, b) => b.price - a.price);
                break;
            case 'price_low':
                sorted.sort((a, b) => a.price - b.price);
                break;
        }
        
        renderPosts(sorted);
    }

    // Event listeners
    sortSelect.addEventListener('change', sortPosts);
    sortSelect.value = 'rating_high'; // Default sorting
    sortPosts(); // Initial sort

   // Navigation handlers
   document.querySelector('.login-btn').addEventListener('click', () => {
    window.location.href = 'Login/login.html';
});

document.querySelector('.register-btn').addEventListener('click', () => {
    window.location.href = 'Login/register.html';
});
});