export type NetworkName = "testnet" | "mainnet";

export interface NetworkConfig {
  url: string;
  network: NetworkName;
}

export const NETWORK_CONFIG: Record<NetworkName, NetworkConfig> = {
  testnet: {
    url: "https://fullnode.testnet.sui.io:443",
    network: "testnet",
  },
  mainnet: {
    url: "https://fullnode.mainnet.sui.io:443",
    network: "mainnet",
  },
} as const;

// Default network for the application
export const DEFAULT_NETWORK: NetworkName = "testnet";

// Helper to get current network config
export const getNetworkConfig = (network: NetworkName = DEFAULT_NETWORK): NetworkConfig => {
  return NETWORK_CONFIG[network];
};
