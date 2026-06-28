
// ─── QUOTES ────────────────────────────────────
const QUOTES = [
    '"Your future self will thank you."',
    '"Small steps every day."',
    '"Focus is the new IQ."',
    '"Progress, not perfection."',
    '"One session at a time."',
    '"Deep work = real work."',
];

// ─── STATE ─────────────────────────────────────
const FOCUS_DURATION = 25 * 60;
const BREAK_DURATION =  5 * 60;

let state = {
    mode:        'focus',   // 'focus' | 'break'
    timeLeft:    FOCUS_DURATION,
    totalTime:   FOCUS_DURATION,
    isPaused:    true,
    timerId:     null,
    sessions:    0,
    totalFocus:  0,         // seconds
    streak:      0,
    tasksDone:   0,
    lastActiveDay: null,
    tasks:       [],        // [{ id, name, done }]
};

// ─── DOM REFS ───────────────────────────────────
const timerDisplay  = document.getElementById('timerDisplay');
const timerLabel    = document.getElementById('timerLabel');
const playBtn       = document.getElementById('playBtn');
const playIcon      = document.getElementById('playIcon');
const resetBtn      = document.getElementById('resetBtn');
const breakBtn      = document.getElementById('breakBtn');
const modeButtons   = document.querySelectorAll('.mode-btn');
const newTaskBtn    = document.getElementById('newTaskBtn');
const taskInputRow  = document.getElementById('taskInputRow');
const taskInput     = document.getElementById('taskInput');
const confirmTask   = document.getElementById('confirmTaskBtn');
const cancelTask    = document.getElementById('cancelTaskBtn');
const taskList      = document.getElementById('taskList');
const emptyState    = document.getElementById('emptyState');
const progressFill  = document.getElementById('progressFill');
const progressText  = document.getElementById('progressText');
const progressPct   = document.getElementById('progressPercent');
const themeToggle   = document.querySelector('.theme-toggle');
const quoteEl       = document.getElementById('quoteText');
const sessionLog    = document.getElementById('sessionLog');
const toastEl       = document.getElementById('toast');
const timerRingSvg  = document.getElementById('timerRing');

// Stat elements
const statStreak   = document.getElementById('stat-streak');
const statFocus    = document.getElementById('stat-focus');
const statSessions = document.getElementById('stat-sessions');
const statTasks    = document.getElementById('stat-tasks');

