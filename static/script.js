/* =====================================
   STEGOSECURE - JAVASCRIPT
===================================== */


// =====================================
// 1. GET HTML ELEMENTS
// =====================================

// EMBED ELEMENTS
const embedImage = document.getElementById("embedImage");
const originalPreview = document.getElementById("originalPreview");
const stegoPreview = document.getElementById("stegoPreview");

const embedFileName = document.getElementById("embedFileName");
const removeEmbedImage = document.getElementById("removeEmbedImage");

const secretMessage = document.getElementById("secretMessage");
const embedPassword = document.getElementById("embedPassword");
const embedButton = document.getElementById("embedButton");
const generateKeyButton = document.getElementById("generateKeyButton");
const toggleKeyButton = document.getElementById("toggleKeyButton");
const copyKeyButton = document.getElementById("copyKeyButton");
const embedNotification = document.getElementById("embedNotification");

const downloadButton = document.getElementById("downloadButton");


// EXTRACT ELEMENTS
const stegoImage = document.getElementById("stegoImage");
const extractPreview = document.getElementById("extractPreview");
const extractPreviewContainer = document.getElementById("extractPreviewContainer");

const extractFileName = document.getElementById("extractFileName");
const extractImageName = document.getElementById("extractImageName");
const extractImageSize = document.getElementById("extractImageSize");

const removeExtractImage = document.getElementById("removeExtractImage");

const extractPassword = document.getElementById("extractPassword");
const extractButton = document.getElementById("extractButton");
const extractNotification = document.getElementById("extractNotification");

const extractedMessage = document.getElementById("extractedMessage");


// =====================================
// 2. IMAGE URL VARIABLES
// =====================================

let originalImageURL = null;
let extractImageURL = null;
let currentStegoDataURL = null;


// =====================================
// 3. FILE SIZE FORMATTER
// =====================================

function formatFileSize(bytes) {

    if (bytes < 1024) {
        return bytes + " Bytes";
    }

    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + " KB";
    }

    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}


// =====================================
// 4. NOTIFICATION SYSTEM
// =====================================

function showNotification(element, message, type = "info") {

    element.textContent = message;

    element.className = "notification " + type;

    element.classList.remove("hidden");

}


function hideNotification(element) {

    element.textContent = "";

    element.classList.add("hidden");

}


// =====================================
// 5. RESET EMBED PREVIEW
// =====================================

function resetEmbedPreview() {

    if (originalImageURL) {
        URL.revokeObjectURL(originalImageURL);
        originalImageURL = null;
    }

    currentStegoDataURL = null;

    embedImage.value = "";

    embedFileName.textContent = "";

    removeEmbedImage.classList.add("hidden");

    originalPreview.innerHTML =
        "<span>Original image preview</span>";

    stegoPreview.innerHTML =
        "<span>Stego image will appear here</span>";

    downloadButton.classList.add("hidden");

    hideNotification(embedNotification);

}


// =====================================
// 6. RESET EXTRACT PREVIEW
// =====================================

function resetExtractPreview() {

    if (extractImageURL) {
        URL.revokeObjectURL(extractImageURL);
        extractImageURL = null;
    }

    stegoImage.value = "";

    extractFileName.textContent = "";

    extractImageName.textContent = "";

    extractImageSize.textContent = "";

    extractPreview.innerHTML = "";

    extractPreviewContainer.classList.add("hidden");

    extractedMessage.textContent =
        "Pesan hasil ekstraksi akan muncul di sini.";

    hideNotification(extractNotification);

}


// =====================================
// 7. UPLOAD ORIGINAL IMAGE
// =====================================

