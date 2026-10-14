// ============================================
// CONTROLADOR PRINCIPAL DE LA VISTA
// Este archivo controla la interfaz, botones,
// alertas, tabla y gráfico. Llama a math.js y api.js
// ============================================

let isDev = false;
let historicoDatos = [];
let miGrafico = null;

// 1. CORRECCIÓN: El nombre debe coincidir exactamente con Google Sheets ("Sedapal")
let configSistemas = JSON.parse(localStorage.getItem('prorrateo_config')) || {
    "Sedapal": ["Piso3", "Piso4", "Goma Ines", "Tio Beto"],
    "Enel": ["Piso3", "Piso4"]
};
let servicioActual = Object.keys(configSistemas)[0];

// --------------------------------------------
// AUTENTICACIÓN
// --------------------------------------------
function entrarComoInvitado() {
    isDev = false;
    mostrarApp();
    cargarDatos();
}

function entrarComoDev() {
    const pass = document.getElementById('dev-password').value;
    if (pass === 'Ro47Do16') {
        isDev = true;
        mostrarApp();
        document.getElementById('dev-controls').style.display = 'block';
        cargarDatos();
    } else {
        alert('Contraseña incorrecta');
    }
}

function mostrarApp() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('app-section').style.display = 'block';
    renderizarSelectoresServicio();
}

// --------------------------------------------
// CARGA DE DATOS
// --------------------------------------------
async function cargarDatos() {
    const loading = document.getElementById('loading-indicator');
    const tablaContainer = document.getElementById('tabla-container');
    const tarjetasContainer = document.getElementById('tarjetas-mobile');
    
    if (tablaContainer) tablaContainer.innerHTML = '';
    if (tarjetasContainer) tarjetasContainer.innerHTML = '';
    if (loading) loading.classList.remove('hidden');

    try {
        historicoDatos = await apiObtenerDatos();
        renderizarSelectoresServicio();
        renderizarInputsUsuarios();
        renderizarTablaYTarjetas();
        renderizarGrafica();
    } catch (e) {
        console.error("Error cargando datos:", e);
    } finally {
        if (loading) loading.classList.add('hidden');
    }
}

// --------------------------------------------
// GESTIÓN DE SERVICIOS Y USUARIOS
// --------------------------------------------
function renderizarSelectoresServicio() {
    const select = document.getElementById('select-servicio');
    const selectVista = document.getElementById('select-servicio-vista');
    
    if (!select) return;
    
    let html = '';
    Object.keys(configSistemas).forEach(srv => {
        html += `<option value="${srv}" ${srv === servicioActual ? 'selected' : ''}>${srv}</option>`;
    });
    
    select.innerHTML = html;
    if (selectVista) selectVista.innerHTML = html;
}

function cambiarServicioActual(selectElement) {
    servicioActual = selectElement.value;
    renderizarSelectoresServicio();
    renderizarInputsUsuarios();
    renderizarTablaYTarjetas();
    renderizarGrafica();
}

function agregarServicio() {
    const nombre = prompt("Nombre exacto del nuevo servicio (Debe coincidir con Google Sheets):");
    if (nombre && !configSistemas[nombre]) {
        configSistemas[nombre] = [];
        guardarConfiguracion();
        servicioActual = nombre;
        cambiarServicioActual({ value: nombre });
    }
}

function eliminarServicio() {
    if (confirm(`¿Seguro que deseas eliminar el servicio ${servicioActual}? Solo se borrará de tu vista, no de la base de datos.`)) {
        delete configSistemas[servicioActual];
        guardarConfiguracion();
        servicioActual = Object.keys(configSistemas)[0] || "";
        cambiarServicioActual({ value: servicioActual });
    }
}

function agregarUsuario() {
    const nombre = prompt("Nombre del nuevo usuario:");
    if (nombre && servicioActual) {
        configSistemas[servicioActual].push(nombre);
        guardarConfiguracion();
        renderizarInputsUsuarios();
    }
}

function eliminarUsuario(nombreUsuario) {
    if (confirm(`¿Eliminar al usuario ${nombreUsuario} del servicio ${servicioActual}?`)) {
        configSistemas[servicioActual] = configSistemas[servicioActual].filter(u => u !== nombreUsuario);
        guardarConfiguracion();
        renderizarInputsUsuarios();
    }
}

