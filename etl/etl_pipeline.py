# -*- coding: utf-8 -*-
"""
Sporthink Perakende Dashboard - ETL Pipeline  v1.1
====================================================
Windows uyumlu (ASCII-safe print, UTF-8 dosya kodlamasi).
ERP/Master alan adlari UTF-8 string literal olarak saklanir;
bunlar Excel basliklarıyla bire bir eslesmek zorundadir.
Terminal ciktisi ASCII'ye kilit -- UnicodeEncodeError yok.

Formulas (dokumandan birebir):
  Alis Fiyat   = Alis Tutari / Alis Miktari
  SMM          = Satis Adedi * Alis Fiyat
  Brut Kar     = Ciro - SMM
  Kar Marji %  = (Brut Kar / Ciro) * 100
  MU           = PSF / Alis Fiyati
  GMROI        = (Brut Kar / SMM) * 19
  Cover        = (Ort. Stok / Satis Adedi) * 19
  Sell Through = Satis Adedi / (DBS + Alis Miktari)
  Ort. Stok    = (DBS + DSS) / 2
"""

import sys
import io
import pandas as pd
import numpy as np
import json
from pathlib import Path
from datetime import datetime

# ===========================================================
# WINDOWS TERMINAL KORUMASI
# CP1252/cp850 gibi kodlamalarda Unicode print patlamamasi icin
# stdout'u ASCII'ye kilitle; bilinmeyen karakterleri '?' yap.
# UTF-8 terminallerde (Linux/Mac/modern Windows) etki etmez.
# ===========================================================
if sys.stdout.encoding and sys.stdout.encoding.upper() not in ("UTF-8", "UTF8"):
    sys.stdout = io.TextIOWrapper(
        sys.stdout.buffer,
        encoding="ascii",
        errors="replace",
        line_buffering=True,
    )

# ===========================================================
# 1. KOLON TANIMLAMALARI
#
# ONEMLI: Asagidaki string literallerdeki Turkce karakterler
# ZORUNLUDUR. Bunlar ERP ve Master Excel dosyalarinin gercek
# sutun basliklariyla birebir eslesmek zorundadir.
# Pandas bu stringleri dosyadan okudugu basliklarla karsilastirir.
# ===========================================================

# ---- ERP sutun adlari (Excel'deki gercek basliklar) --------
ERP_COLS = {
    "ana_grup":       "ANAGRUP",
    "marka":          "Marka A\u00e7\u0131klama",        # Marka Aciklama
    "alt_kategori":   "Alt Kategori",
    "sezon":          "Mevcut Sezon Kodu",
    "urun_kodu":      "Stok Kodu",
    "urun_adi":       "Stok Kodu A\u00e7\u0131klama",    # Stok Kodu Aciklama
    "renk_kodu":      "E-T\u0130CARET RENK",             # E-TICARET RENK
    "renk_aciklama":  "Renk A\u00e7\u0131klama",         # Renk Aciklama
    "cinsiyet_ekod":  "E-T\u0130CARET C\u0130NS\u0130YET",  # E-TICARET CINSIYET
    "cinsiyet":       "C\u0130NS\u0130YET",              # CINSIYET
    "mevsim":         "E-T\u0130CARET MEVS\u0130M",      # E-TICARET MEVSIM
    "alt_ust":        "ALT/\u00dcST",                    # ALT/UST
    "alis_miktari":   "Al\u0131\u015f Miktar\u0131",     # Alis Miktari
    "alis_tutari":    "Al\u0131\u015f Tutar\u0131",      # Alis Tutari
    "satis_miktari":  "Sat\u0131\u015f Miktar\u0131",    # Satis Miktari
    "satis_tutari":   "Sat\u0131\u015f Tutar\u0131",     # Satis Tutari
    "satis_orani":    "Sat\u0131\u015f Oran\u0131",      # Satis Orani
    "dss":            "DSS Miktar",
    "son_stok":       "Son Stok Miktar\u0131",           # Son Stok Miktari
    "para_birimi":    "PB.",
    "dbs":            "DBS Miktar",
    "ort_stok_erp":   "Ortalama Stok",
}

