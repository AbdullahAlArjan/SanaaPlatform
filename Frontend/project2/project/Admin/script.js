document.addEventListener('DOMContentLoaded', () => {
    // Application State
    const appState = {
        reports: [
            { 
                id: 1, 
                freelancer: 'John Designers', 
                status: 'Open', 
                description: 'Missed project deadline by 2 weeks', 
                date: '2023-08-14',
                attachment: 'contract.pdf' 
            },
            { 
                id: 2, 
                freelancer: 'Emma Developer', 
                status: 'In Review', 
                description: 'Code plagiarism detected in submission', 
                date: '2023-08-13',
                attachment: 'code.zip' 
            },
            { 
                id: 3, 
                freelancer: 'Alex Turner', 
                status: 'Open', 
                description: 'Poor communication with client', 
                date: '2023-08-12',
                attachment: 'chat_logs.pdf' 
            },
            { 
                id: 4, 
                freelancer: 'Sarah Johnson', 
                status: 'Resolved', 
                description: 'Payment dispute resolved', 
                date: '2023-08-11',
                attachment: 'invoice.pdf' 
            },
            { 
                id: 5, 
                freelancer: 'Michael Chen', 
                status: 'Closed', 
                description: 'Project completed successfully', 
                date: '2023-08-10',
                attachment: 'project_report.pdf' 
            },
            { 
                id: 6, 
                freelancer: 'Emma Watson', 
                status: 'Open', 
                description: 'Client reported incomplete deliverables', 
                date: '2023-08-09',
                attachment: 'deliverables.zip' 
            },
            { 
                id: 7, 
                freelancer: 'John Designers', 
                status: 'In Review', 
                description: 'Designs not matching client requirements', 
                date: '2023-08-08',
                attachment: 'designs.pdf' 
            },
            { 
                id: 8, 
                freelancer: 'Alex Turner', 
                status: 'Resolved', 
                description: 'Late submission resolved with client approval', 
                date: '2023-08-07',
                attachment: 'submission.zip' 
            },
            { 
                id: 9, 
                freelancer: 'Sarah Johnson', 
                status: 'Closed', 
                description: 'Project marked as completed', 
                date: '2023-08-06',
                attachment: 'final_report.pdf' 
            },
            { 
                id: 10, 
                freelancer: 'Michael Chen', 
                status: 'Open', 
                description: 'Client reported bugs in the application', 
                date: '2023-08-05',
                attachment: 'bug_report.pdf' 
            }
        ],
        // Other state properties...
    
        notifications: [
            { id: 1, read: false, type: 'verification', content: 'New verification request from Sarah Johnson', time: '2 mins ago' },
            { id: 2, read: true, type: 'report', content: 'Report #45 resolved', time: '1 hour ago' },
            { id: 3, read: false, type: 'report', content: 'New report submitted by John Designers', time: '3 hours ago' }
        ],
        verifications: [
            { id: 1, name: 'Sarah Johnson', profession: 'Graphic Designer', contact: 'sarah@design.com', doc: 'ID Document' },
            { id: 2, name: 'Michael Chen', profession: 'Web Developer', contact: 'michael@dev.com', doc: 'Certification' },
            { id: 3, name: 'Emma Watson', profession: 'Content Writer', contact: 'emma@writer.com', doc: 'Portfolio' }
        ],
        
    };

    // Navigation Module
    const navigationService = {
        init() {
            this.setupNavigation();
            this.setupActiveSection();
        },
        setupNavigation() {
            document.querySelector('.admin-nav').addEventListener('click', (e) => {
                const btn = e.target.closest('.nav-btn');
                if (btn) this.handleNavigation(btn.dataset.section);
            });
        },
        handleNavigation(sectionId) {
            document.querySelectorAll('.nav-btn, .admin-section').forEach(el => {
                el.classList.remove('active');
            });
            document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');
            document.getElementById(sectionId).classList.add('active');
        },
        setupActiveSection() {
            document.querySelector('.nav-btn.active').click();
        }
    };

    // Notification Module
    const notificationService = {
        init() {
            this.renderNotifications();
            this.setupEventListeners();
            this.updateNotificationBadge();
        },
        renderNotifications() {
            const container = document.querySelector('.notification-list');
            container.innerHTML = appState.notifications.map(notif => `
                <div class="notification-item ${notif.read ? '' : 'unread'}" data-id="${notif.id}">
                    <i class="fas fa-${notif.type === 'verification' ? 'exclamation-circle' : 'check-circle'}"></i>
                    <div class="notification-content">
                        <p>${notif.content}</p>
                        <small>${notif.time}</small>
                    </div>
                </div>
            `).join('');
        },
        setupEventListeners() {
            // Toggle dropdown
            document.querySelector('.notification-icon').addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelector('.notification-dropdown').classList.toggle('active');
            });
            // Close dropdown
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.notification-icon')) {
                    document.querySelector('.notification-dropdown').classList.remove('active');
                }
            });
            // Mark all as read
            document.querySelector('.mark-all-read').addEventListener('click', () => {
                appState.notifications.forEach(notif => notif.read = true);
                this.renderNotifications();
                this.updateNotificationBadge();
            });
        },
        updateNotificationBadge() {
            const unreadCount = appState.notifications.filter(n => !n.read).length;
            document.querySelector('.notification-badge').textContent = unreadCount || '';
            document.querySelector('.notification-badge').style.display = unreadCount > 0 ? 'flex' : 'none';
        }
    };

    // Verification Module
    const verificationService = {
        init() {
            this.renderVerifications();
            this.setupEventListeners();
            this.updateVerificationBadge();
        },
        renderVerifications() {
            const tbody = document.querySelector('#verification tbody');
            tbody.innerHTML = appState.verifications.map(verification => `
                <tr data-id="${verification.id}">
                    <td>${verification.name}</td>
                    <td>${verification.profession}</td>
                    <td>${verification.contact}</td>
                    <td>
                        <button class="btn btn-view" data-document="${verification.doc}">
                            <i class="fas fa-file-pdf"></i> View Document
                        </button>
                    </td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-approve">
                                <i class="fas fa-check"></i> Approve
                            </button>
                            <button class="btn btn-reject">
                                <i class="fas fa-times"></i> Reject
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        },
        setupEventListeners() {
            const tbody = document.querySelector('#verification tbody');
            
            // Handle approve/reject buttons
            tbody.addEventListener('click', (e) => {
                const btn = e.target.closest('button');
                if (!btn) return;

                const row = e.target.closest('tr');
                const id = parseInt(row.dataset.id);

                if (btn.classList.contains('btn-approve')) {
                    this.handleApproval(id);
                } else if (btn.classList.contains('btn-reject')) {
                    this.handleRejection(id);
                } else if (btn.classList.contains('btn-view')) {
                    this.handleViewDocument(btn.dataset.document);
                }
            });
        },
        handleApproval(id) {
            const verification = appState.verifications.find(v => v.id === id);
            appState.verifications = appState.verifications.filter(v => v.id !== id);
            this.renderVerifications();
            this.updateVerificationBadge();

            // Add activity to Recent Activities
            addActivity(
                new Date().toLocaleString(),
                'Account Approved',
                `Freelancer "${verification.name}" (${verification.profession})`,
                'Admin User'
            );
        },
        handleRejection(id) {
            const verification = appState.verifications.find(v => v.id === id);
            appState.verifications = appState.verifications.filter(v => v.id !== id);
            this.renderVerifications();
            this.updateVerificationBadge();

            // Add activity to Recent Activities
            addActivity(
                new Date().toLocaleString(),
                'Account Rejected',
                `Freelancer "${verification.name}" (${verification.profession})`,
                'Admin User'
            );
        },
        handleViewDocument(document) {
            alert(`Viewing document: ${document}`);
        },
        updateVerificationBadge() {
            const count = appState.verifications.length;
            document.querySelector('[data-section="verification"] .badge').textContent = count;
        }
    };

    // Reports Module
    const reportService = {
        init() {
            this.renderReports();
            this.setupEventListeners();
            this.updateReportBadge();
        },
        renderReports() {
            const tbody = document.querySelector('#reports tbody');
            tbody.innerHTML = appState.reports.map(report => `
                <tr data-id="${report.id}">
                    <td>${report.freelancer}</td>
                    <td>
                        <span class="status-badge status-${report.status.toLowerCase()}">
                            ${report.status.toUpperCase()}
                        </span><br>
                        ${report.description}
                    </td>
                    <td>
                        <button class="btn btn-view" data-attachment="${report.attachment}">
                            <i class="fas fa-file-pdf"></i> View Attachment
                        </button>
                    </td>
                    <td class="report-status">${report.status}</td>
                    <td>${report.date}</td>
                    <td>
                        <div class="btn-group">
                            ${report.status === 'Open' ? `
                                <button class="btn btn-resolve">
                                    <i class="fas fa-check-circle"></i> Resolve
                                </button>
                                <button class="btn btn-close">
                                    <i class="fas fa-times-circle"></i> Close
                                </button>
                            ` : ''}
                            ${report.status === 'Resolved' ? `
                                <button class="btn btn-reopen">
                                    <i class="fas fa-undo"></i> Reopen
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `).join('');
        },
        setupEventListeners() {
            const tbody = document.querySelector('#reports tbody');
            
            tbody.addEventListener('click', (e) => {
                const btn = e.target.closest('button');
                if (!btn) return;

                const row = e.target.closest('tr');
                const id = parseInt(row.dataset.id);
                const report = appState.reports.find(r => r.id === id);

                if (btn.classList.contains('btn-resolve')) {
                    this.handleResolve(report);
                } else if (btn.classList.contains('btn-close')) {
                    this.handleClose(report);
                } else if (btn.classList.contains('btn-reopen')) {
                    this.handleReopen(report);
                } else if (btn.classList.contains('btn-view')) {
                    this.handleViewAttachment(btn.dataset.attachment);
                }
            });
        },
        handleResolve(report) {
            if (confirm(`Mark report #${report.id} as resolved?`)) {
                report.status = 'Resolved';
                report.resolvedDate = new Date().toISOString().split('T')[0];
                this.renderReports();
                this.updateReportBadge();

                // Add activity to Recent Activities
                addActivity(
                    new Date().toLocaleString(),
                    'Report Resolved',
                    `Report for "${report.freelancer}" (${report.description})`,
                    'Admin User'
                );
            }
        },
        handleClose(report) {
            if (confirm(`Permanently close report #${report.id}?`)) {
                const index = appState.reports.findIndex(r => r.id === report.id);
                appState.reports.splice(index, 1);
                this.renderReports();
                this.updateReportBadge();

                // Add activity to Recent Activities
                addActivity(
                    new Date().toLocaleString(),
                    'Report Closed',
                    `Report for "${report.freelancer}" (${report.description})`,
                    'Admin User'
                );
            }
        },
        handleReopen(report) {
            report.status = 'Open';
            delete report.resolvedDate;
            this.renderReports();
            this.updateReportBadge();

            // Add activity to Recent Activities
            addActivity(
                new Date().toLocaleString(),
                'Report Reopened',
                `Report for "${report.freelancer}" (${report.description})`,
                'Admin User'
            );
        },
        updateReportBadge() {
            const activeCount = appState.reports.filter(r => r.status === 'Open').length;
            document.querySelector('[data-section="reports"] .badge').textContent = activeCount;
        },
        handleViewAttachment(attachment) {
            alert(`Viewing attachment: ${attachment}`);
        }
    };

    // Function to add a new activity to the Recent Activities table
    function addActivity(date, action, details, admin) {
        const tableBody = document.getElementById('activity-table-body');

        // Create a new row
        const newRow = document.createElement('tr');

        // Add cells to the row
        const dateCell = document.createElement('td');
        dateCell.textContent = date;
        newRow.appendChild(dateCell);

        const actionCell = document.createElement('td');
        actionCell.textContent = action;
        newRow.appendChild(actionCell);

        const detailsCell = document.createElement('td');
        detailsCell.textContent = details;
        newRow.appendChild(detailsCell);

        const adminCell = document.createElement('td');
        adminCell.textContent = admin;
        newRow.appendChild(adminCell);

        // Add the new row to the top of the table
        tableBody.insertBefore(newRow, tableBody.firstChild);

        // Optional: Limit the number of rows displayed
        if (tableBody.children.length > 10) {
            tableBody.removeChild(tableBody.lastChild);
        }

        console.log('Activity added:', { date, action, details, admin });
    }

    // Initialize All Modules
    navigationService.init();
    notificationService.init();
    verificationService.init();
    reportService.init();
});

