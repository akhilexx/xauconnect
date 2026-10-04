/**
 * XauApiClient — typed REST client for the XAUConnect backend.
 * Shared by the web app, mobile app, and any third-party integration.
 */
import type {
  AdminMetrics,
  AggregatedQuote,
  Candle,
  CrossChainBuild,
  CrossChainQuote,
  CrossChainQuoteRequest,
  DiscoveryTab,
  FeeConfig,
  LpQuote,
  LpQuoteRequest,
  MarketToken,
  OnrampAsset,
  OnrampCheckoutRequest,
  OnrampCheckoutResponse,
  OnrampConfig,
  OnrampDefaults,
  OnrampFiat,
  OnrampGeo,
  OnrampPaymentMethod,
  OnrampQuoteRequest,
  OnrampQuotesResponse,
  OnrampType,
  QuoteRequest,
  RouteQuote,
  SwapTx,
  TokenInfo,
  TokenLaunchRequest,
} from "@xauconnect/utils";

/** Social links a user can attach to their wallet profile. */
export interface LimitOrder {
  id: string;
  chainKey: string;
  userAddress: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  targetPrice: number;
  slippageBps: number;
  status: string;
  expiresAt: string | null;
  triggeredAt: string | null;
  filledTxHash: string | null;
  createdAt: string;
}

export interface UserSocialProfile {
  displayName?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
  website?: string;
}

export interface XauClientOptions {
  baseUrl: string;
  /** Session JWT (set after wallet sign-in). */
  token?: string;
  fetchImpl?: typeof fetch;
  /** Identifies the integration for admin API analytics (X-Client-Id). */
  clientId?: string;
  clientName?: string;
  /** web | api | agent — sent as X-Client-Source. */
  clientSource?: "web" | "api" | "agent";
}

export class XauApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export interface GoldCurveView {
  mint: string;
  pool: string;
  config: string;
  quoteMint: string;
  quoteSymbol: "SOL" | "USDC";
  quoteDecimals: number;
  preset: "fair" | "shield" | "distribute" | "external";
  segment: string;
  segmentIndex: number;
  segmentCount: number;
  progress: number;
  raised: string;
  threshold: string;
  feeBpsNow: number;
  feeBpsFinal: number;
  feeEndsAt: number | null;
  migrated: boolean;
  dammPool: string | null;
  feeClaimer: string;
  leftoverReceiver: string;
  creatorTradingFeePercentage: number;
  partnerLockedPct: number;
  creatorLockedPct: number;
  lockedLp: string;
}

export interface GoldCurveFeePool {
  pool: string;
  mint: string;
  symbol: string | null;
  name: string | null;
  quoteSymbol: "SOL" | "USDC";
  unclaimedBase: string;
  unclaimedQuote: string;
  migrated: boolean;
  preset: "fair" | "shield" | "distribute" | "external" | null;
}

export class XauApiClient {
  private baseUrl: string;
  private token?: string;
  private fetchImpl: typeof fetch;
  private clientId?: string;
  private clientName?: string;
  private clientSource?: string;

  constructor(options: XauClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.token = options.token;
    this.clientId = options.clientId;
    this.clientName = options.clientName;
    this.clientSource = options.clientSource;
    // Bind to globalThis — assigning bare `fetch` to an instance property and
    // calling it as `this.fetchImpl(...)` throws "Illegal invocation" in browsers.
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
  }

