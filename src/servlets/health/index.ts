import express from 'express'
import { onStartup } from '../../onStartup'

export const router = express.Router()

/**
 * Returns status 200 to check for liveness
 */
router.get('/', async (
  req: express.Request,
  res: express.Response) => {
    res.send('ok')
})
