"""Add PDF bookmarks and clickable contributor links on the index pages."""
import json
import sys
from pathlib import Path

try:
    from pypdf import PdfReader, PdfWriter
    from pypdf.annotations import Link
    from pypdf.generic import ArrayObject, NumberObject
except ImportError:
    print("pypdf not installed; skipping PDF bookmarks (pip install pypdf)", file=sys.stderr)
    sys.exit(0)

PAGE_W = 595.276
PAGE_H = 841.890

def add_links(writer, links):
    border = ArrayObject([NumberObject(0), NumberObject(0), NumberObject(0)])
    added = 0
    for link in links:
        page = int(link.get("page", -1))
        dest = int(link.get("dest", -1))
        if page < 0 or dest < 0 or page >= len(writer.pages) or dest >= len(writer.pages):
            continue
        x = float(link["x"]) * PAGE_W
        y = float(link["y"]) * PAGE_H
        w = float(link["w"]) * PAGE_W
        h = max(float(link["h"]) * PAGE_H, 10)
        rect = (x, PAGE_H - (y + h), x + w, PAGE_H - y)
        writer.add_annotation(page_number=page, annotation=Link(rect=rect, target_page_index=dest, border=border))
        added += 1
    return added

def main():
    if len(sys.argv) < 3:
        sys.exit(1)
    pdf_path = Path(sys.argv[1])
    meta = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
    outline = meta.get("outline", meta if isinstance(meta, list) else [])
    links = meta.get("links", [])
    reader = PdfReader(str(pdf_path))
    writer = PdfWriter()
    writer.append(reader)
    for item in outline:
        title = item.get("title") or "Section"
        page = int(item.get("page", 0))
        if page < 0 or page >= len(writer.pages):
            continue
        writer.add_outline_item(title, page)
    added = add_links(writer, links)
    with pdf_path.open("wb") as f:
        writer.write(f)
    print(f"Added {len(outline)} PDF bookmarks and {added} contributor links")

if __name__ == "__main__":
    main()
