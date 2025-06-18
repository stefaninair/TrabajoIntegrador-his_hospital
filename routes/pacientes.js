const router = require('express').Router();
const moment = require('moment'); // Asegúrate de que moment esté instalado y requerido

// Ruta para mostrar el listado de pacientes (GET /pacientes)
router.get('/', async (req, res, next) => {
    let connection;
    try {
        connection = await req.db.getConnection();
        const [pacientes] = await connection.query(`
            SELECT 
                p.id, 
                p.dni, 
                p.nombre, 
                p.apellido, 
                p.fecha_nacimiento, 
                p.sexo, 
                p.direccion, 
                p.telefono, 
                p.correo, 
                p.id_seguro, 
                sm.nombre AS nombre_seguro, 
                p.nro_afiliado, 
                p.estado_atencion,
                p.id_emergencia_origen,
                e.motivo_emergencia, 
                e.fecha_hora_ingreso AS fecha_emergencia,
                e.es_anonimo,
                i.id AS id_internacion_actual,
                i.fecha_ingreso AS fecha_ingreso_internacion
            FROM pacientes p
            LEFT JOIN seguros_medicos sm ON p.id_seguro = sm.id
            LEFT JOIN emergencias e ON p.id_emergencia_origen = e.id
            LEFT JOIN internaciones i ON p.id = i.id_paciente AND i.fecha_egreso IS NULL
            ORDER BY p.apellido ASC, p.nombre ASC
        `);

        pacientes.forEach(paciente => {
            if (paciente.fecha_nacimiento) {
                paciente.fecha_nacimiento_formatted = moment(paciente.fecha_nacimiento).format('YYYY-MM-DD');
            }
            paciente.nombre_completo = `${paciente.apellido || ''}, ${paciente.nombre || ''}`.trim();
        });

        res.render('pacientes/listado', {
            pacientes: pacientes,
            errorEliminar: req.flash('error')[0],
            mensajeExito: req.flash('mensajeExito')[0]
        });
    } catch (err) {
        console.error('Error al obtener el listado de pacientes:', err);
        next(err);
    } finally {
        if (connection) connection.release();
    }
});

// Ruta API para buscar pacientes (GET /pacientes/buscar)
router.get('/buscar', async (req, res, next) => {
    const searchTerm = req.query.term ? `%${req.query.term}%` : '%';
    let connection;
    try {
        connection = await req.db.getConnection();
        const [pacientes] = await connection.query(`
            SELECT 
                p.id, 
                p.dni, 
                p.nombre, 
                p.apellido, 
                p.fecha_nacimiento, 
                p.sexo, 
                p.direccion, 
                p.telefono, 
                p.correo, 
                p.id_seguro, 
                sm.nombre AS nombre_seguro, 
                p.nro_afiliado, 
                p.estado_atencion,
                p.id_emergencia_origen,
                e.motivo_emergencia, 
                e.fecha_hora_ingreso AS fecha_emergencia,
                e.es_anonimo,
                i.id AS id_internacion_actual,
                i.fecha_ingreso AS fecha_ingreso_internacion
            FROM pacientes p
            LEFT JOIN seguros_medicos sm ON p.id_seguro = sm.id
            LEFT JOIN emergencias e ON p.id_emergencia_origen = e.id
            LEFT JOIN internaciones i ON p.id = i.id_paciente AND i.fecha_egreso IS NULL
            WHERE p.dni LIKE ? OR p.nombre LIKE ? OR p.apellido LIKE ?
            ORDER BY p.apellido ASC, p.nombre ASC
        `, [searchTerm, searchTerm, searchTerm]);

        pacientes.forEach(paciente => {
            if (paciente.fecha_nacimiento) {
                paciente.fecha_nacimiento_formatted = moment(paciente.fecha_nacimiento).format('YYYY-MM-DD');
            }
            paciente.nombre_completo = `${paciente.apellido || ''}, ${paciente.nombre || ''}`.trim();
        });

        res.json(pacientes);
    } catch (err) {
        console.error('Error al buscar pacientes:', err);
        next(err);
    } finally {
        if (connection) connection.release();
    }
});

// Formulario para crear un nuevo paciente (GET /pacientes/nuevo)
router.get('/nuevo', async (req, res, next) => {
    let connection;
    try {
        connection = await req.db.getConnection();
        const [seguros] = await connection.query('SELECT id, nombre FROM seguros_medicos');
        res.render('pacientes/nuevo', {
            seguros: seguros,
            errores: req.flash('errores')[0] || {},
            oldInput: req.flash('oldInput')[0] || {},
            mensajeExito: req.flash('mensajeExito')[0] || null
        });
    } catch (err) {
        console.error('Error al cargar la página de nuevo paciente:', err);
        next(err);
    } finally {
        if (connection) connection.release();
    }
});

