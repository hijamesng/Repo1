# EmotiFlow — Project TODO

## Backend
- [x] Add emotionalEntries table to drizzle/schema.ts
- [x] Run pnpm db:push to migrate schema
- [x] Add DB query helpers in server/db.ts
- [x] Add tRPC router: entries.create, entries.list, entries.getById, entries.delete, entries.stats, entries.recent

## Frontend
- [x] Set up warm earth-tone theme in index.css and index.html (Google Fonts)
- [x] Build Landing/Home page with login CTA
- [x] Build DashboardLayout integration with sidebar nav
- [x] Build Dashboard page: recent entries, streak/progress indicators
- [x] Build New Entry guided form page (step-by-step: Domain, Goal, Intention, Trigger, Emotion Felt, Behaviour, Alternate Response)
- [x] Build History Log page: list all past entries with filters
- [x] Build Entry Detail view
- [x] Wire all pages to tRPC backend
- [x] Mobile-responsive layout

## Quality
- [x] Write vitest tests for entries router (8 tests passing)
- [x] Verify all routes and auth guards
- [x] Final UI polish and accessibility check

## Changes
- [x] Remove metrics cards (Total Entries, Day Streak, This Week, Domains Tracked) from Dashboard
- [x] Add rotating daily reflection prompt to Dashboard
- [x] Add keyword search bar to History page
- [x] Add warm header image to Dashboard
- [x] Show all fields in emotion entry cards (Dashboard + History)
