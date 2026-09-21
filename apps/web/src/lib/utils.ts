export type ClassValue = string | number | boolean | undefined | null | { [key: string]: any } | ClassValue[];

/**
 * Concatenates and cleans class names cleanly without external dependencies.
 */
export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (typeof input === "string" || typeof input === "number") {
      classes.push(String(input));
    } else if (Array.isArray(input)) {
      const inner = cn(...input);
      if (inner) classes.push(inner);
    } else if (typeof input === "object") {
      for (const key in input) {
        if (Boolean((input as Record<string, any>)[key])) {
          classes.push(key);
        }
      }
    }
  }

  return classes.join(" ");
}
