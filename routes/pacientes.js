const express = require('express');
const router = express.Router();

// Ruta para mostrar el formulario de nuevo paciente (GET)
router.get('/nuevo', async (req, res, next) => {
    try {
        const [seguros] = await req.db.query('SELECT id, nombre FROM seguros_medicos');
        // Usamos req.flash para mensajes flash de una sola vez
        const errores = req.flash('errores')[0] || {}; // Obtener errores si existen
        const oldInput = req.flash('oldInput')[0] || {}; // Obtener datos antiguos si existen

        res.render('pacientes/nuevo', {
            seguros,
            // Si hay oldInput, úsalo; de lo contrario, valores vacíos
            dni: oldInput.dni || '',
            apellido: oldInput.apellido || '',
            nombre: oldInput.nombre || '',
            telefono: oldInput.telefono || '',
            correo: oldInput.correo || '',
            fecha_nacimiento: oldInput.fecha_nacimiento || '',
            sexo: oldInput.sexo || '',
            direccion: oldInput.direccion || '',
            id_seguro: oldInput.id_seguro || '',
            nro_afiliado: oldInput.nro_afiliado || '',
            errores: errores // Pasar el objeto de errores
        });
    } catch (error) {
        console.error('Error al cargar la página de nuevo paciente:', error);
        next(error);
    }
});


// Formulario para editar paciente
router.get('/editar/:id', async (req, res, next) => {
    const id = req.params.id;
    try {
        const [pacienteResult] = await req.db.query('SELECT * FROM pacientes WHERE id = ?', [id]);
        const [seguros] = await req.db.query('SELECT id, nombre FROM seguros_medicos');

        if (pacienteResult.length === 0) {
            return res.status(404).send('Paciente no encontrado');
        }

        const errores = req.flash('errores')[0] || {}; // Obtener errores si existen
        const mensajeExito = req.flash('mensajeExito')[0] || null; // Obtener mensaje de éxito

        res.render('pacientes/editar', {
            paciente: pacienteResult[0],
            seguros,
            errores: errores,
            mensajeExito: mensajeExito
        });
    } catch (err) {
        console.error('Error al cargar la página de edición de paciente:', err);
        next(err);
    }
});

// Mostrar todos los pacientes
router.get('/', async (req, res, next) => {
    try {
        const [pacientes] = await req.db.query(`
            SELECT pacientes.*,
                   CONCAT(pacientes.apellido, ', ', pacientes.nombre) AS nombre_completo,
                   seguros_medicos.nombre AS nombre_seguro
            FROM pacientes
            LEFT JOIN seguros_medicos ON pacientes.id_seguro = seguros_medicos.id
        `);

        // Obtener mensajes flash para mostrar en el listado
        const errorEliminar = req.flash('errorEliminar')[0] || null;
        const mensajeExito = req.flash('mensajeExito')[0] || null;


        res.render('pacientes/listado', {
            pacientes,
            errorEliminar, // Pasar el mensaje de error de eliminación
            mensajeExito // Pasar cualquier mensaje de éxito general
        });
    } catch (err) {
        next(err);
    }
});

