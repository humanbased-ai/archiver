'use strict';

// ══ Utils ═════════════════════════════════════════════════════════════════════
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function cap(s) { return s ? s[0].toUpperCase()+s.slice(1) : ''; }
function fmtTime(iso) {
  if (!iso) return '';
  try { return new Intl.DateTimeFormat('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(iso)); }
  catch { return iso; }
}
function tweetLen(text) {
  // Strip U+0336 combining strikethrough (doesn't count toward Twitter length)
  const t = (text||'').replace(/\u0336/g, '');
  let n = 0;
  for (const ch of t) {
    const cp = ch.codePointAt(0);
    // Twitter counts CJK as 2 weighted chars
    const isCJK = (cp>=0x1100&&cp<=0x115F)||(cp>=0x2E80&&cp<=0x303F)||
                  (cp>=0x3040&&cp<=0x9FFF)||(cp>=0xA960&&cp<=0xA97F)||
                  (cp>=0xAC00&&cp<=0xD7FF)||(cp>=0xF900&&cp<=0xFAFF)||
                  (cp>=0xFF00&&cp<=0xFFEF)||(cp>=0x20000&&cp<=0x2FA1F);
    // Supplementary plane chars (U+10000+) are surrogate pairs in UTF-16
    // Twitter counts each surrogate pair as 2 weighted chars
    const isSurrogatePair = cp > 0xFFFF;
    n += (isCJK || isSurrogatePair) ? 2 : 1;
  }
  return n;
}
async function api(path, opts={}) {
  const r = await fetch(path, { headers:{'Content-Type':'application/json'}, ...opts });
  if (!r.ok) { const e = await r.json().catch(()=>({detail:r.statusText})); throw new Error(e.detail||r.statusText); }
  return r.json().catch(()=>null);
}

// ══ State ═════════════════════════════════════════════════════════════════════
const state = {
  page: 'compose',
  accounts: [],          // from DB
  cards: [{ text:'', media:[] }],
  selectedAccIds: new Set(),
  scheduleMode: 'immediate',
  charts: {},
};

const PLATFORM_ICONS = {
  twitter:  '𝕏',
  telegram: '✈️',
  discord:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle;flex-shrink:0"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>',
  linkedin: '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle;flex-shrink:0"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
  farcaster:'<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle;flex-shrink:0"><path d="M18.24.24H5.76A5.76 5.76 0 0 0 0 6v12a5.76 5.76 0 0 0 5.76 5.76h12.48A5.76 5.76 0 0 0 24 18V6A5.76 5.76 0 0 0 18.24.24zm.816 17.166v.504h-3.504v-.504c.672-.12 1.032-.372 1.032-.792 0-.144-.048-.312-.168-.504l-3.888-6.48v4.608c0 1.68.36 2.376 2.112 2.688v.48H9.36v-.48c1.752-.312 2.112-1.008 2.112-2.688V10.11l-3.888 6.48c-.12.192-.168.36-.168.504 0 .42.36.672 1.032.792v.504H5V17.41c.888-.264 1.32-.648 1.68-1.272l4.344-7.248H9.6V8.39h4.8v.5h-1.416l4.32 7.224c.348.6.792 1.008 1.752 1.296z"/></svg>',
};
const LANG_LABELS = { en:'EN', zh:'ZH', ko:'KO' };

// ── Circular character counter ────────────────────────────────────────────────
function circleCounter(len, max) {
  const r = 12, C = +(2 * Math.PI * r).toFixed(3);
  const pct = Math.min(len / max, 1);
  const dash = +(pct * C).toFixed(3);
  const color = len > max ? '#ef4444' : len > max * 0.8 ? '#f59e0b' : '#6c5ce7';
  const rem = max - len;
  const showNum = len >= Math.floor(max * 0.8);
  return `<svg width="30" height="30" viewBox="0 0 30 30">
    <circle cx="15" cy="15" r="${r}" fill="none" stroke="#2a2a3d" stroke-width="2.5"/>
    <circle cx="15" cy="15" r="${r}" fill="none" stroke="${color}" stroke-width="2.5"
            stroke-dasharray="${dash} ${C}" stroke-linecap="round"
            transform="rotate(-90 15 15)"/>
    ${showNum ? `<text x="15" y="19.5" text-anchor="middle" fill="${color}" font-size="8.5" font-weight="700">${rem}</text>` : ''}
  </svg>`;
}

// ── Unicode text formatting maps ──────────────────────────────────────────────
const BOLD_MAP   = {'a':'𝗮','b':'𝗯','c':'𝗰','d':'𝗱','e':'𝗲','f':'𝗳','g':'𝗴','h':'𝗵','i':'𝗶','j':'𝗷','k':'𝗸','l':'𝗹','m':'𝗺','n':'𝗻','o':'𝗼','p':'𝗽','q':'𝗾','r':'𝗿','s':'𝘀','t':'𝘁','u':'𝘂','v':'𝘃','w':'𝘄','x':'𝘅','y':'𝘆','z':'𝘇','A':'𝗔','B':'𝗕','C':'𝗖','D':'𝗗','E':'𝗘','F':'𝗙','G':'𝗚','H':'𝗛','I':'𝗜','J':'𝗝','K':'𝗞','L':'𝗟','M':'𝗠','N':'𝗡','O':'𝗢','P':'𝗣','Q':'𝗤','R':'𝗥','S':'𝗦','T':'𝗧','U':'𝗨','V':'𝗩','W':'𝗪','X':'𝗫','Y':'𝗬','Z':'𝗭','0':'𝟬','1':'𝟭','2':'𝟮','3':'𝟯','4':'𝟰','5':'𝟱','6':'𝟲','7':'𝟳','8':'𝟴','9':'𝟵'};
const ITALIC_MAP = {'a':'𝑎','b':'𝑏','c':'𝑐','d':'𝑑','e':'𝑒','f':'𝑓','g':'𝑔','h':'ℎ','i':'𝑖','j':'𝑗','k':'𝑘','l':'𝑙','m':'𝑚','n':'𝑛','o':'𝑜','p':'𝑝','q':'𝑞','r':'𝑟','s':'𝑠','t':'𝑡','u':'𝑢','v':'𝑣','w':'𝑤','x':'𝑥','y':'𝑦','z':'𝑧','A':'𝐴','B':'𝐵','C':'𝐶','D':'𝐷','E':'𝐸','F':'𝐹','G':'𝐺','H':'𝐻','I':'𝐼','J':'𝐽','K':'𝐾','L':'𝐿','M':'𝑀','N':'𝑁','O':'𝑂','P':'𝑃','Q':'𝑄','R':'𝑅','S':'𝑆','T':'𝑇','U':'𝑈','V':'𝑉','W':'𝑊','X':'𝑋','Y':'𝑌','Z':'𝑍'};
// Reverse maps: bold/italic char → plain char
const BOLD_UNMAP   = Object.fromEntries(Object.entries(BOLD_MAP).map(([k,v])=>[v,k]));
const ITALIC_UNMAP = Object.fromEntries(Object.entries(ITALIC_MAP).map(([k,v])=>[v,k]));

// Detect format state at cursor/selection (textarea-based)
function getFormatState(inputEl) {
  const s = inputEl.selectionStart;
  const e = inputEl.selectionEnd;
  const v = inputEl.value;
  let text = '';
  if (s !== e) {
    text = v.slice(s, e);
  } else if (s > 0) {
    // Take the last code point before the cursor
    const cps = [...v.slice(0, s)];
    text = cps[cps.length - 1] || '';
  }
  const chars = [...text];
  return {
    bold:   chars.some(c => !!BOLD_UNMAP[c]),
    italic: chars.some(c => !!ITALIC_UNMAP[c]),
    strike: text.includes('\u0336'),
  };
}

// Toggle formatting: if selection already has the format, remove it; otherwise apply
function applyFormat(inputEl, type) {
  const s = inputEl.selectionStart;
  const e = inputEl.selectionEnd;
  if (s === e) return;  // nothing selected
  const v = inputEl.value;
  const selected = v.slice(s, e);
  const chars = [...selected];
  let out;
  if (type === 'bold') {
    const hasBold = chars.some(c => !!BOLD_UNMAP[c]);
    out = chars.map(c => hasBold ? (BOLD_UNMAP[c] || c) : (BOLD_MAP[c] || c)).join('');
  } else if (type === 'italic') {
    const hasItalic = chars.some(c => !!ITALIC_UNMAP[c]);
    out = chars.map(c => hasItalic ? (ITALIC_UNMAP[c] || c) : (ITALIC_MAP[c] || c)).join('');
  } else if (type === 'strike') {
    const hasStrike = selected.includes('\u0336');
    out = hasStrike ? selected.replace(/\u0336/g, '') : chars.map(c => c + '\u0336').join('');
  }
  if (!out) return;
  inputEl.value = v.slice(0, s) + out + v.slice(e);
  // Restore selection over the newly formatted text
  inputEl.selectionStart = s;
  inputEl.selectionEnd = s + out.length;
  inputEl.focus();
  inputEl.dispatchEvent(new Event('input'));
}

function insertTextAtCursor(inputEl, text) {
  const s = inputEl.selectionStart;
  const e = inputEl.selectionEnd;
  const v = inputEl.value;
  inputEl.value = v.slice(0, s) + text + v.slice(e);
  inputEl.selectionStart = inputEl.selectionEnd = s + text.length;
  inputEl.focus();
  inputEl.dispatchEvent(new Event('input'));
}

// ── Emoji data (full Twitter-style set) ──────────────────────────────────────
const EMOJIS = {
  '😀 表情': [
    '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','🫠','😉','😊','😇','🥰','😍','🤩','😘',
    '😗','☺️','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🫡','🤭','🫢','🫣','🤫','🤔',
    '🫤','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','🫨','😌','😔','😪','🤤','😴','😷',
    '🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','😟',
    '🙁','☹️','😮','😯','😲','😳','🥺','🫣','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣',
    '😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻',
    '👽','👾','🤖','😺','😸','😹','😻','😼','😽','🙀','😿','😾',
  ],
  '🧑 人物': [
    '👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙',
    '👈','👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲',
    '🤝','🙏','✍️','💅','🤳','💪','🦾','🫂','👦','👧','🧒','👦','👧','🧑','👱','👴','👵','🧓',
    '🧔','👩','🧑','👮','🕵️','💂','🧑‍⚕️','👩‍⚕️','👨‍⚕️','🧑‍🌾','👩‍🌾','👨‍🌾','🧑‍🍳','👩‍🍳','👨‍🍳',
    '🧑‍🎓','👩‍🎓','👨‍🎓','🧑‍🎤','👩‍🎤','👨‍🎤','🧑‍🏫','👩‍🏫','👨‍🏫','🧑‍🏭','👩‍🏭','👨‍🏭',
    '🧑‍💻','👩‍💻','👨‍💻','🧑‍💼','👩‍💼','👨‍💼','🧑‍🔧','👩‍🔧','👨‍🔧','🧑‍🚒','👩‍🚒','👨‍🚒',
    '🧑‍✈️','👩‍✈️','👨‍✈️','🧑‍🚀','👩‍🚀','👨‍🚀','👸','🤴','🥷','🦸','🦹','🧙','🧝','🧛','🧟',
    '🧞','🧜','🧚','🫅','🤶','🎅','🧑‍🦯','🧑‍🦼','🧑‍🦽','🏃','🚶','🧍','🧎','🧑‍🤝‍🧑','👯',
  ],
  '🐶 动物': [
    '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐽','🐸','🐵',
    '🙈','🙉','🙊','🐒','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞',
    '🐜','🦟','🦗','🕷️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟',
    '🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🦣','🐘','🦛','🦏','🐪','🐫','🦒','🦘',
    '🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐈','🐓','🦃','🦤','🦚',
    '🦜','🦢','🦩','🕊️','🐇','🦝','🦨','🦡','🦫','🦦','🦥','🐁','🐀','🐿️','🦔','🐾',
  ],
  '🌱 自然': [
    '🌵','🎄','🌲','🌳','🌴','🪵','🌱','🌿','☘️','🍀','🎍','🪴','🎋','🍃','🍂','🍁','🍄','🪸',
    '🌾','💐','🌷','🌹','🥀','🪷','🌺','🌸','🌼','🌻','🌞','🌝','🌛','🌜','🌚','🌕','🌙','🌟',
    '⭐','🌠','🌌','☀️','🌤️','⛅','🌥️','☁️','🌦️','🌧️','⛈️','🌩️','🌨️','❄️','☃️','⛄','🌬️',
    '💨','💧','💦','🫧','🌊','🌈','☂️','⚡','🔥','💫','✨','🌪️','🌫️','🌊','🌀','🌁','🌃','🌄',
    '🌅','🌆','🌇','🌉','🌌','🎆','🎇','🎑','🏔️','⛰️','🌋','🗻','🏕️','🏖️','🏜️','🏝️','🏞️',
  ],
  '🍔 食物': [
    '🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅',
    '🍆','🥑','🥦','🥬','🥒','🫑','🌶️','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚',
    '🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🥪','🥙','🧆','🌮','🌯','🥗',
    '🥘','🫕','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥮','🍢','🧁',
    '🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🧃','🥤','🧋','☕','🍵','🧉',
    '🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧊','🍴','🥄','🫙','🍽️','🥢',
  ],
  '⚽ 活动': [
    '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🏓','🏸','🏒','🥍','🏏','🪃','🥅','⛳',
    '🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤼',
    '🤸','🤺','🤾','🏇','⛹️','🏊','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖️','🎪','🤹','🎭','🩰',
    '🎨','🎬','🎤','🎧','🎼','🎹','🥁','🪘','🎷','🎺','🎸','🪕','🎻','🪈','🎲','♟️','🎯','🎳',
    '🎮','🎰','🧩','🪀','🪆','🪅','🎁','🎀','🎊','🎉','🎋','🎍','🎎','🎏','🎐','🎑','🧨','✨',
    '🎃','🎄','🎆','🎇','🧧','🎈','🎟️','🎫','🎠','🎡','🎢','💈',
  ],
  '💡 物品': [
    '📱','💻','⌨️','🖥️','🖨️','🖱️','💾','💿','📷','📸','📹','🎥','📞','☎️','📺','📻','⌚','⏰',
    '⏱️','⏳','📡','🔋','🔌','💡','🔦','🕯️','🧯','💸','💵','💰','💳','🪙','💎','⚖️','🧲','🔧',
    '🪛','🔩','⚙️','🔗','🧰','🔑','🗝️','🔐','🔒','🔓','🚪','🪞','🛋️','🪑','🚿','🛁','💊','💉',
    '🩸','🩹','🩺','🔭','🔬','🩻','📚','📖','📝','✏️','🖊️','📌','📍','✂️','🗃️','📦','📫','📬',
    '📭','📮','🗳️','✉️','📧','💬','💭','📢','📣','🔔','🔕','🎵','🎶','💤','🔇','🔈','🔉','🔊',
    '📯','🔔','🎺','🎸','🪗','🥁','🪘','🎷','🎻','🪈','📿','🧿','🪬','🔮','🧸','🪆','🖼️',
  ],
  '🔣 符号': [
    '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️','💕','💞','💓','💗',
    '💖','💘','💝','💟','✅','❌','⭕','🛑','⛔','📛','🚫','💯','♨️','🔞','📵','🚭','❗','❕',
    '❓','❔','‼️','⁉️','🔅','🔆','📶','🛜','✅','🔛','🔝','🔜','🔚','🆗','🆙','🆒','🆕','🆓',
    '🔟','🎵','🎶','➕','➖','➗','✖️','♾️','💲','💱','🔱','⚜️','🔰','♻️','❇️','✳️','❎','🌐',
    '💠','🌀','💤','🏧','🚾','♿','🅿️','🚻','🚹','🚺','🛃','🛄','🛅','🛂','⚛️','☢️','☣️',
    '☮️','✝️','☪️','🕉️','☸️','✡️','🛐','⚰️','⚱️','🏴','🏳️','🏁','🚩','🏴‍☠️',
    '🇨🇳','🇺🇸','🇬🇧','🇯🇵','🇰🇷','🇩🇪','🇫🇷','🇧🇷','🇮🇳','🇷🇺','🇸🇬','🇦🇺',
  ],
};

function toggleEmojiPicker(btn, inputEl, idx) {
  const existingId = `ep-${idx}`;
  // close all open pickers
  document.querySelectorAll('.emoji-picker').forEach(p => p.remove());
  // if this one was already open, just close it
  if (document.getElementById(existingId) === null && btn._epOpen) { btn._epOpen = false; return; }
  btn._epOpen = true;

  const picker = document.createElement('div');
  picker.className = 'emoji-picker';
  picker.id = existingId;

  // position with fixed coords relative to the button
  const rect = btn.getBoundingClientRect();
  picker.style.left = Math.min(rect.left, window.innerWidth - 290) + 'px';
  picker.style.top  = (rect.bottom + 6) + 'px';

  const cats = Object.keys(EMOJIS);
  let activeCat = cats[0];

  // Build picker once — tabs are never re-rendered so scroll position is preserved
  picker.innerHTML = `
    <div class="ep-tabs">${cats.map(c=>`<button class="ep-tab${c===activeCat?' active':''}" data-cat="${c}">${c}</button>`).join('')}</div>
    <div class="ep-grid"></div>`;

  const tabsEl = picker.querySelector('.ep-tabs');
  const gridEl = picker.querySelector('.ep-grid');

  function refreshGrid() {
    gridEl.innerHTML = EMOJIS[activeCat].map(e=>`<span class="ep-emoji" title="${e}">${e}</span>`).join('');
    gridEl.querySelectorAll('.ep-emoji').forEach(e => {
      e.addEventListener('mousedown', ev => {
        ev.preventDefault(); ev.stopPropagation();
        insertTextAtCursor(inputEl, e.textContent);
      });
    });
  }

  tabsEl.querySelectorAll('.ep-tab').forEach(t => {
    t.addEventListener('mousedown', e => {
      e.preventDefault(); e.stopPropagation();
      activeCat = t.dataset.cat;
      // Only toggle active class — do NOT rebuild tabs (preserves scrollLeft)
      tabsEl.querySelectorAll('.ep-tab').forEach(tab =>
        tab.classList.toggle('active', tab.dataset.cat === activeCat));
      refreshGrid();
    });
  });

  refreshGrid();
  document.body.appendChild(picker);

  // close on outside click
  setTimeout(() => {
    document.addEventListener('click', function close(e) {
      if (!picker.contains(e.target) && e.target !== btn) {
        picker.remove(); btn._epOpen = false;
        document.removeEventListener('click', close);
      }
    });
  }, 0);
}

// ══ Init ══════════════════════════════════════════════════════════════════════
async function init() {
  // wire sidebar nav
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); navigate(el.dataset.page); });
  });
  // nav group toggle (发推管理 dropdown)
  const navToggle = document.getElementById('nav-group-main');
  const navSub    = document.getElementById('nav-sub-main');
  if (navToggle && navSub) {
    navToggle.classList.add('open');
    navToggle.addEventListener('click', () => {
      const open = navToggle.classList.toggle('open');
      navSub.classList.toggle('hidden', !open);
    });
  }
  // modal close
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
  // load accounts & health
  await loadAccounts();
  updateSidebarHealth();
  navigate('compose');
}

