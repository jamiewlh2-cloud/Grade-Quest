# TEAM_CONTEXT.md

## Project Overview

Project Name: Grade Quest

Owner: Jamie Hammill

Grade Quest is an academic productivity platform for students.

Its purpose is to help students manage coursework, assessments, resources, study sessions, academic planning, and adaptive learning.

The adaptive learning system is a feature of Grade Quest. It is not the entire product.

---

## Project Vision

Create a professional, resume-worthy product that combines academic productivity tools with adaptive learning.

Long-term workflow:

Course Materials
→ Import
→ Content Extraction
→ Question Generation
→ Adaptive Learning
→ Mastery Tracking
→ Academic Success

---

## Current Project Status

The project already contains significant functionality.

Workers must review:

- PROJECT_AUDIT.md
- ARCHITECTURE.md
- README.md

before proposing changes.

Do not assume functionality is missing without checking those documents.

---

## Source Of Truth Priority

When information conflicts, use the following order:

1. TEAM_CONTEXT.md
2. PROJECT_AUDIT.md
3. ARCHITECTURE.md
4. DESIGN_DOCUMENT.md
5. ROADMAP.md

Chat history is never the source of truth.

Project documents are the source of truth.

---

## Adaptive Learning Initiative

The adaptive learning system is currently under active development.

Authoritative documents:

- DESIGN_DOCUMENT.md
- LEARNING_ENGINE_ARCHITECTURE.md
- LEARNING_ENGINE_IMPLEMENTATION_PLAN.md

Workers must follow these documents.

Do not redesign learning behavior unless explicitly instructed.

Do not invent alternative learning models.

Do not replace deterministic logic with machine learning.

---

### Study Plan Model

A course may contain zero or more study plans.

Examples:

COMP 2712
- Midterm Review
- Final Exam Review
- Assignment Concepts

MATH 2718
- Chapter 1 Review
- Chapter 2 Review
- Final Exam Review

Study plans are independent learning environments.

Study plans own:
- questions
- objectives
- mastery
- scheduling
- analytics
- imported question banks
- AI-generated question banks

Learning progress is tracked per study plan, not per course.

Course-level metrics may be derived from study plans, but study plans are the source of truth.

---

### Question Ownership

Questions belong to exactly one study plan.

A question may be duplicated across study plans if desired,
but each copy is treated as an independent learning item.

Mastery, confidence history, scheduling,
review state, and analytics do not transfer automatically
between separate study plans.

Each study plan is an independent learning environment.

---

### Study Plan Entity

StudyPlan is a first-class entity.

Required fields:

- id
- courseId
- name
- description
- createdAt
- updatedAt
- lastStudiedAt
- archived

StudyPlan is the source of truth for:

- questions
- objectives
- responses
- mastery
- scheduling
- analytics
- study sessions
- imported question banks
- AI-generated question banks

Course-level learning metrics are derived from study plans.

Study plans are independent learning environments.

---

## Project Principles

1. Build production-quality software.
2. Prefer simple solutions over complex solutions.
3. Reuse existing Grade Quest systems whenever possible.
4. Avoid unnecessary dependencies.
5. Avoid feature duplication.
6. Keep features maintainable.
7. Keep features explainable.
8. Do not invent requirements.
9. Document major decisions.
10. Small, shippable milestones are preferred over large rewrites.

---

## Worker Rules

Before starting work:

1. Read TEAM_CONTEXT.md.
2. Read all documents relevant to the task.
3. Check whether the requested feature already exists.
4. Explain assumptions.
5. Keep changes focused.

Workers should not redesign unrelated systems.

Workers should stay within their assigned role.

---

## Resume Goal

Grade Quest should be suitable for inclusion on a professional software engineering resume.

Decisions should favor:

- maintainability
- architecture quality
- reliability
- user value
- professionalism

over novelty.