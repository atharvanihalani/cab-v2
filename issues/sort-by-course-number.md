---
priority: P1
state: approved
---

# Add sort option: Course Number

Add a sort option that sorts by the **numeric part** of the course code (e.g., the `0101` in `CSCI 0101`), ignoring the department prefix. This lets users surface beginner/introductory-level courses (low numbers) or advanced seminars (high numbers) regardless of department.

## Context

Current sort options are Relevance, Code (alphabetical by full course code), and Size. Sorting by full code groups by department first, which isn't useful for finding courses by level across departments.

## Desired Behavior

- Add "Number" as a new sort option in the sort bar (toggle asc/desc like Code and Size)
- Ascending: lowest course numbers first (intro-level courses)
- Descending: highest course numbers first (advanced courses)
- Extract the numeric portion from the course code for comparison (e.g., `CSCI 0101` → `101`, `ENGN 1760` → `1760`)
- Tiebreaker: sort alphabetically by department code when course numbers are equal
