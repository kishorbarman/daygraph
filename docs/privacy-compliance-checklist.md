# DayGraph Privacy Compliance Checklist

Date: March 22, 2026

- [x] Firestore rules enforce user-level isolation (`request.auth.uid == uid`).
- [x] Auth required for app usage and all callable function endpoints.
- [x] Public privacy policy page published at `/privacy.html`.
- [x] In-app link to privacy policy is visible from authenticated shell.
- [x] User can edit/delete logged activities.
- [x] AI telemetry stores operational metadata only (no cross-user sharing).
- [x] Service worker and offline shell do not expose private data without auth.
- [ ] Data export workflow documented for support operations.
- [ ] Account deletion self-serve workflow (future enhancement).
