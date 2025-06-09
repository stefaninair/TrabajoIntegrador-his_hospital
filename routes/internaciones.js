const express = require('express');
const router = express.Router();

// Mostrar formulario de internación
router.get('/nueva/:id_paciente', async (req, res) => {
  const { id_paciente } = req.params;

  try {
    const [pacienteResult] = await req.db.query('SELECT * FROM pacientes WHERE id = ?', [id_paciente]);
    const paciente = pacienteResult[0];
    if (!paciente) return res.status(404).send('Paciente no encontrado');

    res.render('internaciones/nueva', { paciente });
  } catch (error) {
    console.error(error);
    res.render('error', { error });
  }
});

// Guardar internación
router.post('/nueva/:id_paciente', async (req, res) => {
  const { id_paciente } = req.params;
  const {
    motivo,
    // Comunes
    // Maternidad
    semanas_gestacion, antecedentes_medicos, grupo_sanguineo, factor_rh,
    resultados_estudios, nombre_obstetra, nombre_acompanante, parentesco_acompanante,
    // Cirugía
    autorizacion_cirugia, historia_clinica, medicamentos_actuales,
    preoperatorios, resultados_estudios_cirugia, nombre_cirujano, diagnostico_medico, tipo_intervencion_quirurgica,
    // Derivación
    nombre_medico_derivante, especialidad_medico_derivante,
    diagnostico_derivacion, tratamiento_inicial, resultados_estudios_origen,
    // Urgencia
    modo_llegada, sintomas_al_ingreso, signos_vitales_ingreso,
    nivel_conciencia, primeras_intervenciones, nombre_medico_urgencias,
  } = req.body;

  const fechaIngreso = new Date();

  try {
    // Verificar si ya está internado
    const [yaInternado] = await req.db.query(`
      SELECT * FROM internaciones
      WHERE id_paciente = ? AND fecha_egreso IS NULL
    `, [id_paciente]);

    if (yaInternado.length > 0) {
      return res.send('El paciente ya se encuentra internado.');
    }

    // Insertar internación
    const [resultado] = await req.db.query(`
      INSERT INTO internaciones (id_paciente, tipo_ingreso, id_cama, fecha_ingreso, fecha_egreso)
      VALUES (?, ?, ?, ?, ?)
    `, [id_paciente, motivo, null, fechaIngreso, null]);

    const id_internacion = resultado.insertId;

    // Insertar en tabla correspondiente
    if (motivo === 'maternidad') {
      await req.db.query(`
        INSERT INTO internaciones_maternidad (
          id_internacion, semanas_gestacion, antecedentes_medicos,
          grupo_sanguineo, factor_rh, resultados_estudios, nombre_obstetra,
          nombre_acompanante, parentesco_acompanante
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id_internacion,
        semanas_gestacion,
        antecedentes_medicos,
        grupo_sanguineo,
        factor_rh,
        resultados_estudios,
        nombre_obstetra,
        nombre_acompanante,
        parentesco_acompanante
      ]);
    }

    if (motivo === 'cirugia') {
      await req.db.query(`
        INSERT INTO internaciones_cirugia (
          id_internacion, autorizacion_cirugia, historia_clinica,
          medicamentos_actuales, preoperatorios, resultados_estudios,
          nombre_cirujano, diagnostico_medico, tipo_intervencion_quirurgica
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id_internacion,
        autorizacion_cirugia,
        historia_clinica,
        medicamentos_actuales,
        preoperatorios,
        resultados_estudios_cirugia,
        nombre_cirujano,
        diagnostico_medico,
        tipo_intervencion_quirurgica
      ]);
    }

    if (motivo === 'derivacion') {
      await req.db.query(`
        INSERT INTO internaciones_derivacion (
          id_internacion, nombre_medico_derivante, especialidad_medico_derivante,
          diagnostico_derivacion, tratamiento_inicial, resultados_estudios_origen
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        id_internacion,
        nombre_medico_derivante,
        especialidad_medico_derivante,
        diagnostico_derivacion,
        tratamiento_inicial,
        resultados_estudios_origen
      ]);
    }

    if (motivo === 'urgencia') {
      await req.db.query(`
        INSERT INTO internaciones_urgencia (
          id_internacion, modo_llegada, sintomas_al_ingreso,
          signos_vitales_ingreso, estado_conciencia, primeras_intervenciones,
          nombre_medico_urgencias
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        id_internacion,
        modo_llegada,
        sintomas_al_ingreso,
        signos_vitales_ingreso,
        nivel_conciencia,
        primeras_intervenciones,
        nombre_medico_urgencias
      ]);
    }

    // Redirigir a selección de cama
    res.redirect(`/internaciones/seleccionar-cama/${id_internacion}`);
  } catch (error) {
    console.error(error);
    res.render('error', { error });
  }
});


// Vista para seleccionar cama
router.get('/seleccionar-cama/:id_internacion', async (req, res) => {
  const idInternacion = req.params.id_internacion;

  // Obtener la internación
  const [[internacion]] = await req.db.query('SELECT * FROM internaciones WHERE id = ?', [idInternacion]);
  console.log()
  if (!internacion) return res.status(404).send('Internación no encontrada');

  // Definir ala según tipo de ingreso
  let ala = '';

  if (internacion.tipo_ingreso === 'Cirugia') ala = 'Quirófano';
  else if (internacion.tipo_ingreso === 'Maternidad') ala = 'Sala Normal';
  else if (internacion.tipo_ingreso === 'Derivación') ala = 'Sala Normal';
  else if (internacion.tipo_ingreso === 'Emergencia') ala = 'Terapia Intensiva';


  // Obtener camas disponibles con JOIN al sexo del paciente (si está ocupada)
  const [camas] = await req.db.query(`
    SELECT c.id AS id_cama, c.numero_cama, c.estado, c.higienizada,
           h.numero_habitacion, p.sexo AS sexo_ocupante
    FROM camas c
    JOIN habitaciones h ON c.id_habitacion = h.id
    LEFT JOIN asignacion_cama ac ON ac.id_cama = c.id
    LEFT JOIN internaciones i ON ac.id_internacion = i.id
    LEFT JOIN pacientes p ON i.id_paciente = p.id
    WHERE h.id_ala = (
      SELECT id FROM alas WHERE nombre = ?
    )
  `, [ala]);

  res.render('internaciones/seleccionar_cama', {
    internacion,
    camas,
    ala
  });
});


// POST para asignar cama
router.post('/asignar-cama', async (req, res) => {
  const { id_internacion, id_cama } = req.body;

  // Registrar asignación
  await req.db.query('INSERT INTO asignacion_cama (id_internacion, id_cama, fecha_asignacion) VALUES (?, ?, NOW())', [id_internacion, id_cama]);

  // Actualizar cama como ocupada
  await req.db.query('UPDATE camas SET estado = "ocupada" WHERE id = ?', [id_cama]);

  res.redirect(`/internaciones/comprobante/${id_internacion}`);
});

module.exports = router;
