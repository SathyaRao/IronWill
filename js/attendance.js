/**
 * Attendance page logic (async GitHub store)
 */

window.addEventListener('dataReady', () => {
    Utils.populateMemberSelect(document.getElementById('attendanceMember'));
    populateFilterMember();
    document.getElementById('attendanceDate').value = Utils.today();
    document.getElementById('filterDate').value = Utils.today();
    document.getElementById('attendanceForm').addEventListener('submit', handleMarkAttendance);
    updateStats();
    renderAttendance();
});

async function handleMarkAttendance(e) {
    e.preventDefault();

    const memberId = document.getElementById('attendanceMember').value;
    const date = document.getElementById('attendanceDate').value;

    if (!memberId || !date) {
        Utils.showToast('Please select a member and date', 'error');
        return;
    }

    const existing = (Store._data.attendance || []).find(
        a => a.memberId === memberId && a.date === date
    );
    if (existing) {
        Utils.showToast('Attendance already marked for this member today', 'error');
        return;
    }

    Utils.showLoading();
    await Store.markAttendance(memberId, date);
    Utils.hideLoading();
    Utils.showToast('Attendance marked successfully');

    document.getElementById('attendanceMember').value = '';
    updateStats();
    renderAttendance();
}

function renderAttendance() {
    const filterDate = document.getElementById('filterDate').value;
    const filterMember = document.getElementById('filterMember').value;

    let records = Store._data ? Store._data.attendance || [] : [];

    if (filterDate) records = records.filter(a => a.date === filterDate);
    if (filterMember !== 'all') records = records.filter(a => a.memberId === filterMember);

    records.sort((a, b) => b.date.localeCompare(a.date));

    const tbody = document.getElementById('attendanceTable');
    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#888;">No attendance records found</td></tr>';
        return;
    }

    tbody.innerHTML = records.map(record => `
        <tr>
            <td>${Utils.getMemberName(record.memberId)}</td>
            <td>${Utils.formatDate(record.date)}</td>
            <td>${record.checkIn}</td>
            <td><button class="btn btn-sm btn-danger" onclick="deleteAttendance('${record.id}')">Remove</button></td>
        </tr>
    `).join('');
}

function updateStats() {
    const today = Utils.today();
    const attendance = Store._data ? Store._data.attendance || [] : [];

    document.getElementById('todayCount').textContent = attendance.filter(a => a.date === today).length;

    const currentMonth = today.substring(0, 7);
    const monthRecords = attendance.filter(a => a.date.startsWith(currentMonth));
    document.getElementById('monthCount').textContent = monthRecords.length;

    if (monthRecords.length > 0) {
        const memberCounts = {};
        monthRecords.forEach(r => { memberCounts[r.memberId] = (memberCounts[r.memberId] || 0) + 1; });
        const topId = Object.entries(memberCounts).sort((a, b) => b[1] - a[1])[0][0];
        const topMember = Store.getMemberById(topId);
        document.getElementById('topMember').textContent = topMember
            ? `${topMember.name} (${memberCounts[topId]} days)` : '-';
    }
}

async function deleteAttendance(id) {
    Utils.showLoading();
    await Store.deleteAttendance(id);
    Utils.hideLoading();
    Utils.showToast('Attendance record removed');
    updateStats();
    renderAttendance();
}

function populateFilterMember() {
    const select = document.getElementById('filterMember');
    const members = Store._data ? Store._data.members || [] : [];
    select.innerHTML = '<option value="all">All Members</option>';
    members.forEach(m => { select.innerHTML += `<option value="${m.id}">${m.name}</option>`; });
}
