/**
 * =========================================================
 *  Receptor del formulario de contacto (Google Apps Script)
 *
 *  Va pegado en: tu Google Sheet → Extensiones → Apps Script.
 *  Pasos completos en README.md.
 *
 *  - doPost:        recibe el JSON del formulario y agrega una fila.
 *  - exportarJSON:  la ejecutas tú desde el editor; crea
 *                   contactos.json en tu Google Drive.
 * =========================================================
 */

const NOMBRE_HOJA = 'Contactos';
const ENCABEZADOS = ['fecha', 'nombre', 'apellido', 'correo', 'celular', 'consulta'];

// Largo máximo de cada campo (por si alguien envía textos gigantes)
const LIMITES = { nombre: 80, apellido: 80, correo: 120, celular: 20, consulta: 2000 };


function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);

    const nombre = limpiar(d.nombre, LIMITES.nombre);
    const apellido = limpiar(d.apellido, LIMITES.apellido);
    const correo = limpiar(d.correo, LIMITES.correo);
    const celular = limpiar(d.celular, LIMITES.celular);
    const consulta = limpiar(d.consulta, LIMITES.consulta);

    if (!nombre || !apellido || !celular || !consulta) {
      return responder({ ok: false, error: 'Faltan campos obligatorios' });
    }

    obtenerHoja().appendRow([
      new Date(),
      comoTexto(nombre),
      comoTexto(apellido),
      comoTexto(correo),
      comoTexto(celular),
      comoTexto(consulta),
    ]);

    return responder({ ok: true });
  } catch (error) {
    console.error(error);
    return responder({ ok: false, error: 'No se pudo procesar la solicitud' });
  }
}


/**
 * Ejecútala desde el editor (elige "exportarJSON" arriba y pulsa ▶ Ejecutar).
 * Crea un archivo contactos.json en tu Google Drive con todos los contactos.
 * No queda expuesta en internet: solo tú puedes ejecutarla.
 */
function exportarJSON() {
  const contactos = leerContactos();
  const nombreArchivo = 'contactos-' + Utilities.formatDate(new Date(), 'America/Santiago', 'yyyy-MM-dd_HH-mm') + '.json';
  const archivo = DriveApp.createFile(nombreArchivo, JSON.stringify(contactos, null, 2), MimeType.PLAIN_TEXT);
  console.log('Listo: ' + contactos.length + ' contactos en ' + archivo.getUrl());
}


// Convierte la hoja en una lista de objetos: [{ fecha, nombre, apellido, ... }, ...]
function leerContactos() {
  const filas = obtenerHoja().getDataRange().getValues();
  const encabezados = filas.shift();

  return filas.map(function (fila) {
    const contacto = {};
    encabezados.forEach(function (encabezado, i) {
      const valor = fila[i];
      contacto[encabezado] = valor instanceof Date
        ? Utilities.formatDate(valor, 'America/Santiago', "yyyy-MM-dd'T'HH:mm:ss")
        : String(valor);
    });
    return contacto;
  });
}


// Devuelve la hoja "Contactos"; si no existe, la crea con los encabezados
function obtenerHoja() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = libro.getSheetByName(NOMBRE_HOJA);
  if (!hoja) {
    hoja = libro.insertSheet(NOMBRE_HOJA);
    hoja.appendRow(ENCABEZADOS);
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function limpiar(valor, maximo) {
  return String(valor == null ? '' : valor).trim().slice(0, maximo);
}

// El apóstrofo inicial hace que Sheets lo guarde como texto:
// así "+569..." no se convierte en número y "=ALGO" no se ejecuta como fórmula.
function comoTexto(valor) {
  return valor === '' ? '' : "'" + valor;
}

function responder(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}