function navigate(page) {
  state.page = page;
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  const main = document.getElementById('main-content');
  main.innerHTML = '<div class="page-loading">加载中…</div>';
  const PAGES = { compose:renderCompose, history:renderHistory, accounts:renderAccounts };
  (PAGES[page] || renderCompose)(main);
}

// ══ Sidebar health ════════════════════════════════════════════════════════════
function updateSidebarHealth() {
  const platforms = ['twitter','telegram','discord','linkedin'];
  const el = document.getElementById('sidebar-health');
  el.innerHTML = platforms.map(p => {
    const accs = state.accounts.filter(a => a.platform === p);
    const hasEnabled = accs.some(a => a.enabled);
    const cls = !accs.length ? 'off' : hasEnabled ? 'ok' : 'off';
    return `<div class="health-row">
      <span class="health-dot ${cls}"></span>
      <span class="health-dot-label">${PLATFORM_ICONS[p]||p} ${accs.length ? `${accs.filter(a=>a.enabled).length}/${accs.length}` : '未配置'}</span>
    </div>`;
  }).join('');
}

async function loadAccounts() {
  try { state.accounts = await api('/api/accounts'); }
  catch { state.accounts = []; }
}

// ══ MODAL ════════════════════════════════════════════════════════════════════
function openModal(title, bodyHtml, onConfirm) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-overlay').classList.remove('hidden');
  if (onConfirm) {
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    footer.innerHTML = `<button class="btn btn-ghost" id="modal-cancel">取消</button>
                        <button class="btn btn-primary" id="modal-confirm">保存</button>`;
    document.getElementById('modal').appendChild(footer);
    document.getElementById('modal-cancel').onclick = closeModal;
    document.getElementById('modal-confirm').onclick = onConfirm;
  }
}
function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('modal-body').innerHTML = '';
  document.querySelector('.modal-footer')?.remove();
  document.getElementById('modal').classList.remove('modal-wide');
}


