/**
 * Standardized Date Formatting Utilities for Remittance System
 * Enforces dd/mm/yyyy format across all views, tables, forms, and exports.
 */

/**
 * Formats any Date or date string to dd/mm/yyyy
 * Example: 2026-09-17 -> 17/09/2026
 */
export function formatToDDMMYYYY(dateInput: string | number | Date | undefined | null): string {
  if (!dateInput) return '-';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
      if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
        const parts = dateInput.substring(0, 10).split('-');
        if (parts.length === 3) {
          const [y, m, day] = parts;
          return `${day.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
        }
      }
      return String(dateInput);
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateInput || '-');
  }
}

/**
 * Formats any Date or date string to dd/mm/yyyy hh:mm A
 * Example: 2026-09-17T14:30:00 -> 17/09/2026 02:30 PM
 */
export function formatToDDMMYYYYWithTime(dateInput: string | number | Date | undefined | null): string {
  if (!dateInput) return '-';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return formatToDDMMYYYY(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, '0');
    return `${day}/${month}/${year} ${strHours}:${minutes} ${ampm}`;
  } catch {
    return String(dateInput || '-');
  }
}

/**
 * Returns date in YYYY-MM-DD for standard HTML input[type="date"]
 */
export function toInputDateString(dateInput: Date = new Date()): string {
  const y = dateInput.getFullYear();
  const m = String(dateInput.getMonth() + 1).padStart(2, '0');
  const d = String(dateInput.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
