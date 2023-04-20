import { libs as AudiusLibs } from '@audius/sdk'

const E = process.env

/**
 * Singleton wrapper for Audius Libs.
 * Initialized in the server start-up.
 */
// @ts-ignore - missing types on AudiusLibs
const libs = new AudiusLibs({
  // @ts-ignore - missing types on AudiusLibs
  ethWeb3Config: AudiusLibs.configEthWeb3(
    E.TOKEN_ADDRESS,
    E.ETH_REGISTRY_ADDRESS,
    E.ETH_PROVIDER_URL,
    E.ETH_OWNER_WALLET
  ),
  discoveryProviderConfig: {
  }
})

export default libs