// ══ COMPOSE ══════════════════════════════════════════════════════════════════
function renderCompose(container) {
  // reset state
  state.cards = [{ text:'', media:[] }];

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">内容编辑</h1>
    </div>
    <div class="compose-layout">
      <div id="cards-col"></div>
      <div id="sidebar-col">
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">发布目标</span>
            <div style="display:flex;gap:5px">
              <button class="btn btn-ghost btn-icon" id="sel-all-btn" title="全选">全选</button>
              <button class="btn btn-ghost btn-icon" id="desel-btn" title="全不选">清空</button>
            </div>
          </div>
          <div style="padding:10px 12px" id="targets-list"></div>
        </div>
        <div class="panel">
          <div class="panel-header"><span class="panel-title">发布时间</span></div>
          <div class="schedule-radios">
            <label class="radio-label">
              <input type="radio" name="sched" value="immediate" checked /> 立即发布
            </label>
            <label class="radio-label">
              <input type="radio" name="sched" value="scheduled" /> 定时发布
            </label>
          </div>
          <input type="datetime-local" class="dt-input hidden" id="sched-dt" />
        </div>
        <button class="btn-preview" id="preview-btn">👁 预览效果</button>
        <button class="btn-publish" id="publish-btn">发布</button>
        <div class="panel hidden" id="result-panel">
          <div class="panel-header"><span class="panel-title">发布结果</span></div>
          <div id="result-summary" style="padding:8px 12px;font-size:.8rem;color:var(--text-2)"></div>
          <div id="result-list"></div>
        </div>
      </div>
    </div>
  `;

  renderTargets();
  renderCards();

  // schedule toggle
  document.querySelectorAll('input[name="sched"]').forEach(r => {
    r.addEventListener('change', () => {
      const isScheduled = document.querySelector('input[name="sched"]:checked').value === 'scheduled';
      document.getElementById('sched-dt').classList.toggle('hidden', !isScheduled);
      document.getElementById('publish-btn').textContent = isScheduled ? '定时发布' : '发布';
    });
  });

  // select / deselect
  document.getElementById('sel-all-btn').addEventListener('click', () => {
    state.selectedAccIds = new Set(state.accounts.filter(a=>a.enabled).map(a=>a.id));
    renderTargets();
  });
  document.getElementById('desel-btn').addEventListener('click', () => {
    state.selectedAccIds.clear(); renderTargets();
  });

  // preview
  document.getElementById('preview-btn').addEventListener('click', () => {
    const selectedAccs = state.accounts.filter(a => state.selectedAccIds.has(a.id));
    showPreviewModal(state.cards, selectedAccs);
  });

  // publish
  document.getElementById('publish-btn').addEventListener('click', doPublish);
}

function renderTargets() {
  const el = document.getElementById('targets-list');
  if (!el) return;
  const enabled = state.accounts.filter(a => a.enabled);
  if (!enabled.length) {
    el.innerHTML = `<div class="empty-state" style="padding:16px">暂无可用账号<br><small>请先在<b>账号配置</b>中添加账号</small></div>`;
    return;
  }
  const grouped = {};
  enabled.forEach(a => { (grouped[a.platform]||=(grouped[a.platform]=[])).push(a); });
  el.innerHTML = Object.entries(grouped).map(([platform, accs]) => `
    <div style="margin-bottom:10px">
      <div class="target-group-label">${PLATFORM_ICONS[platform]||platform} ${cap(platform)}</div>
      ${accs.map(a => `
        <label class="target-item">
          <input type="checkbox" class="acc-cb" value="${a.id}" ${state.selectedAccIds.has(a.id)?'checked':''} />
          <span class="acc-name">${esc(a.name)}</span>
          <span class="lang-tag">${(LANG_LABELS[a.lang]||a.lang).toUpperCase()}</span>
        </label>`).join('')}
    </div>`).join('');

  el.querySelectorAll('.acc-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) state.selectedAccIds.add(cb.value);
      else state.selectedAccIds.delete(cb.value);
    });
  });
}

// ── Tweet Cards ───────────────────────────────────────────────────────────────
function renderCards() {
  const col = document.getElementById('cards-col');
  if (!col) return;
  // clean up selectionchange listeners from previous cards
  col.querySelectorAll('.composer-input').forEach(el => el._cleanup?.());
  col.innerHTML = '';

  state.cards.forEach((card, idx) => {
    if (idx > 0) {
      const conn = document.createElement('div');
      conn.className = 'thread-connector';
      col.appendChild(conn);
    }
    const cardEl = makeCard(card, idx);
    col.appendChild(cardEl);
    // Auto-resize textarea AFTER DOM insertion so scrollHeight is accurate
    const inp = cardEl.querySelector('.composer-input');
    if (inp && inp.value) { inp.style.height = 'auto'; inp.style.height = inp.scrollHeight + 'px'; }
  });

  // add-card button
  const addBtn = document.createElement('button');
  addBtn.className = 'btn-add-card';
  addBtn.textContent = '＋ 添加串推推文';
  addBtn.addEventListener('click', () => {
    state.cards.push({ text:'', media:[] });
    renderCards();
  });
  col.appendChild(addBtn);
}

function makeCard(card, idx) {
  const wrap = document.createElement('div');
  wrap.className = 'tweet-card';

  const canRemove = state.cards.length > 1;
  const isLast    = idx === state.cards.length - 1;
  const placeholder = idx === 0
    ? '有什么新鲜事？用英文输入，AI 自动翻译发布…'
    : '继续这条话题…';

  wrap.innerHTML = `
    <div class="tc-row">
      <div class="tc-avatar-col">
        <div class="tc-avatar">C</div>
        ${!isLast ? '<div class="tc-thread-line"></div>' : ''}
      </div>
      <div class="tc-content">
        <div class="composer-area">
          <div class="composer-highlight" id="hl-${idx}"></div>
          <textarea class="composer-input" id="inp-${idx}"
                    placeholder="${placeholder}" rows="3"></textarea>
        </div>
        <div class="tw-toolbar">
          <div class="tw-actions">
            <button class="tw-btn media-btn" title="图片/视频">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 5.5C3 4.12 4.12 3 5.5 3h13C19.88 3 21 4.12 21 5.5v13c0 1.38-1.12 2.5-2.5 2.5h-13C4.12 21 3 19.88 3 18.5v-13zM5.5 5c-.28 0-.5.22-.5.5v9.09l3-3 3 3 5-5 3 3V5.5c0-.28-.22-.5-.5-.5h-13zM19 15.41l-3-3-5 5-3-3-3 3V18.5c0 .28.22.5.5.5h13c.28 0 .5-.22.5-.5v-3.09zM9.75 7C8.78 7 8 7.78 8 8.75s.78 1.75 1.75 1.75S11.5 9.72 11.5 8.75 10.72 7 9.75 7z"/>
              </svg>
            </button>
            <button class="tw-btn gif-btn" title="GIF">
              <span class="tw-btn-label">GIF</span>
            </button>
            <button class="tw-btn emoji-btn" title="表情">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 9.5C8 8.12 8.67 7 9.5 7S11 8.12 11 9.5 10.33 12 9.5 12 8 10.88 8 9.5zm6.5 0c0-1.38.67-2.5 1.5-2.5s1.5 1.12 1.5 2.5-.67 2.5-1.5 2.5-1.5-1.12-1.5-2.5zM12 16c-2.22 0-4.06-1.3-4.79-3H7c.77 2.28 2.9 4 5 4s4.23-1.72 5-4h-.21C16.06 14.7 14.22 16 12 16z"/>
                <path d="M12 22.25C6.35 22.25 1.75 17.65 1.75 12S6.35 1.75 12 1.75 22.25 6.35 22.25 12 17.65 22.25 12 22.25zm0-18.5c-4.55 0-8.25 3.7-8.25 8.25s3.7 8.25 8.25 8.25 8.25-3.7 8.25-8.25S16.55 3.75 12 3.75z"/>
              </svg>
            </button>
            <div class="tw-divider"></div>
            <button class="tw-fmt-btn bold-btn"   title="加粗 (选中后点)"><b>B</b></button>
            <button class="tw-fmt-btn italic-btn" title="斜体"><i>I</i></button>
            <button class="tw-fmt-btn strike-btn" title="删除线"><s>S</s></button>
          </div>
          <div class="tw-right">
            <div class="cc-ring-wrap" id="cc-${idx}">${circleCounter(0, 280)}</div>
            ${canRemove ? `<div class="tw-divider"></div><button class="btn-rm-card" title="删除此推文">✕</button>` : ''}
          </div>
        </div>
        <input type="file" class="hidden media-input"
               accept="image/jpeg,image/png,image/gif,image/webp,video/mp4" multiple />
        <input type="file" class="hidden gif-input" accept="image/gif" />
      </div>
    </div>
  `;

  const input   = wrap.querySelector(`#inp-${idx}`);
  const hl      = wrap.querySelector(`#hl-${idx}`);
  const counter = wrap.querySelector(`#cc-${idx}`);

  function autoResize() {
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
  }

  if (card.text) { input.value = card.text; syncHighlight(input, hl, counter); }

  input.addEventListener('input', () => {
    card.text = getPlainText(input);
    autoResize();
    syncHighlight(input, hl, counter);
  });

  input.addEventListener('paste', e => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    insertTextAtCursor(input, text);
  });

  // Format button active-state refresh
  const boldBtn   = wrap.querySelector('.bold-btn');
  const italicBtn = wrap.querySelector('.italic-btn');
  const strikeBtn = wrap.querySelector('.strike-btn');

  function refreshFmtBtns() {
    const fs = getFormatState(input);
    boldBtn.classList.toggle('active', fs.bold);
    italicBtn.classList.toggle('active', fs.italic);
    strikeBtn.classList.toggle('active', fs.strike);
  }

  // selectionchange fires whenever cursor moves or selection changes
  function onSelChange() {
    if (document.activeElement === input) refreshFmtBtns();
  }
  document.addEventListener('selectionchange', onSelChange);
  // store cleanup so renderCards can remove it when re-rendering
  input._cleanup = () => document.removeEventListener('selectionchange', onSelChange);

  // format buttons (B / I / S)
  boldBtn.addEventListener('mousedown',   e => { e.preventDefault(); applyFormat(input, 'bold');   refreshFmtBtns(); });
  italicBtn.addEventListener('mousedown', e => { e.preventDefault(); applyFormat(input, 'italic'); refreshFmtBtns(); });
  strikeBtn.addEventListener('mousedown', e => { e.preventDefault(); applyFormat(input, 'strike'); refreshFmtBtns(); });

  // emoji picker
  const emojiBtn = wrap.querySelector('.emoji-btn');
  emojiBtn.addEventListener('click', e => { e.stopPropagation(); toggleEmojiPicker(emojiBtn, input, idx); });

  // media button
  const mediaBtn   = wrap.querySelector('.media-btn');
  const mediaInput = wrap.querySelector('.media-input');
  mediaBtn.addEventListener('click', () => mediaInput.click());
  mediaInput.addEventListener('change', () => handleMediaUpload(mediaInput, idx));

  // GIF button
  const gifBtn   = wrap.querySelector('.gif-btn');
  const gifInput = wrap.querySelector('.gif-input');
  gifBtn.addEventListener('click', () => gifInput.click());
  gifInput.addEventListener('change', () => handleMediaUpload(gifInput, idx));

  // remove card
  wrap.querySelector('.btn-rm-card')?.addEventListener('click', () => {
    state.cards.splice(idx, 1);
    renderCards();
  });

  if (card.media.length) renderMediaGrid(wrap, card, idx);

  return wrap;
}

