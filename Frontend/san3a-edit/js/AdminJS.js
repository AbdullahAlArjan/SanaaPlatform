import { requireAuth } from './auth.js';
import { apiJSON, apiFetch, API_BASE_URL } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {

    // ── 1. Auth guard — must be a logged-in Admin ─────────────────────────────
    const user = requireAuth(['admin']);
    if (!user) return;
    const adminName = user.fullName || 'Admin';

    const profileH4 = document.querySelector('.admin-profile h4');
    if (profileH4) profileH4.textContent = adminName;

    // ── 2. Stats & SignalR ───────────────────────────────────────────────────
    await loadStats();
    connectSignalR();

    // ── 3. Navigation & Lazy Loading ──────────────────────────────────────────
    const _loaded = { verification: false, reports: false, categories: false };

    document.querySelector('.admin-nav').addEventListener('click', e => {
        const btn = e.target.closest('.nav-btn');
        if (!btn) return;
        handleNavigation(btn.dataset.section);
    });

    function handleNavigation(sectionId) {
        document.querySelectorAll('.nav-btn, .admin-section').forEach(el => el.classList.remove('active'));
        document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');
        const sectionEl = document.getElementById(sectionId);
        if (sectionEl) sectionEl.classList.add('active');

        if (sectionId === 'verification' && !_loaded.verification) { loadVerifications(); _loaded.verification = true; }
        if (sectionId === 'reports' && !_loaded.reports) { loadReports(); _loaded.reports = true; }
        if (sectionId === 'categories' && !_loaded.categories) { loadCategories(); _loaded.categories = true; }
        applySearch();
    }

    // ── 4. Verification & Reports Events (Delegation) ─────────────────────────
    
    // Verifications (Approve/Reject)
    document.querySelector('#verification tbody').addEventListener('click', async e => {
        const btn = e.target.closest('button');
        const row = e.target.closest('tr');
        if (!btn || !row) return;

        const id = row.dataset.id;
        const name = row.cells[0].textContent.trim();
        const action = btn.classList.contains('btn-approve') ? 'approve' : 'reject';
        
        if (!confirm(`Are you sure you want to ${action} ${name}?`)) return;

        btn.disabled = true;
        try {
            await apiJSON(`/api/Admin/freelancers/${id}/${action}`, { method: 'PUT' });
            row.remove();
            _decrementBadge('[data-section="verification"] .badge');
            addActivity(`Account ${action}d`, `Freelancer "${name}"`, adminName);
        } catch (err) {
            alert(`Failed: ${err.message}`);
            btn.disabled = false;
        }
    });

    // Reports (Resolve/Close)
    document.querySelector('#reports tbody').addEventListener('click', async e => {
        const btn = e.target.closest('button');
        const row = e.target.closest('tr');
        if (!btn || !row) return;

        const id = row.dataset.id;
        const status = btn.classList.contains('btn-resolve') ? 'Resolved' : 'Closed';

        btn.disabled = true;
        try {
            await apiJSON(`/api/Reports/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status, adminNotes: `By ${adminName}` })
            });
            row.remove();
            addActivity(`Report ${status}`, `ID #${id}`, adminName);
        } catch (err) {
            alert(`Failed: ${err.message}`);
            btn.disabled = false;
        }
    });

    // ── 5. Core Load Functions (The "data" Fix) ───────────────────────────────

    async function loadStats() {
        try {
            const s = await apiJSON('/api/Admin/dashboard-stats');
            _setText('total-customers',    s.totalUsers ?? '--');
            _setText('active-freelancers', s.totalFreelancers ?? '--');
            _setText('active-projects',    s.totalOrders ?? '--');
            _setText('live-visitors',      s.activeUsers ?? '--');
            const badge = document.querySelector('[data-section="verification"] .badge');
            if (badge) badge.textContent = s.pendingFreelancerApprovals ?? 0;
        } catch (err) { console.error('Stats error:', err); }
    }

    async function loadVerifications() {
        const tbody = document.querySelector('#verification tbody');
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1.5rem;">Loading...</td></tr>';
        try {
            const res = await apiJSON('/api/Admin/freelancers/pending?pageNumber=1&pageSize=50');
            const list = res.data || (Array.isArray(res) ? res : []);
            if (!list.length) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1.5rem;">No pending requests.</td></tr>';
                return;
            }
            tbody.innerHTML = list.map(f => `
                <tr data-id="${f.userID}">
                    <td>${f.fullName ?? '—'}</td>
                    <td>${f.profession ?? '—'}</td>
                    <td>${f.email ?? '—'}<br><small>${f.city ?? ''}</small></td>
                    <td><span class="status-badge">Pending</span></td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-approve"><i class="fas fa-check"></i></button>
                            <button class="btn btn-reject"><i class="fas fa-times"></i></button>
                        </div>
                    </td>
                </tr>`).join('');
        } catch (err) { tbody.innerHTML = `<tr><td colspan="5" style="color:red;text-align:center;">${err.message}</td></tr>`; }
    }

    async function loadCategories() {
        const tbody = document.getElementById('categories-tbody');
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:1.5rem">Loading…</td></tr>';
        try {
            const res = await apiJSON('/api/Categories?pageNumber=1&pageSize=100');
            const list = res.data || (Array.isArray(res) ? res : []);
            if (!list.length) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:1.5rem">No categories yet.</td></tr>';
                return;
            }
            tbody.innerHTML = list.map(c => `
                <tr data-id="${c.categoryID ?? c.id}">
                    <td>${c.categoryID ?? c.id}</td>
                    <td>${c.name}</td>
                    <td>${c.description || '—'}</td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-approve" onclick="editCategory(${c.categoryID ?? c.id},'${_js(c.name)}','${_js(c.description||'')}','${_js(c.imageUrl||'')}')">Edit</button>
                            <button class="btn btn-reject" onclick="deleteCategory(${c.categoryID ?? c.id})">Delete</button>
                        </div>
                    </td>
                </tr>`).join('');
        } catch (err) { tbody.innerHTML = `<tr><td colspan="4" style="color:red;text-align:center;">${err.message}</td></tr>`; }
    }

    async function loadReports() {
        const tbody = document.querySelector('#reports tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:1.5rem;">Loading…</td></tr>';
        try {
            // ReportResponse properties (camelCase after JSON serialisation):
            // reportID, reporterID, reporterName, targetType, targetID,
            // reason, description, status, createdAt, adminNotes
            const res  = await apiJSON('/api/Reports?pageNumber=1&pageSize=50');
            const list = Array.isArray(res) ? res : (res?.data ?? []);

            if (!list.length) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:1.5rem;color:#888;">No reports found.</td></tr>';
                return;
            }

            tbody.innerHTML = list.map(r => `
                <tr data-id="${r.reportID}">
                    <td>#${r.reportID ?? '—'}</td>
                    <td>${r.reporterName ?? '—'}</td>
                    <td>${r.targetType ?? '—'} #${r.targetID ?? ''}</td>
                    <td style="max-width:220px;word-break:break-word;">
                        ${r.reason ?? '—'}
                        ${r.description ? `<br><small style="color:#888">${r.description}</small>` : ''}
                    </td>
                    <td>${r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</td>
                    <td>
                        <select class="status-select" data-report-id="${r.reportID}"
                                style="padding:0.3rem 0.5rem;border-radius:6px;border:1px solid #ddd;font-size:0.82rem;">
                            <option value="Pending"   ${r.status === 'Pending'  ? 'selected' : ''}>Pending</option>
                            <option value="Reviewed"  ${r.status === 'Reviewed' ? 'selected' : ''}>Reviewed</option>
                            <option value="Resolved"  ${r.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                            <option value="Dismissed" ${r.status === 'Dismissed'? 'selected' : ''}>Dismissed</option>
                        </select>
                    </td>
                    <td>
                        <button class="btn btn-resolve" title="Mark as Resolved">
                            <i class="fas fa-check"></i>
                        </button>
                    </td>
                </tr>`).join('');

            // Status dropdown — triggers PUT /api/Reports/{id}/status on change
            tbody.querySelectorAll('.status-select').forEach(sel => {
                sel.addEventListener('change', async () => {
                    const id     = sel.dataset.reportId;
                    const status = sel.value;
                    sel.disabled = true;
                    try {
                        await apiJSON(`/api/Reports/${id}/status`, {
                            method: 'PUT',
                            body:   JSON.stringify({ status, adminNotes: `Updated by ${adminName}` })
                        });
                        addActivity('Report Updated', `#${id} → ${status}`, adminName);
                    } catch (err) {
                        alert(`Failed to update report #${id}: ${err.message}`);
                        // Reload to restore correct dropdown state
                        loadReports();
                    } finally {
                        sel.disabled = false;
                    }
                });
            });

        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="7" style="color:red;text-align:center;">${err.message}</td></tr>`;
        }
    }

    // ── 6. Categories CRUD (PascalCase Fix) ───────────────────────────────────

    window.submitCategory = async function () {
        const id   = document.getElementById('cat-edit-id').value.trim();
        const name = document.getElementById('cat-name').value.trim();
        const desc = document.getElementById('cat-description').value.trim();
        const img  = document.getElementById('cat-image-url').value.trim();
        if (!name) { alert('Name is required'); return; }

        // استخدام PascalCase ليتوافق مع الـ C# DTO
        const payload = { 
            Name: name, 
            Description: desc || null, 
            ImageUrl: img || null 
        };

        try {
            if (id) {
                payload.CategoryID = parseInt(id);
                await apiJSON(`/api/Categories/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
            } else {
                await apiJSON('/api/Categories', { method: 'POST', body: JSON.stringify(payload) });
            }
            window.clearCategoryForm();
            loadCategories();
            addActivity(id ? 'Category Updated' : 'Category Added', `"${name}"`, adminName);
        } catch (err) { alert('Failed: ' + err.message); }
    };

    window.editCategory = function (id, name, desc, img) {
        document.getElementById('cat-edit-id').value = id;
        document.getElementById('cat-name').value = name;
        document.getElementById('cat-description').value = desc;
        document.getElementById('cat-image-url').value = img;
        document.querySelector('#categories h2').scrollIntoView({ behavior: 'smooth' });
    };

    window.deleteCategory = async function (id) {
        if (!confirm('Delete this category?')) return;
        try {
            await apiJSON(`/api/Categories/${id}`, { method: 'DELETE' });
            loadCategories();
            addActivity('Category Deleted', `ID #${id}`, adminName);
        } catch (err) { alert('Failed: ' + err.message); }
    };

    window.clearCategoryForm = function () {
        ['cat-edit-id', 'cat-name', 'cat-description', 'cat-image-url'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
    };

    // ── 7. Helpers ────────────────────────────────────────────────────────────

    async function connectSignalR() {
        try {
            const connection = new signalR.HubConnectionBuilder()
                .withUrl(`${API_BASE_URL}/notificationHub`, { accessTokenFactory: () => localStorage.getItem('accessToken') })
                .withAutomaticReconnect().build();
            await connection.start();
            _setLivePulse(true);
        } catch { _setLivePulse(false); }
    }

    function _setLivePulse(isLive) {
        const card = document.getElementById('live-visitors')?.closest('.stat-card');
        if (card) card.classList.toggle('live-pulse', isLive);
    }

    function _setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

    function _decrementBadge(sel) {
        const b = document.querySelector(sel);
        if (b) { const v = parseInt(b.textContent) || 0; b.textContent = Math.max(0, v - 1); }
    }

    function _js(str) { return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }

    function addActivity(action, details, admin) {
        const tbody = document.getElementById('activity-table-body');
        if (!tbody) return;
        const row = document.createElement('tr');
        row.innerHTML = `<td>${new Date().toLocaleTimeString()}</td><td>${action}</td><td>${details}</td><td>${admin}</td>`;
        tbody.insertBefore(row, tbody.firstChild);
    }

    function applySearch() {
        const q = (document.getElementById('admin-search')?.value || '').toLowerCase().trim();
        const section = document.querySelector('.admin-section.active');
        if (!section) return;
        section.querySelectorAll('tbody tr').forEach(row => {
            row.style.display = !q || row.textContent.toLowerCase().includes(q) ? '' : 'none';
        });
    }

    document.getElementById('admin-search').addEventListener('input', applySearch);
});