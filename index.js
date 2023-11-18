/**
 * This is the entry point for the GraphQL API plugin. Here we specify the GraphQL schema and resolvers.
 */

import express from 'express';
import cors from 'cors';
import {ApolloServer, gql} from 'apollo-server-express';
import {createServer} from 'http';
import {execute, subscribe} from 'graphql';
import {SubscriptionServer} from 'subscriptions-transport-ws';
import {PubSub} from 'graphql-subscriptions';
import {makeExecutableSchema} from '@graphql-tools/schema';


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
  const config = api.config.graphql ?? {};
  const pubSub = new PubSub();

  if (config.disabled) {
    api.log.info('GraphQL API is disabled');
    return
  }

  let id = 1
  let messages = []

  const typeDefs = gql`
      type Query {
          agents: [Agent]
          drivers: [Driver]
          groups: [Group]
          messages: [Message]
      }
      type Agent {
          name: String
          driver: Driver
      }
      type Driver {
          type: String
      }
      type Group {
          name: String
      }
      type Message {
          id: Int
          type: String
          content: String
      }

      type Mutation {
          sendMessage(message: String!): Message
      }

      type Subscription {
          messageSent: Message
      }
  `;

  const resolvers = {
    Query: {
      agents: (parent, args, context) => {
        const response = []
        const agentMap = context.api.agentMan.getAgents()
        for (let agentName in agentMap) {
          const agent = agentMap[agentName]
          response.push(agent)
        }
        return response
      },
      drivers: (parent, args, context) => {
        const response = new Set()
        const agentMap = context.api.agentMan.getAgents()
        for (let agentName in agentMap) {
          const agent = agentMap[agentName]
          response.add(agent.driver)
        }
        return response.values()
      },
      groups: (parent, args, context) => {
        const response = new Set()
        const groups = context.api.config.groups
        let i = 1
        for (let groupName in groups) {
          response.add({
            name: groupName,
            members: groups[groupName]
          })
        }
        return response.values()
      },
      messages: (parent, args, context) => {
        return messages
      },
    },
    Mutation: {
      sendMessage: (parent, args, context) => {
        api.log.trace('GraphQL Received Message:', args)
        const message = {id: id++, type: 'string', content: args.message ?? ''}
        messages.push(message)
        pubSub.publish('MESSAGE_SENT', {messageSent: message})
        return message
      },
    },
    Subscription: {
      messageSent: {
        subscribe: () => pubSub.asyncIterator(['MESSAGE_SENT']),
      },
    },
  };

  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  const app = express();

  app.use(cors());

  const apolloServer = new ApolloServer({
    schema,
    context: {api, pubsub: pubSub}, // Pass the PubSub instance to the context
  });

  const port = config.port ?? 4000

  const httpServer = createServer(app);

  await apolloServer.start()
  apolloServer.applyMiddleware({app, path: '/graphql'});

  httpServer.listen(port, () => {
    console.log(`GraphQL Server ready at http://localhost:${port}${apolloServer.graphqlPath}`);
    console.log(`GraphQL Subscriptions ready at ws://localhost:${port}${apolloServer.graphqlPath}`);
  });

  SubscriptionServer.create({
    execute,
    subscribe,
    schema,
  }, {
    server: httpServer,
    path: '/graphql',
  });

  let randomId = 1;
  setInterval(() => {
    const message = {id: id++, type: 'string', content: `Random message ${randomId++}`};
    messages.push(message);
    console.log('Publishing message:', message);
    pubSub.publish('MESSAGE_SENT', {messageSent: message});
  }, 5000);
}

