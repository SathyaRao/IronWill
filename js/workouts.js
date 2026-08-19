/**
 * Workouts page logic (async GitHub store)
 */

let editingWorkoutId = null;

window.addEventListener('dataReady', () => {
    Utils.populateMemberSelect(document.getElementById('workoutMember'));
    populateFilterWorkoutMember();
    document.getElementById('workoutDate').value = Utils.today();
    document.getElementById('workoutForm').addEventListener('submit', handleWorkoutSubmit);
    document.getElementById('filterWorkoutMember').addEventListener('change', renderWorkouts);
    document.getElementById('filterWorkoutType').addEventListener('change', renderWorkouts);
    renderWorkouts();
});

async function handleWorkoutSubmit(e) {
    e.preventDefault();

    const workoutData = {
        memberId: document.getElementById('workoutMember').value,
        date: document.getElementById('workoutDate').value,
        type: document.getElementById('workoutType').value,
        duration: document.getElementById('workoutDuration').value,
        exercises: document.getElementById('workoutExercises').value.trim(),
        sets: document.getElementById('workoutSets').value.trim(),
        notes: document.getElementById('workoutNotes').value.trim(),
    };

    if (!workoutData.memberId || !workoutData.date || !workoutData.type || !workoutData.duration || !workoutData.exercises) {
        Utils.showToast('Please fill all required fields', 'error');
        return;
    }

    Utils.showLoading();
    if (editingWorkoutId) {
        await Store.updateWorkout(editingWorkoutId, workoutData);
        Utils.showToast('Workout updated');
        cancelWorkoutEdit();
    } else {
        await Store.addWorkout(workoutData);
        Utils.showToast('Workout logged');
    }
    Utils.hideLoading();

    document.getElementById('workoutForm').reset();
    document.getElementById('workoutDate').value = Utils.today();
    renderWorkouts();
}

function renderWorkouts() {
    const filterMember = document.getElementById('filterWorkoutMember').value;
    const filterType = document.getElementById('filterWorkoutType').value;
    const filterDate = document.getElementById('filterWorkoutDate').value;

    let workouts = Store._data ? Store._data.workouts || [] : [];
    if (filterMember !== 'all') workouts = workouts.filter(w => w.memberId === filterMember);
    if (filterType !== 'all') workouts = workouts.filter(w => w.type === filterType);
    if (filterDate) workouts = workouts.filter(w => w.date === filterDate);
    workouts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const tbody = document.getElementById('workoutsTable');
    if (workouts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#888;">No workout records found</td></tr>';
        return;
    }

    tbody.innerHTML = workouts.map(w => `
        <tr>
            <td>${Utils.getMemberName(w.memberId)}</td>
            <td>${Utils.formatDate(w.date)}</td>
            <td style="text-transform:capitalize;">${w.type || '-'}</td>
            <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${w.exercises}">${w.exercises}</td>
            <td>${w.duration} min</td>
            <td>${w.sets || '-'}</td>
            <td>${w.notes || '-'}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editWorkout('${w.id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteWorkout('${w.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

function editWorkout(id) {
    const w = (Store._data.workouts || []).find(w => w.id === id);
    if (!w) return;
    editingWorkoutId = id;
    document.getElementById('workoutFormTitle').textContent = 'Edit Workout';
    document.getElementById('workoutSubmitBtn').textContent = 'Update Workout';
    document.getElementById('workoutCancelBtn').style.display = 'inline-block';
    document.getElementById('workoutMember').value = w.memberId;
    document.getElementById('workoutDate').value = w.date;
    document.getElementById('workoutType').value = w.type || '';
    document.getElementById('workoutDuration').value = w.duration;
    document.getElementById('workoutExercises').value = w.exercises;
    document.getElementById('workoutSets').value = w.sets || '';
    document.getElementById('workoutNotes').value = w.notes || '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelWorkoutEdit() {
    editingWorkoutId = null;
    document.getElementById('workoutFormTitle').textContent = 'Log Workout';
    document.getElementById('workoutSubmitBtn').textContent = 'Log Workout';
    document.getElementById('workoutCancelBtn').style.display = 'none';
    document.getElementById('workoutForm').reset();
    document.getElementById('workoutDate').value = Utils.today();
}

async function deleteWorkout(id) {
    Utils.showLoading();
    await Store.deleteWorkout(id);
    Utils.hideLoading();
    Utils.showToast('Workout deleted');
    renderWorkouts();
}

function populateFilterWorkoutMember() {
    const select = document.getElementById('filterWorkoutMember');
    const members = Store._data ? Store._data.members || [] : [];
    select.innerHTML = '<option value="all">All Members</option>';
    members.forEach(m => { select.innerHTML += `<option value="${m.id}">${m.name}</option>`; });
}
