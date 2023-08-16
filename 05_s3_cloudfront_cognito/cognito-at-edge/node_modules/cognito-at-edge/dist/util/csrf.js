"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePkceVerifier = exports.urlSafe = exports.signNonce = exports.sign = exports.generateSecret = exports.getCurrentTimestampInSeconds = exports.generateCSRFTokens = exports.generateNonce = exports.CSRF_CONFIG = exports.PKCE_COOKIE_NAME_SUFFIX = exports.NONCE_HMAC_COOKIE_NAME_SUFFIX = exports.NONCE_COOKIE_NAME_SUFFIX = void 0;
const crypto_1 = require("crypto");
exports.NONCE_COOKIE_NAME_SUFFIX = 'nonce';
exports.NONCE_HMAC_COOKIE_NAME_SUFFIX = 'nonceHmac';
exports.PKCE_COOKIE_NAME_SUFFIX = 'pkce';
exports.CSRF_CONFIG = {
    secretAllowedCharacters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~',
    pkceLength: 43,
    nonceLength: 16,
    nonceMaxAge: 60 * 60 * 24,
};
function generateNonce() {
    const randomString = generateSecret(exports.CSRF_CONFIG.secretAllowedCharacters, exports.CSRF_CONFIG.nonceLength);
    return `${getCurrentTimestampInSeconds()}T${randomString}`;
}
exports.generateNonce = generateNonce;
function generateCSRFTokens(redirectURI, signingSecret) {
    const nonce = generateNonce();
    const nonceHmac = signNonce(nonce, signingSecret);
    const state = exports.urlSafe.stringify(Buffer.from(JSON.stringify({
        nonce,
        redirect_uri: redirectURI,
    })).toString('base64'));
    return {
        nonce,
        nonceHmac,
        state,
        ...generatePkceVerifier(),
    };
}
exports.generateCSRFTokens = generateCSRFTokens;
function getCurrentTimestampInSeconds() {
    return (Date.now() / 1000) || 0;
}
exports.getCurrentTimestampInSeconds = getCurrentTimestampInSeconds;
function generateSecret(allowedCharacters, secretLength) {
    return [...new Array(secretLength)]
        .map(() => allowedCharacters[(0, crypto_1.randomInt)(0, allowedCharacters.length)])
        .join('');
}
exports.generateSecret = generateSecret;
function sign(stringToSign, secret, signatureLength) {
    const digest = (0, crypto_1.createHmac)('sha256', secret)
        .update(stringToSign)
        .digest('base64')
        .slice(0, signatureLength);
    const signature = exports.urlSafe.stringify(digest);
    return signature;
}
exports.sign = sign;
function signNonce(nonce, signingSecret) {
    return sign(nonce, signingSecret, exports.CSRF_CONFIG.nonceLength);
}
exports.signNonce = signNonce;
exports.urlSafe = {
    /*
    Functions to translate base64-encoded strings, so they can be used:
    - in URL's without needing additional encoding
    - in OAuth2 PKCE verifier
    - in cookies (to be on the safe side, as = + / are in fact valid characters in cookies)
  
    stringify:
        use this on a base64-encoded string to translate = + / into replacement characters
  
    parse:
        use this on a string that was previously urlSafe.stringify'ed to return it to
        its prior pure-base64 form. Note that trailing = are not added, but NodeJS does not care
      */
    stringify: (b64encodedString) => b64encodedString.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_'),
    parse: (b64encodedString) => b64encodedString.replace(/-/g, '+').replace(/_/g, '/'),
};
function generatePkceVerifier() {
    const pkce = generateSecret(exports.CSRF_CONFIG.secretAllowedCharacters, exports.CSRF_CONFIG.pkceLength);
    const verifier = {
        pkce,
        pkceHash: exports.urlSafe.stringify((0, crypto_1.createHash)('sha256').update(pkce, 'utf8').digest('base64')),
    };
    return verifier;
}
exports.generatePkceVerifier = generatePkceVerifier;