# ---- Master Data sutun adlari -----
MASTER_COLS = {
    "urun_kodu":        "Stok Kodu",
    "renk_kodu":        "E-T\u0130CARET RENK",           # E-TICARET RENK
    "psf":              "PSF",
    "regule_psf":       "Reg\u00fcle PSF",               # Regule PSF
    "alis_fiyat_md":    "Al\u0131\u015f Fiyat",          # Alis Fiyat
    "mu":               "MU",
    "indirim_orani":    "\u0130nd. Oran\u0131",           # Ind. Orani
    "gorsel_link":      "G\u00f6rsel Link",              # Gorsel Link
    "urun_giris_tarihi": "\u00dcr\u00fcn Giri\u015f Tarihi",  # Urun Giris Tarihi
}

# ---- Hesaplanmis sutun adlari (ASCII, biz urettik) ---------
CALC = {
    "ALIS_FIYAT_H":   "Alis Fiyat_hesap",
    "ALIS_FIYAT_F":   "Alis Fiyat_final",
    "ORT_STOK_H":     "Ortalama Stok_hesap",
    "SMM":            "SMM",
    "BRUT_KAR":       "Brut Kar",
    "KAR_MARJI":      "Kar Marji %",
    "MU_HESAP":       "MU_hesap",
    "MU_MASTER":      "MU_master",
    "MU_FINAL":       "MU_final",
    "GMROI":          "GMROI",
    "COVER":          "Cover",
    "SELL_THROUGH":   "Sell Through %",
    "REGULE_PSF_H":   "Regule PSF_hesap",
    "REGULE_PSF_F":   "Regule PSF_final",
}

# ---- JSON cikti icin yeniden adlandirma --------------------
RENAME_MAP = {
    ERP_COLS["ana_grup"]:          "Ana Grup",
    CALC["REGULE_PSF_F"]:          MASTER_COLS["regule_psf"],  # "Regule PSF"
    CALC["ALIS_FIYAT_F"]:          MASTER_COLS["alis_fiyat_md"],  # "Alis Fiyat"
    CALC["MU_FINAL"]:              MASTER_COLS["mu"],  # "MU"
    CALC["ORT_STOK_H"]:            "Ortalama Stok",
    ERP_COLS["satis_miktari"]:     "Satis Adedi",
    ERP_COLS["satis_tutari"]:      "Ciro",
}

# 19 haftalik donem sabiti (dokumandan -- DEGISTIRME)
HAFTA_CARPANI = 19


# ===========================================================
# 2. VERI YUKLEME
# ===========================================================

def load_erp_data(filepath):
    """ERP ham verisini okur (ilk sheet, tum sutunlar string)."""
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError("ERP dosyasi bulunamadi: " + str(filepath))

    df = pd.read_excel(filepath, sheet_name=0, dtype=str)
    df.columns = [c.strip() for c in df.columns]
    for col in df.columns:
        if df[col].dtype == object:
            df[col] = df[col].str.strip()

    print("[ERP]    " + str(len(df)) + " satir yuklendi -> " + str(filepath))
    return df


def load_master_data(filepath):
    """Master Data / Ana Urun Katalogu okur."""
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError("Master Data bulunamadi: " + str(filepath))

    df = pd.read_excel(filepath, sheet_name=0, dtype=str)
    df.columns = [c.strip() for c in df.columns]
    for col in df.columns:
        if df[col].dtype == object:
            df[col] = df[col].str.strip()

    print("[Master] " + str(len(df)) + " satir yuklendi -> " + str(filepath))
    return df


# ===========================================================
# 3. MERGE / JOIN
# ===========================================================

