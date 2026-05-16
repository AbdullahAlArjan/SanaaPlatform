/**
 * report.js — Generic Report Submission Page
 *
 * Reads URL parameters:
 *   ?targetId=<int>          — the ID being reported (ServiceID, FreelancerID, etc.)
 *   &targetType=<string>     — "Service" | "Freelancer" | "Order" | "User"
 *
 * API:
 *   POST /api/Reports  { targetType, targetID, reason, description }
 *
 * Backend gate (ReportService.SubmitReportAsync):
 *   Service    → caller must have a Completed order for that ServiceID
 *   Freelancer → caller must have a Completed order with that FreelancerID
 *   Returns "NO_PAID_ORDER" (→ 403) if gate fails, "DUPLICATE" (→ 400) if already reported.
 */

import { apiJSON } from './api.js';
import { getCurrentUser } from './auth.js';

// ── Parse URL params ──────────────────────────────────────────────────────────
const params     = new URLSearchParams(location.search);
const targetId   = parseInt(params.get('targetId')   ?? '', 10);
const targetType = (params.get('targetType') ?? '').trim();

document.addEventListener('DOMContentLoaded', () => {

    // ── Auth guard ────────────────────────────────────────────────────────────
    const user = getCurrentUser();
    if (!user) { location.href = `Login.html?next=${encodeURIComponent(location.href)}`; return; }

    // ── Validate required URL params ──────────────────────────────────────────
    if (!targetId || !targetType) {
        document.getElementById('report-form-wrap').style.display = 'none';
        document.getElementById('missing-params').style.display   = 'block';
        return;
    }

    // ── Populate context strip ────────────────────────────────────────────────
    const metaEl = document.getElementById('report-meta');
    if (metaEl) {
        metaEl.innerHTML = `
            <span><i class="fas fa-tag"></i> ${targetType} #${targetId}</span>
            <span><i class="fas fa-user"></i> ${user.fullName || user.email || 'You'}</span>`;
    }

    // ── Character counter ─────────────────────────────────────────────────────
    const reasonEl = document.getElementById('report-reason');
    const countEl  = document.getElementById('reason-count');
    reasonEl?.addEventListener('input', () => {
        if (countEl) countEl.textContent = reasonEl.value.length;
    });

    // ── Form submit ───────────────────────────────────────────────────────────
    document.getElementById('report-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const category    = document.getElementById('report-category')?.value || '';
        const reasonText  = reasonEl?.value.trim() ?? '';
        const description = document.getElementById('report-description')?.value.trim() || '';

        if (!reasonText) {
            _showToast('Please describe the issue before submitting.', 'error');
            reasonEl?.focus();
            return;
        }

        // Prefix the category into the Reason field (capped at 200 chars per DB constraint)
        const reason = (category ? `[${category}] ${reasonText}` : reasonText).slice(0, 200);

        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) {
            submitBtn.disabled  = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting…';
        }

        try {
            await apiJSON('/api/Reports', {
                method: 'POST',
                body: JSON.stringify({
                    targetType,
                    targetID:    targetId,
                    reason,
                    description: description || undefined
                })
            });

            _showToast('Report submitted. Our team will review it shortly.', 'success');
            setTimeout(() => { location.href = 'customer.html'; }, 2500);

        } catch (err) {
            const msg = (err?.message ?? '').toLowerCase();

            // 403 — paid-order gate rejected
            if (msg.includes('403') || msg.includes('purchased') || msg.includes('paid')) {
                _showToast('You must purchase and complete this service before reporting it.', 'error');
            }
            // 400 duplicate
            else if (msg.includes('already') || msg.includes('duplicate')) {
                _showToast('You have already submitted a report against this target.', 'error');
            }
            // Anything else
            else {
                _showToast(`Submission failed — ${err?.message || 'please try again.'}`, 'error');
            }

            if (submitBtn) {
                submitBtn.disabled  = false;
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Report';
            }
        }
    });
});

// ── Toast ─────────────────────────────────────────────────────────────────────
function _showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className   = `toast ${type}`;
    void toast.offsetWidth;           // force reflow so CSS transition fires
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
}
