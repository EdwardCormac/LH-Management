// Small wrapper around `jose` so the rest of the app doesn't care about the library.
// `jose` is ESM-only, so it is loaded with a dynamic import() that works from CommonJS.
const { JWT_SECRET } = require("../config/env");

const secretKey = new TextEncoder().encode(JWT_SECRET);

let josePromise;
const loadJose = () => {
  if (!josePromise) josePromise = import("jose");
  return josePromise;
};

// Signs an HS256 token. `expiresIn` accepts values like "1d" or "2h".
async function signToken(payload, expiresIn = "1d") {
  const { SignJWT } = await loadJose();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
}

// Resolves to the token's payload (userId, email, role, iat, exp) or throws if invalid/expired.
async function verifyToken(token) {
  const { jwtVerify } = await loadJose();
  const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
  return payload;
}

module.exports = { signToken, verifyToken };