// ─── SVG GRADIENT (injected once) ───────────────
(function injectGradient() {
    const svg = document.querySelector('.timer-ring');
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stop-color="#a855f7"/>
            <stop offset="100%" stop-color="#ec4899"/>
        </linearGradient>`;
    svg.prepend(defs);
})();

// ─── PERSISTENCE ────────────────────────────────
function save() {
    const toSave = {
        sessions:     state.sessions,
        totalFocus:   state.totalFocus,
        streak:       state.streak,
        tasksDone:    state.tasksDone,
        lastActiveDay:state.lastActiveDay,
        tasks:        state.tasks,
    };
    localStorage.setItem('studyCompanion', JSON.stringify(toSave));
}

function load() {
    try {
        const raw = localStorage.getItem('studyCompanion');
        if (!raw) return;
        const saved = JSON.parse(raw);
        Object.assign(state, saved);
    } catch(e) { /* ignore */ }
}

// ─── STREAK LOGIC ────────────────────────────────
function updateStreak() {
    const today = new Date().toDateString();
    if (state.lastActiveDay === today) return; // already counted today

    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (state.lastActiveDay === yesterday) {
        state.streak += 1;
    } else if (state.lastActiveDay !== today) {
        state.streak = 1;
    }
    state.lastActiveDay = today;
}

// ─── TIMER RING ──────────────────────────────────
const CIRCUMFERENCE = 2 * Math.PI * 88; // r=88

function updateRing() {
    const fraction = state.timeLeft / state.totalTime;
    const offset = CIRCUMFERENCE * (1 - fraction);
    timerRingSvg.style.strokeDasharray  = CIRCUMFERENCE;
    timerRingSvg.style.strokeDashoffset = offset;
}

// ─── TIMER DISPLAY ───────────────────────────────
function updateDisplay() {
    const m = Math.floor(state.timeLeft / 60);
    const s = state.timeLeft % 60;
    timerDisplay.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    updateRing();

    // Update page title
    document.title = state.isPaused
        ? 'AI Study Companion'
        : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} — Study`;
}

// ─── TIMER CORE ──────────────────────────────────
function startTimer() {
    if (!state.isPaused) return;
    state.isPaused = false;
    playIcon.className = 'fas fa-pause';
    playBtn.setAttribute('aria-label', 'Pause timer');

    state.timerId = setInterval(() => {
        if (state.timeLeft > 0) {
            state.timeLeft--;
            if (state.mode === 'focus') state.totalFocus++;
            updateDisplay();
            updateStats();
        } else {
            clearInterval(state.timerId);
            onSessionEnd();
        }
    }, 1000);
}

function pauseTimer() {
    if (state.isPaused) return;
    state.isPaused = true;
    playIcon.className = 'fas fa-play';
    playBtn.setAttribute('aria-label', 'Start timer');
    clearInterval(state.timerId);
    save();
}

function resetTimer() {
    pauseTimer();
    state.timeLeft = state.totalTime;
    updateDisplay();
}

function onSessionEnd() {
    state.isPaused = true;
    playIcon.className = 'fas fa-play';
    playBtn.setAttribute('aria-label', 'Start timer');

    if (state.mode === 'focus') {
        state.sessions++;
        updateStreak();
        addSessionDot();
        showToast('🎉 Focus session complete! Take a break.');
        rotateQuote();
    } else {
        showToast('☕ Break over! Back to focus.');
    }

    updateStats();
    save();
    updateDisplay();

    // Subtle pulse on timer
    timerDisplay.animate(
        [{ transform:'scale(1)' }, { transform:'scale(1.08)' }, { transform:'scale(1)' }],
        { duration: 500, easing: 'ease-out' }
    );
}

// ─── PLAY BUTTON ─────────────────────────────────
playBtn.addEventListener('click', () => {
    state.isPaused ? startTimer() : pauseTimer();
});

// ─── RESET BUTTON ────────────────────────────────
resetBtn.addEventListener('click', () => {
    resetTimer();
    showToast('Timer reset.');
});

// ─── BREAK SHORTCUT ──────────────────────────────
breakBtn.addEventListener('click', () => {
    // Switch to break mode
    switchMode('break');
    showToast('☕ Break time!');
});

// ─── MODE BUTTONS ────────────────────────────────
modeButtons.forEach(btn => {
    btn.addEventListener('click', () => switchMode(btn.dataset.mode));
});

function switchMode(mode) {
    state.mode = mode;
    clearInterval(state.timerId);
    state.isPaused = true;
    playIcon.className = 'fas fa-play';
    playBtn.setAttribute('aria-label', 'Start timer');

    modeButtons.forEach(b => {
        const isActive = b.dataset.mode === mode;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-pressed', isActive);
    });

    if (mode === 'focus') {
        state.totalTime = FOCUS_DURATION;
        timerLabel.textContent = 'FOCUS TIME';
    } else {
        state.totalTime = BREAK_DURATION;
        timerLabel.textContent = 'BREAK TIME';
    }

    state.timeLeft = state.totalTime;
    updateDisplay();
}

// ─── TASK MANAGEMENT ────────────────────────────
newTaskBtn.addEventListener('click', () => {
    taskInputRow.style.display = 'flex';
    taskInput.focus();
    newTaskBtn.disabled = true;
});

function hideInput() {
    taskInputRow.style.display = 'none';
    taskInput.value = '';
    newTaskBtn.disabled = false;
}

confirmTask.addEventListener('click', addTask);
cancelTask.addEventListener('click', hideInput);

taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTask();
    if (e.key === 'Escape') hideInput();
});

// --- AUTH NAVBAR STATE (sync with currentUser) ---
const authSection = document.getElementById('authSection');
const profileSection = document.getElementById('profileSection');
const profileIcon = document.getElementById('profileIcon');
const dropdownMenu = document.getElementById('dropdownMenu');
const userNameEl = document.getElementById('userName');
const userEmailEl = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');

if (typeof user !== 'undefined' && user) {
    authSection.style.display = 'none';
    profileSection.style.display = 'flex';
    userNameEl.textContent = user.name;
    userEmailEl.textContent = user.email;
    profileIcon.textContent = user.name.charAt(0).toUpperCase();

    profileIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });

    dropdownMenu.addEventListener('click', (e) => e.stopPropagation());

    document.addEventListener('click', () => dropdownMenu.classList.remove('show'));

    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    });
}


function sanitize(str) {
    return str.replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
}

function addTask() {
    const raw = taskInput.value.trim();
    if (!raw) { taskInput.focus(); return; }

    const task = { id: Date.now(), name: sanitize(raw), done: false };
    state.tasks.push(task);
    hideInput();
    renderTasks();
    updateProgress();
    save();
}

