import { QUESTIONS, MAX_SCORE, getLevel } from '../data/game.js';
import { sendMessage, answerCallbackQuery, editMessageText } from '../lib/telegram.js';
import { checkMembership } from '../lib/membership.js';
import { supabase } from '../lib/supabase.js';

// ─────────────── متن‌های فان ───────────────
const PROGRESS_QUOTES = [
  'گرم کن، تازه اولشه 🔥',
  'خوبه، ادامه بده 💪',
  'داری فرم می‌گیری 😎',
  'نفس نبر، ادامه بده 🔥',
  'نصف راهو اومدی غول 🏔️',
  'عرق نکن، سؤاله فقط 😅',
  'داره جدی میشه 👀',
  'استقامتت خوبه‌ها 🫡',
  'چیزی نمونده، بجنگ 🥊',
  'آخراشه، وا نده ⚡',
  'یکی مونده به آخر 😮‍💨',
  'سؤال آخر! همه‌چی اینجاست 🏆'
];

// ─────────────── ساخت کیبورد سؤال ───────────────
function questionKeyboard(qIndex) {
  const q = QUESTIONS[qIndex];
  return {
    inline_keyboard: q.options.map((opt, oIndex) => ([
      { text: `${opt.emoji} ${opt.text}`, callback_data: `ans:${qIndex}:${oIndex}` }
    ]))
  };
}

function questionText(qIndex) {
  const q = QUESTIONS[qIndex];
  const filled = '🟩'.repeat(qIndex);
  const empty = '⬜'.repeat(QUESTIONS.length - qIndex);
  return (
    `${filled}${empty}\n` +
    `📍 سؤال ${qIndex + 1} از ${QUESTIONS.length} — ${PROGRESS_QUOTES[qIndex]}\n\n` +
    `${q.emoji} <b>${q.text}</b>`
  );
}

// ─────────────── پیام عضویت ───────────────
function joinMessage() {
  return {
    text:
      `🛑 <b>وایسا وایسا! کجا با این عجله؟</b>\n\n` +
      `قبل اینکه بفهمیم چقدر غولی، باید عضو این دوتا کانال باشی 👇\n\n` +
      `بعدش دکمه «✅ عضو شدم» رو بزن تا بریم سراغ اصل ماجرا 😎`,
    keyboard: {
      inline_keyboard: [
        [{ text: '📢 کانال اول', url: `https://t.me/${process.env.CHANNEL_1}` }],
        [{ text: '📢 کانال دوم', url: `https://t.me/${process.env.CHANNEL_2}` }],
        [{ text: '✅ عضو شدم', callback_data: 'check_join' }]
      ]
    }
  };
}

// ─────────────── پیام خوش‌آمد ───────────────
async function sendWelcome(chat_id, name) {
  await sendMessage(chat_id,
    `🏋️‍♂️ <b>سلام ${name}! به «چقدر غولی؟» خوش اومدی</b>\n\n` +
    `اینجا با ۱۲ تا سؤال می‌فهمیم واقعاً غولی یا فقط پروفایلت غوله 😏\n\n` +
    `🎯 امتیازت از ۱ تا ۱۰۰ حساب میشه\n` +
    `📊 با بقیه مقایسه میشی\n` +
    `🏅 یکی از ۲۰ سطح رو می‌گیری\n\n` +
    `صادق باش، چون بدنت که دروغ نمیگه 🤨`,
    {
      reply_markup: {
        inline_keyboard: [[{ text: '🏁 بزن بریم!', callback_data: 'begin' }]]
      }
    }
  );
}

// ─────────────── شروع بازی ───────────────
async function startGame(user, chat_id) {
  await supabase.from('players').upsert({
    user_id: user.id,
    name: user.first_name || 'غول ناشناس',
    q_index: 0,
    raw: 0,
    score: null
  });

  await sendMessage(chat_id, questionText(0), {
    reply_markup: questionKeyboard(0)
  });
}

// ─────────────── محاسبه و نمایش نتیجه ───────────────
async function finishGame(user, chat_id, message_id, raw) {
  const score = Math.min(100, Math.max(1, Math.round((raw / MAX_SCORE) * 100)));
  const level = getLevel(score);

  await supabase.from('players')
    .update({ score, finished_at: new Date().toISOString() })
    .eq('user_id', user.id);

  // آمار واقعی از دیتابیس
  const { count: total } = await supabase.from('players')
    .select('*', { count: 'exact', head: true })
    .not('score', 'is', null);

  const { count: below } = await supabase.from('players')
    .select('*', { count: 'exact', head: true })
    .not('score', 'is', null)
    .lt('score', score);

  const { count: above } = await supabase.from('players')
    .select('*', { count: 'exact', head: true })
    .not('score', 'is', null)
    .gt('score', score);

  const percent = total > 1 ? Math.round((below / (total - 1)) * 100) : 100;
  const rank = (above || 0) + 1;

  const shareText = encodeURIComponent(
    `من تو تست «چقدر غولی؟» شدم ${level.emoji} ${level.name} با امتیاز ${score} از ۱۰۰! 💪\nتو هم امتحان کن ببینم چند مرده حلاجی 😏\n@HowFitBot`
  );

  await editMessageText(chat_id, message_id,
    `🎉 <b>تموم شد! نتیجه‌ت اینه:</b>\n\n` +
    `${level.emoji} <b>سطح تو: ${level.name}</b>\n\n` +
    `💯 امتیاز: <b>${score} از ۱۰۰</b>\n` +
    `📊 از <b>${percent}٪</b> شرکت‌کننده‌ها غول‌تری!\n` +
    `🏆 رتبه‌ت بین همه: <b>${rank}</b> از ${total}\n\n` +
    `💬 ${level.msg}`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '😎 به رفیقات پز بده', url: `https://t.me/share/url?url=https://t.me/HowFitBot&text=${shareText}` }],
          [{ text: '🔄 تست دوباره (بعد از ۲۴ ساعت)', callback_data: 'retry' }]
        ]
      }
    }
  );
}

// ─────────────── هندلر اصلی ───────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).send('OK');

  try {
    const update = req.body;

    // ═══ پیام متنی ═══
    if (update.message?.text) {
      const msg = update.message;
      const user = msg.from;

      if (msg.text.startsWith('/start')) {
        const check = await checkMembership(user.id);
        if (!check.joined) {
          const jm = joinMessage();
          await sendMessage(msg.chat.id, jm.text, { reply_markup: jm.keyboard });
        } else {
          await sendWelcome(msg.chat.id, user.first_name || 'قهرمان');
        }
      }
    }

    // ═══ دکمه‌های شیشه‌ای ═══
    if (update.callback_query) {
      const cb = update.callback_query;
      const user = cb.from;
      const chat_id = cb.message.chat.id;
      const message_id = cb.message.message_id;
      const data = cb.data;

      // ── چک عضویت ──
      if (data === 'check_join') {
        const check = await checkMembership(user.id);
        if (!check.joined) {
          await answerCallbackQuery(cb.id, `😐 هنوز عضو @${check.channel} نشدی! برو عضو شو بعد بیا`);
        } else {
          await answerCallbackQuery(cb.id, '✅ ایول! عضویتت تأیید شد');
          await editMessageText(chat_id, message_id, '✅ <b>عضویتت تأیید شد، دمت گرم!</b>');
          await sendWelcome(chat_id, user.first_name || 'قهرمان');
        }
      }

      // ── شروع بازی ──
      else if (data === 'begin') {
        await answerCallbackQuery(cb.id, '🔥
