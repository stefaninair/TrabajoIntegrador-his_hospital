const express = require('express');
const router = express.Router();


// --- Ruta principal para buscar pacientes por DNI ---
router.get('/', async (req, res) => {
  const [pacientes] = await req.db.query(`
    SELECT pacientes.*, seguros_medicos.nombre AS nombre_seguro
    FROM pacientes
    LEFT JOIN seguros_medicos ON pacientes.id_seguro = seguros_medicos.id
  `);
  res.render('pacientes/listado', { pacientes });
});


// Mostrar todos los pacientes
router.get('/', async (req, res) => {
  const [pacientes] = await req.db.query(`
    SELECT pacientes.*, seguros_medicos.nombre AS nombre_seguro
    FROM pacientes
    LEFT JOIN seguros_medicos ON pacientes.id_seguro = seguros_medicos.id
  `);
  res.render('pacientes/listado', { pacientes });
});

// Formulario para agregar paciente
router.get('/nuevo', async (req, res) => {
  const [seguros] = await req.db.query('SELECT * FROM seguros_medicos');
  res.render('pacientes/nuevo', { seguros });
});

// Guardar nuevo paciente
// Guardar nuevo paciente
router.post('/nuevo', async (req, res) => {
  const { nombre, apellido, dni, fecha_nacimiento, sexo, direccion, telefono, id_seguro, nro_afiliado } = req.body;
  await req.db.query(
    `INSERT INTO pacientes (nombre, apellido, dni, fecha_nacimiento, sexo, direccion, telefono, id_seguro, nro_afiliado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [nombre, apellido, dni, fecha_nacimiento, sexo, direccion, telefono, id_seguro, nro_afiliado]
  );
  res.redirect('/pacientes');
});

// Mostrar formulario para editar paciente
router.get('/editar/:id', async (req, res) => {
  const id = req.params.id;
  const [pacienteResult] = await req.db.query('SELECT * FROM pacientes WHERE id = ?', [id]);
  const [seguros] = await req.db.query('SELECT * FROM seguros_medicos');

  if (pacienteResult.length === 0) {
    return res.send('Paciente no encontrado');
  }

  res.render('pacientes/editar', {
    paciente: pacienteResult[0],
    seguros
  });
});

// Guardar cambios del paciente editado
router.post('/editar/:id', async (req, res) => {
  const id = req.params.id;
  const { nombre, apellido, dni, fecha_nacimiento, sexo, direccion, telefono, id_seguro, nro_afiliado } = req.body;

  await req.db.query(
    `UPDATE pacientes SET nombre=?, apellido=?, dni=?, fecha_nacimiento=?, sexo=?, direccion=?, telefono=?, id_seguro=?, nro_afiliado=? WHERE id=?`,
    [nombre, apellido, dni, fecha_nacimiento, sexo, direccion, telefono, id_seguro, nro_afiliado, id]
  );

  res.redirect('/pacientes');
});

// Ruta para eliminar un paciente
router.post('/eliminar/:id', async (req, res) => {
  const id = req.params.id;
  await req.db.query('DELETE FROM pacientes WHERE id = ?', [id]);
  res.redirect('/pacientes');
});


module.exports = router;

