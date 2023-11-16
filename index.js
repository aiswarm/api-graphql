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
      }
      type Agent {
          name: String
          driver: String
      }
  `;

  const resolvers = {
    Query: {
      agents: (parent, args, context) => {
        return context.api.agentMan.getAgents()
      }
    }
  };

  // Create Apollo Server
  const server = new ApolloServer({typeDefs, resolvers, context: {api}});

  server.listen().then(({url}) => {
    api.log.info(`Server ready at`, url);
  });
}