def merge_datasets(erp, master):
    """
    ERP + Master'i birlestir.
    Once Stok Kodu + Renk ile dener; eslesmeyenler icin
    yalnizca Stok Kodu ile fallback join yapar.
    """
    key_stok = ERP_COLS["urun_kodu"]     # "Stok Kodu"
    key_renk = ERP_COLS["renk_kodu"]     # "E-TICARET RENK"

    want = [
        key_stok, key_renk,
        MASTER_COLS["psf"],
        MASTER_COLS["regule_psf"],
        MASTER_COLS["alis_fiyat_md"],
        MASTER_COLS["mu"],
        MASTER_COLS["indirim_orani"],
        MASTER_COLS["gorsel_link"],
        MASTER_COLS["urun_giris_tarihi"],
    ]
    master_avail = set(master.columns)
    safe = []
    for c in want:
        if c in master_avail:
            safe.append(c)
        else:
            print("  [WARN] Master sutun eksik: " + c)

    master_slim = master[safe].copy()

    # -- Cift anahtar join --
    merged = erp.merge(
        master_slim,
        how="left",
        left_on=[key_stok, key_renk],
        right_on=[key_stok, key_renk],
        suffixes=("", "_master"),
    )

    # -- Fallback join --
    psf = MASTER_COLS["psf"]
    unmatched = merged[psf].isna() if psf in merged.columns else pd.Series(False, index=merged.index)

    if unmatched.sum() > 0:
        print("  [INFO] " + str(unmatched.sum()) + " satir fallback join yapiliyor (sadece Stok Kodu)...")
        by_code = (
            master_slim
            .drop_duplicates(subset=[key_stok], keep="first")
            .rename(columns={c: c + "_fb" for c in safe if c != key_stok})
        )
        fb = erp[unmatched].merge(by_code, how="left", on=key_stok)
        fill = [
            MASTER_COLS["psf"],
            MASTER_COLS["regule_psf"],
            MASTER_COLS["alis_fiyat_md"],
            MASTER_COLS["mu"],
            MASTER_COLS["indirim_orani"],
            MASTER_COLS["gorsel_link"],
            MASTER_COLS["urun_giris_tarihi"],
        ]
        for col in fill:
            fc = col + "_fb"
            if col in merged.columns and fc in fb.columns:
                merged.loc[unmatched, col] = fb[fc].values

    matched = merged[psf].notna().sum() if psf in merged.columns else 0
    print("  [Merge] " + str(matched) + " / " + str(len(merged)) + " satir Master ile eslesti.")
    return merged


# ===========================================================
# 4. TIP DONUSUMU
# ===========================================================

NUMERIC_COLS = [
    ERP_COLS["alis_miktari"],
    ERP_COLS["alis_tutari"],
    ERP_COLS["satis_miktari"],
    ERP_COLS["satis_tutari"],
    ERP_COLS["dss"],
    ERP_COLS["dbs"],
    ERP_COLS["ort_stok_erp"],
    ERP_COLS["son_stok"],
    MASTER_COLS["psf"],
    MASTER_COLS["regule_psf"],
    MASTER_COLS["alis_fiyat_md"],
    MASTER_COLS["mu"],
    MASTER_COLS["indirim_orani"],
]


def cast_numerics(df):
    """String sutunlari float'a cevir."""
    for col in NUMERIC_COLS:
        if col in df.columns:
            df[col] = (
                df[col]
                .astype(str)
                .str.replace(",", ".", regex=False)
                .str.replace(" ", "", regex=False)
                .replace({"#DIV/0!": np.nan, "nan": np.nan, "None": np.nan, "": np.nan})
            )
            df[col] = pd.to_numeric(df[col], errors="coerce")
    return df


def parse_dates(df):
    """Urun Giris Tarihi'ni ISO formatina cevir (dayfirst uyarisi yok)."""
    date_col = MASTER_COLS["urun_giris_tarihi"]
    if date_col not in df.columns:
        return df

    def to_iso(val):
        try:
            v = str(val).strip()
            if v in ("nan", "None", ""):
                return None

            # Excel seri numarasi (ornegin 45942)
            stripped = v.replace(".", "").replace("-", "")
            if stripped.isdigit():
                serial = int(float(v))
                if 40000 < serial < 60000:
                    base = pd.Timestamp("1899-12-30")
                    return (base + pd.Timedelta(days=serial)).date().isoformat()

            # Bilinen formatlar (dayfirst=True uyarisi yok)
            for fmt in ("%d.%m.%Y", "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y.%m.%d"):
                try:
                    return datetime.strptime(v, fmt).date().isoformat()
                except ValueError:
                    pass

            # Son care: pandas mixed mode
            parsed = pd.to_datetime(v, format="mixed", errors="coerce")
            if pd.notna(parsed):
                return parsed.date().isoformat()
            return None
        except Exception:
            return None

    df[date_col] = df[date_col].apply(to_iso)
    return df


