# Explore@Brown — Project Spec

## Context

Brown University's course search tool (cab.brown.edu) works fine when you know exactly what you want. It fails for **exploration**—when you're an undergraduate looking for an interesting elective, browsing for something that fits a vague vibe rather than a specific requirement.

There are many cool courses at Brown. They're not easy to find. This tool helps you explore the catalog.

## Target Audience

- Undergraduates searching for electives or non-mandatory classes
- People who have a general flavor/vibe in mind, not a specific course
- NOT: people who already know their requirements, grad students, or faculty

## Core Concept

A search-first interface where the **primary search is semantic/topical** (e.g., "political theory") rather than administrative (e.g., "POLS"). The search resolves to relevant departments, and secondary filters refine from there.

Think of it like Kayak: the privileged filter is "where are you flying" — everything else is secondary. Here, the privileged filter is "what vibe of class."

---

## UI Structure (3 States)

### State 1: Home (Empty)
- Left sidebar: filters (collapsed or visible)
- Main area: centered search bar
- Clean, minimal — no results yet

### State 2: Results List
- Left sidebar: filters
- Main area: vertical list of course cards
- Each card shows: course code, title, brief info (time? instructor?)

### State 3: Course Detail
- Left sidebar: filters (same)
- Main area: expanded detail view for selected course (title, description, time, instructor, etc.)
- Right sidebar: scrollable list of other search results (compact view)
- Clicking another course in right sidebar swaps the detail view

---

## Search & Filters

### Primary Search (the search bar)
- Accepts department codes directly (e.g., "ECON", "CSCI")
- Also accepts topical queries (e.g., "political theory") that map to multiple relevant departments
- Implementation: start simple — can use keyword matching against course descriptions, or pre-mapped topic clusters. LLM-based resolution is a future option, not v1.

### Secondary Filters (sidebar)
- Department (can override/refine primary search)
- Time constraints
- Class size / format (seminar, lecture, etc.)
- Course level (exclude grad courses by default)
- Exclude independent study/research by default
- Current semester only by default

Filters update results live (no "apply" button).

---

## Defaults (Important)

These reduce noise for the target audience:
- Only current semester
- Exclude graduate-level courses (2000+)
- Exclude independent study / research
- All toggleable if user wants them back

---

## NOT Building (v1)

- Shopping cart / registration features
- Mobile layout
- Natural language parsing (beyond basic topic→department mapping)
- User accounts / saved preferences
- Anything related to course registration flow

---

## Technical Approach

**Phase 1: Clickable prototype with fake data**
- Build the actual UI (React or plain HTML/JS)
- Hardcode ~20 placeholder courses
- Implement the three states and navigation between them
- Goal: validate that the layout and flow feel right

**Phase 2: Real data**
- Scrape/fetch course data from CAB
- Implement actual search and filtering
- Connect to UI

---

## Success Criteria

A user can:
1. Land on the page
2. Type a topical query or department code
3. See a filtered list of relevant courses
4. Click into a course to see details without losing their search context
5. Adjust filters to narrow results
6. Find something interesting they wouldn't have found on CAB

---

## Reference

- Current CAB interface: https://cab.brown.edu
- Wireframe: 3-panel layout progressing through empty → list → detail states
