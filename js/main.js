// =========================================================
//  CONFIGURACIÓN
//  Pega aquí la URL de tu Apps Script (termina en /exec).
//  Mientras esté vacía, el formulario funciona en "modo prueba":
//  no envía nada y muestra el JSON en la consola del navegador (F12).
// =========================================================
const URL_APPS_SCRIPT = '';


// ---------- Menú en celular (botón hamburguesa) ----------
const menuBoton = document.getElementById('menu-boton');
const menu = document.getElementById('menu');

menuBoton.addEventListener('click', () => {
    const abierto = menu.classList.toggle('is-active');
    menuBoton.classList.toggle('is-active', abierto);
    menuBoton.setAttribute('aria-expanded', String(abierto));
});

// Cerrar el menú al elegir una sección
menu.querySelectorAll('a').forEach((enlace) => {
    enlace.addEventListener('click', () => {
        menu.classList.remove('is-active');
        menuBoton.classList.remove('is-active');
        menuBoton.setAttribute('aria-expanded', 'false');
    });
});

// Año actual en el pie de página
document.getElementById('anio').textContent = new Date().getFullYear();


// ---------- Formulario de contacto ----------
const form = document.getElementById('form-contacto');
const botonEnviar = document.getElementById('boton-enviar');
const estado = document.getElementById('form-estado');

// Quita espacios, guiones, puntos y paréntesis: "+56 9 1234-5678" -> "+56912345678"
function limpiarCelular(valor) {
    return valor.replace(/[\s\-().]/g, '');
}

// Celular chileno: 9 + 8 dígitos, con o sin +56 adelante
function esCelularValido(valor) {
    return /^(\+?56)?9\d{8}$/.test(limpiarCelular(valor));
}

// Siempre guarda el celular en el mismo formato: +569XXXXXXXX
function normalizarCelular(valor) {
    return '+56' + limpiarCelular(valor).replace(/^\+?56/, '');
}

// Cada regla devuelve true si está bien, o el mensaje de error
const reglas = {
    nombre: (v) => v.length >= 2 || 'Escribe tu nombre.',
    apellido: (v) => v.length >= 2 || 'Escribe tu apellido.',
    celular: (v) => esCelularValido(v) || 'Ingresa un celular válido, por ejemplo +56 9 1234 5678.',
    correo: (v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'El correo no parece válido.',
    consulta: (v) => v.length >= 5 || 'Cuéntame brevemente qué necesitas.',
};

function mostrarError(campo, mensaje) {
    const input = form.elements[campo];
    const error = document.getElementById('error-' + campo);
    error.textContent = mensaje || '';
    input.classList.toggle('is-danger', Boolean(mensaje));
    input.setAttribute('aria-invalid', mensaje ? 'true' : 'false');
    if (mensaje) {
        input.setAttribute('aria-describedby', error.id);
    } else {
        input.removeAttribute('aria-describedby');
    }
}

function validarCampo(campo) {
    const resultado = reglas[campo](form.elements[campo].value.trim());
    mostrarError(campo, resultado === true ? '' : resultado);
    return resultado === true;
}

function validarFormulario() {
    let primeroConError = null;

    Object.keys(reglas).forEach((campo) => {
        if (!validarCampo(campo) && !primeroConError) {
            primeroConError = form.elements[campo];
        }
    });

    const acepta = form.elements.acepta;
    const errorAcepta = document.getElementById('error-acepta');
    errorAcepta.textContent = acepta.checked ? '' : 'Debes aceptar para que pueda contactarte.';
    if (!acepta.checked && !primeroConError) {
        primeroConError = acepta;
    }

    if (primeroConError) {
        primeroConError.focus();
        return false;
    }
    return true;
}

// Si un campo ya mostró error, se vuelve a revisar mientras la persona corrige
Object.keys(reglas).forEach((campo) => {
    form.elements[campo].addEventListener('input', () => {
        if (form.elements[campo].classList.contains('is-danger')) {
            validarCampo(campo);
        }
    });
});
form.elements.acepta.addEventListener('change', () => {
    if (form.elements.acepta.checked) {
        document.getElementById('error-acepta').textContent = '';
    }
});

// tipo: 'is-success' | 'is-danger' | 'is-warning'
function mostrarEstado(mensaje, tipo) {
    estado.className = 'notification ' + tipo;
    estado.textContent = mensaje;
}

function ocultarEstado() {
    estado.className = 'notification is-hidden';
    estado.textContent = '';
}

form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    ocultarEstado();

    if (!validarFormulario()) {
        return;
    }

    // Honeypot lleno = bot. Se le muestra "éxito" pero no se envía nada.
    if (form.elements.sitio_web.value !== '') {
        form.reset();
        mostrarEstado('¡Gracias! Recibí tus datos y te contactaré pronto.', 'is-success');
        return;
    }

    // Este es el JSON que te llega
    const datos = {
        nombre: form.elements.nombre.value.trim(),
        apellido: form.elements.apellido.value.trim(),
        correo: form.elements.correo.value.trim(),
        celular: normalizarCelular(form.elements.celular.value),
        consulta: form.elements.consulta.value.trim(),
    };

    if (!URL_APPS_SCRIPT) {
        console.info('MODO PRUEBA: el formulario no está conectado. Este JSON es el que se enviaría:');
        console.info(JSON.stringify(datos, null, 2));
        mostrarEstado(
            'Modo prueba: el formulario todavía no está conectado a Google Sheets. ' +
            'Abre la consola (F12) para ver el JSON que se enviaría.',
            'is-warning'
        );
        return;
    }

    botonEnviar.disabled = true;
    botonEnviar.classList.add('is-loading');

    try {
        const respuesta = await fetch(URL_APPS_SCRIPT, {
            method: 'POST',
            // text/plain y no application/json: así Google acepta la petición sin bloquearla por CORS
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(datos),
        });
        const resultado = await respuesta.json();

        if (!resultado.ok) {
            throw new Error(resultado.error || 'Respuesta no válida');
        }

        form.reset();
        mostrarEstado('¡Gracias! Recibí tus datos y te contactaré pronto.', 'is-success');
    } catch (error) {
        console.error('No se pudo enviar el formulario:', error);
        mostrarEstado(
            'No se pudo enviar tu consulta. Inténtalo de nuevo en unos minutos o escríbeme por WhatsApp.',
            'is-danger'
        );
    } finally {
        botonEnviar.disabled = false;
        botonEnviar.classList.remove('is-loading');
    }
});
