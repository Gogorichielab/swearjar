const ADJECTIVES = [
  'BOLD', 'CALM', 'DARK', 'DEEP', 'FAST', 'FIRM', 'FLAT', 'GOLD',
  'GRAY', 'KEEN', 'KIND', 'LUSH', 'MILD', 'MINT', 'NEAT', 'PALE',
  'PINK', 'PURE', 'RARE', 'RICH', 'SAFE', 'SAGE', 'SHARP', 'SLIM',
  'SLOW', 'SOFT', 'STARK', 'STILL', 'SWIFT', 'TEAL', 'TRIM', 'TRUE',
  'WARM', 'WIDE', 'WILD', 'WISE', 'ZEAL', 'AZURE', 'BRISK', 'CIVIC',
  'CRISP', 'DUSK', 'FRESH', 'GRAND', 'PRIME'
];

const NOUNS = [
  'JAR', 'CUP', 'BOX', 'TAB', 'LOG', 'TIN', 'BAG', 'BIN', 'CAP',
  'DEN', 'DOT', 'GEM', 'HUB', 'INK', 'KEY', 'LAB', 'MAP', 'NET',
  'OAK', 'PAD', 'PEG', 'PIT', 'POD', 'RAY', 'RIG', 'ROD', 'RUN',
  'SET', 'TAG', 'TAP', 'TIP', 'TON', 'TOY', 'CASK', 'CHIP', 'COIN',
  'DECK', 'DISK', 'DROP', 'DRUM'
];

const STORAGE_KEY = 'swearjar:userId';

export function generateCode() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = String(Math.floor(Math.random() * 9000) + 1000);
  return `${adj}-${noun}-${num}`;
}

export function normalizeCode(raw) {
  return raw.trim().toUpperCase().replace(/\s+/g, '-');
}

export function isValidCode(code) {
  return /^[A-Z]{2,8}-[A-Z]{2,8}-\d{4}$/.test(code);
}

export function loadSessionId() {
  return localStorage.getItem(STORAGE_KEY);
}

export function saveSessionId(id) {
  localStorage.setItem(STORAGE_KEY, id);
}

export function clearSessionId() {
  localStorage.removeItem(STORAGE_KEY);
}
