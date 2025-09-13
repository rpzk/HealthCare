import crypto from 'crypto'

const ENC_ALG = 'aes-256-gcm'
const KEY = (process.env.ENCRYPTION_KEY || '').padEnd(32, '0').slice(0, 32)
const SALT = process.env.HASH_SALT || 'default_salt'

export function encrypt(value) {
	if (!value) return null
	try {
		const iv = crypto.randomBytes(12)
		const cipher = crypto.createCipheriv(ENC_ALG, Buffer.from(KEY), iv)
		const enc = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
		const tag = cipher.getAuthTag()
		return 'enc::' + Buffer.concat([iv, tag, enc]).toString('base64')
	} catch {
		return null
	}
}

export function decrypt(payload) {
	if (!payload) return null
	if (typeof payload !== 'string') return null
	if (!payload.startsWith('enc::')) return payload
	try {
		const raw = Buffer.from(payload.slice(5), 'base64')
		const iv = raw.subarray(0, 12)
		const tag = raw.subarray(12, 28)
		const data = raw.subarray(28)
		const decipher = crypto.createDecipheriv(ENC_ALG, Buffer.from(KEY), iv)
		decipher.setAuthTag(tag)
		const dec = Buffer.concat([decipher.update(data), decipher.final()])
		return dec.toString('utf8')
	} catch {
		return null
	}
}

export function hashCPF(cpf) {
	if (!cpf) return null
	const digits = String(cpf).replace(/\D/g, '')
	return crypto.createHash('sha256').update(SALT + ':' + digits).digest('hex')
}

