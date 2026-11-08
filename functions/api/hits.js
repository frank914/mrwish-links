const KEYS = [
  'nidin-shuiyuan', 'panda-shuiyuan', 'uber-shuiyuan',
  'nidin-shilin', 'panda-shilin', 'uber-shilin',
  'line-shuiyuan', 'line-shilin'
];

const HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'access-control-allow-origin': '*'
};

async function num(kv, key) {
  const v = await kv.get(key);
  const n = parseInt(v || '0', 10);
  return Number.isFinite(n) ? n : 0;
}

export async function onRequestGet({ request, env }) {
  const kv = env.COUNTER;
  if (!kv) {
    return new Response(JSON.stringify({ error: 'KV binding COUNTER is missing' }), {
      status: 500, headers: HEADERS
    });
  }

  const url = new URL(request.url);
  const to = url.searchParams.get('to');

  // 記錄外送平台按鈕點擊
  if (to) {
    if (!KEYS.includes(to)) {
      return new Response(JSON.stringify({ ok: false }), { status: 400, headers: HEADERS });
    }
    const key = 'click:' + to;
    await kv.put(key, String((await num(kv, key)) + 1));
    return new Response(JSON.stringify({ ok: true }), { headers: HEADERS });
  }

  // 瀏覽次數：bump=0 只讀不加（同一個瀏覽階段重整不重複計算）
  let views = await num(kv, 'views');
  if (url.searchParams.get('bump') !== '0') {
    views += 1;
    await kv.put('views', String(views));
  }

  const clicks = {};
  await Promise.all(KEYS.map(async k => { clicks[k] = await num(kv, 'click:' + k); }));

  return new Response(JSON.stringify({ views, clicks }), { headers: HEADERS });
}
