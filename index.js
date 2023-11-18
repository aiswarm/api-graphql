/**
 * This is the entry point for the GraphQL API plugin. Here we specify the GraphQL schema and resolvers.
 */

import {ApolloServer, gql} from 'apollo-server';

/**
 * @typedef {Object} GraphQLConfig
 * @property {boolean} [disabled=false] Whether the GraphQL API is disabled.
 * @property {number} [port=4000] The port to listen on.
 */

/**
 * @param {API} api
 * @param {GraphQLConfig} api.config.graphql The configuration object for the GraphQL API.
 */
export function initialize(api) {
  const config = api.config.graphql ?? {};

  if (config.disabled) {
    api.log.info('GraphQL API is disabled');
    return
  }

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
        return [
          {id: 1, type: 'string', content: 'This is the first message'},
          {id: 2, type: 'string', content: 'This is the second message'},
          {id: 3, type: 'string', content: 'This is the third message'},
          {id: 4, type: 'string', content: 'This is the fourth message'},
          {id: 5, type: 'string', content: 'This is the fifth message'},
        ]
      },
    },
    Mutation: {
      sendMessage: (parent, args, context) => {
        api.log.trace('GraphQL Received Message:', args)
        return {id: 1, type: 'string', content: 'A message was sent: ' + args.message ?? ''}
      },
    },
  };

  const server = new ApolloServer({typeDefs, resolvers, context: {api}});
  const port = config.port ?? 4000
  server.listen(port).then(({url}) => {
    api.log.info(`GraphQL API ready at`, url);
  });
}

