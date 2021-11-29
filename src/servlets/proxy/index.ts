import express from 'express'
import request from 'request-promise'

import promiseAny from '../utils/promise.any'

const PROXY_URLS = (process.env.PROXY_URLS || '').split(',')

export const router = express.Router()

const proxyRequest = async (proxyUrl: string, formattedUrl: string) => {
  console.log(`Proxying to ${formattedUrl} via ${proxyUrl}`)
  const start = Date.now()
  const result = await new Promise((resolve, reject) => {
    request({
      url: formattedUrl,
      proxy: proxyUrl,
      json: true
    }).then(
      (res) => {
        resolve(res)
      },
      (error) => {
        console.error(error)
        reject(error)
      }
    )
  })
  const duration = Date.now() - start
  console.log(`[${duration}] Proxy succeeded to ${formattedUrl} via ${proxyUrl}`)
  return result
}

/**
 * Proxy request via external
 */
router.get('/', async (
  req: express.Request,
  expressRes: express.Response
) => {
    try {
      const url = req.query.url as string
      const replace = req.query.replace as string

      if (!url) throw new Error('No url provided')
      if (!replace) throw new Error('No replace json provided')

      let formattedUrl = url
      const parsedReplaceJSON = JSON.parse(replace)
      Object.keys(parsedReplaceJSON).forEach((key: string) => {
        formattedUrl = formattedUrl.replace(key, parsedReplaceJSON[key])
      })

      const requests = PROXY_URLS.map((proxy) => proxyRequest(proxy, formattedUrl))
      const result = await promiseAny(requests)

      expressRes.json(result)
    } catch (e) {
      console.error(e)
      expressRes.status(500).send({ error: e.message })
    }
})

/**
 * Simple proxy with no external
 */
router.get('/simple', async (
  req: express.Request,
  expressRes: express.Response
) => {
  const url = req.query.url as string
  const res = await new Promise((resolve, reject) => {
    request({
      url,
      headers: {
        'Access-Control-Allow-Method': '*',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*'
      }
    }).then(
      (res) => resolve(res),
      (error) => reject(error)
    )
  })
  expressRes.send(res)
})
