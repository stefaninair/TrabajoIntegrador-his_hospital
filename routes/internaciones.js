const express = require('express');
const router = express.Router();

// Mostrar formulario de internación
router.get('/nueva/:pacienteId', async (req, res) => {
  const pacienteId = req.params.pacienteId;
  const [pacienteResult] = await req.db.query('SELECT * FROM pacientes WHERE id = ?', [pacienteId]);

  if (pacienteResult.length === 0) return res.send('Paciente no encontrado');

  res.render('internaciones/nueva', {
    paciente: pacienteResult[0]
  });
});

module.exports = router;