function getPlainText(el) { return el.value || ''; }

function syncHighlight(input, hl, counter) {
  const raw = getPlainText(input);
  const html = esc(raw)
    // Strikethrough: sequences of (char + U+0336) → <span class="token-strike">
    .replace(/([^\u0336\n]\u0336)+/g, m => `<span class="token-strike">${m.replace(/\u0336/g, '')}</span>`)
    .replace(/(#[\w\u4e00-\u9fff]+)/g, '<span class="token-hashtag">$1</span>')
    .replace(/(@\w+)/g, '<span class="token-mention">$1</span>')
    .replace(/(https?:\/\/[^\s<>&]+)/g, '<span class="token-url">$1</span>');
  hl.innerHTML = html;
  // For char count: strip combining chars so they don't inflate the count
  const displayRaw = raw.replace(/\u0336/g, '');
  const len = tweetLen(displayRaw);
  counter.innerHTML = circleCounter(len, 280);
}

function renderMediaGrid(wrap, card, idx) {
  let mg = wrap.querySelector(`#mg-${idx}`);
  if (!mg) {
    mg = document.createElement('div');
    mg.className = 'media-grid';
    mg.id = `mg-${idx}`;
    wrap.querySelector('.tw-toolbar').before(mg);
  }
  mg.innerHTML = card.media.map((m, mi) => {
    const isVideo = m.type?.startsWith('video') || m.url?.match(/\.(mp4|mov|webm)$/i);
    const preview = isVideo
      ? `<video src="${esc(m.url)}" muted playsinline preload="metadata" class="media-thumb-video"></video>`
      : `<img src="${esc(m.url)}" alt="media" />`;
    return `<div class="media-thumb">
      ${preview}
      ${isVideo ? '<span class="media-thumb-badge">▶</span>' : ''}
      <button class="media-thumb-remove" data-mi="${mi}">✕</button>
    </div>`;
  }).join('');
  mg.querySelectorAll('.media-thumb-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      card.media.splice(Number(btn.dataset.mi), 1);
      renderCards();
    });
  });
}

