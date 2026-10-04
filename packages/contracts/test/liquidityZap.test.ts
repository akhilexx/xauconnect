import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployProtocolFixture, BPS } from "./helpers";

const DEADLINE = () => BigInt(Math.floor(Date.now() / 1000) + 3600);

describe("LiquidityZap", () => {
  it("adds liquidity with the LP fee skimmed from both legs", async () => {
    const { zap, feeCollector, mockRouter, tokenA, tokenB, user } =
      await loadFixture(deployProtocolFixture);

    const amountA = ethers.parseEther("100");
    const amountB = ethers.parseEther("200");
    const lpFeeBps = BigInt(await feeCollector.lpFeeBps()); // 10
    const feeA = (amountA * lpFeeBps) / BPS;
    const feeB = (amountB * lpFeeBps) / BPS;

    await tokenA.mint(user.address, amountA);
    await tokenB.mint(user.address, amountB);
    await tokenA.connect(user).approve(await zap.getAddress(), amountA);
    await tokenB.connect(user).approve(await zap.getAddress(), amountB);

    await expect(
      zap
        .connect(user)
        .addLiquidity(
          await mockRouter.getAddress(),
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          amountA,
          amountB,
          0,
          0,
          DEADLINE(),
        ),
    ).to.emit(zap, "LiquidityAdded");

    expect(await tokenA.balanceOf(await feeCollector.getAddress())).to.equal(feeA);
    expect(await tokenB.balanceOf(await feeCollector.getAddress())).to.equal(feeB);

    // User received LP tokens for the net amounts.
    const pairAddr = await mockRouter.getPair(await tokenA.getAddress(), await tokenB.getAddress());
    const pair = await ethers.getContractAt("MockPair", pairAddr);
    expect(await pair.balanceOf(user.address)).to.equal(amountA - feeA);
  });

  it("removes liquidity with the LP fee skimmed from both outputs", async () => {
    const { zap, feeCollector, mockRouter, tokenA, tokenB, user } =
      await loadFixture(deployProtocolFixture);

    const amountA = ethers.parseEther("100");
    const amountB = ethers.parseEther("100");
    await tokenA.mint(user.address, amountA);
    await tokenB.mint(user.address, amountB);
    await tokenA.connect(user).approve(await zap.getAddress(), amountA);
    await tokenB.connect(user).approve(await zap.getAddress(), amountB);
    await zap
      .connect(user)
      .addLiquidity(
        await mockRouter.getAddress(),
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amountA,
        amountB,
        0,
        0,
        DEADLINE(),
      );

    const pairAddr = await mockRouter.getPair(await tokenA.getAddress(), await tokenB.getAddress());
    const pair = await ethers.getContractAt("MockPair", pairAddr);
    const lpBalance = await pair.balanceOf(user.address);
    await pair.connect(user).approve(await zap.getAddress(), lpBalance);

    const collectorABefore = await tokenA.balanceOf(await feeCollector.getAddress());
    const userABefore = await tokenA.balanceOf(user.address);

    await expect(
      zap
        .connect(user)
        .removeLiquidity(
          await mockRouter.getAddress(),
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          lpBalance,
          0,
          0,
          DEADLINE(),
        ),
    ).to.emit(zap, "LiquidityRemoved");

    const collectorAAfter = await tokenA.balanceOf(await feeCollector.getAddress());
    expect(collectorAAfter).to.be.gt(collectorABefore); // fee captured on exit
    expect(await tokenA.balanceOf(user.address)).to.be.gt(userABefore); // principal returned
  });

  it("rejects non-whitelisted routers", async () => {
    const { zap, tokenA, tokenB, user, other } = await loadFixture(deployProtocolFixture);
    await expect(
      zap
        .connect(user)
        .addLiquidity(
          other.address,
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          1n,
          1n,
          0,
          0,
          DEADLINE(),
        ),
    ).to.be.revertedWithCustomError(zap, "RouterNotAllowed");
  });

  it("only the owner can whitelist routers", async () => {
    const { zap, user, mockRouter } = await loadFixture(deployProtocolFixture);
    await expect(
      zap.connect(user).setRouterAllowed(await mockRouter.getAddress(), false),
    ).to.be.revertedWithCustomError(zap, "OwnableUnauthorizedAccount");
  });
});
