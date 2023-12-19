/**
 * This is the entry point for the GraphQL API plugin. Here we specify the GraphQL schema and resolvers.
 */

import fs from 'fs'
import path from 'path'
import {fileURLToPath} from 'url'

import Fastify from 'fastify'
import cors from '@fastify/cors'
import mercurius from 'mercurius'
import {makeExecutableSchema} from '@graphql-tools/schema'
import {PubSub} from 'graphql-subscriptions'
import {gql} from 'graphql-tag'

import resolvers from './resolvers.js'

/**
 * @typedef {Object} GraphQLConfig
 * @property {boolean} [disabled=false] Whether the GraphQL API is disabled.
 * @property {number} [port=4000] The port to listen on.
 */

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

  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const schemaPath = path.join(__dirname, 'schema.graphql')
  const typeDefs = gql(await fs.promises.readFile(schemaPath, 'utf8'))

  const app = Fastify()
  app.register(cors)
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers
  })

  app.register(mercurius, {
    schema,
    context: () => {
      return {api, pubSub: pubSub}
    },
    subscription: {
      onConnect: () => {
        return {api, pubSub: pubSub}
      }
    }
  })

  // Start the server
  app.listen({port: config.port || 4000}, (err, address) => {
    if (err) {
      api.log.error(err.message)
      throw new Error(err.message)
    }
    api.log.info(`GraphQL endpoint available at ${address}`)
  })

  api.comms.on('all', (msg) => {
    api.log.trace(
      'Received messageInput from system, sending to GraphQL subs',
      msg.toObject()
    )
    pubSub.publish('MESSAGE_SENT', {
      messageCreated: msg.toObject()
    })
  })

  api.on('messageUpdated', (msg) => {
    api.log.trace(
      'Received messageUpdated from system, sending to GraphQL subs',
      msg.toObject()
    )
    pubSub.publish('MESSAGE_UPDATED', {
      messageUpdated: msg.toObject()
    })
  })

  api.groups.on('created', (name, members) => {
    api.log.debug(
      'Received groupCreated event from system, sending to GraphQL subs',
      name
    )
    pubSub.publish('GROUP_CREATED', {
      groupCreated: {name, members}
    })
  })

  api.groups.on('updated', (name, members) => {
    api.log.debug(
      'Received groupUpdated event from system, sending to GraphQL subs',
      name
    )
    pubSub.publish('GROUP_UPDATED', {
      groupUpdated: {name, members}
    })
  })

  api.on('agentCreated', (agent) => {
    api.log.debug(
      'Received agentCreated event from system, sending to GraphQL subs',
      agent
    )
    pubSub.publish('AGENT_CREATED', {
      agentCreated: agent
    })
  })

  api.on('agentUpdated', (agent) => {
    api.log.debug(
      'Received agentUpdated event from system, sending to GraphQL subs',
      agent
    )
    pubSub.publish('AGENT_UPDATED', {
      agentUpdated: agent
    })
  })
}
