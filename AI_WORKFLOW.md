# AI-Native Workflow Note

This project was built using an AI-native workflow, where my AI coding assistant was used as a pair programmer for the entire build.

## AI Tools Used
- **Antigravity (AI Assistant)**: For the majority of the code generation, UI layout, and architectural decisions.
- **DALL-E / Generate Image**: (If images like the logo/screenshots were generated).

## Where AI Materially Sped Up My Work
1.  **TipTap to Markdown Translation**: I used AI to quickly generate a robust `tiptapToMarkdown` helper function in the backend, which saved roughly 1 hour of manual JSON parsing and Markdown mapping.
2.  **UI Components (Vanilla CSS + Tailwind)**: AI generated the clean, modern CSS design tokens in `index.css`, allowing me to focus on the product logic rather than tweaking margins and padding for hours.
3.  **Presence Heartbeat Logic**: AI correctly implemented the SQLite `ON CONFLICT` presence logic in the backend, ensuring a robust multi-user representation without manual SQL debugging.

## What AI-Generated Output I Changed or Rejected
1.  **Modal Backdrop Blur**: The initial AI-generated modal layout was constrained by the editor's sticky header. I rejected this and implemented a **Portal-based Modal system** to ensure the backdrop blur covers the full screen regardless of the parent container.
2.  **Export Filenames**: The first version of the AI's export file logic resulted in generic filenames. I changed this to use sanitized document titles (e.g., `my_notes.md`) for a better user experience.
3.  **Underline Bug**: The AI didn't include the `@tiptap/extension-underline` in the initial StarterKit setup, which I identified as a missing requirement and explicitly corrected.

## How I Verified Correctness & implementation Reliability
- **Manual Verification**: Exhaustive testing across login, sharing, editing, and version history.
- **Automated Verification**: Implemented **Jest** unit tests for the core content translation logic (`exportMarkdown`) to ensure that bold, headers, and lists were being reliably converted.
- **Browser Testing**: Verified responsiveness across mobile viewports using Chrome DevTools.
- **Database Inspection**: Used Prisma Studio and direct SQLite queries to confirm that sharing permissions and documents were being correctly persisted at all times.
