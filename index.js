/**
 * This is the entry point for the GraphQL API plugin. Here we specify the GraphQL schema and resolvers.
 */

import Fastify from 'fastify'
import mercurius from 'mercurius'
import cors from '@fastify/cors'
import {makeExecutableSchema} from '@graphql-tools/schema'
import {PubSub} from 'graphql-subscriptions'
import {resolvers, typeDefs} from './schema.js'

/**
 * @typedef {Object} GraphQLConfig
 * @property {boolean} [disabled=false] Whether the GraphQL API is disabled.
 * @property {number} [port=4000] The port to listen on.
 */

/**
 * @param {API} api
 * @param {GraphQLConfig} api.config.graphql The configuration object for the GraphQL API.
 */
export async function initialize(api) {
  const config = api.config.graphql ?? {}
  const pubSub = new PubSub()

  if (config.disabled) {
    api.log.info('GraphQL API is disabled')
    return
  }

  const app = Fastify()
  app.register(cors)
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  })

  app.register(mercurius, {
    schema,
    context: (request, reply) => {
      return { api, pubSub: pubSub }
    },
    subscription: {
      onConnect: (connectionParams, webSocket, context) => {
        return { api, pubSub: pubSub }
      },
    },
  })

  // Start the server
  app.listen({ port: config.port || 4000 }, (err, address) => {
    if (err) {
      console.error(err)
      process.exit(1)
    }
    console.log(`GraphQL endpoint available at ${address}`)
  })

  api.comms.on('all', (msg) => {
    pubSub.publish('MESSAGE_SENT', {
      messageSent: msg.toObject(),
    })
  })
}
