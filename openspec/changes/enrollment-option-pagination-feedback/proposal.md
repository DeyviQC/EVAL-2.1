# Visible enrollment option pagination

The human identified the “Cargar más estudiantes” control below the enrollment form as appearing to do nothing. This control paginates the student selector, not account creation. Rename it to identify its destination, display the loaded student count and explain its effect. During pagination, show loading, disable concurrent requests and retain an immediate ref guard. On success, show the returned count and a shared toast; empty and failed responses receive explicit feedback. Apply the same pagination feedback to period/grade/section options in this vice-principal enrollment form. Preserve selection and existing server pagination; do not create accounts or enrollments.

Verification uses existing contracts and build. Full live pagination is not claimed without executing it. No planning gate or domain scope expansion is implied.
