import { useAccount, useReadContracts } from 'wagmi'
import { erc20Abi } from 'viem'
import { Amount } from '@/onchain-money'
import { ARC_CHAIN_ID, TOKENS, type TokenSymbol } from '@/lib/tokens'

export interface TokenBalance {
  raw: bigint
  amount: Amount
  /** Plain decimal string, e.g. "12.5". */
  value: string
}

type Balances = Partial<Record<TokenSymbol, TokenBalance>>

/**
 * USDC and EURC balances from the ERC-20 view (6 decimals). On Arc the native
 * balance is the same pool as USDC, so it is never read or summed here.
 */
export function useBalances() {
  const { address } = useAccount()
  const query = useReadContracts({
    contracts: [
      { address: TOKENS.USDC.address, abi: erc20Abi, functionName: 'balanceOf', args: address ? [address] : undefined, chainId: ARC_CHAIN_ID },
      { address: TOKENS.EURC.address, abi: erc20Abi, functionName: 'balanceOf', args: address ? [address] : undefined, chainId: ARC_CHAIN_ID },
    ],
    query: { enabled: Boolean(address), refetchInterval: 12_000 },
  })

  const balances: Balances = {}
  const symbols: TokenSymbol[] = ['USDC', 'EURC']
  symbols.forEach((symbol, index) => {
    const result = query.data?.[index]
    if (result?.status === 'success') {
      const raw = result.result
      const amount = Amount.fromRaw(raw, TOKENS[symbol].decimals)
      balances[symbol] = { raw, amount, value: amount.toString() }
    }
  })

  return {
    balances,
    isLoading: query.isLoading && Boolean(address),
    isError: query.isError,
    refetch: query.refetch,
  }
}
