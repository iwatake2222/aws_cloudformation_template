"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCookieDomain = exports.Cookies = exports.SAME_SITE_VALUES = void 0;
exports.SAME_SITE_VALUES = ['Strict', 'Lax', 'None'];
class Cookies {
    /**
     * Parse `Cookie` header string compliant with RFC 6265 and decode URI encoded characters.
     *
     * @param cookiesString 'Cookie' header value
     * @returns array of {@type Cookie} objects
     */
    static parse(cookiesString) {
        const cookieStrArray = cookiesString ? cookiesString.split(';') : [];
        const cookies = [];
        for (const cookieStr of cookieStrArray) {
            const separatorIndex = cookieStr.indexOf('=');
            if (separatorIndex < 0) {
                continue;
            }
            const name = this.decodeName(cookieStr.substring(0, separatorIndex).trim());
            const value = this.decodeValue(cookieStr.substring(separatorIndex + 1).trim());
            cookies.push({ name, value });
        }
        return cookies;
    }
    /**
     * Serialize a cookie name-value pair into a `Set-Cookie` header string and URI encode characters that doesn't comply
     * with RFC 6265
     *
     * @param name cookie name
     * @param value cookie value
     * @param attributes cookie attributes
     * @returns string to be used as `Set-Cookie` header
     */
    static serialize(name, value, attributes = {}) {
        return [
            `${this.encodeName(name)}=${this.encodeValue(value)}`,
            ...(attributes.domain ? [`Domain=${attributes.domain}`] : []),
            ...(attributes.path ? [`Path=${attributes.path}`] : []),
            ...(attributes.expires ? [`Expires=${attributes.expires.toUTCString()}`] : []),
            ...(attributes.maxAge ? [`Max-Age=${attributes.maxAge}`] : []),
            ...(attributes.secure ? ['Secure'] : []),
            ...(attributes.httpOnly ? ['HttpOnly'] : []),
            ...(attributes.sameSite ? [`SameSite=${attributes.sameSite}`] : []),
        ].join('; ');
    }
    /**
     * URI encodes all characters not compliant with RFC 6265 cookie-name syntax (namely, non-US-ASCII,
     * control characters and `()<>@,;:\"/[]?={} `) as well as `%` character to enable URI encoding support.
     * Refer to {@link https://www.rfc-editor.org/rfc/rfc6265#section-4.1.1 RFC 6265 section 4.1.1.} for more details.
     */
    static encodeName = (str) => str.replace(/[^\x21\x23\x24\x26\x27\x2A\x2B\x2D\x2E\x30-\x39\x41-\x5A\x5E-\x7A\x7C\x7E]+/g, encodeURIComponent)
        .replace(/[()]/g, (s) => `%${s.charCodeAt(0).toString(16).toUpperCase()}`);
    /**
     * Safely URI decodes cookie name.
     */
    static decodeName = (str) => str.replace(/(%[\dA-Fa-f]{2})+/g, decodeURIComponent);
    /**
     * URI encodes all characters not compliant with RFC 6265 cookie-octet syntax (namely, non-US-ASCII,
     * control characters, whitespace, double quote, comma, semicolon and backslash) as well as `%` character
     * to enable URI encoding support.
     * Refer to {@link https://www.rfc-editor.org/rfc/rfc6265#section-4.1.1 RFC 6265 section 4.1.1.} for more details.
     */
    static encodeValue = (str) => str.replace(/[^\x21\x23\x24\x26-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]+/g, encodeURIComponent);
    /**
     * Safely URI decodes cookie value.
     */
    static decodeValue = (str) => str.replace(/(%[\dA-Fa-f]{2})+/g, decodeURIComponent);
}
exports.Cookies = Cookies;
function getCookieDomain(cfDomain, disableCookieDomain, customCookieDomain = undefined) {
    if (disableCookieDomain) {
        return undefined;
    }
    if (customCookieDomain) {
        return customCookieDomain;
    }
    return cfDomain;
}
exports.getCookieDomain = getCookieDomain;
