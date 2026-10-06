# Security Policy

## Scope

This repository holds the static web client for Bureau. On-chain programs, when published, will carry their own policy.

## Reporting

Report suspected vulnerabilities privately to the maintainers through the contact channel listed on the project site once it is published. Please do not open a public issue for a security problem.

Include a description, steps to reproduce and the affected path. We acknowledge reports promptly and will credit reporters who want credit.

## What counts

- Script injection or content security policy bypass
- Data leaving the page to an origin outside the policy
- A rendered link or address that differs from the register record
- Any path that makes an inert control active without a stated record

## Out of scope

Third-party feed outages or incorrect upstream data, and attacks that require control of a visitor's device.

## Hardening already in place

A strict content security policy, no inline code, no storage use, no third-party scripts, and links that open with `noopener noreferrer`.
