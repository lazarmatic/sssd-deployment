import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const config = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || "development",
    appBaseUrl: process.env.APP_BASE_URL || "http://localhost:3000",
    // Email validation configuration
    disposableEmailDomainsUrl: "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/master/disposable_email_blocklist.conf",
    // Phone validation default country
    defaultPhoneCountry: "BA",
};