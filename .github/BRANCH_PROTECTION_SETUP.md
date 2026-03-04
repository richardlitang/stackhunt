# Branch Protection Setup

Last verified: 2026-03-05

This repository expects branch protection on `main`.

## Required settings

- Require a pull request before merging.
- Require status checks to pass.
- Mark `Docs Hygiene` as a required status check.
- Keep existing quality/build checks required.

## Why

This ensures doc and plan drift cannot bypass merge gates.
