/**
 * Dashboard page logic (async GitHub store)
 */

window.addEventListener('dataReady', () => {
    renderDashboard();
});

function renderDashboard() {
    const stats = Store.getStats();
    const fees = Store._data ? Store._data.fees || [] : [];
    const currentMonth = new Date().toISOString().substring(0, 7);

    document.getElementById('totalMembers').textContent = stats.totalMembers;
    document.getElementById('activeMembers').textContent = stats.activeMembers;
    document.getElementById('todayAttendance').textContent = stats.todayAttendance;
    document.getElementById('pendingFees').textContent = stats.pendingFees;
    document.getElementById('totalRevenue').textContent = Utils.formatCurrency(stats.totalRevenue);

    const monthRevenue = fees
        .filter(f => f.status === 'paid' && f.month === currentMonth)
        .reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);
    document.getElementById('monthRevenue').textContent = Utils.formatCurrency(monthRevenue);

    const monthLabel = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    document.getElementById('currentMonthLabel').textContent = monthLabel;

    renderTodayCheckins();
    renderRecentPayments();
    renderPendingFees();
}

function renderTodayCheckins() {
    const today = Utils.today();
    const todayRecords = (Store._data.attendance || []).filter(a => a.date === today);
    const tbody = document.getElementById('todayCheckins');

    if (todayRecords.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; color:#888;">No check-ins yet today</td></tr>';
        return;
    }
    tbody.innerHTML = todayRecords.map(r => `
        <tr><td>${Utils.getMemberName(r.memberId)}</td><td>${r.checkIn}</td></tr>
    `).join('');
}

function renderRecentPayments() {
    const fees = (Store._data.fees || [])
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
        .slice(0, 5);
    const tbody = document.getElementById('recentPayments');

    if (fees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#888;">No payment records</td></tr>';
        return;
    }
    tbody.innerHTML = fees.map(f => `
        <tr>
            <td>${Utils.getMemberName(f.memberId)}</td>
            <td>${Utils.formatCurrency(f.amount)}</td>
            <td><span class="badge badge-${f.status}">${f.status}</span></td>
        </tr>
    `).join('');
}

function renderPendingFees() {
    const pendingFees = (Store._data.fees || [])
        .filter(f => f.status === 'pending' || f.status === 'overdue')
        .sort((a, b) => (a.month || '').localeCompare(b.month || ''));
    const tbody = document.getElementById('pendingFeesList');

    if (pendingFees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#888;">No pending fees - all clear!</td></tr>';
        return;
    }
    tbody.innerHTML = pendingFees.map(f => {
        const monthStr = f.month ? formatMonthDisplay(f.month) : '-';
        return `<tr>
            <td>${Utils.getMemberName(f.memberId)}</td>
            <td>${Utils.formatCurrency(f.amount)}</td>
            <td>${monthStr}</td>
            <td><span class="badge badge-${f.status}">${f.status}</span></td>
        </tr>`;
    }).join('');
}

function formatMonthDisplay(monthStr) {
    if (!monthStr) return '-';
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}
