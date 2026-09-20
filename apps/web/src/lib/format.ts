/**
 * Merit Circle Formatting Utilities
 * BigInt-safe money and domain formatting functions.
 */

const WEI_PER_BNB = 10n ** 18n;

/**
 * Formats a wei string amount to human-readable BNB string without floating-point math.
 * Example: "1000000000000000000" -> "1.00 BNB"
 * Example: "500000000000000000" -> "0.50 BNB"
 */
export function formatWeiToBnb(amountWei: string | bigint | null | undefined): string {
  if (!amountWei) return "0.00 tBNB";

  try {
    const wei = typeof amountWei === "bigint" ? amountWei : BigInt(amountWei);
    const isNegative = wei < 0n;
    const absoluteWei = isNegative ? -wei : wei;

    const integerPart = absoluteWei / WEI_PER_BNB;
    const remainder = absoluteWei % WEI_PER_BNB;

    // Pad remainder to 18 digits
    const remainderStr = remainder.toString().padStart(18, "0");

    // Display first 4 decimal digits
    const decimals = remainderStr.slice(0, 4);

    // Trim trailing zeroes but leave at least 2 decimal places
    let trimmedDecimals = decimals;
    while (trimmedDecimals.length > 2 && trimmedDecimals.endsWith("0")) {
      trimmedDecimals = trimmedDecimals.slice(0, -1);
    }

    const sign = isNegative ? "-" : "";
    return `${sign}${integerPart.toString()}.${trimmedDecimals} tBNB`;
  } catch {
    return "0.00 tBNB";
  }
}

/**
 * Formats reputation points cleanly.
 */
export function formatPoint(point: number | null | undefined): string {
  if (point === null || point === undefined) return "0 pts";
  return `${point} pts`;
}

/**
 * Formats ISO date string to localized readable date.
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

/**
 * Formats Tier number (1-5) with title.
 */
export function formatTier(tier: number | null | undefined): string {
  switch (tier) {
    case 1:
      return "Tier 1 — Newcomer";
    case 2:
      return "Tier 2 — Citizen";
    case 3:
      return "Tier 3 — Builder";
    case 4:
      return "Tier 4 — Trusted";
    case 5:
      return "Tier 5 — Prime";
    default:
      return "Tier 1 — Newcomer";
  }
}

/**
 * Formats basis points (e.g. 500 bps = 5%).
 */
export function formatBpsToPercent(bps: number | null | undefined): string {
  if (bps === null || bps === undefined) return "0%";
  const percent = bps / 100;
  return `${percent}%`;
}

/**
 * Shortens wallet address for header / UI display.
 */
export function formatAddress(address: string | null | undefined): string {
  if (!address) return "";
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
