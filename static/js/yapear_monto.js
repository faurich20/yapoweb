const montoInput = document.getElementById('monto-input');
const msgError = document.getElementById('msg-error');
const msgLimit = document.getElementById('msg-limit');
const btnOutline = document.querySelector('.btn-outline'); // Otros bancos
const btnYapear = document.getElementById('btn-yapear');

const messageInput = document.querySelector('.message-input');
const messageContainer = document.querySelector('.message-input-container');

// Obtener datos del contacto desde la URL
const pathParts = window.location.pathname.split('/');
// Asume ruta /yapear/monto/<id>
const contactoId = pathParts[pathParts.length - 1];


// --- AUTO RESIZE INPUT MONTO ---
function adjustInputWidth() {
    // Obtenemos el valor actual
    let val = montoInput.value;

    // Si está vacío, asumimos ancho de 1 caracter
    let valLength = val.length || 1;

    // Ajuste mejorado: 0.65em por caracter + 15px fijos de holgura
    // Los 15px extra son claves para que el punto '.' no se corte y el cursor tenga aire
    montoInput.style.width = `calc(${valLength * 0.65}em + 15px)`;
}

// --- FORZAR CURSOR AL FINAL (Comportamiento Cajero) ---
function forceCursorToEnd() {
    const len = montoInput.value.length;
    // Pone el cursor al final del texto
    montoInput.setSelectionRange(len, len);
}

function validarMonto() {
    let valor = montoInput.value;
    // Sanear entrada: solo números y un punto
    valor = valor.replace(/[^0-9.]/g, '');

    // Evitar ceros a la izquierda (ej: 00 -> 0, 05 -> 5)
    // Regex: Reemplaza ceros al inicio SOLO si les sigue otro dígito.
    valor = valor.replace(/^0+(?=\d)/, '');

    // Evitar múltiples puntos
    const parts = valor.split('.');
    if (parts.length > 2) {
        valor = parts[0] + '.' + parts.slice(1).join('');
    }

    // UX: Si empieza con punto, agregar '0' antes
    if (valor.startsWith('.')) {
        valor = '0' + valor;
    }

    // RESTRICCIÓN DE 2 DECIMALES
    if (valor.includes('.')) {
        const parts = valor.split('.');
        // Cortar parte entera a 4 dígitos
        if (parts[0].length > 4) {
            parts[0] = parts[0].substring(0, 4);
        }
        // Cortar decimales a 2 dígitos
        if (parts[1].length > 2) {
            parts[1] = parts[1].substring(0, 2);
        }
        valor = parts[0] + '.' + parts[1];
    } else {
        // Si no tiene punto, solo verificar longitud de enteros
        if (valor.length > 4) {
            valor = valor.substring(0, 4);
        }
    }

    // Actualizar valor saneado si cambió
    if (montoInput.value !== valor) {
        montoInput.value = valor;
    }

    // Auto resize
    adjustInputWidth();

    // Lógica de validación
    let esNumeroValido = false;

    if (valor && valor !== '.') {
        const numero = parseFloat(valor);
        // Validar que sea mayor a 0 Y menor o igual a 500
        if (numero > 0 && numero <= 500) {
            esNumeroValido = true;
        }
    }

    if (esNumeroValido) {
        mostrarEstado(true);
    } else {
        mostrarEstado(false);
    }
}

// Eventos para controlar el cursor
montoInput.addEventListener('click', forceCursorToEnd);
montoInput.addEventListener('focus', forceCursorToEnd);
// Al soltar una tecla o escribir, aseguramos que siga al final (útil si intentan moverlo con flechas)
montoInput.addEventListener('keyup', () => {
    // Pequeño delay para dejar que el evento nativo ocurra y luego corregir
    setTimeout(forceCursorToEnd, 0);
});

function mostrarEstado(valido) {
    if (valido) {
        msgError.style.display = 'none';
        msgLimit.style.display = 'block';
        btnOutline.disabled = false;
        btnYapear.disabled = false;
    } else {
        msgError.style.display = 'block';
        msgLimit.style.display = 'none';
        btnOutline.disabled = true;
        btnYapear.disabled = true;
    }
}

// Efecto borde morado en mensaje
messageInput.addEventListener('focus', () => {
    messageContainer.classList.add('active');
});

messageInput.addEventListener('blur', () => {
    // Si no hay texto, remover morado. Si hay texto, ¿se queda? En Yape suele quedarse si escribes.
    // Vamos a dejarlo morado solo si tiene texto o foco
    if (!messageInput.value) {
        messageContainer.classList.remove('active');
    }
});

messageInput.addEventListener('input', () => {
    if (messageInput.value) {
        messageContainer.classList.add('active');
    }
});

// Inicializar estado y ancho
// Inicializar estado y ancho
adjustInputWidth();
// --- CONTROL VISUAL VIEWPORT (Teclado real) ---
function setViewportHeight() {
    // Obtenemos la altura del viewport visual (el visible real)
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    // Forzamos la altura del body si es necesario
    document.body.style.height = `${vh}px`;

    // Scroll al top para evitar que se esconda el header
    window.scrollTo(0, 0);
}

if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', setViewportHeight);
    window.visualViewport.addEventListener('scroll', setViewportHeight);
}
window.addEventListener('resize', setViewportHeight);
setViewportHeight(); // Init

// --- DETECCIÓN DE TECLADO POR RESIZE (Más robusto) ---
const initialHeight = window.innerHeight;

function checkKeyboardOpen() {
    const currentHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    // Si la altura actual es menor al 85% de la inicial, asumimos teclado abierto
    if (currentHeight < initialHeight * 0.85) {
        document.body.classList.add('keyboard-open');
    } else {
        document.body.classList.remove('keyboard-open');
        // Asegurar que el input pierda foco si el teclado se ocultó manual (opcional, pero ayuda a veces)
        // document.activeElement.blur(); 
    }
    setViewportHeight(); // Ajustar --vh siempre
}

if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', checkKeyboardOpen);
} else {
    window.addEventListener('resize', checkKeyboardOpen);
}

// Mantener listeners de focus solo para asegurar scroll, NO para activar el modo
montoInput.addEventListener('focus', () => {
    setTimeout(checkKeyboardOpen, 300); // Dar tiempo a que salga el teclado
});
messageInput.addEventListener('focus', () => {
    setTimeout(checkKeyboardOpen, 300);
});

// Limpieza inicial
checkKeyboardOpen();

// Inicializar estado y ancho
adjustInputWidth();
validarMonto();

// --- MANEJO DE PAGO ---
btnYapear.addEventListener('click', () => {
    if (btnYapear.disabled) return;

    const monto = montoInput.value;
    const mensaje = messageInput.value.trim();

    // Feedback
    const textoOriginal = btnYapear.textContent;
    btnYapear.textContent = 'Procesando...';
    btnYapear.disabled = true;

    fetch('/api/yapear/realizar_pago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contacto_id: contactoId,
            monto: monto,
            mensaje: mensaje
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.href = '/yapear/exito/' + data.num_operacion;
            } else {
                alert('Error: ' + data.message);
                btnYapear.textContent = textoOriginal;
                btnYapear.disabled = false;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error de conexión');
            btnYapear.textContent = textoOriginal;
            btnYapear.disabled = false;
        });
});
