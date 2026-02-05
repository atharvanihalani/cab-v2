"""
Filters enriched CAB data into a clean dataset for Explore@Brown.

Filtering rules:
    1. Remove independent studies (schd=I)
    2. Remove exam prep courses (schd=E)
    3. Remove crosslisted placeholders (schd=0)
    4. Remove conference/discussion sections (schd=C)
    5. Remove film screening sections (schd=F)
    6. For courses that have both S and L sections, keep only S sections
    7. For lab-only courses (only L sections, no S), remove entirely
    8. Keep all parallel S sections (e.g. S01, S02) for time filtering

Input:  src/data/courses_spring_2026_enriched.json
Output: src/data/courses_final.json
"""

import json
import os
from collections import defaultdict

SCRIPT_DIR = os.path.dirname(__file__)
INPUT_FILE = os.path.join(SCRIPT_DIR, "..", "src", "data", "courses_spring_2026_enriched.json")
OUTPUT_FILE = os.path.join(SCRIPT_DIR, "..", "src", "data", "courses_final.json")


def filter_courses():
    with open(os.path.abspath(INPUT_FILE)) as f:
        courses = json.load(f)

    print(f"Input: {len(courses)} courses")

    # Step 1: Remove I, E, 0, C, F
    kept = [c for c in courses if c["schd"] in ("S", "L")]
    removed_schd = len(courses) - len(kept)
    print(f"Removed {removed_schd} courses with schd in (I, E, 0, C, F)")

    # Step 2: Group by course code to handle S/L logic
    by_code = defaultdict(list)
    for c in kept:
        by_code[c["code"]].append(c)

    final = []
    dropped_lab_only = 0

    for code, sections in by_code.items():
        has_s = any(s["schd"] == "S" for s in sections)
        has_l = any(s["schd"] == "L" for s in sections)

        if has_s:
            # Keep all S sections (parallel offerings for time filtering)
            final.extend(s for s in sections if s["schd"] == "S")
        elif has_l and not has_s:
            # Lab-only course — drop entirely
            dropped_lab_only += 1
        else:
            final.extend(sections)

    print(f"Removed {dropped_lab_only} lab-only courses")

    # Sort by code then section for clean output
    final.sort(key=lambda c: (c["code"], c["section"]))

    # Assign sequential IDs
    for i, c in enumerate(final, start=1):
        c["id"] = i

    # Write output
    output_path = os.path.abspath(OUTPUT_FILE)
    with open(output_path, "w") as f:
        json.dump(final, f, indent=2)

    print(f"\nOutput: {len(final)} courses → {output_path}")

    # Stats
    unique_codes = len(set(c["code"] for c in final))
    unique_depts = len(set(c["code"].split()[0] for c in final))
    with_enrollment = sum(1 for c in final if c["max_enrollment"])
    with_desig = sum(1 for c in final if c["designations"])
    multi_section = sum(1 for code, secs in by_code.items()
                       if len([s for s in secs if s["schd"] == "S"]) > 1)

    print(f"\nStats:")
    print(f"  Unique course codes: {unique_codes}")
    print(f"  Unique departments: {unique_depts}")
    print(f"  Courses with multiple sections: {multi_section}")
    print(f"  With enrollment data: {with_enrollment}/{len(final)}")
    print(f"  With designations: {with_desig}/{len(final)}")


if __name__ == "__main__":
    filter_courses()
