/**
 * Bridge Store
 * Zustand store for bridge state management
 * Replaces Redux from original Bridge application
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BridgeToken } from '../constants/bridgeTokens';
import type { BridgeNetwork } from '../constants/bridgeNetworks';

export type SwapType = 'simple' | 'advanced';
export type BridgeMode = 'swap' | 'transfer' | 'claim';

export interface BridgeTransaction {
  id: string;
  txHash: string;
  fromChainId: number;
  toChainId: number;
  fromToken: string;
  toToken: string;
  amount: string;
  status: 'pending' | 'confirmed' | 'claimed' | 'failed';
  blockNumber?: number;
  confirmedBlocks: number;
  destinationAddress?: string;
  timestamp: number;
}

interface BridgeState {
  // Selected networks
  fromNetwork: BridgeNetwork | null;
  toNetwork: BridgeNetwork | null;
  
  // Selected token
  selectedToken: BridgeToken | null;
  
  // Bridge mode
  mode: BridgeMode;
  
  // Swap type
  swapType: SwapType;
  
  // Transaction state
  currentTransaction: BridgeTransaction | null;
  transactionHistory: BridgeTransaction[];
  
  // UI state
  isSwapping: boolean;
  isPending: boolean;
  isApproving: boolean;
  
  // Destination address for transfer mode
  destinationAddress: string;
  
  // Block confirmation tracking
  confirmedBlockCounts: number;
  
  // Actions
  setFromNetwork: (network: BridgeNetwork | null) => void;
  setToNetwork: (network: BridgeNetwork | null) => void;
  setSelectedToken: (token: BridgeToken | null) => void;
  setMode: (mode: BridgeMode) => void;
  setSwapType: (type: SwapType) => void;
  setCurrentTransaction: (tx: BridgeTransaction | null) => void;
  addTransaction: (tx: BridgeTransaction) => void;
  updateTransaction: (id: string, updates: Partial<BridgeTransaction>) => void;
  setIsSwapping: (isSwapping: boolean) => void;
  setIsPending: (isPending: boolean) => void;
  setIsApproving: (isApproving: boolean) => void;
  setDestinationAddress: (address: string) => void;
  setConfirmedBlockCounts: (count: number) => void;
  swapNetworks: () => void;
  reset: () => void;
}

const initialState = {
  fromNetwork: null,
  toNetwork: null,
  selectedToken: null,
  mode: 'swap' as BridgeMode,
  swapType: 'simple' as SwapType,
  currentTransaction: null,
  transactionHistory: [],
  isSwapping: false,
  isPending: false,
  isApproving: false,
  destinationAddress: '',
  confirmedBlockCounts: 0
};

export const useBridgeStore = create<BridgeState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setFromNetwork: (network) => set({ fromNetwork: network }),
      
      setToNetwork: (network) => set({ toNetwork: network }),
      
      setSelectedToken: (token) => set({ selectedToken: token }),
      
      setMode: (mode) => set({ mode }),
      
      setSwapType: (type) => set({ swapType: type }),
      
      setCurrentTransaction: (tx) => set({ currentTransaction: tx }),
      
      addTransaction: (tx) =>
        set((state) => ({
          transactionHistory: [tx, ...state.transactionHistory],
          currentTransaction: tx
        })),
      
      updateTransaction: (id, updates) =>
        set((state) => ({
          transactionHistory: state.transactionHistory.map((tx) =>
            tx.id === id ? { ...tx, ...updates } : tx
          ),
          currentTransaction:
            state.currentTransaction?.id === id
              ? { ...state.currentTransaction, ...updates }
              : state.currentTransaction
        })),
      
      setIsSwapping: (isSwapping) => set({ isSwapping }),
      
      setIsPending: (isPending) => set({ isPending }),
      
      setIsApproving: (isApproving) => set({ isApproving }),
      
      setDestinationAddress: (address) => set({ destinationAddress: address }),
      
      setConfirmedBlockCounts: (count) => set({ confirmedBlockCounts: count }),
      
      swapNetworks: () =>
        set((state) => ({
          fromNetwork: state.toNetwork,
          toNetwork: state.fromNetwork
        })),
      
      reset: () => set(initialState)
    }),
    {
      name: 'bridge-storage',
      partialize: (state) => ({
        transactionHistory: state.transactionHistory,
        fromNetwork: state.fromNetwork,
        toNetwork: state.toNetwork,
        selectedToken: state.selectedToken,
        mode: state.mode,
        swapType: state.swapType
      })
    }
  )
);