function guardarConfiguracion() {
    localStorage.setItem('prorrateo_config', JSON.stringify(configSistemas));
}

// --------------------------------------------
// RENDERIZADO DINÁMICO E HISTÓRICO
// --------------------------------------------
function renderizarInputsUsuarios() {
    const container = document.getElementById('usuarios-inputs-container');
    if (!container) return;
    container.innerHTML = '';
    
    const usuarios = configSistemas[servicioActual] || [];
    
    usuarios.forEach((usuario, index) => {
        let ultimaMedida2 = "";
        
        // CORRECCIÓN: Filtro robusto por nombre de columna
        const registrosServicio = historicoDatos.filter(d => 
            d['Servicio'] === servicioActual && 
            d['Usuario'] === usuario
        );
        
        if (registrosServicio.length > 0) {
            const ultimoRegistro = registrosServicio[registrosServicio.length - 1]; 
            ultimaMedida2 = ultimoRegistro['Medida 2'] || ""; 
        }

        const div = document.createElement('div');
        div.className = "bg-gray-50 p-4 rounded-xl border border-gray-100 relative group";
        div.innerHTML = `
            <button onclick="eliminarUsuario('${usuario}')" class="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Eliminar Usuario">✕</button>
            <b class="block text-gray-800 mb-2">${usuario}</b>
            <div class="flex gap-2">
                <input type="number" step="0.01" id="usr-m1-${index}" value="${ultimaMedida2}" placeholder="Medida 1" class="w-1/2 px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50" title="Autocompletado del mes anterior">
                <input type="number" step="0.01" id="usr-m2-${index}" placeholder="Medida 2" class="w-1/2 px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-400">
                <input type="hidden" id="usr-name-${index}" value="${usuario}">
            </div>
        `;
        container.appendChild(div);
    });
}

function renderizarTablaYTarjetas() {
    const tbody = document.getElementById('tabla-container');
    const tarjetasCont = document.getElementById('tarjetas-mobile');
    if (!tbody || !tarjetasCont) return;
    
    tbody.innerHTML = '';
    tarjetasCont.innerHTML = '';
    
    // CORRECCIÓN: Filtro robusto por nombre de columna
    const datosMostrar = historicoDatos
        .filter(d => d['Servicio'] === servicioActual)
        .reverse();

    if (datosMostrar.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-gray-500">No hay datos para este servicio.</td></tr>';
        tarjetasCont.innerHTML = '<div class="text-center py-4 text-gray-500">No hay datos para este servicio.</div>';
        return;
    }

    datosMostrar.forEach((fila, index) => {
        // CORRECCIÓN: Lectura robusta llamando exactamente al nombre de la cabecera
        const fechaStr = fila['Fecha Medicion'] ? new Date(fila['Fecha Medicion']).toLocaleDateString() : '-';
        const usuario = fila['Usuario'] || '-';
        const med1 = fila['Medida 1'] || '-';
        const med2 = fila['Medida 2'] || '-';
        const consInd = fila['Consumo individual'] ? Number(fila['Consumo individual']).toFixed(2) : '-';
        const costoGral = fila['Costo General'] || '-';
        const pagoInd = fila['Pago Individual'] ? Number(fila['Pago Individual']).toFixed(2) : '-';

        // Vista Escritorio
        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-100';
        tr.innerHTML = `
            <td class="px-4 py-3 whitespace-nowrap text-gray-600">${fechaStr}</td>
            <td class="px-4 py-3 whitespace-nowrap font-semibold text-gray-800">${usuario}</td>
            <td class="px-4 py-3 whitespace-nowrap text-gray-500">${med1} / ${med2}</td>
            <td class="px-4 py-3 whitespace-nowrap font-bold text-blue-600 bg-blue-50/30">${consInd}</td>
            <td class="px-4 py-3 whitespace-nowrap text-gray-600">S/ ${costoGral}</td>
            <td class="px-4 py-3 whitespace-nowrap font-bold text-green-700 bg-green-50/50">S/ ${pagoInd}</td>
        `;
        tbody.appendChild(tr);

        // Vista Celular
        const card = document.createElement('div');
        card.className = "bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3";
        card.innerHTML = `
            <div class="flex justify-between items-center border-b pb-2 mb-2">
                <span class="font-bold text-gray-800 text-lg">${usuario}</span>
                <span class="text-sm text-gray-500">${fechaStr}</span>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm mb-2">
                <div><span class="text-gray-500 block text-xs">Medidas</span> ${med1} ➔ ${med2}</div>
                <div><span class="text-gray-500 block text-xs">Cons. Individual</span> <span class="font-bold text-blue-600">${consInd}</span></div>
            </div>
            <div class="flex justify-between items-center bg-green-50 p-2 rounded-lg mt-2">
                <span class="text-xs font-bold text-green-800 uppercase">Pago Total</span>
                <span class="font-bold text-green-700 text-lg">S/ ${pagoInd}</span>
            </div>
        `;
        tarjetasCont.appendChild(card);
    });
}

