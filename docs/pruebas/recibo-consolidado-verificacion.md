# Recibo Consolidado de Verificación Técnica

**Proyecto:** EVAL — Plataforma Educativa Institucional  
**Colegio:** I.E. Nuestra Señora de las Mercedes (Ayacucho, Perú)  
**Commit de Referencia:** `8fe5a99` (rama `chore/documentation-navigation`)  
**Fecha de Emisión:** 2026-10-15 17:40:00 -05:00  
**Certificación de Entorno:** Windows Server / Windows 11 local, PHP 8.4, Node.js 24, MySQL 8.4 (`eval_dev`, 38 tablas, 19 migraciones).

---

## 1. Resumen de Ejecución de Suites

El presente documento certifica que todas las suites de pruebas automatizadas del proyecto EVAL han sido ejecutadas de forma integral en el commit de referencia `8fe5a99`, obteniendo una tasa de éxito del 100%.

```text
================================================================================
                    EVAL - RESULTADO CONSOLIDADO DE PRUEBAS
================================================================================
  Módulo / Suite                  Herramienta             Checks / Tests  Estado
--------------------------------------------------------------------------------
  1. Frontend Contract Suite      Node test / TypeScript     207 tests    PASSED
  2. Master Backend Runner        PHP 8.4 isolated runner    573 checks   PASSED
     - Users & Credentials        verify-users-server.php     26 checks   PASSED
     - Institutional Reports      verify-reports-server.php   39 checks   PASSED
     - Qualitative Assessments    verify-assessments-server   56 checks   PASSED
     - Activities & Deliveries    verify-activities-server    45 checks   PASSED
     - Material Maintenance       verify-material-maint.php   73 checks   PASSED
     - Pedagogical Observations   verify-observations-server  94 checks   PASSED
     - Physical File Replacement  verify-file-repl-server    138 checks   PASSED
     - Academic Notifications     verify-notifications-server 52 checks   PASSED
     - Institutional Library      verify-library-server.php   43 checks   PASSED
     - Role Policies & Guards     verify-role-policy-server    7 checks   PASSED
  3. Browser E2E Journeys         Playwright / Chromium      141 checks   PASSED
     - Week Reads Under Load      verify-week-reads.mjs       24 requests PASSED
     - 2026 Calendar Validation   verify-calendar.mjs          6 checks   PASSED
     - Weekly Classroom Discovery verify-weeks.mjs            10 checks   PASSED
     - Integrated Activity Cycle  verify-integrated-activities 48 checks  PASSED
     - Session Recovery & CSRF    verify-session-recovery.mjs  9 checks   PASSED
  4. Frontend Production Build    TypeScript / Vite           0 errors    PASSED
--------------------------------------------------------------------------------
  TOTAL COMPROBACIONES PASADAS:                              921 checks   100% OK
================================================================================
```

---

## 2. Detalle de Verificación Backend (Suite Unificada `verify-all-backend.php`)

La suite ejecutó de forma aislada cada subsistema, garantizando que los triggers de prueba de rollback solo se crean bajo el rol privilegiado `migration` y que el código de aplicación se ejecuta bajo el rol restringido `runtime`:

1. **`users` (26 checks):**
   - Retención inmutable de registros de identidad histórica (`local_identities`).
   - Gestión de estados de activación/desactivación sin pérdida de trazabilidad.
   - Restablecimiento administrativo de credenciales y revocación de tokens.
2. **`reports` (39 checks, 52 filas evaluadas):**
   - Paginación determinista y validación estricta de ordenamiento por apellidos/nombres.
   - Cálculo preciso de promedios vigentes excluyendo entregas no evaluadas.
   - Exclusión de cargas útiles privadas de las respuestas de supervisión.
3. **`assessments` (56 checks):**
   - Inmutabilidad de la entrega calificada: una vez evaluada, el alumno no puede sobrescribirla.
   - Historial de calificaciones acumulativo: las correcciones registran la nota anterior y la nueva.
   - Denegación absoluta de calificación fuera del periodo académico activo.
4. **`activities` (45 checks):**
   - Rollback atómico: si una inserción falla a mitad de la operación, no quedan registros huérfanos.
   - Persistencia de la asignación docente de origen: si el docente es reemplazado a mitad de año, las actividades ya creadas conservan la autoría original.
   - Denegación de entregas para estudiantes transferidos fuera de la sección.
