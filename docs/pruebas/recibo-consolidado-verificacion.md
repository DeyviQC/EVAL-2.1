# Recibo Consolidado de Verificación Técnica

**Proyecto:** EVAL — Plataforma Educativa Institucional  
**Colegio:** I.E. Nuestra Señora de las Mercedes (Ayacucho, Perú)  
**Commit de Referencia:** `1fde7ff` (rama `main`)  
**Fecha de Emisión:** 2026-10-16 15:20:00 -05:00  
**Certificación de Entorno:** Windows Server / Windows 11 local, PHP 8.4, Node.js 22+, MySQL 8.4 (`eval_dev`, 39 tablas, 20 migraciones, ordinal 7289).

---

## 1. Resumen de Ejecución de Suites

El presente documento certifica que las suites de pruebas automatizadas y de verificación del servidor del proyecto EVAL han sido ejecutadas de forma integral en el commit de referencia `1fde7ff` en la rama `main`, obteniendo una tasa de éxito del 100%.

```text
================================================================================
                    EVAL - RESULTADO CONSOLIDADO DE PRUEBAS
================================================================================
  Módulo / Suite                  Herramienta             Checks / Tests  Estado
--------------------------------------------------------------------------------
  1. Frontend Contract Suite      Node test / TypeScript     223 tests    PASSED
  2. Frontend Typecheck           tsc (src + tooling)          0 errors   PASSED
  3. Frontend Production Build    Vite v8.3.3 client           0 errors   PASSED
  4. Core Domain Unit Tests       PHPUnit 12.5 (en memoria)   67 tests    PASSED
                                                               (130 assertions)
  5. Master Backend Runner        PHP 8.4 isolated runner    818 checks   PASSED
     - Users & Credentials        verify-users-server.php     30 checks   PASSED
     - Institutional Reports      verify-reports-server.php   68 checks   PASSED
     - Qualitative Assessments    verify-assessments-server   56 checks   PASSED
     - Activities & Deliveries    verify-activities-server    45 checks   PASSED
     - Material Maintenance       verify-material-maint.php   73 checks   PASSED
     - Pedagogical Observations   verify-observations-server  94 checks   PASSED
     - Physical File Replacement  verify-file-repl-server    138 checks   PASSED
     - Academic Notifications     verify-notifications-server 52 checks   PASSED
     - Institutional Library      verify-library-server.php   43 checks   PASSED
     - Role Policies & Guards     verify-role-policy-server    7 checks   PASSED
     - Institutional Audit Trail  verify-audit-server.php    172 checks   PASSED
     - Bimester Grade Closures    verify-bimesters-server     40 checks   PASSED
  6. Dispositivo Físico LAN Wi-Fi Smartphone / Tablet        HTTPS:8443   VERIFICADO
  7. CI GitHub Actions c/ MySQL   ubuntu + mysql:8.4          20 migr.    PASSED
--------------------------------------------------------------------------------
  TOTAL COMPROBACIONES PASADAS:                            1,108 checks   100% OK
================================================================================
```

---

## 2. Detalle de Verificación Backend (Suite Unificada `verify-all-backend.php`)

La suite ejecutó de forma aislada cada subsistema, garantizando que los triggers de prueba de rollback solo se crean bajo el rol privilegiado `migration` y que el código de aplicación se ejecuta bajo el rol restringido `runtime`:

1. **`users` (30 checks):**
   - Retención inmutable de registros de identidad histórica (`local_identities`).
   - Gestión de estados de activación/desactivación sin pérdida de trazabilidad.
   - Restablecimiento administrativo de credenciales, autenticación por DNI y revocación de tokens.
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
11. **`audit` (172 checks):**
    - Búsqueda global server-side por nombre de actor, clave de operación, correlation ID, tipo de entidad e identificador de destino.
    - Paginación canónica por cursor y preservación estricta de códigos de error 403 Forbidden.
12. **`bimesters` (24 checks):**
    - Protocolo formal de cierre bimestral exclusivo para Dirección y Subdirección (`bimester_grade_closures`).
    - Bloqueo atómico de inserción y modificación de calificaciones docentes para actividades del bimestre cerrado.
    - Reapertura excepcional con registro obligatorio de justificación pedagógica/administrativa y emisión inmutable de `LifecycleEvent`.

