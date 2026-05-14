# TripJournal Copilot Instructions

## Update Log

- 2026-05-12: Created this always-on guidance file `.github/copilot-instructions.md` and validated the repository build (`npm run build`) after adding it. Task confirmed completed.

## Purpose

This file contains concise, always-on guidance for Copilot-style agents working in this repository.

- Use React functional components and custom hooks only. Do not add class components.
- Keep TypeScript strict and avoid `any` unless there is no practical alternative.
- Use Tailwind CSS for styling and preserve the warm brown travel-journal aesthetic unless a task explicitly asks for a different design.
- Prefer small, targeted edits that fit the existing code style; do not refactor unrelated files.
- Handle async failures explicitly. Do not swallow errors or leave silent fallbacks.
- Favor `w-full` over `w-screen`/`100vw` in page wrappers to avoid horizontal overflow on Windows.
- Keep heavy routes and large UI pieces lazy-loaded when possible.
- For gallery work, preserve existing local-storage and media-handling patterns, and reuse the `heic2any` path where needed.
- For map and GeoJSON work, keep payloads optimized and avoid reintroducing large uncompressed assets.
- When a task touches project direction, consult `.github/instructions/DEVELOPMENT_INSTRUCTIONS.md` for the roadmap and constraints.