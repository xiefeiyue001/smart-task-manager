const { enabled, client } = require('./supabase');

/* ---------------- 内存兜底（未配置数据库时使用） ---------------- */
const memory = { rows: [], nextId: 1 };

const memoryStore = {
  async list(priority) {
    let rows = [...memory.rows];
    if (priority && priority !== '全部') {
      rows = rows.filter((t) => t.priority === priority);
    }
    rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return rows;
  },
  async create({ title, priority }) {
    const row = {
      id: memory.nextId++,
      title,
      priority,
      completed: false,
      created_at: new Date().toISOString(),
    };
    memory.rows.push(row);
    return row;
  },
  async toggle(id, completed) {
    const row = memory.rows.find((t) => t.id === id);
    if (!row) return null;
    row.completed = completed;
    return row;
  },
  async remove(id) {
    const idx = memory.rows.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    memory.rows.splice(idx, 1);
    return true;
  },
};

/* ---------------- Supabase 实现 ---------------- */
const supabaseStore = {
  async list(priority) {
    let query = client
      .from('tasks')
      .select('id, title, priority, completed, created_at')
      .order('created_at', { ascending: false });

    if (priority && priority !== '全部') {
      query = query.eq('priority', priority);
    }

    const { data, error } = await query;
    if (error) throw new Error(`查询任务失败：${error.message}`);
    return data;
  },
  async create({ title, priority }) {
    const { data, error } = await client
      .from('tasks')
      .insert([{ title, priority }])
      .select('id, title, priority, completed, created_at')
      .single();

    if (error) throw new Error(`新增任务失败：${error.message}`);
    return data;
  },
  async toggle(id, completed) {
    const { data, error } = await client
      .from('tasks')
      .update({ completed })
      .eq('id', id)
      .select('id, title, priority, completed, created_at')
      .maybeSingle();

    if (error) throw new Error(`更新任务失败：${error.message}`);
    return data;
  },
  async remove(id) {
    const { error, count } = await client
      .from('tasks')
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error) throw new Error(`删除任务失败：${error.message}`);
    return count !== 0;
  },
};

module.exports = {
  mode: enabled ? 'supabase' : 'memory',
  ...(enabled ? supabaseStore : memoryStore),
};