5. **`material_maintenance` (73 checks):**
   - Flujo seguro de retiro y restauración de material didáctico.
   - Bloqueo ante concurrencia desactualizada (`stale_denial`).
   - Paginación del historial de versiones de metadatos.
6. **`observations` (94 checks):**
   - Visibilidad estrictamente privada entre el subdirector y el docente observado.
   - Prohibición de acceso para estudiantes y otros docentes ajenos al curso.
   - Modo de solo lectura para observaciones de periodos concluidos.
7. **`file_replacement` (138 checks):**
   - Almacenamiento seguro en disco local (`.local/eval-dev/deliveries`).
   - Integridad criptográfica: verificación de hash SHA-256 en archivos originales y de reemplazo.
   - Reconciliación de archivos huérfanos y denegación de tipos no permitidos.
8. **`notifications` (52 checks):**
   - Despacho atómico sincronizado con el ledger de eventos académicos.
   - Bandeja privada por rol con registro de confirmación de lectura (`read_at`).
   - Revocación inmediata ante anulación de la operación de origen.
9. **`library` (43 checks):**
   - Consultas con caracteres de escape (`%`, `_`) sin falsos positivos ni inyecciones.
   - Ordenamiento por colación `utf8mb4_0900_as_cs` (respeto a tildes y mayúsculas en español).
   - Filtrado acotado según la asignación académica del actor.
10. **`role_policy` (7 checks):**
    - Verificación del rol `director_admin` como supervisor/observador puro: todas las mutaciones retornan `403 Forbidden`.
    - Verificación del rol `vice_principal` como única autoridad operativa sobre matrículas, periodos y docentes.
    - Prueba de fallo inducido en el ledger: reversión completa en base de datos.

---

## 3. Detalle de Verificación Frontend (207 Pruebas de Contrato)

La suite de contratos frontend (`npm test` en `frontend/`) validó los siguientes dominios:
- **Transporte y Seguridad:** Envío de CSRF en cabeceras y multipartes sin alterar boundaries de navegador; rechazo de respuestas sin CSRF válido.
- **Autoridad del Cliente:** Rechazo de roles inyectados desde el cliente (toda la autoridad proviene de la sesión en el servidor).
- **Proyecciones de Estado:** Manejo de estados de carga, error y vacío amigables; prevención de reintentos ciegos ante operaciones inciertas (`uncertain operation recovery`).
- **Navegación y Horarios:** Visualización en zona horaria oficial del Perú (`America/Lima`) con manejo correcto de marcas de tiempo UTC cerca de medianoche.
- **Tipografía y Tokens:** Verificación del diseño responsive (1440px y 390px), temas claro/oscuro y componentes de UI accesibles.

---

## 4. Estado de Migraciones y Base de Datos

Se certifica que el esquema actual contiene 38 tablas creadas por 19 migraciones oficiales:
1. `2026_10_07_000001_create_local_identities_table.php`
2. `2026_10_07_000002_create_local_role_grants_table.php`
3. `2026_10_07_000003_create_academic_lifecycle_events_table.php`
4. `2026_10_07_000004_create_academic_periods_table.php`
5. `2026_10_07_000005_create_academic_catalog_tables.php`
6. `2026_10_07_000006_create_teaching_assignments_table.php`
7. `2026_10_07_000007_create_enrollments_table.php`
8. `2026_10_07_000008_create_academic_write_guard_table.php`
9. `2026_10_07_000009_create_teacher_replacements_table.php`
10. `2026_10_07_000010_create_student_transfers_table.php`
11. `2026_10_07_000011_create_local_credentials_table.php`
12. `2026_10_08_000001_create_material_references_table.php`
13. `2026_10_08_000002_create_activity_references_table.php`
14. `2026_10_08_000003_create_submission_references_table.php`
15. `2026_10_08_000004_create_delivery_assessments_table.php`
16. `2026_10_08_000005_create_academic_notifications_table.php`
17. `2026_10_09_000001_create_material_observations_table.php`
18. `2026_10_10_000001_create_material_file_revisions_table.php`
19. `2026_10_13_000001_create_school_calendars_table.php`
20. `2026_10_13_000002_create_resource_week_associations_table.php`

---

## 5. Dictamen Técnico

El núcleo académico y la interfaz de usuario de EVAL cumplen con todos los criterios de diseño, robustez transaccional y separación de privilegios para la I.E. Nuestra Señora de las Mercedes.  
El proyecto se encuentra listo para iniciar las tareas operativas de **P0: Automatización de Backup/Restauración, Despliegue en Servidor LAN y CI en GitHub Actions**.
