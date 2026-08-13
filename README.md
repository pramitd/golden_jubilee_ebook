# Golden Jubilee React / Node POC v4

V4 is a focused correction pass on the existing React/JavaScript flipbook. The Google Form, Apps Script, Dashboard, Review and JSON pipeline are unchanged.

Changes in this pass:
- Keyboard Left/Right navigation is wired to the same page-turn state machine as the buttons.
- Every profile keeps the portrait on the left; no alternating layout.
- The profile header no longer shows the branch in the top-left corner.
- Page number is raised so the circle sits cleanly inside the decorative border.
- Memory pages no longer show the redundant "FROM THEN TO NOW" kicker.
- "From college days to today" is centered.
- Gallery row heights are calculated against the actual available page height, preventing bottom cropping.
- Gallery image width is driven by the loaded image aspect ratio.
- Captions remain attached to their images; optional image slots simply disappear.

Run:

```powershell
npm install
npm run dev
```
