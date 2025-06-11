require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const session = require('express-session');
const flash = require('connect-flash');
const pool = require('./db');

// Puerto
const port = process.env.PORT || 3000;

// Motor de vistas (Pug)
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Archivos estáticos y middleware para formularios
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Configuración de Sesión y Flash
app.use(session({
    secret: 'TuSuperSecretoParaSesionesSeguras',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 600000 }
}));
app.use(flash());

// Middleware para adjuntar la conexión a la base de datos al objeto 'req'
app.use((req, res, next) => {
    req.db = pool;
    next();
});


// Rutas
const indexRouter = require('./routes/index');
app.use('/', indexRouter);

const pacientesRouter = require('./routes/pacientes');
// 1. Montar para las rutas de VISTAS (listado, nuevo, editar)
// Esto hará que router.get('/') sea /pacientes/, router.get('/nuevo') sea /pacientes/nuevo, etc.
app.use('/pacientes', pacientesRouter);

// 2. Montar para la ruta de la API del buscador
// Esto hará que router.get('/buscar') se convierta en /api/pacientes/buscar
// ¡ESTA ES LA LÍNEA CRUCIAL PARA EL BUSCADOR!
app.use('/api/pacientes', pacientesRouter); // <--- ¡Asegúrate de que esta línea esté presente!

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