# ===========================================================
# 5. METRIK HESAPLAMA
# ===========================================================

def safe_div(numerator, denominator, fill=np.nan):
    """Sifira bolme guvenligi."""
    with np.errstate(divide="ignore", invalid="ignore"):
        result = np.where(denominator == 0, fill, numerator / denominator)
    return pd.Series(result, index=numerator.index)


def calculate_alis_fiyat(df):
    """Alis Fiyat = Alis Tutari / Alis Miktari"""
    df[CALC["ALIS_FIYAT_H"]] = safe_div(
        df[ERP_COLS["alis_tutari"]],
        df[ERP_COLS["alis_miktari"]]
    )
    fiyat_col = MASTER_COLS["alis_fiyat_md"]
    if fiyat_col in df.columns:
        df[CALC["ALIS_FIYAT_F"]] = df[fiyat_col].fillna(df[CALC["ALIS_FIYAT_H"]])
    else:
        df[CALC["ALIS_FIYAT_F"]] = df[CALC["ALIS_FIYAT_H"]]
    return df


def calculate_ortalama_stok(df):
    """Ortalama Stok = (DBS + DSS) / 2"""
    df[CALC["ORT_STOK_H"]] = (df[ERP_COLS["dbs"]] + df[ERP_COLS["dss"]]) / 2
    return df


def calculate_smm(df):
    """SMM = Satis Adedi * Alis Fiyat"""
    df[CALC["SMM"]] = df[ERP_COLS["satis_miktari"]] * df[CALC["ALIS_FIYAT_F"]]
    return df


def calculate_brut_kar(df):
    """Brut Kar = Ciro - SMM"""
    df[CALC["BRUT_KAR"]] = df[ERP_COLS["satis_tutari"]] - df[CALC["SMM"]]
    return df


def calculate_kar_marji(df):
    """Kar Marji % = (Brut Kar / Ciro) * 100"""
    df[CALC["KAR_MARJI"]] = safe_div(
        df[CALC["BRUT_KAR"]],
        df[ERP_COLS["satis_tutari"]]
    ) * 100
    return df


def calculate_mu(df):
    """MU = PSF / Alis Fiyat"""
    df[CALC["MU_HESAP"]] = safe_div(
        df[MASTER_COLS["psf"]],
        df[CALC["ALIS_FIYAT_F"]]
    )
    if MASTER_COLS["mu"] in df.columns:
        df[CALC["MU_MASTER"]] = df[MASTER_COLS["mu"]]
    df[CALC["MU_FINAL"]] = df[CALC["MU_HESAP"]]
    return df


def calculate_gmroi(df):
    """GMROI = (Brut Kar / SMM) * 19  [19 haftalik donem sabiti]"""
    df[CALC["GMROI"]] = safe_div(df[CALC["BRUT_KAR"]], df[CALC["SMM"]]) * HAFTA_CARPANI
    return df


def calculate_cover(df):
    """Cover = (DSS Miktar / Satis Adedi) * 19  [19 haftalik donem sabiti]"""
    df[CALC["COVER"]] = safe_div(
        df[ERP_COLS["dss"]],
        df[ERP_COLS["satis_miktari"]]
    ) * HAFTA_CARPANI
    return df


def calculate_sell_through(df):
    """Sell Through = Satis Adedi / (DBS + Alis Miktari) * 100"""
    total = df[ERP_COLS["dbs"]] + df[ERP_COLS["alis_miktari"]]
    df[CALC["SELL_THROUGH"]] = safe_div(df[ERP_COLS["satis_miktari"]], total) * 100
    return df


def calculate_regule_psf(df):
    """Regule PSF = PSF * (1 - Indirim Orani)"""
    psf = MASTER_COLS["psf"]
    ind = MASTER_COLS["indirim_orani"]
    reg = MASTER_COLS["regule_psf"]

    df[CALC["REGULE_PSF_H"]] = df[psf] * (1 - df[ind].fillna(0))
    if reg in df.columns:
        df[CALC["REGULE_PSF_F"]] = df[reg].fillna(df[CALC["REGULE_PSF_H"]])
    else:
        df[CALC["REGULE_PSF_F"]] = df[CALC["REGULE_PSF_H"]]
    return df


