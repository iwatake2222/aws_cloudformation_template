import { JwtHeader, JwtPayload } from "./jwt-model.js";
/**
 * Sanity check, decompose and JSON parse a JWT string into its constituent parts:
 * - header object
 * - payload object
 * - signature string
 *
 * @param jwt The JWT (as string)
 * @returns the decomposed JWT
 */
export declare function decomposeJwt(jwt: unknown): {
    header: JwtHeader;
    headerB64: string;
    payload: JwtPayload;
    payloadB64: string;
    signatureB64: string;
};
export declare type DecomposedJwt = ReturnType<typeof decomposeJwt>;
/**
 * Validate JWT payload fields. Throws an error in case there's any validation issue.
 *
 * @param payload The (JSON parsed) JWT payload
 * @param options The options to use during validation
 * @returns void
 */
export declare function validateJwtFields(payload: JwtPayload, options: {
    issuer?: string | string[] | null;
    audience?: string | string[] | null;
    scope?: string | string[] | null;
    graceSeconds?: number;
}): void;
