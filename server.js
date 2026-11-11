require('dotenv').config();

const express = require('express');
const path = require('path');
const store = require('./lib/store');
const { suggestPriority } = require('./lib/smart');

const app = express();
const PORT = process.env.PORT || 3000;
const PRIORITIES = ['高', '中', '低'];

app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, _res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  }
  next();
});

/* 健康检查：告诉前端当前用的是 Supabase 还是内存模式 */
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mode: store.mode, time: new Date().toISOString() });
});

/* 智能优先级建议 */
app.get('/api/suggest', (req, res) => {
  const title = String(req.query.title || '');
  res.json(suggestPriority(title));
});

/* 任务列表（支持按优先级筛选） */
app.get('/api/tasks', async (req, res) => {
  try {
    const priority = String(req.query.priority || '全部');
    const rows = await store.list(priority);
    res.json({ ok: true, data: rows, mode: store.mode });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

/* 新增任务 */
app.post('/api/tasks', async (req, res) => {
  const title = String(req.body.title || '').trim();
  const priority = String(req.body.priority || '中');

  if (!title) {
    return res.status(400).json({ ok: false, message: '任务标题不能为空' });
  }
  if (title.length > 120) {
    return res.status(400).json({ ok: false, message: '任务标题不能超过 120 个字符' });
  }
  if (!PRIORITIES.includes(priority)) {
    return res.status(400).json({ ok: false, message: '优先级只能是 高 / 中 / 低' });
  }

  try {
    const row = await store.create({ title, priority });
    res.status(201).json({ ok: true, data: row });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

/* 切换完成状态 */
app.patch('/api/tasks/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ ok: false, message: '任务 id 不合法' });
  }
  if (typeof req.body.completed !== 'boolean') {
    return res.status(400).json({ ok: false, message: 'completed 必须是布尔值' });
  }

  try {
    const row = await store.toggle(id, req.body.completed);
    if (!row) {
      return res.status(404).json({ ok: false, message: '任务不存在' });
    }
    res.json({ ok: true, data: row });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

/* 删除任务 */
app.delete('/api/tasks/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ ok: false, message: '任务 id 不合法' });
  }

  try {
    await store.remove(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

/* 兜底：非接口请求交给前端页面 */
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ ok: false, message: '接口不存在' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* 本地运行：直接监听端口；部署到 Vercel 等平台时导出 app 由平台接管 */
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('');
    console.log('  ✅ 智能任务管理系统已启动');
    console.log(`  ➜ 本地地址：http://localhost:${PORT}`);
    console.log(`  ➜ 数据存储：${store.mode === 'supabase' ? 'Supabase 云数据库' : '内存（临时，重启即清空）'}`);
    if (store.mode === 'memory') {
      console.log('  ⚠️  未检测到 SUPABASE_URL / SUPABASE_ANON_KEY，数据不会持久化');
    }
    console.log('');
  });
}

module.exports = app;
