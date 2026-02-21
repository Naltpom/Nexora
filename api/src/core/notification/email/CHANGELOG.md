# notification.email — Changelog

## 2026.02.26

- Suppression permission morte `notification.email.send`

## 2026.02.2

- Ajout fonction factory `get_email_sender()` pour instancier `SmtpEmailSender`

## 2026.02.1 — Init

- Envoi d'emails via SMTP configurable (host, port, TLS, credentials)
- Support Office365 par defaut
- Renvoi d'emails en cas d'echec
- Configurable via .env (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_ENABLED)
