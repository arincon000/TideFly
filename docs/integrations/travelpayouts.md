# Travelpayouts Integration

This document describes the Travelpayouts site verification integration for TideFly.

## Overview

Travelpayouts site verification is implemented via a JavaScript snippet that loads on every page when enabled. This allows Travelpayouts to verify site ownership and track affiliate conversions.

## Environment Configuration

The integration is controlled by the `NEXT_PUBLIC_TP_VERIFY` environment variable:

- `NEXT_PUBLIC_TP_VERIFY=true` - Enables the verification snippet
- `NEXT_PUBLIC_TP_VERIFY=false` or unset - Disables the verification snippet

## Vercel Environment Setup

### Production
```
NEXT_PUBLIC_TP_VERIFY=true
```

### Preview/Development
```
NEXT_PUBLIC_TP_VERIFY=false
```
(Or leave unset)

## Implementation Details

- **Router**: App Router (`/app/layout.tsx`)
- **Strategy**: `beforeInteractive` for optimal loading
- **Script ID**: `tp-verify` for easy identification
- **Source**: `https://emrld.ltd/NDU2MzAx.js?t=456301`

## Verification Steps

1. Set `NEXT_PUBLIC_TP_VERIFY=true` in Vercel production environment
2. Deploy to production
3. In Travelpayouts dashboard, click "Confirm" to verify site ownership
4. The verification should succeed automatically

## Troubleshooting

- **Script not loading**: Check that `NEXT_PUBLIC_TP_VERIFY=true` is set in production
- **Verification fails**: Ensure the script loads by checking page source for `<script id="tp-verify">`
- **CSP issues**: If you have Content Security Policy configured, add `https://emrld.ltd` to `script-src`

## Security Notes

- The script only loads when explicitly enabled via environment variable
- No sensitive data is exposed in the verification snippet
- The integration respects user privacy and only tracks affiliate conversions
