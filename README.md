# Iwosan Web

Next.js frontend for Iwosan.

**Iwosan** (Yoruba: *healing*) is a healthcare marketplace on the Stellar network. It lets hospitals, clinics, pharmacies, traditional medicine practitioners and patients:

- **Buy, sell and rent medical equipment**: wheelchairs, oxygen concentrators, hospital beds, diagnostic devices.
- **Buy orthodox and native drugs**: pharmaceutical drugs and traditional/herbal medicine, each listed with its regulatory number (e.g. NAFDAC).
- **Hire medical personnel**: nurses, doctors, lab scientists and caregivers, by the day or shift, with licences verified.

Payments are held in a Soroban escrow contract and released to the seller only when the buyer confirms delivery or service. Disputes are resolved by the Iwosan verification desk.

### Gaps Iwosan addresses

| Problem | How Iwosan handles it |
|---|---|
| Counterfeit and unregistered drugs | Drug listings must be verified (regulatory number checked) before they can be ordered |
| Traditional medicine has no trusted channel | Native drugs are a first-class category, with the same verification as orthodox drugs |
| Expensive equipment sits idle or is out of reach | Equipment can be rented by the day as well as sold |
| Hard to find vetted medical staff quickly | Personnel listings are hire-only and need a verified practising licence |
| Paying strangers upfront is risky | Stellar escrow: funds release only on confirmation, refund otherwise |
| Slow, costly cross-border payment | Settlement in USDC/XLM on Stellar in seconds, at low fees |

The existing clinical modules (records, appointments, pharmacy, lab, telemedicine) remain and support the marketplace.

The marketplace UI lives at `/marketplace` (`src/app/marketplace/page.tsx`).

Prerequisites

Before you begin, ensure you have installed:

Node.js (version 16.x or higher)
npm (comes with Node.js)

Getting Started

To get a local copy up and running, follow these steps:

Clone the repository:

git clone https://github.com/Iwosan/Iwosan_web.git

Navigate to the project directory:

cd Iwosan_web

Install dependencies:

npm install

Set up environment variables:

cp .env.example .env.local

Edit `.env.local` and fill in the required values (see [Environment Variables](#environment-variables) below).

Run the development server:

npm run dev

Your application will be available at http://localhost:3000.

## Environment Variables

Copy `.env.example` to `.env.local` before running the app. Each variable is described below.

| Variable                      | Required | Default                               | Description                                                             |
| ----------------------------- | -------- | ------------------------------------- | ----------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`         | **Yes**  | —                                     | Backend REST API base URL. Provided by the backend team.                |
| `NEXT_PUBLIC_STELLAR_NETWORK` | No       | `testnet`                             | Stellar network to connect to. Accepted values: `testnet` \| `mainnet`. |
| `NEXT_PUBLIC_HORIZON_URL`     | No       | `https://horizon-testnet.stellar.org` | Horizon API endpoint used to submit transactions and query the ledger.  |

### How to obtain each value

- **`NEXT_PUBLIC_API_URL`** — Contact the backend team. For local development the backend defaults to `http://localhost:3000/api/v1`.
- **`NEXT_PUBLIC_STELLAR_NETWORK`** — Use `testnet` for development and staging. Use `mainnet` only for production deployments.
- **`NEXT_PUBLIC_HORIZON_URL`** — Provided by the [Stellar Foundation](https://developers.stellar.org/docs/data/horizon). Testnet: `https://horizon-testnet.stellar.org`. Mainnet: `https://horizon.stellar.org`. You may also run a self-hosted Horizon instance.

### Secrets that must NOT be committed

The following files are already listed in `.gitignore` and must never be committed to version control:

- `.env.local` — contains your real environment values
- `.env` — any plain `.env` file
- `*.pem` — private key files

If you accidentally commit a secret, rotate it immediately and rewrite git history.

## API Documentation

Full API reference documenting all endpoints, request/response shapes, and authentication is available at:

📄 [`docs/api.md`](./docs/api.md)

### Quick Overview

| Endpoint Group      | Base Path       | Auth           |
| ------------------- | --------------- | -------------- |
| Medical Records     | `/records`      | Public key     |
| Doctors & Slots     | `/doctors`      | Public key     |
| Appointments        | `/appointments` | Public key     |
| Hospital Management | `/hospital`     | Role: HOSPITAL |
| Users               | `/users`        | Public key     |

## Switching to Mainnet

To point the frontend at the Stellar mainnet, update these variables in `.env.local`:

```
NEXT_PUBLIC_STELLAR_NETWORK=mainnet
NEXT_PUBLIC_HORIZON_URL=https://horizon.stellar.org
NEXT_PUBLIC_API_URL=https://api.iwosan.io/v1
```

**Security implications:**

- Mainnet transactions use **real XLM**. Mistakes cannot be reversed.
- Ensure the backend API URL also points to the production environment.
- Never expose private keys or mnemonics in environment variables or source code.
- Review all smart contract interactions before deploying to mainnet.
- Use a secrets manager (e.g., Vercel Environment Variables, AWS Secrets Manager) to inject production values — do not store them in any committed file.

Publish your first package
Footer