// --------------------------------------------
// RENDERIZADO DE GRÁFICA
// --------------------------------------------
function renderizarGrafica() {
    const canvas = document.getElementById('graficaConsumo');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // CORRECCIÓN: Filtro robusto
    const datosFiltrados = historicoDatos.filter(d => d['Servicio'] === servicioActual);
    const fechasRaw = [...new Set(datosFiltrados.map(d => d['Fecha Medicion']))];
    const labels = fechasRaw.map(f => new Date(f).toLocaleDateString());

    const usuariosNombres = configSistemas[servicioActual] || [];
    const colores = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899']; 
    
    const datasets = usuariosNombres.map((nombre, index) => {
        const color = colores[index % colores.length];
        const datosUsuario = labels.map((fechaLabel) => {
            const registro = datosFiltrados.find(d => 
                d['Usuario'] === nombre && 
                new Date(d['Fecha Medicion']).toLocaleDateString() === fechaLabel
            );
            return registro ? registro['Pago Individual'] : 0; 
        });

        return {
            label: nombre,
            data: datosUsuario,
            borderColor: color,
            backgroundColor: color + '20',
            borderWidth: 3,
            pointBackgroundColor: color,
            fill: true,
            tension: 0.3
        };
    });

    if (miGrafico) { miGrafico.destroy(); }
    Chart.defaults.font.family = "'Inter', sans-serif";

    miGrafico = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: datasets },
        options: { 
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { usePointStyle: true, padding: 10 } }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f3f4f6' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// --------------------------------------------
// RECOLECTAR DATOS Y GUARDAR
// --------------------------------------------
async function prepararYGuardar() {
    const fecha = document.getElementById('input-fecha').value;
    const conGral = parseFloat(document.getElementById('input-consumo-general').value);
    const costGral = parseFloat(document.getElementById('input-costo-general').value);

    if (!fecha || isNaN(conGral) || isNaN(costGral)) {
        alert("Completa la Fecha, el Consumo General y el Costo General.");
        return;
    }

    const usuariosConfig = configSistemas[servicioActual] || [];
    let usuarios = [];
    
    usuariosConfig.forEach((usr, index) => {
        usuarios.push({
            usuario: document.getElementById(`usr-name-${index}`).value,
            medida1: document.getElementById(`usr-m1-${index}`).value,
            medida2: document.getElementById(`usr-m2-${index}`).value
        });
    });

    let registrosCalculados = calcularProrrateo(usuarios, conGral, costGral, fecha, servicioActual);

    const payload = {
        password: "Ro47Do16",
        registros: registrosCalculados
    };

    const btn = document.getElementById('btn-guardar');
    const originalContent = btn.innerHTML;
    btn.innerHTML = `Guardando datos...`;
    btn.disabled = true;

    try {
        const result = await apiGuardarDatos(payload);
        if (result.status === 'success') {
            alert("¡Datos guardados correctamente!");
            document.querySelectorAll('input[type="number"]').forEach(i => i.value = '');
            cargarDatos();
        } else {
            alert("Error: " + result.message);
        }
    } catch (e) {
        alert("Error de conexión.");
    } finally {
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
}