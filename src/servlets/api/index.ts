import express from 'express'
import libs from '../../libs'
import { onStartup } from '../../onStartup'

import { shuffle } from '../utils/helpers'

const LOG_PREFIX = 'servelet: api | '
const TEN_MINUTES = 10 * 60 * 1000

export const router = express.Router()

let useableDiscoveryProviders: string[] = []

const updateDiscoveryProviders = async () => {
  const services = await libs.discoveryProvider.serviceSelector.findAll()
  console.info(LOG_PREFIX, `Updating internal API hosts ${services}`)
  useableDiscoveryProviders = services
}

onStartup(() => {
  updateDiscoveryProviders()
  setInterval(() => {
    updateDiscoveryProviders()
  }, TEN_MINUTES)
})

/**
 * Gets a randomized list of discovery service endpoints
 */
router.get('/', async (
  req: express.Request,
  res: express.Response) => {
    console.info(LOG_PREFIX, `Serving API hosts: ${useableDiscoveryProviders}`)
    const randomizedEndpoints = shuffle(useableDiscoveryProviders)
    return res.json({ data: randomizedEndpoints })
})
