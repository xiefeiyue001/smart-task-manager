/**
 * Supabase 客户端初始化
 * 只要配置了 SUPABASE_URL + SUPABASE_ANON_KEY 就走真实数据库，
 * 否则自动降级到内存存储（方便本地先跑通界面）
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

const enabled =
  /^https:\/\/.+\.supabase\.co$/.test(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 20;

let client = null;
if (enabled) {
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
} else if (SUPABASE_URL || SUPABASE_ANON_KEY) {
  console.warn('⚠️  SUPABASE_URL / SUPABASE_ANON_KEY 格式不正确，已自动降级为内存存储');
}

module.exports = { enabled, client, SUPABASE_URL };
