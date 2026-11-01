/**
 * Onboarding Buddy System — script.js
 * Modular Vanilla JavaScript (ES6+)
 * Features: Task CRUD, Progress Tracking, 1-on-1 Scheduling, Dynamic Filters
 */

'use strict';

/* ============================================================
   STATE
   ============================================================ */
const STATE = {
  tasks: [],
  sessions: [],
  activeStatusFilter: 'all',
  activeCategoryFilter: 'all',
  editingTaskId: null,
  editingSessionId: null,
};

/* ============================================================
   SEED DATA — realistic onboarding tasks
   ============================================================ */
const SEED_TASKS = [
  {
    id: uid(),
    title: 'Complete HR paperwork & benefits enrollment',
    description: 'Submit signed employment contract, tax forms, and choose health insurance plan.',
    category: 'Administrative',
    week: 'Week 1',
    status: 'completed',
    dueDate: offsetDate(-5),
    createdAt: Date.now() - 86400000 * 6,
  },
  {
    id: uid(),
    title: 'Set up laptop, VPN, and company email',
    description: 'Request IT equipment, install required software, and verify VPN connectivity.',
    category: 'Technical',
    week: 'Week 1',
    status: 'completed',
    dueDate: offsetDate(-4),
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: uid(),
    title: 'Meet the team — attend team standup',
    description: 'Join the daily standup on Monday morning and introduce yourself.',
    category: 'Culture & Network',
    week: 'Week 1',
    status: 'completed',
    dueDate: offsetDate(-3),
    createdAt: Date.now() - 86400000 * 4,
  },
  {
    id: uid(),
    title: 'Read Engineering Handbook & coding standards',
    description: 'Review the internal wiki pages on architecture decisions, branching strategies, and PR reviews.',
    category: 'Technical',
    week: 'Week 1',
    status: 'in-progress',
    dueDate: offsetDate(1),
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: uid(),
    title: 'Schedule coffee chats with 5 colleagues',
    description: 'Use Calendly to schedule informal 20-min virtual coffee chats with team members.',
    category: 'Culture & Network',
    week: 'Week 2',
    status: 'in-progress',
    dueDate: offsetDate(3),
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: uid(),
    title: 'Get access to production monitoring tools',
    description: 'Request Datadog, Sentry, and PagerDuty access from the DevOps team.',
    category: 'Technical',
    week: 'Week 2',
    status: 'pending',
    dueDate: offsetDate(4),
    createdAt: Date.now() - 86400000,
  },
  {
    id: uid(),
    title: 'Complete Security Awareness Training',
    description: 'Finish the mandatory InfoSec e-learning module on the Learning Portal.',
    category: 'Administrative',
    week: 'Week 2',
    status: 'pending',
    dueDate: offsetDate(5),
    createdAt: Date.now() - 86400000,
  },
  {
    id: uid(),
    title: 'Submit first pull request (starter task)',
    description: "Pick up a 'good first issue' from the backlog, implement the fix, and submit a PR.",
    category: 'Technical',
    week: 'Week 3',
    status: 'pending',
    dueDate: offsetDate(10),
    createdAt: Date.now(),
  },
  {
    id: uid(),
    title: 'Join an ERG (Employee Resource Group)',
    description: 'Explore available ERGs and attend at least one meeting this month.',
    category: 'Culture & Network',
    week: 'Week 4',
    status: 'pending',
    dueDate: offsetDate(14),
    createdAt: Date.now(),
  },
];

const SEED_SESSIONS = [
  {
    id: uid(),
    topic: 'Week 1 Kick-off Check-in',
    date: offsetDate(1),
    time: '10:00',
    medium: 'Google Meet',
    notes: "Review first week progress, answer any questions Alex has about the team's workflow.",
    createdAt: Date.now() - 86400000,
  },
  {
    id: uid(),
    topic: 'Technical Deep-dive: Codebase Walkthrough',
    date: offsetDate(4),
    time: '14:30',
    medium: 'Zoom',
    notes: 'Walk through the main repositories, CI/CD pipeline, and deployment process.',
    createdAt: Date.now(),
  },
];

