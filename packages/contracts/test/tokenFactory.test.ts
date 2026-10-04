import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployProtocolFixture } from "./helpers";

describe("TokenFactory", () => {
  const SUPPLY = ethers.parseEther("1000000");
  const META = "ipfs://bafy.../meta.json";

  it("deploys a token, mints supply to the creator, and charges the launch fee", async () => {
    const { factory, feeCollector, user } = await loadFixture(deployProtocolFixture);
    const fee = await feeCollector.launchFeeNative();

    const tx = await factory
      .connect(user)
      .createToken("Gold Pepe", "GPEPE", SUPPLY, META, { value: fee });
    const receipt = await tx.wait();

    const event = receipt!.logs
      .map((log) => {
        try {
          return factory.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e) => e?.name === "TokenCreated");
    expect(event).to.not.be.undefined;

    const tokenAddr = event!.args.token as string;
    const token = await ethers.getContractAt("LaunchedToken", tokenAddr);
    expect(await token.name()).to.equal("Gold Pepe");
    expect(await token.symbol()).to.equal("GPEPE");
    expect(await token.totalSupply()).to.equal(SUPPLY);
    expect(await token.balanceOf(user.address)).to.equal(SUPPLY);
    expect(await token.creator()).to.equal(user.address);
    expect(await token.metadataURI()).to.equal(META);

    expect(await ethers.provider.getBalance(await feeCollector.getAddress())).to.equal(fee);
    expect(await factory.launchCount()).to.equal(1);
    expect(await factory.creatorTokenCount(user.address)).to.equal(1);
  });

  it("refunds overpayment above the launch fee", async () => {
    const { factory, feeCollector, user } = await loadFixture(deployProtocolFixture);
    const fee = await feeCollector.launchFeeNative();
    const overpay = fee + ethers.parseEther("1");

    const before = await ethers.provider.getBalance(user.address);
    const tx = await factory
      .connect(user)
      .createToken("Refund Token", "RFD", SUPPLY, META, { value: overpay });
    const receipt = await tx.wait();
    const gas = receipt!.gasUsed * receipt!.gasPrice;
    const after = await ethers.provider.getBalance(user.address);

    // User only net-paid fee + gas; the 1 ETH overpay came back.
    expect(before - after).to.equal(fee + gas);
  });

  it("rejects underpaying the launch fee", async () => {
    const { factory, user } = await loadFixture(deployProtocolFixture);
    await expect(
      factory.connect(user).createToken("Cheap", "CHP", SUPPLY, META, { value: 0 }),
    ).to.be.revertedWithCustomError(factory, "InsufficientLaunchFee");
  });

  it("rejects empty parameters", async () => {
    const { factory, feeCollector, user } = await loadFixture(deployProtocolFixture);
    const fee = await feeCollector.launchFeeNative();
    await expect(
      factory.connect(user).createToken("", "SYM", SUPPLY, META, { value: fee }),
    ).to.be.revertedWithCustomError(factory, "EmptyParams");
    await expect(
      factory.connect(user).createToken("Name", "SYM", 0, META, { value: fee }),
    ).to.be.revertedWithCustomError(factory, "EmptyParams");
  });
});
