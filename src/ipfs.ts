import createClient from 'ipfs-http-client'

export const globSource = createClient.globSource

const IPFS_PROTOCOL = process.env.IPFS_PROTOCOL || 'http'
const IPFS_HOST = process.env.IPFS_HOST || 'localhost'
const IPFS_PORT = parseInt(process.env.IPFS_PORT || '5001', 10)

console.log(`Connecting to ipfs: ${IPFS_PROTOCOL}://${IPFS_HOST}:${IPFS_PORT}`)

const ipfs = createClient({
  protocol: IPFS_PROTOCOL,
  host: IPFS_HOST,
  port: IPFS_PORT
})

export default ipfs
