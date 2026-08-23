# Changelog

All notable user-facing changes to Momentum are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and versions use [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Completion records can be edited from chain history, including their
  description and notes.
- RSIP nodes can be edited directly from the tree, with layout and connector
  updates reflected immediately.
- Focus Mode exposes the related completion and timer controls consistently
  across its views and dialogs.

### Changed

- Completion-history data flows consistently through local storage, Supabase,
  import/export, and serialization.
