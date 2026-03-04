// Simple phone/mobile validation helper
// Accepts empty values (optional phone). If provided, strips non-digits and
// ensures length between 10 and 15 digits (covers local and international formats).
export function isValidPhone(value) {
    if (!value) return true
    const digits = String(value).replace(/\D+/g, '')
    return digits.length >= 10 && digits.length <= 15
}

export function normalizePhone(value) {
    if (!value) return ''
    return String(value).replace(/\D+/g, '')
}
