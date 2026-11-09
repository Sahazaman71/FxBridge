import { arcTestnet } from 'viem/chains'
import { getUsdc } from '@/onchain-facts'

export const ARC_CHAIN_ID = arcTestnet.id
/** Chain identifier used by Circle App Kit. */
export const SWAP_CHAIN = 'Arc_Testnet' as const

export type TokenSymbol = 'USDC' | 'EURC'

export interface Token {
  symbol: TokenSymbol
  name: string
  address: `0x${string}`
  decimals: number
  /** Currency the token tracks, for FX reference rates. */
  currency: 'USD' | 'EUR'
}

const usdcFact = getUsdc(ARC_CHAIN_ID)
if (!usdcFact) throw new Error('USDC is missing from the onchain facts for Arc Testnet')

const eurcAddress = import.meta.env.VITE_EURC_ADDRESS as string | undefined
if (!eurcAddress) throw new Error('VITE_EURC_ADDRESS is not set in .env')

export const TOKENS: Record<TokenSymbol, Token> = {
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: usdcFact.address as `0x${string}`,
    decimals: usdcFact.decimals,
    currency: 'USD',
  },
  EURC: {
    symbol: 'EURC',
    name: 'Euro Coin',
    address: eurcAddress as `0x${string}`,
    decimals: 6,
    currency: 'EUR',
  },
}

export const TOKEN_LIST: readonly Token[] = [TOKENS.USDC, TOKENS.EURC]

export function otherToken(symbol: TokenSymbol): TokenSymbol {
  return symbol === 'USDC' ? 'EURC' : 'USDC'
}

/** Slippage options in basis points. */
export const SLIPPAGE_PRESETS_BPS = [10, 50, 100] as const
export const DEFAULT_SLIPPAGE_BPS = 50
export const MAX_SLIPPAGE_BPS = 300
/** Swaps above this input amount (in token units) show a large-amount warning. */
export const LARGE_AMOUNT_WARNING = 1000
