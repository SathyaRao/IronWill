/**
 * Fees page logic (async GitHub store)
 */

let editingFeeId = null;

window.addEventListener('dataReady', () => {
    Utils.populateMemberSelect(document.getElementById('feeMember'));
    populateFilterFeeMember();
    const now = new Date();
    document.getElementById('feeMonth').value = now.toISOString().substring(0, 7);
    document.getElementById('feePaidDate').value = Utils.today();
    document.getElementById('feeForm').addEventListener('submit', handleFeeSubmit);
    document.getElementById('filterFeeMember').addEventListener('change', renderFees);
    document.getElementById('filterFeeStatus').addEventListener('change', renderFees);
    updateFeeStats();
    renderFees();
});

async function handleFeeSubmit(e) {
    e.preventDefault();

    const feeData = {
        memberId: document.getElementById('feeMember').value,
        amount: document.getElementById('feeAmount').value,
        month: document.getElementById('feeMonth').value,
        status: document.getElementById('feeStatus').value,
        paidDate: document.getElementById('feePaidDate').value,
        paymentMode: document.getElementById('feePaymentMode').value,
    };

    if (!feeData.memberId || !feeData.amount || !feeData.month) {
        Utils.showToast('Please fill all required fields', 'error');
        return;
    }

    Utils.showLoading();
    if (editingFeeId) {
        await Store.updateFeeRecord(editingFeeId, feeData);
        Utils.showToast('Fee record updated');
        cancelFeeEdit();
    } else {
        await Store.addFeeRecord(feeData);
        Utils.showToast('Fee record added');
    }
    Utils.hideLoading();

    document.getElementById('feeForm').reset();
    const now = new Date();
    document.getElementById('feeMonth').value = now.toISOString().substring(0, 7);
    document.getElementById('feePaidDate').value = Utils.today();
    updateFeeStats();
    renderFees();
}

function renderFees() {
    const filterMember = document.getElementById('filterFeeMember').value;
    const filterStatus = document.getElementById('filterFeeStatus').value;

    let fees = Store._data ? Store._data.fees || [] : [];
    if (filterMember !== 'all') fees = fees.filter(f => f.memberId === filterMember);
    if (filterStatus !== 'all') fees = fees.filter(f => f.status === filterStatus);
    fees.sort((a, b) => (b.month || '').localeCompare(a.month || ''));

    const tbody = document.getElementById('feesTable');
    if (fees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#888;">No fee records found</td></tr>';
        return;
    }

    tbody.innerHTML = fees.map(fee => `
        <tr>
            <td>${Utils.getMemberName(fee.memberId)}</td>
            <td>${Utils.formatCurrency(fee.amount)}</td>
            <td>${formatMonth(fee.month)}</td>
            <td><span class="badge badge-${fee.status}">${fee.status}</span></td>
            <td>${fee.paidDate ? Utils.formatDate(fee.paidDate) : '-'}</td>
            <td style="text-transform:capitalize;">${fee.paymentMode || '-'}</td>
            <td class="admin-only">
                <button class="btn btn-sm btn-primary" onclick="editFee('${fee.id}')">Edit</button>
                <button class="btn btn-sm btn-success" onclick="markAsPaid('${fee.id}')" ${fee.status === 'paid' ? 'disabled style="opacity:0.5"' : ''}>Paid</button>
                <button class="btn btn-sm btn-danger" onclick="deleteFee('${fee.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

function updateFeeStats() {
    const fees = Store._data ? Store._data.fees || [] : [];
    const currentMonth = new Date().toISOString().substring(0, 7);

    const totalCollected = fees.filter(f => f.status === 'paid').reduce((s, f) => s + parseFloat(f.amount || 0), 0);
    document.getElementById('totalCollected').textContent = Utils.formatCurrency(totalCollected);

    const monthCollected = fees.filter(f => f.status === 'paid' && f.month === currentMonth).reduce((s, f) => s + parseFloat(f.amount || 0), 0);
    document.getElementById('monthCollected').textContent = Utils.formatCurrency(monthCollected);

    document.getElementById('pendingCount').textContent = fees.filter(f => f.status === 'pending').length;
    document.getElementById('overdueCount').textContent = fees.filter(f => f.status === 'overdue').length;
}

function editFee(id) {
    const fee = (Store._data.fees || []).find(f => f.id === id);
    if (!fee) return;
    editingFeeId = id;
    document.getElementById('feeFormTitle').textContent = 'Edit Fee Record';
    document.getElementById('feeSubmitBtn').textContent = 'Update Record';
    document.getElementById('feeCancelBtn').style.display = 'inline-block';
    document.getElementById('feeMember').value = fee.memberId;
    document.getElementById('feeAmount').value = fee.amount;
    document.getElementById('feeMonth').value = fee.month;
    document.getElementById('feeStatus').value = fee.status;
    document.getElementById('feePaidDate').value = fee.paidDate || '';
    document.getElementById('feePaymentMode').value = fee.paymentMode || 'cash';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelFeeEdit() {
    editingFeeId = null;
    document.getElementById('feeFormTitle').textContent = 'Add Fee Record';
    document.getElementById('feeSubmitBtn').textContent = 'Add Record';
    document.getElementById('feeCancelBtn').style.display = 'none';
    document.getElementById('feeForm').reset();
    document.getElementById('feeMonth').value = new Date().toISOString().substring(0, 7);
    document.getElementById('feePaidDate').value = Utils.today();
}

async function markAsPaid(id) {
    Utils.showLoading();
    await Store.updateFeeRecord(id, { status: 'paid', paidDate: Utils.today() });
    Utils.hideLoading();
    Utils.showToast('Marked as paid');
    updateFeeStats();
    renderFees();
}

async function deleteFee(id) {
    Utils.showLoading();
    await Store.deleteFee(id);
    Utils.hideLoading();
    Utils.showToast('Fee record deleted');
    updateFeeStats();
    renderFees();
}

function populateFilterFeeMember() {
    const select = document.getElementById('filterFeeMember');
    const members = Store._data ? Store._data.members || [] : [];
    select.innerHTML = '<option value="all">All Members</option>';
    members.forEach(m => { select.innerHTML += `<option value="${m.id}">${m.name}</option>`; });
}

function formatMonth(monthStr) {
    if (!monthStr) return '-';
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}
