import cors from 'cors'
import express from 'express'
import path from 'path'

import './fetch-polyfill'
import { startup } from './onStartup'
import { MetaTagFormat } from './servlets/metaTags/types'

import getMetaTagsResponse from './servlets/metaTags'
import { router as proxyRouter } from './servlets/proxy'

const PORT = 8000

const app = express()
app.use(cors())
const router = express.Router()

/** Metatag Routes */

router.get(
  ['/upload', '/upload/:type'],
  (req: express.Request, res: express.Response) => {
    getMetaTagsResponse(MetaTagFormat.Upload, req, res)
  }
)

router.get(
  ['/explore', '/explore/:type'],
  (req: express.Request, res: express.Response) => {
    getMetaTagsResponse(MetaTagFormat.Explore, req, res)
  }
)

router.get(
  '/trending/playlists',
  (req: express.Request, res: express.Response) => {
    req.params.type = 'trending-playlists'
    getMetaTagsResponse(MetaTagFormat.Explore, req, res)
  }
)

router.get('/error', (req: express.Request, res: express.Response) => {
  getMetaTagsResponse(MetaTagFormat.Error, req, res)
})

router.get('/signup', (req: express.Request, res: express.Response) => {
  getMetaTagsResponse(
    req.query.ref || req.query.rf
      ? MetaTagFormat.SignupRef
      : MetaTagFormat.Default,
    req,
    res
  )
})

// Override default metatags
router.get(
  ['/check', '/undefined', '/press'],
  (req: express.Request, res: express.Response) => {
    getMetaTagsResponse(MetaTagFormat.Default, req, res)
  }
)

router.get('/audio', (req: express.Request, res: express.Response) => {
  getMetaTagsResponse(MetaTagFormat.AUDIO, req, res)
})

router.get(
  [
    '/:handle',
    '/:handle/tracks',
    '/:handle/playlists',
    '/:handle/albums',
    '/:handle/reposts',
  ],
  (req: express.Request, res: express.Response) => {
    const { handle } = req.params
    if (handle.trim() === 'download') {
      return getMetaTagsResponse(MetaTagFormat.DownloadApp, req, res)
    }
    getMetaTagsResponse(MetaTagFormat.User, req, res)
  }
)

router.get(
  ['/:handle/collectibles/:collectibleId'],
  (req: express.Request, res: express.Response) => {
    getMetaTagsResponse(MetaTagFormat.Collectible, req, res)
  }
)

router.get(
  ['/:handle/collectibles', '/:handle/audio-nft-playlist'],
  (req: express.Request, res: express.Response) => {
    getMetaTagsResponse(MetaTagFormat.Collectibles, req, res)
  }
)

router.get(
  '/:handle/:title/remixes',
  (req: express.Request, res: express.Response) => {
    getMetaTagsResponse(MetaTagFormat.Remixes, req, res)
  }
)

router.get('/:handle/:title', (req: express.Request, res: express.Response) => {
  getMetaTagsResponse(
    req.query.commentId ? MetaTagFormat.Comment : MetaTagFormat.Track,
    req,
    res
  )
})

router.get(
  ['/:handle/album/:title', '/:handle/playlist/:title'],
  (req: express.Request, res: express.Response) => {
    getMetaTagsResponse(MetaTagFormat.Collection, req, res)
  }
)

router.get('/', (req: express.Request, res: express.Response) => {
  getMetaTagsResponse(MetaTagFormat.Default, req, res)
})

router.get('*', (req: express.Request, res: express.Response) => {
  getMetaTagsResponse(MetaTagFormat.Default, req, res)
})

app.use(express.static(path.resolve(__dirname + '/public')))
app.use('/proxy', proxyRouter)
app.use('/', router)
app.use('/health_check', (req: express.Request, res: express.Response) => {
  res.json({
    status: 'ok',
  })
})

const start = async () => {
  app.listen(PORT, () => {
    console.log(`Listening on ${PORT}`)
    startup()
  })
}

start()
