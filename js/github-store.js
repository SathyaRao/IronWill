/**
 * GitHub-based data store.
 * Reads/writes data to a JSON file in the GitHub repo using the GitHub API.
 *
 * SETUP:
 * 1. Create a GitHub Personal Access Token (PAT) with 'repo' scope:
 *    https://github.com/settings/tokens/new
 * 2. Update the config below with your details.
 */

const GitHubStore = {
    // --- CONFIGURATION (update these) ---
    OWNER: 'sathyarao',                    // GitHub username
    REPO: 'gym-management',                // Repository name
    FILE_PATH: 'data/data.json',           // Path to data file in repo
    BRANCH: 'main',                        // Branch name
    TOKEN: '',                             // Set via admin page or hardcode (not recommended)

    // --- Internal state ---
    _data: null,
    _sha: null,
    _loaded: false,

    // --- Initialize: load token from localStorage ---
    init() {
        this.TOKEN = localStorage.getItem('github_token') || '';
    },

    setToken(token) {
        this.TOKEN = token;
        localStorage.setItem('github_token', token);
    },

    getToken() {
        return this.TOKEN;
    },

    isConfigured() {
        return this.TOKEN && this.TOKEN.length > 0;
    },

    // --- Read data from GitHub ---
    async loadData() {
        try {
            const url = `https://api.github.com/repos/${this.OWNER}/${this.REPO}/contents/${this.FILE_PATH}?ref=${this.BRANCH}&_=${Date.now()}`;
            const headers = {};
            if (this.TOKEN) {
                headers['Authorization'] = `token ${this.TOKEN}`;
            }

            const response = await fetch(url, { headers });

            if (!response.ok) {
                console.error('Failed to load data from GitHub:', response.status);
                return this._getDefault();
            }

            const json = await response.json();
            this._sha = json.sha;
            const content = atob(json.content);
            this._data = JSON.parse(content);
            this._loaded = true;
            return this._data;
        } catch (error) {
            console.error('Error loading from GitHub:', error);
            return this._getDefault();
        }
    },

    // --- Write data to GitHub ---
    async saveData(data) {
        if (!this.isConfigured()) {
            console.error('GitHub token not configured');
            return false;
        }

        try {
            // Get latest SHA first to avoid conflicts
            const url = `https://api.github.com/repos/${this.OWNER}/${this.REPO}/contents/${this.FILE_PATH}`;
            const getResponse = await fetch(`${url}?ref=${this.BRANCH}`, {
                headers: { 'Authorization': `token ${this.TOKEN}` }
            });

            if (getResponse.ok) {
                const existing = await getResponse.json();
                this._sha = existing.sha;
            }

            const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));

            const body = {
                message: `Update data - ${new Date().toLocaleString()}`,
                content: content,
                branch: this.BRANCH,
            };

            if (this._sha) {
                body.sha = this._sha;
            }

            const putResponse = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${this.TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!putResponse.ok) {
                const errorData = await putResponse.json();
                console.error('Failed to save to GitHub:', errorData);
                return false;
            }

            const result = await putResponse.json();
            this._sha = result.content.sha;
            this._data = data;
            return true;
        } catch (error) {
            console.error('Error saving to GitHub:', error);
            return false;
        }
    },

    // --- Helper: default empty data ---
    _getDefault() {
        return { members: [], attendance: [], fees: [], workouts: [] };
    },

    // --- CRUD operations (mirror the localStorage Store API) ---

    // Members
    getMembers() {
        return (this._data && this._data.members) || [];
    },

    async saveMember(member) {
        member.id = member.id || Date.now().toString();
        member.createdAt = member.createdAt || new Date().toISOString();
        member.status = member.status || 'active';
        this._data.members.push(member);
        await this.saveData(this._data);
        return member;
    },

    async updateMember(id, updates) {
        const index = this._data.members.findIndex(m => m.id === id);
        if (index !== -1) {
            this._data.members[index] = { ...this._data.members[index], ...updates };
            await this.saveData(this._data);
            return this._data.members[index];
        }
        return null;
    },

    async deleteMember(id) {
        this._data.members = this._data.members.filter(m => m.id !== id);
        this._data.attendance = this._data.attendance.filter(a => a.memberId !== id);
        this._data.fees = this._data.fees.filter(f => f.memberId !== id);
        this._data.workouts = this._data.workouts.filter(w => w.memberId !== id);
        await this.saveData(this._data);
    },

    getMemberById(id) {
        return this.getMembers().find(m => m.id === id) || null;
    },

    // Attendance
    getAttendance() {
        return (this._data && this._data.attendance) || [];
    },

    async markAttendance(memberId, date) {
        const record = {
            id: Date.now().toString(),
            memberId,
            date: date || new Date().toISOString().split('T')[0],
            checkIn: new Date().toLocaleTimeString(),
        };
        this._data.attendance.push(record);
        await this.saveData(this._data);
        return record;
    },

    getAttendanceByMember(memberId) {
        return this.getAttendance().filter(a => a.memberId === memberId);
    },

    async deleteAttendance(id) {
        this._data.attendance = this._data.attendance.filter(a => a.id !== id);
        await this.saveData(this._data);
    },

    // Fees
    getFees() {
        return (this._data && this._data.fees) || [];
    },

    async addFeeRecord(feeRecord) {
        feeRecord.id = feeRecord.id || Date.now().toString();
        feeRecord.createdAt = new Date().toISOString();
        this._data.fees.push(feeRecord);
        await this.saveData(this._data);
        return feeRecord;
    },

    async updateFeeRecord(id, updates) {
        const index = this._data.fees.findIndex(f => f.id === id);
        if (index !== -1) {
            this._data.fees[index] = { ...this._data.fees[index], ...updates };
            await this.saveData(this._data);
            return this._data.fees[index];
        }
        return null;
    },

    getFeesByMember(memberId) {
        return this.getFees().filter(f => f.memberId === memberId);
    },

    async deleteFee(id) {
        this._data.fees = this._data.fees.filter(f => f.id !== id);
        await this.saveData(this._data);
    },

    // Workouts
    getWorkouts() {
        return (this._data && this._data.workouts) || [];
    },

    async addWorkout(workout) {
        workout.id = workout.id || Date.now().toString();
        workout.createdAt = new Date().toISOString();
        this._data.workouts.push(workout);
        await this.saveData(this._data);
        return workout;
    },

    async updateWorkout(id, updates) {
        const index = this._data.workouts.findIndex(w => w.id === id);
        if (index !== -1) {
            this._data.workouts[index] = { ...this._data.workouts[index], ...updates };
            await this.saveData(this._data);
            return this._data.workouts[index];
        }
        return null;
    },

    getWorkoutsByMember(memberId) {
        return this.getWorkouts().filter(w => w.memberId === memberId);
    },

    async deleteWorkout(id) {
        this._data.workouts = this._data.workouts.filter(w => w.id !== id);
        await this.saveData(this._data);
    },

    // Stats
    getStats() {
        const members = this.getMembers();
        const fees = this.getFees();
        const attendance = this.getAttendance();
        const today = new Date().toISOString().split('T')[0];

        return {
            totalMembers: members.length,
            activeMembers: members.filter(m => m.status === 'active').length,
            todayAttendance: attendance.filter(a => a.date === today).length,
            pendingFees: fees.filter(f => f.status === 'pending').length,
            totalRevenue: fees.filter(f => f.status === 'paid').reduce((sum, f) => sum + parseFloat(f.amount || 0), 0),
        };
    },
};

// Initialize on load
GitHubStore.init();
