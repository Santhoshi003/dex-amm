# DEX AMM Project

## Overview

This project implements a **Decentralized Exchange (DEX)** using an **Automated Market Maker (AMM)** model similar to Uniswap V2.
The exchange enables decentralized token trading without order books or intermediaries by using on-chain liquidity pools and mathematical pricing.

Users can:

* Provide liquidity and earn fees
* Remove liquidity at any time
* Swap between two ERC-20 tokens
* Trade in a fully non-custodial and transparent manner

All logic is implemented in Solidity, validated through an extensive automated test suite, and packaged with Docker for reproducible execution.

---

## Features

* Add initial and subsequent liquidity to a token pair
* Mint and track LP (Liquidity Provider) shares
* Remove liquidity proportionally to pool ownership
* Token swaps using the constant product formula (x × y = k)
* 0.3% trading fee distributed to liquidity providers
* Accurate price calculation based on reserves
* Event emission for liquidity and swap actions
* 30+ automated tests covering normal and edge cases
* Docker-based execution for consistent environments

---

## Architecture

### Smart Contracts

* **DEX.sol**

  * Core AMM implementation
  * Manages reserves, swaps, fees, and liquidity accounting

* **MockERC20.sol**

  * Simple ERC-20 token used for testing
  * Includes mint functionality for test scenarios

### High-Level Flow

1. Tokens are approved to the DEX contract
2. Liquidity providers deposit two tokens into the pool
3. The pool updates reserves and mints LP shares
4. Traders swap tokens against the pool
5. Fees remain in the pool, increasing LP value
6. Liquidity providers withdraw their proportional share

---

## Mathematical Implementation

### Constant Product Formula

The AMM pricing follows the invariant:

```
x × y = k
```

Where:

* `x` = reserve of Token A
* `y` = reserve of Token B
* `k` = constant value

After each trade, the product of reserves never decreases.
Because fees remain in the pool, `k` increases slightly over time, which represents earnings for liquidity providers.

---

### Fee Calculation (0.3%)

A 0.3% fee is applied to every swap:

```
amountInWithFee = amountIn × 997
numerator = amountInWithFee × reserveOut
denominator = (reserveIn × 1000) + amountInWithFee
amountOut = numerator / denominator
```

* 99.7% of the input amount is used for pricing
* 0.3% remains in the pool as fees
* Fees are automatically distributed through increased reserves

---

### LP Token Minting

#### Initial Liquidity

For the first liquidity provider:

```
liquidityMinted = sqrt(amountA × amountB)
```

This provider sets the initial price and owns 100% of the pool.

#### Subsequent Liquidity

For later providers:

```
liquidityMinted = (amountA × totalLiquidity) / reserveA
```

This ensures the existing price ratio is preserved and LP shares represent proportional ownership.

---

### Liquidity Removal

When LP shares are burned:

```
amountA = (liquidityBurned × reserveA) / totalLiquidity
amountB = (liquidityBurned × reserveB) / totalLiquidity
```

This guarantees fair withdrawal including accumulated fees.

---

## Setup Instructions

### Prerequisites

* Node.js (v16 or v18 recommended)
* Docker and Docker Compose
* Git

---

### Local Execution (Without Docker)

```bash
git clone <repository-url>
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

### Docker Execution (Recommended)

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

* 30+ automated test cases
* Tests include:

  * Liquidity management
  * LP accounting
  * Token swaps
  * Fee accumulation
  * Price updates
  * Edge cases
  * Event emissions
  * Multiple user interactions

Test file:

```
test/DEX.test.js
```

---

## Contract Addresses

This project is designed for local and containerized execution.
No public testnet deployment is required.

---

## Known Limitations

* Supports a single token pair
* No slippage protection (`minAmountOut`)
* No deadline parameter for swaps
* No flash swap functionality

These features can be added as extensions but were intentionally excluded to keep the core AMM logic clear and focused.

---

## Security Considerations

* Solidity `^0.8.x` prevents integer overflow and underflow
* Input validation for zero values and invalid operations
* Fee calculation applied before pricing logic
* Events emitted after state updates
* Minimal external dependencies to reduce attack surface

For production usage, additional safeguards such as slippage limits, reentrancy protection, and MEV mitigation should be considered.

---

## Verification

The following commands were used to verify correctness:

```bash
docker-compose exec app npm run compile
docker-compose exec app npm test
docker-compose exec app npm run coverage
```

Results:

* Contracts compile successfully
* All tests pass
* Coverage meets requirements
* Docker environment works as expected

---

## Summary

This project provides a complete implementation of a Uniswap-style AMM DEX, demonstrating decentralized trading mechanics, liquidity economics, and smart contract design best practices.
It serves as a solid foundation for more advanced decentralized finance systems.
