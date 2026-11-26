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
const evalPanel = document.getElementById("evalPanel");
const evalMse = document.getElementById("evalMse");
const evalPsnr = document.getElementById("evalPsnr");
const evalSsim = document.getElementById("evalSsim");
const evalChanged = document.getElementById("evalChanged");


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
    hideEvaluation();

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
    hideEvaluation();

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

        if (data.evaluasi) {
            showEvaluation(data.evaluasi);
        }

        showNotification(
            embedNotification,
            `Berhasil! Pesan terenkripsi (${data.payload_size} byte) disisipkan ke gambar PNG.`,
            "success"
        );
    } catch (err) {
        showNotification(embedNotification, err.message, "error");
        hideEvaluation();
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
// PANEL EVALUASI (MSE, PSNR, SSIM)
// =====================================

function formatEvaluation(e) {
    return {
        mse: e.mse.toFixed(6),
        // PSNR bernilai null bila gambar identik (MSE = 0)
        psnr: e.psnr === null ? "∞ (identik)" : e.psnr.toFixed(2) + " dB",
        ssim: e.ssim.toFixed(6),
        changed: e.piksel_berubah.toLocaleString("id-ID")
    };
}

function showEvaluation(e) {
    const f = formatEvaluation(e);
    evalMse.textContent = f.mse;
    evalPsnr.textContent = f.psnr;
    evalSsim.textContent = f.ssim;
    evalChanged.textContent = f.changed;
    evalPanel.classList.remove("hidden");
}

function hideEvaluation() {
    evalPanel.classList.add("hidden");
}


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
