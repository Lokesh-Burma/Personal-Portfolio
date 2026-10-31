# One owner login with MFA

Status: deployed on 2026-10-26. The owner completed a real staged MFA login and confirmed shared access to both private areas. The existing owner email was marked verified only after explicit ownership attestation and approval.

## User flow

The main app has an Owner sign-in entry. /login sends the owner through the existing Cognito hosted login with authorization code + PKCE. The existing pool requires software-token MFA. After sign-in, one secure host-only HTTP-only cookie applies to the blog editor and /techcanvas/studio on the same hostname. Both API families call the same requireAdmin function; opening TechCanvas requires no second sign-in. The return path is restricted to /, /admin or /techcanvas/studio.

The production password-only /api/admin/login path is disabled. The previous portfolio_admin_session HMAC cookie is ignored outside explicit local demo mode. Existing password-only sessions must sign in again through Cognito after cutover. Providing ADMIN_PASSWORD_HASH does not enable a production bypass.

## Session and token handling

PKCE verifier, state, nonce, creation time and approved return path are carried in a signed, ten-minute, HTTP-only Secure SameSite=Lax __Host-platform_login cookie. The callback validates the state/time/signature, consumes the matching flow cookie, checks the nonce binding and exchanges the authorization code server-side. Forged callbacks cannot clear an existing owner session or a valid pending flow. The callback verifies both JWT signatures using aws-jwt-verify and the pool JWKS, token use, issuer, client, access scope, exact owner subject, verified owner email and nonce. It does not trust decoded claims without signature checks.

Only the verified access JWT is stored, in __Host-platform_owner with Path=/, Secure, HttpOnly, SameSite=Lax and no Domain attribute. Tokens are not put in browser localStorage, sessionStorage, frontend JSON, or application redirect URLs. The access token is reverified for every protected request. The cookie/session expires no later than 15 minutes after the token's issue time or its JWT expiration, whichever comes first. Refresh tokens and ID tokens are not persisted. Reauthentication is explicit; Cognito may reuse its own still-valid MFA-authenticated hosted-login session.

MFA is enforced by the user pool policy, not inferred from an invented JWT claim. The deployed pool must remain MFAConfiguration=ON with SOFTWARE_TOKEN_MFA and the intended Cognito owner account. No new federation, optional-MFA setting, device-trust bypass or password-only fallback is introduced. Verify the real policy/account during staged release; local RSA/JWKS fixtures do not exercise a real MFA challenge.

Sign out is a same-origin POST. It clears the current common session, flow cookie and old password cookie, then redirects the browser through Cognito /logout to clear its hosted-login cookie. Both areas lose browser access together. This is current-browser sign-out, not administrative global revocation: a previously copied JWT can remain cryptographically valid until the bounded 15-minute session expires. No refresh token remains in the app to extend it.

## Existing Cognito configuration

The implementation reuses TechCanvasFoundation's owner pool and public BrowserClient, which already require TOTP MFA and code flow. The optional CDK commonAppOrigin context adds the exact /api/auth/callback and / logout targets ; retireLegacyStudio removes old studio and temporary preview URLs, plus the email OIDC scope for verified-owner email checks. It does not replace resource identities, create another user directory, upgrade the feature plan, enable SMS, or activate processing/inference.

Example synthesis only, after building the current handlers:

    npm --prefix apps/techcanvas/infra run synth -- -c commonAppOrigin=https://lokeshburma.com

The context must be an exact HTTPS origin without credentials, query, fragment, port or trailing slash. The committed retireLegacyStudio context now restricts callbacks/logout to the canonical common application. Use CloudFormation/CDK for a reviewed update; do not run a partial update-user-pool-client command, because that API replaces omitted client settings.

The common server needs COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, COGNITO_LOGIN_DOMAIN, ADMIN_EMAIL, TECHCANVAS_OWNER_SUBJECT, SITE_ORIGIN and its existing random SESSION_SECRET (minimum 32 characters). These are server settings; do not introduce client secrets or AWS credentials into the browser. The pool/client IDs and domain are identifiers, not API credentials.

## Release validation

The approved staged real MFA check and production promotion are complete. Preserve required software-token MFA, strict verified email/subject checks and the canonical callback. Future authentication changes require renewed staged verification; follow unified-app-migration.md. Generation activation is independent of authentication; see operations.md for current controls.

## Local testing

pnpm dev still uses clearly labelled password-only local demo credentials; it is not a simulated MFA service. Production-mode boundary tests disable that flag and prove both API families reject legacy cookies/password login, enforce the common redirect/cookie behavior, clean up failed callbacks and route sign-out through Cognito. Unit tests use locally generated RSA signatures and cached JWKS to verify real JWT checks and PKCE/nonce bindings without network calls. Browser tests exercise the shared local session and studio/editor navigation. They do not claim a successful live Cognito MFA challenge.

Sources:
- https://docs.aws.amazon.com/cognito/latest/developerguide/authorization-endpoint.html
- https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-mfa.html
- https://docs.aws.amazon.com/cognito/latest/developerguide/logout-endpoint.html
- https://github.com/awslabs/aws-jwt-verify
