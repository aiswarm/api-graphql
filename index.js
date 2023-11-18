import {ApolloServer, gql} from 'apollo-server';

/**
 * @typedef {Object} GraphQLConfig
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
      }
      type Agent {
          name: String
          driver: Driver
      }
      type Driver {
          type: String
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
      }
    }
  };

  // Create Apollo Server
  const server = new ApolloServer({typeDefs, resolvers, context: {api}});

  server.listen().then(({url}) => {
    api.log.info(`GraphQL API ready at`, url);
  });
}

