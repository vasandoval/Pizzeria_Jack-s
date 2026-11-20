
const COOKIE_NAME = "jacks_admin_session";
const SESSION_DURATION = 8 * 60 * 60;

const encoder = new TextEncoder();

function encodeBase64Url(bytes) {
    let binary = "";

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
}

function decodeBase64Url(value) {
    const normalized = value
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const padding = "=".repeat((4 - normalized.length % 4) % 4);
    const binary = atob(normalized + padding);

    return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function getSigningKey(secret) {
    return crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        {
            name: "HMAC",
            hash: "SHA-256"
        },
        false,
        ["sign", "verify"]
    );
}

// Leer los usuarios autorizados desde Cloudflare.
export function getAdminPassword(email, env) {
    try {
        const users = JSON.parse(env.ADMIN_USERS || "{}");

        const entry = Object.entries(users).find(
            ([registeredEmail]) =>
                registeredEmail.toLowerCase() === email.toLowerCase()
        );

        return entry ? entry[1] : null;

    } catch {
        return null;
    }
}

export function isAdminUser(email, env) {
    return typeof getAdminPassword(email, env) === "string";
}

// Comparar contraseñas sin comparación directa carácter por carácter.
export async function comparePasswords(provided, stored) {
    const providedHash = await crypto.subtle.digest(
        "SHA-256",
        encoder.encode(provided)
    );

    const storedHash = await crypto.subtle.digest(
        "SHA-256",
        encoder.encode(stored)
    );

    const first = new Uint8Array(providedHash);
    const second = new Uint8Array(storedHash);

    let difference = 0;

    for (let i = 0; i < first.length; i++) {
        difference |= first[i] ^ second[i];
    }

    return difference === 0;
}

// Crear una sesión firmada.
export async function createSessionToken(email, secret) {
    const payload = {
        email,
        expiresAt: Math.floor(Date.now() / 1000) + SESSION_DURATION
    };

    const encodedPayload = encodeBase64Url(
        encoder.encode(JSON.stringify(payload))
    );

    const key = await getSigningKey(secret);

    const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(encodedPayload)
    );

    return `${encodedPayload}.${encodeBase64Url(
        new Uint8Array(signature)
    )}`;
}

// Comprobar que la sesión recibida sea válida.
export async function readSession(request, secret) {
    if (!secret) return null;

    try {
        const cookies = request.headers.get("Cookie") || "";

        const cookie = cookies
            .split(";")
            .map(value => value.trim())
            .find(value => value.startsWith(COOKIE_NAME + "="));

        if (!cookie) return null;

        const token = cookie.substring(COOKIE_NAME.length + 1);
        const parts = token.split(".");

        if (parts.length !== 2) return null;

        const [encodedPayload, encodedSignature] = parts;

        const key = await getSigningKey(secret);

        const valid = await crypto.subtle.verify(
            "HMAC",
            key,
            decodeBase64Url(encodedSignature),
            encoder.encode(encodedPayload)
        );

        if (!valid) return null;

        const payload = JSON.parse(
            new TextDecoder().decode(
                decodeBase64Url(encodedPayload)
            )
        );

        const now = Math.floor(Date.now() / 1000);

        if (
            typeof payload.email !== "string" ||
            typeof payload.expiresAt !== "number" ||
            payload.expiresAt <= now
        ) {
            return null;
        }

        return payload;

    } catch {
        return null;
    }
}

// Crear la cookie de sesión.
export function sessionCookie(token) {
    return `${COOKIE_NAME}=${token}; Path=/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DURATION}`;
}

// Eliminar la cookie.
export function expiredSessionCookie() {
    return `${COOKIE_NAME}=; Path=/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

// Comprobar que la solicitud venga de la misma página.
export function isSameOrigin(request) {
    const origin = request.headers.get("Origin");

    return Boolean(
        origin &&
        origin === new URL(request.url).origin
    );
}

// Respuestas JSON.
export function jsonResponse(data, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            ...extraHeaders
        }
    });
}
