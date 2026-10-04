import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployProtocolFixture, NATIVE } from "./helpers";

describe("FeeCollector", () => {
  it("initializes with default fee configuration", async () => {
    const { feeCollector } = await loadFixture(deployProtocolFixture);
    expect(await feeCollector.swapFeeBps()).to.equal(30);
    expect(await feeCollector.lpFeeBps()).to.equal(10);
    expect(await feeCollector.curveFeeBps()).to.equal(100);
    expect(await feeCollector.launchFeeNative()).to.equal(ethers.parseEther("0.01"));
  });

  it("enforces the 0–10_000 bps swap fee window", async () => {
    const { feeCollector, admin } = await loadFixture(deployProtocolFixture);
    await expect(feeCollector.connect(admin).setSwapFeeBps(10_001)).to.be.revertedWithCustomError(
      feeCollector,
      "FeeOutOfBounds",
    );
    await feeCollector.connect(admin).setSwapFeeBps(300);
    expect(await feeCollector.swapFeeBps()).to.equal(300);
    await feeCollector.connect(admin).setSwapFeeBps(0);
    expect(await feeCollector.swapFeeBps()).to.equal(0);
  });

  it("rejects fee configuration from non-managers", async () => {
    const { feeCollector, user } = await loadFixture(deployProtocolFixture);
    await expect(feeCollector.connect(user).setSwapFeeBps(50)).to.be.revertedWithCustomError(
      feeCollector,
      "AccessControlUnauthorizedAccount",
    );
  });

  it("records native fees via notifyFee and tracks totals", async () => {
    const { feeCollector, user } = await loadFixture(deployProtocolFixture);
    const amount = ethers.parseEther("1");
    await expect(
      feeCollector.connect(user).notifyFee(0, NATIVE, amount, user.address, { value: amount }),
    )
      .to.emit(feeCollector, "FeeReceived")
      .withArgs(0, NATIVE, amount, user.address);

    expect(await feeCollector.totalCollected(0, NATIVE)).to.equal(amount);
    expect(await ethers.provider.getBalance(await feeCollector.getAddress())).to.equal(amount);
  });

  it("reverts when native value does not match the declared amount", async () => {
    const { feeCollector, user } = await loadFixture(deployProtocolFixture);
    await expect(
      feeCollector.connect(user).notifyFee(0, NATIVE, ethers.parseEther("1"), user.address, {
        value: ethers.parseEther("0.5"),
      }),
    ).to.be.revertedWithCustomError(feeCollector, "NativeAmountMismatch");
  });

  it("allows treasury withdrawals only for WITHDRAWER_ROLE", async () => {
    const { feeCollector, admin, user, treasury } = await loadFixture(deployProtocolFixture);
    const amount = ethers.parseEther("2");
    await feeCollector.connect(user).notifyFee(0, NATIVE, amount, user.address, { value: amount });

    await expect(
      feeCollector.connect(user).withdraw(NATIVE, treasury.address, amount),
    ).to.be.revertedWithCustomError(feeCollector, "AccessControlUnauthorizedAccount");

    const before = await ethers.provider.getBalance(treasury.address);
    await feeCollector.connect(admin).withdraw(NATIVE, treasury.address, amount);
    expect(await ethers.provider.getBalance(treasury.address)).to.equal(before + amount);
  });

  it("withdraws ERC20 fees", async () => {
    const { feeCollector, admin, treasury, tokenA } = await loadFixture(deployProtocolFixture);
    await tokenA.mint(await feeCollector.getAddress(), 1000n);
    await feeCollector.connect(admin).withdraw(await tokenA.getAddress(), treasury.address, 1000n);
    expect(await tokenA.balanceOf(treasury.address)).to.equal(1000n);
  });

  it("routes withdrawals to the configured fee-collector wallet", async () => {
    const { feeCollector, admin, treasury, user } = await loadFixture(deployProtocolFixture);
    await feeCollector.connect(admin).setWithdrawalRecipient(treasury.address);
    const amount = ethers.parseEther("1");
    await feeCollector.connect(user).notifyFee(0, NATIVE, amount, user.address, { value: amount });

    const before = await ethers.provider.getBalance(treasury.address);
    await feeCollector.connect(admin).withdrawToRecipient(NATIVE, amount);
    expect(await ethers.provider.getBalance(treasury.address)).to.equal(before + amount);

    await expect(
      feeCollector.connect(admin).withdraw(NATIVE, user.address, 1n),
    ).to.be.revertedWithCustomError(feeCollector, "ZeroAddress");
  });
});
