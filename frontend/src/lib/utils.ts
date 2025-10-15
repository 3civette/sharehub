/**
 * Utility functions for ShareHub
 */

/**
 * Convert a string to a URL-friendly slug
 * - Converts to lowercase
 * - Replaces spaces and special characters with hyphens
 * - Removes accents and diacritics
 * - Removes multiple consecutive hyphens
 * - Trims leading/trailing hyphens
 *
 * @param text The text to slugify
 * @returns URL-friendly slug
 *
 * @example
 * slugify("Simulazioni realistiche in medicina d'urgenza")
 * // Returns: "simulazioni-realistiche-in-medicina-d-urgenza"
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    // Remove accents and diacritics
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Replace spaces and special characters with hyphens
    .replace(/[^\w\s-]/g, '-')
    .replace(/[\s_]+/g, '-')
    // Remove multiple consecutive hyphens
    .replace(/-+/g, '-')
    // Trim leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
}
