const router = require('express').Router(); // Necesitas importar Router aquí

// Ruta para mostrar el formulario de registro de emergencia (GET /emergencias/nuevo)
router.get('/nuevo', async (req, res, next) => {
    let connection;
    try {
        connection = await req.db.getConnection();
        const [salas] = await connection.query('SELECT id, nombre FROM salas ORDER BY nombre ASC');
        const errores = req.flash('errores')[0] || {};
        const oldInput = req.flash('oldInput')[0] || {};

        res.render('emergencias/nuevo', {
            salas,
            dni_ingresado: oldInput.dni_ingresado || '',
            nombre_temp: oldInput.nombre_temp || '',
            apellido_temp: oldInput.apellido_temp || '',
            es_anonimo: oldInput.es_anonimo || false,
            sexo: oldInput.sexo || '',
            contextura_fisica: oldInput.contextura_fisica || '',
            motivo_emergencia: oldInput.motivo_emergencia || '',
            id_sala_emergencia: oldInput.id_sala_emergencia || '',
            errores
        });
    } catch (error) {
        console.error('Error al cargar la página de nueva emergencia:', error);
        next(error);
    } finally {
        if (connection) connection.release();
    }
});

// Ruta para procesar el registro de emergencia (POST /emergencias)
router.post('/', async (req, res, next) => {
    const {
        dni_ingresado,
        nombre_temp,
        apellido_temp,
        es_anonimo,
        sexo,
        contextura_fisica,
        motivo_emergencia,
        id_sala_emergencia
    } = req.body;

    const isAnonymous = es_anonimo === 'on';

    const errores = {};
    let finalDni = isAnonymous ? null : (dni_ingresado ? dni_ingresado.trim() : null);
    let finalNombre = isAnonymous ? 'Paciente Anónimo' : (nombre_temp ? nombre_temp.trim() : null);
    let finalApellido = isAnonymous ? 'Desconocido' : (apellido_temp ? apellido_temp.trim() : null);

    let idParticular = null;
    let connection;

    try {
        connection = await req.db.getConnection();
        await connection.beginTransaction();

        const [particularSeguro] = await connection.query('SELECT id FROM seguros_medicos WHERE nombre = "Particular"');
        if (particularSeguro.length > 0) {
            idParticular = particularSeguro[0].id;
        } else {
            console.warn("ADVERTENCIA: No se encontró el seguro 'Particular' en la base de datos. Se usará NULL en el paciente provisional.");
        }

        if (!sexo || (sexo !== 'M' && sexo !== 'F')) {
            errores.sexo = 'Debe seleccionar un género válido.';
        }
        if (!contextura_fisica || contextura_fisica.trim() === '') {
            errores.contextura_fisica = 'La contextura física es obligatoria.';
        }
        if (!motivo_emergencia || motivo_emergencia.trim() === '') {
            errores.motivo_emergencia = 'El motivo de la emergencia es obligatorio.';
        }
        if (!id_sala_emergencia || id_sala_emergencia === '') {
            errores.id_sala_emergencia = 'Debe seleccionar una sala de emergencia.';
        }
        if (!isAnonymous) {
            if (!finalDni) {
                errores.dni_ingresado = 'El DNI es obligatorio si el paciente está identificado.';
            } else if (!/^\d+$/.test(finalDni)) {
                errores.dni_ingresado = 'El DNI debe contener solo números.';
            } else {
                const [existingPatient] = await connection.query('SELECT id FROM pacientes WHERE dni = ?', [finalDni]);
                if (existingPatient.length > 0) {
                    errores.dni_ingresado = 'Ya existe un paciente con este DNI.';
                }
            }
            if (!finalNombre) errores.nombre_temp = 'El nombre es obligatorio.';
            if (!finalApellido) errores.apellido_temp = 'El apellido es obligatorio.';
        }

        if (Object.keys(errores).length > 0) {
            req.flash('errores', errores);
            req.flash('oldInput', req.body);
            await connection.rollback();
            return res.redirect('/emergencias/nuevo');
        }

        const pacienteProvisionalDNI = finalDni || `TEMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const [pacienteResult] = await connection.query(
            `INSERT INTO pacientes (
                dni,
                nombre,
                apellido,
                sexo,
                id_seguro,
                estado_atencion
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
                pacienteProvisionalDNI,
                finalNombre,
                finalApellido,
                sexo,
                idParticular,
                'En Urgencia'
            ]
        );
        const idNuevoPacienteProvisional = pacienteResult.insertId;

        const [emergenciaResult] = await connection.query(
            `INSERT INTO emergencias (
                id_paciente_temp,
                dni_ingresado,
                nombre_temp,
                apellido_temp,
                es_anonimo,
                sexo,
                contextura_fisica,
                motivo_emergencia,
                id_sala_emergencia,
                fecha_hora_ingreso,
                estado_emergencia
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                idNuevoPacienteProvisional,
                finalDni,
                finalNombre,
                finalApellido,
                isAnonymous,
                sexo,
                contextura_fisica.trim(),
                motivo_emergencia.trim(),
                id_sala_emergencia,
                new Date(),
                'En Atención'
            ]
        );

        await connection.query(
            `UPDATE pacientes SET id_emergencia_origen = ? WHERE id = ?`,
            [emergenciaResult.insertId, idNuevoPacienteProvisional]
        );

        await connection.commit();

        req.flash('mensajeExito', `Emergencia registrada y paciente provisional creado. ID Paciente: ${idNuevoPacienteProvisional}`);
        res.redirect(`/pacientes/editar/${idNuevoPacienteProvisional}`);

    } catch (dbErr) {
        if (connection) await connection.rollback();
        console.error('Error al registrar la emergencia y paciente provisional:', dbErr);
        next(dbErr);
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router; // ¡Esta línea es ESENCIAL y debe ser la última!
