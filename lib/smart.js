const HIGH_WORDS = [
  '紧急', '马上', '立刻', '今天', '今晚', '截止', 'ddl', '重要', '必须',
  '面试', '考试', '答辩', '报名', '缴费', '交费', '还钱', '医院', '复查',
  '提交', '上线', '修复', '故障', '报错', '退款', '签约', 'deadline',
];
const LOW_WORDS = [
  '有空', '以后', '将来', '想到', '顺便', '随便', '了解一下', '参考',
  '整理', '归档', '备忘', '笔记', '无聊', '闲了', '可选', '不急',
];
const MID_WORDS = ['计划', '准备', '学习', '阅读', '复盘', '沟通', '同步'];

function suggestPriority(title = '') {
  const text = String(title).toLowerCase();
  let score = 0;
  const hits = [];

  for (const w of HIGH_WORDS) {
    if (text.includes(w)) { score += 3; hits.push(w); }
  }
  for (const w of MID_WORDS) {
    if (text.includes(w)) { score += 1; hits.push(w); }
  }
  for (const w of LOW_WORDS) {
    if (text.includes(w)) { score -= 2; hits.push(w); }
  }

  if (/!|！/.test(text)) score += 1;
  if (/\d+\s*[月日号点]/.test(text)) score += 1;

  let priority = '中';
  let reason = '没有明显时间或紧迫信号，默认中优先级';

  if (score >= 3) {
    priority = '高';
    reason = `检测到「${hits.slice(0, 2).join('、')}」等紧迫信号`;
  } else if (score <= -2) {
    priority = '低';
    reason = `检测到「${hits.slice(0, 2).join('、')}」等非紧急信号`;
  } else if (score > 0) {
    priority = '中';
    reason = hits.length
      ? `检测到「${hits.slice(0, 2).join('、')}」，按常规节奏安排`
      : '任务有一定明确性，建议中优先级';
  }

  return { priority, reason };
}

module.exports = { suggestPriority };
