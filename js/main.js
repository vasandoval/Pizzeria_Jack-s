
// ==========================================
// CONFIGURACIÓN Y CARGA DE DATOS
// ==========================================

async function cargarDatos() {
    try {
        const respuesta = await fetch("data/site.json");

        if (!respuesta.ok) {
            throw new Error("No se pudo cargar site.json");
        }

        const datos = await respuesta.json();

        cargarInformacionGeneral(datos);
        cargarInicio(datos.home);
        cargarContacto(datos.contact);

    } catch (error) {
        console.error("Error al cargar los datos:", error);
    }
}


// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

function colocarTexto(elemento, texto) {
    if (elemento && texto !== undefined && texto !== null && texto !== "") {
        elemento.textContent = texto;
    }
}

function colocarImagen(elemento, ruta, descripcion) {
    if (elemento && ruta) {
        elemento.src = ruta;

        if (descripcion) {
            elemento.alt = descripcion;
        }
    }
}

function colocarWhatsApp(numero) {
    if (!numero) return;

    let enlace = numero;

    if (!numero.startsWith("http")) {
        enlace = "https://api.whatsapp.com/send?phone=" + numero;
    }

    document.querySelectorAll(".boton-whatsapp, .boton-pedir, .flecha")
        .forEach(boton => {
            boton.href = enlace;
        });
}


// ==========================================
// INFORMACIÓN GENERAL DE LA PIZZERÍA
// ==========================================

function cargarInformacionGeneral(datos) {
    const marca = datos.brand;

    if (!marca) return;

    colocarTexto(
        document.querySelector(".nombre-pizzeria span"),
        marca.name
    );

    colocarTexto(
        document.querySelector(".footer-grid h3"),
        marca.name
    );

    colocarImagen(
        document.querySelector(".logo"),
        marca.logo,
        marca.name
    );

    colocarWhatsApp(marca.whatsapp);

    const redes = document.querySelectorAll(".redes a");

    if (redes[0]) {
        colocarEnlace(redes[0], marca.socialLinks?.instagram);
    }

    if (redes[1]) {
        colocarEnlace(redes[1], marca.socialLinks?.facebook);
    }
}

function colocarEnlace(elemento, enlace) {
    if (elemento && enlace) {
        elemento.href = enlace;
        elemento.target = "_blank";
        elemento.rel = "noopener noreferrer";
    }
}


// ==========================================
// PÁGINA DE INICIO
// ==========================================

function cargarInicio(inicio) {
    if (!inicio) return;

    cargarHero(inicio.hero);
    cargarEstadisticas(inicio.stats);
    cargarProductoDestacado(inicio.featuredProduct);
    cargarCombos(inicio.combos);
    cargarHistoria(inicio.story);
}


// ==========================================
// SECCIÓN HERO
// ==========================================

function cargarHero(hero) {
    if (!hero) return;

    const etiquetas = document.querySelectorAll(".etiquetas span");

    if (Array.isArray(hero.eyebrow)) {
        hero.eyebrow.forEach((texto, indice) => {
            colocarTexto(etiquetas[indice], texto);
        });
    }

    colocarTexto(
        document.querySelector(".hero-texto h1"),
        hero.title
    );

    colocarTexto(
        document.querySelector(".hero-texto > p"),
        hero.description
    );
}


// ==========================================
// ESTADÍSTICAS
// ==========================================

function cargarEstadisticas(estadisticas) {
    if (!Array.isArray(estadisticas)) return;

    const elementos = document.querySelectorAll(".estadisticas > div");

    estadisticas.forEach((dato, indice) => {
        const elemento = elementos[indice];

        if (!elemento) return;

        colocarTexto(elemento.querySelector("span"), dato.value);
        colocarTexto(elemento.querySelector("p"), dato.label);
    });
}


// ==========================================
// PRODUCTO DESTACADO
// ==========================================

function cargarProductoDestacado(producto) {
    if (!producto) return;

    const tarjeta = document.querySelector(".pizza-card");

    if (!tarjeta) return;

    colocarImagen(
        tarjeta.querySelector(".pizza-imagen img"),
        producto.image,
        producto.name
    );

    colocarTexto(
        tarjeta.querySelector(".estrella"),
        producto.label
    );

    colocarTexto(
        tarjeta.querySelector(".precio"),
        producto.price
    );

    colocarTexto(
        tarjeta.querySelector(".pizza-info h2"),
        producto.name
    );

    colocarTexto(
        tarjeta.querySelector(".pizza-info p"),
        producto.description
    );
}


// ==========================================
// COMBOS
// ==========================================

function cargarCombos(combos) {
    if (!Array.isArray(combos)) return;

    const tarjetas = document.querySelectorAll(".combo-card");

    combos.forEach((combo, indice) => {
        const tarjeta = tarjetas[indice];

        if (!tarjeta) return;

        colocarImagen(
            tarjeta.querySelector(".combo-imagen img"),
            combo.image,
            combo.name
        );

        colocarTexto(
            tarjeta.querySelector(".combo-imagen span"),
            combo.label
        );

        colocarTexto(
            tarjeta.querySelector(".combo-imagen small"),
            combo.detail
        );

        colocarTexto(
            tarjeta.querySelector(".combo-contenido > span"),
            combo.category
        );

        colocarTexto(
            tarjeta.querySelector(".combo-contenido h3"),
            combo.name
        );

        colocarTexto(
            tarjeta.querySelector(".combo-contenido p"),
            combo.description
        );

        colocarTexto(
            tarjeta.querySelector(".combo-precio strong"),
            combo.price
        );
    });
}


// ==========================================
// HISTORIA
// ==========================================

function cargarHistoria(historia) {
    if (!historia) return;

    colocarTexto(
        document.querySelector(".historia h2"),
        historia.title
    );

    colocarTexto(
        document.querySelector(".historia > p"),
        historia.description
    );

    colocarImagen(
        document.querySelector(".visual-imagen img"),
        historia.image,
        historia.title
    );
}


// ==========================================
// INFORMACIÓN DE CONTACTO EN EL FOOTER
// ==========================================

function cargarContacto(contacto) {
    if (!contacto) return;

    const columnas = document.querySelectorAll(".footer-grid > div");

    if (columnas[1]) {
        colocarTexto(columnas[1].querySelector("p"), contacto.hours);
    }

    if (columnas[2]) {
        const textos = columnas[2].querySelectorAll("p");

        colocarTexto(textos[0], contacto.address);
        colocarTexto(textos[1], contacto.phone);
    }

    if (columnas[3]) {
        colocarTexto(
            columnas[3].querySelector("p"),
            contacto.socialText
        );
    }
}


// ==========================================
// INICIAR CARGA
// ==========================================

document.addEventListener("DOMContentLoaded", cargarDatos);
