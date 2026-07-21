# Leviathan — Solana Whale Scanner

Deteksi transaksi whale di meme coin Solana berdasarkan data on-chain nyata.

## Stack
- Next.js 14 (App Router) + TypeScript + Tailwind
- DexScreener API (harga token, gratis, tanpa API key)
- Helius API (riwayat transaksi, gratis, butuh API key)
- Groq API (openai/gpt-oss-120b) — merapikan narasi & menilai confidence dari
  angka yang SUDAH dihitung di kode, bukan mengarang angka baru

## Cara kerja

1. DexScreener → harga token saat ini + alamat pool (liquidity tertinggi)
2. Helius → 50 transaksi swap terakhir di pool tersebut
3. Kode (bukan AI) menghitung nilai USD tiap transaksi dan estimasi profit
   dengan membandingkan harga eksekusi (pendekatan) vs harga saat ini
4. Transaksi ≥ $100.000 ditandai sebagai whale
5. Hanya data yang sudah dihitung itu yang dikirim ke Groq — tugas AI cuma
   menyusun narasi dan menilai confidence, tidak pernah membuat angka baru

**Keterbatasan penting:** harga eksekusi whale adalah pendekatan (rasio
SOL/token dalam transaksi dikali harga SOL saat ini), bukan harga historis
sebenarnya — API gratis tidak menyediakan itu. Jangan pakai untuk keputusan
trading tanpa verifikasi manual.

## Fitur

- **Scan Manual** — cek satu token kapan aja, data langsung dari on-chain
- **Watchlist Auto** — tambah alamat whale, dapat push notification browser
  tiap kali mereka beli/jual, dengan nominal copy-trade yang bisa diatur beda
  per whale
- **Copy Trade manual** — approve satu-satu lewat wallet (Phantom/Trust
  Wallet), aman, direkomendasikan sebagai default
- **Auto-trade (opsional, berisiko)** — eksekusi otomatis lewat hot wallet
  terpisah, dengan kill switch dan limit ketat, MATI secara default

## ⚠️ Sebelum setup: pahami risiko auto-trade

Fitur auto-trade pakai **hot wallet terpisah** (bukan wallet utama kamu) yang
private key-nya disimpan di server (env var Vercel). Ini standar arsitektur
bot trading, tapi tetap ada risiko: kalau env var bocor atau ada bug, dana di
hot wallet itu bisa hilang tanpa bisa dibatalkan.

**Aturan mainnya:**
- JANGAN pernah isi `HOT_WALLET_PRIVATE_KEY` dengan private key wallet utama kamu
- Setor ke hot wallet cuma sejumlah yang kamu rela hilang sepenuhnya
- Auto-trade default MATI (kill switch ON) — kamu harus sengaja nyalain di tab Safety
- Ada limit per-trade dan limit harian yang dicek di server sebelum tiap eksekusi

## Setup lengkap

### 1. Groq & Helius
Sama seperti sebelumnya — daftar gratis, dapat API key.

### 2. Firebase Admin
1. Firebase Console → project kamu → ⚙️ **Project Settings → Service Accounts**
2. **Generate new private key** → download file JSON
3. Buka file itu, copy SELURUH isinya (satu baris JSON utuh) ke `FIREBASE_SERVICE_ACCOUNT_KEY`

### 3. Firestore Security Rules
Karena project ini reuse Firebase project yang sama dengan Athanor, gabungkan
rules-nya jadi satu (Firebase Console → Firestore Database → Rules):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /pushSubscriptions/{subId} {
      allow create: if true;
      allow read, update, delete: if false;
    }
    match /whales/{whaleId} {
      allow read, write: if false;
    }
    match /config/{doc} {
      allow read, write: if false;
    }
  }
}
```
`whales` dan `config` sengaja diblokir total dari client — cuma bisa diakses
lewat API route yang pakai Firebase Admin (bypass rules by design, tapi tetap
lewat validasi server).

### 4. VAPID keys (push notification)
Jalankan di terminal (Codespaces juga bisa):
```
npx web-push generate-vapid-keys
```
Copy hasilnya ke `NEXT_PUBLIC_VAPID_PUBLIC_KEY` dan `VAPID_PRIVATE_KEY`.

### 5. Webhook secret
```
openssl rand -hex 24
```
Copy hasilnya ke `WEBHOOK_SHARED_SECRET`.

### 6. Hot wallet (opsional, hanya jika mau auto-trade)
1. Buat wallet Solana BARU (bukan wallet utama) — bisa lewat Phantom: klik profil → Add Wallet → Create New Wallet
2. Wallet baru itu → Settings → Export Private Key → copy (format base58)
3. Isi ke `HOT_WALLET_PRIVATE_KEY`
4. Setor SOL secukupnya ke alamat wallet itu (bisa dilihat alamatnya di tab Safety setelah deploy)

### 7. Deploy
1. Push ke GitHub, import di Vercel
2. Isi SEMUA environment variables di atas (Settings → Environment Variables)
3. `NEXT_PUBLIC_APP_URL` diisi setelah tau URL Vercel-nya (bisa deploy dulu,
   baru isi ini, baru redeploy)
4. Deploy

## Struktur

```
app/
  page.tsx                    → landing, tab Scan/Watchlist/Safety
  layout.tsx                   → font & metadata
  api/whale-scan/route.ts       → scan manual satu token
  api/whales/route.ts            → CRUD watchlist whale
  api/webhook/helius/route.ts     → terima event dari Helius, kirim push/auto-trade
  api/copy-trade/route.ts          → siapkan swap Jupiter (manual approve)
  api/safety/route.ts               → kill switch & limit
lib/
  solana.ts                          → DexScreener & Helius data
  firebase.ts                         → Firebase client
  firebaseAdmin.ts                     → Firebase Admin (server)
  heliusWebhook.ts                      → sync watchlist ke Helius
  webpush.ts                             → kirim push notification
  hotWallet.ts                            → keypair hot wallet
  autoTrade.ts                             → eksekusi auto-trade + safety gates
components/
  WalletProvider.tsx                        → context Phantom/Trust Wallet
  WhaleScan.tsx                              → UI scan manual
  WatchlistManager.tsx                        → UI tambah/atur whale
  SafetyPanel.tsx                              → UI kill switch & limit
  PushSubscribe.tsx                             → aktifkan notifikasi
  CopyTradeButton.tsx                            → copy trade manual approve
public/sw.js                                      → service worker push
```
