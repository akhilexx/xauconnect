/** Navigation param types shared across screens. */
export type DiscoverStackParams = {
  DiscoverList: undefined;
  Token: { chainKey: string; address: string };
};

export type RootTabParams = {
  Swap: undefined;
  Discover: undefined;
  Launch: undefined;
  Wallet: undefined;
  Settings: undefined;
};
