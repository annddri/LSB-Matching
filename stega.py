import io
import os
import base64
import hashlib
import struct
import numpy as np
from PIL import Image
from flask import Flask, render_template, request, jsonify
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from evaluasi import evaluasi, histogram_data  # modul Orang 3

app = Flask(__name__, template_folder="templates", static_folder="static")
app.config["MAX_CONTENT_LENGTH"] = 20 * 1024 * 1024  # 2 gambar x 10 MB (halaman evaluasi)

# Urutan kunci JSON dipertahankan (histogram: R, G, B, Gray), tidak diurutkan abjad.
app.config["JSON_SORT_KEYS"] = False        # Flask < 2.3
if hasattr(app, "json"):
    app.json.sort_keys = False              # Flask >= 2.2

MAGIC_HEADER = b"LSBM"


# =====================================
# 1. ENKRIPSI & DEKRIPSI (AES-256-GCM)
# =====================================
def derive_key(password: str, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100_000,
    )
    return kdf.derive(password.encode("utf-8"))


def encrypt_message(plaintext: str, password: str) -> bytes:
    salt = os.urandom(16)
    nonce = os.urandom(12)
    key = derive_key(password, salt)
    ciphertext = AESGCM(key).encrypt(nonce, plaintext.encode("utf-8"), None)
    # Format: MAGIC (4B) + SALT (16B) + NONCE (12B) + CIPHERTEXT
    return MAGIC_HEADER + salt + nonce + ciphertext


def decrypt_message(payload: bytes, password: str) -> str:
    if len(payload) < 32 or payload[:4] != MAGIC_HEADER:
        raise ValueError("Payload tidak valid atau password salah.")
    salt = payload[4:20]
    nonce = payload[20:32]
    ciphertext = payload[32:]
    key = derive_key(password, salt)
    plaintext = AESGCM(key).decrypt(nonce, ciphertext, None)
    return plaintext.decode("utf-8")


# =====================================
# 2. LSB MATCHING (±1) EMBED & EXTRACT
# =====================================
SALT_POSISI = b"lsbm-posisi-v1"  # tetap: salt acak tidak bisa dipakai karena disimpan di posisi yang ditentukan seed ini


def get_rng(password: str) -> np.random.Generator:
    # KDF lambat (scrypt) agar menebak password lewat posisi piksel tetap mahal
    seed_bytes = hashlib.scrypt(password.encode("utf-8"), salt=SALT_POSISI,
                                n=2**14, r=8, p=1, dklen=8)
    return np.random.default_rng(int.from_bytes(seed_bytes, "big"))


def _siapkan_embed(image: Image.Image, secret_bytes: bytes, password: str):
    """Langkah yang SAMA untuk semua metode embed: piksel, bit, dan posisi.
    Dengan begitu LSB Matching dan LSB Replacement memakai bit dan posisi piksel
    yang identik; perbedaannya hanya pada aturan mengubah nilai piksel."""
    rgb_img = image.convert("RGB")
    width, height = rgb_img.size
    flat_pixels = np.array(rgb_img, dtype=np.int16).flatten()

    # Simpan panjang byte payload (4 byte big-endian) di awal
    framed_data = struct.pack(">I", len(secret_bytes)) + secret_bytes
    bits = np.unpackbits(np.frombuffer(framed_data, dtype=np.uint8))

    if len(bits) > len(flat_pixels):
        raise ValueError("Pesan terlalu panjang untuk gambar ini. Pakai gambar lebih besar atau pesan lebih pendek.")

    rng = get_rng(password)
    indices = rng.permutation(len(flat_pixels))[: len(bits)]
    directions = rng.choice([-1, 1], size=len(bits))   # hanya dipakai LSB Matching
    return flat_pixels, bits, indices, directions, (height, width)


def embed_lsbm(image: Image.Image, secret_bytes: bytes, password: str) -> Image.Image:
    """LSB Matching: bila LSB berbeda dari bit pesan, nilai piksel +1 atau -1 (acak)."""
    flat_pixels, bits, indices, directions, (height, width) = _siapkan_embed(image, secret_bytes, password)

    for idx, target_bit, step in zip(indices, bits, directions):
        val = flat_pixels[idx]
        if (val & 1) != target_bit:
            if val == 0:
                flat_pixels[idx] = 1
            elif val == 255:
                flat_pixels[idx] = 254
            else:
                flat_pixels[idx] = val + step

    stego_array = np.clip(flat_pixels, 0, 255).astype(np.uint8).reshape((height, width, 3))
    return Image.fromarray(stego_array, mode="RGB")


def embed_lsb_replacement(image: Image.Image, secret_bytes: bytes, password: str) -> Image.Image:
    """LSB Replacement: bit terakhir piksel langsung DIGANTI dengan bit pesan.
    Nilai genap hanya bisa naik, nilai ganjil hanya bisa turun (pola yang dikenali chi-square)."""
    flat_pixels, bits, indices, _, (height, width) = _siapkan_embed(image, secret_bytes, password)

    flat_pixels[indices] = (flat_pixels[indices] & 0xFE) | bits

    stego_array = flat_pixels.astype(np.uint8).reshape((height, width, 3))
    return Image.fromarray(stego_array, mode="RGB")


# Daftar metode embed: kunci -> (label, fungsi).
# Ekstraksi IDENTIK untuk semua metode (membaca LSB pada urutan yang sama),
# jadi extract_lsbm dipakai untuk gambar hasil metode mana pun.
METODE_EMBED = {
    "matching": ("LSB Matching", embed_lsbm),
    "replacement": ("LSB Replacement", embed_lsb_replacement),
}


