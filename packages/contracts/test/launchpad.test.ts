import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployProtocolFixture, BPS } from "./helpers";

const META = "ipfs://bafy.../meme.json";

async function createLaunch(launchpad: any, feeCollector: any, creator: any, extraValue = 0n) {
  const fee = await feeCollector.launchFeeNative();
  const tx = await launchpad
    .connect(creator)
    .createLaunch("Moon Cat", "MCAT", META, { value: fee + extraValue });
  const receipt = await tx.wait();
  const event = receipt!.logs
    .map((log: any) => {
      try {
        return launchpad.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((e: any) => e?.name === "LaunchCreated");
  return event!.args.token as string;
}

describe("Launchpad (bonding curve)", () => {
  it("creates a launch holding the full supply on the curve", async () => {
    const { launchpad, feeCollector, user } = await loadFixture(deployProtocolFixture);
    const tokenAddr = await createLaunch(launchpad, feeCollector, user);

    const token = await ethers.getContractAt("LaunchedToken", tokenAddr);
    expect(await token.balanceOf(await launchpad.getAddress())).to.equal(
      await launchpad.TOTAL_SUPPLY(),
    );

    const curve = await launchpad.curves(tokenAddr);
    expect(curve.creator).to.equal(user.address);
    expect(curve.tokenReserve).to.equal(await launchpad.CURVE_SUPPLY());
    expect(curve.graduated).to.equal(false);
  });

  it("buys along the curve: fee skimmed, price increases monotonically", async () => {
    const { launchpad, feeCollector, user, other } = await loadFixture(deployProtocolFixture);
    const tokenAddr = await createLaunch(launchpad, feeCollector, user);
    const token = await ethers.getContractAt("LaunchedToken", tokenAddr);

    const buyAmount = ethers.parseEther("1");
    const quote1 = await launchpad.quoteBuy(tokenAddr, buyAmount);
    await launchpad.connect(other).buy(tokenAddr, quote1, { value: buyAmount });
    expect(await token.balanceOf(other.address)).to.equal(quote1);

    // Second identical buy must yield fewer tokens (price moved up the curve).
    const quote2 = await launchpad.quoteBuy(tokenAddr, buyAmount);
    expect(quote2).to.be.lt(quote1);

    // Curve fee (1%) was forwarded to the collector.
    const feeKindCurve = 4; // FeeKind.CURVE
    const curveFee = (buyAmount * 100n) / BPS;
    expect(
      await feeCollector.totalCollected(feeKindCurve, await feeCollector.NATIVE()),
    ).to.equal(curveFee);
  });

  it("sells back to the curve for native, minus the fee", async () => {
    const { launchpad, feeCollector, user, other } = await loadFixture(deployProtocolFixture);
    const tokenAddr = await createLaunch(launchpad, feeCollector, user);
    const token = await ethers.getContractAt("LaunchedToken", tokenAddr);

    await launchpad.connect(other).buy(tokenAddr, 0, { value: ethers.parseEther("2") });
    const tokens = await token.balanceOf(other.address);

    const quote = await launchpad.quoteSell(tokenAddr, tokens);
    expect(quote).to.be.gt(0n);

    await token.connect(other).approve(await launchpad.getAddress(), tokens);
    const before = await ethers.provider.getBalance(other.address);
    const tx = await launchpad.connect(other).sell(tokenAddr, tokens, quote);
    const receipt = await tx.wait();
    const gas = receipt!.gasUsed * receipt!.gasPrice;
    const after = await ethers.provider.getBalance(other.address);

    expect(after - before + gas).to.equal(quote);
    expect(await token.balanceOf(other.address)).to.equal(0n);
  });

  it("enforces slippage floors on buys", async () => {
    const { launchpad, feeCollector, user, other } = await loadFixture(deployProtocolFixture);
    const tokenAddr = await createLaunch(launchpad, feeCollector, user);
    const quote = await launchpad.quoteBuy(tokenAddr, ethers.parseEther("1"));
    await expect(
      launchpad
        .connect(other)
        .buy(tokenAddr, quote + 1n, { value: ethers.parseEther("1") }),
    ).to.be.revertedWithCustomError(launchpad, "SlippageExceeded");
  });

  it("graduates to the DEX once the target is reached and burns the LP", async () => {
    const { launchpad, feeCollector, mockRouter, user, other } =
      await loadFixture(deployProtocolFixture);
    const tokenAddr = await createLaunch(launchpad, feeCollector, user);
    const token = await ethers.getContractAt("LaunchedToken", tokenAddr);

    // Graduation target in the fixture is 5 native — pump past it.
    await expect(launchpad.graduate(tokenAddr)).to.be.revertedWithCustomError(
      launchpad,
      "NotReadyToGraduate",
    );
    await launchpad.connect(other).buy(tokenAddr, 0, { value: ethers.parseEther("6") });

    await expect(launchpad.graduate(tokenAddr)).to.emit(launchpad, "Graduated");

    const curve = await launchpad.curves(tokenAddr);
    expect(curve.graduated).to.equal(true);

    // LP tokens were minted to the burn address.
    const pairAddr = await mockRouter.getPair(tokenAddr, await mockRouter.WETH());
    const pair = await ethers.getContractAt("MockPair", pairAddr);
    expect(await pair.balanceOf(await launchpad.LP_BURN_ADDRESS())).to.be.gt(0n);

    // The graduation router received the LP reserve tokens.
    expect(await token.balanceOf(await mockRouter.getAddress())).to.equal(
      await launchpad.LP_RESERVE(),
    );

    // Post-graduation trading on the curve is closed.
    await expect(
      launchpad.connect(other).buy(tokenAddr, 0, { value: 1n }),
    ).to.be.revertedWithCustomError(launchpad, "AlreadyGraduated");
  });

  it("treats createLaunch overpayment as the creator's first buy", async () => {
    const { launchpad, feeCollector, user } = await loadFixture(deployProtocolFixture);
    const tokenAddr = await createLaunch(
      launchpad,
      feeCollector,
      user,
      ethers.parseEther("1"), // dev first-buy
    );
    const token = await ethers.getContractAt("LaunchedToken", tokenAddr);
    expect(await token.balanceOf(user.address)).to.be.gt(0n);
  });

  it("only admin can tune curve parameters", async () => {
    const { launchpad, user, admin } = await loadFixture(deployProtocolFixture);
    await expect(
      launchpad.connect(user).setParams(1n, 1n),
    ).to.be.revertedWithCustomError(launchpad, "AccessControlUnauthorizedAccount");
    await launchpad.connect(admin).setParams(ethers.parseEther("40"), ethers.parseEther("90"));
    expect(await launchpad.virtualNative()).to.equal(ethers.parseEther("40"));
  });
});
