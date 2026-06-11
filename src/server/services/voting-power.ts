/**
 * Server-side voting power lookup.
 *
 * Vote weight must never be taken from client input - it is read from
 * the VotingEscrow contract for the voter's wallet address.
 */

import { createPublicClient, http, defineChain, type Address } from 'viem';
import { VotingEscrowAbi } from '@/lib/governance/abis';
import { VOTING_ESCROW_ADDRESS } from '@/lib/governance/contracts';

const fushuma = defineChain({
  id: 121224,
  name: 'Fushuma',
  network: 'fushuma',
  nativeCurrency: {
    decimals: 18,
    name: 'FUMA',
    symbol: 'FUMA',
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_FUSHUMA_RPC_URL || 'https://rpc.fushuma.com'],
    },
    public: {
      http: ['https://rpc.fushuma.com'],
    },
  },
});

const publicClient = createPublicClient({
  chain: fushuma,
  transport: http(),
});

/**
 * Total voting power (in wei, 18 decimals) across all veNFTs owned by
 * the address. Mirrors the client-side useTotalVotingPower hook.
 */
export async function getVotingPowerForAddress(address: string): Promise<bigint> {
  const tokenIds = (await publicClient.readContract({
    address: VOTING_ESCROW_ADDRESS as Address,
    abi: VotingEscrowAbi,
    functionName: 'tokensOfOwner',
    args: [address as Address],
  })) as bigint[];

  if (tokenIds.length === 0) return 0n;

  // No multicall3 contract is deployed on Fushuma, so read individually
  const powers = await Promise.all(
    tokenIds.map(
      (tokenId) =>
        publicClient.readContract({
          address: VOTING_ESCROW_ADDRESS as Address,
          abi: VotingEscrowAbi,
          functionName: 'votingPower',
          args: [tokenId],
        }) as Promise<bigint>
    )
  );

  return powers.reduce((sum, power) => sum + power, 0n);
}

/**
 * Voting power in whole tokens, suitable for the int column in the
 * proposal_votes table.
 */
export async function getVotingPowerTokens(address: string): Promise<number> {
  const wei = await getVotingPowerForAddress(address);
  return Number(wei / 10n ** 18n);
}