async function handleMediaUpload(input, idx) {
  const files = [...input.files];
  for (const file of files) {
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await fetch('/api/upload', { method:'POST', body:fd });
      if (!r.ok) throw new Error((await r.json()).detail);
      const data = await r.json();
      state.cards[idx].media.push({ url:data.url, type:file.type });
    } catch (e) { alert(`上传失败: ${e.message}`); }
  }
  renderCards();
  input.value = '';
}

async function doPublish() {
  const accIds = [...state.selectedAccIds];
  if (!accIds.length) { alert('请至少选择一个发布账号'); return; }
  if (state.cards.every(c => !c.text.trim())) { alert('请先填写推文内容'); return; }

  const isScheduled = document.querySelector('input[name="sched"]:checked').value === 'scheduled';
  let scheduledAt = null;
  if (isScheduled) {
    const v = document.getElementById('sched-dt').value;
    if (!v) { alert('请选择发布时间'); return; }
    scheduledAt = new Date(v).toISOString();
  }

  const btn = document.getElementById('publish-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    const result = await api('/api/publish', {
      method:'POST',
      body: JSON.stringify({ cards:state.cards.map(c=>({text:c.text,media_urls:c.media.map(m=>m.url)})),
                             account_ids: accIds, scheduled_at: scheduledAt }),
    });
    showPublishResult(result);
  } catch(e) {
    alert(`发布失败: ${e.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = isScheduled ? '定时发布' : '发布';
  }
}

function showPublishResult(data) {
  const panel   = document.getElementById('result-panel');
  const summary = document.getElementById('result-summary');
  const list    = document.getElementById('result-list');
  panel.classList.remove('hidden');
  panel.scrollIntoView({ behavior:'smooth', block:'nearest' });

  if (data.mode === 'scheduled') {
    summary.textContent = `✅ 已安排定时发布 · ${fmtTime(data.scheduled_at)}`;
    list.innerHTML = '';
    return;
  }

  summary.innerHTML = `<span style="color:var(--success)">${data.succeeded} 成功</span>`
    + (data.failed ? ` · <span style="color:var(--error)">${data.failed} 失败</span>` : '')
    + ` · 共 ${data.total}`;

  list.innerHTML = '';
  for (const r of (data.results||[])) {
    const acc = state.accounts.find(a=>a.id===r.account_id);
    const icon = PLATFORM_ICONS[acc?.platform]||'•';
    const row = document.createElement('div');
    row.className = `result-row ${r.success?'ok':'err'}`;
    row.innerHTML = `<span>${icon}</span>
      <span class="r-name">${esc(r.account_name||acc?.name||r.account_id)}</span>
      <span>${r.success?'✅':'❌'}</span>
      ${r.success&&r.url?`<span class="r-link"><a href="${r.url}" target="_blank" rel="noopener">查看 ↗</a></span>`:''}
      ${!r.success&&r.error?`<span class="r-err" title="${esc(r.error)}">${esc(r.error)}</span>`:''}`;
    list.appendChild(row);
  }
}

// ══ PREVIEW MODAL ════════════════════════════════════════════════════════════
function showPreviewModal(cards, selectedAccs) {
  const cardTexts = cards.map(c => c.text || '');
  const cardMedia = cards.map(c => c.media || []);
  const hasContent = cardTexts.some(t => t.trim());

  // Determine which platforms are selected
  const platforms = ['twitter','telegram','discord'];
  const activePlatforms = platforms.filter(p => selectedAccs.some(a => a.platform === p));
  const showPlatforms = activePlatforms.length ? activePlatforms : platforms;

  /** Return an <img> or <video> element for a media object, without any cropping */
  function previewMediaEl(m, cls = 'preview-media') {
    const isVideo = m.type?.startsWith('video') || m.url?.match(/\.(mp4|mov|webm)$/i);
    if (isVideo) {
      return `<video class="${cls}" src="${esc(m.url)}" muted playsinline preload="metadata"></video>`;
    }
    return `<img class="${cls}" src="${esc(m.url)}" loading="lazy" />`;
  }

  function renderTwitter() {
    if (!hasContent) return `<div class="preview-empty">请先输入推文内容</div>`;
    const threads = cardTexts.map((text, i) => {
      const media = cardMedia[i];
      const mediaHtml = media.length ? `
        <div class="tw-media-grid ${media.length === 1 ? 'one' : 'two'}">
          ${media.slice(0, 4).map(m => previewMediaEl(m, 'tw-preview-media')).join('')}
        </div>` : '';
      return `<div class="tw-thread-item">
        <div class="tw-body">${esc(text)}</div>
        ${mediaHtml}
      </div>`;
    }).join('');

    return `<div class="tw-card">
      <div class="tw-header">
        <div class="tw-avatar">◈</div>
        <div>
          <div class="tw-name">Codatta <span class="tw-verified">✓</span></div>
          <div class="tw-handle">@codatta_io</div>
        </div>
      </div>
      ${threads}
      <div class="tw-footer">
        <span>💬 Reply</span>
        <span>🔁 Repost</span>
        <span>❤️ Like</span>
        <span>🔖 Bookmark</span>
      </div>
    </div>`;
  }

  function renderTelegram() {
    if (!hasContent) return `<div class="preview-empty">请先输入内容</div>`;

    // Telegram typically joins thread as one message
    const allText = cardTexts.filter(t=>t.trim()).join('\n──────────\n');
    const allMedia = cardMedia.find(m => m.length) || [];
    const mediaHtml = allMedia.length
      ? `<div class="tg-media">${previewMediaEl(allMedia[0], 'tg-preview-media')}</div>` : '';

    return `<div class="tg-container">
      <div class="tg-header">
        <div class="tg-avatar">✈</div>
        <div>
          <div class="tg-name">Codatta Official</div>
          <div class="tg-status">online</div>
        </div>
      </div>
      ${mediaHtml}
      <div class="tg-bubble">${esc(allText)}</div>
      <div class="tg-time">now · ✓✓</div>
    </div>`;
  }

  function renderDiscord() {
    if (!hasContent) return `<div class="preview-empty">请先输入内容</div>`;
    const allText = cardTexts.filter(t=>t.trim()).join('\n\n');
    const allMedia = cardMedia.find(m => m.length) || [];
    const mediaHtml = allMedia.length
      ? `<div class="dc-embed-media">${previewMediaEl(allMedia[0], 'dc-preview-media')}</div>` : '';

    return `<div class="dc-container">
      <div class="dc-header">
        <div class="dc-avatar">◈</div>
        <span class="dc-bot-name">Codatta</span>
        <span class="dc-badge">BOT</span>
      </div>
      <div class="dc-embed">
        ${esc(allText)}
        ${mediaHtml}
      </div>
      <div class="dc-footer-bar">
        <span class="dc-react">👍 React</span>
        <span class="dc-react">💬 Thread</span>
      </div>
    </div>`;
  }

  const PLATFORM_LABELS = { twitter:'𝕏 Twitter', telegram:'✈️ Telegram', discord:'💬 Discord' };
  const RENDER_FNS = { twitter:renderTwitter, telegram:renderTelegram, discord:renderDiscord };

  const tabsHtml = showPlatforms.map((p, i) =>
    `<button class="preview-tab${i===0?' active':''}" data-plat="${p}">${PLATFORM_LABELS[p]||p}</button>`
  ).join('');

  const panesHtml = showPlatforms.map((p, i) =>
    `<div class="preview-pane${i===0?' active':''}" data-plat="${p}">${RENDER_FNS[p]?.() || ''}</div>`
  ).join('');

  const body = `
    <div class="preview-tabs">${tabsHtml}</div>
    <div class="preview-panes">${panesHtml}</div>`;

  // Use wider modal
  document.getElementById('modal').classList.add('modal-wide');
  openModal('预览效果', body);

  // Force video first-frame on all preview videos
  requestAnimationFrame(() => {
    document.querySelectorAll('.preview-pane video').forEach(v => {
      v.currentTime = 0.001;
    });
  });

  // Tab switching
  document.querySelectorAll('.preview-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.preview-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.preview-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.querySelector(`.preview-pane[data-plat="${tab.dataset.plat}"]`)?.classList.add('active');
      // Also trigger first-frame on newly visible videos
      document.querySelectorAll(`.preview-pane[data-plat="${tab.dataset.plat}"] video`).forEach(v => {
        v.currentTime = 0.001;
      });
    });
  });
}

// ══ HISTORY ══════════════════════════════════════════════════════════════════
async function renderHistory(container) {
  let activeTab = 'published';
  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">发布历史</h1>
      <button class="btn btn-ghost" id="refresh-history">刷新</button>
    </div>
    <div class="panel">
      <div class="history-tabs">
        <button class="history-tab active" data-tab="published">已发布</button>
        <button class="history-tab" data-tab="scheduled">定时发布</button>
      </div>
      <div id="history-list"><div class="empty-state">加载中…</div></div>
    </div>`;

  document.getElementById('refresh-history').addEventListener('click', () => loadHistory(activeTab));

  document.querySelectorAll('.history-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.history-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.tab;
      loadHistory(activeTab);
    });
  });

  loadHistory(activeTab);
}

