// Manejo de Tabs
const tabContacts = document.getElementById('tab-contacts');
const tabPending = document.getElementById('tab-pending');
const searchSection = document.getElementById('search-section');
const contentContacts = document.getElementById('content-contacts');
const contentPending = document.getElementById('content-pending');

// Nuevos elementos para búsqueda
const searchInput = document.getElementById('search-input');
const newContactOption = document.getElementById('new-contact-option');
const noResultsMsg = document.getElementById('no-results-msg');
const newNumberDisplay = document.getElementById('new-number-display');
const modalErrorMsg = document.getElementById('modal-error-msg');

// Variables para edición
let editingContactId = null;
let isEditMode = false;
const modalTitle = document.querySelector('.modal-content h3');

function switchTab(tabName) {
    if (tabName === 'contacts') {
        tabContacts.classList.add('active');
        tabPending.classList.remove('active');
        searchSection.style.display = 'block';
        contentContacts.style.display = 'block';
        contentPending.style.display = 'none';
        filtrarContactos();
    } else {
        tabContacts.classList.remove('active');
        tabPending.classList.add('active');
        searchSection.style.display = 'none';
        contentContacts.style.display = 'none';
        newContactOption.style.display = 'none';
        noResultsMsg.style.display = 'none';
        contentPending.style.display = 'flex';
    }
}

searchInput.addEventListener('input', filtrarContactos);

function filtrarContactos() {
    if (!tabContacts.classList.contains('active')) return;

    const query = searchInput.value.trim().toLowerCase();
    const cleanQuery = query.replace(/\s+/g, '');
    const isNineDigits = /^\d{9}$/.test(cleanQuery);

    const contactItems = document.querySelectorAll('.contact-item');
    let visibleCount = 0;
    let exactMatchFound = false;

    contactItems.forEach(item => {
        const nameEl = item.querySelector('.contact-name');
        const phoneEl = item.querySelector('.contact-phone');

        if (nameEl && phoneEl) {
            const name = nameEl.textContent.toLowerCase();
            const phone = phoneEl.textContent.replace(/\s+/g, '');

            if (name.includes(query) || phone.includes(cleanQuery)) {
                item.style.display = 'flex';
                visibleCount++;
                if (phone === cleanQuery) exactMatchFound = true;
            } else {
                item.style.display = 'none';
            }
        }
    });

    if (isNineDigits && !exactMatchFound) {
        newContactOption.style.display = 'block';
        const formattedNumber = cleanQuery.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
        newNumberDisplay.textContent = formattedNumber;
    } else {
        newContactOption.style.display = 'none';
    }

    if (visibleCount === 0 && newContactOption.style.display === 'none' && query !== '') {
        noResultsMsg.style.display = 'block';
    } else {
        noResultsMsg.style.display = 'none';
    }
}

function seleccionarNuevoNumero() {
    const number = newNumberDisplay.textContent.replace(/\s+/g, '');
    alert(`Funcionalidad para yapear al nuevo número ${number} en desarrollo.`);
}

// --- MODAL LOGIC ---
const modalGuardar = document.getElementById('modal-guardar');
const inputModalNombre = document.getElementById('modal-nombre');
const inputModalCelular = document.getElementById('modal-celular');

function abrirModalGuardar(event) {
    event.stopPropagation();

    // Modo CREAR
    isEditMode = false;
    editingContactId = null;
    if (modalTitle) modalTitle.textContent = "Guardar Contacto";

    const number = newNumberDisplay.textContent.replace(/\s+/g, '');
    inputModalCelular.value = number;
    inputModalCelular.readOnly = true;
    inputModalNombre.value = '';

    if (modalErrorMsg) {
        modalErrorMsg.style.display = 'none';
        modalErrorMsg.textContent = '';
    }

    modalGuardar.style.display = 'flex';
    inputModalNombre.focus();
}

function abrirModalEditar(event, element) {
    event.stopPropagation();

    // Leer datos del dataset
    const id = element.dataset.id;
    const nombre = element.dataset.nombre;
    const celular = element.dataset.celular;

    // Modo EDITAR
    isEditMode = true;
    editingContactId = id;
    if (modalTitle) modalTitle.textContent = "Editar Contacto";

    inputModalNombre.value = nombre;
    inputModalCelular.value = celular;
    inputModalCelular.readOnly = false; // Editable

    if (modalErrorMsg) {
        modalErrorMsg.style.display = 'none';
        modalErrorMsg.textContent = '';
    }

    modalGuardar.style.display = 'flex';
    inputModalNombre.focus();
}

function cerrarModalGuardar() {
    modalGuardar.style.display = 'none';
}

function guardarContacto() {
    const nombres = inputModalNombre.value.trim();
    const celular = inputModalCelular.value.trim();

    if (!nombres) {
        mostrarError("Por favor ingresa un nombre");
        return;
    }

    const url = isEditMode ? '/api/contactos/editar' : '/api/contactos/agregar';
    const body = { nombres: nombres, num_celular: celular };

    if (isEditMode) {
        body.id = editingContactId;
    }

    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(isEditMode ? "Contacto actualizado" : "Contacto guardado");
                cerrarModalGuardar();
                window.location.reload();
            } else {
                mostrarError(data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            mostrarError("Error de conexión");
        });
}

function mostrarError(msg) {
    if (modalErrorMsg) {
        modalErrorMsg.textContent = msg;
        modalErrorMsg.style.display = 'block';
    } else {
        alert(msg);
    }
}
