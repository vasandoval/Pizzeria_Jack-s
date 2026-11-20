
const formulario = document.getElementById("formularioLogin");
const mensaje = document.getElementById("mensaje");
const boton = document.getElementById("botonLogin");

formulario.addEventListener("submit", async function(evento) {
    evento.preventDefault();

    boton.disabled = true;
    boton.textContent = "Verificando...";
    mensaje.textContent = "";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
        const respuesta = await fetch("/admin/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                resultado.error || "No se pudo iniciar sesión."
            );
        }

        window.location.replace("/admin/");

    } catch (error) {
        mensaje.textContent = error.message;

    } finally {
        boton.disabled = false;
        boton.textContent = "Iniciar sesión";
    }
});
