import type { CloudFrontRequest, CloudFrontRequestEvent, CloudFrontResultResponse } from 'aws-lambda';
import { CookieAttributes, CookieSettingsOverrides, CookieType, SameSite } from './util/cookie';
import { CSRFTokens } from './util/csrf';
export interface AuthenticatorParams {
    region: string;
    userPoolId: string;
    userPoolAppId: string;
    userPoolAppSecret?: string;
    userPoolDomain: string;
    cookieExpirationDays?: number;
    disableCookieDomain?: boolean;
    httpOnly?: boolean;
    sameSite?: SameSite;
    logLevel?: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
    cookiePath?: string;
    cookieDomain?: string;
    cookieSettingsOverrides?: CookieSettingsOverrides;
    logoutConfiguration?: LogoutConfiguration;
    parseAuthPath?: string;
    csrfProtection?: {
        nonceSigningSecret: string;
    };
}
interface LogoutConfiguration {
    logoutUri: string;
    logoutRedirectUri: string;
}
interface Tokens {
    accessToken?: string;
    idToken?: string;
    refreshToken?: string;
}
export declare class Authenticator {
    _region: string;
    _userPoolId: string;
    _userPoolAppId: string;
    _userPoolAppSecret: string | undefined;
    _userPoolDomain: string;
    _cookieExpirationDays: number;
    _disableCookieDomain: boolean;
    _httpOnly: boolean;
    _sameSite?: SameSite;
    _cookieBase: string;
    _cookiePath?: string;
    _cookieDomain?: string;
    _csrfProtection?: {
        nonceSigningSecret: string;
    };
    _logoutConfiguration?: LogoutConfiguration;
    _parseAuthPath?: string;
    _cookieSettingsOverrides?: CookieSettingsOverrides;
    _logger: import("pino").Logger<{
        level: "silent" | "error" | "fatal" | "warn" | "info" | "debug" | "trace";
        base: null;
    }>;
    _jwtVerifier: import("aws-jwt-verify/cognito-verifier").CognitoJwtVerifierSingleUserPool<{
        userPoolId: string;
        clientId: string;
        tokenUse: "id";
    }>;
    constructor(params: AuthenticatorParams);
    /**
     * Verify that constructor parameters are corrects.
     * @param  {object} params constructor params
     * @return {void} throw an exception if params are incorects.
     */
    _verifyParams(params: AuthenticatorParams): void;
    /**
     * Exchange authorization code for tokens.
     * @param  {String} redirectURI Redirection URI.
     * @param  {String} code        Authorization code.
     * @return {Promise} Authenticated user tokens.
     */
    _fetchTokensFromCode(redirectURI: string, code: string): Promise<Tokens>;
    /**
     * Fetch accessTokens from refreshToken.
     * @param  {String} redirectURI Redirection URI.
     * @param  {String} refreshToken Refresh token.
     * @return {Promise<Tokens>} Refreshed user tokens.
     */
    _fetchTokensFromRefreshToken(redirectURI: string, refreshToken: string): Promise<Tokens>;
    _getAuthorization(): string | undefined;
    _validateCSRFCookies(request: CloudFrontRequest): void;
    _getOverridenCookieAttributes(cookieAttributes: CookieAttributes | undefined, cookieType: CookieType): CookieAttributes;
    /**
     * Create a Lambda@Edge redirection response to set the tokens on the user's browser cookies.
     * @param  {Object} tokens   Cognito User Pool tokens.
     * @param  {String} domain   Website domain.
     * @param  {String} location Path to redirection.
     * @return Lambda@Edge response.
     */
    _getRedirectResponse(tokens: Tokens, domain: string, location: string): Promise<CloudFrontResultResponse>;
    /**
     * Extract value of the authentication token from the request cookies.
     * @param  {Array}  cookieHeaders 'Cookie' request headers.
     * @return {Tokens} Extracted id token or access token. Null if not found.
     */
    _getTokensFromCookie(cookieHeaders: Array<{
        key?: string | undefined;
        value: string;
    }> | undefined): Tokens;
    /**
     * Extract values of the CSRF tokens from the request cookies.
     * @param  {Array}  cookieHeaders 'Cookie' request headers.
     * @return {CSRFTokens} Extracted CSRF Tokens from cookie.
     */
    _getCSRFTokensFromCookie(cookieHeaders: Array<{
        key?: string | undefined;
        value: string;
    }> | undefined): CSRFTokens;
    /**
     * Extracts the redirect uri from the state param. When CSRF protection is
     * enabled, redirect uri is encoded inside state along with other data. So, it
     * needs to be base64 decoded. When CSRF is not enabled, state can be used
     * directly.
     * @param {string} state
     * @returns {string}
     */
    _getRedirectUriFromState(state: string): string;
    _revokeTokens(tokens: Tokens): Promise<void>;
    _clearCookies(event: CloudFrontRequestEvent, tokens?: Tokens): Promise<CloudFrontResultResponse>;
    /**
     * Get redirect to cognito userpool response
     * @param  {CloudFrontRequest}  request The original request
     * @param  {string}  redirectURI Redirection URI.
     * @return {CloudFrontResultResponse} Redirect response.
     */
    _getRedirectToCognitoUserPoolResponse(request: CloudFrontRequest, redirectURI: string): CloudFrontResultResponse;
    /**
     * Handle Lambda@Edge event:
     *   * if authentication cookie is present and valid: forward the request
     *   * if authentication cookie is invalid, but refresh token is present: set cookies with refreshed tokens
     *   * if ?code=<grant code> is present: set cookies with new tokens
     *   * else redirect to the Cognito UserPool to authenticate the user
     * @param  {Object}  event Lambda@Edge event.
     * @return {Promise} CloudFront response.
     */
    handle(event: CloudFrontRequestEvent): Promise<CloudFrontResultResponse | CloudFrontRequest>;
    /**
     *
     * 1. If the token cookies are present in the request, send users to the redirect_uri
     * 2. If cookies are not present, initiate the authentication flow
     *
     * @param event Event that triggers this Lambda function
     * @returns Lambda response
     */
    handleSignIn(event: CloudFrontRequestEvent): Promise<CloudFrontResultResponse>;
    /**
     *
     * Handler that performs OAuth token exchange -- exchanges the authorization
     * code obtained from the query parameter from server for tokens -- and sets
     * tokens as cookies. This is done after performing CSRF checks, by verifying
     * that the information encoded in the state query parameter is related to the
     * one stored in the cookies.
     *
     * @param event Event that triggers this Lambda function
     * @returns Lambda response
     */
    handleParseAuth(event: CloudFrontRequestEvent): Promise<CloudFrontResultResponse>;
    /**
     *
     * Uses the refreshToken present in the cookies to get a new set of tokens
     * from the authorization server. After fetching the tokens, they are sent
     * back to the client as cookies.
     *
     * @param event Event that triggers this Lambda function
     * @returns Lambda response
     */
    handleRefreshToken(event: CloudFrontRequestEvent): Promise<CloudFrontResultResponse>;
    /**
     *
     * Revokes the refreshToken (which also invalidates the accessToken obtained
     * using that refreshToken) and clears the cookies. Even if the revoke
     * operation fails, clear cookies based on the cookie names present in the
     * request headers.
     *
     * @param event Event that triggers this Lambda function
     * @returns Lambda response
     */
    handleSignOut(event: CloudFrontRequestEvent): Promise<CloudFrontResultResponse>;
}
export {};
