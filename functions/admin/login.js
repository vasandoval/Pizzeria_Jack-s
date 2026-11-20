
import {
    getAdminPassword,
    comparePasswords,
    createSessionToken,
    sessionCookie,
    isSameOrigin,
    jsonResponse
} from "../_shared/auth.js";

export async function onRequestPost(context) {

    const { request, env } = context;

    if (!isSameOrigin(request)) {
        return jsonResponse(
            { error: "Solicitud no autorizada." },
            403
        );
    }

    if (!env.ADMIN_USERS || !env.SESSION_SECRET) {
        return jsonResponse(
            { error: "Falta configurar el acceso del administrador." },
            500
        );
    }

    let datos;

    try {
        datos = await request.json();
    } catch {
        return jsonResponse(
            { error: "Los datos enviados no son válidos." },
            400
        );
    }

    const email = String(datos.email || "")
        .trim()
        .toLowerCase();

    const password = String(datos.password || "");

    if (
        !email ||
        !password ||
        email.length > 254 ||
        password.length > 256
    ) {
        return jsonResponse(
            { error: "Correo o contraseña incorrectos." },
            401
        );
    }

    const passwordGuardada = getAdminPassword(email, env);

    if (
        typeof passwordGuardada !== "string" ||
        !(await comparePasswords(password, passwordGuardada))
    ) {
        return jsonResponse(
            { error: "Correo o contraseña incorrectos." },
            401
        );
    }

    try {
        const token = await createSessionToken(
            email,
            env.SESSION_SECRET
        );

        return jsonResponse(
            { success: true },
            200,
            {
                "Set-Cookie": sessionCookie(token)
            }
        );

    } catch {
        return jsonResponse(
            { error: "No se pudo iniciar la sesión." },
            500
        );
    }
}
