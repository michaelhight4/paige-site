# Compact authoring helpers for data/events.json. Stat steps must be in {4,8,16,30} (checked by tests).
def C(label, j, fx=None, p=None, fail=None, **kw):
    c = {"label": label, "journal": j}
    if fx: c["fx"] = fx
    if p is not None: c["p"] = p
    if fail: c["fail"] = {"journal": fail[0], **({"fx": fail[1]} if len(fail) > 1 and fail[1] else {})}
    c.update(kw); return c
def E(id, cat, ages, w, title, prompt, choices, once=False, cond=None, chain_only=False):
    e = {"id": id, "cat": cat, "ages": list(ages), "w": w, "title": title, "prompt": prompt, "choices": choices}
    if once: e["once"] = True
    if cond: e["if"] = cond
    if chain_only: e["chainOnly"] = True; e["w"] = 0
    return e