  setToken(token: string | undefined): void {
    this.token = token;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      cache: "no-store",
      ...init,
      headers: {
        "content-type": "application/json",
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
        ...(this.clientId ? { "x-client-id": this.clientId } : {}),
        ...(this.clientName ? { "x-client-name": this.clientName } : {}),
        ...(this.clientSource ? { "x-client-source": this.clientSource } : {}),
        ...init?.headers,
      },
    });
    const body = (await res.json().catch(() => ({}))) as any;
    if (!res.ok) {
      throw new XauApiError(
        res.status,
        body?.error?.code ?? "UNKNOWN",
        body?.error?.message ?? `Request failed (${res.status})`,
      );
    }
    return body as T;
  }

  private post<T>(path: string, data: unknown): Promise<T> {
    return this.request<T>(path, { method: "POST", body: JSON.stringify(data) });
  }

  // ── Auth ────────────────────────────────────────────────────────────────

  authChallenge(address: string): Promise<{ nonce: string; message: string }> {
    return this.post("/auth/challenge", { address });
  }

  authVerify(input: {
    address: string;
    signature: string;
    nonce: string;
  }): Promise<{ token: string; role: "USER" | "ADMIN" }> {
    return this.post("/auth/verify", input);
  }

  /** Email + password login for the admin console (/xaxmd5/login). */
  adminLogin(email: string, password: string): Promise<{ token: string; role: "ADMIN" }> {
    return this.post("/auth/admin-login", { email, password });
  }

  /** Fetch the signed-in user's social profile. */
  getProfile(): Promise<{ profile: UserSocialProfile | null }> {
    return this.request("/auth/profile");
  }

  /** Update the signed-in user's social links. */
  updateProfile(profile: UserSocialProfile): Promise<{ ok: boolean; profile: UserSocialProfile }> {
    return this.request("/auth/profile", { method: "PUT", body: JSON.stringify(profile) });
  }

  // ── Swap aggregation ────────────────────────────────────────────────────

  getChains(): Promise<{ chains: Array<{ key: string; name: string; kind: string; nativeSymbol: string; color: string; explorerUrl: string }> }> {
    return this.request("/swap/chains");
  }

  getDexes(chainKey?: string): Promise<{ dexes: Array<{ id: string; name: string; chainKey: string; protocol: string }> }> {
    const q = chainKey ? `?chainKey=${encodeURIComponent(chainKey)}` : "";
    return this.request(`/swap/dexes${q}`);
  }

  getAllowance(params: {
    chainKey: string;
    token: string;
    owner: string;
    spender: string;
  }): Promise<{ allowance: string; token: string; owner: string; spender: string }> {
    const q = new URLSearchParams(params);
    return this.request(`/swap/allowance?${q}`);
  }

  searchTokens(opts: {
    chainKey?: string;
    search?: string;
    limit?: number;
    offset?: number;
    tags?: string;
  } = {}): Promise<{ tokens: TokenInfo[]; total: number; hasMore: boolean }> {
    const params = new URLSearchParams();
    if (opts.chainKey) params.set("chainKey", opts.chainKey);
    if (opts.search) params.set("search", opts.search);
    if (opts.limit != null) params.set("limit", String(opts.limit));
    if (opts.offset != null) params.set("offset", String(opts.offset));
    if (opts.tags) params.set("tags", opts.tags);
    const q = params.toString();
    return this.request(`/swap/tokens${q ? `?${q}` : ""}`);
  }

  getTokens(chainKey: string): Promise<{ tokens: TokenInfo[] }> {
    return this.searchTokens({ chainKey, limit: 200 });
  }

  crossChainQuote(request: CrossChainQuoteRequest): Promise<{ quote: CrossChainQuote }> {
    return this.post("/swap/cross-chain/quote", request);
  }

  crossChainBuild(
    request: CrossChainQuoteRequest,
    quote: CrossChainQuote,
  ): Promise<CrossChainBuild> {
    return this.post("/swap/cross-chain/build", { request, quote });
  }

  crossChainStatus(
    quoteId: string,
    originChainKey: string,
    originTxHash: string,
    toChainKey: string,
  ): Promise<{ status: "pending" | "completed" | "failed" | "unknown"; destinationTxHash?: string }> {
    const params = new URLSearchParams({ originChainKey, originTxHash, toChainKey });
    return this.request(`/swap/cross-chain/status/${encodeURIComponent(quoteId)}?${params}`);
  }

  /** Fan-out quote across every DEX on the chain — the comparison table. */
  quote(request: Partial<QuoteRequest> & Pick<QuoteRequest, "chainKey" | "tokenIn" | "tokenOut" | "amountIn">): Promise<AggregatedQuote> {
    return this.post("/swap/quote", request);
  }

  /** Build + simulate the tx for a chosen route. */
  buildSwap(request: QuoteRequest, route: RouteQuote, minAmountOut: string): Promise<SwapTx> {
    return this.post("/swap/build", { request, route, minAmountOut });
  }

  /** Broadcast a signed Solana swap tx through server RPC; waits for on-chain confirmation. */
  submitSolanaSwap(signedTransactionBase64: string): Promise<{
    signature: string;
    confirmed: true;
    slot: number;
  }> {
    return this.post("/swap/submit-solana", { signedTransaction: signedTransactionBase64 });
  }

  recordSwap(record: {
    chainKey: string;
    dexId: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    amountOut: string;
    protocolFee: string;
    feeBps: number;
    volumeUsd?: number;
    txHash?: string;
    address?: string;
    status?: "confirmed" | "failed" | "submitted" | "quoted";
    failureReason?: string;
    source?: "web" | "api" | "agent";
    clientId?: string;
    clientName?: string;
    requestId?: string;
  }): Promise<{ ok: boolean }> {
    return this.post("/swap/record", record);
  }

  // ── Liquidity ───────────────────────────────────────────────────────────

  quoteLp(request: Partial<LpQuoteRequest> & Pick<LpQuoteRequest, "chainKey" | "action" | "tokenA" | "tokenB" | "amount">): Promise<{ quotes: LpQuote[] }> {
    return this.post("/lp/quote", request);
  }

  // ── Market data ─────────────────────────────────────────────────────────

  discovery(tab: DiscoveryTab, chainKey?: string): Promise<{ tokens: MarketToken[] }> {
    const params = new URLSearchParams({ _: String(Date.now()) });
    if (chainKey) params.set("chainKey", chainKey);
    return this.request(`/market/discovery/${tab}?${params}`);
  }

  tokenDetail(chainKey: string, address: string): Promise<{ token: MarketToken }> {
    return this.request(`/market/token/${chainKey}/${address}`);
  }

  tokenIntel(chainKey: string, address: string): Promise<{
    devWallet: {
      creatorAddress: string | null;
      tracked: boolean;
      events: Array<{
        kind: string;
        symbol: string;
        amount: string;
        usdValue: number;
        hash: string;
        timestamp: number;
      }>;
      alerts: Array<{ severity: string; message: string }>;
    };
    snipers: {
      riskScore: number;
      earlyBuyerCount: number;
      bundleCount: number;
      totalEarlyVolumeUsd: number;
      snipers: Array<{
        address: string;
        blockOffset: number;
        volumeUsd: number;
        txHash: string;
        bundled: boolean;
        buyCount: number;
      }>;
    };
  }> {
    return this.request(`/market/token/${chainKey}/${address}/intel`);
  }

  swapSettings(chainKey?: string): Promise<
    | { chainKey: string; swapFeeBps: number; defaultSlippageBps: number }
    | { settings: Array<{ chainKey: string; swapFeeBps: number; defaultSlippageBps: number }> }
  > {
    const q = chainKey ? `?chainKey=${chainKey}` : "";
    return this.request(`/swap/settings${q}`);
  }

  /** Warm snapshot of the live launch feed (stream via XauWsClient "launches"). */
  liveLaunches(): Promise<{ launches: MarketToken[]; syncedAt?: number }> {
    return this.request(`/market/launches/live?_=${Date.now()}`);
  }

  candles(
    chainKey: string,
    address: string,
    interval: "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d" = "1h",
  ): Promise<{ candles: Candle[] }> {
    return this.request(`/market/candles/${chainKey}/${address}?interval=${interval}`);
  }

  createLimitOrder(input: {
    chainKey: string;
    userAddress: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    targetPrice: number;
    slippageBps?: number;
    expiresInHours?: number;
  }): Promise<{ order: LimitOrder }> {
    return this.post("/swap/limit-orders", input);
  }

  listLimitOrders(userAddress: string, chainKey?: string): Promise<{ orders: LimitOrder[] }> {
    const params = new URLSearchParams({ userAddress });
    if (chainKey) params.set("chainKey", chainKey);
    return this.request(`/swap/limit-orders?${params}`);
  }

  cancelLimitOrder(id: string, userAddress: string): Promise<{ order: LimitOrder }> {
    return this.request(`/swap/limit-orders/${id}?userAddress=${encodeURIComponent(userAddress)}`, {
      method: "DELETE",
    });
  }

  // ── Launchpad ───────────────────────────────────────────────────────────

  prepareLaunch(launch: TokenLaunchRequest): Promise<{
    metadataURI: string;
    contractCall: { contract: string; method: string; args: unknown[] };
    feeCurrency: string;
    solanaTransaction?: string;
    mint?: string;
    pool?: string;
    config?: string;
    quoteMint?: string;
  }> {
    return this.post("/launchpad/prepare", launch);
  }

  recordLaunch(input: {
    launch: TokenLaunchRequest;
    tokenAddress: string;
    deployTxHash: string;
    metadataURI: string;
  }): Promise<{ ok: boolean }> {
    return this.post("/launchpad/record", input);
  }

  goldCurve(mint: string): Promise<{ curve: GoldCurveView | null }> {
    return this.request(`/launchpad/curve/${encodeURIComponent(mint)}`);
  }

  goldCurveFees(creator: string): Promise<{ pools: GoldCurveFeePool[] }> {
    return this.request(`/launchpad/fees?creator=${encodeURIComponent(creator)}`);
  }

  claimGoldCurve(input: {
    creator: string;
    pool: string;
    kind: "trading" | "surplus" | "locked-lp";
  }): Promise<{ solanaTransaction: string }> {
    return this.post("/launchpad/claim", input);
  }

  launches(): Promise<{ launches: Array<{ id: string; type: string; status: string; token: { chainKey: string; address: string; symbol: string; name: string; logoURI?: string } }> }> {
    return this.request("/launchpad/launches");
  }

  // ── Wallet ──────────────────────────────────────────────────────────────

  walletTokenBalances(
    address: string,
    tokens: string[],
    chainKey?: string,
  ): Promise<{
    balances: Record<string, { balance: string; balanceFormatted: string }>;
    live: boolean;
  }> {
    const params = new URLSearchParams({ tokens: tokens.join(",") });
    if (chainKey) params.set("chainKey", chainKey);
    return this.request(`/wallet/${address}/balances?${params}`);
  }

  walletBalances(address: string): Promise<{
    balances: Array<{
      chainKey: string;
      address: string;
      symbol: string;
      name: string;
      decimals: number;
      balance: string;
      balanceFormatted: string;
      usdValue: number;
      simulated: boolean;
    }>;
    portfolioUsd?: number;
    nativeBalance?: string;
    nativeSymbol?: string;
    live: boolean;
  }> {
    return this.request(`/wallet/${address}/balances`);
  }

  walletHistory(address: string): Promise<{
    history: Array<{
      id: string;
      kind: string;
      chainKey: string;
      symbol: string;
      amount: string;
      usdValue: number;
      hash: string;
      timestamp: number;
    }>;
  }> {
    return this.request(`/wallet/${address}/history`);
  }

  registerWalletConnect(input: {
    address: string;
    chainKind?: "evm" | "solana";
    chainKey?: string;
    chainId?: number;
    connectorId?: string;
    connectorName?: string;
    walletApp?: string;
    connectMethod?: string;
    pagePath?: string;
    referrer?: string;
    chainVisitOnly?: boolean;
  }): Promise<{ ok: boolean; demo?: boolean }> {
    return this.post("/wallet/connect", input);
  }

  // ── Fiat on-ramp / off-ramp (Buy & Sell crypto) ──────────────────────────

  /** Is the fiat buy/sell feature live? (false until an Onramper key is set). */
  onrampConfig(): Promise<OnrampConfig> {
    return this.request("/onramp/config");
  }

  /** Visitor's detected country + local currency (Cloudflare geo). */
  onrampGeo(): Promise<OnrampGeo> {
    return this.request("/onramp/geo");
  }

  /** Country-aware default fiat/crypto/amount/payment method. */
  onrampDefaults(type: OnrampType = "buy", country?: string): Promise<OnrampDefaults> {
    const q = new URLSearchParams({ type });
    if (country) q.set("country", country);
    return this.request(`/onramp/defaults?${q}`);
  }

  /** Supported crypto + fiat for a source currency. */
  onrampAssets(
    opts: { type?: OnrampType; source?: string; country?: string } = {},
  ): Promise<{ crypto: OnrampAsset[]; fiat: OnrampFiat[] }> {
    const q = new URLSearchParams({ type: opts.type ?? "buy" });
    if (opts.source) q.set("source", opts.source);
    if (opts.country) q.set("country", opts.country);
    return this.request(`/onramp/assets?${q}`);
  }

  /** Payment methods available for a (source, destination) pair. */
  onrampPaymentTypes(opts: {
    type?: OnrampType;
    source: string;
    destination: string;
    country?: string;
  }): Promise<{ paymentMethods: OnrampPaymentMethod[] }> {
    const q = new URLSearchParams({
      type: opts.type ?? "buy",
      source: opts.source,
      destination: opts.destination,
    });
    if (opts.country) q.set("country", opts.country);
    return this.request(`/onramp/payment-types?${q}`);
  }

  /** Live best-route quote (incl. our partner fee) across all ramp providers. */
  onrampQuote(req: OnrampQuoteRequest): Promise<OnrampQuotesResponse> {
    const q = new URLSearchParams({
      type: req.type,
      fiat: req.fiat,
      crypto: req.crypto,
      amount: String(req.amount),
    });
    if (req.paymentMethod) q.set("paymentMethod", req.paymentMethod);
    if (req.country) q.set("country", req.country);
    if (req.walletAddress) q.set("walletAddress", req.walletAddress);
    return this.request(`/onramp/quote?${q}`);
  }

  /** Create a transaction and get the provider's hosted checkout URL. */
  onrampCheckout(
    req: OnrampCheckoutRequest,
  ): Promise<OnrampCheckoutResponse & { partnerContext: string }> {
    return this.post("/onramp/checkout", req);
  }

  /** Poll our record of a fiat transaction by partnerContext or provider id. */
  onrampTransaction(ctx: string): Promise<{ transaction: unknown | null }> {
    return this.request(`/onramp/transaction/${encodeURIComponent(ctx)}`);
  }

  // ── Admin ───────────────────────────────────────────────────────────────

  adminMetrics(): Promise<AdminMetrics & { persisted: boolean; hasData: boolean }> {
    return this.request("/admin/metrics");
  }

  adminTreasury(): Promise<{
    totalUsd: number;
    walletRows: number;
    byChain: Array<{
      chainKey: string;
      nativeSymbol: string;
      nativeBalance: number;
      nativePriceUsd: number;
      balanceUsd: number;
      tokenBalanceUsd?: number;
      walletCount: number;
    }>;
  }> {
    return this.request("/admin/treasury");
  }

  adminFees(): Promise<{ configs: Array<FeeConfig & { launchFeeNative: string }> }> {
    return this.request("/admin/fees");
  }

  adminUpdateFees(chainKey: string, config: Omit<FeeConfig, "chainKey">): Promise<{ ok: boolean }> {
    return this.request(`/admin/fees/${chainKey}`, {
      method: "PUT",
      body: JSON.stringify(config),
    });
  }

  adminFiatTransactions(params: { page?: number; type?: string; status?: string; q?: string } = {}): Promise<{
    transactions: Array<{
      id: string;
      providerTxId: string | null;
      partnerContext: string | null;
      type: string;
      provider: string | null;
      status: string;
      fiatCurrency: string;
      fiatAmount: number;
      cryptoAsset: string;
      chainKey: string | null;
      cryptoAmount: number;
      paymentMethod: string | null;
      country: string | null;
      walletAddress: string | null;
      partnerFeeFiat: number;
      partnerFeePct: number;
      txHash: string | null;
      createdAt: string;
    }>;
    total: number;
    page: number;
    summary: { total: number; completed: number; pending: number; failed: number; feeUsd: number; volumeUsd: number };
    enabled: boolean;
  }> {
    const q = new URLSearchParams({ page: String(params.page ?? 1) });
    if (params.type) q.set("type", params.type);
    if (params.status) q.set("status", params.status);
    if (params.q) q.set("q", params.q);
    return this.request(`/admin/fiat-transactions?${q}`);
  }

  adminListings(): Promise<{ queue: Array<{ id: string; chainKey: string; address: string; symbol: string; name: string; createdAt: string }> }> {
    return this.request("/admin/listings");
  }

  adminDecideListing(tokenId: string, decision: "approve" | "reject"): Promise<{ ok: boolean }> {
    return this.post(`/admin/listings/${tokenId}`, { decision });
  }

  adminUsers(params: {
    page?: number;
    q?: string;
    role?: string;
    kycStatus?: string;
    chainKind?: string;
  } = {}): Promise<{
    users: Array<{
      id: string;
      address: string;
      chainKind: string;
      role: string;
      kycStatus: string;
      createdAt: string;
      lastSeenAt: string;
      displayName: string | null;
      twitter: string | null;
      telegram: string | null;
      discord: string | null;
      website: string | null;
    }>;
    total: number;
    page: number;
  }> {
    const q = new URLSearchParams({ page: String(params.page ?? 1) });
    if (params.q) q.set("q", params.q);
    if (params.role) q.set("role", params.role);
    if (params.kycStatus) q.set("kycStatus", params.kycStatus);
    if (params.chainKind) q.set("chainKind", params.chainKind);
    return this.request(`/admin/users?${q}`);
  }

  adminDeleteUser(id: string): Promise<{ ok: boolean }> {
    return this.request(`/admin/users/${id}`, { method: "DELETE" });
  }

  adminConnectedWallets(params: {
    page?: number;
    refresh?: boolean;
    q?: string;
    chainKind?: string;
    lastChainKey?: string;
    walletApp?: string;
  } = {}): Promise<{
    wallets: Array<{
      id: string;
      address: string;
      chainKind: string;
      lastChainKey: string | null;
      lastChainId: number | null;
      connectorId: string | null;
      connectorName: string | null;
      walletApp: string | null;
      connectMethod: string | null;
      userAgent: string | null;
      lastIp: string | null;
      pagePath: string | null;
      referrer: string | null;
      portfolioUsd: number;
      nativeBalance: string | null;
      nativeSymbol: string | null;
      balancesJson: unknown;
      chainActivityJson: unknown;
      connectCount: number;
      firstConnectedAt: string;
      lastConnectedAt: string;
      userId: string | null;
      profile: {
        displayName: string | null;
        twitter: string | null;
        telegram: string | null;
        discord: string | null;
        website: string | null;
      } | null;
    }>;
    total: number;
    page: number;
  }> {
    const q = new URLSearchParams({ page: String(params.page ?? 1) });
    if (params.refresh) q.set("refresh", "true");
    if (params.q) q.set("q", params.q);
    if (params.chainKind) q.set("chainKind", params.chainKind);
    if (params.lastChainKey) q.set("lastChainKey", params.lastChainKey);
    if (params.walletApp) q.set("walletApp", params.walletApp);
    return this.request(`/admin/connected-wallets?${q}`);
  }

  adminDeleteConnectedWallet(id: string): Promise<{ ok: boolean }> {
    return this.request(`/admin/connected-wallets/${id}`, { method: "DELETE" });
  }

  adminSwaps(params: {
    page?: number;
    chainKey?: string;
    status?: string;
    source?: string;
    clientId?: string;
    q?: string;
  } = {}): Promise<{
    swaps: Array<{
      id: string;
      chainKey: string;
      chainName: string;
      dexId: string;
      dexLabel: string;
      status: string;
      takerAddress: string | null;
      userDisplayName: string | null;
      tokenIn: string;
      tokenOut: string;
      tokenInSymbol: string;
      tokenOutSymbol: string;
      amountIn: string;
      amountOut: string;
      amountInFormatted: string;
      amountOutFormatted: string;
      protocolFee: string;
      protocolFeeFormatted: string;
      feeBps: number;
      volumeUsd: number;
      feeUsd: number;
      txHash: string | null;
      explorerUrl: string | null;
      failureReason: string | null;
      createdAt: string;
      clientSource: string | null;
      clientId: string | null;
      clientName: string | null;
    }>;
    total: number;
    page: number;
    summary: {
      total: number;
      confirmed: number;
      failed: number;
      pending: number;
      volumeUsd: number;
      feesUsd: number;
    };
  }> {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.chainKey) q.set("chainKey", params.chainKey);
    if (params.status) q.set("status", params.status);
    if (params.source) q.set("source", params.source);
    if (params.clientId) q.set("clientId", params.clientId);
    if (params.q) q.set("q", params.q);
    const qs = q.toString();
    return this.request(`/admin/swaps${qs ? `?${qs}` : ""}`);
  }

  adminApiUsageSummary(): Promise<{
    requests24h: number;
    requests7d: number;
    quotes24h: number;
    builds24h: number;
    records24h: number;
    confirmedSwapsBySource: { web: number; agent: number; api: number; unknown: number };
    uniqueTakers24h: number;
    topClients: { clientId: string | null; clientName: string | null; count: number }[];
  }> {
    return this.request("/admin/api-usage/summary");
  }

  adminApiUsageRequests(params: {
    page?: number;
    endpoint?: string;
    clientId?: string;
    chainKey?: string;
    clientSource?: string;
    q?: string;
    status?: "ok" | "error";
  } = {}): Promise<{
    requests: Array<{
      id: string;
      endpoint: string;
      method: string;
      chainKey: string | null;
      takerAddress: string | null;
      clientSource: string;
      clientId: string | null;
      clientName: string | null;
      clientIp: string | null;
      statusCode: number;
      requestId: string | null;
      createdAt: string;
    }>;
    total: number;
    page: number;
  }> {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.endpoint) q.set("endpoint", params.endpoint);
    if (params.clientId) q.set("clientId", params.clientId);
    if (params.chainKey) q.set("chainKey", params.chainKey);
    if (params.clientSource) q.set("clientSource", params.clientSource);
    if (params.q) q.set("q", params.q);
    if (params.status) q.set("status", params.status);
    const qs = q.toString();
    return this.request(`/admin/api-usage/requests${qs ? `?${qs}` : ""}`);
  }

  adminApiUsageDeleteRequests(
    payload:
      | { ids: string[] }
      | {
          selectAll: true;
          filters?: {
            endpoint?: string;
            clientId?: string;
            chainKey?: string;
            clientSource?: string;
            q?: string;
            status?: "ok" | "error";
          };
        },
  ): Promise<{ deleted: number }> {
    return this.request("/admin/api-usage/requests/delete", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  adminApiUsageBulkUpdateRequests(
    payload:
      | {
          ids: string[];
          clientSource?: "web" | "agent" | "api";
          clientName?: string | null;
          clientId?: string | null;
        }
      | {
          selectAll: true;
          filters?: {
            endpoint?: string;
            clientId?: string;
            chainKey?: string;
            clientSource?: string;
            q?: string;
            status?: "ok" | "error";
          };
          clientSource?: "web" | "agent" | "api";
          clientName?: string | null;
          clientId?: string | null;
        },
  ): Promise<{ updated: number }> {
    return this.request("/admin/api-usage/requests/bulk", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  adminAudit(): Promise<{ logs: Array<{ id: string; action: string; resource?: string; createdAt: string; actor?: { address: string } }> }> {
    return this.request("/admin/audit");
  }

  adminWallets(withBalances = true): Promise<{
    wallets: Array<{
      id: string;
      chainKey: string;
      address: string;
      label: string | null;
      purpose: string;
      keyRef: string | null;
      derivationPath: string | null;
      walletGroup: string | null;
      notes: string | null;
      createdAt: string;
      nativeBalance?: string;
      nativeSymbol?: string;
      portfolioUsd?: number;
      tokenBalances?: Array<{ symbol: string; balanceFormatted: string; usdValue: number }>;
    }>;
  }> {
    const q = withBalances ? "" : "?balances=false";
    return this.request(`/admin/wallets${q}`);
  }

  adminAddWallet(input: {
    chainKey: string;
    address: string;
    label?: string;
    purpose: "treasury" | "fee_collector" | "operations" | "on_chain_vault";
  }): Promise<{ ok: boolean }> {
    return this.request("/admin/wallets", { method: "POST", body: JSON.stringify(input) });
  }

  adminRemoveWallet(id: string): Promise<{ ok: boolean }> {
    return this.request(`/admin/wallets/${id}`, { method: "DELETE" });
  }
}
