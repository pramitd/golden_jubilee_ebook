# Run from the project root. Edits only the hard-coded "15 names / 14 profiles / Bijan" text. Stops if anything doesn't match.
from pathlib import Path
def swap(path, old, new):
    p = Path(path); s = p.read_text(encoding="utf-8")
    assert s.count(old) == 1, f"{path}: expected text not found exactly once"
    p.write_text(s.replace(old, new), encoding="utf-8"); print("patched", path)
swap("src/main.jsx",
 '<p className="intro-copy">Fifteen names in the contributor index; fourteen full profiles are present in the supplied compilation.</p>',
 '<p className="intro-copy">The contributor index as provided in the source compilation.</p>')
swap("src/main.jsx",
 '<p className="editor-note">Bijan K. Dutta appears in the source index; a profile page and profile content were not present in the supplied Word compilation.</p>',
 '')
swap("scripts/generate-pdfs.py",
 "story += [Spacer(1,7*mm),Paragraph('Bijan K. Dutta appears in the source index; a corresponding profile was not present in the supplied Word compilation. No profile content has been invented.',styles['SmallNote']),PageBreak()]",
 "story += [PageBreak()]")
