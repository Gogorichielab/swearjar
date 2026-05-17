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

// Uniformly distributed integer in [0, max) using a CSPRNG. Rejection
// sampling avoids the modulo bias that Math.random() + modulo would
// introduce — important because the wordlists are small and any bias
// would shrink the effective keyspace.
function secureRandomInt(max) {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  let value;
  do {
    crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= limit);
  return value % max;
}

export function generateCode() {
  const adj = ADJECTIVES[secureRandomInt(ADJECTIVES.length)];
  const noun = NOUNS[secureRandomInt(NOUNS.length)];
  const num = String(secureRandomInt(9000) + 1000);
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


