// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Decentralized Exchange (AMM)
/// @notice Implements a constant product Automated Market Maker similar to Uniswap V2
/// @dev Supports liquidity provision, swaps, and fee distribution
contract DEX {
    /// @notice Address of token A
    address public tokenA;

    /// @notice Address of token B
    address public tokenB;

    /// @notice Current reserve of token A
    uint256 public reserveA;

    /// @notice Current reserve of token B
    uint256 public reserveB;

    /// @notice Total liquidity (LP supply)
    uint256 public totalLiquidity;

    /// @notice Mapping of provider address to LP balance
    mapping(address => uint256) public liquidity;

    /// @notice Emitted when liquidity is added to the pool
    /// @param provider Address providing liquidity
    /// @param amountA Amount of token A deposited
    /// @param amountB Amount of token B deposited
    /// @param liquidityMinted LP tokens minted
    event LiquidityAdded(
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidityMinted
    );

    /// @notice Emitted when liquidity is removed from the pool
    /// @param provider Address removing liquidity
    /// @param amountA Amount of token A returned
    /// @param amountB Amount of token B returned
    /// @param liquidityBurned LP tokens burned
    event LiquidityRemoved(
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidityBurned
    );

    /// @notice Emitted when a swap occurs
    /// @param trader Address performing the swap
    /// @param tokenIn Address of input token
    /// @param tokenOut Address of output token
    /// @param amountIn Amount of input token
    /// @param amountOut Amount of output token
    event Swap(
        address indexed trader,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    /// @notice Initializes the DEX with two ERC20 tokens
    /// @param _tokenA Address of token A
    /// @param _tokenB Address of token B
    constructor(address _tokenA, address _tokenB) {
        tokenA = _tokenA;
        tokenB = _tokenB;
    }

    /// @notice Add liquidity to the pool
    /// @param amountA Amount of token A to deposit
    /// @param amountB Amount of token B to deposit
    /// @return liquidityMinted Amount of LP tokens minted
    function addLiquidity(uint256 amountA, uint256 amountB)
        external
        returns (uint256 liquidityMinted)
    {
        require(amountA > 0 && amountB > 0, "Zero amount");

        IERC20(tokenA).transferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).transferFrom(msg.sender, address(this), amountB);

        if (totalLiquidity == 0) {
            // First liquidity provider sets initial price
            liquidityMinted = sqrt(amountA * amountB);
        } else {
            // Subsequent providers mint proportionally
            liquidityMinted = (amountA * totalLiquidity) / reserveA;
        }

        require(liquidityMinted > 0, "Zero liquidity");

        liquidity[msg.sender] += liquidityMinted;
        totalLiquidity += liquidityMinted;

        reserveA += amountA;
        reserveB += amountB;

        emit LiquidityAdded(msg.sender, amountA, amountB, liquidityMinted);
    }

    /// @notice Remove liquidity from the pool
    /// @param liquidityAmount Amount of LP tokens to burn
    /// @return amountA Amount of token A returned
    /// @return amountB Amount of token B returned
    function removeLiquidity(uint256 liquidityAmount)
        external
        returns (uint256 amountA, uint256 amountB)
    {
        require(liquidityAmount > 0, "Zero liquidity");
        require(liquidity[msg.sender] >= liquidityAmount, "Not enough LP");

        amountA = (liquidityAmount * reserveA) / totalLiquidity;
        amountB = (liquidityAmount * reserveB) / totalLiquidity;

        liquidity[msg.sender] -= liquidityAmount;
        totalLiquidity -= liquidityAmount;

        reserveA -= amountA;
        reserveB -= amountB;

        IERC20(tokenA).transfer(msg.sender, amountA);
        IERC20(tokenB).transfer(msg.sender, amountB);

        emit LiquidityRemoved(msg.sender, amountA, amountB, liquidityAmount);
    }

    /// @notice Swap token A for token B
    /// @param amountAIn Amount of token A input
    /// @return amountBOut Amount of token B output
    function swapAForB(uint256 amountAIn)
        external
        returns (uint256 amountBOut)
    {
        require(amountAIn > 0, "Zero swap");

        IERC20(tokenA).transferFrom(msg.sender, address(this), amountAIn);

        amountBOut = getAmountOut(amountAIn, reserveA, reserveB);
        require(amountBOut > 0, "Zero output");

        reserveA += amountAIn;
        reserveB -= amountBOut;

        IERC20(tokenB).transfer(msg.sender, amountBOut);

        emit Swap(msg.sender, tokenA, tokenB, amountAIn, amountBOut);
    }

    /// @notice Swap token B for token A
    /// @param amountBIn Amount of token B input
    /// @return amountAOut Amount of token A output
    function swapBForA(uint256 amountBIn)
        external
        returns (uint256 amountAOut)
    {
        require(amountBIn > 0, "Zero swap");

        IERC20(tokenB).transferFrom(msg.sender, address(this), amountBIn);

        amountAOut = getAmountOut(amountBIn, reserveB, reserveA);
        require(amountAOut > 0, "Zero output");

        reserveB += amountBIn;
        reserveA -= amountAOut;

        IERC20(tokenA).transfer(msg.sender, amountAOut);

        emit Swap(msg.sender, tokenB, tokenA, amountBIn, amountAOut);
    }

    /// @notice Get the current price of token A in terms of token B
    /// @return price Price scaled by 1e18
    function getPrice() external view returns (uint256 price) {
        if (reserveA == 0) return 0;
        return (reserveB * 1e18) / reserveA;
    }

    /// @notice Get current reserves of the pool
    /// @return _reserveA Reserve of token A
    /// @return _reserveB Reserve of token B
    function getReserves()
        external
        view
        returns (uint256 _reserveA, uint256 _reserveB)
    {
        return (reserveA, reserveB);
    }

    /// @notice Calculate output amount for a swap including 0.3% fee
    /// @param amountIn Input token amount
    /// @param reserveIn Input token reserve
    /// @param reserveOut Output token reserve
    /// @return amountOut Output token amount
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256 amountOut) {
        require(reserveIn > 0 && reserveOut > 0, "Empty pool");

        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;

        amountOut = numerator / denominator;
    }

    /// @dev Integer square root used for initial LP minting
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
