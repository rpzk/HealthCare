declare module 'node-forge' {
  namespace pki {
    interface Certificate {
      publicKey: any
      issuer: any
      subject: any
      serialize(): string
    }

    interface PrivateKey {
      decrypt(ciphertext: string | ArrayBuffer, scheme?: string): string
      sign(md: any): any
    }

    function certificateFromPem(pem: string): Certificate
    function certificateToPem(cert: Certificate): string
    function privateKeyFromPem(pem: string): PrivateKey
    function publicKeyToPem(key: any): string
    function createCertificate(): Certificate

    const oids: {
      certBag: string
      pkcs8ShroudedKeyBag: string
      [key: string]: string
    }
  }

  namespace asn1 {
    interface Asn1Object {
      type: string
      value: any
    }
    function fromDer(der: string | ArrayBuffer, strict?: boolean): Asn1Object
  }

  namespace util {
    interface ByteBuffer {
      getBytes(count?: number): string
      putInt32(int: number): ByteBuffer
      toHex(): string
    }
    function createBuffer(input?: string, encoding?: string): ByteBuffer
    function encode64(bytes: string | ArrayBuffer): string
    function decode64(encoded: string): string
  }

  namespace md {
    interface MessageDigest {
      update(msg: string, encoding?: string): MessageDigest
      digest(): any
    }
    namespace sha256 {
      function create(): MessageDigest
    }
  }

  namespace pkcs12 {
    function pkcs12FromAsn1(asn1: any, password: string): any
  }

  namespace random {
    function getBytes(count: number): string
  }

  export var asn1: typeof asn1
  export var md: typeof md
  export var pki: typeof pki
  export var pkcs12: typeof pkcs12
  export var random: typeof random
  export var util: typeof util
}
