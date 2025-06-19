const express = require('express');
const router = express.Router();

// Ruta para mostrar el formulario de nueva internación 
router.get('/nueva/:id_paciente', async (req, res) => {
    const { id_paciente } = req.params;

    try {
        const [pacienteResult] = await req.db.query('SELECT * FROM pacientes WHERE id = ?', [id_paciente]);
        const paciente = pacienteResult[0];

        if (!paciente) {
            req.flash('error', 'Paciente no encontrado.');
            return res.redirect('/pacientes');
        }

        const [activeInternations] = await req.db.query(
            'SELECT id FROM internaciones WHERE id_paciente = ? AND fecha_egreso IS NULL',
            [id_paciente]
        );
        if (activeInternations.length > 0) {
            req.flash('error', 'El paciente ya tiene una internación activa.');
            return res.redirect('/pacientes');
        }

        res.render('internaciones/nueva', {
            title: 'Nueva Internación',
            paciente: paciente,
            messages: req.flash()
        });
    } catch (error) {
        console.error('Error al cargar la página de internación (Paso 1):', error);
        req.flash('error', 'Error interno del servidor al cargar la página de internación.');
        res.redirect('/pacientes');
    }
});

// Ruta POST: Procesar el formulario de nueva.pug 
router.post('/pre-seleccionar-cama/:id_paciente', async (req, res) => {
    const pacienteId = req.params.id_paciente;
    const internacionData = req.body;

    req.session.internacionPreliminar = {
        pacienteId: pacienteId,
        data: internacionData
    };

    res.redirect(`/internaciones/seleccionar-cama/${pacienteId}`);
});

// Ruta GET: Mostrar el formulario de selección de cama
router.get('/seleccionar-cama/:id_paciente', async (req, res) => {
  const pacienteId = req.params.id_paciente;
  try {
    const [pacienteRows] = await req.db.query('SELECT * FROM pacientes WHERE id = ?', [pacienteId]);
    const paciente = pacienteRows[0];

    if (!paciente) {
      req.flash('error', 'Paciente no encontrado.');
      return res.redirect('/pacientes');
    }

    const [alasRows] = await req.db.query('SELECT * FROM alas');
    const alas = alasRows;

    const internacionPreliminar = req.session.internacionPreliminar;

    if (!internacionPreliminar || internacionPreliminar.pacienteId != pacienteId) {
        req.flash('error', 'Datos preliminares de internación no encontrados o no coinciden. Por favor, complete el formulario de internación primero.');
        return res.redirect(`/internaciones/nueva/${pacienteId}`);
    }

    res.render('internaciones/seleccionar_cama', {
      title: 'Seleccionar Cama',
      paciente: paciente,
      alas: alas,
      messages: req.flash()
    });

  } catch (error) {
    console.error('Error al cargar la página de selección de cama:', error);
    req.flash('error', 'Error interno del servidor al cargar la página de selección de cama.');
    res.redirect('/pacientes');
  }
});


