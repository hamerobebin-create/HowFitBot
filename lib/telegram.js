const BASE = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

export async function sendMessage(chat_id, text, extra = {}) {
  await fetch(`${BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id, text, parse_mode: 'HTML', ...extra }),
  });
}

export async function answerCallbackQuery(callback_query_id, text = '') {
  await fetch(`${BASE}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id, text }),
  });
}

export async function editMessageText(chat_id, message_id, text, extra = {}) {
  await fetch(`${BASE}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id, message_id, text, parse_mode: 'HTML', ...extra }),
  });
}