// Ruta POST para registrar nuevo paciente
router.post('/nuevo', async (req, res, next) => {
    const {
        dni,
        apellido,
        nombre,
        telefono,
        correo,
        fecha_nacimiento,
        sexo,
        direccion,
        id_seguro,
        nro_afiliado
    } = req.body;

    const errores = {};
    let idSeguroParaDB = null;
    let idParticular = null;

    try {
        const [particularSeguro] = await req.db.query('SELECT id FROM seguros_medicos WHERE nombre = "Particular"');
        if (particularSeguro.length > 0) {
            idParticular = particularSeguro[0].id;
        } else {
            console.warn("ADVERTENCIA: No se encontró el seguro 'Particular' en la base de datos. Asegúrate de que existe.");
        }
    } catch (dbErr) {
        console.error('Error al obtener el ID de seguro "Particular":', dbErr);
        errores.general = 'Error interno al procesar el seguro médico.';
    }

    // --- Validaciones de Backend ---

    // DNI: Obligatorio y solo números
    if (!dni || dni.trim() === '') {
        errores.dni = 'El DNI es obligatorio.';
    } else if (!/^\d+$/.test(dni.trim())) {
        errores.dni = 'El DNI debe contener solo números.';
    }

    // DNI: Verificación de duplicados (solo si no hay errores previos en DNI)
    if (!errores.dni) {
        try {
            const [existingPatient] = await req.db.query('SELECT id FROM pacientes WHERE dni = ?', [dni.trim()]);
            if (existingPatient.length > 0) {
                errores.dni = 'Ya existe un paciente con este DNI.';
            }
        } catch (dbErr) {
            console.error('Error al verificar DNI duplicado:', dbErr);
            errores.general = 'Error al verificar la disponibilidad del DNI.';
        }
    }

    // Apellido: Obligatorio
    if (!apellido || apellido.trim() === '') {
        errores.apellido = 'El apellido es obligatorio.';
    }

    // Nombre: Obligatorio
    if (!nombre || nombre.trim() === '') {
        errores.nombre = 'El nombre es obligatorio.';
    }

    // Correo: Formato de email si está presente
    if (correo && correo.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
        errores.correo = 'El correo electrónico no tiene un formato válido.';
    }

    // Fecha de Nacimiento: Obligatorio y válido
    if (!fecha_nacimiento || fecha_nacimiento.trim() === '') {
        errores.fecha_nacimiento = 'La fecha de nacimiento es obligatoria.';
    } else {
        const fechaNac = new Date(fecha_nacimiento);
        const hoy = new Date();
        if (isNaN(fechaNac.getTime())) {
            errores.fecha_nacimiento = 'Fecha de nacimiento no válida.';
        } else if (fechaNac >= hoy) {
            errores.fecha_nacimiento = 'La fecha de nacimiento no puede ser futura.';
        }
    }

    // Sexo: Obligatorio y válido
    if (!sexo || (sexo !== 'M' && sexo !== 'F')) {
        errores.sexo = 'Debe seleccionar un género válido.';
    }

    // id_seguro: Obligatorio.
    if (!id_seguro || id_seguro.trim() === '') {
        errores.id_seguro = 'Debe seleccionar un seguro médico.';
    } else {
        idSeguroParaDB = parseInt(id_seguro, 10);
        if (isNaN(idSeguroParaDB)) {
            errores.id_seguro = 'Selección de seguro médico no válida.';
        } else {
            // Lógica condicional para nro_afiliado: obligatorio si NO es 'Particular'
            if (idParticular !== null && idSeguroParaDB !== idParticular) {
                if (!nro_afiliado || nro_afiliado.trim() === '') {
                    errores.nro_afiliado = 'El número de afiliado es obligatorio para este seguro.';
                } else if (!/^\d{6}$/.test(nro_afiliado.trim())) { // Validación de 6 números en backend
                    errores.nro_afiliado = 'El número de afiliado debe contener exactamente 6 números.';
                }
            }
        }
    }

    // Si hay errores, re-renderizar el formulario
    if (Object.keys(errores).length > 0) {
        req.flash('errores', errores);
        req.flash('oldInput', req.body); // Guardar los datos ingresados para rellenar el formulario
        return res.redirect('/pacientes/nuevo'); // Redirigir a la misma página GET
    }

    // Si no hay errores, proceder con la inserción
    try {
        const result = await req.db.query(
            `INSERT INTO pacientes (dni, apellido, nombre, telefono, correo, fecha_nacimiento, sexo, direccion, id_seguro, nro_afiliado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                dni.trim(),
                apellido.trim(),
                nombre.trim(),
                telefono ? telefono.trim() : null,
                correo ? correo.trim() : null,
                fecha_nacimiento,
                sexo,
                direccion ? direccion.trim() : null,
                idSeguroParaDB,
                nro_afiliado && nro_afiliado.trim() !== '' ? nro_afiliado.trim() : null
            ]
        );
        req.flash('mensajeExito', 'Paciente registrado con éxito!'); // Mensaje de éxito
        res.redirect('/pacientes');
    } catch (dbErr) {
        console.error('Error al guardar el paciente:', dbErr);
        if (dbErr.code === 'ER_DUP_ENTRY' || (dbErr.sqlMessage && dbErr.sqlMessage.includes('Duplicate entry'))) {
            errores.dni = 'Ya existe un paciente con este DNI.';
            req.flash('errores', errores);
            req.flash('oldInput', req.body);
            return res.redirect('/pacientes/nuevo');
        }
        next(dbErr);
    }
});

// Guardar cambios del paciente (Ruta POST ÚNICA)
router.post('/editar/:id', async (req, res, next) => {
    const pacienteId = req.params.id;
    const {
        nombre,
        apellido,
        // DNI no se modifica, pero lo podríamos necesitar para el mensaje de error
        dni, // Lo dejamos aquí por si queremos usarlo para mensajes
        fecha_nacimiento,
        sexo,
        direccion,
        telefono,
        correo,
        id_seguro,
        nro_afiliado
    } = req.body;

    const errores = {};
    let idParticular = null;

    try {
        const [particularSeguro] = await req.db.query('SELECT id FROM seguros_medicos WHERE nombre = "Particular"');
        if (particularSeguro.length > 0) {
            idParticular = particularSeguro[0].id;
        }
    } catch (dbErr) {
        console.error('Error al obtener el ID de seguro "Particular" en editar:', dbErr);
        errores.general = 'Error interno al procesar el seguro médico.';
    }


    // Validaciones (DNI no se valida aquí por ser readonly, pero los demás sí)
    if (!nombre || nombre.trim() === '') errores.nombre = 'El nombre es obligatorio.';
    if (!apellido || apellido.trim() === '') errores.apellido = 'El apellido es obligatorio.';

    // Aunque el DNI es readonly, podemos validar si se manipuló el HTML y llega vacío/inválido
    // if (!dni || dni.trim() === '') errores.dni = 'El DNI es obligatorio.';
    // else if (!/^\d+$/.test(dni.trim())) errores.dni = 'El DNI debe contener solo números.';

    if (!fecha_nacimiento || fecha_nacimiento.trim() === '') {
        errores.fecha_nacimiento = 'La fecha de nacimiento es obligatoria.';
    } else {
        const fechaNac = new Date(fecha_nacimiento);
        const hoy = new Date();
        if (isNaN(fechaNac.getTime())) {
            errores.fecha_nacimiento = 'Fecha de nacimiento no válida.';
        } else if (fechaNac >= hoy) {
            errores.fecha_nacimiento = 'La fecha de nacimiento no puede ser futura.';
        }
    }

    if (!sexo || (sexo !== 'M' && sexo !== 'F')) errores.sexo = 'Debe seleccionar un género válido.';

    let idSeguroParaDB = null;
    if (!id_seguro || id_seguro.trim() === '') {
        errores.id_seguro = 'Debe seleccionar un seguro médico.';
    } else {
        idSeguroParaDB = parseInt(id_seguro, 10);
        if (isNaN(idSeguroParaDB)) {
            errores.id_seguro = 'Selección de seguro médico no válida.';
        } else {
            if (idParticular !== null && idSeguroParaDB !== idParticular) {
                if (!nro_afiliado || nro_afiliado.trim() === '') {
                    errores.nro_afiliado = 'El número de afiliado es obligatorio para este seguro.';
                } else if (!/^\d{6}$/.test(nro_afiliado.trim())) {
                    errores.nro_afiliado = 'El número de afiliado debe contener exactamente 6 números.';
                }
            }
        }
    }

    if (correo && correo.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
        errores.correo = 'El correo electrónico no tiene un formato válido.';
    }

    if (Object.keys(errores).length > 0) {
        req.flash('errores', errores);
        // Podrías pasar los datos del formulario original si quisieras, pero en editar es más común re-fetch el paciente
        // req.flash('oldInput', req.body); // Descomentar si deseas que los datos incorrectos persistan
        return res.redirect('/pacientes/editar/' + pacienteId);
    }

    try {
        await req.db.execute(
            `UPDATE pacientes SET nombre = ?, apellido = ?, fecha_nacimiento = ?, sexo = ?, direccion = ?, telefono = ?, correo = ?, id_seguro = ?, nro_afiliado = ? WHERE id = ?`,
            [
                nombre.trim(),
                apellido.trim(),
                fecha_nacimiento,
                sexo,
                direccion ? direccion.trim() : null,
                telefono ? telefono.trim() : null,
                correo ? correo.trim() : null,
                idSeguroParaDB,
                nro_afiliado && nro_afiliado.trim() !== '' ? nro_afiliado.trim() : null,
                pacienteId
            ]
        );
        req.flash('mensajeExito', 'Datos del paciente actualizados con éxito.');
        res.redirect('/pacientes/editar/' + pacienteId); // Redirige de nuevo a la página de edición para ver el éxito
    } catch (dbErr) {
        console.error('Error al guardar cambios del paciente:', dbErr);
        // Si es un error de duplicado de DNI en la edición (aunque DNI es readonly, por si acaso)
        if (dbErr.code === 'ER_DUP_ENTRY' || (dbErr.sqlMessage && dbErr.sqlMessage.includes('Duplicate entry'))) {
            errores.dni = 'Ya existe otro paciente con este DNI.';
            req.flash('errores', errores);
            // req.flash('oldInput', req.body); // Descomentar si deseas que los datos incorrectos persistan
            return res.redirect('/pacientes/editar/' + pacienteId);
        }
        next(dbErr);
    }
});


// Eliminar paciente
router.post('/eliminar/:id', async (req, res, next) => {
    const id = req.params.id;
    // Captura el DNI del campo oculto si se envió, para el mensaje de error
    const dniPaciente = req.body.dni || 'desconocido';
    try {
        await req.db.query('DELETE FROM pacientes WHERE id = ?', [id]);
        req.flash('mensajeExito', `Paciente con DNI ${dniPaciente} eliminado con éxito.`);
        res.redirect('/pacientes');
    } catch (err) {
        console.error(`Error al eliminar paciente con ID ${id}:`, err);
        // Mejorar manejo de errores de eliminación (ej. FK constraint)
        if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_NO_REFERENCED_ROW_2' || (err.sqlMessage && err.sqlMessage.includes('a foreign key constraint fails'))) {
            // Usa req.flash para enviar el mensaje de error a la siguiente solicitud
            req.flash('errorEliminar', `No se puede eliminar el paciente con DNI ${dniPaciente} porque tiene registros asociados (internaciones, etc.).`);
            return res.redirect('/pacientes'); // Redirige al listado
        }
        next(err); // Pasa cualquier otro error al manejador de errores global
    }
});

// Nueva ruta API para buscar pacientes
// Ahora es simplemente '/buscar' porque el prefijo '/api/pacientes' se añadirá en app.js
router.get('/buscar', async (req, res) => { // <-- ¡IMPORTANTE! Elimina '/api/pacientes' de aquí
    const searchTerm = req.query.term || '';
    const pool = req.db;

    try {
        let query = `
            SELECT p.id, p.dni, CONCAT(p.apellido, ', ', p.nombre) AS nombre_completo,
                   p.sexo, p.telefono, p.correo, sm.nombre AS nombre_seguro, p.nro_afiliado
            FROM pacientes p
            LEFT JOIN seguros_medicos sm ON p.id_seguro = sm.id
            WHERE p.dni LIKE ? OR p.nombre LIKE ? OR p.apellido LIKE ?
            ORDER BY p.apellido, p.nombre ASC
        `;
        const searchPattern = `%${searchTerm}%`;
        const [rows] = await pool.query(query, [searchPattern, searchPattern, searchPattern]);
        res.json(rows);
    } catch (err) {
        console.error('Error al buscar pacientes:', err);
        res.status(500).json({ error: 'Error interno del servidor al buscar pacientes.' });
    }
});




module.exports = router; 