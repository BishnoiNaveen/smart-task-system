# Smart Task & Reminder System

A premium, full-stack productivity web application built using **Next.js 14 (App Router)**, **Prisma ORM**, **SQLite**, and **Vanilla CSS**. This system enables employees to manage tasks, assign priorities, group activities under categories, receive startup task warnings, and schedule recurring workloads.

---

## Technical Stack & Architectural Decisions

1. **Framework:** **Next.js 14 App Router** provides unified server-side rendering, client routing, middleware route guard integration, and API route handlers in a single package.
2. **Database & ORM:** **Prisma ORM** with **SQLite** allows zero-setup local deployment. In Prisma 7, Rust engines are replaced with dynamic driver adapters, which we configure using `@prisma/adapter-better-sqlite3`.
3. **Styling:** Formulated using **Vanilla CSS Custom Properties** for lightweight rendering, robust scoping, and responsive styling. It defaults to a modern, dark-mode-first glassmorphic user experience.
4. **Authentication:** Signed **JWT tokens** stored in HTTP-only cookies prevent client-side script tampering and secure backend endpoints. Next.js `middleware.ts` acts as a route guard.

---

## Core Features Implemented

*   **User Authentication:** Fully secure Registration and Login with password hashing (`bcryptjs`) and session persistence.
*   **Smart Prioritization:** Tasks are scored using an urgency and priority level formula:
    $$\text{Priority Score} = \text{Priority Weight} + \text{Urgency Points}$$
    *   *Priority weights:* Low (10), Medium (20), High (30)
    *   *Urgency points:* Overdue (50 + day scaling), Due Today (40), Due Tomorrow (25), 3 days (15), 7 days (5).
*   **Kanban Board:** A visual drag-and-drop workspace using HTML5 Drag and Drop API (zero external library bloat) with status columns (*To Do*, *In Progress*, *Completed*).
*   **Startup Reminder & Alert Digests:** Automatically alerts users of pending today/overdue tasks on startup and sends a mock email digest.
*   **Task Categories (Bonus):** Color-coded category tags to group and filter activities.
*   **Dark & Light Modes (Bonus):** Instant visual toggle synchronized across client localstorage and rendering lifecycles.
*   **Recurring Tasks (Bonus):** Automatically schedules the next task instance (Daily, Weekly, Monthly) on completion.
*   **Email Reminder Digests (Bonus):** Mock digest email trigger and manual notification action button.

---

## Project Setup Instructions

### Prerequisites
*   Node.js (v18.0.0 or higher)
*   npm (v9.0.0 or higher)

### Installation

1. Clone or download this project repository.
2. Open terminal in the project directory and install dependencies:
   ```bash
   npm install
   ```

### Database Initialization

1. Build the local SQLite database file and run migration:
   ```bash
   npx prisma migrate dev --name init
   ```
2. Generate the local Prisma Client bindings:
   ```bash
   npx prisma generate
   ```

### Running the Application

1. Spin up the development server:
   ```bash
   npm run dev
   ```
2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```
3. Click **Sign Up** to create an account, login, and start managing tasks!

---

## API Documentation

All request payloads and responses use standard JSON format.

### 1. Authentication Endpoints

*   **`POST /api/auth/register`**
    *   *Payload:* `{ "email": "user@co.com", "password": "secure123", "name": "Naveen" }`
    *   *Response:* `201 Created` with User object, sets signed session cookie.
*   **`POST /api/auth/login`**
    *   *Payload:* `{ "email": "user@co.com", "password": "secure123" }`
    *   *Response:* `200 OK` with User object, sets signed session cookie.
*   **`POST /api/auth/logout`**
    *   *Response:* `200 OK`, clears the session cookie.
*   **`GET /api/auth/me`**
    *   *Response:* `200 OK` with `{ "user": { "id": "...", "email": "..." } }` (or null if unauthenticated).

### 2. Task Endpoints

*   **`GET /api/tasks`**
    *   *Response:* `200 OK` with list of user's tasks, pre-sorted by Priority Score.
*   **`POST /api/tasks`**
    *   *Payload:*
        ```json
        {
          "title": "Build Web App",
          "description": "Complete Next.js implementation",
          "dueDate": "2026-07-25T00:00:00.000Z",
          "priority": "HIGH",
          "status": "TODO",
          "recurring": "WEEKLY",
          "categoryId": "optional-category-uuid"
        }
        ```
    *   *Response:* `201 Created` with created Task object.
*   **`PUT /api/tasks`**
    *   *Payload:* `{ "id": "task-uuid", "status": "IN_PROGRESS" }` (any field can be updated).
    *   *Response:* `200 OK` with updated Task object.
*   **`DELETE /api/tasks?id={task-uuid}`**
    *   *Response:* `200 OK` with success message.

### 3. Category Endpoints

*   **`GET /api/categories`**
    *   *Response:* `200 OK` with user's categories list.
*   **`POST /api/categories`**
    *   *Payload:* `{ "name": "Work", "color": "#6366f1" }`
    *   *Response:* `201 Created` with created Category object.
*   **`DELETE /api/categories?id={category-uuid}`**
    *   *Response:* `200 OK` with success confirmation.

---

## Verification & Testing

Verify system installation and calculations by running our check script:
```bash
node verify-db.js
```
This script asserts:
1. Client generation correctness.
2. Connection to SQLite database.
3. Logical calculation checks for the Priority Score formula.
