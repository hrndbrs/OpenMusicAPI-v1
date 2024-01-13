require('dotenv').config()
const path = require('path')

const Hapi = require('@hapi/hapi')
const jwt = require('@hapi/jwt')
const inert = require('@hapi/inert')

const users = require('./api/users')
const albums = require('./api/albums')
const songs = require('./api/songs')
const auth = require('./api/auth')
const playlists = require('./api/playlists')
const collaborations = require('./api/collaborations')
const fexports = require('./api/exports')

const AlbumService = require('./services/albumService')
const SongService = require('./services/songService')
const UserService = require('./services/userService')
const PlaylistService = require('./services/playlistService')
const CollaborationService = require('./services/collaborationService')
const ProducerService = require('./services/producerService')

const validator = require('./validator')

const tokenManager = require('./lib/jwt')
const { ClientError } = require('./lib/error')
const Constant = require('./lib/constants')

const init = async () => {
  const albumService = new AlbumService()
  const songService = new SongService()
  const userService = new UserService()
  const collaborationService = new CollaborationService()
  const playlistService = new PlaylistService(collaborationService)
  const producerService = new ProducerService()

  const server = Hapi.server({
    port: process.env.PORT,
    host: process.env.HOST,
    routes: {
      cors: {
        origin: ['*']
      }
    }
  })

  await server.register([jwt, inert])

  server.auth.strategy(Constant.JWT_STRATEGY_NAME, 'jwt', {
    keys: process.env.ACCESS_TOKEN_KEY,
    verify: {
      aud: false,
      iss: false,
      sub: false,
      maxAgeSec: 1000 * 60
    },
    validate: (artifacts) => ({
      isValid: true,
      credentials: {
        id: artifacts.decoded.payload.id
      }
    })
  })

  await server.register([
    {
      plugin: albums,
      options: {
        service: albumService,
        validator
      }
    },
    {
      plugin: songs,
      options: {
        service: songService,
        validator
      }
    },
    {
      plugin: users,
      options: {
        service: userService,
        validator
      }
    },
    {
      plugin: auth,
      options: {
        service: userService,
        validator,
        tokenManager
      }
    },
    {
      plugin: playlists,
      options: {
        playlistService,
        songService,
        validator
      }
    },
    {
      plugin: collaborations,
      options: {
        playlistService,
        collaborationService,
        validator
      }
    },
    {
      plugin: fexports,
      options: {
        producerService,
        playlistService,
        validator
      }
    }
  ])

  server.ext('onPreResponse', (req, h) => {
    const { response } = req

    if (response instanceof Error) {
      let statusCode = 500
      const options = {
        status: 'error',
        message: 'Internal server error'
      }

      if (response instanceof ClientError) {
        options.status = 'fail'
        options.message = response.message
        statusCode = response.status
      }

      if (!response.isServer) {
        options.status = 'fail'
        options.message = response.message
        statusCode = response.output.statusCode
      }

      const res = h.response(options)
      res.code(statusCode)
      return res
    }
    return h.continue
  })

  server.route({
    method: 'GET',
    path: '/upload/{param*}',
    handler: {
      directory: {
        path: path.resolve(__dirname, 'upload')
      }
    }
  })

  await server.start()
  console.log('Running on', server.info.uri)
}

init()
