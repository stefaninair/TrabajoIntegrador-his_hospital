const express = require('express');
const router = express.Router();

// Ruta para mostrar el formulario de nueva internación (Paso 1: GET)
router.get('/nueva/:id_paciente', async (req, res) => {
  const { id_paciente } = req.params;

  try {
    const [pacienteResult] = await req.db.query('SELECT * FROM pacientes WHERE id = ?', [id_paciente]);
    const paciente = pacienteResult[0];

    if (!paciente) {
      req.flash('error', 'Paciente no encontrado.');
      return res.redirect('/pacientes'); // Redirige si el paciente no existe
    }

    // Opcional: Validar si el paciente ya tiene una internación activa
    const [activeInternations] = await req.db.query(
      'SELECT id FROM internaciones WHERE id_paciente = ? AND fecha_egreso IS NULL',
      [id_paciente]
    );
    if (activeInternations.length > 0) {
      req.flash('error', 'El paciente ya tiene una internación activa.');
      return res.redirect('/pacientes'); // O a una página de error/detalle de paciente
    }

    res.render('internaciones/nueva', {
      title: 'Nueva Internación',
      paciente: paciente,
      messages: req.flash() // Para mostrar mensajes flash si los hay
    });
  } catch (error) {
    console.error('Error al cargar la página de internación (Paso 1):', error);
    req.flash('error', 'Error interno del servidor al cargar la página de internación.');
    res.redirect('/pacientes');
  }
});

// NUEVA RUTA: Procesar el formulario de nueva.pug (Paso 1 POST)
// Guarda los datos preliminares en la sesión y redirige a seleccionar_cama.pug (Paso 2 GET)
router.post('/pre-seleccionar-cama/:id_paciente', async (req, res) => {
    const pacienteId = req.params.id_paciente;
    const internacionData = req.body; // Esto contendrá todos los datos del formulario de nueva.pug

    // Guardar los datos de internacionData en la sesión
    req.session.internacionPreliminar = {
        pacienteId: pacienteId,
        data: internacionData
    };

    // Redirigir al formulario de selección de cama
    res.redirect(`/internaciones/seleccionar-cama/${pacienteId}`);
});


// NUEVA RUTA: Mostrar el formulario de selección de cama (Paso 2: GET)
router.get('/seleccionar-cama/:id_paciente', async (req, res) => {
  const pacienteId = req.params.id_paciente;
  try {
    // 1. Obtener datos del paciente
    const [pacienteRows] = await req.db.query('SELECT * FROM pacientes WHERE id = ?', [pacienteId]);
    const paciente = pacienteRows[0];

    if (!paciente) {
      req.flash('error', 'Paciente no encontrado.');
      return res.redirect('/pacientes');
    }

    // 2. Obtener todas las alas para el select
    const [alasRows] = await req.db.query('SELECT * FROM alas');
    const alas = alasRows;

    // Recuperar los datos preliminares de la internación de la sesión
    const internacionPreliminar = req.session.internacionPreliminar;

    // Validar que los datos preliminares corresponden a este paciente
    if (!internacionPreliminar || internacionPreliminar.pacienteId != pacienteId) {
        req.flash('error', 'Datos preliminares de internación no encontrados o no coinciden. Por favor, complete el formulario de internación primero.');
        return res.redirect(`/internaciones/nueva/${pacienteId}`); // Redirigir de nuevo al Paso 1
    }

    res.render('internaciones/seleccionar_cama', {
      title: 'Seleccionar Cama',
      paciente: paciente,
      alas: alas,
      messages: req.flash() // Para mostrar mensajes flash si los hay
    });

  } catch (error) {
    console.error('Error al cargar la página de selección de cama:', error);
    req.flash('error', 'Error interno del servidor al cargar la página de selección de cama.');
    res.redirect('/pacientes');
  }
});


