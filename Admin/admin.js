
const archivos = {
    site: {
        editor: document.getElementById("editorSite"),
        estado: document.getElementById("estadoSite"),
        guardar: document.getElementById("guardarSite"),
        recargar: document.getElementById("recargarSite")
    },

    menu: {
        editor: document.getElementById("editorMenu"),
        estado: document.getElementById("estadoMenu"),
        guardar: document.getElementById("guardarMenu"),
        recargar: document.getElementById("recargarMenu")
    }
};

async function cargarArchivo(nombre) {
    const archivo = archivos[nombre];

    archivo.estado.textContent = "Cargando...";

    try {
        const respuesta = await fetch(
            `/data/${nombre}.json?actualizacion=${Date.now()}`,
            { cache: "no-store" }
        );

        if (!respuesta.ok) {
            throw new Error("No se pudo cargar el archivo.");
        }

        const datos = await respuesta.json();

        archivo.editor.value = JSON.stringify(datos, null, 2);
        archivo.estado.textContent = "Información cargada.";

    } catch (error) {
        archivo.estado.textContent = error.message;
    }
}

async function guardarArchivo(nombre) {
    const archivo = archivos[nombre];

    let contenido;

    try {
        contenido = JSON.parse(archivo.editor.value);

        if (
            contenido === null ||
            typeof contenido !== "object" ||
            Array.isArray(contenido)
        ) {
            throw new Error("El contenido debe ser un objeto JSON.");
        }

    } catch (error) {
        archivo.estado.textContent =
            "Revisa el formato JSON: " + error.message;
        return;
    }

    archivo.guardar.disabled = true;
    archivo.estado.textContent = "Guardando cambios...";

    try {
        const respuesta = await fetch("/admin/api/save", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                file: nombre,
                content: JSON.stringify(contenido, null, 2)
            })
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                resultado.error || "No se pudieron guardar los cambios."
            );
        }

        archivo.estado.textContent =
            "Guardado en GitHub. Cloudflare iniciará la publicación.";

    } catch (error) {
        archivo.estado.textContent = error.message;

    } finally {
        archivo.guardar.disabled = false;
    }
}

archivos.site.guardar.addEventListener("click", () => {
    guardarArchivo("site");
});

archivos.menu.guardar.addEventListener("click", () => {
    guardarArchivo("menu");
});

archivos.site.recargar.addEventListener("click", () => {
    cargarArchivo("site");
});

archivos.menu.recargar.addEventListener("click", () => {
    cargarArchivo("menu");
});

cargarArchivo("site");
cargarArchivo("menu");


// Cerrar sesión del administrador
const botonCerrarSesion = document.getElementById("cerrarSesion");

if (botonCerrarSesion) {

    botonCerrarSesion.addEventListener("click", async function () {

        botonCerrarSesion.disabled = true;
        botonCerrarSesion.textContent = "Cerrando sesión...";

        try {

            const respuesta = await fetch("/admin/logout", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({})
            });

            if (!respuesta.ok) {
                throw new Error("No se pudo cerrar la sesión.");
            }

            window.location.replace("/admin/login.html");

        } catch (error) {

            alert(error.message);

            botonCerrarSesion.disabled = false;
            botonCerrarSesion.textContent = "Cerrar sesión";

        }

    });

}
