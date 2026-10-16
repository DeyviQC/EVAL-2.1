# Protocolo de Backup, Restauración y Recuperación ante Desastres (Disaster Recovery)

**Plataforma:** EVAL — Plataforma Educativa Institucional  
**Institución:** I.E. Nuestra Señora de las Mercedes (Ayacucho, Perú)  
**Versión:** 2.1  
**Fecha de Publicación:** 2026-10-15  

---

## 1. Alcance y Objetivos Operativos

En una institución educativa con cientos de estudiantes y docentes, la pérdida o corrupción de datos académicos (calificaciones, entregas de tareas, materiales y actas bimestrales) representa un riesgo crítico inaceptable.  
Este documento establece el procedimiento técnico y formal para:
1. Garantizar la creación automática de copias de seguridad atómicas y consistentes.
2. Comprobar la integridad criptográfica de cada copia mediante firmas SHA-256.
3. Demostrar la restauración completa del sistema en una instalación limpia desde cero.
4. Definir las acciones inmediatas ante fallos de hardware, corrupción de base de datos o corte de suministro eléctrico.

---

## 2. Componentes de la Copia de Seguridad

Un respaldo completo de EVAL empaqueta en un único archivo comprimido `.zip` los tres elementos vitales de la plataforma:

1. **Volcado Completo de Base de Datos (`eval_database.sql`):**
   - Exportado con `mysqldump` utilizando `--single-transaction`, `--quick`, `--routines`, `--triggers` y `--hex-blob` en codificación `utf8mb4`.
   - Incluye las **39 tablas**, las **20 migraciones**, las claves foráneas y el estado de la tabla de control atómico `academic_write_guard`.
2. **Archivos Físicos Adjuntos (`files/`):**
   - Carpeta `files/deliveries/`: Todas las evidencias de aprendizaje (PDFs, imágenes, tareas enviadas por los alumnos).
   - Carpeta `files/materials/`: Guías didácticas, lecturas y recursos pedagógicos subidos por los docentes.
3. **Manifiesto de Integridad Criptográfica (`manifest.json`):**
   - Fecha y hora exacta en formato UTC (ISO 8601).
   - Identificador único del respaldo.
   - Hash SHA-256 del archivo `eval_database.sql`.
   - Conteo de tablas (39), migraciones (20) y último número ordinal de transacción (`last_ordinal`).
   - Lista exhaustiva de todos los archivos físicos adjuntos con su respectivo tamaño y hash individual SHA-256.

---

## 3. Política de Frecuencia y Retención

| Tipo de Backup | Frecuencia | Momento de Ejecución | Política de Retención | Destino Recomendado |
|---|---|---|---|---|
| **Diario Automático** | Cada 24 horas | 23:00 hrs (fin de jornada escolar) | Conservar los últimos 7 días | Disco local del servidor (`backups/`) |
| **Semanal Consolidado** | Cada 7 días | Viernes 20:00 hrs | Conservar las últimas 4 semanas | Copia externa: Unidad USB / NAS del colegio |
| **Bimestral de Cierre** | Fin de Bimestre | Al finalizar cada uno de los 4 bimestres | Conservar permanentemente (año lectivo) | Archivo institucional fuera de línea |

---

## 4. Guía de Ejecución: Creación de Backup

El script oficial de respaldo se encuentra en `backend/scripts/backup.ps1`.

### 4.1 Ejecución Manual Inmediata
Abrir PowerShell como administrador o usuario con permisos y ejecutar:

```powershell
powershell -ExecutionPolicy Bypass -File .\backend\scripts\backup.ps1
```

**Salida esperada:**
```text
[EVAL Backup] Starting backup process: eval-backup-20261015-190659...
[EVAL Backup] Backup created successfully: C:\...\backups\eval-backup-20261015-190659.zip
  Database: eval_dev (38 tables, 19 migrations, Ordinal 3651)
  Physical files: 916 attachments packaged
  Archive size: 0.61 MB | SHA256: 082AF65C4DC73D68...
```

### 4.2 Parámetros Opcionales
- `-BackupDir <Ruta>`: Carpeta de destino (por defecto: `backups/`).
- `-RetentionCount <Número>`: Cantidad de copias a conservar antes de purgar las más antiguas (por defecto: `7`).

---

## 5. Guía de Ejecución: Verificación y Restauración

