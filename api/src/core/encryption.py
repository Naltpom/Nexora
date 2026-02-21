"""Fernet-based field encryption for sensitive data at rest.

Usage:
    from .encryption import encrypt_value, decrypt_value

    encrypted = encrypt_value("my_secret")
    plaintext = decrypt_value(encrypted)
"""

from cryptography.fernet import Fernet

from .config import settings


def _get_fernet() -> Fernet:
    """Get Fernet instance using the application's encryption key."""
    key = settings.ENCRYPTION_KEY
    if not key:
        raise RuntimeError(
            "ENCRYPTION_KEY is not set. Generate one with: "
            "python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
        )
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_value(plaintext: str) -> str:
    """Encrypt a string value and return base64-encoded ciphertext."""
    f = _get_fernet()
    return f.encrypt(plaintext.encode()).decode()


def decrypt_value(ciphertext: str) -> str:
    """Decrypt a Fernet-encrypted value back to plaintext."""
    f = _get_fernet()
    return f.decrypt(ciphertext.encode()).decode()


def is_encrypted(value: str) -> bool:
    """Heuristic check: Fernet tokens start with 'gAAAAA'."""
    return value.startswith("gAAAAA")