// Guardar nuevo paciente (POST /pacientes)
router.post('/nuevo', async (req, res, next) => {
    const { dni, nombre, apellido, fecha_nacimiento, sexo, direccion, telefono, correo, id_seguro, nro_afiliado } = req.body;
    const errores = {};
    let idParticular = null;
    let connection;

    try {
        connection = await req.db.getConnection();
        await connection.beginTransaction();

        const [particularSeguro] = await connection.query('SELECT id FROM seguros_medicos WHERE nombre = "Particular"');
        if (particularSeguro.length > 0) {
            idParticular = particularSeguro[0].id;
        } else {
            console.warn("ADVERTENCIA: No se encontró el seguro 'Particular' en la base de datos.");
        }

        // Validaciones
        if (!dni || dni.trim() === '') {
            errores.dni = 'El DNI es obligatorio.';
        } else if (!/^\d+$/.test(dni.trim())) {
            errores.dni = 'El DNI debe contener solo números.';
        } else {
            const [existingPatient] = await connection.query('SELECT id FROM pacientes WHERE dni = ?', [dni.trim()]);
            if (existingPatient.length > 0) {
                errores.dni = 'Ya existe un paciente con este DNI.';
            }
        }
        if (!apellido || apellido.trim() === '') errores.apellido = 'El apellido es obligatorio.';
        if (!nombre || nombre.trim() === '') errores.nombre = 'El nombre es obligatorio.';
        if (correo && correo.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
            errores.correo = 'El correo electrónico no tiene un formato válido.';
        }
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
        if (!sexo || (sexo !== 'M' && sexo !== 'F')) {
            errores.sexo = 'Debe seleccionar un género válido.';
        }
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

        if (Object.keys(errores).length > 0) {
            req.flash('errores', errores);
            req.flash('oldInput', req.body);
            await connection.rollback();
            return res.redirect('/pacientes/nuevo');
        }

        await connection.query(
            `INSERT INTO pacientes (
                dni, nombre, apellido, fecha_nacimiento, sexo, direccion, telefono, correo, id_seguro, nro_afiliado, estado_atencion
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                dni.trim(),
                nombre.trim(),
                apellido.trim(),
                fecha_nacimiento,
                sexo,
                direccion ? direccion.trim() : null,
                telefono ? telefono.trim() : null,
                correo ? correo.trim() : null,
                idSeguroParaDB,
                nro_afiliado && nro_afiliado.trim() !== '' ? nro_afiliado.trim() : null,
                'Activo'
            ]
        );

        await connection.commit();
        req.flash('mensajeExito', 'Paciente registrado con éxito.');
        res.redirect('/pacientes');
    } catch (dbErr) {
        if (connection) await connection.rollback();
        console.error('Error al guardar nuevo paciente:', dbErr);
        next(dbErr);
    } finally {
        if (connection) connection.release();
    }
});

// Formulario para editar paciente (GET /pacientes/editar/:id)
router.get('/editar/:id', async (req, res, next) => {
    const id = req.params.id;
    let connection;
    try {
        connection = await req.db.getConnection();
        const [pacienteResult] = await connection.query('SELECT * FROM pacientes WHERE id = ?', [id]);
        
        // Verificación defensiva antes de acceder a pacienteResult[0]
        if (!pacienteResult || pacienteResult.length === 0) {
            req.flash('error', 'Paciente no encontrado.');
            return res.redirect('/pacientes');
        }
        const paciente = pacienteResult[0];

        const [seguros] = await connection.query('SELECT id, nombre FROM seguros_medicos');

        const errores = req.flash('errores')[0] || {};
        const mensajeExito = req.flash('mensajeExito')[0] || null;

        const oldInput = req.flash('oldInput')[0] || {};

        // Determinar si el DNI es temporal
        const isTempDni = paciente.dni && paciente.dni.startsWith('TEMP-'); 

        res.render('pacientes/editar', {
            paciente: paciente,
            seguros: seguros,
            errores: errores,
            mensajeExito: mensajeExito,
            dni: oldInput.dni || paciente.dni || '',
            apellido: oldInput.apellido || paciente.apellido || '',
            nombre: oldInput.nombre || paciente.nombre || '',
            telefono: oldInput.telefono || paciente.telefono || '',
            correo: oldInput.correo || paciente.correo || '',
            // Asegurarse de que la fecha se formatee solo si existe y es válida
            fecha_nacimiento: oldInput.fecha_nacimiento || (paciente.fecha_nacimiento && moment(paciente.fecha_nacimiento).isValid() ? moment(paciente.fecha_nacimiento).format('YYYY-MM-DD') : ''),
            sexo: oldInput.sexo || paciente.sexo || '',
            direccion: oldInput.direccion || paciente.direccion || '',
            id_seguro: oldInput.id_seguro || paciente.id_seguro || '',
            nro_afiliado: oldInput.nro_afiliado || paciente.nro_afiliado || '',
            estado_atencion: paciente.estado_atencion,
            id_emergencia_origen: paciente.id_emergencia_origen,
            isTempDni: isTempDni
        });
    } catch (err) {
        console.error('Error al cargar la página de edición de paciente:', err);
        next(err);
    } finally {
        if (connection) connection.release();
    }
});

// Guardar cambios del paciente (POST /pacientes/editar/:id)
router.post('/editar/:id', async (req, res, next) => {
    const pacienteId = req.params.id;
    const {
        dni, 
        nombre,
        apellido,
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
    let connection;

    try {
        connection = await req.db.getConnection();
        await connection.beginTransaction();

        const [particularSeguro] = await connection.query('SELECT id FROM seguros_medicos WHERE nombre = "Particular"');
        if (particularSeguro.length > 0) {
            idParticular = particularSeguro[0].id;
        } else {
            console.warn("ADVERTENCIA: No se encontró el seguro 'Particular' en la base de datos.");
        }

        // Validaciones
        const [currentPaciente] = await connection.query('SELECT dni FROM pacientes WHERE id = ?', [pacienteId]);
        const currentDni = currentPaciente[0] ? currentPaciente[0].dni : null;
        const isCurrentDniTemp = currentDni && currentDni.startsWith('TEMP-');

        // DNI: Obligatorio y solo números
        if (!dni || dni.trim() === '') {
            errores.dni = 'El DNI es obligatorio.';
        } else if (!/^\d+$/.test(dni.trim())) {
            errores.dni = 'El DNI debe contener solo números.';
        } else {
            if (dni.trim() !== currentDni || isCurrentDniTemp) {
                const [existingPatient] = await connection.query('SELECT id FROM pacientes WHERE dni = ? AND id != ?', [dni.trim(), pacienteId]);
                if (existingPatient.length > 0) {
                    errores.dni = 'Ya existe otro paciente con este DNI.';
                }
            }
        }

        // Apellido y Nombre: Obligatorios
        if (!apellido || apellido.trim() === '') errores.apellido = 'El apellido es obligatorio.';
        if (!nombre || nombre.trim() === '') errores.nombre = 'El nombre es obligatorio.';

        // Correo: Formato de email si está presente
        if (correo && correo.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
            errores.correo = 'El correo electrónico no tiene un formato válido.';
        }

        // Fecha de Nacimiento: Obligatoria y válida
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

        // id_seguro y nro_afiliado: Lógica de validación
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

        if (Object.keys(errores).length > 0) {
            req.flash('errores', errores);
            req.flash('oldInput', req.body); 
            await connection.rollback(); 
            return res.redirect('/pacientes/editar/' + pacienteId);
        }

        await connection.query(
            `UPDATE pacientes SET
                dni = ?,
                nombre = ?,
                apellido = ?,
                fecha_nacimiento = ?,
                sexo = ?,
                direccion = ?,
                telefono = ?,
                correo = ?,
                id_seguro = ?,
                nro_afiliado = ?
            WHERE id = ?`,
            [
                dni.trim(), 
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

        await connection.commit(); 
        req.flash('mensajeExito', 'Datos del paciente actualizados con éxito.');
        res.redirect('/pacientes/editar/' + pacienteId);

    } catch (dbErr) {
        if (connection) await connection.rollback(); 
        console.error('Error al guardar cambios del paciente:', dbErr);
        next(dbErr);
    } finally {
        if (connection) connection.release();
    }
});

// Eliminar paciente (POST /pacientes/eliminar/:id)
router.post('/eliminar/:id', async (req, res, next) => {
    const pacienteId = req.params.id;
    let connection;
    try {
        connection = await req.db.getConnection();
        await connection.beginTransaction();

        const [internacionActiva] = await connection.query('SELECT id FROM internaciones WHERE id_paciente = ? AND fecha_egreso IS NULL', [pacienteId]);
        if (internacionActiva.length > 0) {
            req.flash('error', 'No se puede eliminar al paciente porque tiene una internación activa.');
            await connection.rollback();
            return res.redirect('/pacientes');
        }

        await connection.query('DELETE FROM emergencias WHERE id_paciente_temp = ?', [pacienteId]);

        await connection.query('DELETE FROM pacientes WHERE id = ?', [pacienteId]);
        
        await connection.commit();
        req.flash('mensajeExito', 'Paciente eliminado con éxito.');
        res.redirect('/pacientes');
    } catch (dbErr) {
        if (connection) await connection.rollback();
        console.error('Error al eliminar paciente:', dbErr);
        req.flash('error', 'Error al eliminar paciente.');
        res.redirect('/pacientes');
        next(dbErr);
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;
