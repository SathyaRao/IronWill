/**
 * Store - Uses GitHub API as the primary data store.
 * Reads/writes directly to data/data.json in the repo.
 * Falls back to in-memory cache for the current session.
 */
const Store = {
    // GitHub config
    OWNER: 'sathyarao',
    REPO: 'IronWill',
    FILE_PATH: 'data/data.json',
    BRANCH: 'main',

    // Internal
    _data: null,
    _sha: null,
    _loading: false,
    _initialized: false,
    lastError: null, // message from the last failed load, or null

    // --- Token ---
    getToken() {
        return localStorage.getItem('github_token') || '';
    },

    setToken(token) {
        localStorage.setItem('github_token', token);
    },

    isConfigured() {
        return this.getToken().length > 0;
    },

    // --- Load data from GitHub ---
    async load() {
        if (this._loading) return this._data;
        this._loading = true;
        this.lastError = null;

        try {
            const url = `https://api.github.com/repos/${this.OWNER}/${this.REPO}/contents/${this.FILE_PATH}?ref=${this.BRANCH}&_=${Date.now()}`;
            const headers = { 'Accept': 'application/vnd.github.v3+json' };
            const token = this.getToken();
            if (token) headers['Authorization'] = `token ${token}`;

            const response = await fetch(url, { headers, cache: 'no-store' });

            if (!response.ok) {
                console.warn('GitHub load failed, using empty data:', response.status);
                this.lastError = 'GitHub returned ' + response.status + (response.status === 404 ? ' (file or repo not found, or the repo is private and no token is set)' : response.status === 401 ? ' (token is invalid or expired)' : '');
                this._data = this._default();
                return this._data;
            }

            const json = await response.json();
            this._sha = json.sha;
            const content = atob(json.content.replace(/\n/g, ''));
            this._data = JSON.parse(content);
            this._initialized = true;
        } catch (error) {
            console.error('Error loading from GitHub:', error);
            this.lastError = error.message || String(error);
            this._data = this._data || this._default();
        } finally {
            this._loading = false;
        }

        return this._data;
    },

    // --- Save data to GitHub ---
    async save() {
        if (!this._canWrite()) return false;
        if (!this.isConfigured()) {
            console.warn('No GitHub token configured, cannot save.');
            return false;
        }

        try {
            const url = `https://api.github.com/repos/${this.OWNER}/${this.REPO}/contents/${this.FILE_PATH}`;
            const token = this.getToken();

            // Get latest SHA to avoid conflicts
            const getResp = await fetch(`${url}?ref=${this.BRANCH}`, {
                headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' },
                cache: 'no-store',
            });
            if (getResp.ok) {
                const existing = await getResp.json();
                this._sha = existing.sha;
            }

            const content = btoa(unescape(encodeURIComponent(JSON.stringify(this._data, null, 2))));

            const body = {
                message: `Data update - ${new Date().toLocaleString()}`,
                content: content,
                branch: this.BRANCH,
            };
            if (this._sha) body.sha = this._sha;

            const putResp = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json',
                },
                body: JSON.stringify(body),
            });

            if (!putResp.ok) {
                const err = await putResp.json();
                console.error('GitHub save failed:', err);
                return false;
            }

            const result = await putResp.json();
            this._sha = result.content.sha;
            return true;
        } catch (error) {
            console.error('Error saving to GitHub:', error);
            return false;
        }
    },

    // --- Role guard: only the admin may change data ---
    _canWrite() {
        if (window.Auth && !Auth.isAdmin()) {
            if (window.Utils) Utils.showToast('Read-only access: changes are not allowed', 'error');
            return false;
        }
        return true;
    },

    // --- Default empty structure ---
    _default() {
        return { members: [], attendance: [], fees: [], workouts: [] };
    },

    // --- Ensure data is loaded ---
    async _ensure() {
        if (!this._data) await this.load();
        return this._data;
    },

    // =========================================================================
    // MEMBERS
    // =========================================================================
    async getMembers() {
        const data = await this._ensure();
        return data.members || [];
    },

    async saveMember(member) {
        if (!this._canWrite()) return null;
        await this._ensure();
        member.id = member.id || Date.now().toString();
        member.createdAt = member.createdAt || new Date().toISOString();
        member.status = member.status || 'active';
        this._data.members.push(member);
        await this.save();
        return member;
    },

    async updateMember(id, updates) {
        if (!this._canWrite()) return null;
        await this._ensure();
        const index = this._data.members.findIndex(m => m.id === id);
        if (index !== -1) {
            this._data.members[index] = { ...this._data.members[index], ...updates };
            await this.save();
            return this._data.members[index];
        }
        return null;
    },

    async deleteMember(id) {
        if (!this._canWrite()) return null;
        await this._ensure();
        this._data.members = this._data.members.filter(m => m.id !== id);
        this._data.attendance = (this._data.attendance || []).filter(a => a.memberId !== id);
        this._data.fees = (this._data.fees || []).filter(f => f.memberId !== id);
        this._data.workouts = (this._data.workouts || []).filter(w => w.memberId !== id);
        await this.save();
    },

    getMemberById(id) {
        if (!this._data) return null;
        return (this._data.members || []).find(m => m.id === id) || null;
    },

    // =========================================================================
    // ATTENDANCE
    // =========================================================================
    async getAttendance() {
        const data = await this._ensure();
        return data.attendance || [];
    },

    async markAttendance(memberId, date) {
        if (!this._canWrite()) return null;
        await this._ensure();
        const record = {
            id: Date.now().toString(),
            memberId,
            date: date || new Date().toISOString().split('T')[0],
            checkIn: new Date().toLocaleTimeString(),
        };
        this._data.attendance.push(record);
        await this.save();
        return record;
    },

    getAttendanceByMember(memberId) {
        if (!this._data) return [];
        return (this._data.attendance || []).filter(a => a.memberId === memberId);
    },

    getAttendanceByDate(date) {
        if (!this._data) return [];
        return (this._data.attendance || []).filter(a => a.date === date);
    },

    async deleteAttendance(id) {
        if (!this._canWrite()) return null;
        await this._ensure();
        this._data.attendance = (this._data.attendance || []).filter(a => a.id !== id);
        await this.save();
    },

    // =========================================================================
    // FEES
    // =========================================================================
    async getFees() {
        const data = await this._ensure();
        return data.fees || [];
    },

    async addFeeRecord(feeRecord) {
        if (!this._canWrite()) return null;
        await this._ensure();
        feeRecord.id = feeRecord.id || Date.now().toString();
        feeRecord.createdAt = new Date().toISOString();
        this._data.fees.push(feeRecord);
        await this.save();
        return feeRecord;
    },

    async updateFeeRecord(id, updates) {
        if (!this._canWrite()) return null;
        await this._ensure();
        const index = this._data.fees.findIndex(f => f.id === id);
        if (index !== -1) {
            this._data.fees[index] = { ...this._data.fees[index], ...updates };
            await this.save();
            return this._data.fees[index];
        }
        return null;
    },

    getFeesByMember(memberId) {
        if (!this._data) return [];
        return (this._data.fees || []).filter(f => f.memberId === memberId);
    },

    async deleteFee(id) {
        if (!this._canWrite()) return null;
        await this._ensure();
        this._data.fees = (this._data.fees || []).filter(f => f.id !== id);
        await this.save();
    },

    // =========================================================================
    // WORKOUTS
    // =========================================================================
    async getWorkouts() {
        const data = await this._ensure();
        return data.workouts || [];
    },

    async addWorkout(workout) {
        if (!this._canWrite()) return null;
        await this._ensure();
        workout.id = workout.id || Date.now().toString();
        workout.createdAt = new Date().toISOString();
        this._data.workouts.push(workout);
        await this.save();
        return workout;
    },

    async updateWorkout(id, updates) {
        if (!this._canWrite()) return null;
        await this._ensure();
        const index = this._data.workouts.findIndex(w => w.id === id);
        if (index !== -1) {
            this._data.workouts[index] = { ...this._data.workouts[index], ...updates };
            await this.save();
            return this._data.workouts[index];
        }
        return null;
    },

    getWorkoutsByMember(memberId) {
        if (!this._data) return [];
        return (this._data.workouts || []).filter(w => w.memberId === memberId);
    },

    async deleteWorkout(id) {
        if (!this._canWrite()) return null;
        await this._ensure();
        this._data.workouts = (this._data.workouts || []).filter(w => w.id !== id);
        await this.save();
    },

    // =========================================================================
    // STATS (sync - uses cached data)
    // =========================================================================
    getStats() {
        if (!this._data) return { totalMembers: 0, activeMembers: 0, todayAttendance: 0, pendingFees: 0, totalRevenue: 0 };
        const members = this._data.members || [];
        const fees = this._data.fees || [];
        const attendance = this._data.attendance || [];
        const today = new Date().toISOString().split('T')[0];

        return {
            totalMembers: members.length,
            activeMembers: members.filter(m => m.status === 'active').length,
            todayAttendance: attendance.filter(a => a.date === today).length,
            pendingFees: fees.filter(f => f.status === 'pending').length,
            totalRevenue: fees.filter(f => f.status === 'paid').reduce((sum, f) => sum + parseFloat(f.amount || 0), 0),
        };
    },

    // =========================================================================
    // UTILITY
    // =========================================================================
    async clearAll() {
        if (!this._canWrite()) return null;
        this._data = this._default();
        await this.save();
    },
};
