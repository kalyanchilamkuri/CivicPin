"""Email OTP issuing, verification and delivery.

Codes live in Django's cache (locmem by default, so a single process; point
CACHES at Redis/Memcached for a multi-worker deployment). Delivery goes through
Resend when `RESEND_API_KEY` is configured; without it, development falls back
to the fixed code `123456` and production refuses to issue a code at all.
"""

import logging
import secrets

from django.conf import settings
from django.core.cache import cache
import requests

logger = logging.getLogger(__name__)

DEV_FALLBACK_OTP = '123456'
RESEND_ENDPOINT = 'https://api.resend.com/emails'


def _code_key(email):
    return f'otp:code:{email.strip().lower()}'


def _verified_key(email):
    return f'otp:verified:{email.strip().lower()}'


def generate_code():
    """A cryptographically strong 6-digit code (100000-999999)."""
    return str(secrets.randbelow(900000) + 100000)


def store_code(email, code):
    cache.set(_code_key(email), code, timeout=settings.OTP_TTL_SECONDS)


def peek_code(email):
    return cache.get(_code_key(email))


def _attempts_key(email):
    return f'otp:attempts:{email.strip().lower()}'


def discard_code(email):
    cache.delete(_code_key(email))
    cache.delete(_attempts_key(email))


def _record_failed_attempt(email):
    """Count a wrong guess; returns True once the code has been burned."""
    key = _attempts_key(email)
    cache.add(key, 0, timeout=settings.OTP_TTL_SECONDS)
    try:
        attempts = cache.incr(key)
    except ValueError:  # entry expired between add() and incr()
        attempts = 1
    if attempts >= settings.OTP_MAX_ATTEMPTS:
        discard_code(email)
        return True
    return False


def mark_verified(email):
    # Verification stays valid a little longer than the code itself so a user
    # has time to finish filling in the signup form.
    cache.set(
        _verified_key(email), True, timeout=max(settings.OTP_TTL_SECONDS, 900)
    )


def is_verified(email):
    return bool(cache.get(_verified_key(email)))


def clear_verified(email):
    cache.delete(_verified_key(email))


def otp_email_html(code):
    return f"""
<div style="background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); padding: 40px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="480" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12); overflow: hidden; margin: 0 auto;">
          <tr>
            <td style="background: linear-gradient(90deg, #3a7bd5 0%, #00d2ff 100%); padding: 30px 0; text-align: center;">
              <h1 style="color: #ffffff; font-size: 24px; margin: 0; letter-spacing: 1px; font-weight: 600;">CivicPin</h1>
              <p style="color: rgba(255, 255, 255, 0.95); font-size: 13px; margin: 6px 0 0;">Email verification</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 50px 30px;">
              <p style="font-size: 16px; color: #444444; margin-top: 0;">Hello,</p>
              <p style="font-size: 16px; color: #555555;">Use the code below to verify your email address:</p>
              <div style="text-align: center; margin: 30px 0;">
                <span style="display: inline-block; background: #f8f9fa; border-radius: 10px; font-size: 36px; font-weight: 700; letter-spacing: 8px; padding: 15px 30px; color: #333; font-family: 'Courier New', monospace;">
                  {code}
                </span>
              </div>
              <p style="font-size: 14px; color: #555555; text-align: center;">This code expires in <strong>5 minutes</strong>.</p>
              <p style="font-size: 14px; color: #888888;">If you didn't request this, you can safely ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td style="background: #f5f7fa; padding: 20px 50px; text-align: center; border-top: 1px solid #eaeaea;">
              <p style="font-size: 12px; color: #888888; margin: 0;">&copy; CivicPin. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
"""


def otp_email_text(code):
    return f"""
CIVICPIN EMAIL VERIFICATION

Use this code to verify your email: {code}

This code expires in 5 minutes.

If you didn't request this code, you can safely ignore this email.
"""


def send_via_resend(email, code):
    """Send the OTP email. Raises RuntimeError when delivery fails."""
    response = requests.post(
        RESEND_ENDPOINT,
        headers={
            'Authorization': f'Bearer {settings.RESEND_API_KEY}',
            'Content-Type': 'application/json',
        },
        json={
            'from': settings.RESEND_FROM_EMAIL,
            'to': [email],
            'subject': '🔑 Your CivicPin Verification Code',
            'html': otp_email_html(code),
            'text': otp_email_text(code),
        },
        timeout=15,
    )
    if response.status_code >= 400:
        raise RuntimeError(
            f'Resend returned {response.status_code}: {response.text[:200]}'
        )
    return response.json() if response.content else {}


def issue_code(email):
    """Create, store and deliver a code.

    Returns `(message, error)`; exactly one of the two is None.
    """
    email = email.strip().lower()
    clear_verified(email)

    if not settings.RESEND_API_KEY:
        if not settings.DEBUG:
            return None, (
                'Email service is not configured. Please try again later.'
            )
        store_code(email, DEV_FALLBACK_OTP)
        cache.delete(_attempts_key(email))
        logger.warning(
            'RESEND_API_KEY not configured. Bypassing email delivery; '
            'OTP is set to %s',
            DEV_FALLBACK_OTP,
        )
        return (
            'OTP sent successfully (mocked for development. Use 123456)',
            None,
        )

    code = generate_code()
    store_code(email, code)
    cache.delete(_attempts_key(email))

    if settings.DEBUG:
        logger.debug('OTP for %s: %s', email, code)

    try:
        send_via_resend(email, code)
    except Exception as exc:  # noqa: BLE001 - surfaced to the caller as a message
        discard_code(email)
        logger.error('OTP sending error: %s', exc)
        return None, 'Failed to send OTP. Please try again later.'

    return 'OTP sent successfully', None


def verify_code(email, submitted):
    """Check a submitted code. Returns `(verified, error)`."""
    email = email.strip().lower()
    stored = peek_code(email)

    if stored is None:
        # Either never requested, or the cache entry has already expired.
        return False, 'OTP has expired or was never requested. Please request a new one.'

    if not secrets.compare_digest(
        str(submitted).strip().encode(), str(stored).encode()
    ):
        if _record_failed_attempt(email):
            return False, 'Too many incorrect attempts. Please request a new OTP.'
        return False, 'Invalid OTP'

    cache.delete(_attempts_key(email))
    mark_verified(email)
    return True, None
