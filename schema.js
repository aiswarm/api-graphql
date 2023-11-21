import { gql } from 'graphql-tag'

export const typeDefs = gql`
  type Query {
    agents: [Agent]
    drivers: [Driver]
    groups: [Group]
    messages: [Message]
  }
  type Agent {
    name: String!
    config: AgentConfig!
    driver: Driver!
  }
  type AgentConfig {
    type: String!
    description: String
    creator: Boolean
    isolate: Boolean
    driver: DriverConfig!
  }
  type DriverConfig {
    type: String!
  }
  type Driver {
    type: String!
  }
  type Group {
    name: String!
  }
  type Message {
    id: Float
    type: String
    source: String
    target: String!
    timestamp: String
    content: String!
  }

  type Mutation {
    sendMessage(message: String!, target: String!): Message
    createGroup(name: String!): String
    createAgent(name: String!, driver: String!): Agent
  }

  type Subscription {
    messageSent: Message
    groupCreated: String
    agentCreated: Agent
  }
`

export const resolvers = {
  Query: {
    agents: (parent, args, context) => {
      context.api.log.trace('GraphQL Received Request for Agents', args)
      const response = []
      const agentMap = context.api.agents.all()
      for (let agentName in agentMap) {
        const agent = agentMap[agentName]
        response.push(agent)
      }
      return response
    },
    drivers: (parent, args, context) => {
      context.api.log.trace('GraphQL Received Request for Drivers', args)
      const response = new Set()
      const agentMap = context.api.agents.all()
      for (let agentName in agentMap) {
        const agent = agentMap[agentName]
        response.add(agent.driver)
      }
      return response.values()
    },
    groups: (parent, args, context) => {
      context.api.log.trace('GraphQL Received Request for Groups', args)
      const response = new Set()
      const groups = context.api.config.groups
      let i = 1
      for (let groupName in groups) {
        response.add({
          name: groupName,
          members: groups[groupName],
        })
      }
      return response.values()
    },
    messages: (parent, args, context) => {
      // TODO get group/agent from args and return their history
      return context.api.comms.history
    },
  },
  Mutation: {
    sendMessage: (parent, args, context) => {
      context.api.log.trace('GraphQL Received Message:', args)
      const msg = context.api.comms.createMessage(
        args.target,
        'user',
        args.message
      )
      context.api.comms.emit(msg)
      return msg
    },
    createGroup: (parent, args, context) => {
      context.api.log.trace('GraphQL Received Request to create Group', args)
      context.api.createGroup(args.name)
      return args.name
    },
    createAgent: (parent, args, context) => {
      context.api.log.trace('GraphQL Received Request to create Agent', args)

      return context.api.createAgent(args.name, {
        description: 'Created by GraphQL',
        creator: false,
        isolate: false,
        driver: {
          type: args.driver,
        },
      })
    },
  },
  Subscription: {
    messageSent: {
      subscribe: (_, __, { pubSub }) => {
        return pubSub.asyncIterator(['MESSAGE_SENT'])
      },
    },
    groupCreated: {
      subscribe: (_, __, { pubSub }) => {
        return pubSub.asyncIterator(['GROUP_CREATED'])
      },
    },
    agentCreated: {
      subscribe: (_, __, { pubSub }) => {
        return pubSub.asyncIterator(['AGENT_CREATED'])
      },
    },
  },
}
