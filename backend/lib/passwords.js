/**
 * Password hashing via Node's built-in crypto.scrypt — a modern,
 * memory-hard KDF, and already part of Node core, so this adds no
 * dependency at all (consistent with the rest of this backend's
 * "no unnecessary dependencies" approach). Shared by
 * scripts/create-admin.js and routes/auth.js so the hashing logic
 * exists in exactly one place.
 *
 * Stored format: "<saltHex>:<hashHex>" in admin_users.password_hash.
 */
const crypto = require('crypto');

const SALT_BYTES = 16;
const KEY_LENGTH = 64;

/**
 * @param {string} password
 * @returns {Promise<string>} "<saltHex>:<hashHex>"
 */
function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(SALT_BYTES);
    crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt.toString('hex')}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Constant-time comparison against a stored "<saltHex>:<hashHex>"
 * value.
 * @param {string} password
 * @param {string} storedHash
 * @returns {Promise<boolean>}
 */
function verifyPassword(password, storedHash) {
  return new Promise((resolve, reject) => {
    const [saltHex, hashHex] = String(storedHash).split(':');
    if (!saltHex || !hashHex) return resolve(false);

    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');

    crypto.scrypt(password, salt, expected.length, (err, derivedKey) => {
      if (err) return reject(err);
      // Buffers must be equal length for timingSafeEqual — guard
      // against a corrupted/mismatched stored hash rather than throw.
      if (derivedKey.length !== expected.length) return resolve(false);
      resolve(crypto.timingSafeEqual(derivedKey, expected));
    });
  });
}

module.exports = { hashPassword, verifyPassword };
