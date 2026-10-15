# Local integral demonstration

The human explicitly authorized the additive 300-student dataset on 2026-10-14. This dataset reuses the four original accounts without resetting secrets, changing their role grants or replacing their profiles. One roster slot uses the original student; 299 new students have unique fictional full female names. Nine fictional teachers supplement the original teacher, who teaches Mathematics in all 20 classrooms. The original Director and Vice Principal remain unchanged.

## Persistent records

- Five grades, A–D sections: 20 classrooms and 15 enrolled students each.
- Ten configurable secondary curricular areas per classroom: 200 active assignments.
- Four bimesters with date-bound weeks in a published, explicitly synthetic calendar.
- Detailed content in bimester 4 only: 200 PDF materials, 200 open tasks, 600 written deliveries, 400 AD/A assessments with feedback and retained evidence.
- Actual recipient-scoped notifications and lifecycle/account audit events.

The dates are demonstration dates, not an assertion of the school's approved calendar. Curricular area reference: [MINEDU secondary curricular programme](https://www.minedu.gob.pe/curriculo/pdf/programa-curricular-educacion-secundaria.pdf). This demo does not imply that every optional curricular offering is compulsory for the school.

## Inspection

Use the existing role launchers. Student: Mi calendario → enter any course → Bimestre 4 → Semana 28. Teacher: Cursos y aulas / Actividades y entregas, select grade and section. Vice Principal: users, enrollment and assignment directories. Director: institutional consultation/reports.

New demo identities use local usernames `demo.estudiante.<classroom>.<number>` and `demo.docente.<area>`. They have independently generated passwords, never printed or hard-coded. The Vice Principal can reset a chosen demo account through the existing account-management flow. The four original accounts retain their existing login credentials.

## Reproducibility

Explicit local commands: `EVAL-local.ps1 -Command seed-integral-demo` and `EVAL-local.ps1 -Command verify-integral-demo`. No startup launcher seeds automatically. The seeder is restricted to exact development database/runtime bindings and an explicit capability variable set by the local controller. It refuses an unrelated active year or calendar and detects incompatible identities, enrollments, assignments and week associations. Compatible reruns create zero duplicate records. Each command uses existing domain transactions and audit; it is resumable, not a single atomic transaction for the whole dataset.

## Limits

Schedules, attendance, questionnaires, competencies/rubrics, support cases, PDF/XLSX report exports and supervised promotion remain staged implementation requirements. Tasks currently have no deadline; this dataset does not exercise late-submission reporting. Do not describe those features as delivered. Existing task/grade/notification flows are real persisted data, not frontend fixtures.
