import { createPublicClient, http } from 'viem'
import { arcTestnet } from 'viem/chains'
import { buildTxExplorerUrl, buildAddressExplorerUrl, requireChain } from '@/onchain-facts'
import { ARC_CHAIN_ID } from './tokens'

export const arcChainFacts = requireChain(ARC_CHAIN_ID)

/** Read-only client used to verify transactions onchain. */
export const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(arcChainFacts.rpcUrls[0]),
})

export const txUrl = (hash: string) => buildTxExplorerUrl(ARC_CHAIN_ID, hash)
export const addressUrl = (address: string) => buildAddressExplorerUrl(ARC_CHAIN_ID, address)