// Rutas API para carga dinámica (AJAX) - Se mantienen aquí
router.get('/api/habitaciones-por-ala/:alaId', async (req, res) => {
  try {
    const alaId = req.params.alaId;
    const [habitaciones] = await req.db.query('SELECT * FROM habitaciones WHERE id_ala = ?', [alaId]);
    res.json(habitaciones);
  } catch (error) {
    console.error('Error al obtener habitaciones por ala:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/api/camas-por-habitacion/:habitacionId', async (req, res) => {
  try {
    const habitacionId = req.params.habitacionId;
    // Unir camas con pacientes para obtener el sexo si la cama está ocupada
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


// RUTA POST: Para procesar la internación COMPLETA (Paso 3)
router.post('/finalizar-internacion/:id_paciente', async (req, res) => {
  const pacienteId = req.params.id_paciente;
  const { id_cama } = req.body; // id_cama es lo que viene del formulario seleccionar_cama.pug

  // Recuperar los datos preliminares de la internación de la sesión
  const internacionPreliminar = req.session.internacionPreliminar;

  if (!internacionPreliminar || internacionPreliminar.pacienteId != pacienteId) {
      req.flash('error', 'Error: Datos preliminares de internación no encontrados o no coinciden. Por favor, reinicie el proceso de internación.');
      return res.redirect(`/internaciones/nueva/${pacienteId}`);
  }

  // Combinar todos los datos para la internación final
  const { motivo, ...otrosDatosInternacion } = internacionPreliminar.data; // Desestructuramos motivo
  const fechaIngreso = new Date();

  // Asegúrate de que los campos de internacionCompleta coincidan con tu tabla 'internaciones'
  // y que los campos de array (como antecedentes_medicos) se conviertan a JSON strings.
  const internacionCompleta = {
    id_paciente: pacienteId,
    tipo_ingreso: motivo,
    id_cama: id_cama,
    fecha_ingreso: fechaIngreso,
    fecha_egreso: null, // Asume que al iniciar no hay fecha de egreso

    // Campos de Maternidad (si aplica)
    semanas_gestacion: otrosDatosInternacion.semanas_gestacion,
    antecedentes_medicos: JSON.stringify(otrosDatosInternacion.antecedentes_medicos || []),
    grupo_sanguineo: otrosDatosInternacion.grupo_sanguineo,
    factor_rh: otrosDatosInternacion.factor_rh,
    resultados_estudios: otrosDatosInternacion.resultados_estudios,
    nombre_obstetra: otrosDatosInternacion.nombre_obstetra,
    nombre_acompanante: otrosDatosInternacion.nombre_acompanante,
    parentesco_acompanante: otrosDatosInternacion.parentesco_acompanante,

    // Campos de Cirugía (si aplica)
    autorizacion_cirugia: otrosDatosInternacion.autorizacion_cirugia,
    historia_clinica: otrosDatosInternacion.historia_clinica,
    medicamentos_actuales: otrosDatosInternacion.medicamentos_actuales,
    preoperatorios: otrosDatosInternacion.preoperatorios,
    resultados_estudios_cirugia: otrosDatosInternacion.resultados_estudios_cirugia,
    nombre_cirujano: otrosDatosInternacion.nombre_cirujano,
    diagnostico_medico: otrosDatosInternacion.diagnostico_medico,
    tipo_intervencion_quirurgica: otrosDatosInternacion.tipo_intervencion_quirurgica,

    // Campos de Derivación (si aplica)
    nombre_medico_derivante: otrosDatosInternacion.nombre_medico_derivante,
    especialidad_medico_derivante: otrosDatosInternacion.especialidad_medico_derivante,
    diagnostico_derivacion: otrosDatosInternacion.diagnostico_derivacion,
    tratamiento_inicial: otrosDatosInternacion.tratamiento_inicial,
    resultados_estudios_origen: otrosDatosInternacion.resultados_estudios_origen,

    // Campos de Urgencia (si aplica)
    modo_llegada: otrosDatosInternacion.modo_llegada,
    sintomas_al_ingreso: otrosDatosInternacion.sintomas_al_ingreso,
    signos_vitales_ingreso: otrosDatosInternacion.signos_vitales_ingreso,
    nivel_conciencia: otrosDatosInternacion.nivel_conciencia,
    primeras_intervenciones: JSON.stringify(otrosDatosInternacion.primeras_intervenciones || []),
    nombre_medico_urgencias: otrosDatosInternacion.nombre_medico_urgencias,
  };


  let connection;
  try {
    connection = await req.db.getConnection(); // Obtener una conexión del pool
    await connection.beginTransaction(); // Iniciar una transacción

    // 1. VALIDACIÓN: Asegurar que el paciente no tiene una internación activa
    const [activeInternations] = await connection.execute(
      'SELECT id FROM internaciones WHERE id_paciente = ? AND fecha_egreso IS NULL',
      [pacienteId]
    );
    if (activeInternations.length > 0) {
      await connection.rollback();
      req.flash('error', 'El paciente ya tiene una internación activa.');
      return res.redirect(`/internaciones/nueva/${pacienteId}`);
    }

    // 2. VALIDACIÓN: Obtener datos de la cama y el paciente a internar
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

    // 3. VALIDACIÓN: Cama libre e higienizada
    if (camaSeleccionada.estado !== 'libre' || camaSeleccionada.higienizada !== 1) {
      await connection.rollback();
      req.flash('error', 'La cama seleccionada no está libre o no está higienizada.');
      return res.redirect(`/internaciones/seleccionar-cama/${pacienteId}`);
    }

    // 4. VALIDACIÓN: Sexo en habitaciones compartidas
    if (camaSeleccionada.capacidad > 1) { // Si es una habitación de más de una cama
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

    // --- Inserción de la internación principal ---
    // Construye la query de inserción dinámicamente para la tabla 'internaciones'
    // que ahora contendrá todos los campos de los sub-formularios.
    const internacionFields = [
      'id_paciente', 'tipo_ingreso', 'id_cama', 'fecha_ingreso', 'fecha_egreso',
      'semanas_gestacion', 'antecedentes_medicos', 'grupo_sanguineo', 'factor_rh', 'resultados_estudios',
      'nombre_obstetra', 'nombre_acompanante', 'parentesco_acompanante',
      'autorizacion_cirugia', 'historia_clinica', 'medicamentos_actuales', 'preoperatorios',
      'resultados_estudios_cirugia', 'nombre_cirujano', 'diagnostico_medico', 'tipo_intervencion_quirurgica',
      'nombre_medico_derivante', 'especialidad_medico_derivante', 'diagnostico_derivacion', 'tratamiento_inicial',
      'resultados_estudios_origen',
      'modo_llegada', 'sintomas_al_ingreso', 'signos_vitales_ingreso', 'nivel_conciencia',
      'primeras_intervenciones', 'nombre_medico_urgencias'
    ];

    // Crea un array de valores en el mismo orden que los campos
    const internacionValues = internacionFields.map(field => {
      // Maneja específicamente los campos que son arrays y deben ser JSON strings
      if (['antecedentes_medicos', 'primeras_intervenciones'].includes(field)) {
        return internacionCompleta[field] || '[]'; // Asegura un array vacío como string si no hay datos
      }
      // Asegura que los valores sean null si son undefined, para evitar errores en la DB
      return internacionCompleta[field] === undefined ? null : internacionCompleta[field];
    });

    const placeholders = internacionFields.map(() => '?').join(', ');
    const query = `INSERT INTO internaciones (${internacionFields.join(', ')}) VALUES (${placeholders})`;

    const [result] = await connection.execute(query, internacionValues);
    const nuevaInternacionId = result.insertId;


    // 6. Actualizar el estado de la cama a 'ocupada' y asignar id_paciente_actual
    await connection.execute(
      'UPDATE camas SET estado = ?, id_paciente_actual = ? WHERE id = ?',
      ['ocupada', pacienteId, id_cama]
    );

    await connection.commit(); // Confirmar la transacción
    req.session.internacionPreliminar = null; // Limpiar datos preliminares de la sesión

    req.flash('success', 'Internación registrada con éxito!');
    res.redirect(`/pacientes/editar/${pacienteId}`); // Redirige al perfil del paciente o donde desees

  } catch (error) {
    if (connection) {
      await connection.rollback(); // Deshacer la transacción en caso de error
    }
    console.error('Error al procesar la internación:', error);
    req.flash('error', 'Error interno del servidor al procesar la internación.');
    res.redirect(`/internaciones/seleccionar-cama/${pacienteId}`); // Redirige de vuelta al paso 2
  } finally {
    if (connection) {
      connection.release(); // Liberar la conexión
    }
  }
});


module.exports = router;
