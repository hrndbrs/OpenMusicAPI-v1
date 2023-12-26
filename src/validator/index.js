const { ClientError, ERROR } = require('../lib/error')
const albumPayloadSchema = require('./albums/schema')
const songPayloadSchema = require('./songs/schema')
const { newUserPayloadSchema } = require('./users/schema')

module.exports = {
  checkError (error) {
    if (error) {
      throw new ClientError(error.message, ERROR.BAD_REQUEST)
    }
  },
  validateAlbumPayload (payload) {
    const { error } = albumPayloadSchema.validate(payload)
    this.checkError(error)
  },
  validateSongPayload (payload) {
    const { error } = songPayloadSchema.validate(payload)
    this.checkError(error)
  },
  validateNewUserPayload (payload) {
    const { error } = newUserPayloadSchema.validate(payload)
    this.checkError(error)
  }
}
