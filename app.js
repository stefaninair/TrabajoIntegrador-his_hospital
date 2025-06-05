require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Configuración de vistas
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Conexión MySQL
app.use(async (req, res, next) => {
    try {
        req.db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });
        next();
    } catch (err) {
        next(err);
    }
});

// Rutas
const indexRouter = require('./routes/index');
app.use('/', indexRouter);

const pacientesRouter = require('./routes/pacientes');
app.use('/pacientes', pacientesRouter);

const internacionesRouter = require('./routes/internaciones');
app.use('/internaciones', internacionesRouter);

// Iniciar servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
