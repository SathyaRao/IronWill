/**
 * Member profile page - read-only view for customers
 */

let currentMemberId = null;

function lookupMember() {
    const phone = document.getElementById('lookupPhone').value.trim();
    const errorEl = document.getElementById('lookupError');

    if (!phone) {
        errorEl.textContent = 'Please enter your phone number.';
        errorEl.style.display = 'block';
        return;
    }

    const members = Store.getMembers();
    const member = members.find(m => m.phone === phone);

    if (!member) {
        errorEl.textContent = 'No member found with this phone number.';
        errorEl.style.display = 'block';
        return;
    }

    errorEl.style.display = 'none';
    currentMemberId = member.id;
    renderProfile(member);
}

function renderProfile(member) {
    document.getElementById('lookupSection').style.display = 'none';
    document.getElementById('profileSection').style.display = 'block';

    // Basic info
    document.getElementById('profileName').textContent = member.name;
    document.getElementById('profilePhone').textContent = member.phone;
    document.getElementById('profilePlan').textContent = capitalize(member.plan);
    document.getElementById('profileJoinDate').textContent = Utils.formatDate(member.joinDate);

    const statusEl = document.getElementById('profileStatus');
    statusEl.innerHTML = `<span class="badge badge-${member.status === 'active' ? 'active' : 'inactive'}" style="font-size:1rem;">${member.status}</span>`;

    // Attendance this month
    const currentMonth = new Date().toISOString().substring(0, 7);
    const allAttendance = Store.getAttendanceByMember(member.id);
    const monthAttendance = allAttendance.filter(a => a.date && a.date.startsWith(currentMonth));
    document.getElementById('profileAttendanceCount').textContent = monthAttendance.length;

    // Attendance history (last 30 days)
    renderAttendanceHistory(member.id);

    // Fee history
    renderFeeHistory(member.id);

    // Workout history
    renderWorkoutHistory(member.id);
}

function renderAttendanceHistory(memberId) {
    const attendance = Store.getAttendanceByMember(memberId);

    // Last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentAttendance = attendance
        .filter(a => new Date(a.date) >= thirtyDaysAgo)
        .sort((a, b) => b.date.localeCompare(a.date));

    const tbody = document.getElementById('profileAttendance');

    if (recentAttendance.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; color:#888;">No attendance records in the last 30 days</td></tr>';
        return;
    }

    tbody.innerHTML = recentAttendance.map(record => `
        <tr>
            <td>${Utils.formatDate(record.date)}</td>
            <td>${record.checkIn}</td>
        </tr>
    `).join('');
}

function renderFeeHistory(memberId) {
    const fees = Store.getFeesByMember(memberId)
        .sort((a, b) => (b.month || '').localeCompare(a.month || ''));

    const tbody = document.getElementById('profileFees');

    if (fees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#888;">No fee records found</td></tr>';
        return;
    }

    tbody.innerHTML = fees.map(fee => `
        <tr>
            <td>${formatMonth(fee.month)}</td>
            <td>${Utils.formatCurrency(fee.amount)}</td>
            <td><span class="badge badge-${fee.status}">${fee.status}</span></td>
            <td>${fee.paidDate ? Utils.formatDate(fee.paidDate) : '-'}</td>
        </tr>
    `).join('');
}

function renderWorkoutHistory(memberId) {
    const workouts = Store.getWorkoutsByMember(memberId)
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const tbody = document.getElementById('profileWorkouts');

    if (workouts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#888;">No workout records found</td></tr>';
        return;
    }

    tbody.innerHTML = workouts.map(workout => `
        <tr>
            <td>${Utils.formatDate(workout.date)}</td>
            <td style="text-transform:capitalize;">${workout.type || '-'}</td>
            <td style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${workout.exercises}">${workout.exercises}</td>
            <td>${workout.duration} min</td>
            <td>${workout.sets || '-'}</td>
            <td>${workout.notes || '-'}</td>
        </tr>
    `).join('');
}

function showLookup() {
    currentMemberId = null;
    document.getElementById('profileSection').style.display = 'none';
    document.getElementById('lookupSection').style.display = 'block';
    document.getElementById('lookupPhone').value = '';
}

function capitalize(str) {
    if (!str) return '-';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatMonth(monthStr) {
    if (!monthStr) return '-';
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

// Allow Enter key to trigger lookup
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('lookupPhone').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            lookupMember();
        }
    });
});
