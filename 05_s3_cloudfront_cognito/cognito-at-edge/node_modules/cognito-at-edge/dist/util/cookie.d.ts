export interface Cookie {
    name: string;
    value: string;
}
export type SameSite = 'Strict' | 'Lax' | 'None';
export declare const SAME_SITE_VALUES: SameSite[];
/**
 * Cookie attributes to be used inside 'Set-Cookie' header
 */
export interface CookieAttributes {
    /**
     * The Domain attribute specifies those hosts to which the cookie will be sent.
     * Refer to {@link https://www.rfc-editor.org/rfc/rfc6265#section-4.1.2.3 RFC 6265 section 4.1.2.3.} for more details.
     */
    domain?: string;
    /**
     * The Expires attribute indicates the maximum lifetime of the cookie, represented as the date and time at which
     * the cookie expires.
     * Refer to {@link https://www.rfc-editor.org/rfc/rfc6265#section-4.1.2.1 RFC 6265 section 4.1.2.1.} for more details.
     */
    expires?: Date;
    /**
     * The HttpOnly attribute limits the scope of the cookie to HTTP requests.
     * Refer to {@link https://www.rfc-editor.org/rfc/rfc6265#section-4.1.2.6 RFC 6265 section 4.1.2.6.} for more details.
     */
    httpOnly?: boolean;
    /**
     * The SameSite attribute allows you to declare if your cookie should be restricted to a first-party or same-site context.
     * Refer to {@link https://httpwg.org/http-extensions/draft-ietf-httpbis-rfc6265bis.html#name-samesite-cookies RFC 6265 section 8.8.} for more details.
     */
    sameSite?: SameSite;
    /**
     * The Max-Age attribute indicates the maximum lifetime of the cookie, represented as the number of seconds until
     * the cookie expires.
     * Refer to {@link https://www.rfc-editor.org/rfc/rfc6265#section-4.1.2.2 RFC 6265 section 4.1.2.2.} for more details.
     */
    maxAge?: number;
    /**
     * The scope of each cookie is limited to a set of paths, controlled by the Path attribute.
     * Refer to {@link https://www.rfc-editor.org/rfc/rfc6265#section-4.1.2.4 RFC 6265 section 4.1.2.4.} for more details.
     */
    path?: string;
    /**
     * The Secure attribute limits the scope of the cookie to "secure" channels (where "secure" is defined by the user agent).
     * Refer to {@link https://www.rfc-editor.org/rfc/rfc6265#section-4.1.2.5 RFC 6265 section 4.1.2.5.} for more details.
     */
    secure?: boolean;
}
export type CookieType = 'idToken' | 'accessToken' | 'refreshToken';
export interface CookieSettings {
    /**
     * Indicates the maximum lifetime of the cookie.
     */
    expirationDays?: number;
    /**
     * Indicates the path that must exist in the requested URL for the browser to
     * send the Cookie header.
     */
    path?: string;
    /**
     * Controls whether the cookie can be accessed by JavaScript.
     */
    httpOnly?: boolean;
    /**
     * Controls whether or not a cookie is sent with cross-site requests
     */
    sameSite?: SameSite;
}
export interface CookieSettingsOverrides {
    idToken?: CookieSettings;
    accessToken?: CookieSettings;
    refreshToken?: CookieSettings;
}
export declare class Cookies {
    /**
     * Parse `Cookie` header string compliant with RFC 6265 and decode URI encoded characters.
     *
     * @param cookiesString 'Cookie' header value
     * @returns array of {@type Cookie} objects
     */
    static parse(cookiesString: string): Cookie[];
    /**
     * Serialize a cookie name-value pair into a `Set-Cookie` header string and URI encode characters that doesn't comply
     * with RFC 6265
     *
     * @param name cookie name
     * @param value cookie value
     * @param attributes cookie attributes
     * @returns string to be used as `Set-Cookie` header
     */
    static serialize(name: string, value: string, attributes?: CookieAttributes): string;
    /**
     * URI encodes all characters not compliant with RFC 6265 cookie-name syntax (namely, non-US-ASCII,
     * control characters and `()<>@,;:\"/[]?={} `) as well as `%` character to enable URI encoding support.
     * Refer to {@link https://www.rfc-editor.org/rfc/rfc6265#section-4.1.1 RFC 6265 section 4.1.1.} for more details.
     */
    private static encodeName;
    /**
     * Safely URI decodes cookie name.
     */
    private static decodeName;
    /**
     * URI encodes all characters not compliant with RFC 6265 cookie-octet syntax (namely, non-US-ASCII,
     * control characters, whitespace, double quote, comma, semicolon and backslash) as well as `%` character
     * to enable URI encoding support.
     * Refer to {@link https://www.rfc-editor.org/rfc/rfc6265#section-4.1.1 RFC 6265 section 4.1.1.} for more details.
     */
    private static encodeValue;
    /**
     * Safely URI decodes cookie value.
     */
    private static decodeValue;
}
export declare function getCookieDomain(cfDomain: string, disableCookieDomain: boolean, customCookieDomain?: string | undefined): string | undefined;
