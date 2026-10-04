import { ethers, upgrades } from "hardhat";
import type { Signer } from "ethers";

export const NATIVE = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
export const BPS = 10_000n;

/** Deploy the full protocol stack against a MockDexRouter. */
export async function deployProtocolFixture() {
  const [admin, user, treasury, other] = await ethers.getSigners();

  // Mock WETH + trading tokens
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const weth = await MockERC20.deploy("Wrapped Ether", "WETH", 18);
  const tokenA = await MockERC20.deploy("Token A", "TKA", 18);
  const tokenB = await MockERC20.deploy("Token B", "TKB", 18);

  // Mock venue
  const MockDexRouter = await ethers.getContractFactory("MockDexRouter");
  const mockRouter = await MockDexRouter.deploy(await weth.getAddress());

  // FeeCollector (UUPS)
  const FeeCollector = await ethers.getContractFactory("FeeCollector");
  const feeCollector = await upgrades.deployProxy(FeeCollector, [admin.address], {
    kind: "uups",
  });

  // AggregatorRouter (UUPS)
  const AggregatorRouter = await ethers.getContractFactory("AggregatorRouter");
  const router = await upgrades.deployProxy(
    AggregatorRouter,
    [admin.address, await feeCollector.getAddress()],
    { kind: "uups" },
  );

  // UniswapV2-family adapter pointed at the mock venue
  const UniswapV2Adapter = await ethers.getContractFactory("UniswapV2Adapter");
  const adapter = await UniswapV2Adapter.deploy(await mockRouter.getAddress());
  const adapterId = ethers.keccak256(ethers.toUtf8Bytes("mock-v2"));
  await router.connect(admin).setAdapter(adapterId, await adapter.getAddress());

  // LiquidityZap
  const LiquidityZap = await ethers.getContractFactory("LiquidityZap");
  const zap = await LiquidityZap.deploy(await feeCollector.getAddress(), admin.address);
  await zap.connect(admin).setRouterAllowed(await mockRouter.getAddress(), true);

  // TokenFactory (UUPS)
  const TokenFactory = await ethers.getContractFactory("TokenFactory");
  const factory = await upgrades.deployProxy(
    TokenFactory,
    [admin.address, await feeCollector.getAddress()],
    { kind: "uups" },
  );

  // Launchpad (UUPS) — small targets so tests can graduate cheaply
  const Launchpad = await ethers.getContractFactory("Launchpad");
  const launchpad = await upgrades.deployProxy(
    Launchpad,
    [
      admin.address,
      await feeCollector.getAddress(),
      await mockRouter.getAddress(),
      ethers.parseEther("30"), // virtual native reserve
      ethers.parseEther("5"), // graduation target
    ],
    { kind: "uups" },
  );

  return {
    admin,
    user,
    treasury,
    other,
    weth,
    tokenA,
    tokenB,
    mockRouter,
    feeCollector,
    router,
    adapter,
    adapterId,
    zap,
    factory,
    launchpad,
  };
}

export async function fundAndApprove(
  token: { mint: Function; connect: Function },
  owner: Signer,
  spender: string,
  amount: bigint,
) {
  await token.mint(await owner.getAddress(), amount);
  await (token as any).connect(owner).approve(spender, amount);
}