const websiteAnalysisService = {
    init() {
        // Initialize metrics
        this.totalCustomers = 2489;
        this.activeFreelancers = 1234;
        this.liveVisitors = 382;
        this.activeProjects = 892;

        // Update metrics initially
        this.updateMetrics();

        // Set intervals for dynamic updates
        setInterval(() => this.addCustomers(), 5000); // Add 2 customers every 5 seconds
        setInterval(() => this.updateFreelancers(), 5000); // Add 2 freelancers and subtract 1 every 5 seconds
        setInterval(() => this.addLiveVisitors(), 5000); // Add 4 live visitors every 5 seconds
        setInterval(() => this.addActiveProjects(), 10000); // Add 1 active project every 10 seconds
    },
    updateMetrics() {
        // Update the DOM with the latest metrics
        document.getElementById('total-customers').textContent = this.totalCustomers;
        document.getElementById('active-freelancers').textContent = this.activeFreelancers;
        document.getElementById('live-visitors').textContent = this.liveVisitors;
        document.getElementById('active-projects').textContent = this.activeProjects;
    },
    addCustomers() {
        this.totalCustomers += 2; // Add 2 customers
        this.updateMetrics();
    },
    updateFreelancers() {
        this.activeFreelancers += 2; // Add 2 freelancers
        this.activeFreelancers -= 1; // Subtract 1 freelancer
        this.updateMetrics();
    },
    addLiveVisitors() {
        this.liveVisitors += 4; // Add 4 live visitors
        this.updateMetrics();
    },
    addActiveProjects() {
        this.activeProjects += 1; // Add 1 active project
        this.updateMetrics();
    }
};

// Initialize the service
websiteAnalysisService.init();