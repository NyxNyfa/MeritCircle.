# Product Requirements Document (PRD) — Merit Circle

## 1. Product Overview & Vision
Merit Circle is a decentralized, uncollateralized Web3 ROSCA (Rotating Savings and Credit Association / Arisan) platform deployed on **BNB Smart Chain Testnet (tBNB)**. It transforms traditional communal savings by introducing transparent on-chain smart contracts, reputation-based tiering, liquidity discount auctions, automated late penalties, and guaranteed zero-surplus final settlements without centralized KYC or upfront physical collateral.

---

## 2. Core Architecture & Monorepo Structure
- **Smart Contracts** (`packages/contracts`): Hardhat, Solidity 0.8.24, OpenZeppelin AccessControl, Pausable, ReentrancyGuard, SafeERC20.
- **Domain Logic** (`packages/domain`): Pure TypeScript mathematical models and business rules (reputation scoring, tier gates, auction payout calculations, late penalty progression).
- **Backend Service** (`apps/backend`): Node.js Express + Prisma ORM + PostgreSQL/Supabase, JWT wallet-based authentication, Resend email OTP verification, cron-based cycle settlement engine.
- **Frontend App** (`apps/web`): Next.js 14/16 App Router + Tailwind CSS, glassmorphism design system, Web3 wallet integration (`wagmi`/`viem`), real-time status tracking.

---

## 3. Product Rules & Business Logic

### 3.1 Network & Currency
- **Network**: BNB Smart Chain Testnet (Chain ID `97`).
- **Currency**: tBNB (represented internally as Wei string/BigInt, strictly avoiding floating-point rounding errors).

### 3.2 Reputation & Tiering System
Reputation points determine user tiering and pool eligibility.
- **Base Tier Thresholds**:
  - Tier 1 (Novice): 0 - 99 pts (Basic Circles)
  - Tier 2 (Citizen): 100 - 249 pts (Basic Circles)
  - Tier 3 (Pillar): 250 - 499 pts (Basic Circles & Standard Pools)
  - Tier 4 (Elder): 500 - 999 pts (Auction Pools eligible)
  - Tier 5 (Legend): 1000+ pts (Unrestricted Access & High-value Pools)
- **Point Awards**:
  - Wallet Connected: +10 pts
  - Profile Username Set: +10 pts
  - Email Verified: +40 pts
  - On-time Contribution: +15 pts
  - Successful Cycle Completion: +50 pts
- **Penalties**:
  - Late Payment: -10 pts per day past payment window (max -100 pts per cycle)
  - Default / Non-payment: -200 pts and suspension

### 3.3 Pool & Group Dynamics
- **Equal Proportion Rule**: `Group Size == Total Cycles` ($N$ members = $N$ cycles).
- **Cycle Duration**: 30 calendar days.
- **Payment Window**: Days 1 to 10 of each cycle.
- **Minimum Requirements to Join**:
  1. Connected Web3 wallet.
  2. Non-empty username.
  3. Verified email address (`emailVerifiedAt != null`).

### 3.4 Liquidity Auction Mechanism (Tier 4+)
- **Eligibility**: Open only in Auction Mode pools for members Tier 4 and above.
- **Window**: Auctions take place during non-final cycles (Cycle 1 to $N-1$).
- **Bidding Rule**: Members bid on discount percentages. The highest discount (lowest net payout request) wins the round's payout early.
- **Carried Reward**: Unclaimed liquidity discount surplus carries forward into the subsequent cycle's reward pool.

### 3.5 Final Cycle Settlement Rule (NO FINAL SURPLUS)
- **Full Payout Guarantee**: In cycle $N$ (the final cycle), **no auction is conducted**.
- The entire remaining group balance, including all accrued carried rewards, is disbursed 100% in full to the final recipient.
- The contract balance for the group settles at exactly 0. There is **no leftover or protocol-retained final surplus**.

---

## 4. API Error Handling Contract
All backend API error responses strictly conform to:
```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "Human readable description",
    "details": []
  }
}
```
Standard HTTP status codes:
- `400`: `VALIDATION_ERROR` or invalid payload format.
- `401`: `UNAUTHORIZED` (missing or expired JWT).
- `403`: `FORBIDDEN` (admin role required or access denied).
- `404`: `NOT_FOUND` (entity not found).
- `409`: `CONFLICT` (duplicate username, email, or double action).
- `429`: `RATE_LIMITED` (excessive requests).
- `500`: `INTERNAL_ERROR` (unhandled server errors).

Frontend consumers must always use `getErrorMessage()` and `getApiErrorMessage()` from `apps/web/src/lib/error.ts` to ensure raw error objects are never displayed as `[object Object]`.
