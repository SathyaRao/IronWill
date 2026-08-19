/**
 * Utility functions for the gym management app.
 */
const Utils = {
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },

    formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    },

    today() {
        return new Date().toISOString().split('T')[0];
    },

    getMemberName(memberId) {
        const member = Store.getMemberById(memberId);
        return member ? member.name : 'Unknown';
    },

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
        }).format(amount);
    },

    populateMemberSelect(selectElement, placeholder = 'Select Member') {
        if (!Store._data) return;
        const members = (Store._data.members || []).filter(m => m.status === 'active');
        selectElement.innerHTML = `<option value="">${placeholder}</option>`;
        members.forEach(member => {
            selectElement.innerHTML += `<option value="${member.id}">${member.name}</option>`;
        });
    },

    setActiveNav() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('.nav-links a').forEach(link => {
            if (link.getAttribute('href') === currentPage) {
                link.classList.add('active');
            }
        });
    },

    // Show a loading indicator
    showLoading() {
        let loader = document.getElementById('globalLoader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'globalLoader';
            loader.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:3px;background:#fff;z-index:9999;animation:loading 1s infinite;';
            const style = document.createElement('style');
            style.textContent = '@keyframes loading{0%{transform:translateX(-100%)}50%{transform:translateX(0)}100%{transform:translateX(100%)}}';
            document.head.appendChild(style);
            document.body.appendChild(loader);
        }
        loader.style.display = 'block';
    },

    hideLoading() {
        const loader = document.getElementById('globalLoader');
        if (loader) loader.style.display = 'none';
    }
};

// Initialize: load data from GitHub, then set up page
document.addEventListener('DOMContentLoaded', async () => {
    Utils.setActiveNav();
    Utils.showLoading();
    await Store.load();
    Utils.hideLoading();

    // Dispatch custom event so pages know data is ready
    window.dispatchEvent(new Event('dataReady'));
});