embedImage.addEventListener("change", function () {

    const file = this.files[0];

    if (!file) return;


    const allowedFormats = [
        "image/png",
        "image/jpeg"
    ];

    if (!allowedFormats.includes(file.type)) {

        showNotification(
            embedNotification,
            "Format gambar harus PNG atau JPG.",
            "error"
        );

        this.value = "";

        return;
    }


    if (file.size > 10 * 1024 * 1024) {

        showNotification(
            embedNotification,
            "Ukuran gambar maksimal 10 MB.",
            "error"
        );

        this.value = "";

        return;
    }


    if (originalImageURL) {
        URL.revokeObjectURL(originalImageURL);
    }


    currentStegoDataURL = null;
    originalImageURL = URL.createObjectURL(file);


    embedFileName.textContent =
        "✓ " + file.name + " (" + formatFileSize(file.size) + ")";


    removeEmbedImage.classList.remove("hidden");


    originalPreview.innerHTML = "";

    const img = document.createElement("img");

    img.src = originalImageURL;

    img.alt = "Original image preview";

    originalPreview.appendChild(img);


    stegoPreview.innerHTML =
        "<span>Stego image will appear here</span>";

    downloadButton.classList.add("hidden");

    hideNotification(embedNotification);

});


// =====================================
// 8. REMOVE ORIGINAL IMAGE
// =====================================

removeEmbedImage.addEventListener("click", function () {

    resetEmbedPreview();

});


// =====================================
// 9. UPLOAD STEGO IMAGE
// =====================================

stegoImage.addEventListener("change", function () {

    const file = this.files[0];

    if (!file) return;


    if (file.type !== "image/png") {

        showNotification(
            extractNotification,
            "Gambar stego harus menggunakan format PNG.",
            "error"
        );

        this.value = "";

        return;
    }


    if (file.size > 10 * 1024 * 1024) {

        showNotification(
            extractNotification,
            "Ukuran gambar maksimal 10 MB.",
            "error"
        );

        this.value = "";

        return;
    }


    if (extractImageURL) {
        URL.revokeObjectURL(extractImageURL);
    }


    extractImageURL = URL.createObjectURL(file);


    extractFileName.textContent = "✓ " + file.name;

    extractImageName.textContent = file.name;

    extractImageSize.textContent =
        formatFileSize(file.size);


    extractPreview.innerHTML = "";

    const img = document.createElement("img");

    img.src = extractImageURL;

    img.alt = "Stego image preview";

    extractPreview.appendChild(img);


    extractPreviewContainer.classList.remove("hidden");


    extractedMessage.textContent =
        "Pesan hasil ekstraksi akan muncul di sini.";

    hideNotification(extractNotification);

});


// =====================================
// 10. REMOVE STEGO IMAGE
// =====================================

removeExtractImage.addEventListener("click", function () {

    resetExtractPreview();

});


// =====================================
// 11. EMBED MESSAGE & API CALL
// =====================================

embedButton.addEventListener("click", async function () {

    const image = embedImage.files[0];

    const message = secretMessage.value.trim();

    const password = embedPassword.value;


    if (!image) {

        showNotification(
            embedNotification,
            "Silakan upload gambar terlebih dahulu.",
            "error"
        );

        return;
    }


    if (!message) {

        showNotification(
            embedNotification,
            "Pesan rahasia belum diisi.",
            "error"
        );

        secretMessage.focus();

        return;
    }


    if (!password) {

        showNotification(
            embedNotification,
            "Password enkripsi belum diisi.",
            "error"
        );

        embedPassword.focus();

        return;
    }


    embedButton.disabled = true;
    showNotification(
        embedNotification,
        "Mengenkripsi pesan dan menyisipkan dengan metode LSBM...",
        "info"
    );

    try {
        const formData = new FormData();
        formData.append("image", image);
        formData.append("message", message);
        formData.append("password", password);

        const response = await fetch("/api/embed", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Gagal melakukan proses embed.");
        }

        currentStegoDataURL = data.stego_image;

        stegoPreview.innerHTML = "";
        const img = document.createElement("img");
        img.src = data.stego_image;
        img.alt = "Stego image preview";
        stegoPreview.appendChild(img);

        if (downloadButton.tagName === "A") {
            downloadButton.href = data.stego_image;
            downloadButton.download = "stego_lsbm.png";
        }

        downloadButton.classList.remove("hidden");

        showNotification(
            embedNotification,
            `Berhasil! Pesan terenkripsi (${data.payload_size} byte) disisipkan ke gambar PNG.`,
            "success"
        );
    } catch (err) {
        showNotification(embedNotification, err.message, "error");
    } finally {
        embedButton.disabled = false;
    }

});


