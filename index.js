/**
 * This is the entry point for the GraphQL API plugin. Here we specify the GraphQL schema and resolvers.
 */

import Fastify from "fastify";
import mercurius from "mercurius";
import {gql} from "graphql-tag";
import cors from "@fastify/cors";
import {makeExecutableSchema} from "@graphql-tools/schema";
import {PubSub} from "graphql-subscriptions";

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
    api.log.info("GraphQL API is disabled");
    return;
  }

  let id = 1;
  let messages = [];

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
        context.api.log.trace("GraphQL Received Request for Agents", args);
        const response = [];
        const agentMap = context.api.agentMan.getAgents();
        for (let agentName in agentMap) {
          const agent = agentMap[agentName];
          response.push(agent);
        }
        return response;
      },
      drivers: (parent, args, context) => {
        context.api.log.trace("GraphQL Received Request for Drivers", args);
        const response = new Set();
        const agentMap = context.api.agentMan.getAgents();
        for (let agentName in agentMap) {
          const agent = agentMap[agentName];
          response.add(agent.driver);
        }
        return response.values();
      },
      groups: (parent, args, context) => {
        context.api.log.trace("GraphQL Received Request for Groups", args);
        const response = new Set();
        const groups = context.api.config.groups;
        let i = 1;
        for (let groupName in groups) {
          response.add({
            name: groupName,
            members: groups[groupName],
          });
        }
        return response.values();
      },
      messages: (parent, args, context) => {
        return messages;
      },
    },
    Mutation: {
      sendMessage: (parent, args, context) => {
        context.api.log.trace("GraphQL Received Message:", args);
        const message = {
          id: id++,
          type: "string",
          content: args.message ?? "",
        };
        messages.push(message);
        context.pubSub.publish("MESSAGE_SENT", { messageSent: message });
        return message;
      },
    },
    Subscription: {
      messageSent: {
        subscribe: () => pubSub.asyncIterator(["MESSAGE_SENT"]),
      },
    },
  };

  const app = Fastify();
  app.register(cors);
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  app.register(mercurius, {
    schema,
    context: (request, reply) => {
      return { api, pubSub: pubSub };
    },
    subscription: true,
  });

  // Start the server
  app.listen({ port: config.port || 4000 }, (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`GraphQL endpoint available at ${address}`);
  });

  let randomId = 1;
  setInterval(() => {
    const message = {
      id: id++,
      type: "string",
      content: `Random message ${randomId++}`,
    };
    messages.push(message);
    console.log("Publishing message:", message);
    pubSub.publish("MESSAGE_SENT", { messageSent: message });
  }, 5000);
}
