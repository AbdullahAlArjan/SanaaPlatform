// Function to switch between pages
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    document.getElementById(pageId).classList.add('active');
    
    // Update active menu item
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Find the menu item that corresponds to this page and make it active
    const menuItems = document.querySelectorAll('.menu-item');
    for (let i = 0; i < menuItems.length; i++) {
        if (menuItems[i].getAttribute('onclick').includes(pageId)) {
            menuItems[i].classList.add('active');
            break;
        }
    }
}

// Account Verification Functions
function verifyAccount(id, name, profession) {
    const row = document.querySelector(`#verify-table tr[data-id="${id}"]`);
    row.remove();
    
    // Update active freelancers count
    const freelancersCount = document.getElementById('active-freelancers');
    freelancersCount.textContent = parseInt(freelancersCount.textContent) + 1;
    
    alert(`Account for ${name} (${profession}) has been verified successfully!`);
}

function rejectAccount(id, name, profession) {
    const row = document.querySelector(`#verify-table tr[data-id="${id}"]`);
    row.remove();
    alert(`Account for ${name} (${profession}) has been rejected.`);
}

// Report Management Functions
function stopService(id, name) {
    const row = document.querySelector(`#reports-table tr[data-id="${id}"]`);
    const statusCell = row.querySelector('.status');
    
    statusCell.className = 'status closed';
    statusCell.textContent = 'Service Stopped';
    
    alert(`Service for ${name} has been stopped based on report #${id}.`);
}

// Function to animate numbers with random fluctuations
function animateNumbers() {
    const counters = [
        { id: 'total-customers', base: 2647, current: 2647, element: null },
        { id: 'active-freelancers', base: 1313, current: 1313, element: null },
        { id: 'live-visitors', base: 698, current: 698, element: null },
        { id: 'active-projects', base: 944, current: 944, element: null }
    ];
    
    // Initialize counters
    counters.forEach(counter => {
        counter.element = document.getElementById(counter.id);
        counter.element.textContent = counter.current;
    });
    
    // Animate function
    function updateNumbers() {
        counters.forEach(counter => {
            if (counter.id !== 'active-projects') {
                // Random fluctuation between -20 and +20
                const fluctuation = Math.floor(Math.random() * 41) - 20;
                counter.current = counter.base + fluctuation;
                
                // Ensure numbers don't go negative
                if (counter.current < 0) counter.current = 0;
                
                counter.element.textContent = counter.current;
            }
        });
    }
    
    // Run animation every 4 seconds
    setInterval(updateNumbers, 4000);
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Animate numbers on page load
    animateNumbers();
});