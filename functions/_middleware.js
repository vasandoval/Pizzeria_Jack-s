
import {
    readSession,
    isAdminUser,
    jsonResponse
} from "./_shared/auth.js";

export async function onRequest(context) {
    const { request, env } = context;

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Las páginas públicas de JACK'S no requieren acceso.
    const esRutaAdmin =
        path === "/admin" ||
        path.startsWith("/admin/");

    if (!esRutaAdmin) {
        return context.next();
    }

    // Permitir cargar la página de inicio de sesión.
    if (
        path === "/admin/login.html" &&
        (method === "GET" || method === "HEAD")
    ) {
        return context.next();
    }

    // Permitir los archivos CSS y JS necesarios para el login.
    if (
        (
            path === "/admin/login.css" ||
            path === "/admin/login.js"
        ) &&
        (method === "GET" || method === "HEAD")
    ) {
        return context.next();
    }

    // Permitir el endpoint que recibe las credenciales.
    if (
        path === "/admin/login" &&
        method === "POST"
    ) {
        return context.next();
    }

    // Verificar la sesión del administrador.
    const session = await readSession(
        request,
        env.SESSION_SECRET
    );

    const autorizado =
        session &&
        isAdminUser(session.email, env);

    if (!autorizado) {

        // Las solicitudes de API reciben un error JSON.
        if (
            path.startsWith("/admin/api/") ||
            path === "/admin/logout"
        ) {
            return jsonResponse(
                { error: "Necesitas iniciar sesión." },
                401
            );
        }

        // Las demás rutas protegidas regresan al login.
        return Response.redirect(
            new URL("/admin/login.html", request.url).toString(),
            302
        );
    }

    // Si tiene una sesión válida, puede continuar.
    return context.next();
}
