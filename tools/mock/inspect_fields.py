# inspect_fields.py  (drop-in replacement)
import fitz  # PyMuPDF
import csv, json, os
from datetime import datetime

TEMPLATE = "Acord-125-Commercial-Insurance-Application.pdf"
OUT_DIR = "out"
os.makedirs(OUT_DIR, exist_ok=True)

# Numeric widget type legend (stable across PyMuPDF versions)
TYPE_LEGEND = {
    1: "PushButton",
    2: "CheckBox",
    3: "RadioButton",
    4: "ComboBox",   # choice
    5: "ListBox",    # choice
    6: "Signature",
    7: "Text",
}

def _choice_values(widget):
    """Return choice option values robustly across PyMuPDF versions."""
    for attr in ("choice_values", "choices", "options"):
        vals = getattr(widget, attr, None)
        if vals:
            try:
                return list(vals)
            except Exception:
                pass
    return []

def main():
    fields = []
    with fitz.open(TEMPLATE) as doc:
        for page_ix, page in enumerate(doc, start=1):
            for w in (page.widgets() or []):
                ft = getattr(w, "field_type", None)
                rect = list(map(float, w.rect)) if getattr(w, "rect", None) else [0,0,0,0]
                val = w.field_value if getattr(w, "field_value", None) is not None else ""
                choices = _choice_values(w) if ft in (4, 5) else []
                fields.append({
                    "page": page_ix,
                    "field_name": (w.field_name or "").strip(),
                    "field_type": ft,
                    "field_type_name": TYPE_LEGEND.get(ft, "Unknown"),
                    "rect": rect,
                    "value": val,
                    "choices": choices,
                })

    # JSON
    with open(os.path.join(OUT_DIR, "fields.json"), "w", encoding="utf-8") as jf:
        json.dump({
            "template": TEMPLATE,
            "generated": datetime.now().isoformat(),
            "count": len(fields),
            "fields": fields
        }, jf, indent=2)

    # CSV
    with open(os.path.join(OUT_DIR, "fields.csv"), "w", newline="", encoding="utf-8") as cf:
        w = csv.writer(cf)
        w.writerow(["page","field_name","field_type","field_type_name","left","top","right","bottom","current_value","choices"])
        for f in fields:
            left, top, right, bottom = f["rect"]
            w.writerow([
                f["page"], f["field_name"], f["field_type"], f["field_type_name"],
                left, top, right, bottom, f["value"], "|".join(f["choices"])
            ])

    # Legend file
    with open(os.path.join(OUT_DIR, "field_type_legend.txt"), "w", encoding="utf-8") as lf:
        for k, v in sorted(TYPE_LEGEND.items()):
            lf.write(f"{k} = {v}\n")

    print("Wrote: out/fields.json, out/fields.csv, out/field_type_legend.txt")

if __name__ == "__main__":
    main()
