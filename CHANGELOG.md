# Changelog

All notable user-facing changes to Momentum are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and versions use [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- The completed-task timeline can browse any calendar date and now shows
  completion descriptions and notes for each timed task.
- Active timer sessions can return from Focus Mode to the workspace without
  stopping; a persistent timer bar provides the current task, countdown or
  elapsed time, and pause/resume controls on other pages.
- Completion records can be edited from chain history, including their
  description and notes.
- RSIP nodes can be edited directly from the tree, with layout and connector
  updates reflected immediately.
- Focus Mode exposes the related completion and timer controls consistently
  across its views and dialogs.

### Changed

- Daily check-in eligibility now resets at 08:00 in New York time, including
  daylight-saving transitions, instead of at the database server's UTC midnight.
- A task with an active timer cannot be deleted or have its type, timer mode,
  duration, minimum duration, or group membership changed until its session
  ends. Other task details and unrelated tasks remain editable.
- Completion-history data flows consistently through local storage, Supabase,
  import/export, and serialization.
