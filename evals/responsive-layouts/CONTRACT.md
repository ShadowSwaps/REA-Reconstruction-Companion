# Pocket Board responsive slice

Authored proposed usability expectations, frozen before the first browser run.
Same-author and source-exposed; not original parity or independent user testing.
The historical accessibility fixture and its app remain unchanged. This separate
layout serves that exact app with synthetic disposable storage on its own port.

At 960×700 CSS pixels, ordinary two-row content fits two columns. Resize the
same document to 320×640: columns stack, content wraps and no document horizontal
scroll is needed. Opening a task, resizing back and cancelling keeps the draft
and returns focus to its task. No overlay or nested scroll region is proposed;
the document is the scroll owner. Controls below the fold may require scrolling.

At 320×640, a 32px body font (16px normally, inherited by controls) simulates
200% text size. A long unbroken identifier and representative Å/猫/🙂 text must
wrap in rows, headings, labels and messages without losing content. The single
line text input may scroll its own value horizontally. A blank title gives
"Title is required.", invalid state and Title focus. Correction clears the
error; Save stores the exact trimmed title and reports Saved. Tab from Title
reaches Done, Save, Cancel; Cancel restores focus to the row. This is not native
browser zoom, OS text scaling, text-spacing coverage or full localization.

At 320×640, empty content displays No tasks. New task remains usable. Twenty
rows use document scrolling: the last row and its editor Save/Cancel remain
reachable and unobscured after scrolling. Save then Cancel and a reload retain
the edited last title. Twenty rows do not establish large-dataset performance.

Candidate and three deliberate CSS defects share this contract. Each defect
must pass the ordinary case before its selected extreme rejects it: fixed
columns overflow a narrow viewport; fixed-height rows clip long enlarged text;
a clipped list hides late rows. Failures must be assertion differences, not
browser/action errors. Geometry checks supplement actual screenshots and UI
interaction; they cannot prove readability, all occlusion, spoken feedback or
whole-app accessibility. Native zoom, other engines, real devices and assistive
technology remain explicitly unrun unless separately exercised and recorded.
