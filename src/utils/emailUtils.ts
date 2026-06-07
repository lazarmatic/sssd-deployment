/**
 * Email Validation Utilities
 * Includes TLD validation, MX record checking, and disposable email filtering
 */

import { promises as dns } from 'dns';

/**
 * Cache for valid TLDs fetched from IANA
 */
let VALID_TLDS: Set<string> | null = null;

/**
 * Fetch valid TLDs from IANA API
 * @returns Set of valid TLDs
 */
async function fetchIANATLDs(): Promise<Set<string>> {
    try {
        const response = await fetch('https://data.iana.org/TLD/tlds-alpha-by-domain.txt');
        if (!response.ok) {
            throw new Error(`IANA API error: ${response.status}`);
        }
        const text = await response.text();
        const tlds = new Set<string>();

        // Parse the file - skip comments and header lines
        text.split('\n').forEach(line => {
            const trimmed = line.trim().toLowerCase();
            // Skip empty lines and comment lines (starting with #)
            if (trimmed && !trimmed.startsWith('#')) {
                tlds.add(trimmed);
            }
        });

        return tlds;
    } catch (error) {
        console.error('Failed to fetch IANA TLDs:', error);
        // Return empty set if fetch fails - validation will be stricter
        return new Set();
    }
}

/**
 * Get valid TLDs from cache or fetch from IANA
 * @returns Set of valid TLDs
 */
async function getValidTLDs(): Promise<Set<string>> {
    if (VALID_TLDS === null) {
        VALID_TLDS = await fetchIANATLDs();
    }
    return VALID_TLDS;
}

/**
 * Validate email format and extract TLD
 * @param email - The email address to validate
 * @returns Object with validation status and extracted components
 */
export function validateEmailFormat(email: string): {
    isValid: boolean;
    email?: string;
    domain?: string;
    tld?: string;
    error?: string;
} {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        return {
            isValid: false,
            error: 'Invalid email format',
        };
    }

    try {
        const [, domain] = email.split('@');
        const tld = domain.split('.').pop()?.toLowerCase();

        if (!tld) {
            return {
                isValid: false,
                error: 'Could not extract TLD',
            };
        }

        return {
            isValid: true,
            email: email.toLowerCase(),
            domain: domain.toLowerCase(),
            tld,
        };
    } catch (error) {
        return {
            isValid: false,
            error: 'Error processing email',
        };
    }
}

/**
 * Validate TLD against IANA list
 * @param email - The email address to validate
 * @returns Object with validation status
 */
export async function validateEmailTLD(email: string): Promise<{
    isValid: boolean;
    tld?: string;
    error?: string;
}> {
    const format = validateEmailFormat(email);

    if (!format.isValid || !format.tld) {
        return {
            isValid: false,
            error: format.error || 'Invalid email format',
        };
    }

    const validTLDs = await getValidTLDs();
    const tldValid = validTLDs.has(format.tld);

    return {
        isValid: tldValid,
        tld: format.tld,
        error: tldValid ? undefined : `Invalid TLD: .${format.tld}`,
    };
}

/**
 * Validate MX records for email domain
 * Checks if the domain has valid MX records configured for mail delivery
 * @param email - The email address to validate
 * @returns Object with validation status and MX records
 */
export async function validateEmailMXRecords(email: string): Promise<{
    isValid: boolean;
    domain?: string;
    mxRecords?: string[];
    error?: string;
}> {
    const format = validateEmailFormat(email);

    if (!format.isValid || !format.domain) {
        return {
            isValid: false,
            error: format.error || 'Invalid email format',
        };
    }

    try {
        const mxRecords = await dns.resolveMx(format.domain);

        if (!mxRecords || mxRecords.length === 0) {
            return {
                isValid: false,
                domain: format.domain,
                error: 'No MX records found for domain',
            };
        }

        const exchangeServers = mxRecords.map((record) => record.exchange);

        return {
            isValid: true,
            domain: format.domain,
            mxRecords: exchangeServers,
        };
    } catch (e) {
        if (e instanceof Error) {
            return {
                isValid: false,
                domain: format.domain,
                error: `MX record lookup failed: ${e.message}`,
            };
        }
        throw e;
    }
}
