-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 18-06-2025 a las 03:12:51
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `his_hospital`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `alas`
--

CREATE TABLE `alas` (
  `id` int(11) NOT NULL,
  `nombre` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `alas`
--

INSERT INTO `alas` (`id`, `nombre`) VALUES
(1, 'Sala Normal'),
(2, 'Sala Intermedia'),
(3, 'Terapia Intensiva');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `asignacion_cama`
--

CREATE TABLE `asignacion_cama` (
  `id` int(11) NOT NULL,
  `id_internacion` int(11) NOT NULL,
  `id_cama` int(11) NOT NULL,
  `fecha_asignacion` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `camas`
--

CREATE TABLE `camas` (
  `id` int(11) NOT NULL,
  `numero_cama` varchar(10) NOT NULL,
  `id_habitacion` int(11) NOT NULL,
  `estado` enum('libre','ocupada') DEFAULT 'libre',
  `higienizada` tinyint(1) NOT NULL DEFAULT 1,
  `id_paciente_actual` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `camas`
--

INSERT INTO `camas` (`id`, `numero_cama`, `id_habitacion`, `estado`, `higienizada`, `id_paciente_actual`) VALUES
(1, 'H1-C1', 1, 'ocupada', 1, 14),
(2, 'H1-C2', 1, 'libre', 1, NULL),
(3, 'H2-C1', 2, 'ocupada', 1, 25),
(4, 'H2-C2', 2, 'libre', 1, NULL),
(5, 'H3-C1', 3, 'libre', 0, NULL),
(6, 'H3-C2', 3, 'libre', 1, NULL),
(7, 'H4-C1', 4, 'libre', 1, NULL),
(8, 'H4-C2', 4, 'libre', 1, NULL),
(9, 'H5-C1', 5, 'libre', 1, NULL),
(10, 'H6-C1', 6, 'libre', 1, NULL),
(11, 'H7-C1', 7, 'libre', 1, NULL),
(12, 'H8-C1', 8, 'libre', 1, NULL),
(13, 'H9-C1', 9, 'libre', 1, NULL),
(14, 'H10-C1', 10, 'libre', 1, NULL),
(15, 'H11-C1', 11, 'libre', 1, NULL),
(16, 'H12-C1', 12, 'libre', 1, NULL),
(17, 'H13-C1', 13, 'libre', 1, NULL),
(18, 'H14-C1', 14, 'libre', 1, NULL),
(19, 'H9-C2', 9, 'libre', 1, NULL),
(20, 'H10-C2', 10, 'libre', 1, NULL),
(21, 'H14-C2', 14, 'libre', 1, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `emergencias`
--

CREATE TABLE `emergencias` (
  `id` int(11) NOT NULL,
  `id_paciente_temp` int(11) DEFAULT NULL,
  `dni_ingresado` varchar(20) DEFAULT NULL,
  `nombre_temp` varchar(100) DEFAULT NULL,
  `apellido_temp` varchar(100) DEFAULT NULL,
  `es_anonimo` tinyint(1) DEFAULT 0,
  `sexo` varchar(20) NOT NULL,
  `contextura_fisica` varchar(50) DEFAULT NULL,
  `motivo_emergencia` text NOT NULL,
  `id_sala_emergencia` int(11) DEFAULT NULL,
  `fecha_hora_ingreso` datetime DEFAULT current_timestamp(),
  `observaciones_iniciales` text DEFAULT NULL,
  `estado_emergencia` varchar(50) NOT NULL DEFAULT 'En Atención'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `emergencias`
--

INSERT INTO `emergencias` (`id`, `id_paciente_temp`, `dni_ingresado`, `nombre_temp`, `apellido_temp`, `es_anonimo`, `sexo`, `contextura_fisica`, `motivo_emergencia`, `id_sala_emergencia`, `fecha_hora_ingreso`, `observaciones_iniciales`, `estado_emergencia`) VALUES
(1, 40, NULL, 'Paciente Anónimo', 'Desconocido', 1, 'M', 'Delgado', 'Accidente en moto', 3, '2025-06-17 01:46:34', NULL, 'En Atención'),
(2, 41, NULL, 'Paciente Anónimo', 'Desconocido', 1, 'F', 'Delgado', 'Persona mayor con fractura de cadera', 2, '2025-06-17 01:56:54', NULL, 'En Atención');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `especialidades`
--

CREATE TABLE `especialidades` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `especialidades`
--

INSERT INTO `especialidades` (`id`, `nombre`, `descripcion`) VALUES
(1, 'Cardiología', NULL),
(2, 'Dermatología', NULL),
(3, 'Pediatría', NULL),
(4, 'Clínica Médica', NULL),
(5, 'Traumatología', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `habitaciones`
--

CREATE TABLE `habitaciones` (
  `id` int(11) NOT NULL,
  `numero_habita` varchar(10) NOT NULL,
  `id_ala` int(11) NOT NULL,
  `capacidad` int(11) NOT NULL CHECK (`capacidad` in (1,2))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `habitaciones`
--

INSERT INTO `habitaciones` (`id`, `numero_habita`, `id_ala`, `capacidad`) VALUES
(1, '1 Normal', 1, 2),
(2, '2 Normal', 1, 2),
(3, '3 Normal', 1, 2),
(4, '4 Normal', 1, 2),
(5, '5 Normal', 1, 1),
(6, '6 Normal', 1, 1),
(7, '7 Normal', 1, 1),
(8, '8 Normal', 1, 1),
(9, '9 Cirugia', 2, 2),
(10, '10 Cirugia', 2, 2),
(11, '11 Cirugia', 2, 1),
(12, '12 Cirugia', 2, 1),
(13, '13 Terapia', 3, 1),
(14, '14 Terapia', 3, 2);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `internaciones`
--

CREATE TABLE `internaciones` (
  `id` int(11) NOT NULL,
  `id_paciente` int(11) DEFAULT NULL,
  `tipo_ingreso` enum('maternidad','cirugia','derivacion','urgencia') DEFAULT NULL,
  `id_cama` int(11) DEFAULT NULL,
  `fecha_ingreso` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_egreso` datetime DEFAULT NULL,
  `motivo_alta` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `internaciones`
--

INSERT INTO `internaciones` (`id`, `id_paciente`, `tipo_ingreso`, `id_cama`, `fecha_ingreso`, `fecha_egreso`, `motivo_alta`) VALUES
(64, 14, 'cirugia', 1, '2025-06-17 21:31:39', NULL, NULL),
(65, 25, 'maternidad', 3, '2025-06-17 21:32:40', NULL, NULL),
(66, 37, 'urgencia', 5, '2025-06-17 21:33:40', '2025-06-17 21:33:54', 'Alta Medica');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `internaciones_cirugia`
--

CREATE TABLE `internaciones_cirugia` (
  `id` int(11) NOT NULL,
  `id_internacion` int(11) NOT NULL,
  `autorizacion_cirugia` text DEFAULT NULL,
  `historia_clinica` text DEFAULT NULL,
  `medicamentos_actuales` text DEFAULT NULL,
  `preoperatorios` text DEFAULT NULL,
  `resultados_estudios_cirugia` text DEFAULT NULL,
  `nombre_cirujano` varchar(255) DEFAULT NULL,
  `diagnostico_medico` text DEFAULT NULL,
  `tipo_intervencion_quirurgica` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `internaciones_cirugia`
--

INSERT INTO `internaciones_cirugia` (`id`, `id_internacion`, `autorizacion_cirugia`, `historia_clinica`, `medicamentos_actuales`, `preoperatorios`, `resultados_estudios_cirugia`, `nombre_cirujano`, `diagnostico_medico`, `tipo_intervencion_quirurgica`) VALUES
(18, 64, 'Aprobada', 'Existente', 'Antiinflamatorios', 'Electrocardiograma, análisis, ecografía', 'Valores normales', 'Dr. Martínez', 'Apendicitis aguda', 'Ambulatoria');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `internaciones_derivacion`
--

CREATE TABLE `internaciones_derivacion` (
  `id` int(11) NOT NULL,
  `id_internacion` int(11) NOT NULL,
  `nombre_medico_derivante` varchar(255) DEFAULT NULL,
  `especialidad_medico_derivante` varchar(100) DEFAULT NULL,
  `diagnostico_derivacion` text DEFAULT NULL,
  `tratamiento_inicial` text DEFAULT NULL,
  `resultados_estudios_origen` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `internaciones_maternidad`
--

CREATE TABLE `internaciones_maternidad` (
  `id` int(11) NOT NULL,
  `id_internacion` int(11) NOT NULL,
  `semanas_gestacion` decimal(4,1) DEFAULT NULL,
  `antecedentes_medicos` text DEFAULT NULL,
  `grupo_sanguineo` varchar(5) DEFAULT NULL,
  `factor_rh` enum('Positivo','Negativo') DEFAULT NULL,
  `resultados_estudios` text DEFAULT NULL,
  `nombre_obstetra` varchar(255) DEFAULT NULL,
  `nombre_acompanante` varchar(255) DEFAULT NULL,
  `parentesco_acompanante` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `internaciones_maternidad`
--

INSERT INTO `internaciones_maternidad` (`id`, `id_internacion`, `semanas_gestacion`, `antecedentes_medicos`, `grupo_sanguineo`, `factor_rh`, `resultados_estudios`, `nombre_obstetra`, `nombre_acompanante`, `parentesco_acompanante`) VALUES
(26, 65, 12.0, 'Preeclampsia', 'B', 'Positivo', 'Valores normales', 'Dr. Gómez', 'Pablo', 'Pareja');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `internaciones_urgencia`
--

CREATE TABLE `internaciones_urgencia` (
  `id` int(11) NOT NULL,
  `id_internacion` int(11) NOT NULL,
  `modo_llegada` varchar(100) DEFAULT NULL,
  `sintomas_al_ingreso` text DEFAULT NULL,
  `signos_vitales_ingreso` text DEFAULT NULL,
  `nivel_conciencia` varchar(100) DEFAULT NULL,
  `primeras_intervenciones` text DEFAULT NULL,
  `nombre_medico_urgencias` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `internaciones_urgencia`
--

INSERT INTO `internaciones_urgencia` (`id`, `id_internacion`, `modo_llegada`, `sintomas_al_ingreso`, `signos_vitales_ingreso`, `nivel_conciencia`, `primeras_intervenciones`, `nombre_medico_urgencias`) VALUES
(13, 66, 'Ambulancia', 'Accidente en motocicleta', 'Inestables', 'Inconsciente', 'RCP', 'Dr. Santillán');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pacientes`
--

CREATE TABLE `pacientes` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) NOT NULL,
  `dni` varchar(20) NOT NULL,
  `fecha_nacimiento` date NOT NULL,
  `sexo` enum('M','F') NOT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `id_seguro` int(11) DEFAULT NULL,
  `nro_afiliado` varchar(50) DEFAULT NULL,
  `correo` varchar(255) DEFAULT NULL,
  `internado` tinyint(1) DEFAULT 0,
  `estado_atencion` varchar(50) NOT NULL DEFAULT 'Activo',
  `id_emergencia_origen` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `pacientes`
--

INSERT INTO `pacientes` (`id`, `nombre`, `apellido`, `dni`, `fecha_nacimiento`, `sexo`, `direccion`, `telefono`, `id_seguro`, `nro_afiliado`, `correo`, `internado`, `estado_atencion`, `id_emergencia_origen`) VALUES
(14, 'Pedro', 'Capo', '99999999', '1800-06-05', 'M', 'San Bernardo', '2664987654', 1, NULL, 'pedrito@gmail.com', 0, 'Activo', NULL),
(25, 'Estefania', 'Irusta', '29852258', '1996-02-20', 'F', 'Dipascuo1212', '2664121212', 5, '101010', 'tefi@gmail.com', 0, 'Activo', NULL),
(26, 'Stefani', 'Escobar', '38752519', '1995-05-28', 'F', NULL, '02664009457', 4, '123456', NULL, 0, 'Activo', NULL),
(27, 'Fulanito', 'Funes', '37777888', '2004-04-04', 'M', 'San Juan 330', '2665009128', 4, '128794', 'fula@hotmail.com', 0, 'Activo', NULL),
(28, 'Paulina', 'Corvalan', '34751987', '1990-01-06', 'F', 'Aristobulo del Valle 330', '2664199773', 6, '123456', 'pauli@gmail.com', 0, 'Activo', NULL),
(29, 'La Pochi', 'Lomas', '38999777', '1998-05-24', 'F', 'La pampa', '2665434343', 6, '987421', 'lapochi@gmail.com', 0, 'Activo', NULL),
(34, 'Aurora', 'Rosales', '99888777', '1800-08-01', 'F', 'Puente Favaloro', '2664778899', 6, '698745', 'rosi@gmial.com', 0, 'Activo', NULL),
(37, 'Faustino', 'Sarmiento', '45612321', '1900-04-02', 'M', 'La Panpa del Tamboreo', '0800222555', 5, '197824', 'faustisar@gmail.com', 0, 'Activo', NULL),
(41, 'Paciente Anónimo', 'Desconocido', 'TEMP-1750136214481-6', '0000-00-00', 'F', NULL, NULL, 1, NULL, NULL, 0, 'En Urgencia', 2);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `profesionales`
--

CREATE TABLE `profesionales` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) NOT NULL,
  `matricula` varchar(50) NOT NULL,
  `id_especialidad` int(11) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `profesionales`
--

INSERT INTO `profesionales` (`id`, `nombre`, `apellido`, `matricula`, `id_especialidad`, `telefono`, `email`, `activo`) VALUES
(1, 'Juan', 'Pérez', 'MP12345', 4, NULL, NULL, 1),
(2, 'María', 'González', 'MP67890', 1, NULL, NULL, 1),
(3, 'Carlos', 'Rodríguez', 'MP11223', 3, NULL, NULL, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles`
--

CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `nombre_rol` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `salas`
--

CREATE TABLE `salas` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `capacidad` int(11) DEFAULT 1,
  `activa` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `seguros_medicos`
--

CREATE TABLE `seguros_medicos` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `seguros_medicos`
--

INSERT INTO `seguros_medicos` (`id`, `nombre`, `telefono`, `direccion`, `activo`) VALUES
(1, 'Particular', NULL, NULL, 1),
(4, 'Dospu', '0800-123145', 'Chacabuco 830', 1),
(5, 'Dosep', '0800-456123', 'Belgrado 1234', 1),
(6, 'Union Personal', '0800-222222', 'Pringles 121', 1),
(7, 'Sancor Salud', '0800-333333', 'Rivadavia4182', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `turnos`
--

CREATE TABLE `turnos` (
  `id` int(11) NOT NULL,
  `id_paciente` int(11) NOT NULL,
  `id_profesional` int(11) DEFAULT NULL,
  `id_especialidad` int(11) DEFAULT NULL,
  `fecha_hora` datetime NOT NULL,
  `motivo` varchar(255) DEFAULT NULL,
  `estado` enum('Pendiente','Confirmado','Realizado','Cancelado','Reprogramado') NOT NULL DEFAULT 'Pendiente',
  `observaciones` text DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `turnos`
--

INSERT INTO `turnos` (`id`, `id_paciente`, `id_profesional`, `id_especialidad`, `fecha_hora`, `motivo`, `estado`, `observaciones`, `fecha_creacion`) VALUES
(1, 6, 1, 4, '2025-06-20 10:00:00', 'Control de rutina', 'Confirmado', NULL, '2025-06-17 15:21:06'),
(2, 13, 2, 1, '2025-06-21 14:30:00', 'Consulta cardiológica', 'Pendiente', NULL, '2025-06-17 15:21:06'),
(3, 25, 3, 3, '2025-06-22 09:00:00', 'Vacunación', 'Pendiente', NULL, '2025-06-17 15:21:06'),
(4, 14, 1, 4, '2025-06-25 11:00:00', 'Control anual', 'Pendiente', NULL, '2025-06-17 15:46:04');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `id_rol` int(11) NOT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `apellido` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `alas`
--
ALTER TABLE `alas`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `asignacion_cama`
--
ALTER TABLE `asignacion_cama`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_cama` (`id_cama`),
  ADD KEY `fk_id_internacion_asignacion_cama` (`id_internacion`);

--
-- Indices de la tabla `camas`
--
ALTER TABLE `camas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_habitacion` (`id_habitacion`),
  ADD KEY `fk_camas_pacientes` (`id_paciente_actual`);

--
-- Indices de la tabla `emergencias`
--
ALTER TABLE `emergencias`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_emergencias_salas` (`id_sala_emergencia`);

--
-- Indices de la tabla `especialidades`
--
ALTER TABLE `especialidades`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indices de la tabla `habitaciones`
--
ALTER TABLE `habitaciones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_ala` (`id_ala`);

--
-- Indices de la tabla `internaciones`
--
ALTER TABLE `internaciones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_paciente` (`id_paciente`),
  ADD KEY `id_cama` (`id_cama`);

--
-- Indices de la tabla `internaciones_cirugia`
--
ALTER TABLE `internaciones_cirugia`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id_internacion` (`id_internacion`);

--
-- Indices de la tabla `internaciones_derivacion`
--
ALTER TABLE `internaciones_derivacion`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id_internacion` (`id_internacion`);

--
-- Indices de la tabla `internaciones_maternidad`
--
ALTER TABLE `internaciones_maternidad`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id_internacion` (`id_internacion`);

--
-- Indices de la tabla `internaciones_urgencia`
--
ALTER TABLE `internaciones_urgencia`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id_internacion` (`id_internacion`);

--
-- Indices de la tabla `pacientes`
--
ALTER TABLE `pacientes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `dni` (`dni`),
  ADD UNIQUE KEY `uq_pacientes_dni` (`dni`),
  ADD UNIQUE KEY `unico_afiliado_por_seguro` (`id_seguro`,`nro_afiliado`),
  ADD KEY `fk_pacientes_emergencias` (`id_emergencia_origen`);

--
-- Indices de la tabla `profesionales`
--
ALTER TABLE `profesionales`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `matricula` (`matricula`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `id_especialidad` (`id_especialidad`);

--
-- Indices de la tabla `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre_rol` (`nombre_rol`);

--
-- Indices de la tabla `salas`
--
ALTER TABLE `salas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indices de la tabla `seguros_medicos`
--
ALTER TABLE `seguros_medicos`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `turnos`
--
ALTER TABLE `turnos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_paciente` (`id_paciente`),
  ADD KEY `id_profesional` (`id_profesional`),
  ADD KEY `id_especialidad` (`id_especialidad`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `id_rol` (`id_rol`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `alas`
--
ALTER TABLE `alas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `asignacion_cama`
--
ALTER TABLE `asignacion_cama`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `camas`
--
ALTER TABLE `camas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT de la tabla `emergencias`
--
ALTER TABLE `emergencias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `especialidades`
--
ALTER TABLE `especialidades`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `habitaciones`
--
ALTER TABLE `habitaciones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT de la tabla `internaciones`
--
ALTER TABLE `internaciones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=67;

--
-- AUTO_INCREMENT de la tabla `internaciones_cirugia`
--
ALTER TABLE `internaciones_cirugia`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT de la tabla `internaciones_derivacion`
--
ALTER TABLE `internaciones_derivacion`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `internaciones_maternidad`
--
ALTER TABLE `internaciones_maternidad`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT de la tabla `internaciones_urgencia`
--
ALTER TABLE `internaciones_urgencia`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT de la tabla `pacientes`
--
ALTER TABLE `pacientes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;

--
-- AUTO_INCREMENT de la tabla `profesionales`
--
ALTER TABLE `profesionales`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `salas`
--
ALTER TABLE `salas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `seguros_medicos`
--
ALTER TABLE `seguros_medicos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `turnos`
--
ALTER TABLE `turnos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `asignacion_cama`
--
ALTER TABLE `asignacion_cama`
  ADD CONSTRAINT `asignacion_cama_ibfk_2` FOREIGN KEY (`id_cama`) REFERENCES `camas` (`id`),
  ADD CONSTRAINT `fk_id_internacion_asignacion_cama` FOREIGN KEY (`id_internacion`) REFERENCES `internaciones` (`id`);

--
-- Filtros para la tabla `camas`
--
ALTER TABLE `camas`
  ADD CONSTRAINT `camas_ibfk_1` FOREIGN KEY (`id_habitacion`) REFERENCES `habitaciones` (`id`),
  ADD CONSTRAINT `fk_camas_pacientes` FOREIGN KEY (`id_paciente_actual`) REFERENCES `pacientes` (`id`);

--
-- Filtros para la tabla `emergencias`
--
ALTER TABLE `emergencias`
  ADD CONSTRAINT `fk_emergencias_salas` FOREIGN KEY (`id_sala_emergencia`) REFERENCES `salas` (`id`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `habitaciones`
--
ALTER TABLE `habitaciones`
  ADD CONSTRAINT `habitaciones_ibfk_1` FOREIGN KEY (`id_ala`) REFERENCES `alas` (`id`);

--
-- Filtros para la tabla `internaciones`
--
ALTER TABLE `internaciones`
  ADD CONSTRAINT `internaciones_ibfk_1` FOREIGN KEY (`id_paciente`) REFERENCES `pacientes` (`id`),
  ADD CONSTRAINT `internaciones_ibfk_2` FOREIGN KEY (`id_cama`) REFERENCES `camas` (`id`);

--
-- Filtros para la tabla `internaciones_cirugia`
--
ALTER TABLE `internaciones_cirugia`
  ADD CONSTRAINT `internaciones_cirugia_ibfk_1` FOREIGN KEY (`id_internacion`) REFERENCES `internaciones` (`id`);

--
-- Filtros para la tabla `internaciones_derivacion`
--
ALTER TABLE `internaciones_derivacion`
  ADD CONSTRAINT `internaciones_derivacion_ibfk_1` FOREIGN KEY (`id_internacion`) REFERENCES `internaciones` (`id`);

--
-- Filtros para la tabla `internaciones_maternidad`
--
ALTER TABLE `internaciones_maternidad`
  ADD CONSTRAINT `internaciones_maternidad_ibfk_1` FOREIGN KEY (`id_internacion`) REFERENCES `internaciones` (`id`);

--
-- Filtros para la tabla `internaciones_urgencia`
--
ALTER TABLE `internaciones_urgencia`
  ADD CONSTRAINT `internaciones_urgencia_ibfk_1` FOREIGN KEY (`id_internacion`) REFERENCES `internaciones` (`id`);

--
-- Filtros para la tabla `pacientes`
--
ALTER TABLE `pacientes`
  ADD CONSTRAINT `fk_pacientes_emergencias` FOREIGN KEY (`id_emergencia_origen`) REFERENCES `emergencias` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `pacientes_ibfk_1` FOREIGN KEY (`id_seguro`) REFERENCES `seguros_medicos` (`id`);

--
-- Filtros para la tabla `profesionales`
--
ALTER TABLE `profesionales`
  ADD CONSTRAINT `profesionales_ibfk_1` FOREIGN KEY (`id_especialidad`) REFERENCES `especialidades` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `turnos`
--
ALTER TABLE `turnos`
  ADD CONSTRAINT `turnos_ibfk_1` FOREIGN KEY (`id_paciente`) REFERENCES `pacientes` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `turnos_ibfk_2` FOREIGN KEY (`id_profesional`) REFERENCES `profesionales` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `turnos_ibfk_3` FOREIGN KEY (`id_especialidad`) REFERENCES `especialidades` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