async function loadHistory(tab = 'published') {
  const el = document.getElementById('history-list');
  if (!el) return;


  try {
    const allItems = await api('/api/history');
    const items = tab === 'scheduled'
      ? allItems.filter(p => p.status === 'scheduled')
      : allItems.filter(p => ['published','partial_failure','failed'].includes(p.status));

    if (!items.length) {
      el.innerHTML = `<div class="empty-state">${tab === 'scheduled' ? '暂无定时发布任务' : '暂无发布记录'}</div>`;
      return;
    }

    el.innerHTML = items.map(p => {
      const isScheduled = p.status === 'scheduled';
      const failedIds = (p.results||[]).filter(r=>!r.success).map(r=>r.account_id);

      // For published posts: show result chips; for scheduled: show target account chips
      let chips;
      if (isScheduled) {
        chips = (p.account_ids||[]).map(id => {
          const acc = state.accounts.find(a => a.id === id);
          const icon = PLATFORM_ICONS[acc?.platform] || '•';
          return `<span class="chip pending">${icon} ${esc(acc?.name || id)}</span>`;
        }).join('');
      } else {
        chips = (p.results||[]).map(r => {
          const acc = state.accounts.find(a=>a.id===r.account_id);
          const icon = PLATFORM_ICONS[acc?.platform]||'•';
          const label = `${icon} ${esc(r.account_name||acc?.name||r.account_id)}`;
          return `<span class="chip ${r.success?'ok':'fail'}">${r.success&&r.url?`<a href="${r.url}" target="_blank">${label}</a>`:label}</span>`;
        }).join('');
      }

      // Determine the right time display
      const wasScheduled = !!p.scheduled_at;
      // Earliest actual publish time across results
      const publishedAt = (p.results||[])
        .map(r => r.published_at).filter(Boolean).sort()[0];

      let timeSectionHtml;
      if (isScheduled) {
        // Still pending — show target time
        timeSectionHtml = `<span class="history-time scheduled-pending">⏰ 预计 ${fmtTime(p.scheduled_at)}</span>`;
      } else if (wasScheduled && publishedAt) {
        // Was scheduled, now published — show both actual send time and edit time
        timeSectionHtml = `
          <div class="history-time-block">
            <span class="history-time-main">发送 ${fmtTime(publishedAt)}</span>
            <span class="history-time-sub">编辑 ${fmtTime(p.created_at)}</span>
          </div>`;
      } else {
        // Immediate publish — just show created_at (≈ publish time)
        timeSectionHtml = `<span class="history-time">${fmtTime(p.created_at)}</span>`;
      }

      // Status badge — add "定时" marker for posts that originated from a schedule
      const statusLabel = {published:'成功',partial_failure:'部分失败',failed:'失败',scheduled:'定时'}[p.status] || p.status;
      const schedBadge = wasScheduled && !isScheduled
        ? `<span class="status-badge-sched">⏰ 定时发送</span>` : '';

      return `<div class="history-item">
        <div class="history-meta">
          <span class="history-preview">${esc(p.preview||'(无内容)')}</span>
          <div class="history-meta-right">
            <span class="status-badge ${p.status}">${statusLabel}</span>
            ${schedBadge}
            ${timeSectionHtml}
          </div>
        </div>
        <div class="history-chips">${chips}</div>
        ${isScheduled ? `<div class="history-actions">
          <button class="btn btn-ghost" style="font-size:.75rem;padding:4px 10px;color:var(--error)" data-cancel="${p.id}">✕ 取消定时</button>
        </div>` : (failedIds.length?`<div class="history-actions">
          <button class="btn btn-ghost" style="font-size:.75rem;padding:4px 10px" data-retry="${p.id}">🔁 重试失败项</button>
        </div>`:'')}
      </div>`;
    }).join('');

    el.querySelectorAll('[data-retry]').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true; btn.textContent = '重试中…';
        try {
          await api(`/api/history/${btn.dataset.retry}/retry`, {method:'POST'});
          loadHistory(tab);
        } catch(e) { alert(`重试失败: ${e.message}`); btn.disabled=false; btn.textContent='🔁 重试失败项'; }
      });
    });

    el.querySelectorAll('[data-cancel]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('确认取消此定时发送任务？此操作不可撤销。')) return;
        btn.disabled = true; btn.textContent = '取消中…';
        try {
          await api(`/api/history/${btn.dataset.cancel}`, {method:'DELETE'});
          loadHistory(tab);
        } catch(e) { alert(`取消失败: ${e.message}`); btn.disabled=false; btn.textContent='✕ 取消定时'; }
      });
    });
  } catch(e) {
    el.innerHTML = `<div class="empty-state" style="color:var(--error)">加载失败: ${esc(e.message)}</div>`;
  }
}

