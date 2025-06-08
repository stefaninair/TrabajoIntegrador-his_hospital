const express = require('express');
const router = express.Router();

// Mostrar formulario de internación
router.get('/nueva/:pacienteId', async (req, res) => {
  const pacienteId = req.params.pacienteId;

  const [pacienteResult] = await req.db.query('SELECT * FROM pacientes WHERE id = ?', [pacienteId]);
  if (pacienteResult.length === 0) return res.send('Paciente no encontrado');

  const paciente = pacienteResult[0];

  res.render('internaciones/nueva', {
    paciente
  });
});

// Guardar internación
router.post('/nueva/:pacienteId', async (req, res) => {
  const pacienteId = req.params.pacienteId;
  const {
    motivo,
    // Maternidad
    semanas_gestacion,
    antecedentes_medicos,
    grupo_sanguineo,
    factor_rh,
    resultados_estudios,
    nombre_obstetra,
    nombre_acompanante,
    parentesco_acompanante,
    // Cirugía
    autorizacion_cirugia,
    historia_clinica,
    medicamentos_actuales,
    preoperatorios,
    resultados_estudios_cirugia,
    nombre_cirujano,
    diagnostico_medico,
    tipo_intervencion_quirurgica,
    // Derivación
    nombre_medico_derivante,
    especialidad_medico_derivante,
    diagnostico_derivacion,
    tratamiento_inicial,
    resultados_estudios_origen,
    // Urgencia
    modo_llegada,
    sintomas_al_ingreso,
    signos_vitales_ingreso,
    nivel_conciencia,
    primeras_intervenciones,
    nombre_medico_urgencias
  } = req.body;

  const [internacionResult] = await req.db.query(
    'INSERT INTO internaciones (id_paciente, tipo_ingreso) VALUES (?, ?)',
    [pacienteId, motivo]
  );

  const id_internacion = internacionResult.insertId;

  if (motivo === 'maternidad') {
    await req.db.query(`
      INSERT INTO internaciones_maternidad (id_internacion, semanas_gestacion, antecedentes_medicos, grupo_sanguineo, factor_rh, resultados_estudios, nombre_obstetra, nombre_acompanante, parentesco_acompanante)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id_internacion, semanas_gestacion, antecedentes_medicos, grupo_sanguineo, factor_rh, resultados_estudios, nombre_obstetra, nombre_acompanante, parentesco_acompanante]);
  }

  if (motivo === 'cirugia') {
    await req.db.query(`
      INSERT INTO internaciones_cirugia (id_internacion, autorizacion_cirugia, historia_clinica, medicamentos_actuales, preoperatorios, resultados_estudios, nombre_cirujano, diagnostico_medico, tipo_intervencion_quirurgica)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id_internacion, autorizacion_cirugia, historia_clinica, medicamentos_actuales, preoperatorios, resultados_estudios_cirugia, nombre_cirujano, diagnostico_medico, tipo_intervencion_quirurgica]);
  }

  if (motivo === 'derivacion') {
    await req.db.query(`
      INSERT INTO internaciones_derivacion (id_internacion, nombre_medico_derivante, especialidad_medico_derivante, diagnostico_derivacion, tratamiento_inicial, resultados_estudios_origen)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id_internacion, nombre_medico_derivante, especialidad_medico_derivante, diagnostico_derivacion, tratamiento_inicial, resultados_estudios_origen]);
  }

  if (motivo === 'urgencia') {
    await req.db.query(`
      INSERT INTO internaciones_urgencia (id_internacion, modo_llegada, sintomas_al_ingreso, signos_vitales_ingreso, nivel_conciencia, primeras_intervenciones, nombre_medico_urgencias)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id_internacion, modo_llegada, sintomas_al_ingreso, signos_vitales_ingreso, nivel_conciencia, primeras_intervenciones, nombre_medico_urgencias]);
  }

  res.redirect('/pacientes');
});

module.exports = router;
