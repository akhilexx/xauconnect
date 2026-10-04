import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployProtocolFixture, NATIVE, BPS } from "./helpers";

const DEADLINE = () => BigInt(Math.floor(Date.now() / 1000) + 3600);

describe("AggregatorRouter", () => {
  it("executes an ERC20→ERC20 swap and skims the protocol fee on input", async () => {
    const { router, feeCollector, adapterId, tokenA, tokenB, mockRouter, user } =
      await loadFixture(deployProtocolFixture);

    const amountIn = ethers.parseEther("100");
    const feeBps = await feeCollector.swapFeeBps(); // 30
    const expectedFee = (amountIn * BigInt(feeBps)) / BPS;
    const expectedOut = amountIn - expectedFee; // mock rate 1:1

    // Fund the venue's inventory and the user.
    await tokenB.mint(await mockRouter.getAddress(), ethers.parseEther("1000"));
    await tokenA.mint(user.address, amountIn);
    await tokenA.connect(user).approve(await router.getAddress(), amountIn);

    await expect(
      router
        .connect(user)
        .swap(
          adapterId,
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          amountIn,
          expectedOut,
          "0x",
          DEADLINE(),
        ),
    )
      .to.emit(router, "SwapExecuted")
      .withArgs(
        adapterId,
        user.address,
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amountIn,
        expectedFee,
        expectedOut,
      );

    expect(await tokenB.balanceOf(user.address)).to.equal(expectedOut);
    expect(await tokenA.balanceOf(await feeCollector.getAddress())).to.equal(expectedFee);
  });

  it("executes a native→ERC20 swap with fee paid in native", async () => {
    const { router, feeCollector, adapterId, tokenB, mockRouter, user } =
      await loadFixture(deployProtocolFixture);

    const amountIn = ethers.parseEther("1");
    const expectedFee = (amountIn * 30n) / BPS;
    const expectedOut = amountIn - expectedFee;
    await tokenB.mint(await mockRouter.getAddress(), ethers.parseEther("10"));

    await router
      .connect(user)
      .swap(adapterId, NATIVE, await tokenB.getAddress(), amountIn, expectedOut, "0x", DEADLINE(), {
        value: amountIn,
      });

    expect(await tokenB.balanceOf(user.address)).to.equal(expectedOut);
    expect(await ethers.provider.getBalance(await feeCollector.getAddress())).to.equal(
      expectedFee,
    );
  });

  it("reverts when the user would receive less than minAmountOut", async () => {
    const { router, adapterId, tokenA, tokenB, mockRouter, user } =
      await loadFixture(deployProtocolFixture);

    const amountIn = ethers.parseEther("10");
    await tokenB.mint(await mockRouter.getAddress(), ethers.parseEther("100"));
    await mockRouter.setRateBps(9000); // venue now pays out 10% less
    await tokenA.mint(user.address, amountIn);
    await tokenA.connect(user).approve(await router.getAddress(), amountIn);

    await expect(
      router
        .connect(user)
        .swap(
          adapterId,
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          amountIn,
          amountIn, // unrealistic floor
          "0x",
          DEADLINE(),
        ),
    ).to.be.reverted; // MockRouter slippage or router InsufficientOutput
  });

  it("rejects swaps through unregistered adapters", async () => {
    const { router, tokenA, tokenB, user } = await loadFixture(deployProtocolFixture);
    const badId = ethers.keccak256(ethers.toUtf8Bytes("ghost-dex"));
    await expect(
      router
        .connect(user)
        .swap(badId, await tokenA.getAddress(), await tokenB.getAddress(), 1n, 0n, "0x", DEADLINE()),
    ).to.be.revertedWithCustomError(router, "UnknownAdapter");
  });

  it("rejects expired deadlines", async () => {
    const { router, adapterId, tokenA, tokenB, user } = await loadFixture(deployProtocolFixture);
    await expect(
      router
        .connect(user)
        .swap(adapterId, await tokenA.getAddress(), await tokenB.getAddress(), 1n, 0n, "0x", 1n),
    ).to.be.revertedWithCustomError(router, "DeadlineExpired");
  });

  it("pause blocks swaps; unpause restores them", async () => {
    const { router, admin, adapterId, tokenA, tokenB, mockRouter, user } =
      await loadFixture(deployProtocolFixture);

    await router.connect(admin).pause();
    await expect(
      router
        .connect(user)
        .swap(adapterId, await tokenA.getAddress(), await tokenB.getAddress(), 1n, 0n, "0x", DEADLINE()),
    ).to.be.revertedWithCustomError(router, "EnforcedPause");

    await router.connect(admin).unpause();
    await tokenB.mint(await mockRouter.getAddress(), ethers.parseEther("1"));
    await tokenA.mint(user.address, 1000n);
    await tokenA.connect(user).approve(await router.getAddress(), 1000n);
    await router
      .connect(user)
      .swap(adapterId, await tokenA.getAddress(), await tokenB.getAddress(), 1000n, 0n, "0x", DEADLINE());
  });

  it("only ADAPTER_MANAGER_ROLE can register adapters", async () => {
    const { router, user, adapter } = await loadFixture(deployProtocolFixture);
    const id = ethers.keccak256(ethers.toUtf8Bytes("new-dex"));
    await expect(
      router.connect(user).setAdapter(id, await adapter.getAddress()),
    ).to.be.revertedWithCustomError(router, "AccessControlUnauthorizedAccount");
  });
});