// ══ ACCOUNTS ═════════════════════════════════════════════════════════════════
function renderAccounts(container) {
  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">账号配置</h1>
      <button class="btn btn-primary" id="add-acc-btn">＋ 添加账号</button>
    </div>
    <div class="panel">
      <div id="accounts-table-wrap"></div>
    </div>`;
  document.getElementById('add-acc-btn').addEventListener('click', () => showAccountModal(null));
  renderAccountsTable();
}

function renderAccountsTable() {
  const wrap = document.getElementById('accounts-table-wrap');
  if (!wrap) return;
  if (!state.accounts.length) {
    wrap.innerHTML = '<div class="empty-state">暂无账号，点击右上角添加</div>';
    return;
  }
  wrap.innerHTML = `
    <table class="accounts-table">
      <thead><tr>
        <th>名称</th><th>平台</th><th>默认语言</th><th>状态</th><th>操作</th>
      </tr></thead>
      <tbody>
        ${state.accounts.map(a => `<tr>
          <td style="font-weight:600">${esc(a.name)}</td>
          <td><span class="platform-badge ${a.platform}">${PLATFORM_ICONS[a.platform]||''} ${cap(a.platform)}</span></td>
          <td><span class="lang-tag">${(LANG_LABELS[a.lang]||a.lang).toUpperCase()}</span></td>
          <td>
            <button class="status-pill ${a.enabled?'enabled':'disabled'}" data-id="${a.id}"
                    title="${a.enabled?'点击禁用':'点击启用'}">
              <span class="status-dot"></span>
              ${a.enabled ? '已启用' : '已停用'}
            </button>
          </td>
          <td style="display:flex;gap:6px;align-items:center">
            <button class="btn btn-ghost btn-icon edit-btn" data-id="${a.id}">编辑</button>
            <button class="btn btn-danger btn-icon del-btn" data-id="${a.id}">删除</button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>`;

  wrap.querySelectorAll('.status-pill').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        const updated = await api(`/api/accounts/${btn.dataset.id}/toggle`, {method:'PATCH'});
        const idx = state.accounts.findIndex(a=>a.id===btn.dataset.id);
        if (idx>=0) state.accounts[idx] = updated;
        updateSidebarHealth();
        renderAccountsTable();
      } catch(e) { alert(e.message); }
    });
  });

  wrap.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const acc = state.accounts.find(a=>a.id===btn.dataset.id);
      if (acc) showAccountModal(acc);
    });
  });

  wrap.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('确定删除该账号？')) return;
      try {
        await api(`/api/accounts/${btn.dataset.id}`, {method:'DELETE'});
        state.accounts = state.accounts.filter(a=>a.id!==btn.dataset.id);
        updateSidebarHealth();
        renderAccountsTable();
      } catch(e) { alert(e.message); }
    });
  });
}

