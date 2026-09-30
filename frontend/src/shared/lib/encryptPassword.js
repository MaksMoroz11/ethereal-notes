import { api } from '../api/client'

function toBase64(buffer) {
	return btoa(Array.from(new Uint8Array(buffer), byte => String.fromCharCode(byte)).join(''))
}

function fromBase64(value) {
	return Uint8Array.from(atob(value), char => char.charCodeAt(0))
}

export async function encryptPassword(password) {
	if (!globalThis.crypto?.subtle) throw new Error('Для входа требуется HTTPS или localhost')
	const { key_id, public_key } = await api('/auth/public-key')
	const publicKey = await crypto.subtle.importKey(
		'spki', fromBase64(public_key), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']
	)
	const aesKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt'])
	const nonce = crypto.getRandomValues(new Uint8Array(12))
	const ciphertext = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv: nonce }, aesKey, new TextEncoder().encode(password)
	)
	const rawKey = await crypto.subtle.exportKey('raw', aesKey)
	const wrappedKey = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, rawKey)
	return {
		key_id,
		encrypted_key: toBase64(wrappedKey),
		nonce: toBase64(nonce),
		encrypted_password: toBase64(ciphertext),
	}
}