router.get('/api/habitaciones-por-ala/:alaId', async (req, res) => {
  try {
    const alaId = req.params.alaId;
    const [habitaciones] = await req.db.query('SELECT id, numero_habita, capacidad, id_ala FROM habitaciones WHERE id_ala = ?', [alaId]);
    res.json(habitaciones);
  } catch (error) {
    console.error('Error al obtener habitaciones por ala:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/api/camas-por-habitacion/:habitacionId', async (req, res) => {
  try {
    const habitacionId = req.params.habitacionId;
    const [camas] = await req.db.query(`
      SELECT
        c.id,
        c.numero_cama,
        c.estado,
        c.higienizada,
        c.id_paciente_actual,
        p.sexo AS sexo_paciente_ocupante,
        h.capacidad
      FROM camas c
      JOIN habitaciones h ON c.id_habitacion = h.id
      LEFT JOIN pacientes p ON c.id_paciente_actual = p.id
      WHERE c.id_habitacion = ?
      ORDER BY c.numero_cama;
    `, [habitacionId]);
    res.json(camas);
  } catch (error) {
    console.error('Error al obtener camas por habitacion:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// RUTA POST: Para procesar la internación COMPLETA
router.post('/finalizar-internacion/:id_paciente', async (req, res) => {
  const pacienteId = req.params.id_paciente;
  const { id_cama } = req.body;

  const internacionPreliminar = req.session.internacionPreliminar;

  if (!internacionPreliminar || internacionPreliminar.pacienteId != pacienteId) {
      req.flash('error', 'Error: Datos preliminares de internación no encontrados o no coinciden. Por favor, reinicie el proceso de internación.');
      return res.redirect(`/internaciones/nueva/${pacienteId}`);
  }

  const { motivo, ...otrosDatosInternacion } = internacionPreliminar.data;
  const fechaIngreso = new Date();

  let connection;
  try {
    connection = await req.db.getConnection();
    await connection.beginTransaction();

    //  Asegurar que el paciente no tiene una internación activa
    const [activeInternations] = await connection.execute(
      'SELECT id FROM internaciones WHERE id_paciente = ? AND fecha_egreso IS NULL',
      [pacienteId]
    );
    if (activeInternations.length > 0) {
      await connection.rollback();
      req.flash('error', 'El paciente ya tiene una internación activa.');
      return res.redirect(`/internaciones/nueva/${pacienteId}`);
    }

    // Obtener datos de la cama y el paciente a internar
    const [camaRows] = await connection.execute(
      `SELECT c.id, c.numero_cama, c.estado, c.higienizada, c.id_paciente_actual, h.capacidad,
              p_actual.sexo AS sexo_ocupante_actual, p_nuevo.sexo AS sexo_paciente_nuevo
       FROM camas c
       JOIN habitaciones h ON c.id_habitacion = h.id
       LEFT JOIN pacientes p_actual ON c.id_paciente_actual = p_actual.id
       JOIN pacientes p_nuevo ON p_nuevo.id = ?
       WHERE c.id = ?`,
      [pacienteId, id_cama]
    );
    const camaSeleccionada = camaRows[0];

    if (!camaSeleccionada) {
      await connection.rollback();
      req.flash('error', 'Cama seleccionada no encontrada.');
      return res.redirect(`/internaciones/seleccionar-cama/${pacienteId}`);
    }

    if (camaSeleccionada.estado !== 'libre' || camaSeleccionada.higienizada !== 1) {
      await connection.rollback();
      req.flash('error', 'La cama seleccionada no está libre o no está higienizada.');
      return res.redirect(`/internaciones/seleccionar-cama/${pacienteId}`);
    }

    if (camaSeleccionada.capacidad > 1) {
      const [otrasCamas] = await connection.execute(
        `SELECT c2.id, c2.id_paciente_actual, p_otro.sexo
         FROM camas c1
         JOIN camas c2 ON c1.id_habitacion = c2.id_habitacion AND c1.id != c2.id
         LEFT JOIN pacientes p_otro ON c2.id_paciente_actual = p_otro.id
         WHERE c1.id = ? AND c2.id_paciente_actual IS NOT NULL`,
        [id_cama]
      );

      const pacienteNuevoSexo = camaSeleccionada.sexo_paciente_nuevo;

      for (const otraCama of otrasCamas) {
        if (otraCama.sexo && otraCama.sexo !== pacienteNuevoSexo) {
          await connection.rollback();
          req.flash('error', 'No se puede internar un paciente de sexo diferente en esta habitación compartida.');
          return res.redirect(`/internaciones/seleccionar-cama/${pacienteId}`);
        }
      }
    }

    
    const [result] = await connection.execute(
      `INSERT INTO internaciones (id_paciente, tipo_ingreso, id_cama, fecha_ingreso, fecha_egreso)
       VALUES (?, ?, ?, ?, ?)`,
      [pacienteId, motivo, id_cama, fechaIngreso, null]
    );
    const nuevaInternacionId = result.insertId;

    
    if (motivo === 'maternidad') {
      await connection.execute(`
        INSERT INTO internaciones_maternidad (
          id_internacion, semanas_gestacion, antecedentes_medicos,
          grupo_sanguineo, factor_rh, resultados_estudios, nombre_obstetra,
          nombre_acompanante, parentesco_acompanante
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        nuevaInternacionId,
        otrosDatosInternacion.semanas_gestacion || null,
        otrosDatosInternacion.antecedentes_medicos || null,
        otrosDatosInternacion.grupo_sanguineo || null,
        otrosDatosInternacion.factor_rh || null,
        otrosDatosInternacion.resultados_estudios || null,
        otrosDatosInternacion.nombre_obstetra || null,
        otrosDatosInternacion.nombre_acompanante || null,
        otrosDatosInternacion.parentesco_acompanante || null
      ]);
    } else if (motivo === 'cirugia') {
      await connection.execute(`
        INSERT INTO internaciones_cirugia (
          id_internacion, autorizacion_cirugia, historia_clinica,
          medicamentos_actuales, preoperatorios, resultados_estudios_cirugia,
          nombre_cirujano, diagnostico_medico, tipo_intervencion_quirurgica
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        nuevaInternacionId,
        otrosDatosInternacion.autorizacion_cirugia || null,
        otrosDatosInternacion.historia_clinica || null,
        otrosDatosInternacion.medicamentos_actuales || null,
        otrosDatosInternacion.preoperatorios || null,
        otrosDatosInternacion.resultados_estudios_cirugia || null,
        otrosDatosInternacion.nombre_cirujano || null,
        otrosDatosInternacion.diagnostico_medico || null,
        otrosDatosInternacion.tipo_intervencion_quirurgica || null
      ]);
    } else if (motivo === 'derivacion') {
      await connection.execute(`
        INSERT INTO internaciones_derivacion (
          id_internacion, nombre_medico_derivante, especialidad_medico_derivante,
          diagnostico_derivacion, tratamiento_inicial, resultados_estudios_origen
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        nuevaInternacionId,
        otrosDatosInternacion.nombre_medico_derivante || null,
        otrosDatosInternacion.especialidad_medico_derivante || null,
        otrosDatosInternacion.diagnostico_derivacion || null,
        otrosDatosInternacion.tratamiento_inicial || null,
        otrosDatosInternacion.resultados_estudios_origen || null
      ]);
    } else if (motivo === 'urgencia') {
      await connection.execute(`
        INSERT INTO internaciones_urgencia (
          id_internacion, modo_llegada, sintomas_al_ingreso,
          signos_vitales_ingreso, nivel_conciencia, primeras_intervenciones,
          nombre_medico_urgencias
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        nuevaInternacionId,
        otrosDatosInternacion.modo_llegada || null,
        otrosDatosInternacion.sintomas_al_ingreso || null,
        otrosDatosInternacion.signos_vitales_ingreso || null,
        otrosDatosInternacion.nivel_conciencia || null,
        otrosDatosInternacion.primeras_intervenciones || null,
        otrosDatosInternacion.nombre_medico_urgencias || null
      ]);
    }

    // Actualizar el estado de la cama a 'ocupada' y asignar id_paciente_actual
    await connection.execute(
      'UPDATE camas SET estado = ?, id_paciente_actual = ? WHERE id = ?',
      ['ocupada', pacienteId, id_cama]
    );

    await connection.commit();
    req.session.internacionPreliminar = null;

    req.flash('success', 'Internación registrada con éxito!');
    // Redirigir al comprobante
    res.redirect(`/internaciones/comprobante/${nuevaInternacionId}`);

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error al procesar la internación:', error);
    req.flash('error', 'Error interno del servidor al procesar la internación.');
    res.redirect(`/internaciones/seleccionar-cama/${pacienteId}`);
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Mostrar el comprobante de internación
router.get('/comprobante/:id_internacion', async (req, res) => {
    const internacionId = req.params.id_internacion;
    try {
        // Unir internaciones con pacientes, camas, habitaciones y alas
        const [internacionRows] = await req.db.query(
            `SELECT i.*, p.nombre AS paciente_nombre, p.apellido AS paciente_apellido, p.dni AS paciente_dni,
                    c.numero_cama, h.numero_habita, a.nombre AS nombre_ala
             FROM internaciones i
             JOIN pacientes p ON i.id_paciente = p.id
             JOIN camas c ON i.id_cama = c.id
             JOIN habitaciones h ON c.id_habitacion = h.id
             JOIN alas a ON h.id_ala = a.id
             WHERE i.id = ?`,
            [internacionId]
        );
        let internacion = internacionRows[0];

        if (!internacion) {
            req.flash('error', 'Comprobante de internación no encontrado.');
            return res.redirect('/pacientes');
        }

        // Obtener datos específicos según el tipo de ingreso
        if (internacion.tipo_ingreso === 'maternidad') {
            const [maternidadRows] = await req.db.query('SELECT * FROM internaciones_maternidad WHERE id_internacion = ?', [internacion.id]);
            internacion = { ...internacion, ...maternidadRows[0] }; 
        }  if (internacion.tipo_ingreso === 'cirugia') {
            const [cirugiaRows] = await req.db.query('SELECT * FROM internaciones_cirugia WHERE id_internacion = ?', [internacion.id]);
            internacion = { ...internacion, ...cirugiaRows[0] };
        } else if (internacion.tipo_ingreso === 'derivacion') {
            const [derivacionRows] = await req.db.query('SELECT * FROM internaciones_derivacion WHERE id_internacion = ?', [internacion.id]);
            internacion = { ...internacion, ...derivacionRows[0] };
        } else if (internacion.tipo_ingreso === 'urgencia') {
            const [urgenciaRows] = await req.db.query('SELECT * FROM internaciones_urgencia WHERE id_internacion = ?', [internacion.id]);
            internacion = { ...internacion, ...urgenciaRows[0] };
            
        }

        res.render('internaciones/comprobante', {
            title: 'Comprobante de Internación',
            internacion: internacion,
            messages: req.flash()
        });

    } catch (error) {
        console.error('Error al cargar el comprobante de internación:', error);
        req.flash('error', 'Error interno del servidor al cargar el comprobante.');
        res.redirect('/pacientes');
    }
});

// Saber si el paciente está internado (usado para mostrar en listado)
router.get('/api/estado/:id_paciente', async (req, res) => {
    try {
        const { id_paciente } = req.params;
        // Buscamos internaciones activas 
        const [rows] = await req.db.query(
            'SELECT id FROM internaciones WHERE id_paciente = ? AND fecha_egreso IS NULL',
            [id_paciente]
        );

        if (rows.length > 0) {
            // Si hay una internación activa, devolvemos internado
            res.json({ internado: true, id_internacion: rows[0].id });
        } else {
            // Si no hay internaciones activas, devolvemos internado: false.
            res.json({ internado: false });
        }
    } catch (err) {
        console.error('Error al verificar internación:', err);
        res.status(500).json({ error: 'Error al verificar internación' });
    }
});

// Ruta para procesar el egreso/alta de un paciente
router.post('/egresar/:idInternacion', async (req, res) => {
    const { idInternacion } = req.params;
    const { motivo_alta } = req.body;

    // Validación básica
    if (!idInternacion || isNaN(Number(idInternacion))) {
        req.flash('errorEliminar', 'ID de internación no válido para el alta.'); 
        return res.redirect('/pacientes');
    }
    if (!motivo_alta || motivo_alta.trim() === '') {
        req.flash('errorEliminar', 'Debe seleccionar un motivo de alta.'); 
        return res.redirect(`/internaciones/comprobante/${idInternacion}`);
    }

    let connection;
    try {
        connection = await req.db.getConnection();
        await connection.beginTransaction(); 

        // Obtener los datos de la internación actual, incluida la cama y el paciente
        
        const [internacionResult] = await connection.query(
            `SELECT id_cama, id_paciente FROM internaciones WHERE id = ? AND fecha_egreso IS NULL`,
            [idInternacion]
        );

        if (internacionResult.length === 0) {
            req.flash('errorEliminar', 'Internación no encontrada o ya ha sido egresada.');
            await connection.rollback();
            return res.redirect('/pacientes');
        }

        const { id_cama, id_paciente } = internacionResult[0];

        // Actualizar la internación (establecer fecha_egreso y motivo_alta)
        await connection.query(
            `UPDATE internaciones SET fecha_egreso = NOW(), motivo_alta = ? WHERE id = ?`,
            [motivo_alta, idInternacion]
        );

        // Liberar la cama (estado = 'libre', id_paciente_actual = NULL, higienizada = 0 para indicar que necesita limpieza)
        await connection.query(
            `UPDATE camas SET estado = 'libre', id_paciente_actual = NULL, higienizada = 0 WHERE id = ?`,
            [id_cama]
        );

        // Actualizar el estado del paciente (internado = 0)
        await connection.query(
            `UPDATE pacientes SET internado = 0 WHERE id = ?`,
            [id_paciente]
        );

        await connection.commit(); 
        req.flash('mensajeExito', 'Paciente dado de alta exitosamente y cama liberada.');
        res.redirect('/pacientes'); 
    } catch (error) {
        if (connection) await connection.rollback(); 
        console.error('Error al egresar paciente:', error);
        req.flash('errorEliminar', 'Error interno del servidor al dar de alta al paciente.');
        res.redirect('/pacientes'); 
    } finally {
        if (connection) connection.release(); 
    }
});


module.exports = router;