# Legacy Features (Deprecated)

This document tracks deprecated features that are no longer used by the UI or worker but remain in the database for now.

## Deprecated Tables

### `public.user_spot_prefs`
- **Status**: DEPRECATED
- **Reason**: Replaced by `public.alert_rules` system
- **Action**: Table retained in DB for now, will be considered for removal in future cleanup
- **External Dependencies**: None known

## Deprecated API Routes

### `/api/subscribe`
- **Status**: REMOVED
- **Reason**: Legacy UI route replaced by alert creation wizard
- **Replacement**: Use `/alerts/new` to create surf alerts
- **Action**: Route removed from codebase

## Migration Notes

- All new surf alerts should use the `public.alert_rules` table
- The worker reads from `api.v1_alert_rules` view
- Tier gating is handled via `api.v_tier_me` view
- No external integrations should depend on deprecated features

## Future Cleanup

After confirming no external dependencies exist, these deprecated features can be removed in a future release:
1. Drop `public.user_spot_prefs` table
2. Remove any remaining references in documentation
