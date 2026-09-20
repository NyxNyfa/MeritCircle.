/**
 * Merit Circle Design Tokens
 * Extracted directly from official design specifications
 */

export const color = {
  background: {
    app: "#10131C",
    surface: "#0B0E17",
    card: "#141824",
    cardElevated: "#1B2030",
    modalOverlay: "rgba(11, 14, 23, 0.85)",
  },
  brand: {
    primary: "#4D8EFF",
    primaryGlow: "#7BD0FF",
    primaryDark: "#3131C0",
    primaryLight: "#ADC6FF",
    accentCyan: "#009BD1",
    accentElectric: "#00C3F8",
  },
  text: {
    primary: "#E0E2EF",
    secondary: "#C2C6D6",
    muted: "#8C909F",
    subtle: "#606474",
    white: "#FFFFFF",
  },
  status: {
    success: "#00E599",
    successBackground: "rgba(0, 229, 153, 0.12)",
    warning: "#F59E0B",
    warningBackground: "rgba(245, 158, 11, 0.12)",
    error: "#EF4444",
    errorBackground: "rgba(239, 68, 68, 0.12)",
    info: "#3B82F6",
    infoBackground: "rgba(59, 130, 246, 0.12)",
  },
  tier: {
    tier1: "#8C909F", // Newcomer
    tier2: "#00C3F8", // Citizen
    tier3: "#6366F1", // Builder
    tier4: "#A855F7", // Trusted
    tier5: "#F59E0B", // Prime
  },
  border: {
    subtle: "rgba(255, 255, 255, 0.08)",
    medium: "rgba(255, 255, 255, 0.16)",
    active: "rgba(77, 142, 255, 0.4)",
    focus: "#4D8EFF",
  },
} as const;

export const typography = {
  fontFamily: {
    sans: "'Inter', system-ui, -apple-system, sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  fontSize: {
    xs: "12px",
    sm: "14px",
    base: "16px",
    lg: "18px",
    xl: "20px",
    "2xl": "24px",
    "3xl": "30px",
    "4xl": "36px",
    "5xl": "48px",
  },
  fontWeight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  lineHeight: {
    tight: "1.2",
    normal: "1.5",
    relaxed: "1.75",
  },
} as const;

export const spacing = {
  "1": "4px",
  "2": "8px",
  "3": "12px",
  "4": "16px",
  "5": "20px",
  "6": "24px",
  "8": "32px",
  "10": "40px",
  "12": "48px",
  "16": "64px",
} as const;

export const radius = {
  none: "0px",
  sm: "4px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  "2xl": "24px",
  full: "9999px",
} as const;

export const shadow = {
  card: "0 4px 20px rgba(0, 0, 0, 0.4)",
  modal: "0 20px 50px rgba(0, 0, 0, 0.7)",
  glowPrimary: "0 0 24px rgba(77, 142, 255, 0.35)",
  glowCyan: "0 0 24px rgba(0, 195, 248, 0.3)",
} as const;

export const border = {
  thin: "1px solid rgba(255, 255, 255, 0.08)",
  active: "1px solid rgba(77, 142, 255, 0.4)",
  accent: "2px solid #4D8EFF",
} as const;

export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

export const tokens = {
  color,
  typography,
  spacing,
  radius,
  shadow,
  border,
  breakpoints,
};

export default tokens;
