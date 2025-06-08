const express = require('express');
const router = express.Router();

// Formulario para editar paciente
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

// Mostrar todos los pacientes
router.get('/', async (req, res, next) => {
  try {
    const [pacientes] = await req.db.query(`
      SELECT pacientes.*, 
             CONCAT(pacientes.apellido, ', ', pacientes.nombre) AS nombre_completo,
             seguros_medicos.nombre AS nombre_seguro
      FROM pacientes
      LEFT JOIN seguros_medicos ON pacientes.id_seguro = seguros_medicos.id
    `);
    res.render('pacientes/listado', { pacientes });
  } catch (err) {
    next(err);
  }
});

// Formulario para agregar paciente
router.get('/nuevo', async (req, res, next) => {
  try {
    const [seguros] = await req.db.query('SELECT * FROM seguros_medicos');
    res.render('pacientes/nuevo', { seguros });
  } catch (err) {
    next(err);
  }
});

// Guardar nuevo paciente
router.post('/nuevo', async (req, res, next) => {
  const {
    nombre,
    apellido,
    dni,
    fecha_nacimiento,
    sexo,
    direccion,
    telefono,
    correo,
    id_seguro,
    nro_afiliado
  } = req.body;

  const errores = {};

  if (!nombre || nombre.trim() === "") errores.nombre = "El nombre es obligatorio.";
  if (!apellido || apellido.trim() === "") errores.apellido = "El apellido es obligatorio.";

  if (!dni) errores.dni = "El DNI es obligatorio.";
  else if (!/^\d{7,9}$/.test(dni)) errores.dni = "El DNI debe tener entre 7 y 9 dígitos numéricos.";

  if (correo && !/^[\w.-]+@[\w.-]+\.\w{2,}$/.test(correo)) {
    errores.correo = "El correo no es válido.";
  }

  if (!fecha_nacimiento) errores.fecha_nacimiento = "La fecha de nacimiento es obligatoria.";
  else if (isNaN(Date.parse(fecha_nacimiento))) {
    errores.fecha_nacimiento = "La fecha ingresada no es válida.";
  }

  if (!sexo || !['M', 'F'].includes(sexo)) errores.sexo = "Debe seleccionar un género válido.";

  if (!id_seguro || isNaN(id_seguro)) errores.id_seguro = "Debe seleccionar un seguro médico válido.";

  if (telefono && !/^\d{6,15}$/.test(telefono)) {
    errores.telefono = "El teléfono debe tener entre 6 y 15 dígitos.";
  }

  if (nro_afiliado && nro_afiliado.length > 20) {
    errores.nro_afiliado = "El número de afiliado es demasiado largo.";
  }

  if (Object.keys(errores).length > 0) {
    try {
      const [seguros] = await req.db.query('SELECT * FROM seguros_medicos');
      return res.render('pacientes/nuevo', {
        seguros,
        errores,
        nombre, apellido, dni, fecha_nacimiento, sexo,
        direccion, telefono, correo, id_seguro, nro_afiliado
      });
    } catch (err) {
      next(err);
    }
  }

  try {
    await req.db.query(
      `INSERT INTO pacientes (nombre, apellido, dni, fecha_nacimiento, sexo, direccion, telefono, correo, id_seguro, nro_afiliado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, apellido, dni, fecha_nacimiento, sexo, direccion, telefono, correo, id_seguro, nro_afiliado]
    );
    res.redirect('/pacientes');
  } catch (err) {
    next(err);
  }
});

// Guardar cambios del paciente (Ruta POST ÚNICA)
router.post('/editar/:id', async (req, res, next) => {
  const pacienteId = req.params.id;
  const {
    nombre,
    apellido,
    dni,
    fecha_nacimiento,
    sexo,
    direccion,
    telefono,
    correo,
    id_seguro,
    nro_afiliado
  } = req.body;

  const errores = [];

  if (!nombre || !apellido || !dni || !fecha_nacimiento || !sexo) {
    errores.push("Faltan campos obligatorios: Nombre, Apellido, DNI, Fecha de Nacimiento, Sexo.");
  }

  if (dni && !/^\d+$/.test(dni)) {
    errores.push("El DNI debe contener solo números.");
  }

  if (correo && !/^[\w.-]+@[\w.-]+\.\w{2,}$/.test(correo)) {
    errores.push("Correo electrónico inválido.");
  }

  if (errores.length > 0) {
    try {
      const [seguros] = await req.db.query('SELECT * FROM seguros_medicos');
      return res.render('pacientes/editar', {
        paciente: {
          id: pacienteId, nombre, apellido, dni, fecha_nacimiento, sexo,
          direccion, telefono, correo, id_seguro, nro_afiliado
        },
        seguros,
        errores,
        mensajeExito: null
      });
    } catch (err) {
      return next(err);
    }
  }

  try {
    await req.db.execute(
      `UPDATE pacientes SET nombre = ?, apellido = ?, dni = ?, fecha_nacimiento = ?, sexo = ?, direccion = ?, telefono = ?, correo = ?, id_seguro = ?, nro_afiliado = ? WHERE id = ?`,
      [nombre, apellido, dni, fecha_nacimiento, sexo, direccion, telefono, correo || null, id_seguro || null, nro_afiliado || null, pacienteId]
    );

    const [pacientesActualizados] = await req.db.execute('SELECT * FROM pacientes WHERE id = ?', [pacienteId]);
    const pacienteActualizado = pacientesActualizados[0];
    const [seguros] = await req.db.execute('SELECT id, nombre FROM seguros_medicos');

    res.render('pacientes/editar', {
      paciente: pacienteActualizado,
      seguros,
      mensajeExito: 'Datos guardados con éxito.',
      errores: null
    });
  } catch (err) {
    next(err);
  }
});

// Eliminar paciente
router.post('/eliminar/:id', async (req, res, next) => {
  const id = req.params.id;
  try {
    await req.db.query('DELETE FROM pacientes WHERE id = ?', [id]);
    res.redirect('/pacientes');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
