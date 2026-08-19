# Iron Will - Management App

A simple, lightweight gym management web application that can be hosted for free on GitHub Pages. Tracks member attendance, fees, and workouts with an admin panel for the gym owner.

## Features

- **Dashboard** - Overview of members, attendance, revenue, and pending fees
- **Member Management** - Add, edit, delete members with plan and status tracking
- **Attendance Tracker** - Mark daily attendance, prevent duplicates, view history
- **Fees Management** - Record payments, track pending/overdue fees, mark as paid
- **Workout Tracker** - Log workouts with exercises, sets, duration, and notes
- **Responsive Design** - Works on desktop, tablet, and mobile
- **No Backend Required** - Uses browser localStorage for data persistence

## Tech Stack

- HTML5, CSS3, Vanilla JavaScript
- localStorage for data storage
- No frameworks, no build tools, no dependencies

## Quick Start

### Option 1: Open directly
1. Download or clone this repository
2. Open `index.html` in your browser
3. That's it!

### Option 2: Host on GitHub Pages
1. Create a new repository on GitHub
2. Push this code to the repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/gym-management.git
   git push -u origin main
   ```
3. Go to **Settings > Pages** in your GitHub repository
4. Set Source to **Deploy from a branch**
5. Select **main** branch and **/ (root)** folder
6. Click Save
7. Your app will be live at `https://YOUR_USERNAME.github.io/gym-management/`

## Project Structure

```
gym-management/
├── index.html          # Dashboard
├── admin.html          # Member management (admin page)
├── attendance.html     # Attendance tracking
├── fees.html           # Fees management
├── workouts.html       # Workout tracking
├── css/
│   └── style.css       # All styles
├── js/
│   ├── store.js        # localStorage data layer
│   ├── utils.js        # Shared utility functions
│   ├── dashboard.js    # Dashboard logic
│   ├── admin.js        # Member CRUD logic
│   ├── attendance.js   # Attendance logic
│   ├── fees.js         # Fees logic
│   └── workouts.js     # Workout logic
└── README.md
```

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `index.html` | Stats overview, quick actions, recent activity |
| Members | `admin.html` | Add/edit/delete members, search, filter by status |
| Attendance | `attendance.html` | Mark attendance, view history, stats |
| Fees | `fees.html` | Record payments, track pending, mark as paid |
| Workouts | `workouts.html` | Log workouts, filter by member/type/date |

## Sample Data

The app loads sample data on first visit so you can explore the features immediately. To start fresh, open the browser console and run:

```javascript
Store.clearAll();
location.reload();
```

## Notes

- Data is stored in the browser's localStorage — clearing browser data will reset everything
- Each browser/device maintains its own separate data
- For a multi-user setup with a real database, you'd need to add a backend (Node.js, Firebase, etc.)

## License

MIT