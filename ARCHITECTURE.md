# Architecture Note

This project focuses on delivering a robust, full-stack collaborative document editor within the assigned timebox. My priorities were **usability**, **clean UI/UX**, and **sound engineering standards**.

## Why this Architecture?

### **1. TipTap for Editing**
I chose **TipTap** as the core editor because it is based on **ProseMirror**, which provides excellent JSON-based structured data. This allowed me to implement advanced features like **Version History**, **Comments/Suggestions**, and **Markdown Export** with minimal complexity and high reliability.

### **2. SQLite & Prisma**
**SQLite** was chosen for its zero-setup requirement, keeping the scope manageable for a 6-hour build. **Prisma** provided type safety and a robust schema that easily handles the many-to-many relationships for shared documents and presence logic.

### **3. Roll-Your-Own UI (Vanilla CSS + Tailwind)**
To ensure a premium, modern look that stands out, I built a custom design system in `frontend/src/index.css`. This includes smooth animations, a curated color palette (Blue/Slate), and a fully responsive layout. I avoided generic pre-built component libraries to show better control over the frontend surface.

## Prioritization & Tradeoffs

### **What I Prioritized**
- **Sharing & Roles**: Documents have owners, commenters, and editors. This shows clear product intent for collaboration beyond just basic editing.
- **Exporting**: Markdown and PDF exports are crucial for a real document editor.
- **Responsiveness**: The tool works as well on a phone as it does on a desktop.

### **What I Deprioritized**
- **Real-time Collaboration (WebSockets)**: I used a lightweight **Presence Heartbeat** (3-second polling) instead of full WebSockets. This perfectly simulates the multi-user feel within the scope.
- **Full Password Authentication**: To keep the focus on the product, I implemented a "Select User" login flow with session persistence. It demonstrates the authentication intent without adding unnecessary bcrypt/JWT setup.

## Engineering Quality
- **Automated Tests**: I implemented a **Jest** testing suite in the backend specifically to verify the **Markdown Export Logic**, as it is an area where bugs in content translation are most likely to occur.
- **Error Handling**: Both frontend and backend include clear validation (e.g., ensuring owners aren't shared with themselves).
