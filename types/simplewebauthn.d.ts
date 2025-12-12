declare module '@simplewebauthn/server' {
  export function generateRegistrationOptions(opts?: any): Promise<any>
  export function verifyRegistrationResponse(opts?: any): Promise<any>
  export function generateAuthenticationOptions(opts?: any): Promise<any>
  export function verifyAuthenticationResponse(opts?: any): Promise<any>
  export type VerifiedRegistrationResponse = any
  export type VerifiedAuthenticationResponse = any
}

declare module '@simplewebauthn/typescript-types' {
  export type RegistrationResponseJSON = any
  export type AuthenticationResponseJSON = any
  export type AuthenticatorTransportFuture = string
}

declare module '@simplewebauthn/browser' {
  export function startAuthentication(opts?: any): Promise<any>
  export function startRegistration(opts?: any): Promise<any>
  export function isWebAuthnSupported(): Promise<boolean>
}
