/**
 * This is the entry point for the GraphQL API plugin. Here we specify the GraphQL schema and resolvers.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { mercurius } from 'mercurius'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { PubSub } from 'graphql-subscriptions'
import { gql } from 'graphql-tag'
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
      return { api, pubSub: pubSub }
    },
    subscription: {
      onConnect: () => {
        return { api, pubSub: pubSub }
      }
    }
  })

  // Start the server
  await app.listen({ port: config.port || 4000 })
  api.log.info(`GraphQL endpoint available at http://localhost:${config.port || 4000}`)

  api.comms.on('all', msg => {
    api.log.trace('Received messageInput from system, sending to GraphQL subs', msg.toObject())
    pubSub.publish('MESSAGE_SENT', {
      messageCreated: msg.toObject()
    })
  })

  api.on('messageUpdated', msg => {
    api.log.trace('Received messageUpdated from system, sending to GraphQL subs', msg.toObject())
    pubSub.publish('MESSAGE_UPDATED', {
      messageUpdated: msg.toObject()
    })
  })

  api.on('messageAppended', (msg, delta) => {
    api.log.trace(
      'Received messageAppended from system, sending to GraphQL subs',
      msg.id,
      delta.length
    )
    pubSub.publish('MESSAGE_APPENDED', {
      messageAppended: { id: msg.id, delta }
    })
  })

  api.groups.on('created', (name, members) => {
    api.log.trace('Received groupCreated event from system, sending to GraphQL subs', name)
    pubSub.publish('GROUP_CREATED', {
      groupCreated: { name, members }
    })
  })

  api.groups.on('updated', (name, members) => {
    api.log.trace('Received groupUpdated event from system, sending to GraphQL subs', name)
    pubSub.publish('GROUP_UPDATED', {
      groupUpdated: { name, members }
    })
  })

  api.on('agentCreated', agent => {
    api.log.trace('Received agentCreated event from system, sending to GraphQL subs', agent)
    pubSub.publish('AGENT_CREATED', {
      agentCreated: agent
    })
  })

  api.on('agentUpdated', agent => {
    api.log.trace('Received agentUpdated event from system, sending to GraphQL subs', agent)
    pubSub.publish('AGENT_UPDATED', {
      agentUpdated: agent
    })
  })

  api.on('agentTurnCompleted', ({ agent, finalMessage, contextMetadata }) => {
    api.log.trace(
      'Received agentTurnCompleted event from system, sending to GraphQL subs',
      agent?.name
    )
    pubSub.publish('AGENT_TURN_COMPLETED', {
      agentTurnCompleted: {
        agent,
        finalMessage:
          typeof finalMessage === 'string' ? finalMessage : (finalMessage?.content ?? null),
        contextMetadata: contextMetadata
          ? contextMetadata.map(entry => ({
              name: entry.name,
              error: entry.error ?? false,
              metadata: flattenMetadata(entry.metadata)
            }))
          : null
      }
    })
  })

  api.skills.any(
    ['skillStarted', 'skillCompleted', 'skillNotFound', 'skillError'],
    (event, ...args) => {
      api.log.trace(
        'Received a skill status event from system, sending to GraphQL subs',
        event,
        args
      )
      pubSub.publish('SKILL_STATUS', {
        skillStatus: {
          status: event,
          agent: args[0],
          skill: args[1],
          data: JSON.stringify(args[2])
        }
      })
    }
  )
}

/**
 * Flatten a free-form metadata object into the GraphQL [Metadata] key/value
 * shape. Non-string values are JSON-stringified so the API can carry
 * provider-specific structures without committing to a JSON scalar yet.
 * @param {Object|null|undefined} metadata
 * @return {Array<{key: string, value: string}>|null}
 */
function flattenMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return null
  return Object.entries(metadata).map(([key, value]) => ({
    key,
    value: typeof value === 'string' ? value : JSON.stringify(value)
  }))
}
