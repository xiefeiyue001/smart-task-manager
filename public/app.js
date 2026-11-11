const state = { tasks: [], allTasks: [], priority: '全部', mode: 'memory' };

const $ = (id) => document.getElementById(id);
const listEl = $('taskList');
const titleInput = $('titleInput');
const prioritySelect = $('prioritySelect');
const addBtn = $('addBtn');
const hintEl = $('hint');

function formatTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return sameDay ? `今天 ${hh}:${mm}` : `${d.getMonth() + 1}月${d.getDate()}日 ${hh}:${mm}`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function showHint(text, smart = false) {
  hintEl.textContent = text;
  hintEl.classList.toggle('smart', smart);
}

async function api(url, options) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.ok === false) throw new Error(body.message || `请求失败（HTTP ${res.status}）`);
  return body;
}

function render() {
  const list = state.tasks;

  if (list.length === 0) {
    listEl.innerHTML = `<li class="empty">${
      state.priority === '全部' ? '还没有任务，在上方输入框添加第一条吧' : `没有${state.priority}优先级的任务`
    }</li>`;
  } else {
    listEl.innerHTML = list.map((task) => `
      <li class="task-item ${task.completed ? 'completed' : ''}">
        <button class="toggle ${task.completed ? 'done' : ''}" type="button"
          title="${task.completed ? '标记为未完成' : '标记为已完成'}"
          data-action="toggle" data-id="${task.id}" data-completed="${task.completed}"
        >${task.completed ? '✓' : ''}</button>
        <div class="task-body">
          <div class="task-title">${escapeHtml(task.title)}</div>
          <div class="task-meta">创建于 ${formatTime(task.created_at)} · ${task.completed ? '已完成' : '未完成'}</div>
        </div>
        <span class="badge badge-${task.priority}">${task.priority}</span>
        <button class="btn-del" type="button" data-action="delete" data-id="${task.id}">删除</button>
      </li>`).join('');
  }

  updateStats();
}

function updateStats() {
  const total = state.allTasks.length;
  const done = state.allTasks.filter((t) => t.completed).length;
  $('statTotal').textContent = total;
  $('statPending').textContent = total - done;
  $('statDone').textContent = done;
}

async function loadTasks() {
  try {
    const qs = state.priority === '全部' ? '' : `?priority=${encodeURIComponent(state.priority)}`;
    const body = await api(`/api/tasks${qs}`);
    state.tasks = body.data || [];

    if (state.priority === '全部') {
      state.allTasks = state.tasks;
    } else {
      const all = await api('/api/tasks');
      state.allTasks = all.data || [];
    }

    render();
  } catch (err) {
    listEl.innerHTML = `<li class="empty">加载失败：${escapeHtml(err.message)}</li>`;
  }
}

async function addTask() {
  const title = titleInput.value.trim();
  if (!title) {
    showHint('请先输入任务内容');
    titleInput.focus();
    return;
  }

  addBtn.disabled = true;
  addBtn.textContent = '添加中…';

  try {
    await api('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title, priority: prioritySelect.value }),
    });
    titleInput.value = '';
    showHint('已添加。继续输入，系统会智能推荐优先级');
    await loadTasks();
    titleInput.focus();
  } catch (err) {
    showHint(`添加失败：${err.message}`);
  } finally {
    addBtn.disabled = false;
    addBtn.textContent = '添加任务';
  }
}

async function toggleTask(id, completed) {
  try {
    await api(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ completed: !completed }) });
    await loadTasks();
  } catch (err) {
    showHint(`更新失败：${err.message}`);
  }
}

async function removeTask(id) {
  try {
    await api(`/api/tasks/${id}`, { method: 'DELETE' });
    await loadTasks();
  } catch (err) {
    showHint(`删除失败：${err.message}`);
  }
}

listEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.action === 'toggle') toggleTask(id, btn.dataset.completed === 'true');
  else if (btn.dataset.action === 'delete') removeTask(id);
});

addBtn.addEventListener('click', addTask);

titleInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTask();
});

$('filters').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  state.priority = chip.dataset.priority;
  document.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
  chip.classList.add('active');
  loadTasks();
});

let suggestTimer = null;
titleInput.addEventListener('input', () => {
  const title = titleInput.value.trim();
  clearTimeout(suggestTimer);
  if (!title) {
    showHint('输入任务标题，系统会智能推荐优先级');
    return;
  }
  suggestTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/suggest?title=${encodeURIComponent(title)}`);
      const { priority, reason } = await res.json();
      prioritySelect.value = priority;
      showHint(`智能建议：${priority} 优先级 · ${reason}`, true);
    } catch { /* 建议失败不影响主流程 */ }
  }, 400);
});

(async function init() {
  try {
    const health = await api('/api/health');
    state.mode = health.mode;
    const isSupabase = health.mode === 'supabase';
    $('modeBadge').textContent = isSupabase ? 'Supabase 已连接' : '内存模式（临时）';
    $('modeBadge').classList.toggle('warn', !isSupabase);
    $('modeText').textContent = isSupabase ? 'Supabase 云数据库' : '内存（未配置数据库）';
  } catch {
    $('modeBadge').textContent = '连接异常';
  }
  await loadTasks();
})();
