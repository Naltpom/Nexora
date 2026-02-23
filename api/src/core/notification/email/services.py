"""SMTP email sender service."""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from ...config import settings
from ...i18n.translations import t

logger = logging.getLogger(__name__)


class SmtpEmailSender:
    """SMTP implementation for sending emails."""

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _send(self, to_email: str, subject: str, html_body: str) -> bool:
        """Low-level SMTP send shared by every public method."""
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
            msg["To"] = to_email
            msg.attach(MIMEText(html_body, "html", "utf-8"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                if settings.SMTP_USE_TLS:
                    server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], msg.as_string())

            return True
        except Exception as e:
            logger.error("SMTP send failed to %s: %s", to_email, str(e))
            return False

    # ------------------------------------------------------------------
    # Public methods
    # ------------------------------------------------------------------

    def send_notification(
        self,
        to_email: str,
        to_name: str,
        title: str,
        body: str | None,
        link: str | None,
        locale: str = "fr",
    ) -> bool:
        if not settings.EMAIL_ENABLED:
            logger.warning("Email disabled — skipping notification email to %s", to_email)
            return False

        link_html = ""
        if link:
            full_link = f"{settings.FRONTEND_URL}{link}"
            link_html = f"""
                <div style="text-align: center; margin: 24px 0;">
                    <a href="{full_link}" style="background: #1E40AF; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                        {t("email.notification_action", locale)}
                    </a>
                </div>
        """

        subject = f"{settings.SMTP_FROM_NAME} - {title}"
        html_body = f"""
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F3F4F6; padding: 40px 0;">
        <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background: #1E40AF; padding: 24px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 20px;">{settings.SMTP_FROM_NAME}</h1>
            </div>
            <div style="padding: 32px;">
                <p style="color: #374151; font-size: 15px;">{t("email.greeting", locale, name=to_name)}</p>
                <p style="color: #374151; font-size: 15px; font-weight: 600;">{title}</p>
                <p style="color: #374151; font-size: 15px;">{body}</p>
                {link_html}
            </div>
            <div style="background: #F9FAFB; padding: 16px; text-align: center; border-top: 1px solid #E5E7EB;">
                <p style="color: #9CA3AF; font-size: 12px; margin: 0;">{settings.SMTP_FROM_NAME} - {t("email.footer", locale)}</p>
            </div>
        </div>
    </body>
    </html>
    """

        ok = self._send(to_email, subject, html_body)
        if ok:
            logger.info("Notification email sent to %s: %s", to_email, title)
        else:
            logger.error("Failed to send notification email to %s: %s", to_email, str(title))
        return ok

    def send_reset_password(
        self,
        to_email: str,
        to_name: str,
        reset_token: str,
        *,
        initiated_by_user: bool = False,
        locale: str = "fr",
    ) -> bool:
        if not settings.EMAIL_ENABLED:
            logger.warning("Email disabled — skipping reset password email to %s", to_email)
            return False

        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

        if initiated_by_user:
            intro_text = t("email.reset_password_intro_user", locale)
        else:
            intro_text = t("email.reset_password_intro_admin", locale)

        subject = f"{settings.SMTP_FROM_NAME} - {t('email.reset_password_subject', locale)}"
        html_body = f"""
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F3F4F6; padding: 40px 0;">
        <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background: #1E40AF; padding: 24px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 20px;">{settings.SMTP_FROM_NAME}</h1>
            </div>
            <div style="padding: 32px;">
                <p style="color: #374151; font-size: 15px;">{t("email.greeting", locale, name=to_name)}</p>
                <p style="color: #374151; font-size: 15px;">{intro_text}</p>
                <p style="color: #374151; font-size: 15px;">{t("email.reset_password_cta", locale)}</p>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="{reset_url}" style="background: #1E40AF; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
                        {t("email.reset_password_action", locale)}
                    </a>
                </div>
                <p style="color: #6B7280; font-size: 13px;">{t("email.reset_password_expiry", locale)}</p>
                <p style="color: #6B7280; font-size: 13px;">{t("email.reset_password_fallback", locale)}</p>
                <p style="color: #3B82F6; font-size: 12px; word-break: break-all;">{reset_url}</p>
            </div>
            <div style="background: #F9FAFB; padding: 16px; text-align: center; border-top: 1px solid #E5E7EB;">
                <p style="color: #9CA3AF; font-size: 12px; margin: 0;">{settings.SMTP_FROM_NAME} - {t("email.footer", locale)}</p>
            </div>
        </div>
    </body>
    </html>
    """

        ok = self._send(to_email, subject, html_body)
        if ok:
            logger.info("Reset password email sent to %s", to_email)
        else:
            logger.error("Failed to send reset password email to %s", to_email)
        return ok

    def send_invitation(
        self,
        to_email: str,
        invited_by_name: str,
        invitation_token: str,
        locale: str = "fr",
    ) -> bool:
        if not settings.EMAIL_ENABLED:
            logger.warning("Email disabled — skipping invitation email to %s", to_email)
            return False

        invitation_url = f"{settings.FRONTEND_URL}/invitation/{invitation_token}"

        subject = f"{settings.SMTP_FROM_NAME} - {t('email.invitation_subject', locale)}"
        html_body = f"""
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F3F4F6; padding: 40px 0;">
        <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background: #1E40AF; padding: 24px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 20px;">{settings.SMTP_FROM_NAME}</h1>
            </div>
            <div style="padding: 32px;">
                <p style="color: #374151; font-size: 15px;">{t("email.greeting_generic", locale)}</p>
                <p style="color: #374151; font-size: 15px;">{t("email.invitation_intro", locale, name=invited_by_name)}</p>
                <p style="color: #374151; font-size: 15px;">{t("email.invitation_cta", locale)}</p>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="{invitation_url}" style="background: #1E40AF; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
                        {t("email.invitation_action", locale)}
                    </a>
                </div>
                <p style="color: #6B7280; font-size: 13px;">{t("email.invitation_expiry", locale)}</p>
                <p style="color: #6B7280; font-size: 13px;">{t("email.invitation_fallback", locale)}</p>
                <p style="color: #3B82F6; font-size: 12px; word-break: break-all;">{invitation_url}</p>
            </div>
            <div style="background: #F9FAFB; padding: 16px; text-align: center; border-top: 1px solid #E5E7EB;">
                <p style="color: #9CA3AF; font-size: 12px; margin: 0;">{settings.SMTP_FROM_NAME} - {t("email.footer", locale)}</p>
            </div>
        </div>
    </body>
    </html>
    """

        ok = self._send(to_email, subject, html_body)
        if ok:
            logger.info("Invitation email sent to %s", to_email)
        else:
            logger.error("Failed to send invitation email to %s", to_email)
        return ok

    def send_verification_code(
        self,
        to_email: str,
        to_name: str,
        verification_code: str,
        locale: str = "fr",
    ) -> bool:
        if not settings.EMAIL_ENABLED:
            logger.warning("Email disabled — skipping verification code email to %s", to_email)
            return False

        subject = f"{settings.SMTP_FROM_NAME} - {t('email.verification_subject', locale)}"
        html_body = f"""
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F3F4F6; padding: 40px 0;">
        <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background: #1E40AF; padding: 24px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 20px;">{settings.SMTP_FROM_NAME}</h1>
            </div>
            <div style="padding: 32px;">
                <p style="color: #374151; font-size: 15px;">{t("email.greeting", locale, name=to_name)}</p>
                <p style="color: #374151; font-size: 15px;">{t("email.verification_intro", locale)}</p>
                <div style="text-align: center; margin: 32px 0;">
                    <div style="background: #F3F4F6; padding: 20px 40px; border-radius: 8px; display: inline-block;">
                        <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1E40AF;">{verification_code}</span>
                    </div>
                </div>
                <p style="color: #6B7280; font-size: 13px; text-align: center;">{t("email.verification_expiry", locale)}</p>
            </div>
            <div style="background: #F9FAFB; padding: 16px; text-align: center; border-top: 1px solid #E5E7EB;">
                <p style="color: #9CA3AF; font-size: 12px; margin: 0;">{settings.SMTP_FROM_NAME} - {t("email.footer", locale)}</p>
            </div>
        </div>
    </body>
    </html>
    """

        ok = self._send(to_email, subject, html_body)
        if ok:
            logger.info("Verification code email sent to %s", to_email)
        else:
            logger.error("Failed to send verification code email to %s", to_email)
        return ok


def get_email_sender() -> SmtpEmailSender:
    """Factory function for obtaining an email sender instance."""
    return SmtpEmailSender()
