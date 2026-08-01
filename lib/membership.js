const BASE = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

export async function checkMembership(user_id) {
  const channels = [process.env.CHANNEL_1, process.env.CHANNEL_2];
  for (const channel of channels) {
    const res = await fetch(`${BASE}/getChatMember?chat_id=@${channel}&user_id=${user_id}`);
    const data = await res.json();
    const status = data?.result?.status;
    if (!['member', 'administrator', 'creator'].includes(status)) {
      return { joined: false, channel };
    }
  }
  return { joined: true };
}