# ===========================================================
# 6. ANA PIPELINE
# ===========================================================

def run_etl(erp_path, master_path,
            output_json="sporthink_dashboard_data.json",
            output_excel="sporthink_dashboard_data.xlsx"):
    """
    Tam ETL akisi:
      1. Dosya okuma
      2. Merge/Join
      3. Tip donusumu + tarih parse
      4. Metrik hesaplama
      5. Temizleme / sutun duzenleme
      6. JSON + Excel cikti
    Returns: DataFrame
    """
    print("\n" + "=" * 60)
    print(" Sporthink ETL Pipeline - Baslatiliyor")
    print("=" * 60)

    print("\n[1/6] Dosyalar yukleniyor...")
    erp    = load_erp_data(erp_path)
    master = load_master_data(master_path)

    print("[2/6] Merge islemi...")
    df = merge_datasets(erp, master)

    print("[3/6] Sayisal tip donusumu ve tarih parse...")
    df = cast_numerics(df)
    df = parse_dates(df)

    print("[4/6] Metrik hesaplaniyor...")
    df = calculate_alis_fiyat(df)
    df = calculate_ortalama_stok(df)
    df = calculate_smm(df)
    df = calculate_brut_kar(df)
    df = calculate_kar_marji(df)
    df = calculate_mu(df)
    df = calculate_gmroi(df)
    df = calculate_cover(df)
    df = calculate_sell_through(df)
    df = calculate_regule_psf(df)

    print("[5/6] Sutunlar duzenlenip temizleniyor...")
    df = clean_and_finalize(df)

    print("[6/6] Cikti dosyalari yaziliyor...")
    save_outputs(df, output_json, output_excel)

    print("\n" + "=" * 60)
    print(" ETL tamamlandi -> " + str(len(df)) + " satir hazir.")
    print("=" * 60 + "\n")
    return df


# ===========================================================
# 7. TEMIZLEME
# ===========================================================

def clean_and_finalize(df):
    """Sutunlari sec, yeniden adlandir, sayilari yuvarla."""
    final_cols = [
        # Kimlik / siniflandirma
        ERP_COLS["ana_grup"],
        ERP_COLS["marka"],
        ERP_COLS["alt_kategori"],
        ERP_COLS["sezon"],
        ERP_COLS["urun_kodu"],
        ERP_COLS["urun_adi"],
        ERP_COLS["renk_kodu"],
        ERP_COLS["renk_aciklama"],
        ERP_COLS["cinsiyet_ekod"],
        ERP_COLS["cinsiyet"],
        ERP_COLS["mevsim"],
        # Fiyat & Master bilgiler
        MASTER_COLS["psf"],
        CALC["REGULE_PSF_F"],
        CALC["ALIS_FIYAT_F"],
        CALC["MU_FINAL"],
        MASTER_COLS["indirim_orani"],
        MASTER_COLS["gorsel_link"],
        MASTER_COLS["urun_giris_tarihi"],
        # Ham ERP sayilari
        ERP_COLS["alis_miktari"],
        ERP_COLS["alis_tutari"],
        ERP_COLS["satis_miktari"],
        ERP_COLS["satis_tutari"],
        ERP_COLS["dbs"],
        ERP_COLS["dss"],
        # Hesaplanmis metrikler
        CALC["ORT_STOK_H"],
        CALC["SMM"],
        CALC["BRUT_KAR"],
        CALC["KAR_MARJI"],
        CALC["GMROI"],
        CALC["COVER"],
        CALC["SELL_THROUGH"],
    ]

    cols = [c for c in final_cols if c in df.columns]
    df   = df[cols].copy()
    df   = df.rename(columns=RENAME_MAP)

    # Ana Grup degerlerini normalize et: "1       - Ayakkabi" -> "Ayakkabi"
    if "Ana Grup" in df.columns:
        import re as _re
        def _parse_ana_grup(v):
            if not v or str(v).strip() in ("nan", "None", ""):
                return None
            normalized = _re.sub(r'\s+', ' ', str(v).strip())
            parts = normalized.split(' - ', 1)
            return parts[1].strip() if len(parts) > 1 else normalized
        df["Ana Grup"] = df["Ana Grup"].apply(_parse_ana_grup)

    float_cols = df.select_dtypes(include=[float, np.floating]).columns
    df[float_cols] = df[float_cols].round(4)

    df = df.where(pd.notnull(df), None)
    return df


