import { tempoTestnet } from 'viem/chains'
import { KeyManager, webAuthn } from 'tempo.ts/wagmi'
import { createConfig, http } from 'wagmi'
 
export const config = createConfig({
  connectors: [
    webAuthn({
      keyManager: KeyManager.localStorage(),
    }),
  ],
  chains: [tempoTestnet],
  multiInjectedProviderDiscovery: false,
  transports: {
    [tempoTestnet.id]: http(),
  },
})