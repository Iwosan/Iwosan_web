# Iwosan Stellar Roadmap

Iwosan is a healthcare marketplace (medical equipment sale and rental, orthodox and native drugs, medical personnel hire) with payments held in Soroban escrow. This roadmap lists the Stellar features that make Iwosan useful beyond a plain marketplace, and the issues that implement them across the three repos:

- [Iwosan_contract](https://github.com/Iwosan/Iwosan_contract): Soroban smart contracts
- [Iwosan_api](https://github.com/Iwosan/Iwosan_api): NestJS backend
- [Iwosan_web](https://github.com/Iwosan/Iwosan_web): Next.js frontend

## Why Stellar

| Need in Iwosan's market | Stellar feature |
|---|---|
| Buyers hold naira, sellers want stable value | **Path payments** convert NGN stablecoin or XLM to USDC in one transaction |
| Many patients and herbal sellers are unbanked | **SEP-24 anchors** and MoneyGram Access for cash in and cash out at local agents |
| Diaspora relatives pay for family care | **SEP-31** cross-border payments in USDC, settled in seconds |
| New users have no XLM for fees | **Sponsored reserves** and **fee-bump transactions** paid by Iwosan |
| Seed phrases scare non-crypto users | **Passkey smart wallets** (fingerprint or face ID) and **SEP-10** login |
| Paying strangers upfront is risky | **Soroban escrow** released only on confirmation (`iwosan-marketplace`) |
| Fake drugs and unlicensed practitioners | On-chain **drug batch traceability** and **verifiable licence credentials** |
| Care is often unaffordable | Soroban **savings pools (ajo/esusu)**, **micro-insurance**, **crowdfunding** and **vouchers** |
| Prices need to show in local currency | On-chain **price oracle** (e.g. Reflector) |

## Features

### 1. Payments and access
- **Pay in local currency.** The buyer pays in NGN or XLM, and the seller receives USDC through a path payment.
- **Cash in and cash out.** SEP-24 anchors let users deposit or withdraw cash, including through MoneyGram.
- **Diaspora payments.** SEP-31 lets someone abroad pay a pharmacy, hospital or treatment campaign directly.
- **No XLM needed to start.** Iwosan sponsors account reserves and the USDC trustline, and pays fees through fee-bumps.
- **Wallet login without seed phrases.** Passkey smart wallets plus SEP-10 authentication.

### 2. Trust and safety
- **Drug batch traceability.** Manufacturers register batches, every custody handoff is recorded, and buyers scan a QR code to verify a pack.
- **Recalls.** A recalled batch can't change hands, and buyers are notified.
- **Verifiable licences.** Regulators and professional bodies issue on-chain credentials, which replace the single admin verification flag.
- **Ratings that can't be faked.** Only buyers with a completed escrow order can leave a review.

### 3. Funding care
- **Health savings groups (ajo/esusu).** Members contribute regularly and take turns receiving the pot, with emergency withdrawals by member vote.
- **Micro-insurance.** Small premiums go into a pool, and claims are paid directly to verified providers.
- **Treatment crowdfunding.** Donations are escrowed and paid only to the hospital, with refunds if the goal isn't met.
- **Medical vouchers.** Funds can only be spent with verified Iwosan sellers.

### 4. Equipment economy
- **Rental deposits.** A refundable deposit is held in escrow and released when the item is returned undamaged.
- **Rent-to-own.** Rental payments count toward ownership.
- **Later:** shared ownership of expensive equipment (rental income paid to token holders), a loyalty token, and automatic payment of delivery riders from escrow.

### 5. Local experience
- Prices in NGN, USDC or XLM from an on-chain oracle.
- Marketplace UI in English, Yoruba, Hausa and Igbo.

## Suggested order
1. Path payments, sponsored accounts and passkey login: payments for everyone, no XLM, no seed phrases.
2. Drug batch traceability and recalls: directly tackles counterfeit drugs.
3. Treatment crowdfunding, built on the existing escrow.
4. Anchors (SEP-24/31), then the savings, insurance and voucher contracts.

## Issue tracker

| Feature | Contract | API | Web |
|---|---|---|---|
| Path payments (pay in NGN) | n/a | [#2](https://github.com/Iwosan/Iwosan_api/issues/2) | [#5](https://github.com/Iwosan/Iwosan_web/issues/5) |
| SEP-10 / passkey login | n/a | [#3](https://github.com/Iwosan/Iwosan_api/issues/3) | [#2](https://github.com/Iwosan/Iwosan_web/issues/2) |
| SEP-24 cash in / cash out | n/a | [#4](https://github.com/Iwosan/Iwosan_api/issues/4) | [#7](https://github.com/Iwosan/Iwosan_web/issues/7) |
| SEP-31 diaspora payments | n/a | [#5](https://github.com/Iwosan/Iwosan_api/issues/5) | n/a |
| Sponsored accounts and fee-bumps | n/a | [#6](https://github.com/Iwosan/Iwosan_api/issues/6) | n/a |
| Escrow orders (index, checkout, confirm/refund) | existing `iwosan-marketplace` | [#7](https://github.com/Iwosan/Iwosan_api/issues/7) | [#3](https://github.com/Iwosan/Iwosan_web/issues/3), [#4](https://github.com/Iwosan/Iwosan_web/issues/4) |
| Seller listings dashboard | n/a | existing `src/marketplace` | [#10](https://github.com/Iwosan/Iwosan_web/issues/10) |
| Drug batch traceability | [#2](https://github.com/Iwosan/Iwosan_contract/issues/2) | [#8](https://github.com/Iwosan/Iwosan_api/issues/8) | [#6](https://github.com/Iwosan/Iwosan_web/issues/6) |
| Batch recalls | [#3](https://github.com/Iwosan/Iwosan_contract/issues/3) | [#9](https://github.com/Iwosan/Iwosan_api/issues/9) | [#6](https://github.com/Iwosan/Iwosan_web/issues/6) |
| Verifiable licence credentials | [#4](https://github.com/Iwosan/Iwosan_contract/issues/4), [#5](https://github.com/Iwosan/Iwosan_contract/issues/5) | n/a | n/a |
| Reviews from completed orders | n/a | [#11](https://github.com/Iwosan/Iwosan_api/issues/11) | [#3](https://github.com/Iwosan/Iwosan_web/issues/3) |
| Rental deposits | [#11](https://github.com/Iwosan/Iwosan_contract/issues/11) | n/a | n/a |
| Rent-to-own | [#6](https://github.com/Iwosan/Iwosan_contract/issues/6) | n/a | n/a |
| Health savings groups (ajo/esusu) | [#7](https://github.com/Iwosan/Iwosan_contract/issues/7) | n/a | [#9](https://github.com/Iwosan/Iwosan_web/issues/9) |
| Micro-insurance | [#8](https://github.com/Iwosan/Iwosan_contract/issues/8) | n/a | n/a |
| Treatment crowdfunding | [#9](https://github.com/Iwosan/Iwosan_contract/issues/9) | n/a | [#8](https://github.com/Iwosan/Iwosan_web/issues/8) |
| Medical vouchers | [#10](https://github.com/Iwosan/Iwosan_contract/issues/10) | n/a | n/a |
| Oracle prices and local languages | n/a | [#10](https://github.com/Iwosan/Iwosan_api/issues/10) | [#11](https://github.com/Iwosan/Iwosan_web/issues/11) |
