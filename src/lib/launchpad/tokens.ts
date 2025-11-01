// Token utility functions

import { ethers } from 'ethers';
import ERC20ABI from '@/config/abis/ERC20.json';
import { FUSHUMA_RPC_URL } from './contracts';

const provider = new ethers.providers.JsonRpcProvider(FUSHUMA_RPC_URL);

/**
 * Get token decimals from contract
 */
export async function getTokenDecimals(tokenAddress: string): Promise<number> {
  try {
    // Native token (FUMA) has 18 decimals
    if (tokenAddress === '0x0000000000000000000000000000000000000000') {
      return 18;
    }

    const contract = new ethers.Contract(tokenAddress, ERC20ABI, provider);
    const decimals = await contract.decimals();
    return Number(decimals);
  } catch (error) {
    console.error('Failed to get token decimals:', error);
    return 18; // Default to 18
  }
}

/**
 * Get token symbol from contract
 */
export async function getTokenSymbol(tokenAddress: string): Promise<string> {
  try {
    // Native token
    if (tokenAddress === '0x0000000000000000000000000000000000000000') {
      return 'FUMA';
    }

    const contract = new ethers.Contract(tokenAddress, ERC20ABI, provider);
    const symbol = await contract.symbol();
    return symbol;
  } catch (error) {
    console.error('Failed to get token symbol:', error);
    return 'TOKEN';
  }
}

/**
 * Get token name from contract
 */
export async function getTokenName(tokenAddress: string): Promise<string> {
  try {
    // Native token
    if (tokenAddress === '0x0000000000000000000000000000000000000000') {
      return 'Fushuma';
    }

    const contract = new ethers.Contract(tokenAddress, ERC20ABI, provider);
    const name = await contract.name();
    return name;
  } catch (error) {
    console.error('Failed to get token name:', error);
    return 'Unknown Token';
  }
}
