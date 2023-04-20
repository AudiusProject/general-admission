import express from 'express'
import libs from '../../libs'
import { onStartup } from '../../onStartup'

import { shuffle } from '../utils/helpers'

const LOG_PREFIX = 'servelet: api | '
const DISCOVERY_PROVIDER_REFRESH_INTERVAL = 60 * 1000 // one minute
const MIN_HEALTHY_SERVICES = 10
const MIN_BLOCK_DIFFERENCE = 50

export const router = express.Router()

let usableDiscoveryProviders: string[] = []

const updateDiscoveryProviders = async () => {
  const registeredVersion = await libs.ethContracts.getCurrentVersion('discovery-node')
  let services = await libs.discoveryProvider.serviceSelector.findAll({ verbose: true })
  services = services
    .filter((service: { version: string }) => service.version >= registeredVersion)
    .filter((service: { block_difference: number }) => service.block_difference >= MIN_BLOCK_DIFFERENCE)
    .map((service: { endpoint: string }) => service.endpoint)
  console.info(LOG_PREFIX, `Updating internal API hosts ${JSON.stringify(services)}`)
  // If we only have found MIN_HEALTHY_SERVICES, just show everything instead
  if (services.length > MIN_HEALTHY_SERVICES) {
    usableDiscoveryProviders = services
  } else {
    // Get all services (no healthy check)
    const allServices =
      await libs.discoveryProvider.serviceSelector.getServices()
    usableDiscoveryProviders = allServices
  }
}

onStartup(() => {
  updateDiscoveryProviders()
  setInterval(() => {
    updateDiscoveryProviders()
  }, DISCOVERY_PROVIDER_REFRESH_INTERVAL)
})

/**
 * Gets a randomized list of discovery service endpoints
 */
router.get('/', async (req: express.Request, res: express.Response) => {
  console.info(LOG_PREFIX, `Serving API hosts: ${usableDiscoveryProviders}`)
  const randomizedEndpoints = shuffle(usableDiscoveryProviders)
  return res.json({ data: randomizedEndpoints })
})
