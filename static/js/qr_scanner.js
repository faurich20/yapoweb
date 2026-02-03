// Variables globales
let videoStream = null;
let flashlightOn = false;
let isScanning = true;
const video = document.getElementById('qr-video');

// Iniciar la cámara cuando se carga la página
window.addEventListener('DOMContentLoaded', async () => {
    await startCamera();
    requestAnimationFrame(tick);
});

// Función para iniciar la cámara
async function startCamera() {
    try {
        const constraints = {
            video: {
                facingMode: 'environment', // Cámara trasera
                width: { ideal: 1280 }, // Lower resolution for better performance
                height: { ideal: 720 }
            }
        };

        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = videoStream;
        // Esperar a que el video esté listo
        video.setAttribute('playsinline', true); // required to tell iOS safari we don't want fullscreen
        await video.play();

        console.log('Cámara iniciada correctamente');
    } catch (error) {
        console.error('Error al acceder a la cámara:', error);
        alert('No se pudo acceder a la cámara. Por favor, verifica los permisos.');
    }
}

// Bucle de escaneo
function tick() {
    if (video.readyState === video.HAVE_ENOUGH_DATA && isScanning) {
        // Crear canvas temporal para analizar el frame
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Usar jsQR para buscar código
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
        });

        if (code) {
            console.log("QR Encontrado:", code.data);

            // Dibujar recuadro (opcional, visual feedback)
            // ...

            // Validar QR solo si tiene contenido
            if (code.data) {
                isScanning = false; // Pausar escaneo para no mandar multiples peticiones
                validateQR(code.data);
            }
        }
    }

    if (isScanning) {
        requestAnimationFrame(tick);
    }
}

async function validateQR(qrContent) {
    try {
        const response = await fetch('/api/process_qr', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ qr_data: qrContent })
        });

        const data = await response.json();

        if (data.success) {
            // Éxito: Redirigir
            window.location.href = data.redirect_url;
        } else {
            // Error: Es un QR desconocido (no asignado)
            // Guardamos el payload para asignarlo en la pantalla de contactos
            localStorage.setItem('pending_qr_payload', qrContent);
            console.log('QR no reconocido, redirigiendo a asignar contacto...');
            window.location.href = '/yapear';
        }

    } catch (e) {
        console.error(e);
        alert('Error de conexión al validar QR');
        setTimeout(() => {
            isScanning = true;
            requestAnimationFrame(tick);
        }, 2000);
    }
}

// Función para cerrar el escáner y volver a la página anterior
function closeScanner() {
    isScanning = false;
    // Detener la cámara
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }

    // Volver a la página anterior
    window.location.href = '/';
}

// Función para encender/apagar la linterna
async function toggleFlashlight() {
    if (!videoStream) {
        alert('La cámara no está activa');
        return;
    }

    try {
        const track = videoStream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();

        if (!capabilities.torch) {
            alert('Tu dispositivo no tiene linterna disponible o el navegador no lo soporta');
            return;
        }

        flashlightOn = !flashlightOn;

        await track.applyConstraints({
            advanced: [{ torch: flashlightOn }]
        });

        // Cambiar el texto del botón
        const btn = document.querySelector('.btn-flashlight');
        if (flashlightOn) {
            btn.innerHTML = '<i class="fa-solid fa-lightbulb"></i> Apagar linterna';
        } else {
            btn.innerHTML = 'Encender linterna';
        }

        console.log('Linterna:', flashlightOn ? 'Encendida' : 'Apagada');
    } catch (error) {
        console.error('Error al controlar la linterna:', error);
        // Algunos navegadores tiran error aunque soporten
    }
}

// Función para subir una imagen con QR
function uploadImage() {
    // Crear input file temporal
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height);

                    if (code) {
                        isScanning = false;
                        validateQR(code.data);
                    } else {
                        alert("No se encontró código QR en la imagen");
                    }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    };

    input.click();
}

// Limpiar recursos cuando se cierra la ventana
window.addEventListener('beforeunload', () => {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
});
