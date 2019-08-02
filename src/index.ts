import express from 'express'
import getMetaTagsResponse from './servlets/metaTags'

const PORT = 8000

const app = express()
const router = express.Router()

router.get('/', (
  req: express.Request,
  res: express.Response) => {

  getMetaTagsResponse(res)
})

app.use('/', router)

const start = async () => {
  app.listen(PORT, () => {
    console.log(`Listening on ${PORT}`)
  })
}

start()