def extract_lsbm(image: Image.Image, password: str) -> bytes:
    rgb_img = image.convert("RGB")
    flat_pixels = np.array(rgb_img, dtype=np.uint8).flatten()

    if len(flat_pixels) < 32:
        raise ValueError("Ukuran gambar terlalu kecil.")

    rng = get_rng(password)
    permutation_order = rng.permutation(len(flat_pixels))

    length_bits = flat_pixels[permutation_order[:32]] & 1
    payload_len = struct.unpack(">I", np.packbits(length_bits).tobytes())[0]

    total_bits = 32 + (payload_len * 8)
    if payload_len == 0 or total_bits > len(flat_pixels):
        raise ValueError("Tidak ada pesan valid atau password salah.")

    payload_bits = flat_pixels[permutation_order[32:total_bits]] & 1
    return np.packbits(payload_bits).tobytes()


# =====================================
# 3. ROUTES FLASK
# =====================================
@app.route("/")
def index():
    return render_template("index.html")


@app.post("/api/embed")
def api_embed():
    try:
        if "image" not in request.files:
            return jsonify({"error": "File gambar tidak ditemukan."}), 400

        file = request.files["image"]
        message = request.form.get("message", "")
        password = request.form.get("password", "")

        if not file.filename:
            return jsonify({"error": "Silakan pilih gambar terlebih dahulu."}), 400
        if not message.strip():
            return jsonify({"error": "Pesan rahasia belum diisi."}), 400
        if not password:
            return jsonify({"error": "Password enkripsi belum diisi."}), 400

        method = request.form.get("method", "matching")
        if method == "both":
            daftar_metode = ["matching", "replacement"]
        elif method in METODE_EMBED:
            daftar_metode = [method]
        else:
            return jsonify({"error": "Metode embed tidak dikenal."}), 400

        img = Image.open(file.stream)

        # Enkripsi SATU kali. Payload yang sama dipakai semua metode,
        # sehingga perbandingan antar metode adil (salt dan nonce tidak berbeda).
        encrypted_payload = encrypt_message(message, password)

        results = []
        for kunci in daftar_metode:
            label, fungsi = METODE_EMBED[kunci]
            stego_img = fungsi(img, encrypted_payload, password)

            buf = io.BytesIO()
            stego_img.save(buf, format="PNG")
            stego_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
            results.append({
                "method": kunci,
                "label": label,
                "image": f"data:image/png;base64,{stego_b64}"
            })

        return jsonify({
            "stego_image": results[0]["image"],   # kompatibel dengan versi lama
            "results": results,
            "payload_size": len(encrypted_payload)
        })
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception:
        return jsonify({"error": "Gagal memproses gambar saat embed."}), 500


@app.post("/api/extract")
def api_extract():
    try:
        if "image" not in request.files:
            return jsonify({"error": "File gambar stego tidak ditemukan."}), 400

        file = request.files["image"]
        password = request.form.get("password", "")

        if not file.filename:
            return jsonify({"error": "Silakan upload gambar stego terlebih dahulu."}), 400
        if not password:
            return jsonify({"error": "Password dekripsi belum diisi."}), 400

        stego_img = Image.open(file.stream)
        extracted_payload = extract_lsbm(stego_img, password)
        plaintext = decrypt_message(extracted_payload, password)

        return jsonify({"message": plaintext})
    except Exception:
        return jsonify({
            "error": "Gagal mengekstrak pesan. Pastikan gambar berformat PNG asli dan password benar."
        }), 400



@app.post("/api/evaluate")
def api_evaluate():
    """Membandingkan gambar asli dan gambar stego. Tidak ada yang disimpan di server."""
    try:
        if "original" not in request.files or "stego" not in request.files:
            return jsonify({"error": "Upload gambar asli dan gambar stego terlebih dahulu."}), 400

        original_file = request.files["original"]
        stego_file = request.files["stego"]
        if not original_file.filename or not stego_file.filename:
            return jsonify({"error": "Upload gambar asli dan gambar stego terlebih dahulu."}), 400

        # Semua gambar dinormalisasi ke RGB
        asli = np.array(Image.open(original_file.stream).convert("RGB"), dtype=np.uint8)
        stego = np.array(Image.open(stego_file.stream).convert("RGB"), dtype=np.uint8)

        if asli.shape != stego.shape:
            return jsonify({
                "error": f"Ukuran gambar harus sama (asli {asli.shape[1]}x{asli.shape[0]}, "
                         f"stego {stego.shape[1]}x{stego.shape[0]})."
            }), 400

        hasil = evaluasi(asli, stego)
        if hasil["psnr"] == float("inf"):   # JSON standar tidak mengenal Infinity
            hasil["psnr"] = None

        return jsonify({
            "evaluasi": hasil,
            "ukuran": {"lebar": int(asli.shape[1]), "tinggi": int(asli.shape[0])},
            "histogram": {
                "original": histogram_data(asli),
                "stego": histogram_data(stego)
            }
        })
    except Exception:
        return jsonify({"error": "Gagal membaca gambar. Pastikan kedua file adalah gambar PNG atau JPG yang valid."}), 400


if __name__ == "__main__":
    app.run(debug=os.environ.get("FLASK_DEBUG") == "1")