README del Proyecto de Gestión de Pacientes

Este documento es una guía para entender y ejecutar el proyecto de gestión de pacientes, desarrollado con Node.js, Express, PUG y MySQL. El objetivo principal es proporcionar una interfaz sencilla para buscar, añadir, editar y eliminar registros de pacientes, centrándose en una funcionalidad de búsqueda eficiente por DNI.

Características Principales

Búsqueda de Pacientes por DNI: Permite a los usuarios buscar pacientes de forma precisa utilizando su número de DNI o nombre,apellido. Si un paciente no es encontrado, se muestra un mensaje claro, luego podemos generar la internacion del paciente respetando las restricciones propuestas de las camas, tiene validaciones y mucho más.

Gestión CRUD de Pacientes:

Crear: Añadir nuevos registros de pacientes con detalles como nombre, apellido, DNI, fecha de nacimiento, sexo, dirección, teléfono y seguro médico.

Leer (Listar): Visualizar una lista de pacientes, con la opción de mostrar todos o solo los resultados de la búsqueda por DNI.

Actualizar: Modificar la información de pacientes existentes.

Eliminar: Borrar registros de pacientes de la base de datos.

Interfaz de Usuario Amigable: Desarrollada con PUG y estilizada con Bootstrap 5 para una experiencia de usuario moderna y responsiva.

Conexión a Base de Datos MySQL: Utiliza una base de datos MySQL para el almacenamiento persistente de los datos de los pacientes y seguros médicos, internaciones.

Tecnologías Utilizadas
Backend:

Node.js: Entorno de ejecución para JavaScript del lado del servidor.

Express.js: Framework web para Node.js, utilizado para construir la API y manejar las rutas.

MySQL2: Cliente MySQL para Node.js, para interactuar con la base de datos.

Frontend:

PUG: Motor de plantillas para Node.js, que facilita la escritura de HTML.

Bootstrap 5.3.3: Framework de CSS para el diseño responsivo y los componentes de la interfaz de usuario.

Popper.js: Dependencia de Bootstrap para funcionalidades de popovers y tooltips.

Base de Datos:

MySQL: Sistema de gestión de bases de datos relacionales.

Requisitos del Sistema

Antes de comenzar, asegúrate de tener instalado lo siguiente:

Node.js y npm

MySQL Server

Gestor de Base de Datos: Herramientas como MySQL Workbench, DBeaver o phpMyAdmin pueden facilitar la gestión de tu base de datos.

Configuración del Proyecto

Sigue estos pasos para configurar y ejecutar el proyecto en tu entorno local:

1. Clonar el Repositorio
(https://github.com/stefaninair/TrabajoIntegrador-his_hospital.git)


2. Instalar Dependencias

Navega hasta la raíz de tu proyecto en la terminal y ejecuta:

npm install
Esto instalará Express, PUG, MySQL2, Bootstrap y Popper.js.

3. Configuración de la Base de Datos

Mi archivo .env es el siguiente:

DB_HOST=localhost

DB_USER=root

DB_PASS=

DB_NAME=his_hospital

PORT=3000


4. Ejecutar la Aplicación
Desde la raíz de tu proyecto en la terminal, ejecuta:

Bash

node app.js

La aplicación debería iniciarse, normalmente en http://localhost:3000 

Uso

Abre tu navegador y ve a http://localhost:3000/pacientes.

