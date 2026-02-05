# Project Notes — Explore@Brown

## Summary
Explore@Brown is a search-first course exploration UI for Brown University. It emphasizes semantic/topic “vibe” search that maps to departments, then refines results via sidebar filters. The UI has three states: home (centered search), results list, and course detail with a right sidebar of other results. This is a Phase 1 clickable prototype using mock data.

## Tech Stack
- Vite + React 18
- TailwindCSS

## App Structure
- Entry: `src/main.jsx`
- UI + logic: `src/App.jsx` (all components in one file)
- Global styles: `src/index.css`
- Tailwind theme: `tailwind.config.js`

## Data
- Active mock data: `src/data/courses.js`
- Topic mapping: `src/data/topicMapping.js`
- Unwired full dataset: `src/data/courses_spring_2026.json` (real-ish Spring 2026 catalog)

## Search Behavior
- Primary search matches exact department codes or maps topical queries via `getDepartmentsForQuery()`.
- Result set is then refined by sidebar filters.

## Filters
- Department (multi-select)
- Class time (custom 30‑min block grid)
- Format (multi-select)
- Class size category (small/medium/large)
- Exclude grad courses (default on)
- Advanced: modality, credit, independent study, designations (WRIT/COEX/DIAP)

## UI States
1. **Home**: centered search bar with suggestion chips.
2. **Results**: list of course cards + search bar.
3. **Detail**: course detail view + right sidebar of other results.

## Notable Logic
- Time filtering: `parseCourseTime()` + `courseFitsInTimeBlocks()` in `src/App.jsx`.
- Detail view includes enrollment meter and optional external links.

## Spec Reference
- Project spec: `explore-brown-spec.md`
