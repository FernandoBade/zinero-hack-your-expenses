import { isMonetaryString } from "../guards";

/**
 * @summary Detects string values that are empty after trimming whitespace.
 */
export function isBlankString(value: unknown): boolean {
    return typeof value === 'string' && value.trim().length === 0;
}

/**
 * @summary Normalizes localized monetary text into canonical dot-decimal numeric format.
 */
export function normalizeMonetaryInput(value: string): string {
    const trimmed = value.trim();
    const cleaned = trimmed.replace(/\s+/g, '');
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    let normalized = cleaned;

    if (lastComma !== -1 && lastDot !== -1) {
        if (lastComma > lastDot) {
            normalized = cleaned.replace(/\./g, '').replace(',', '.');
        } else {
            normalized = cleaned.replace(/,/g, '');
        }
    } else if (lastComma !== -1) {
        normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
        normalized = cleaned.replace(/,/g, '');
    }

    return normalized;
}

/**
 * @summary Normalizes unknown monetary inputs into canonical string values when possible.
 */
export function normalizeMonetaryValue(value: unknown): string | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
    }
    if (typeof value !== 'string') {
        return undefined;
    }

    return normalizeMonetaryInput(value);
}

/**
 * @summary Validates that canonical monetary input does not represent a negative value.
 */
export function isMonetaryNonNegative(value: string): boolean {
    const trimmed = value.trim();
    if (trimmed.startsWith('-')) {
        return false;
    }

    return isMonetaryString(trimmed);
}

/**
 * @summary Validates that canonical monetary input represents a value strictly above zero.
 */
export function isMonetaryGreaterThanZero(value: string): boolean {
    const trimmed = value.trim();
    if (trimmed.startsWith('-')) {
        return false;
    }

    const unsigned = trimmed.startsWith('+') ? trimmed.slice(1) : trimmed;
    const [integerPart = '0', decimalPart = ''] = unsigned.split('.');
    const normalizedInteger = integerPart.replace(/^0+/, '');
    const normalizedDecimal = decimalPart.replace(/0/g, '');

    return normalizedInteger.length > 0 || normalizedDecimal.length > 0;
}