El script oficial de restauración se encuentra en `backend/scripts/restore.ps1`.

### 5.1 Modo Solo Verificación (`-VerifyOnly`)
Permite comprobar la validez de un archivo de respaldo sin modificar ni tocar la base de datos en producción:

```powershell
powershell -ExecutionPolicy Bypass -File .\backend\scripts\restore.ps1 -VerifyOnly
```

Este comando desempaqueta temporalmente el archivo, verifica el `manifest.json`, recalcula los hashes SHA-256 del SQL y de los 900+ archivos adjuntos y confirma si la copia está 100% íntegra.

### 5.2 Restauración en una Base de Datos Aislada (Prueba de Simulacro)
Para probar la restauración sin sobreescribir la base de datos viva:

```powershell
powershell -ExecutionPolicy Bypass -File .\backend\scripts\restore.ps1 -TargetDatabase eval_dev_drill
```

### 5.3 Restauración Total en Producción
Para restaurar el estado más reciente sobre la base de datos principal (`eval_dev`):

```powershell
powershell -ExecutionPolicy Bypass -File .\backend\scripts\restore.ps1 -TargetDatabase eval_dev -Force
```

---

## 6. Procedimiento de Recuperación en Frío (Servidor Nuevo / Instalación Limpia)

Si el servidor físico falla, el disco duro se corrompe o se traslada la plataforma a una nueva máquina en el colegio:

1. **Preparación del entorno base en Windows Server / Windows 11:**
   - Clonar o copiar el repositorio del colegio (`mercedeseval`).
   - Instalar o restaurar el runtime local (`powershell -ExecutionPolicy Bypass -File .\backend\scripts\manage-dev.ps1 prepare`).
2. **Obtener el último respaldo `.zip`:**
   - Localizar el archivo más reciente (ej. `eval-backup-20261015-190659.zip`) de la unidad externa o backup local.
   - Colocarlo en la carpeta `backups/`.
3. **Ejecutar la restauración:**
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\backend\scripts\restore.ps1 -Force
   ```
4. **Verificación post-restauración:**
   - Correr la inspección automática:
     ```powershell
     powershell -ExecutionPolicy Bypass -File .\backend\scripts\manage-dev.ps1 snapshot
     ```
   - Validar que devuelva exactamente:
     - 39 tablas
     - 20 migraciones
     - TLS activo y permisos restringidos.
5. **Iniciar los servicios del colegio:**
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\backend\scripts\manage-dev.ps1 start
   ```

---

## 7. Automatización con el Programador de Tareas de Windows (Task Scheduler)

Para que el servidor ejecute la copia de seguridad diaria de forma desatendida a las 23:00 hrs:

### 7.1 Automatización con Script Oficial (Recomendado)
EVAL incluye el script `backend/scripts/setup-backup-task.ps1` que registra y administra la tarea `EVAL_Daily_Backup` en Windows Task Scheduler:

```powershell
# Registrar la tarea programada diaria a las 23:00 hrs
powershell -ExecutionPolicy Bypass -File .\backend\scripts\setup-backup-task.ps1 -Action install

# Verificar el estado de la tarea programada
powershell -ExecutionPolicy Bypass -File .\backend\scripts\setup-backup-task.ps1 -Action status

# Ejecutar una copia de seguridad inmediata mediante la tarea
powershell -ExecutionPolicy Bypass -File .\backend\scripts\setup-backup-task.ps1 -Action run-now

# Desinstalar la tarea cuando sea necesario
powershell -ExecutionPolicy Bypass -File .\backend\scripts\setup-backup-task.ps1 -Action uninstall
```

### 7.2 Configuración Manual Alternativa
1. Abrir **Programador de tareas** (`taskschd.msc`).
2. Crear Tarea Básica:
   - **Nombre:** `EVAL_Daily_Backup`
   - **Desencadenador:** Diariamente a las 23:00.
   - **Acción:** Iniciar un programa.
   - **Programa o script:** `powershell.exe`
   - **Argumentos:** `-ExecutionPolicy Bypass -WindowStyle Hidden -File "C:\Ruta\Al\mercedeseval\backend\scripts\backup.ps1"`
   - **Iniciar en:** `C:\Ruta\Al\mercedeseval`
3. En la pestaña *General*, marcar: *"Ejecutar tanto si el usuario inició sesión como si no"*.
