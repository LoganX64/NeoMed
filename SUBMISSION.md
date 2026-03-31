# NeoMed Collaborative Editor Submission

This document lists the included materials for the AI-Native Full Stack Developer assignment.

## Included Files & Directories

### Source Code
- `/frontend`: React application (Vite, TipTap, Tailwind v4).
- `/backend`: Node.js/Express application (Prisma, SQLite).
- `/backend/prisma`: Database schema and seed data.

### Documentation (Root)
- `README.md`: Setup and run instructions.
- `ARCHITECTURE.md`: Technical prioritization and tradeoffs.
- `AI_WORKFLOW.md`: Documentation of AI-assisted development.
- `SUBMISSION.md`: This file.

### Required Reports & Logic
- **Automated Tests**: Located in `backend/tests/export.test.js`. Run with `npm test` in the backend folder.
- **Sharing Model**: Logic in `backend/src/controllers/shareController.js` and `Editor.jsx`.
- **Underline Support**: Verified in `Editor.jsx` (TipTap Extension-Underline).

## Test Accounts
The application includes a pre-seeded set of users for demonstrating sharing:
1.  **Alice** (Owner)
2.  **Bob** (Collaborator)
3.  **Charlie** (Collaborator)

You can select any of these during the login flow to test the different permission views.

## What is Working End-to-End
- Full document CRUD (Create, Read, Update, Delete).
- Role-based permissions (delete button only visible to owners).
- Markdown export and Print-to-PDF.
- Commenting and Suggestion mode.
- Version history with point-in-time restore.
- Real-time presence heartbeat (updates every 3 seconds).
- File import for `.txt` and `.md`.

## What I Would Build Next (2-4 hours)
1.  **WebSockets for Cursor Tracking**: Replace the polling heartbeat with a real-time WebSocket connection for cursor movement and typing indicators.
2.  **Image Uploading**: Integrate a cloud storage service (e.g., AWS S3 or Cloudinary) to allow embedding images directly in documents.
3.  **Rich Search**: Implement full-text search across all documents using SQLite's FTS5 extension.
4.  **JWT Auth**: Replace the simple session-based demo login with a secure JWT + Bcrypt authentication system.
