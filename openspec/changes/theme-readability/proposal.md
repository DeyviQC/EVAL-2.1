# Theme-aware text readability

The human requested readable text after switching between light and dark themes, with particular attention to older adults. This is a presentation-only correction to the existing interface. Use theme-aware foregrounds for classroom text, labels, supporting copy, dialogs and existing neutral utilities. Pair dark foreground overrides with appropriate surfaces, retain white text on primary actions, and increase base text to 16px and small utility text to 14px. Keep role and academic boundaries unchanged.

Verification: run the existing frontend build and contract checks, then inspect computed foreground/background contrast in both themes using the built stylesheet. Target at least 7:1 for main and secondary text on standard theme surfaces and 4.5:1 for links. This change does not accept the prototype, complete planning gates or authorize additional domain implementation.

## Calendar and shared panel follow-up

The human supplied a screenshot showing white period picker and summary panels with pale text in dark mode and requested checking all modules. Correct both foreground and background for these panels and audit shared article, table, profile, week and course-navigation surfaces across all four roles. Verify actual panel backgrounds and foregrounds after repeated theme changes; do not substitute the expected theme surface for an element's computed background during contrast checks.