function showAccountModal(acc) {
  const isEdit = !!acc;
  const platform = acc?.platform || 'twitter';

  const credFields = {
    twitter: [
      {key:'api_key',label:'API Key'},
      {key:'api_secret',label:'API Secret'},
      {key:'access_token',label:'Access Token'},
      {key:'access_secret',label:'Access Token Secret'},
    ],
    telegram: [
      {key:'bot_token',label:'Bot Token'},
      {key:'chat_id',label:'Chat ID（群组/频道 ID）'},
      {key:'thread_id',label:'Topic ID（可选，群内指定话题）', placeholder:'留空则发到群主频道'},
    ],
    discord: [
      {key:'webhook_url',label:'Webhook URL'},
    ],
    linkedin: [
      {key:'access_token',label:'Access Token（OAuth 2.0 Bearer）'},
      {key:'person_id',label:'Person ID（成员数字 ID）'},
      {key:'organization_id',label:'Organization ID（公司主页 ID，可选）'},
    ],
  };

  function buildCredHtml(plat, creds={}) {
    return (credFields[plat]||[]).map(f => `
      <div class="form-group">
        <label class="form-label">${f.label}</label>
        <input class="form-input cred-field" type="password" data-key="${f.key}"
               value="${esc(creds[f.key]||'')}" placeholder="${esc(f.placeholder||f.label+'…')}" />
      </div>`).join('');
  }

  const langOptions = ['en','zh','ko'].map(l =>
    `<option value="${l}" ${(acc?.lang||'en')===l?'selected':''}>${{en:'English (英文)',zh:'中文',ko:'한국어 (韩文)'}[l]}</option>`
  ).join('');

  const body = `
    <div class="form-group">
      <label class="form-label">账号名称</label>
      <input class="form-input" id="acc-name" type="text" value="${esc(acc?.name||'')}" placeholder="例：Codatta English" />
    </div>
    <div class="form-group">
      <label class="form-label">平台</label>
      <select class="form-select" id="acc-platform" ${isEdit?'disabled':''}>
        <option value="twitter"   ${platform==='twitter'  ?'selected':''}>𝕏 Twitter</option>
        <option value="telegram"  ${platform==='telegram' ?'selected':''}>✈️ Telegram</option>
        <option value="discord"   ${platform==='discord'  ?'selected':''}>💬 Discord</option>
        <option value="linkedin"  ${platform==='linkedin' ?'selected':''}>in LinkedIn</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">默认语言</label>
      <select class="form-select" id="acc-lang">${langOptions}</select>
      <div class="form-hint">发布时内容将自动翻译为该语言</div>
    </div>
    <div class="form-section-title">账号凭证</div>
    <div id="cred-fields">${buildCredHtml(platform, acc?.credentials||{})}</div>
  `;

  openModal(isEdit ? '编辑账号' : '添加账号', body, async () => {
    const name     = document.getElementById('acc-name').value.trim();
    const platVal  = document.getElementById('acc-platform').value;
    const lang     = document.getElementById('acc-lang').value;
    if (!name) { alert('请填写账号名称'); return; }

    const creds = {};
    document.querySelectorAll('.cred-field').forEach(el => {
      if (el.value.trim()) creds[el.dataset.key] = el.value.trim();
    });

    try {
      if (isEdit) {
        const updated = await api(`/api/accounts/${acc.id}`, {
          method:'PUT', body:JSON.stringify({name,lang,credentials:creds}),
        });
        const idx = state.accounts.findIndex(a=>a.id===acc.id);
        if (idx>=0) state.accounts[idx] = updated;
      } else {
        const created = await api('/api/accounts', {
          method:'POST', body:JSON.stringify({name,platform:platVal,lang,credentials:creds}),
        });
        state.accounts.push(created);
      }
      updateSidebarHealth();
      renderAccountsTable();
      closeModal();
    } catch(e) { alert(`保存失败: ${e.message}`); }
  });

  // re-render cred fields when platform changes
  document.getElementById('acc-platform')?.addEventListener('change', e => {
    document.getElementById('cred-fields').innerHTML = buildCredHtml(e.target.value, {});
  });
}

// ══ Bootstrap ═════════════════════════════════════════════════════════════════
init();
