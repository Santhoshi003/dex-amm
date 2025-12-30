# DEX AMM Project

## Overview

This project implements a **simplified Decentralized Exchange (DEX)** using an **Automated Market Maker (AMM)** model similar to **Uniswap V2**.
The DEX allows users to:

* Provide liquidity to a token pair and receive LP (Liquidity Provider) shares
* Remove liquidity and redeem their proportional share of the pool
* Swap between two ERC-20 tokens without an order book
* Earn trading fees as a liquidity provider

The system is fully **on-chain**, **non-custodial**, and **permissionless**, with all logic implemented in Solidity and validated through an extensive automated test suite.

---

## Features

* Initial and subsequent liquidity provision
* LP token accounting using proportional shares
* Liquidity removal with correct reserve calculations
* Token swaps using the constant product formula (x × y = k)
* 0.3% trading fee retained in the pool for LPs
* Accurate price calculation based on reserves
* Event emission for all major actions
* 30+ automated tests covering core logic and edge cases
* Fully containerized Docker setup for reproducible evaluation

---

## Architecture

### Contract Structure

* **DEX.sol**

  * Core AMM logic
  * Manages reserves, swaps, liquidity, and fees
* **MockERC20.sol**

  * Simple ERC-20 token used for testing
  * Includes minting for test scenarios

### High-Level Flow

1. Users approve tokens to the DEX
2. Liquidity providers deposit Token A and Token B
3. The DEX updates reserves and mints LP shares
4. Traders swap tokens against the pool
5. Fees remain in the pool, increasing LP value
6. LPs withdraw their proportional share later

---

## Mathematical Implementation

### Constant Product Formula

The AMM follows the invariant:

```
x × y = k
```

Where:

* `x` = reserve of Token A
* `y` = reserve of Token B
* `k` = constant value

After each swap, `k` **never decreases**.
Because fees remain in the pool, `k` **slightly increases over time**, benefiting liquidity providers.

---

### Fee Calculation (0.3%)

A 0.3% fee is applied to each swap:

```
amountInWithFee = amountIn × 997
numerator = amountInWithFee × reserveOut
denominator = (reserveIn × 1000) + amountInWithFee
amountOut = numerator / denominator
```

* 99.7% of input is used for price calculation
* 0.3% stays in the pool as fees
* Fees are automatically distributed via increased reserves

---

### LP Token Minting

#### Initial Liquidity (First Provider)

```
liquidityMinted = sqrt(amountA × amountB)
```

* First provider sets the initial price
* LP shares represent 100% of the pool

#### Subsequent Liquidity

```
liquidityMinted = (amountA × totalLiquidity) / reserveA
```

* Ensures price ratio is preserved
* LP shares represent proportional ownership

---

### Liquidity Removal

When LP tokens are burned:

```
amountA = (liquidityBurned × reserveA) / totalLiquidity
amountB = (liquidityBurned × reserveB) / totalLiquidity
```

This guarantees:

* Fair withdrawal
* Fees earned are included automatically

---

## Setup Instructions

### Prerequisites

* Node.js (v16 / v18 recommended)
* Docker & Docker Compose
* Git

---

### Local Setup (Without Docker)

```bash
git clone <your-repo-url>
cd dex-amm

npm install --legacy-peer-deps
npx hardhat compile
npx hardhat test
```

Expected output:

```
30 passing
```

---

### Docker Setup (Evaluator Environment)

```bash
docker-compose up -d
docker-compose exec app npm run compile
docker-compose exec app npm test
docker-compose exec app npm run coverage
```

Expected:

* All tests pass
* Code coverage ≥ 80%

---

## Testing

* **30+ automated test cases**
* Covers:

  * Liquidity management
  * LP accounting
  * Swaps (A → B and B → A)
  * Fee accumulation
  * Price updates
  * Edge cases
  * Event emissions
  * Multi-user interactions
* Tests located in:

  ```
  test/DEX.test.js
  ```

---

## Contract Addresses

This project is evaluated in a **local / Docker environment**.
No public testnet deployment is required.

(If deployed later, addresses can be added here.)

---

## Known Limitations

* Supports only a **single trading pair**
* No slippage protection (`minAmountOut`)
* No deadline parameter for time-bound swaps
* No flash swap support

These were intentionally excluded to keep the implementation focused on core AMM mechanics.

---

## Security Considerations

* Solidity `^0.8.x` prevents integer overflow/underflow
* Input validation for zero values and invalid liquidity removal
* No external price oracle dependency
* Fee logic applied **before** swap calculations
* Events emitted after state updates
* Simple architecture reduces attack surface

For a production system, additional protections such as:

* ReentrancyGuard
* Slippage protection
* MEV mitigation
  would be recommended.

---

## Verification Checklist

Before submission, the following commands were verified:

```bash
docker-compose exec app npm run compile
docker-compose exec app npm test
docker-compose exec app npm run coverage
```

Results:

* ✔ Contracts compile successfully
* ✔ All 30+ tests pass
* ✔ Coverage ≥ 80%
* ✔ Docker environment works as specified

---

## Conclusion

This project demonstrates a complete, test-driven implementation of a Uniswap-style AMM DEX.
It covers **core DeFi mechanics**, **economic modeling**, **smart contract security**, and **containerized evaluation**, providing a strong foundation for more advanced decentralized exchange designs.
