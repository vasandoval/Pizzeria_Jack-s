
document.addEventListener("DOMContentLoaded", function () {

    const botonMenu = document.querySelector(".boton-menu-movil");
    const navegacion = document.querySelector(".navegacion");

    if (!botonMenu || !navegacion) {
        return;
    }

    function abrirMenu() {
        navegacion.classList.add("abierta");

        botonMenu.setAttribute("aria-expanded", "true");
        botonMenu.setAttribute(
            "aria-label",
            "Cerrar menú de navegación"
        );
    }

    function cerrarMenu() {
        navegacion.classList.remove("abierta");

        botonMenu.setAttribute("aria-expanded", "false");
        botonMenu.setAttribute(
            "aria-label",
            "Abrir menú de navegación"
        );
    }

    botonMenu.addEventListener("click", function () {

        const menuAbierto =
            botonMenu.getAttribute("aria-expanded") === "true";

        if (menuAbierto) {
            cerrarMenu();
        } else {
            abrirMenu();
        }

    });

    // Cerrar el menú al seleccionar una página
    const enlaces = navegacion.querySelectorAll("a");

    enlaces.forEach(function (enlace) {
        enlace.addEventListener("click", cerrarMenu);
    });

    // Cerrar al pulsar fuera del menú
    document.addEventListener("click", function (evento) {

        if (
            !navegacion.contains(evento.target) &&
            !botonMenu.contains(evento.target)
        ) {
            cerrarMenu();
        }

    });

    // Cerrar con la tecla Escape
    document.addEventListener("keydown", function (evento) {

        if (evento.key === "Escape") {
            cerrarMenu();
        }

    });

    // Cerrar al cambiar a pantalla de escritorio
    window.addEventListener("resize", function () {

        if (window.innerWidth > 900) {
            cerrarMenu();
        }

    });

});