/* ============================================================
   UTILITIES
   ============================================================ */
function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function offsetDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDisplayDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDisplayTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${hh}:${m.toString().padStart(2, '0')} ${suffix}`;
}

function isOverdue(isoDate, status) {
  if (!isoDate || status === 'completed') return false;
  return new Date(isoDate + 'T23:59:59') < new Date();
}

function statusLabel(status) {
  return { pending: 'Pending', 'in-progress': 'In Progress', completed: 'Completed' }[status] || status;
}

function statusBadgeClass(status) {
  return { pending: 'badge-pending', 'in-progress': 'badge-in-progress', completed: 'badge-completed' }[status] || '';
}

/* ============================================================
   STORAGE — localStorage persistence
   ============================================================ */
const STORAGE_KEYS = { tasks: 'obs_tasks', sessions: 'obs_sessions' };

function loadFromStorage() {
  try {
    const t = localStorage.getItem(STORAGE_KEYS.tasks);
    const s = localStorage.getItem(STORAGE_KEYS.sessions);
    STATE.tasks    = t ? JSON.parse(t) : [...SEED_TASKS];
    STATE.sessions = s ? JSON.parse(s) : [...SEED_SESSIONS];
  } catch {
    STATE.tasks    = [...SEED_TASKS];
    STATE.sessions = [...SEED_SESSIONS];
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEYS.tasks,    JSON.stringify(STATE.tasks));
  localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(STATE.sessions));
}

/* ============================================================
   TASK MODULE
   ============================================================ */
const TaskModule = (() => {

  function getFiltered() {
    return STATE.tasks.filter(task => {
      const statusMatch = STATE.activeStatusFilter === 'all' || task.status === STATE.activeStatusFilter;
      const catMatch    = STATE.activeCategoryFilter === 'all' || task.category === STATE.activeCategoryFilter;
      return statusMatch && catMatch;
    });
  }

  function renderAll() {
    const listEl   = document.getElementById('taskList');
    const emptyEl  = document.getElementById('taskEmpty');
    const filtered = getFiltered();

    listEl.innerHTML = '';

    if (filtered.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }
    emptyEl.classList.add('hidden');

    // Sort: pending first, then in-progress, then completed; within group by dueDate asc
    const order = { pending: 0, 'in-progress': 1, completed: 2 };
    const sorted = [...filtered].sort((a, b) => {
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      return (a.dueDate || '9999') < (b.dueDate || '9999') ? -1 : 1;
    });

    sorted.forEach((task, i) => {
      const li = buildTaskElement(task);
      li.style.animationDelay = `${i * 30}ms`;
      listEl.appendChild(li);
    });
  }

  function buildTaskElement(task) {
    const li = document.createElement('li');
    li.className = `task-item status-${task.status} animate-item`;
    li.dataset.id = task.id;
    li.setAttribute('role', 'listitem');

    const overdue = isOverdue(task.dueDate, task.status);

    li.innerHTML = `
      <input
        type="checkbox"
        class="task-checkbox"
        aria-label="Mark ${task.title} as completed"
        ${task.status === 'completed' ? 'checked' : ''}
        data-task-id="${task.id}"
      />
      <div class="flex-1 min-w-0">
        <div class="flex flex-wrap items-center gap-2 mb-0.5">
          <span class="task-title-text font-medium text-sm text-slate-800 leading-snug">${escapeHtml(task.title)}</span>
          <span class="badge ${statusBadgeClass(task.status)}">${statusLabel(task.status)}</span>
          ${overdue ? '<span class="badge badge-pending">Overdue</span>' : ''}
        </div>
        ${task.description ? `<p class="text-xs text-slate-500 mt-0.5 line-clamp-1">${escapeHtml(task.description)}</p>` : ''}
        <div class="flex flex-wrap items-center gap-2 mt-1.5">
          <span class="category-pill">${escapeHtml(task.category)}</span>
          <span class="category-pill">${escapeHtml(task.week)}</span>
          ${task.dueDate ? `<span class="text-xs ${overdue && task.status !== 'completed' ? 'text-red-500 font-medium' : 'text-slate-400'}">Due ${formatDisplayDate(task.dueDate)}</span>` : ''}
        </div>
      </div>
      <div class="flex items-center gap-1 flex-shrink-0 ml-1">
        <select class="status-select text-xs border border-slate-200 rounded-md px-1.5 py-1 bg-slate-50 text-slate-600 cursor-pointer focus:outline-none focus:border-emerald-400" data-task-id="${task.id}" aria-label="Change status">
          <option value="pending"     ${task.status === 'pending'     ? 'selected' : ''}>Pending</option>
          <option value="in-progress" ${task.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
          <option value="completed"   ${task.status === 'completed'   ? 'selected' : ''}>Completed</option>
        </select>
        <button class="btn-icon edit-task-btn" data-task-id="${task.id}" title="Edit task" aria-label="Edit task">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z"/>
          </svg>
        </button>
        <button class="btn-icon delete-task-btn" data-task-id="${task.id}" title="Delete task" aria-label="Delete task">
          <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
      </div>
    `;
    return li;
  }

  function addTask(taskData) {
    const task = {
      id: uid(),
      ...taskData,
      createdAt: Date.now(),
    };
    STATE.tasks.unshift(task);
    saveToStorage();
    renderAll();
    DashboardModule.update();
    showToast('Task added successfully.', 'success');
  }

  function updateTask(id, updates) {
    const idx = STATE.tasks.findIndex(t => t.id === id);
    if (idx === -1) return;
    STATE.tasks[idx] = { ...STATE.tasks[idx], ...updates };
    saveToStorage();
    renderAll();
    DashboardModule.update();
    showToast('Task updated.', 'success');
  }

  function deleteTask(id) {
    STATE.tasks = STATE.tasks.filter(t => t.id !== id);
    saveToStorage();
    renderAll();
    DashboardModule.update();
    showToast('Task deleted.', 'info');
  }

  function changeStatus(id, newStatus) {
    const idx = STATE.tasks.findIndex(t => t.id === id);
    if (idx === -1) return;
    STATE.tasks[idx].status = newStatus;
    saveToStorage();
    renderAll();
    DashboardModule.update();
    showToast(`Status changed to ${statusLabel(newStatus)}.`, 'success');
  }

  return { renderAll, addTask, updateTask, deleteTask, changeStatus };
})();

/* ============================================================
   SESSION MODULE
   ============================================================ */
const SessionModule = (() => {

  function renderAll() {
    const listEl    = document.getElementById('sessionList');
    const emptyEl   = document.getElementById('sessionEmpty');
    const countEl   = document.getElementById('sessionCount');

    // Keep only future or today sessions
    const upcoming = [...STATE.sessions]
      .filter(s => s.date >= new Date().toISOString().slice(0, 10))
      .sort((a, b) => (a.date + a.time) < (b.date + b.time) ? -1 : 1);

    // Remove all non-empty items
    Array.from(listEl.querySelectorAll('.session-item')).forEach(el => el.remove());

    countEl.textContent = `${upcoming.length} scheduled`;

    if (upcoming.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }
    emptyEl.classList.add('hidden');

    upcoming.forEach((session, i) => {
      const li = buildSessionElement(session);
      li.style.animationDelay = `${i * 40}ms`;
      listEl.appendChild(li);
    });
  }

  function buildSessionElement(session) {
    const li = document.createElement('li');
    li.className = 'session-item animate-item';
    li.dataset.id = session.id;

    li.innerHTML = `
      <div class="session-icon">
        <svg class="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-slate-800 truncate">${escapeHtml(session.topic)}</p>
        <p class="text-xs text-slate-500 mt-0.5">
          ${formatDisplayDate(session.date)} · ${formatDisplayTime(session.time)}
          <span class="session-date-badge ml-1">${escapeHtml(session.medium)}</span>
        </p>
        ${session.notes ? `<p class="text-xs text-slate-400 mt-0.5 truncate">${escapeHtml(session.notes)}</p>` : ''}
      </div>
      <div class="flex items-center gap-1">
        <button class="btn-icon edit-session-btn" data-session-id="${session.id}" aria-label="Edit session" title="Edit session">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z"/>
          </svg>
        </button>
        <button class="btn-icon delete-session-btn" data-session-id="${session.id}" aria-label="Delete session" title="Remove session">
          <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
      </div>
    `;
    return li;
  }

  function addSession(data) {
    const session = { id: uid(), ...data, createdAt: Date.now() };
    STATE.sessions.push(session);
    saveToStorage();
    renderAll();
    showToast('Session scheduled!', 'success');
  }

  function updateSession(id, updates) {
    const idx = STATE.sessions.findIndex(s => s.id === id);
    if (idx === -1) return;
    STATE.sessions[idx] = { ...STATE.sessions[idx], ...updates };
    saveToStorage();
    renderAll();
    showToast('Session updated.', 'success');
  }

  function deleteSession(id) {
    STATE.sessions = STATE.sessions.filter(s => s.id !== id);
    saveToStorage();
    renderAll();
    showToast('Session removed.', 'info');
  }

  return { renderAll, addSession, updateSession, deleteSession };
})();

/* ============================================================
   DASHBOARD MODULE
   ============================================================ */
const DashboardModule = (() => {
  function update() {
    const total       = STATE.tasks.length;
    const completed   = STATE.tasks.filter(t => t.status === 'completed').length;
    const inProgress  = STATE.tasks.filter(t => t.status === 'in-progress').length;
    const pending     = STATE.tasks.filter(t => t.status === 'pending').length;
    const pct         = total > 0 ? Math.round((completed / total) * 100) : 0;

    document.getElementById('statTotal').textContent      = total;
    document.getElementById('statCompleted').textContent  = completed;
    document.getElementById('statInProgress').textContent = inProgress;
    document.getElementById('statPending').textContent    = pending;
    document.getElementById('progressPercent').textContent = `${pct}%`;

    const fillEl  = document.getElementById('progressFill');
    const barEl   = document.getElementById('progressBar');
    fillEl.style.width = `${pct}%`;
    barEl.setAttribute('aria-valuenow', pct);
  }
  return { update };
})();

/* ============================================================
   MODAL MODULE — Task
   ============================================================ */
const TaskModalModule = (() => {
  const modal         = () => document.getElementById('taskModal');
  const titleEl       = () => document.getElementById('modalTaskTitle');
  const form          = () => document.getElementById('taskForm');
  const idInput       = () => document.getElementById('taskId');
  const titleInput    = () => document.getElementById('taskTitle');
  const descInput     = () => document.getElementById('taskDescription');
  const categoryInput = () => document.getElementById('taskCategory');
  const weekInput     = () => document.getElementById('taskWeek');
  const statusInput   = () => document.getElementById('taskStatus');
  const dueDateInput  = () => document.getElementById('taskDueDate');

  function open(task = null) {
    clearErrors();
    if (task) {
      STATE.editingTaskId = task.id;
      titleEl().textContent   = 'Edit Task';
      idInput().value         = task.id;
      titleInput().value      = task.title;
      descInput().value       = task.description || '';
      categoryInput().value   = task.category;
      weekInput().value       = task.week;
      statusInput().value     = task.status;
      dueDateInput().value    = task.dueDate || '';
    } else {
      STATE.editingTaskId = null;
      titleEl().textContent   = 'Add New Task';
      form().reset();
    }
    modal().classList.remove('hidden');
    titleInput().focus();
  }

  function close() {
    modal().classList.add('hidden');
    STATE.editingTaskId = null;
  }

  function clearErrors() {
    ['taskTitle', 'taskCategory'].forEach(fieldId => {
      document.getElementById(fieldId).classList.remove('error');
    });
    document.getElementById('taskTitleError').classList.add('hidden');
    document.getElementById('taskCategoryError').classList.add('hidden');
  }

  function validate() {
    let valid = true;
    if (!titleInput().value.trim()) {
      titleInput().classList.add('error');
      document.getElementById('taskTitleError').classList.remove('hidden');
      valid = false;
    } else {
      titleInput().classList.remove('error');
      document.getElementById('taskTitleError').classList.add('hidden');
    }
    if (!categoryInput().value) {
      categoryInput().classList.add('error');
      document.getElementById('taskCategoryError').classList.remove('hidden');
      valid = false;
    } else {
      categoryInput().classList.remove('error');
      document.getElementById('taskCategoryError').classList.add('hidden');
    }
    return valid;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const data = {
      title:       titleInput().value.trim(),
      description: descInput().value.trim(),
      category:    categoryInput().value,
      week:        weekInput().value,
      status:      statusInput().value,
      dueDate:     dueDateInput().value || null,
    };

    if (STATE.editingTaskId) {
      TaskModule.updateTask(STATE.editingTaskId, data);
    } else {
      TaskModule.addTask(data);
    }
    close();
  }

  return { open, close, handleSubmit };
})();

/* ============================================================
   MODAL MODULE — Schedule
   ============================================================ */
const ScheduleModalModule = (() => {
  const modal       = () => document.getElementById('scheduleModal');
  const form        = () => document.getElementById('scheduleForm');
  const idInput     = () => document.getElementById('sessionId');
  const topicInput  = () => document.getElementById('sessionTopic');
  const dateInput   = () => document.getElementById('sessionDate');
  const timeInput   = () => document.getElementById('sessionTime');
  const mediumInput = () => document.getElementById('sessionMedium');
  const notesInput  = () => document.getElementById('sessionNotes');

  function open(session = null) {
    clearErrors();
    if (session) {
      STATE.editingSessionId = session.id;
      document.getElementById('modalScheduleTitle').textContent = 'Edit Session';
      idInput().value     = session.id;
      topicInput().value  = session.topic;
      dateInput().value   = session.date;
      timeInput().value   = session.time;
      mediumInput().value = session.medium;
      notesInput().value  = session.notes || '';
    } else {
      STATE.editingSessionId = null;
      document.getElementById('modalScheduleTitle').textContent = 'Schedule 1-on-1 Session';
      form().reset();
    }
    modal().classList.remove('hidden');
    topicInput().focus();
  }

  function close() {
    modal().classList.add('hidden');
    STATE.editingSessionId = null;
  }

  function clearErrors() {
    ['sessionTopic', 'sessionDate', 'sessionTime'].forEach(fieldId => {
      document.getElementById(fieldId).classList.remove('error');
    });
    ['sessionTopicError', 'sessionDateError', 'sessionTimeError'].forEach(errId => {
      document.getElementById(errId).classList.add('hidden');
    });
  }

  function validate() {
    let valid = true;
    const checks = [
      { inputId: 'sessionTopic', errId: 'sessionTopicError', val: topicInput().value.trim() },
      { inputId: 'sessionDate',  errId: 'sessionDateError',  val: dateInput().value },
      { inputId: 'sessionTime',  errId: 'sessionTimeError',  val: timeInput().value },
    ];
    checks.forEach(({ inputId, errId, val }) => {
      if (!val) {
        document.getElementById(inputId).classList.add('error');
        document.getElementById(errId).classList.remove('hidden');
        valid = false;
      } else {
        document.getElementById(inputId).classList.remove('error');
        document.getElementById(errId).classList.add('hidden');
      }
    });
    return valid;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const data = {
      topic:  topicInput().value.trim(),
      date:   dateInput().value,
      time:   timeInput().value,
      medium: mediumInput().value,
      notes:  notesInput().value.trim(),
    };

    if (STATE.editingSessionId) {
      SessionModule.updateSession(STATE.editingSessionId, data);
    } else {
      SessionModule.addSession(data);
    }
    close();
  }

  return { open, close, handleSubmit };
})();

/* ============================================================
   TOAST NOTIFICATION
   ============================================================ */
let _toastTimer = null;
function showToast(message, type = 'info') {
  const toastEl = document.getElementById('toast');
  toastEl.className = `toast toast-${type}`;
  toastEl.innerHTML = `<span class="toast-dot"></span><span>${message}</span>`;
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toastEl.classList.add('hidden'), 3000);
}

/* ============================================================
   HTML ESCAPE
   ============================================================ */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ============================================================
   EVENT WIRING
   ============================================================ */
function wireEvents() {

  // Header date
  const now = new Date();
  document.getElementById('headerDate').textContent =
    now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // ── Task Modal ──
  document.getElementById('btnAddTask').addEventListener('click', () => TaskModalModule.open());
  document.getElementById('closeTaskModal').addEventListener('click', TaskModalModule.close);
  document.getElementById('cancelTaskModal').addEventListener('click', TaskModalModule.close);
  document.getElementById('taskForm').addEventListener('submit', TaskModalModule.handleSubmit);
  document.getElementById('taskModal').addEventListener('click', e => {
    if (e.target === document.getElementById('taskModal')) TaskModalModule.close();
  });

  // ── Schedule Modal ──
  document.getElementById('btnSchedule').addEventListener('click', () => ScheduleModalModule.open());
  document.getElementById('closeScheduleModal').addEventListener('click', ScheduleModalModule.close);
  document.getElementById('cancelScheduleModal').addEventListener('click', ScheduleModalModule.close);
  document.getElementById('scheduleForm').addEventListener('submit', ScheduleModalModule.handleSubmit);
  document.getElementById('scheduleModal').addEventListener('click', e => {
    if (e.target === document.getElementById('scheduleModal')) ScheduleModalModule.close();
  });

  // ── Filter: Status Buttons ──
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      STATE.activeStatusFilter = btn.dataset.filterValue;
      TaskModule.renderAll();
    });
  });

  // ── Filter: Category Select ──
  document.getElementById('categoryFilter').addEventListener('change', e => {
    STATE.activeCategoryFilter = e.target.value;
    TaskModule.renderAll();
  });

  // ── Task List Delegation ──
  document.getElementById('taskList').addEventListener('click', e => {
    const editBtn   = e.target.closest('.edit-task-btn');
    const deleteBtn = e.target.closest('.delete-task-btn');

    if (editBtn) {
      const task = STATE.tasks.find(t => t.id === editBtn.dataset.taskId);
      if (task) TaskModalModule.open(task);
    }

    if (deleteBtn) {
      const id = deleteBtn.dataset.taskId;
      if (id) {
        if (confirm('Delete this task? This action cannot be undone.')) {
          TaskModule.deleteTask(id);
        }
      }
    }
  });

  document.getElementById('taskList').addEventListener('change', e => {
    // Checkbox toggle
    if (e.target.classList.contains('task-checkbox')) {
      const id = e.target.dataset.taskId;
      if (!id) return;
      const task = STATE.tasks.find(t => t.id === id);
      if (!task) return;
      const newStatus = e.target.checked ? 'completed' : 'pending';
      TaskModule.changeStatus(id, newStatus);
    }

    // Status select
    if (e.target.classList.contains('status-select')) {
      const id = e.target.dataset.taskId;
      if (!id) return;
      TaskModule.changeStatus(id, e.target.value);
    }
  });

  // ── Session List Delegation ──
  document.getElementById('sessionList').addEventListener('click', e => {
    const editBtn   = e.target.closest('.edit-session-btn');
    const deleteBtn = e.target.closest('.delete-session-btn');

    if (editBtn) {
      const session = STATE.sessions.find(s => s.id === editBtn.dataset.sessionId);
      if (session) ScheduleModalModule.open(session);
    }

    if (deleteBtn) {
      const id = deleteBtn.dataset.sessionId;
      if (id) {
        if (confirm('Remove this scheduled session?')) {
          SessionModule.deleteSession(id);
        }
      }
    }
  });

  // ── Global Keyboard: Escape closes modals ──
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      TaskModalModule.close();
      ScheduleModalModule.close();
    }
  });
}

/* ============================================================
   INIT
   ============================================================ */
function init() {
  loadFromStorage();
  wireEvents();
  DashboardModule.update();
  TaskModule.renderAll();
  SessionModule.renderAll();
}

document.addEventListener('DOMContentLoaded', init);