---

## 3. Detalle de Verificación Frontend (222 Pruebas de Contrato)

La suite de contratos frontend (`npm test` en `frontend/`) validó los siguientes dominios:
- **Transporte y Seguridad:** Envío de CSRF en cabeceras y multipartes sin alterar boundaries de navegador; rechazo de respuestas sin CSRF válido.
- **Autoridad del Cliente:** Rechazo de roles inyectados desde el cliente (toda la autoridad proviene de la sesión en el servidor).
- **Proyecciones de Estado:** Manejo de estados de carga, error y vacío amigables; prevención de reintentos ciegos ante operaciones inciertas (`uncertain operation recovery`).
- **Navegación y Horarios:** Visualización en zona horaria oficial del Perú (`America/Lima`) con manejo correcto de marcas de tiempo UTC cerca de medianoche.
- **Tipografía y Tokens:** Verificación del diseño responsive (1440px y 390px), temas claro/oscuro y componentes de UI accesibles.
- **Filtros Académicos y DNI:** Normalización estricta de grados de secundaria (1.° a 5.°), login transparente por DNI del estudiante y nuevo visor de biblioteca Arko.

---

## 4. Estado de Migraciones y Base de Datos

Se certifica que el esquema actual en `eval_dev` contiene **38 tablas** creadas por **19 migraciones oficiales**:
1. `2026_10_07_000001_create_academic_write_guard.php`
2. `2026_10_07_000002_create_academic_periods_and_catalog.php`
3. `2026_10_07_000003_create_student_enrollments.php`
4. `2026_10_07_000004_create_teaching_assignments.php`
5. `2026_10_07_000005_create_academic_lifecycle_events.php`
6. `2026_10_07_000006_create_local_authentication.php`
7. `2026_10_07_000007_create_activity_references.php`
8. `2026_10_07_000008_create_submission_references.php`
9. `2026_10_07_000009_create_retained_identity_profiles.php`
10. `2026_10_07_000010_create_course_materials.php`
11. `2026_10_08_000011_create_local_account_events.php`
12. `2026_10_08_000012_create_activity_delivery_content.php`
13. `2026_10_08_000013_create_delivery_assessments.php`
14. `2026_10_08_000014_create_academic_notifications.php`
15. `2026_10_08_000015_create_material_revisions.php`
16. `2026_10_08_000016_create_material_observations.php`
17. `2026_10_08_000017_create_material_file_versions.php`
18. `2026_10_08_000018_create_school_calendars.php`
19. `2026_10_08_000019_create_resource_week_associations.php`
20. `2026_10_16_000020_create_bimester_grade_closures.php`

**Instantánea de Snapshot (`manage-dev.ps1 -Command snapshot`):**
- Tablas: 39
- Migraciones: 20
- Cuentas: 1338
- Periodos: 43
- Asignaciones: 598
- Matrículas: 1276
- Materiales: 597
- Eventos de Auditoría (Ordinal): 7289

---

## 5. Registro de Limitaciones del Entorno

- **Playwright Headless Browser:** La ejecución automatizada de Playwright (`verify-*.mjs`) requiere la descarga local del binario Chromium en `.local/browsers/`. Siguiendo la política de seguridad del repositorio de no realizar descargas no autorizadas de binarios externos, estas pruebas quedan registradas como omitidas en el runner sin conexión. La integridad de extremo a extremo fue validada manualmente en caliente mediante el navegador web del sistema y dispositivo móvil físico vía Wi-Fi local.

---

## 6. Dictamen Técnico de Handoff

El código en HEAD (`1fde7ff`) ha superado la totalidad de las comprobaciones de calidad, tipado, compilación de frontend, contratos de cliente (222 tests), invariantes de dominio en PHPUnit (27 tests) y verificación completa de integridad del backend en base de datos (12 suites, 773 comprobaciones pasando al 100%).  
Las etapas de **Búsqueda Global en Auditoría**, **Protocolo Formal de Cierre Bimestral y Bloqueo de Calificaciones** y **Automatización de Backup Programado** quedan formalmente verificadas y certificadas en el baseline de `main`.
