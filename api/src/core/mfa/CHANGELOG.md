# MFA Feature Changelog

## 2026.02.19

- Chiffrement Fernet du secret TOTP avant stockage, dechiffrement avant verification (W6/T4)
- CHECK constraint JSONB sur `mfa_role_policies.allowed_methods` (T7)

## 2026.02.2

- MFA enforcement : detection `mfa_setup_required` + `mfa_grace_period_expires` dans TokenResponse
- Frontend : MFAForceSetupPage (page bloquante apres grace period), MFASetupBanner (banner d'avertissement)
- LoginPage : redirection selon etat grace period (banner ou force-setup)
- ProtectedRoute : blocage navigation si grace period expiree
- Layout : affichage conditionnel du MFASetupBanner
- MFASetupPage : appel `clearMfaSetupRequired()` apres activation d'une methode

## 2026.02.1 (2026-02-20)
- Implementation initiale
- Support TOTP (application authenticator)
- Support Email OTP
- Codes de secours (backup codes)
- Policy MFA par role avec periode de grace
- Configuration MFA dans le profil utilisateur
- Page admin de gestion des policies MFA
