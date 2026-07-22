# Word paste-test samples

Five `.docx` files representing the range of formats real pastors use when they draft
sermon notes in **Microsoft Word** and then **import** them into Shema (the iPad-only,
write-in-Word-then-paste workflow — using Shema for everything *except* Prepare authoring).

## How to use them
On the iPad: open a file in **Word** (or Pages/Google Docs) → **Select All** → **Copy** →
in Shema open the **Import** (paste) screen and **Paste**. Review the proposed section
breaks, then commit.

## What each file is, and what it stresses

| File | Authoring style | Formatting it exercises |
|---|---|---|
| `01-full-manuscript.docx` | Every-word-written prose | Long paragraphs, **bold** emphasis, *italics*, block-quoted scripture |
| `02-classic-outline.docx` | Roman-numeral preaching outline | Deep multi-level numbered lists (I → A → 1 → a) |
| `03-bullet-skeleton.docx` | Talking-points / bullets | Heading rows + bulleted lists + nested sub-bullets |
| `04-hybrid-annotated.docx` | Mixed notes | Headings, prose, bullets, a **2-column table**, stage directions, an illustration block |
| `05-sparse-keyword-notes.docx` | Back-of-envelope fragments | Minimal formatting, dashes, many inline scripture refs, stray symbols |

## Expected behavior (what "good" looks like)
Shema's importer keeps `B/STRONG/I/EM/U/MARK/BR/UL/OL/LI/BLOCKQUOTE`, extracts any images
into Illustrations, and handles structure like this:

- **Word headings (Heading 1/2/…) become proposed *section breaks*** — you'll see each one
  as a removable marker (with an ✕) so you can accept it as a section or delete it. This is
  the interesting bit for files **02, 03, and 04**, whose structure is carried by headings.
- **Bold, italics, underline, bulleted and numbered lists, and block quotes carry through.**
- **Everything else is unwrapped to plain text** (paragraphs get line breaks; other
  containers are flattened) — the words are kept, the extra styling is not.
- **The table in file 04** is a deliberate degradation test: its cells should become
  readable text, not vanish. Watch whether the two columns stay legible or run together —
  that tells us if table-heavy notes need any special handling before launch.
- **If you paste as plain text instead** (no rich formatting available), the fallback turns
  lines ending in `:` or starting with `#` into section breaks and `- ` lines into bullets.

## What counts as a bug
If any file loses **words** (not just styling), that's worth a ticket. Losing heading
*styling* (it becomes a section break or plain line) or table *layout* is expected and fine.
Note anything where two distinct thoughts run together with no break between them.
