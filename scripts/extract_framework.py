"""Regenerate src/data/framework.json from the Progression Assessment template.

Usage:  pip install openpyxl
        python3 scripts/extract_framework.py path/to/Progression_Assessment_2026.xlsx
Run it whenever the People team releases a new version of the template.
"""
import json, sys
import openpyxl

LEVELS = ["6: Graduate", "7: Junior", "8: Mid", "9: Senior", "10: Lead", "11: Principal"]
BEH_LEVELS = LEVELS + ["12: Head of"]

def clean(v):
    return "" if v is None else str(v).strip()

def main(path, out="src/data/framework.json"):
    wb = openpyxl.load_workbook(path, data_only=True)

    roles = {}
    for r in wb["Skills Summary"].iter_rows(min_row=2, values_only=True):
        if not r[0] or not r[3]:
            continue
        key = f"{r[0]}|{r[1]}|{r[2]}"
        roles.setdefault(key, {"capability": r[0], "practice": r[1], "role": r[2], "skills": []})["skills"].append(
            {"skill": clean(r[3]), "levels": [clean(x) for x in r[4:10]]})

    skills = {}
    for r in wb["Skills Details"].iter_rows(min_row=2, values_only=True):
        if not r[0]:
            continue
        names = ["desc", "Learner", "Contributor", "Skilled", "Expert", "Leader", "Driver"]
        skills[clean(r[0])] = {n: clean(r[i + 1]) if i + 1 < len(r) else "" for i, n in enumerate(names)}

    behaviours = []
    for r in wb["Behaviours"].iter_rows(min_row=2, values_only=True):
        if not r[0]:
            continue
        behaviours.append({"name": clean(r[0]), "def": clean(r[1]),
                           "levels": {l: clean(v) for l, v in zip(BEH_LEVELS, r[2:9])}})

    data = {"roles": list(roles.values()), "skills": skills, "behaviours": behaviours, "levels": LEVELS}
    with open(out, "w") as f:
        json.dump(data, f, ensure_ascii=False)
    print(f"Wrote {out}: {len(data['roles'])} roles, {len(skills)} skills, {len(behaviours)} behaviours")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1])
