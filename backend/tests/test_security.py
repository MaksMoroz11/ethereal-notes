import base64
import os
from types import SimpleNamespace

import pytest
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.security import decrypt_password, public_key_info


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
