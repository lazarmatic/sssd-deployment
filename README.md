# SSSD 2026 — Project Repository

| Field | Value |
|---|---|
| Student | Lazar Matic |
| Student ID | `23004165` |

---

## Welcome

Welcome, **Lazar Matic**. This is your personal project repository for the
**Secure Software System Design (SSSD)** course, academic year 2026.

All project-related code, documentation, and deliverables must be submitted
exclusively through this repository. Commits made outside this repository will
**not** be considered for grading.

---

## Submission Guidelines

### General

- Organise your code clearly — use meaningful folder names and file names.
- Write descriptive commit messages (e.g. `feat: add user authentication module`).
- Do **not** commit sensitive data such as passwords, API keys, or personal credentials.
- Keep the repository **private**; do not share access with other students.

### Secrets and Environment Variables

- All required secrets must be defined in `.env.example`.
- Do **not** push `.env` to the repository.
- Pushing `.env` will result in **-2 points** for each milestone where it is present at the time of submission.

### Branch and Pull Request Workflow

- Each milestone must be implemented on a **separate branch** (e.g. `milestone1`, `milestone2`, `milestone3`).
- All milestone-related code must be committed to the corresponding milestone branch.
- Before the deadline, open a **Pull Request** and add `benjaminpeljto` as a reviewer.
- **Do not merge** the milestone branch into `main` yourself — merging unreviewed code is treated as pushing unverified code to production and will result in **0 points** for that milestone.
- Once the PR is approved, the reviewer will merge it. You may then branch off `main` for the next milestone.
- If you accidentally merge, **undo it immediately** and open a new PR.
- Late submissions will **not** be accepted; an unsubmitted milestone receives **0 points**.

> If you have not received a repository invite, or your invite has expired, contact the course assistant.

---

## Milestones

All milestones must be pushed to this repository **before 23:59 on the deadline date**.
Late submissions will not be accepted.

Requirements and deadlines: https://docs.google.com/document/d/12RdUdUohHi-H2iNTkCcqecKI0vLX8-zeJUCc9gp0WLU/edit?usp=sharing

> **Note:** The timestamp of your **last commit before the deadline** determines
> on-time submission. Make sure your work is pushed, not just committed locally.

---

## Database

For initial development, you may use a **local database** of your choice.

You will soon receive a GitHub issue on this repository containing your **production database access details**. Once you have those credentials, configure your application to connect to the provided database and document the required variables in `.env.example`.

> **Important:** For the final submission and defence, your application **must** work with the production database you have been given. If your project does not connect to and function correctly with the production database at the time of the final defence, the **entire project will be graded with 0**.

---

## Contact

For questions regarding the course or this repository, contact the course assistant.

---
