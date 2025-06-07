const express = require('express');
const router = express.Router();

// Mostrar formulario de internación
router.get('/nueva/:pacienteId', async (req, res) => {
  const pacienteId = req.params.pacienteId;

  // Obtener datos del paciente
  const [pacienteResult] = await req.db.query('SELECT * FROM pacientes WHERE id = ?', [pacienteId]);
  if (pacienteResult.length === 0) return res.send('Paciente no encontrado');

  const paciente = pacienteResult[0];

  // Obtener camas disponibles (higienizadas y libres)
  const [camas] = await req.db.query(`
    SELECT camas.id, camas.numero_cama, habitaciones.numero_habitacion AS numero_habitacion
    FROM camas
    JOIN habitaciones ON camas.id_habitacion = habitaciones.id
    WHERE camas.estado = 'libre' AND camas.higienizada = 1
  `);

  res.render('internaciones/nueva', {
    paciente,
    camas
  });
});

// Guardar internación
router.post('/nueva/:id', async (req, res) => {
  const id_paciente = req.params.id;
  const { motivo, preoperatorios, autorizaciones, documentacion, id_cama } = req.body;

  // Registrar la internación
  await req.db.query(`
    INSERT INTO internaciones (id_paciente, motivo, preoperatorios, autorizaciones, documentacion, id_cama)
    VALUES (?, ?, ?, ?, ?, ?)`,
    [id_paciente, motivo, preoperatorios || null, autorizaciones || null, documentacion || null, id_cama]);

  // Cambiar estado de la cama a ocupada
  await req.db.query(`UPDATE camas SET estado = 'ocupada' WHERE id = ?`, [id_cama]);

  res.redirect('/pacientes');
});

module.exports = router;
