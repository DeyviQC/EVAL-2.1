# Four independent role dashboards
User authorizes direct implementation of separate student, teacher, director and vice-principal dashboards using navy #142D56, royal #28599B, white, gold #D4AF37 and canvas #F3F6FB.
Director is strictly business-read-only, including personal-account mutations; authentication remains necessary. The user explicitly authorizes transferring existing institutional administration from director to vice principal.
Vice principal inherits period/catalog/enrollment/user/calendar administration; teacher/student assignment scope and grading ownership remain unchanged. Existing read access is retained for director and vice principal. No fifth role or client role selector.
Server resolves one dashboard role from current local grants. Menus and workspace mounts are separately allowlisted for each role. URL changes cannot select a role; existing scoped backend authorization continues to apply.
No migrations, no demonstration records, no fake statistics. Preserve four users and the empty academic database. Test state-changing flows transactionally in an isolated rollback verification to retain the clean dataset.
