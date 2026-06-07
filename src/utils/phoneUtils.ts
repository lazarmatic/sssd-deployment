/**
 * Phone Number Validation Utility
 * Uses libphonenumber-js/max for accurate phone validation and type detection
 * The /max subpath includes full metadata for type detection (mobile vs fixed-line)
 */

import { parsePhoneNumberFromString, ParseError, CountryCode } from 'libphonenumber-js/max';

/**
 * Validate a phone number and check if it's a mobile number
 * @param phoneNumber - The phone number to validate (can be in international or local format)
 * @param defaultCountry - The default country code (e.g., 'BA' for Bosnia)
 * @returns Object with validation status and phone type
 */
export function validatePhoneNumber(
    phoneNumber: string,
    defaultCountry: string = 'BA'
): {
    isValid: boolean;
    isMobile: boolean;
    type?: string;
    error?: string;
} {
    try {
        const numberProto = parsePhoneNumberFromString(phoneNumber, defaultCountry as CountryCode);

        if (!numberProto) {
            return {
                isValid: false,
                isMobile: false,
                error: 'Invalid phone number format',
            };
        }

        const type = numberProto.getType();
        const isMobile = type === 'MOBILE';

        return {
            isValid: true,
            isMobile,
            type: type || 'UNKNOWN',
        };
    } catch (e) {
        if (e instanceof ParseError) {
            return {
                isValid: false,
                isMobile: false,
                error: e.message,
            };
        }
        throw e;
    }
}

/**
 * Validate specifically for mobile phone numbers
 * Some services (like SMS delivery) only work with mobile numbers
 * @param phoneNumber - The phone number to validate
 * @param defaultCountry - The default country code
 * @returns boolean indicating if the number is a valid mobile phone
 */
export function isMobilePhoneNumber(
    phoneNumber: string,
    defaultCountry: string = 'BA'
): boolean {
    const result = validatePhoneNumber(phoneNumber, defaultCountry);
    return result.isValid && result.isMobile;
}
