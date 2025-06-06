const express = require('express');
const router = express.Router();

// Mostrar formulario de internación
router.get('/nueva/:pacienteId', async (req, res) => {
  const pacienteId = req.params.pacienteId;

  // Obtener datos del paciente
  const [pacienteResult] = await req.db.query('SELECT * FROM pacientes WHERE id = ?', [pacienteId]);
  if (pacienteResult.length === 0) return res.send('Paciente no encontrado');

  const paciente = pacienteResult[0];

  // Obtener habitaciones disponibles (por ahora todas, después filtramos por ala y condiciones)
  const [habitaciones] = await req.db.query(`
    SELECT * FROM habitaciones 
    WHERE estado = 'Disponible' AND higienizada = 1
  `);

  res.render('internaciones/nueva', {
    paciente,
    habitaciones
  });
});

// Guardar internación
router.post('/nueva/:id', async (req, res) => {
  const id_paciente = req.params.id;
  const { motivo, preoperatorios, autorizaciones, documentacion, id_habitacion } = req.body;

  // TODO: Acá podrías agregar más validaciones si lo deseas

  // Registrar la internación
  await req.db.query(`
    INSERT INTO internaciones (id_paciente, motivo, preoperatorios, autorizaciones, documentacion, id_habitacion)
    VALUES (?, ?, ?, ?, ?, ?)`,
    [id_paciente, motivo, preoperatorios || null, autorizaciones || null, documentacion || null, id_habitacion]);

  // Cambiar estado de la habitación
  await req.db.query(`UPDATE habitaciones SET estado = 'Ocupada' WHERE id = ?`, [id_habitacion]);

  res.redirect('/pacientes');
});

module.exports = router;
