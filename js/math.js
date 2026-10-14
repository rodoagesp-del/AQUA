// ============================================
// LÓGICA MATEMÁTICA DE PRORRATEO
// Este archivo solo contiene lógica pura.
// No toca el HTML ni hace llamadas a internet.
// ============================================

/**
 * Calcula el prorrateo de servicios entre los usuarios.
 * @param {Array} usuarios - Lista de usuarios con { usuario, medida1, medida2 }
 * @param {number} consumoGeneral - Consumo total general
 * @param {number} costoGeneral - Costo total general
 * @param {string} fecha - Fecha de la medición
 * @param {string} servicio - Nombre del servicio (agua, luz, gas, etc.)
 * @returns {Array} Lista de registros calculados listos para guardar
 */
function calcularProrrateo(usuarios, consumoGeneral, costoGeneral, fecha, servicio) {
    let usuariosConMedida = [];
    let usuariosSinMedida = [];
    let sumaConsumosMedidos = 0;

    // 1. Separar usuarios con medida y calcular consumo individual
    usuarios.forEach(u => {
        if (u.medida1 !== null && u.medida2 !== null && u.medida1 !== "" && u.medida2 !== "") {
            u.consumoIndividual = parseFloat(u.medida2) - parseFloat(u.medida1);
            sumaConsumosMedidos += u.consumoIndividual;
            usuariosConMedida.push(u);
        } else {
            usuariosSinMedida.push(u);
        }
    });

    // 2. Si hay usuarios sin medida, repartir el consumo restante equitativamente
    if (usuariosSinMedida.length > 0) {
        let consumoRestante = consumoGeneral - sumaConsumosMedidos;
        let consumoAsignado = consumoRestante / usuariosSinMedida.length;
        usuariosSinMedida.forEach(u => { u.consumoIndividual = consumoAsignado; });
    }

    // 3. Calcular costo por unidad y pago individual
    let costoPorUnidad = costoGeneral / consumoGeneral;
    let sumaPagos = 0;

    usuarios.forEach(u => {
        u.pagoIndividual = u.consumoIndividual * costoPorUnidad;
        sumaPagos += u.pagoIndividual;
    });

    // 4. Si todos tienen medida, ajustar diferencias por redondeo
    if (usuariosSinMedida.length === 0) {
        let diferenciaCosto = costoGeneral - sumaPagos; 
        let ajustePorUsuario = diferenciaCosto / usuarios.length;
        usuarios.forEach(u => { u.pagoIndividual += ajustePorUsuario; });
    }

    // 5. Formatear salida para el Apps Script
    return usuarios.map(u => ({
        fecha: fecha,
        servicio: servicio, // <--- SE AÑADE EL SERVICIO
        usuario: u.usuario,
        medida1: u.medida1,
        medida2: u.medida2,
        consumoIndividual: u.consumoIndividual,
        consumoGeneral: consumoGeneral,
        consumoFraccionado: "", 
        costoGeneral: costoGeneral,
        pagoIndividual: u.pagoIndividual
    }));
}