# ===========================================================
# 8. CIKTI
# ===========================================================

def _safe_json(v):
    """numpy/pandas turlerini JSON-serializeable yap."""
    if isinstance(v, np.integer):
        return int(v)
    if isinstance(v, np.floating):
        return None if np.isnan(v) else float(v)
    if isinstance(v, np.bool_):
        return bool(v)
    if isinstance(v, float) and np.isnan(v):
        return None
    return v


def save_outputs(df, json_path, excel_path):
    """DataFrame'i JSON ve Excel olarak yaz."""
    records = [
        {k: _safe_json(v) for k, v in row.items()}
        for _, row in df.iterrows()
    ]

    output = {
        "meta": {
            "etl_version":   "1.1.0",
            "generated_at":  datetime.now().isoformat(),
            "total_rows":    len(records),
            "hafta_carpani": HAFTA_CARPANI,
            "formulas": {
                "Alis Fiyat":     "Alis Tutari / Alis Miktari",
                "SMM":            "Satis Adedi * Alis Fiyat",
                "Brut Kar":       "Ciro - SMM",
                "Kar Marji %":    "(Brut Kar / Ciro) * 100",
                "MU":             "PSF / Alis Fiyat",
                "GMROI":          "(Brut Kar / SMM) * " + str(HAFTA_CARPANI),
                "Cover":          "(Ort. Stok / Satis Adedi) * " + str(HAFTA_CARPANI),
                "Sell Through %": "Satis Adedi / (DBS + Alis Miktari) * 100",
                "Ortalama Stok":  "(DBS + DSS) / 2",
            },
        },
        "data": records,
    }

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print("  [OK] JSON  -> " + str(json_path) + "  (" + str(len(records)) + " kayit)")

    df.to_excel(excel_path, index=False, engine="openpyxl")
    print("  [OK] Excel -> " + str(excel_path))


# ===========================================================
# 9. OZET / DEBUG
# ===========================================================

def print_summary(df, top_n=5):
    """Kisa metrik ozeti ve best/worstseller listesi."""
    ciro_col  = RENAME_MAP.get(ERP_COLS["satis_tutari"], "Ciro")
    stok_col  = ERP_COLS["urun_kodu"]
    brut_col  = CALC["BRUT_KAR"]
    marji_col = CALC["KAR_MARJI"]
    gmroi_col = CALC["GMROI"]

    numerics = [c for c in [ciro_col, brut_col, marji_col, gmroi_col,
                             CALC["COVER"], CALC["SELL_THROUGH"]] if c in df.columns]
    if numerics:
        print("\n--- Metrik Ozeti ---")
        print(df[numerics].describe().round(2).to_string())

    if ciro_col in df.columns and stok_col in df.columns:
        show = [c for c in [stok_col, ERP_COLS["urun_adi"],
                             ciro_col, brut_col, marji_col, gmroi_col] if c in df.columns]
        print("\n--- Top " + str(top_n) + " Bestseller ---")
        print(df.nlargest(top_n, ciro_col)[show].to_string(index=False))
        print("\n--- Top " + str(top_n) + " Worstseller ---")
        print(df[df[ciro_col] > 0].nsmallest(top_n, ciro_col)[show].to_string(index=False))
    print()


# ===========================================================
# 10. CLI
# ===========================================================

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Sporthink ETL Pipeline v1.1")
    parser.add_argument("--erp",     required=True,  help="ERP Data Excel yolu")
    parser.add_argument("--master",  required=True,  help="Master Data Excel yolu")
    parser.add_argument("--json",    default="sporthink_dashboard_data.json",
                                                      help="Cikti JSON dosya adi")
    parser.add_argument("--excel",   default="sporthink_dashboard_data.xlsx",
                                                      help="Cikti Excel dosya adi")
    parser.add_argument("--summary", action="store_true", help="Ozet raporu goster")
    args = parser.parse_args()

    df_result = run_etl(
        erp_path    = args.erp,
        master_path = args.master,
        output_json  = args.json,
        output_excel = args.excel,
    )

    if args.summary:
        print_summary(df_result)
