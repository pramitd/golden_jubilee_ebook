export function PdfExport({pages}) {
  if (typeof document !== 'undefined') {
    document.title = 'Golden Jubilee ’76 — PDF';
    document.documentElement.classList.add('pdf-mode');
    document.body.classList.add('pdf-mode');
  }
  return (
    <main className="pdf-export">
      {pages.map((p, i) => (
        <div
          className="pdf-sheet"
          key={p.key}
          id={p.pdfAnchor || undefined}
          data-outline={p.outlineTitle || undefined}
        >
          {p.render(i + 1)}
        </div>
      ))}
    </main>
  );
}
