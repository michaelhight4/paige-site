import json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from mq_data import MAIN
OUT = os.path.join(os.path.dirname(__file__), "..", "quests_draft.json")
data = {"_meta": {"version": "0.1-draft", "status": "DRAFT", "written": "2026-10-23", "schema": "SCHEMA.md",
        "notes": "Kilumen quest draft for Gary's review. Main quests (type main) by the main worker; side quests merged from side_quests_draft.json with Gary's rulings applied. Nothing is wired into the game. 'existing' on a line = mirrors a shipped Text Bot line (overworld_lines.json v0.4.9) word for word."},
        "quests": MAIN}
if os.path.exists(os.path.join(os.path.dirname(__file__), "side_merged.json")):
    data["quests"] = MAIN + json.load(open(os.path.join(os.path.dirname(__file__), "side_merged.json")))
data["quests"].sort(key=lambda q: (q["order"], 0 if q["type"] == "main" else 1))
data["_meta"]["counts"] = {"main": sum(q["type"]=="main" for q in data["quests"]), "side": sum(q["type"]=="side" for q in data["quests"])}
json.dump(data, open(OUT, "w"), indent=2, ensure_ascii=False)
print("wrote", data["_meta"]["counts"])
