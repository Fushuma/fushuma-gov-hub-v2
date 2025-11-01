// Launchpad Types for Fushuma Governance Hub V2

export interface IIcoInfo {
  seed: number;
  owner: string;
  icoMint: string;
  icoDecimals: number;
  amount: number;
  costMint: string;
  startPrice: bigint;
  endPrice: bigint;
  startDate: number;
  endDate: number;
  bonusReserve: number;
  bonusPercentage: number;
  bonusActivator: number;
  isClosed: number;
  totalSold: number;
  totalReceived: number;
  unlockPercentage: number;
  cliffPeriod: number;
  vestingPercentage: number;
  vestingInterval: number;
  purchaseSeqNum: number;
  vestingContracts: string | null;
}

export interface IIcoInfoWithKey {
  key: string;
  data: IIcoInfo;
}

export interface IUserPurchase {
  seed: number | string;
  buyer: string;
  ico: string | number;
  buyAmount: number;
  buyDate: number;
  bonus: number;
  lockedAmount: number | string;
  totalClaimed: number;
}

export interface IUserPurchaseWithKey {
  key: string;
  data: IUserPurchase;
}

export interface IPurchaseAmount {
  value: bigint;
  availableAmount: bigint;
}

export interface IClaimContext {
  userPurchaseKey: string;
  button: {
    loading: boolean;
  };
}

export enum IcoStatus {
  Live = 'Live',
  Upcoming = 'Upcoming',
  Ended = 'Ended',
  Closed = 'Closed',
  SoldOut = 'Sold Out',
}

export interface IcoStatusInfo {
  status: IcoStatus;
  color: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral' | 'gray' | 'red' | 'blue' | 'yellow' | 'green';
}

export interface LaunchpadMetadata {
  key: string;
  name: string;
  projectLogo: string;
  links: {
    web?: { name: string; url: string };
    x?: { name: string; url: string };
    telegram?: { name: string; url: string };
    discord?: { name: string; url: string };
  };
  description?: string;
}
