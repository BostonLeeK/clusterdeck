const ANIMALS = [
  "Fox",
  "Otter",
  "Panda",
  "Koala",
  "Owl",
  "Lynx",
  "Hare",
  "Seal",
  "Deer",
  "Wolf",
  "Bear",
  "Cat",
  "Dog",
  "Bird",
  "Whale",
  "Tiger",
] as const;

const PALETTES = [
  ["#5963fa", "#a5b4fc", "#312e81"],
  ["#059669", "#6ee7b7", "#064e3b"],
  ["#db2777", "#f9a8d4", "#831843"],
  ["#ea580c", "#fdba74", "#7c2d12"],
  ["#0891b2", "#67e8f9", "#164e63"],
  ["#7c3aed", "#c4b5fd", "#4c1d95"],
  ["#ca8a04", "#fde047", "#713f12"],
  ["#e11d48", "#fda4af", "#881337"],
] as const;

const STORAGE_KEY = "clusterdeck:guest-identity";

export type GuestIdentity = {
  id: string;
  name: string;
  image: string;
  color: string;
};

function hashSeed(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash);
}

function svgAvatar(seed: string) {
  const hash = hashSeed(seed);
  const [bg, mid, dark] = PALETTES[hash % PALETTES.length]!;
  const ear = 10 + (hash % 8);
  const eye = 3 + (hash % 3);
  const smile = 4 + (hash % 5);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="32" fill="${bg}"/>
    <circle cx="20" cy="${22 - ear / 4}" r="${ear}" fill="${dark}"/>
    <circle cx="44" cy="${22 - ear / 4}" r="${ear}" fill="${dark}"/>
    <circle cx="32" cy="34" r="22" fill="${mid}"/>
    <circle cx="24" cy="32" r="${eye}" fill="${dark}"/>
    <circle cx="40" cy="32" r="${eye}" fill="${dark}"/>
    <ellipse cx="32" cy="40" rx="4" ry="3" fill="${dark}" opacity="0.55"/>
    <path d="M${28 - smile / 2} ${46} Q32 ${46 + smile} ${36 + smile / 2} 46" fill="none" stroke="${dark}" stroke-width="2.2" stroke-linecap="round"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function guestIdentityFromSeed(seed: string): GuestIdentity {
  const hash = hashSeed(seed);
  const animal = ANIMALS[hash % ANIMALS.length]!;
  const palette = PALETTES[hash % PALETTES.length]!;
  return {
    id: `guest:${seed}`,
    name: `Anonymous ${animal}`,
    image: svgAvatar(seed),
    color: palette[0],
  };
}

export function getOrCreateGuestIdentity(): GuestIdentity {
  if (typeof window === "undefined") {
    return guestIdentityFromSeed("ssr");
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GuestIdentity;
      if (parsed?.id && parsed?.name && parsed?.image) return parsed;
    }
  } catch {
    /* ignore */
  }
  const seed =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const identity = guestIdentityFromSeed(seed);
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  } catch {
    /* ignore */
  }
  return identity;
}

export function isGuestUser(user: { id?: string | null; name?: string | null }) {
  return !user.id || user.id.startsWith("guest:");
}
