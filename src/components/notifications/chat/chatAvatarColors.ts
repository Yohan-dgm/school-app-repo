// Deterministic avatar color assignment — the same chat/group name always
// resolves to the same color, and different chats are visually distinct,
// matching how WhatsApp/Telegram/Signal give each contact a stable color
// instead of one flat color for every avatar. Palette stays in the app's
// existing blue-led Tailwind family (no new brand color introduced).

export interface AvatarColor {
  bg: string;
  text: string;
}

const PALETTE: AvatarColor[] = [
  { bg: "#DBEAFE", text: "#2563EB" }, // blue
  { bg: "#E0E7FF", text: "#4F46E5" }, // indigo
  { bg: "#CCFBF1", text: "#0D9488" }, // teal
  { bg: "#EDE9FE", text: "#7C3AED" }, // violet
  { bg: "#FCE7F3", text: "#DB2777" }, // pink
  { bg: "#FFEDD5", text: "#EA580C" }, // orange
  { bg: "#D1FAE5", text: "#059669" }, // green
  { bg: "#E0F2FE", text: "#0284C7" }, // sky
];

export const getAvatarColor = (seed?: string | null): AvatarColor => {
  if (!seed) return PALETTE[0];

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
};

export default { getAvatarColor };
