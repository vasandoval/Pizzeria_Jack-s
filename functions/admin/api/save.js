
function respuesta(datos, estado = 200) {
    return new Response(JSON.stringify(datos), {
        status: estado,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store"
        }
    });
}

function decodificarBase64Url(texto) {
    const normalizado = texto
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const relleno = "=".repeat((4 - normalizado.length % 4) % 4);
    const binario = atob(normalizado + relleno);

    return Uint8Array.from(binario, caracter =>
        caracter.charCodeAt(0)
    );
}

function decodificarParteJWT(parte) {
    const bytes = decodificarBase64Url(parte);
    return JSON.parse(new TextDecoder().decode(bytes));
}

async function verificarAcceso(request, env) {
    const token = request.headers.get("Cf-Access-Jwt-Assertion");

    if (
        !token ||
        !env.CF_ACCESS_ISSUER ||
        !env.CF_ACCESS_AUD ||
        !env.ADMIN_EMAILS
    ) {
        return false;
    }

    const partes = token.split(".");

    if (partes.length !== 3) {
        return false;
    }

    try {
        const [parteCabecera, parteDatos, parteFirma] = partes;

        const cabecera = decodificarParteJWT(parteCabecera);
        const datos = decodificarParteJWT(parteDatos);
        const firma = decodificarBase64Url(parteFirma);

        if (cabecera.alg !== "RS256") {
            return false;
        }

        const emisor = env.CF_ACCESS_ISSUER.replace(/\/+$/, "");

        if (datos.iss !== emisor) {
            return false;
        }

        const audiencias = Array.isArray(datos.aud)
            ? datos.aud
            : [datos.aud];

        if (!audiencias.includes(env.CF_ACCESS_AUD)) {
            return false;
        }

        const ahora = Math.floor(Date.now() / 1000);

        if (!datos.exp || datos.exp <= ahora) {
            return false;
        }

        if (datos.nbf && datos.nbf > ahora) {
            return false;
        }

        const correo = String(datos.email || "").toLowerCase();

        const correosAutorizados = env.ADMIN_EMAILS
            .split(",")
            .map(correo => correo.trim().toLowerCase())
            .filter(Boolean);

        if (!correosAutorizados.includes(correo)) {
            return false;
        }

        const urlCertificados = `${emisor}/cdn-cgi/access/certs`;

        const respuestaCertificados = await fetch(urlCertificados);

        if (!respuestaCertificados.ok) {
            return false;
        }

        const certificados = await respuestaCertificados.json();

        const clave = certificados.keys.find(
            elemento => elemento.kid === cabecera.kid
        );

        if (!clave) {
            return false;
        }

        const clavePublica = await crypto.subtle.importKey(
            "jwk",
            clave,
            {
                name: "RSASSA-PKCS1-v1_5",
                hash: "SHA-256"
            },
            false,
            ["verify"]
        );

        const mensaje = new TextEncoder().encode(
            `${parteCabecera}.${parteDatos}`
        );

        return await crypto.subtle.verify(
            "RSASSA-PKCS1-v1_5",
            clavePublica,
            firma,
            mensaje
        );

    } catch (error) {
        return false;
    }
}

function convertirABase64(texto) {
    const bytes = new TextEncoder().encode(texto);
    let binario = "";

    for (let inicio = 0; inicio < bytes.length; inicio += 30000) {
        const fragmento = bytes.subarray(
            inicio,
            Math.min(inicio + 30000, bytes.length)
        );

        binario += String.fromCharCode(...fragmento);
    }

    return btoa(binario);
}

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method !== "POST") {
        return respuesta({ error: "Método no permitido." }, 405);
    }

    const origen = request.headers.get("Origin");
    const origenEsperado = new URL(request.url).origin;

    if (origen !== origenEsperado) {
        return respuesta({ error: "Solicitud no autorizada." }, 403);
    }

    const autorizado = await verificarAcceso(request, env);

    if (!autorizado) {
        return respuesta({ error: "No tienes permiso para guardar cambios." }, 403);
    }

    if (
        !env.GITHUB_TOKEN ||
        !env.GITHUB_OWNER ||
        !env.GITHUB_REPO ||
        !env.GITHUB_BRANCH
    ) {
        return respuesta({ error: "Falta configurar el servicio de guardado." }, 500);
    }

    let datos;

    try {
        datos = await request.json();
    } catch (error) {
        return respuesta({ error: "Los datos enviados no son válidos." }, 400);
    }

    const rutasPermitidas = {
        site: "data/site.json",
        menu: "data/menu.json"
    };

    const ruta = rutasPermitidas[datos.file];

    if (!ruta || typeof datos.content !== "string") {
        return respuesta({ error: "Archivo no permitido." }, 400);
    }

    if (datos.content.length > 400000) {
        return respuesta({ error: "El archivo es demasiado grande." }, 413);
    }

    try {
        const contenido = JSON.parse(datos.content);

        if (
            contenido === null ||
            typeof contenido !== "object" ||
            Array.isArray(contenido)
        ) {
            return respuesta({ error: "El formato del archivo no es válido." }, 400);
        }
    } catch (error) {
        return respuesta({ error: "El JSON contiene errores." }, 400);
    }

    const direccionGitHub =
        `https://api.github.com/repos/` +
        `${encodeURIComponent(env.GITHUB_OWNER)}/` +
        `${encodeURIComponent(env.GITHUB_REPO)}/contents/${ruta}`;

    const encabezados = {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "JACKS-Admin"
    };

    try {
        // Consultar el archivo para obtener su versión actual.
        const consulta = await fetch(
            `${direccionGitHub}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`,
            { headers: encabezados }
        );

        let sha = null;

        if (consulta.ok) {
            const archivoActual = await consulta.json();
            sha = archivoActual.sha;

        } else if (consulta.status !== 404) {
            return respuesta({
                error: "No se pudo consultar el archivo en GitHub."
            }, 502);
        }

        // Enviar el nuevo contenido a GitHub.
        const cuerpo = {
            message: `Actualizar ${ruta} desde el administrador de JACK'S`,
            content: convertirABase64(datos.content),
            branch: env.GITHUB_BRANCH
        };

        if (sha) {
            cuerpo.sha = sha;
        }

        const guardado = await fetch(direccionGitHub, {
            method: "PUT",
            headers: {
                ...encabezados,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(cuerpo)
        });

        if (!guardado.ok) {
            return respuesta({
                error: "GitHub no pudo guardar el archivo. Revisa la configuración."
            }, 502);
        }

        return respuesta({
            success: true,
            message: "Cambios guardados correctamente en GitHub."
        });

    } catch (error) {
        return respuesta({
            error: "No se pudo conectar con GitHub."
        }, 500);
    }
}
