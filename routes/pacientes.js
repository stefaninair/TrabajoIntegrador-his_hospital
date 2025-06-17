const router = require('express').Router()

// Ruta para mostrar el listado de pacientes (GET /pacientes)
router.get('/', async (req, res, next) => {
    let connection;
    try {
        connection = await req.db.getConnection();

        // Consulta SQL para obtener todos los pacientes con información de seguro y estado de internación
        const [pacientes] = await connection.query(`
            SELECT
                p.id,
                p.dni,
                p.nombre,
                p.apellido,
                CONCAT(p.apellido, ', ', p.nombre) AS nombre_completo, -- Para mostrar en la tabla
                p.sexo,
                p.telefono,
                p.correo,
                sm.nombre AS nombre_seguro, -- Nombre del seguro médico
                p.nro_afiliado,
                p.fecha_nacimiento, -- Incluir para el formulario de edición si es necesario
                p.direccion, -- Incluir para el formulario de edición si es necesario
                p.id_seguro, -- Incluir para el formulario de edición si es necesario
                -- Determinar si el paciente está internado y obtener el ID de internación activa
                CASE WHEN i.id IS NOT NULL AND i.fecha_egreso IS NULL THEN 1 ELSE 0 END AS internado,
                i.id AS id_internacion_actual -- ID de la internación activa (si existe)
            FROM pacientes p
            LEFT JOIN seguros_medicos sm ON p.id_seguro = sm.id
            LEFT JOIN internaciones i ON p.id = i.id_paciente AND i.fecha_egreso IS NULL -- Solo internaciones activas
            ORDER BY p.apellido, p.nombre ASC
        `);

        // Obtener mensajes flash para mostrar en el listado
        const errorEliminar = req.flash('errorEliminar')[0] || null;
        const mensajeExito = req.flash('mensajeExito')[0] || null;

        res.render('pacientes/listado', {
            pacientes, // Pasa el array de pacientes modificado a la vista
            errorEliminar,
            mensajeExito
        });
    } catch (err) {
        console.error('Error al obtener el listado de pacientes:', err);
        next(err); // Pasa el error al manejador de errores global
    } finally {
        if (connection) connection.release();
    }
});


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


// Eliminar paciente (POST /pacientes/eliminar/:id)
router.post('/eliminar/:id', async (req, res, next) => {
    const id = req.params.id;
    const dniPaciente = req.body.dni || 'desconocido'; // Obtener DNI del formulario si es posible
    let connection;
    try {
        connection = await req.db.getConnection();
        await connection.beginTransaction();

        // 1. Verificar si el paciente tiene internaciones activas
        const [activeInternations] = await connection.query(
            'SELECT id FROM internaciones WHERE id_paciente = ? AND fecha_egreso IS NULL',
            [id]
        );

        if (activeInternations.length > 0) {
            await connection.rollback();
            req.flash('errorEliminar', `No se puede eliminar el paciente con DNI ${dniPaciente} porque tiene internaciones activas.`);
            return res.redirect('/pacientes');
        }

        // 2. Si no hay internaciones activas, eliminar el paciente
        await connection.query('DELETE FROM pacientes WHERE id = ?', [id]);
        await connection.commit();
        req.flash('mensajeExito', `Paciente con DNI ${dniPaciente} eliminado con éxito.`);
        res.redirect('/pacientes');
    } catch (err) {
        if (connection) await connection.rollback();
        console.error(`Error al eliminar paciente con ID ${id}:`, err);
        // Manejar errores de clave foránea si el paciente tiene registros históricos
        if (err.code === 'ER_ROW_IS_REFERENCED_2' || (err.sqlMessage && err.sqlMessage.includes('a foreign key constraint fails'))) {
            req.flash('errorEliminar', `No se puede eliminar el paciente con DNI ${dniPaciente} porque tiene registros históricos asociados (internaciones pasadas, etc.).`);
            return res.redirect('/pacientes');
        }
        next(err);
    } finally {
        if (connection) connection.release();
    }
});

// Ruta API para buscar pacientes (GET /api/pacientes/buscar?term=...)
router.get('/buscar', async (req, res, next) => {
    const searchTerm = req.query.term || '';
    let connection;
    try {
        connection = await req.db.getConnection();
        let query = `
            SELECT
                p.id,
                p.dni,
                p.nombre,
                p.apellido,
                CONCAT(p.apellido, ', ', p.nombre) AS nombre_completo,
                p.sexo,
                p.telefono,
                p.correo,
                sm.nombre AS nombre_seguro,
                p.nro_afiliado,
                -- Determinar si el paciente está internado y obtener el ID de internación activa
                CASE WHEN i.id IS NOT NULL AND i.fecha_egreso IS NULL THEN 1 ELSE 0 END AS internado,
                i.id AS id_internacion_actual
            FROM pacientes p
            LEFT JOIN seguros_medicos sm ON p.id_seguro = sm.id
            LEFT JOIN internaciones i ON p.id = i.id_paciente AND i.fecha_egreso IS NULL
            WHERE p.dni LIKE ? OR p.nombre LIKE ? OR p.apellido LIKE ?
            ORDER BY p.apellido, p.nombre ASC
        `;
        const searchPattern = `%${searchTerm}%`;
        const [rows] = await connection.query(query, [searchPattern, searchPattern, searchPattern]);
        res.json(rows);
    } catch (err) {
        console.error('Error al buscar pacientes:', err);
        next(err); // Pasa el error al manejador de errores global
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;