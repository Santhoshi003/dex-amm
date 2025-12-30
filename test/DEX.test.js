const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DEX", function () {
  let dex, tokenA, tokenB;
  let owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    tokenA = await MockERC20.deploy("Token A", "TKA");
    tokenB = await MockERC20.deploy("Token B", "TKB");

    const DEX = await ethers.getContractFactory("DEX");
    dex = await DEX.deploy(tokenA.address, tokenB.address);

    await tokenA.approve(dex.address, ethers.utils.parseEther("1000000"));
    await tokenB.approve(dex.address, ethers.utils.parseEther("1000000"));

    await tokenA.mint(addr1.address, ethers.utils.parseEther("1000"));
    await tokenB.mint(addr1.address, ethers.utils.parseEther("1000"));

    await tokenA.connect(addr1).approve(dex.address, ethers.utils.parseEther("1000000"));
    await tokenB.connect(addr1).approve(dex.address, ethers.utils.parseEther("1000000"));
  });

  /* -----------------------------------------------------------
     LIQUIDITY MANAGEMENT (12 TESTS)
  ----------------------------------------------------------- */

  describe("Liquidity", function () {
    it("initial liquidity works", async () => {
      await dex.addLiquidity(
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("20")
      );
      const r = await dex.getReserves();
      expect(r[0]).to.equal(ethers.utils.parseEther("10"));
      expect(r[1]).to.equal(ethers.utils.parseEther("20"));
    });

    it("LP minted for first provider", async () => {
      await dex.addLiquidity(
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("10")
      );
      expect(await dex.liquidity(owner.address)).to.be.gt(0);
    });

    it("second provider gets LP", async () => {
      await dex.addLiquidity(
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("10")
      );
      await dex.connect(addr1).addLiquidity(
        ethers.utils.parseEther("5"),
        ethers.utils.parseEther("5")
      );
      expect(await dex.liquidity(addr1.address)).to.be.gt(0);
    });

    it("liquidity ratio remains stable", async () => {
      await dex.addLiquidity(
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("20")
      );
      await dex.connect(addr1).addLiquidity(
        ethers.utils.parseEther("5"),
        ethers.utils.parseEther("10")
      );
      const price = await dex.getPrice();
      expect(price).to.equal(ethers.utils.parseEther("2"));
    });

    it("remove liquidity partially", async () => {
      await dex.addLiquidity(
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("10")
      );
      const lp = await dex.liquidity(owner.address);
      await dex.removeLiquidity(lp.div(2));
      const r = await dex.getReserves();
      expect(r[0]).to.be.lt(ethers.utils.parseEther("10"));
    });

    it("remove all liquidity", async () => {
      await dex.addLiquidity(
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("10")
      );
      const lp = await dex.liquidity(owner.address);
      await dex.removeLiquidity(lp);
      const r = await dex.getReserves();
      expect(r[0]).to.equal(0);
      expect(r[1]).to.equal(0);
    });

    it("revert removing too much LP", async () => {
      await expect(dex.removeLiquidity(1)).to.be.reverted;
    });

    it("revert zero liquidity add", async () => {
      await expect(dex.addLiquidity(0, 0)).to.be.reverted;
    });

    it("liquidity accounting per user", async () => {
      await dex.addLiquidity(
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("10")
      );
      await dex.connect(addr1).addLiquidity(
        ethers.utils.parseEther("5"),
        ethers.utils.parseEther("5")
      );
      expect(await dex.liquidity(owner.address)).to.not.equal(
        await dex.liquidity(addr1.address)
      );
    });

    it("totalLiquidity updates correctly", async () => {
      await dex.addLiquidity(
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("10")
      );
      expect(await dex.totalLiquidity()).to.be.gt(0);
    });

    it("liquidity removal reduces totalLiquidity", async () => {
      await dex.addLiquidity(
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("10")
      );
      const tl1 = await dex.totalLiquidity();
      const lp = await dex.liquidity(owner.address);
      await dex.removeLiquidity(lp.div(2));
      const tl2 = await dex.totalLiquidity();
      expect(tl2).to.be.lt(tl1);
    });

    it("cannot remove zero liquidity", async () => {
      await expect(dex.removeLiquidity(0)).to.be.reverted;
    });
  });

  /* -----------------------------------------------------------
     SWAPS (10 TESTS)
  ----------------------------------------------------------- */

  describe("Swaps", function () {
    beforeEach(async () => {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("100")
      );
    });

    it("swap A to B", async () => {
      await dex.swapAForB(ethers.utils.parseEther("1"));
      expect(await tokenB.balanceOf(owner.address)).to.be.gt(0);
    });

    it("swap B to A", async () => {
      await dex.swapBForA(ethers.utils.parseEther("1"));
      expect(await tokenA.balanceOf(owner.address)).to.be.gt(0);
    });

    it("swap updates reserves", async () => {
      await dex.swapAForB(ethers.utils.parseEther("1"));
      const r = await dex.getReserves();
      expect(r[0]).to.be.gt(ethers.utils.parseEther("100"));
    });

    it("zero swap reverts", async () => {
      await expect(dex.swapAForB(0)).to.be.reverted;
    });

    it("multiple swaps work", async () => {
      await dex.swapAForB(ethers.utils.parseEther("1"));
      await dex.swapAForB(ethers.utils.parseEther("2"));
      await dex.swapBForA(ethers.utils.parseEther("1"));
      const r = await dex.getReserves();
      expect(r[0]).to.be.gt(0);
      expect(r[1]).to.be.gt(0);
    });

    it("large swap has price impact", async () => {
      const price1 = await dex.getPrice();
      await dex.swapAForB(ethers.utils.parseEther("20"));
      const price2 = await dex.getPrice();
      expect(price2).to.not.equal(price1);
    });

    it("swap by second user works", async () => {
      await dex.connect(addr1).swapAForB(
        ethers.utils.parseEther("1")
      );
      expect(await tokenB.balanceOf(addr1.address)).to.be.gt(0);
    });

    it("swap keeps reserves positive", async () => {
      await dex.swapAForB(ethers.utils.parseEther("5"));
      const r = await dex.getReserves();
      expect(r[1]).to.be.gt(0);
    });

    it("getAmountOut returns non-zero", async () => {
      const out = await dex.getAmountOut(
        ethers.utils.parseEther("1"),
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("100")
      );
      expect(out).to.be.gt(0);
    });

    it("swap fails on empty pool", async () => {
      const DEX2 = await ethers.getContractFactory("DEX");
      const dex2 = await DEX2.deploy(tokenA.address, tokenB.address);
      await expect(
        dex2.swapAForB(ethers.utils.parseEther("1"))
      ).to.be.reverted;
    });
  });

  /* -----------------------------------------------------------
     PRICE, FEES & EVENTS (8 TESTS)
  ----------------------------------------------------------- */

  describe("Price, Fees & Events", function () {
    it("price is correct", async () => {
      await dex.addLiquidity(
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("20")
      );
      expect(await dex.getPrice()).to.equal(
        ethers.utils.parseEther("2")
      );
    });

    it("k increases after swap (fees)", async () => {
      await dex.addLiquidity(
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("10")
      );
      const r1 = await dex.getReserves();
      const k1 = r1[0].mul(r1[1]);

      await dex.swapAForB(ethers.utils.parseEther("1"));

      const r2 = await dex.getReserves();
      const k2 = r2[0].mul(r2[1]);
      expect(k2).to.be.gt(k1);
    });

    it("LiquidityAdded event emitted", async () => {
      await expect(
        dex.addLiquidity(
          ethers.utils.parseEther("1"),
          ethers.utils.parseEther("1")
        )
      ).to.emit(dex, "LiquidityAdded");
    });

    it("LiquidityRemoved event emitted", async () => {
      await dex.addLiquidity(
        ethers.utils.parseEther("1"),
        ethers.utils.parseEther("1")
      );
      const lp = await dex.liquidity(owner.address);
      await expect(
        dex.removeLiquidity(lp)
      ).to.emit(dex, "LiquidityRemoved");
    });

    it("Swap event emitted", async () => {
      await dex.addLiquidity(
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("10")
      );
      await expect(
        dex.swapAForB(ethers.utils.parseEther("1"))
      ).to.emit(dex, "Swap");
    });

    it("getReserves returns correct values", async () => {
      await dex.addLiquidity(
        ethers.utils.parseEther("5"),
        ethers.utils.parseEther("15")
      );
      const r = await dex.getReserves();
      expect(r[0]).to.equal(ethers.utils.parseEther("5"));
      expect(r[1]).to.equal(ethers.utils.parseEther("15"));
    });

    it("price updates after swap", async () => {
      await dex.addLiquidity(
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("10")
      );
      const p1 = await dex.getPrice();
      await dex.swapAForB(ethers.utils.parseEther("1"));
      const p2 = await dex.getPrice();
      expect(p2).to.not.equal(p1);
    });

    it("zero price when no liquidity", async () => {
      expect(await dex.getPrice()).to.equal(0);
    });
  });
});