function deleteTask(id) {
    state.tasks = state.tasks.filter(t => t.id !== id);
    renderTasks();
    updateProgress();
    save();
}

function toggleTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    task.done = !task.done;

    // Update "tasks done" stat
    state.tasksDone = state.tasks.filter(t => t.done).length;
    renderTasks();
    updateProgress();
    updateStats();
    save();
}

function renderTasks() {
    // Remove existing task items (keep empty state element)
    const existing = taskList.querySelectorAll('.task-item');
    existing.forEach(el => el.remove());

    emptyState.style.display = state.tasks.length === 0 ? 'block' : 'none';

    state.tasks.forEach(task => {
        const div = document.createElement('div');
        div.className = `task-item${task.done ? ' completed' : ''}`;
        div.dataset.id = task.id;
        div.innerHTML = `
            <div class="task-left">
                <div class="checkbox-circle${task.done ? ' checked' : ''}"
                     tabindex="0"
                     role="checkbox"
                     aria-checked="${task.done}"
                     aria-label="Mark ${task.name} as ${task.done ? 'incomplete' : 'complete'}">
                </div>
                <span class="task-name">${task.name}</span>
            </div>
            <i class="fas fa-trash-alt delete-icon"
               tabindex="0"
               role="button"
               aria-label="Delete task ${task.name}"></i>
        `;
        taskList.appendChild(div);
    });
}

// Event delegation on task list
taskList.addEventListener('click', (e) => {
    const item = e.target.closest('.task-item');
    if (!item) return;
    const id = Number(item.dataset.id);

    if (e.target.closest('.delete-icon')) {
        deleteTask(id);
    } else if (e.target.closest('.checkbox-circle')) {
        toggleTask(id);
    }
});

// Keyboard support for tasks
taskList.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const item = e.target.closest('.task-item');
    if (!item) return;
    e.preventDefault();
    const id = Number(item.dataset.id);
    if (e.target.classList.contains('delete-icon')) deleteTask(id);
    if (e.target.classList.contains('checkbox-circle')) toggleTask(id);
});

// ─── PROGRESS BAR ────────────────────────────────
function updateProgress() {
    const total = state.tasks.length;
    const done  = state.tasks.filter(t => t.done).length;
    const pct   = total === 0 ? 0 : Math.round((done / total) * 100);

    progressFill.style.width = `${pct}%`;
    progressText.textContent = `${done}/${total} done`;
    progressPct.textContent  = `${pct}%`;
}

// ─── STATS ───────────────────────────────────────
function updateStats() {
    statStreak.textContent   = `${state.streak}d`;
    statSessions.textContent = state.sessions;
    statTasks.textContent    = state.tasksDone;

    const mins = Math.floor(state.totalFocus / 60);
    statFocus.textContent = mins >= 60
        ? `${Math.floor(mins/60)}h${mins%60 > 0 ? (mins%60)+'m' : ''}`
        : `${mins}m`;
}

// ─── SESSION DOTS ────────────────────────────────
function addSessionDot() {
    const dot = document.createElement('div');
    dot.className = 'session-dot';
    dot.title = `Session ${state.sessions}`;
    sessionLog.appendChild(dot);
    // Keep max 10 dots visible
    const dots = sessionLog.querySelectorAll('.session-dot');
    if (dots.length > 10) dots[0].remove();
}

// ─── QUOTES ──────────────────────────────────────
function rotateQuote() {
    const next = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    quoteEl.style.opacity = '0';
    setTimeout(() => {
        quoteEl.textContent = next;
        quoteEl.style.opacity = '1';
    }, 400);
}

// ─── TOAST ───────────────────────────────────────
let toastTimer = null;
function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3000);
}

// ─── THEME TOGGLE ────────────────────────────────
function applyTheme(isLight) {
    document.body.classList.toggle('light', isLight);
    themeToggle.querySelector('i').className = isLight ? 'fas fa-moon' : 'fas fa-sun';
    themeToggle.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

themeToggle.addEventListener('click', () => {
    applyTheme(!document.body.classList.contains('light'));
});

// ─── INIT ────────────────────────────────────────
(function init() {
    // Load persisted state
    load();

    // Apply saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') applyTheme(true);

    // Random opening quote
    quoteEl.textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];

    // Render saved tasks
    renderTasks();
    updateProgress();
    updateStats();
    updateDisplay();

    // Rebuild session dots from saved sessions count
    for (let i = 0; i < Math.min(state.sessions, 10); i++) {
        const dot = document.createElement('div');
        dot.className = 'session-dot';
        sessionLog.appendChild(dot);
    }
})();
