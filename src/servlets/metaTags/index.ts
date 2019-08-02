import express from 'express'
import fs from 'fs'
import handlebars from 'handlebars'
import path from 'path'

const template = handlebars.compile(
  fs
    .readFileSync(path.resolve(__dirname, './template.html'))
    .toString()
)

const getResponse = (res: express.Response) => {
  const context = {
    title: 'Best track',
  }
  const html = template(context)
  return res.send(html)
}

export default getResponse
