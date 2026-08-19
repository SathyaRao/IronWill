/**
 * Admin page - Member management logic (async GitHub store)
 */

let editingMemberId = null;
let deletingMemberId = null;

window.addEventListener('dataReady', () => {
    renderMembers();
    document.getElementById('memberJoinDate').value = Utils.today();
    document.getElementById('memberForm').addEventListener('submit', handleSubmit);
    document.getElementById('searchInput').addEventListener('input', renderMembers);
    document.getElementById('filterStatus').addEventListener('change', renderMembers);
});

async function handleSubmit(e) {
    e.preventDefault();

    const memberData = {
        name: document.getElementById('memberName').value.trim(),
        phone: document.getElementById('memberPhone').value.trim(),
        email: document.getElementById('memberEmail').value.trim(),
        plan: document.getElementById('memberPlan').value,
        joinDate: document.getElementById('memberJoinDate').value,
        status: document.getElementById('memberStatus').value,
        address: document.getElementById('memberAddress').value.trim(),
    };

    if (!memberData.name || !memberData.phone || !memberData.plan || !memberData.joinDate) {
        Utils.showToast('Please fill all required fields', 'error');
        return;
    }

    Utils.showLoading();
    if (editingMemberId) {
        await Store.updateMember(editingMemberId, memberData);
        Utils.showToast('Member updated successfully');
        cancelEdit();
    } else {
        await Store.saveMember(memberData);
        Utils.showToast('Member added successfully');
    }
    Utils.hideLoading();

    document.getElementById('memberForm').reset();
    document.getElementById('memberJoinDate').value = Utils.today();
    renderMembers();
}

function renderMembers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filterStatus = document.getElementById('filterStatus').value;

    let members = Store._data ? Store._data.members || [] : [];

    if (searchTerm) {
        members = members.filter(m =>
            m.name.toLowerCase().includes(searchTerm) ||
            m.phone.includes(searchTerm)
        );
    }

    if (filterStatus !== 'all') {
        members = members.filter(m => m.status === filterStatus);
    }

    const tbody = document.getElementById('membersTable');

    if (members.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#888;">No members found</td></tr>';
        return;
    }

    tbody.innerHTML = members.map(member => `
        <tr>
            <td>${member.name}</td>
            <td>${member.phone}</td>
            <td>${member.email || '-'}</td>
            <td style="text-transform: capitalize;">${member.plan}</td>
            <td>${Utils.formatDate(member.joinDate)}</td>
            <td><span class="badge badge-${member.status === 'active' ? 'active' : 'inactive'}">${member.status}</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editMember('${member.id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="showDeleteModal('${member.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

function editMember(id) {
    const member = Store.getMemberById(id);
    if (!member) return;

    editingMemberId = id;
    document.getElementById('formTitle').textContent = 'Edit Member';
    document.getElementById('submitBtn').textContent = 'Update Member';
    document.getElementById('cancelBtn').style.display = 'inline-block';

    document.getElementById('memberName').value = member.name;
    document.getElementById('memberPhone').value = member.phone;
    document.getElementById('memberEmail').value = member.email || '';
    document.getElementById('memberPlan').value = member.plan;
    document.getElementById('memberJoinDate').value = member.joinDate;
    document.getElementById('memberStatus').value = member.status;
    document.getElementById('memberAddress').value = member.address || '';

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEdit() {
    editingMemberId = null;
    document.getElementById('formTitle').textContent = 'Add New Member';
    document.getElementById('submitBtn').textContent = 'Add Member';
    document.getElementById('cancelBtn').style.display = 'none';
    document.getElementById('memberForm').reset();
    document.getElementById('memberJoinDate').value = Utils.today();
}

function showDeleteModal(id) {
    deletingMemberId = id;
    document.getElementById('deleteModal').classList.add('show');
    document.getElementById('confirmDeleteBtn').onclick = () => confirmDelete();
}

function closeDeleteModal() {
    deletingMemberId = null;
    document.getElementById('deleteModal').classList.remove('show');
}

async function confirmDelete() {
    if (deletingMemberId) {
        Utils.showLoading();
        await Store.deleteMember(deletingMemberId);
        Utils.hideLoading();
        Utils.showToast('Member deleted successfully');
        closeDeleteModal();
        renderMembers();
    }
}
