import express from 'express'
import semver from 'semver'
import libs from '../../libs'
import { onStartup } from '../../onStartup'

import { shuffle } from '../utils/helpers'

const LOG_PREFIX = 'servelet: api | '
const DISCOVERY_PROVIDER_REFRESH_INTERVAL = 60 * 1000 // one minute
const MIN_HEALTHY_SERVICES = 8
const MIN_BLOCK_DIFFERENCE = 50

type Node = {
  owner: string
  endpoint: string
  spID: number
  type: 'content-node' | 'discovery-node',
  blockNumber: number,
  delegateOwnerWallet: string
}

export const router = express.Router()

let allDiscoveryProviders: Node[] = []
let allContentNodes: Node[] = []
let usableDiscoveryProviders: Node[] = []
let usableContentNodes: Node[] = []

const updateDiscoveryProviders = async () => {
  // Get all services (no healthy check)
  allDiscoveryProviders = await libs.ServiceProvider.listDiscoveryProviders()

  // Get healthy services
  const registeredVersion = await libs.ethContracts.getCurrentVersion('discovery-node')
  console.info(LOG_PREFIX, `Registered version ${registeredVersion}`)
  let services = await libs.discoveryProvider.serviceSelector.findAll({ verbose: true })
  console.info(LOG_PREFIX, `Found services ${JSON.stringify(services)}`)
  services = services
    .filter((service: { version: string }) => semver.gte(service.version, registeredVersion))
    .filter((service: { block_difference: number }) => service.block_difference <= MIN_BLOCK_DIFFERENCE)

  // If we only have found MIN_HEALTHY_SERVICES, just show everything instead
  console.info(LOG_PREFIX, `Updating internal discovery node hosts ${JSON.stringify(services)}`)
  if (services.length > MIN_HEALTHY_SERVICES) {
    console.info(LOG_PREFIX, `Enough services found ${services.length} > ${MIN_HEALTHY_SERVICES}`)
    usableDiscoveryProviders = services.map((s: Node) => ({
      owner: s.owner,
      endpoint: s.endpoint,
      spID: s.spID,
      type: s.type,
      blockNumber: s.blockNumber,
      delegateOwnerWallet: s.delegateOwnerWallet
    }))
  } else {
    console.info(LOG_PREFIX, `Not enough healthy services found, returning everything`)
    usableDiscoveryProviders = allDiscoveryProviders
  }
}

const updateContentNodes = async () => {
  const registeredVersion = await libs.ethContracts.getCurrentVersion('content-node')
  console.info(LOG_PREFIX, `Registered version ${registeredVersion}`)
  const services = await libs.ServiceProvider.listCreatorNodes()
  allContentNodes = services
  usableContentNodes = services
}

onStartup(() => {
  updateDiscoveryProviders()
  updateContentNodes()
  setInterval(() => {
    updateDiscoveryProviders()
    updateContentNodes()
  }, DISCOVERY_PROVIDER_REFRESH_INTERVAL)
})

/**
 * Gets a randomized list of discovery node endpoints
 */
router.get('/', async (req: express.Request, res: express.Response) => {
  const services = req.query.all ? allDiscoveryProviders : usableDiscoveryProviders
  const randomizedEndpoints = shuffle(services.map((s) => s.endpoint))
  return res.json({ data: randomizedEndpoints })
})

/**
 * Gets a randomized list of discovery node endpoints
 */
router.get('/discovery', async (req: express.Request, res: express.Response) => {
  const services = req.query.all ? allDiscoveryProviders : usableDiscoveryProviders
  const randomizedEndpoints = shuffle(services.map((s) => s.endpoint))
  return res.json({ data: randomizedEndpoints })
})

/**
 * Gets a randomized list of discovery node endpoints with verbose data
 */
router.get('/discovery/verbose', async (req: express.Request, res: express.Response) => {
  const services = req.query.all ? allDiscoveryProviders : usableDiscoveryProviders
  const randomizedServices = shuffle(services)
  return res.json({ data: randomizedServices })
})

/**
 * Gets a randomized list of content node endpoints
 */
router.get('/content', async (req: express.Request, res: express.Response) => {
  const services = req.query.all ? allContentNodes : usableContentNodes
  const randomizedEndpoints = shuffle(services.map((s) => s.endpoint))
  return res.json({ data: randomizedEndpoints })
})

/**
 * Gets a randomized list of content node endpoints with verbose data
 */
router.get('/content/verbose', async (req: express.Request, res: express.Response) => {
  const services = req.query.all ? allContentNodes : usableContentNodes
  const randomizedServices = shuffle(services)
  return res.json({ data: randomizedServices })
})
