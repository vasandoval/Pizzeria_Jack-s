
import {
    readSession,
    isAdminUser,
    isSameOrigin,
    jsonResponse
} from "../../_shared/auth.js";

// Convertir el texto a Base64 compatible con caracteres especiales.
function convertirABase64(texto) {
    const bytes = new TextEncoder().encode(texto);
    let binario = "";

    for (let i = 0; i < bytes.length; i += 30000) {
        const fragmento = bytes.subarray(
            i,
            Math.min(i + 30000, bytes.length)
        );

        binario += String.fromCharCode(...fragmento);
    }

    return btoa(binario);
}

export async function onRequestPost(context) {

    const { request, env } = context;

    // Comprobar el origen de la solicitud.
    if (!isSameOrigin(request)) {
        return jsonResponse(
            { error: "Solicitud no autorizada." },
            403
        );
    }

    // Comprobar que el usuario tenga una sesión válida.
    const session = await readSession(
        request,
        env.SESSION_SECRET
    );

    if (!session || !isAdminUser(session.email, env)) {
        return jsonResponse(
            { error: "Necesitas iniciar sesión." },
            401
        );
    }

    // Comprobar la configuración de GitHub.
    if (
        !env.GITHUB_TOKEN ||
        !env.GITHUB_OWNER ||
        !env.GITHUB_REPO ||
        !env.GITHUB_BRANCH
    ) {
        return jsonResponse(
            { error: "Falta configurar GitHub en Cloudflare." },
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

    // Solo permitimos modificar estos dos archivos.
    const archivosPermitidos = {
        site: "data/site.json",
        menu: "data/menu.json"
    };

    const ruta = archivosPermitidos[datos.file];

    if (!ruta || typeof datos.content !== "string") {
        return jsonResponse(
            { error: "Archivo no permitido." },
            400
        );
    }

    if (datos.content.length > 400000) {
        return jsonResponse(
            { error: "El archivo es demasiado grande." },
            413
        );
    }

    // Comprobar que el JSON sea válido.
    try {
        const contenido = JSON.parse(datos.content);

        if (
            contenido === null ||
            typeof contenido !== "object" ||
            Array.isArray(contenido)
        ) {
            return jsonResponse(
                { error: "La estructura del archivo no es válida." },
                400
            );
        }

    } catch {
        return jsonResponse(
            { error: "El contenido JSON tiene errores." },
            400
        );
    }

    const propietario = encodeURIComponent(env.GITHUB_OWNER);
    const repositorio = encodeURIComponent(env.GITHUB_REPO);

    const direccionGitHub =
        `https://api.github.com/repos/${propietario}/` +
        `${repositorio}/contents/${ruta}`;

    const encabezados = {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "JACKS-Admin"
    };

    try {

        // Consultar la versión actual del archivo.
        const consulta = await fetch(
            `${direccionGitHub}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`,
            { headers: encabezados }
        );

        let sha = null;

        if (consulta.ok) {
            const archivoActual = await consulta.json();
            sha = archivoActual.sha;

        } else if (consulta.status !== 404) {
            return jsonResponse(
                { error: "No se pudo consultar el archivo en GitHub." },
                502
            );
        }

        // Preparar el nuevo contenido.
        const cuerpo = {
            message: `Actualizar ${ruta} desde el administrador JACK'S`,
            content: convertirABase64(datos.content),
            branch: env.GITHUB_BRANCH
        };

        if (sha) {
            cuerpo.sha = sha;
        }

        // Guardar el archivo en GitHub.
        const guardado = await fetch(direccionGitHub, {
            method: "PUT",
            headers: {
                ...encabezados,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(cuerpo)
        });

        if (!guardado.ok) {
            return jsonResponse(
                { error: "GitHub no pudo guardar los cambios." },
                502
            );
        }

        return jsonResponse({
            success: true,
            message: "Cambios guardados correctamente."
        });

    } catch {
        return jsonResponse(
            { error: "No se pudo conectar con GitHub." },
            500
        );
    }
}
