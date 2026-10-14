// ============================================
// COMUNICACIÓN CON GOOGLE SHEETS
// Este archivo se encarga exclusivamente de la
// comunicación con la base de datos remota.
// ============================================

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbycQiwxiel7AclgtCQDAN2yqHj69WD7B_w3b7Qu-grijinnSwG_VqZNCzfiKnhEnJLo/exec';

/**
 * Obtiene todos los datos históricos desde Google Sheets.
 * @returns {Promise<Array>} Lista de registros
 */
async function apiObtenerDatos() {
    const response = await fetch(SCRIPT_URL);
    return await response.json();
}

/**
 * Envía nuevos registros calculados a Google Sheets.
 * @param {Object} payload - { password, registros }
 * @returns {Promise<Object>} Respuesta del servidor { status, message }
 */
async function apiGuardarDatos(payload) {
    const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    return await response.json();
}