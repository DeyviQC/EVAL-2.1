# Proposal: Bimester Grade Locking Protocol

Date: 2026-10-16.
Status: Human-approved through "los 2 luego continua con las demas etapas" sequence instruction.

## Context and Operational Necessity

The institutional audit identified that while the CNEB report displays AD/A/B/C distribution, reinforcement indicators, and classroom consolidation, the institutional academic lifecycle lacked a formal bimester closure and grade locking protocol:
1. Absence of a formal bimester closure mechanism.
2. Unrestricted grade mutability (teachers could modify historical assessments at any time).
3. Lack of an authorized reopening protocol with mandatory justification.
4. Ambiguity between provisional classroom progress and final, definitive bimester consolidation.
5. Incomplete audit evidence regarding who closed or reopened a bimester.

## Proposed Bounded Rules

1. **Four Academic Bimesters**: Each active academic period (`academic_periods`) comprises four pedagogical bimesters (1.°, 2.°, 3.°, 4.° Bimestre), aligned with the 36 teaching weeks of the national school calendar plan.
2. **Formal Bimester Closure (`closeBimester`)**:
   - Authorized roles: `director_admin` and `vice_principal`.
   - Precondition: Academic period must be `active`. Bimester must be currently `open`.
   - Effect: State transitions to `locked`. Records `closed_by` actor reference and timestamp.
   - Audit: Appends immutable `LifecycleEvent` to `academic_lifecycle_events` (`event_type: 'bimester_closed'`).
3. **Grade Locking Enforcement**:
   - When a bimester is `locked`, `DeliveryAssessment::assess` rejects any new grade entry or grade correction for activities belonging to that bimester with `AcademicCommandFailure('bimester_locked')`.
4. **Authorized Exceptional Reopening (`reopenBimester`)**:
   - Authorized roles: `director_admin` and `vice_principal`.
   - Preconditions: Academic period must be `active`. Bimester must be currently `locked`. Mandatory justification string (10 to 500 characters) explaining the administrative or pedagogical rationale.
   - Effect: State transitions to `open`. Records `reopened_by`, timestamp, and justification.
   - Audit: Appends immutable `LifecycleEvent` to `academic_lifecycle_events` (`event_type: 'bimester_reopened'`, including justification metadata).
5. **Provisional vs. Definitive Report Distinction**:
   - `ClassroomReport` queries bimester status and reflects whether the report is a provisional working document or a definitive, locked institutional consolidation.
   - `ReportWorkspace.tsx` displays visual badges and official print headers distinguishing "Consolidado Definitivo (Bimestre Cerrado)" from "Vista Provisional en Proceso".
