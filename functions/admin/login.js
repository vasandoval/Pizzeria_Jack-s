
import {
    getAdminPassword,
    comparePasswords,
    createSessionToken,
    sessionCookie,
    jsonResponse,
    isSameOrigin
} from "../_shared/auth.js";

export async function onRequestPost({ request, env }) {
    // Comprobar que la solicitud venga de nuestra página.
    if (!isSameOrigin(request)) {
        return jsonResponse(
            { error: "Solicitud no permitida." },
            403
        );
    }

    // Comprobar que exista el secreto para firmar sesiones.
    if (!env.SESSION_SECRET) {
        return jsonResponse(
            { error: "Error de configuración del servidor." },
            500
        );
    }

    try {
        const datos = await request.json();

        const email = typeof datos.email === "string"
            ? datos.email.trim()
            : "";

        const password = typeof datos.password === "string"
            ? datos.password
            : "";

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

        // Buscar la contraseña del usuario autorizado.
        const passwordGuardada = getAdminPassword(email, env);

        if (typeof passwordGuardada !== "string") {
            return jsonResponse(
                { error: "Correo o contraseña incorrectos." },
                401
            );
        }

        // Comparar las contraseñas.
        const contrasenaCorrecta = await comparePasswords(
            password,
            passwordGuardada
        );

        if (!contrasenaCorrecta) {
            return jsonResponse(
                { error: "Correo o contraseña incorrectos." },
                401
            );
        }

        // Crear una sesión firmada.
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
            { error: "No se pudo procesar el inicio de sesión." },
            400
        );
    }
}
