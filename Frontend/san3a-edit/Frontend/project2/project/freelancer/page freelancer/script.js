document.addEventListener('DOMContentLoaded', () => {
    // WhatsApp Integration
    function openWhatsApp(phoneNumber = '+962797037825', defaultMessage = 'Hello! I found your profile on Sanaa and would like to discuss...') {
        const encodedMessage = encodeURIComponent(defaultMessage);
        window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank');
    }

    // Attach WhatsApp button click event
    const whatsappButton = document.querySelector('.whatsapp-button .btn');
    if (whatsappButton) {
        whatsappButton.addEventListener('click', openWhatsApp);
    }

    // Report System
    function initializeReportSystem() {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.style.display = 'none';
        document.body.appendChild(modalOverlay);

        const reportModal = `
            <div class="modal-content fullscreen-modal">
                <button class="modal-close" aria-label="Close modal">&times;</button>
                <h3 class="modal-title">Report Profile</h3>
                <form id="reportForm" class="report-form">
                    <div class="form-group">
                        <label for="reportReason" class="form-label">Reason for Reporting</label>
                        <select id="reportReason" class="form-select" required>
                            <option value="" disabled selected>Select a reason</option>
                            <option value="spam">Spam or Fake Profile</option>
                            <option value="behavior">Inappropriate Behavior</option>
                            <option value="content">Inappropriate Content</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div class="form-group custom-reason" id="customReason" style="display: none;">
                        <label for="reportDetails" class="form-label">Additional Details</label>
                        <textarea
                            id="reportDetails"
                            class="form-textarea"
                            rows="8"
                            maxlength="500"
                            placeholder="Please provide more details (optional)"
                        ></textarea>
                        <small class="char-count">0/500 characters</small>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary">Cancel</button>
                        <button type="submit" class="btn btn-primary">Submit Report</button>
                    </div>
                </form>
            </div>
        `;

        modalOverlay.innerHTML = reportModal;

        // Close Modal Function
        const closeModal = () => {
            modalOverlay.style.display = 'none';
            document.body.style.overflow = 'auto';
        };

        // Open Modal on Report Button Click
        const reportButton = document.querySelector('.report-btn');
        if (reportButton) {
            reportButton.addEventListener('click', () => {
                modalOverlay.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            });
        }

        // Close Modal Handlers
        modalOverlay.querySelector('.modal-close').addEventListener('click', closeModal);
        modalOverlay.querySelector('.btn-secondary').addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeModal();
            }
        });

        // Form Handling
        const reportReason = modalOverlay.querySelector('#reportReason');
        const customReason = modalOverlay.querySelector('#customReason');
        const reportDetails = modalOverlay.querySelector('#reportDetails');
        const charCount = modalOverlay.querySelector('.char-count');

        // Show/Hide Custom Reason Field
        if (reportReason) {
            reportReason.addEventListener('change', (e) => {
                customReason.style.display = e.target.value === 'other' ? 'block' : 'none';
            });
        }

        // Update Character Count
        if (reportDetails) {
            reportDetails.addEventListener('input', (e) => {
                charCount.textContent = `${e.target.value.length}/500 characters`;
            });
        }

        // Submit Report Form
        const reportForm = modalOverlay.querySelector('#reportForm');
        if (reportForm) {
            reportForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const reason = reportReason.value;
                const details = reportDetails.value;

                if (!reason) {
                    showToast('Please select a reason', 2000);
                    return;
                }

                // Simulate API call
                setTimeout(() => {
                    closeModal();
                    showToast('Report submitted successfully. Thank you!');
                    console.log('Report Details:', { reason, details });
                }, 1000);
            });
        }
    }

    // Toast System
    function showToast(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            <span class="toast-message">${message}</span>
            <button class="toast-close" aria-label="Close toast">&times;</button>
        `;

        document.body.appendChild(toast);
        toast.style.display = 'block';

        // Close Toast on Button Click
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });

        // Auto-remove Toast After Duration
        setTimeout(() => toast.remove(), duration);
    }

    // Initialize Systems
    initializeReportSystem();

    // Keyboard Handling (Close Modal on Escape Key)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modalOverlay = document.querySelector('.modal-overlay');
            if (modalOverlay && modalOverlay.style.display === 'flex') {
                modalOverlay.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        }
    });

      // Toggle Notifications Dropdown
      function toggleNotifications() {
        console.log("Notification icon clicked!"); // Debugging

        // Remove existing dropdown if it exists
        const existingDropdown = document.querySelector('.notifications-dropdown');
        if (existingDropdown) {
            existingDropdown.remove();
            return;
        }

        // Create the dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'notifications-dropdown';
        dropdown.innerHTML = `
            <div class="notifications-list">
                <div class="notification-item">
                    <i class="fas fa-envelope"></i>
                    <span>You have a new message</span>
                </div>
                <div class="notification-item">
                    <i class="fas fa-check-circle"></i>
                    <span>Your service request was approved</span>
                </div>
                <div class="notification-item">
                    <i class="fas fa-bell"></i>
                    <span>New service available: Graphic Design</span>
                </div>
            </div>
        `;

        // Append the dropdown to the body
        document.body.appendChild(dropdown);

        // Close dropdown when clicking outside
        const handleClickOutside = (e) => {
            if (!dropdown.contains(e.target) && e.target !== document.querySelector('.notification-icon')) {
                dropdown.remove();
                document.removeEventListener('click', handleClickOutside);
            }
        };

        document.addEventListener('click', handleClickOutside);
    }

    // Attach Notification Icon Click Event
    const notificationIcon = document.querySelector('.notification-icon');
    if (notificationIcon) {
        notificationIcon.addEventListener('click', toggleNotifications);
    }
});


// Get DOM elements
const notificationIcon = document.getElementById('notificationIcon');
const notificationDropdown = document.getElementById('notificationDropdown');
const notificationCount = document.getElementById('notificationCount');
const notificationList = document.getElementById('notificationList');
const markAllRead = document.getElementById('markAllRead');

// Toggle dropdown visibility
notificationIcon.addEventListener('click', () => {
    notificationDropdown.style.display = notificationDropdown.style.display === 'block' ? 'none' : 'block';
});

// Mark all notifications as read
markAllRead.addEventListener('click', () => {
    const unreadNotifications = notificationList.querySelectorAll('.unread');
    unreadNotifications.forEach(notification => {
        notification.classList.remove('unread');
    });
    updateNotificationCount(0); // Reset count to 0
});

// Update notification count
function updateNotificationCount(count) {
    notificationCount.textContent = count;
    if (count === 0) {
        notificationCount.style.display = 'none'; // Hide count if no notifications
    } else {
        notificationCount.style.display = 'inline-block';
    }
}

// Example: Add a new notification dynamically
function addNotification(message) {
    const newNotification = document.createElement('div');
    newNotification.classList.add('notification-item', 'unread');
    newNotification.innerHTML = `<p>${message}</p>`;
    notificationList.prepend(newNotification); // Add to the top of the list
    updateNotificationCount(parseInt(notificationCount.textContent) + 1); // Increment count
}

// Example usage:
// addNotification("New message from Client B");