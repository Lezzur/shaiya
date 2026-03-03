import { format, formatDistanceToNow, parseISO } from 'date-fns';

/**
 * Formatting utilities for display values
 */

/**
 * Format a number as currency (PHP with 2 decimal places)
 *
 * @param amount - The amount to format
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1234.56) // "₱1,234.56"
 * formatCurrency(1000000) // "₱1,000,000.00"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a date as "MMM dd, yyyy"
 *
 * @param date - Date object or ISO string
 * @returns Formatted date string
 *
 * @example
 * formatDate(new Date('2026-03-15')) // "Mar 15, 2026"
 * formatDate('2026-03-15T10:30:00Z') // "Mar 15, 2026"
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMM dd, yyyy');
}

/**
 * Format a date with time as "MMM dd, yyyy h:mm a"
 *
 * @param date - Date object or ISO string
 * @returns Formatted datetime string
 *
 * @example
 * formatDateTime(new Date('2026-03-15T14:30:00')) // "Mar 15, 2026 2:30 PM"
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMM dd, yyyy h:mm a');
}

/**
 * Format a date relative to now ("2 hours ago", "in 3 days", etc.)
 *
 * @param date - Date object or ISO string
 * @returns Relative time string
 *
 * @example
 * formatRelative(new Date(Date.now() - 7200000)) // "2 hours ago"
 * formatRelative(new Date(Date.now() + 86400000)) // "in 1 day"
 */
export function formatRelative(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

/**
 * Format a number as a percentage with 1 decimal place
 *
 * @param value - The decimal value (0.425 = 42.5%)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 *
 * @example
 * formatPercent(0.425) // "42.5%"
 * formatPercent(0.8567, 2) // "85.67%"
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a number with thousand separators
 *
 * @param value - The number to format
 * @returns Formatted number string
 *
 * @example
 * formatNumber(1234567) // "1,234,567"
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Format file size in human-readable format
 *
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 *
 * @example
 * formatFileSize(1024) // "1.0 KB"
 * formatFileSize(1536000) // "1.5 MB"
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Format duration in minutes to human-readable format
 *
 * @param minutes - Duration in minutes
 * @returns Formatted duration string
 *
 * @example
 * formatDuration(90) // "1h 30m"
 * formatDuration(45) // "45m"
 * formatDuration(120) // "2h"
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  }

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
}

/**
 * Truncate text to a maximum length with ellipsis
 *
 * @param text - The text to truncate
 * @param maxLength - Maximum length (default: 50)
 * @returns Truncated text with ellipsis if needed
 *
 * @example
 * truncate("This is a very long text", 10) // "This is a..."
 */
export function truncate(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format a name with initials
 *
 * @param name - Full name
 * @returns Initials (up to 2 letters)
 *
 * @example
 * getInitials("John Doe") // "JD"
 * getInitials("Jane") // "J"
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0][0].toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
