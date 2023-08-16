export interface CSRFTokens {
    nonce?: string;
    nonceHmac?: string;
    pkce?: string;
    pkceHash?: string;
    state?: string;
}
export declare const NONCE_COOKIE_NAME_SUFFIX: keyof CSRFTokens;
export declare const NONCE_HMAC_COOKIE_NAME_SUFFIX: keyof CSRFTokens;
export declare const PKCE_COOKIE_NAME_SUFFIX: keyof CSRFTokens;
export declare const CSRF_CONFIG: {
    secretAllowedCharacters: string;
    pkceLength: number;
    nonceLength: number;
    nonceMaxAge: number;
};
export declare function generateNonce(): string;
export declare function generateCSRFTokens(redirectURI: string, signingSecret: string): {
    pkce: string;
    pkceHash: string;
    nonce: string;
    nonceHmac: string;
    state: string;
};
export declare function getCurrentTimestampInSeconds(): number;
export declare function generateSecret(allowedCharacters: string, secretLength: number): string;
export declare function sign(stringToSign: string, secret: string, signatureLength: number): string;
export declare function signNonce(nonce: string, signingSecret: string): string;
export declare const urlSafe: {
    stringify: (b64encodedString: string) => string;
    parse: (b64encodedString: string) => string;
};
export declare function generatePkceVerifier(): {
    pkce: string;
    pkceHash: string;
};
