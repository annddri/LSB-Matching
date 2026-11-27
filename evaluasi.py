import numpy as np
from skimage.metrics import structural_similarity
# scipy dan matplotlib hanya diimpor di dalam fungsi yang memakainya,
# jadi website cukup membutuhkan numpy, pillow, flask, cryptography, scikit-image.


def _cek(asli, stego):
    asli, stego = np.asarray(asli), np.asarray(stego)
    if asli.shape != stego.shape:
        raise ValueError(f"Ukuran beda: {asli.shape} vs {stego.shape}")
    if asli.dtype != np.uint8 or stego.dtype != np.uint8:
        raise ValueError("Gambar harus bertipe uint8")
    return asli, stego


def evaluasi(asli, stego):
    """-> {"mse", "psnr", "ssim", "piksel_berubah"}"""
    asli, stego = _cek(asli, stego)
    selisih = asli.astype(np.float64) - stego.astype(np.float64)   # float agar tidak overflow
    mse = float(np.mean(selisih ** 2))
    psnr = float("inf") if mse == 0 else float(10 * np.log10(255 ** 2 / mse))
    kw = {"channel_axis": 2} if asli.ndim == 3 else {}
    ssim = float(structural_similarity(asli, stego, data_range=255, **kw))
    return {"mse": mse, "psnr": psnr, "ssim": ssim,
            "piksel_berubah": int(np.count_nonzero(asli != stego))}


def chi_square(gambar):
    """Chi-square attack (pasangan nilai 2k, 2k+1) pada seluruh gambar.
    Mengembalikan {"chi2", "df", "p_value"}. p_value mendekati 1 = curiga LSB replacement."""
    from scipy.stats import chi2
    h = np.bincount(np.asarray(gambar).ravel(), minlength=256).astype(np.float64)
    genap, ganjil = h[0::2], h[1::2]
    harapan = (genap + ganjil) / 2
    pakai = harapan >= 5                       # abaikan pasangan dengan frekuensi terlalu kecil
    stat = float(np.sum((genap[pakai] - harapan[pakai]) ** 2 / harapan[pakai]))
    df = int(pakai.sum() - 1)
    return {"chi2": stat, "df": df, "p_value": float(1 - chi2.cdf(stat, df))}


def plot_histogram(asli, stego, path="histogram.png"):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    asli, stego = _cek(asli, stego)
    fig, ax = plt.subplots(1, 2, figsize=(11, 3.5), sharey=True)
    for a, g, judul in zip(ax, (asli, stego), ("Asli", "Stego")):
        a.hist(g.ravel(), bins=256, range=(0, 255))
        a.set_title(judul); a.set_xlabel("Nilai piksel")
    ax[0].set_ylabel("Jumlah piksel")
    fig.tight_layout(); fig.savefig(path, dpi=150); plt.close(fig)
    return path


def histogram_data(gambar):
    """Histogram 256 bin per kanal. Urutan kunci tetap: R, G, B, Gray.
    Gambar grayscale (2 dimensi) dianggap R = G = B."""
    g = np.asarray(gambar)
    if g.ndim == 2:
        g = np.stack([g, g, g], axis=2)
    r, gr, b = (g[..., i].astype(np.float64) for i in range(3))
    gray = np.round(0.299 * r + 0.587 * gr + 0.114 * b).astype(np.uint8)
    kanal = {"R": g[..., 0], "G": g[..., 1], "B": g[..., 2], "Gray": gray}
    return {nama: np.bincount(k.ravel(), minlength=256).tolist() for nama, k in kanal.items()}