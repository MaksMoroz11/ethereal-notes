import base64
import os
from types import SimpleNamespace

import pytest
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.security import decrypt_password, public_key_info
from app.security import hash_password, verify_password, verify_and_update_password
from passlib.context import CryptContext


def test_password_envelope_round_trip():
    info = public_key_info()
    public_key = serialization.load_der_public_key(base64.b64decode(info["public_key"]))
    aes_key = os.urandom(32)
    nonce = os.urandom(12)
    password = "секретный пароль с длинным текстом" * 20
    wrapped = public_key.encrypt(aes_key, padding.OAEP(
        mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None))
    envelope = SimpleNamespace(
        key_id=info["key_id"],
        encrypted_key=base64.b64encode(wrapped).decode(),
        nonce=base64.b64encode(nonce).decode(),
        encrypted_password=base64.b64encode(AESGCM(aes_key).encrypt(nonce, password.encode(), None)).decode(),
    )
    assert decrypt_password(envelope) == password
    envelope.key_id = "invalid"
    with pytest.raises(ValueError):
        decrypt_password(envelope)


def test_long_password_suffix_is_significant():
    first = "a" * 72 + "first"
    second = "a" * 72 + "second"
    hashed = hash_password(first)
    assert verify_password(first, hashed)
    assert not verify_password(second, hashed)


def test_legacy_hash_can_be_verified_and_upgraded():
    legacy = CryptContext(schemes=["bcrypt"]).hash("Existing123!")
    valid, upgraded = verify_and_update_password("Existing123!", legacy)
    assert valid and upgraded and upgraded.startswith("$bcrypt-sha256$")
    assert verify_password("Existing123!", upgraded)
    assert verify_and_update_password("wrong", legacy) == (False, None)
