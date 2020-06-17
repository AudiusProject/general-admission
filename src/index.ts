import express from 'express'
import path from 'path'
import getMetaTagsResponse from './servlets/metaTags'

import { BedtimeFormat } from './servlets/bedtime/types'
import { MetaTagFormat } from './servlets/metaTags/types'

import { getBedtimeResponse } from './servlets/bedtime'

import libs from './libs'

const PORT = 8000

const app = express()
const router = express.Router()

/** Bedtime Routes */

router.get('/embed/api/tracks/:id', (
  req: express.Request,
  res: express.Response) => {
    getBedtimeResponse(BedtimeFormat.TRACK, req, res)
  }
)

router.get('/embed/api/collections/:id', (
  req: express.Request,
  res: express.Response) => {
    getBedtimeResponse(BedtimeFormat.COLLECTION, req, res)
  }
)

/** Metatag Routes */

router.get([
  '/upload',
  '/upload/:type'], (
  req: express.Request,
  res: express.Response) => {
    getMetaTagsResponse(MetaTagFormat.Upload, req, res)
  }
)

router.get('/error', (
  req: express.Request,
  res: express.Response) => {
    getMetaTagsResponse(MetaTagFormat.Error, req, res)
  }
)

router.get('/:handle', (
  req: express.Request,
  res: express.Response) => {
    getMetaTagsResponse(MetaTagFormat.User, req, res)
  }
)

router.get('/:handle/:title/remixes', (
  req: express.Request,
  res: express.Response) => {
    getMetaTagsResponse(MetaTagFormat.Remixes, req, res)
  }
)

router.get('/:handle/:title', (
  req: express.Request,
  res: express.Response) => {
    getMetaTagsResponse(MetaTagFormat.Track, req, res)
  }
)

router.get([
  '/:handle/album/:title',
  '/:handle/playlist/:title'], (
  req: express.Request,
  res: express.Response) => {
    getMetaTagsResponse(MetaTagFormat.Collection, req, res)
  }
)

router.get('/', (
  req: express.Request,
  res: express.Response) => {
    getMetaTagsResponse(MetaTagFormat.Default, req, res)
})

router.get('*', (
  req: express.Request,
  res: express.Response) => {
    getMetaTagsResponse(MetaTagFormat.Default, req, res)
})

app.use(express.static(path.resolve(__dirname + '/public')))
app.use('/', router)

const start = async () => {
  await libs.init()
  app.listen(PORT, () => {
    console.log(`Listening on ${PORT}`)
  })
}

start()