// Handler tambahan jika downloadButton berupa <button>
downloadButton.addEventListener("click", function (e) {
    if (this.tagName !== "A" && currentStegoDataURL) {
        e.preventDefault();
        const link = document.createElement("a");
        link.href = currentStegoDataURL;
        link.download = "stego_lsbm.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});


// =====================================
// 12. EXTRACT MESSAGE & API CALL
// =====================================

extractButton.addEventListener("click", async function () {

    const image = stegoImage.files[0];

    const password = extractPassword.value;


    if (!image) {

        showNotification(
            extractNotification,
            "Silakan upload gambar stego terlebih dahulu.",
            "error"
        );

        return;
    }


    if (!password) {

        showNotification(
            extractNotification,
            "Password dekripsi belum diisi.",
            "error"
        );

        extractPassword.focus();

        return;
    }


    extractButton.disabled = true;
    showNotification(
        extractNotification,
        "Mengekstrak bit LSBM dan mendekripsi pesan...",
        "info"
    );

    try {
        const formData = new FormData();
        formData.append("image", image);
        formData.append("password", password);

        const response = await fetch("/api/extract", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Gagal mengekstrak pesan.");
        }

        extractedMessage.textContent = data.message;

        showNotification(
            extractNotification,
            "Pesan berhasil diekstrak dan didekripsi.",
            "success"
        );
    } catch (err) {
        extractedMessage.textContent = "Pesan hasil ekstraksi akan muncul di sini.";
        showNotification(extractNotification, err.message, "error");
    } finally {
        extractButton.disabled = false;
    }

});


// =====================================
// 13. CLEAN UP IMAGE URL
// =====================================

window.addEventListener("beforeunload", function () {

    if (originalImageURL) {
        URL.revokeObjectURL(originalImageURL);
    }

    if (extractImageURL) {
        URL.revokeObjectURL(extractImageURL);
    }

});


// =====================================
// KEY TOOLS: BUAT, TAMPILKAN, SALIN KUNCI
// =====================================

// 32 karakter tanpa yang mirip (0/O, 1/I): 5 bit per karakter
const KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateRandomKey(groups = 5, groupLength = 4) {
    // Pembangkit acak aman (CSPRNG) milik browser.
    // 256 habis dibagi 32, jadi tidak ada bias saat memakai modulo.
    const total = groups * groupLength;
    const bytes = new Uint8Array(total);
    crypto.getRandomValues(bytes);

    let chars = "";
    for (const b of bytes) {
        chars += KEY_ALPHABET[b % KEY_ALPHABET.length];
    }

    const parts = [];
    for (let i = 0; i < total; i += groupLength) {
        parts.push(chars.slice(i, i + groupLength));
    }
    return parts.join("-");   // contoh: K7M2-QX9R-... (20 karakter = 100 bit)
}

generateKeyButton.addEventListener("click", function () {
    embedPassword.value = generateRandomKey();
    embedPassword.type = "text";               // tampilkan agar bisa dicatat
    toggleKeyButton.textContent = "🙈 Sembunyikan";

    showNotification(
        embedNotification,
        "Kunci acak dibuat. Salin dan simpan sekarang. Tanpa kunci ini pesan tidak bisa dibuka, " +
        "dan kirim ke penerima lewat jalur terpisah dari gambar.",
        "info"
    );
});

toggleKeyButton.addEventListener("click", function () {
    const sedangTersembunyi = embedPassword.type === "password";
    embedPassword.type = sedangTersembunyi ? "text" : "password";
    toggleKeyButton.textContent = sedangTersembunyi ? "🙈 Sembunyikan" : "👁 Tampilkan";
});

copyKeyButton.addEventListener("click", async function () {
    if (!embedPassword.value) {
        showNotification(embedNotification, "Belum ada kunci untuk disalin.", "error");
        return;
    }
    try {
        await navigator.clipboard.writeText(embedPassword.value);
        showNotification(embedNotification, "Kunci disalin ke clipboard.", "success");
    } catch (err) {
        embedPassword.type = "text";
        embedPassword.select();
        showNotification(
            embedNotification,
            "Browser menolak akses clipboard. Kunci sudah dipilih, salin manual dengan Ctrl+C.",
            "error"
        );
    }
});


// =====================================
// EVALUATE: MSE, PSNR, SSIM, HISTOGRAM
// =====================================

const evalOriginalImage = document.getElementById("evalOriginalImage");
const evalStegoImage = document.getElementById("evalStegoImage");
const evalOriginalName = document.getElementById("evalOriginalName");
const evalStegoName = document.getElementById("evalStegoName");
const evaluateButton = document.getElementById("evaluateButton");
const evalNotification = document.getElementById("evalNotification");
const evalResult = document.getElementById("evalResult");

const evalMse = document.getElementById("evalMse");
const evalPsnr = document.getElementById("evalPsnr");
const evalSsim = document.getElementById("evalSsim");
const evalChanged = document.getElementById("evalChanged");
const evalTotal = document.getElementById("evalTotal");
const evalVerdict = document.getElementById("evalVerdict");

// Hasil evaluasi terakhir (dipakai ulang saat kanal histogram diganti).
let lastEvaluation = null;


function checkEvalFile(file, allowedTypes, label) {
    if (!allowedTypes.includes(file.type)) {
        showNotification(
            evalNotification,
            `${label} harus berformat ${allowedTypes.map(t => t.split("/")[1].toUpperCase()).join(" atau ")}.`,
            "error"
        );
        return false;
    }
    if (file.size > 10 * 1024 * 1024) {
        showNotification(evalNotification, `${label} maksimal 10 MB.`, "error");
        return false;
    }
    hideNotification(evalNotification);
    return true;
}

evalOriginalImage.addEventListener("change", function () {
    const file = evalOriginalImage.files[0];
    if (!file) return;
    if (!checkEvalFile(file, ["image/png", "image/jpeg"], "Gambar asli")) {
        evalOriginalImage.value = "";
        evalOriginalName.textContent = "";
        return;
    }
    evalOriginalName.textContent = `${file.name} (${formatFileSize(file.size)})`;
});

evalStegoImage.addEventListener("change", function () {
    const file = evalStegoImage.files[0];
    if (!file) return;
    if (!checkEvalFile(file, ["image/png"], "Gambar stego")) {
        evalStegoImage.value = "";
        evalStegoName.textContent = "";
        return;
    }
    evalStegoName.textContent = `${file.name} (${formatFileSize(file.size)})`;
});


function formatEvaluation(e) {
    return {
        mse: e.mse.toFixed(6),
        // PSNR bernilai null bila gambar identik (MSE = 0)
        psnr: e.psnr === null ? "∞ (identik)" : e.psnr.toFixed(2) + " dB",
        ssim: e.ssim.toFixed(6),
        changed: e.piksel_berubah.toLocaleString("id-ID")
    };
}

function verdictText(e) {
    if (e.psnr === null) return "Kedua gambar identik, tidak ada perubahan.";
    if (e.psnr >= 40) return "PSNR di atas 40 dB: perubahan tidak terlihat oleh mata.";
    if (e.psnr >= 30) return "PSNR 30–40 dB: perubahan kecil, mungkin terlihat di area polos.";
    return "PSNR di bawah 30 dB: distorsi cukup terlihat.";
}

function showEvaluationResult(data) {
    const e = data.evaluasi;
    const f = formatEvaluation(e);

    evalMse.textContent = f.mse;
    evalPsnr.textContent = f.psnr;
    evalSsim.textContent = f.ssim;
    evalChanged.textContent = f.changed;

    const totalNilai = data.ukuran.lebar * data.ukuran.tinggi * 3;
    evalTotal.textContent = `dari ${totalNilai.toLocaleString("id-ID")} nilai piksel (${data.ukuran.lebar}×${data.ukuran.tinggi}, RGB)`;
    evalVerdict.textContent = verdictText(e);

    evalResult.classList.remove("hidden");
}


evaluateButton.addEventListener("click", async function () {
    const original = evalOriginalImage.files[0];
    const stego = evalStegoImage.files[0];

    if (!original || !stego) {
        showNotification(evalNotification, "Upload gambar asli dan gambar stego terlebih dahulu.", "error");
        return;
    }

    evaluateButton.disabled = true;
    showNotification(evalNotification, "Menghitung evaluasi...", "info");

    try {
        const formData = new FormData();
        formData.append("original", original);
        formData.append("stego", stego);

        const response = await fetch("/api/evaluate", { method: "POST", body: formData });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Gagal melakukan evaluasi.");
        }

        lastEvaluation = data;
        showEvaluationResult(data);
        drawHistogram();
        showNotification(evalNotification, "Evaluasi selesai.", "success");
    } catch (err) {
        lastEvaluation = null;
        evalResult.classList.add("hidden");
        showNotification(evalNotification, err.message, "error");
    } finally {
        evaluateButton.disabled = false;
    }
});

document.getElementById("channel-select").addEventListener("change", drawHistogram);


function drawHistogram() {
  if (!lastEvaluation) return;

  const canvas = document.getElementById('histogram-chart');
  const ctx = canvas.getContext('2d');

  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // Ambil kanal yang dipilih
  const select = Number(
    document.getElementById('channel-select').value
  );

  // Urutan kanal tetap, sesuai opsi di dropdown (0=R, 1=G, 2=B, 3=Gray)
  const keys = ["R", "G", "B", "Gray"].filter(
    k => k in lastEvaluation.histogram.original
  );

  const key = keys[Math.min(select, keys.length - 1)];

  const original = lastEvaluation.histogram.original[key];
  const stego = lastEvaluation.histogram.stego[key];

  // Skala grafik
  const max = Math.max(...original, ...stego, 1);

  const left = 65;
  const right = 20;
  const top = 25;
  const bottom = 45;

  const plotW = w - left - right;
  const plotH = h - top - bottom;

  // Background putih
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  // Grid horizontal
  ctx.strokeStyle = '#dce4df';
  ctx.lineWidth = 1;

  ctx.font = '12px Arial';
  ctx.fillStyle = '#78858b';
  ctx.textAlign = 'right';

  for (let i = 0; i <= 4; i++) {
    const y = top + (plotH * i / 4);

    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(w - right, y);
    ctx.stroke();

    const value = Math.round(max * (1 - i / 4));

    ctx.fillText(
      value.toLocaleString('id-ID'),
      left - 10,
      y + 4
    );
  }

  // Label sumbu X: intensitas 0 sampai 255
  ctx.textAlign = 'center';

  [0, 64, 128, 192, 255].forEach(value => {
    const x = left + (value / 255) * plotW;

    ctx.fillText(
      value.toString(),
      x,
      h - 17
    );
  });

  // Label sumbu
  ctx.textAlign = 'center';
  ctx.fillStyle = '#46534d';
  ctx.font = 'bold 12px Arial';
  ctx.fillText(
    'Intensitas piksel (0–255)',
    left + plotW / 2,
    h - 2
  );

  ctx.save();
  ctx.translate(16, top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Frekuensi piksel', 0, 0);
  ctx.restore();

  // Fungsi menggambar garis histogram
  function drawLine(values, color, dashed, width) {
    ctx.beginPath();

    values.forEach((value, index) => {
      const x = left + (index / 255) * plotW;
      const y = top + plotH - (value / max) * plotH;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.setLineDash(dashed ? [7, 4] : []);

    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Gambar Stego terlebih dahulu
  drawLine(
    stego,
    '#18856e',
    false,
    2.3
  );

  // Gambar Asli di atas Stego agar tetap terlihat
  drawLine(
    original,
    '#737f89',
    true,
    2.5
  );

  ctx.setLineDash([]);
}