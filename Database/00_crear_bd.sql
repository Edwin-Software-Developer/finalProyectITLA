-- 1) Crea la base de datos vacía.
-- 2) Luego ejecuta ../Diagrama.sql con la base ControlStock seleccionada
--    (en SSMS: lista desplegable de base de datos, o agrega "USE ControlStock; GO" arriba).
-- 3) Por último ejecuta 02_datos_prueba.sql.

IF DB_ID(N'ControlStock') IS NULL
    CREATE DATABASE ControlStock;
GO
