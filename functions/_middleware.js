
import {
    readSession,
    isAdminUser,
    jsonResponse
} from "./_shared/auth.js";

export async function onRequest(context) {

    const { request, env } = context;

    const url = new URL(request.url);
    const path = url.pathname;

    // Las páginas públicas de JACK'S no requieren acceso.
    const esRutaAdmin =
        path === "/admin" ||
        path.startsWith("/admin/");

    if (!esRutaAdmin) {
        return context.next();
    }

    // Permitir mostrar la pantalla de inicio de sesión.
    if (
        path === "/admin/login.html" ||
        path === "/admin/login"
    ) {
        return context.next();
    }

    // Verificar la sesión.
    const session = await readSession(
        request,
        env.SESSION_SECRET
    );

    const autorizado =
        session && isAdminUser(session.email, env);

    if (!autorizado) {

        // Las solicitudes de la API reciben un error JSON.
        if (
            path.startsWith("/admin/api/") ||
            path === "/admin/logout"
        ) {
            return jsonResponse(
                { error: "Necesitas iniciar sesión." },
                401
            );
        }

        // Las demás solicitudes regresan al login.
        return Response.redirect(
            new URL("/admin/login.html", request.url).toString(),
            302
        );
    }

    return context.next();
}
