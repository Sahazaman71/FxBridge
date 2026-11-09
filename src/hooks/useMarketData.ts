import { useQuery } from '@tanstack/react-query'
import { fetchEcbHistory, fetchEcbLatest, fetchPriceFeed } from '@/lib/rates'

/** Circle price feed for USDC and EURC on Arc Testnet. Refreshes every 30s. */
export function usePriceFeed() {
  return useQuery({
    queryKey: ['price-feed'],
    queryFn: fetchPriceFeed,
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: 2,
  })
}

/** USD price per token from the Circle feed, or null while unavailable. */
export function useUsdPrices(): { USDC: number; EURC: number } | null {
  const { data } = usePriceFeed()
  return data ? { USDC: data.usdcUsd, EURC: data.eurcUsd } : null
}

/** ECB EUR/USD reference rate. Not executable. */
export function useEcbLatest() {
  return useQuery({
    queryKey: ['ecb-latest'],
    queryFn: fetchEcbLatest,
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
    retry: 1,
  })
}

export function useEcbHistory(days = 30) {
  return useQuery({
    queryKey: ['ecb-history', days],
    queryFn: () => fetchEcbHistory(days),
    staleTime: 60 * 60_000,
    retry: 1,
  })
}
