require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();

// Puerto
const port = process.env.PORT || 3000;

// Motor de vistas (Pug)
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Archivos estáticos y middleware para formularios
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Middleware para conexión a la base de datos
const dbMiddleware = require('./db');
app.use(dbMiddleware);

// Rutas
const indexRouter = require('./routes/index');
app.use('/', indexRouter);
const pacientesRouter = require('./routes/pacientes');
app.use('/pacientes', pacientesRouter);
const internacionesRouter = require('./routes/internaciones');
app.use('/internaciones', internacionesRouter);




// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error('Error detectado:', err);
  res.status(500).render('error', { error: err.message || 'Error interno del servidor' });
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`🩺 Servidor corriendo en http://localhost:${port}`);
});
