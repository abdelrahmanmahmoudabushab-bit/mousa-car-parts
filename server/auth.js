import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'mousa_carparts_pos_secret_2026_change_me!';

/**
 * Sign JWT Token
 */
export function signJwt(payload, expiresInSeconds = 86400 * 7) { // 7 days token validity
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const bodyPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds
  };
  const payloadBase64 = Buffer.from(JSON.stringify(bodyPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payloadBase64}`)
    .digest('base64url');

  return `${header}.${payloadBase64}.${signature}`;
}

/**
 * Verify JWT Token
 */
export function verifyJwt(token) {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payloadBase64, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payloadBase64}`)
      .digest('base64url');

    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf-8'));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;

    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Express Middleware to protect API routes
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.headers['x-auth-token'];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No authentication token provided.' });
  }

  const user = verifyJwt(token);
  if (!user) {
    return res.status(403).json({ error: 'Invalid or expired token. Please log in again.' });
  }

  req.user = user;
  next();
}

/**
 * Role Permission Middleware
 */
export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Permission denied. Requires ${allowedRoles.join(' or ')} role.` });
    }
    next();
  };
}
