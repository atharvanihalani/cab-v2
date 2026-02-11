# Explore@Brown — TODO

## Data Tasks
- [ ] **Full instructor names + emails** — scraped data only has abbreviated form (e.g. "M. Ajibade"). Need to re-scrape or cross-reference with Brown directory / Critical Review to get full first names and email addresses. Currently fine in search results, but detail view should show the full name and a contact link.
- [ ] **Modality data** — all 1349 courses have missing modality info. Need to re-scrape or find a source for in-person / online / hybrid. Modality filter in sidebar is currently useless without this data.

## UX / Polish
- [x] **Duplicate sections** — grouped same-title sections into one card with "N sections" badge; detail view shows all section times/instructors. Different-topic courses (e.g. AMST 0192T/U/V) stay separate.
- [x] **"Clear all filters" re-checks "Exclude grad courses"** — renamed to "Reset filters" to clarify it resets to defaults.

## Performance
- [ ] **Bundle size** — ~2MB JS chunk warning on build. Could code-split or lazy-load course data if it matters.
