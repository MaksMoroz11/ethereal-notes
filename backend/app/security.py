import secrets
import base64
import hashlib
from functools import lru_cache
from pathlib import Path

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SESSION_TTL_HOURS = 24


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)


def generate_token() -> str:
    return secrets.token_urlsafe(32)


@lru_cache(maxsize=1)
def _private_key():
    path = Path(settings.auth_private_key_file)
    if path.exists():
        return serialization.load_pem_private_key(path.read_bytes(), password=None)
    path.parent.mkdir(parents=True, exist_ok=True)
    key = rsa.generate_private_key(public_exponent=65537, key_size=3072)
    encoded = key.private_bytes(serialization.Encoding.PEM,
                                serialization.PrivateFormat.PKCS8,
                                serialization.NoEncryption())
    path.write_bytes(encoded)
    path.chmod(0o600)
    return key


def public_key_info() -> dict[str, str]:
    public = _private_key().public_key().public_bytes(
        serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
    return {"key_id": hashlib.sha256(public).hexdigest(),
            "public_key": base64.b64encode(public).decode("ascii")}


def decrypt_password(data) -> str:
    if data.key_id != public_key_info()["key_id"]:
        raise ValueError("Ключ шифрования устарел")
    try:
        wrapped_key = base64.b64decode(data.encrypted_key, validate=True)
        nonce = base64.b64decode(data.nonce, validate=True)
        ciphertext = base64.b64decode(data.encrypted_password, validate=True)
        if len(nonce) != 12:
            raise ValueError("Некорректный запрос")
        aes_key = _private_key().decrypt(
            wrapped_key,
            padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()),
                         algorithm=hashes.SHA256(), label=None),
        )
        return AESGCM(aes_key).decrypt(nonce, ciphertext, None).decode("utf-8")
    except Exception as exc:
        raise ValueError("Некорректный зашифрованный пароль") from exc
