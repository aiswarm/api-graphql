import {gql} from 'graphql-tag'

export const typeDefs = gql`
  type Query {
    agents: [Agent]
    drivers: [Driver]
    groups: [Group]
    history(target: String, source: String): [Message]!
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
    members: [String]
  }
  type Message {
    id: Float
    source: String
    target: String!
    timestamp: String
    content: String!
    type: String!
  }

  type Mutation {
    sendMessage(message: String!, target: String!, source: String): Message
    createGroup(name: String!): String
    createAgent(name: String!, driver: String!): Agent
  }

  type Subscription {
    messageCreated: Message
    groupCreated: Group
    groupUpdated: Group
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
      const groups = context.api.groups.map()
      for (const groupName in groups) {
        response.add({
          name: groupName,
          members: groups[groupName]
        })
      }
      return response.values()
    },
    history: (parent, args, context) => {
      context.api.log.trace('GraphQL Received Request for History', args)
      if (!args.target) return context.api.comms.history.all()
      const sourceHistory = context.api.comms.history.bySource(args.source)
      const targetHistory = context.api.comms.history.byTarget(args.target)
      return [...sourceHistory, ...targetHistory]
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((msg) => msg.toObject())
    }
  },
  Mutation: {
    sendMessage: (parent, args, context) => {
      context.api.log.trace('GraphQL Received Message:', args)
      const msg = context.api.comms.createMessage(
        args.target,
        args.source || 'user',
        args.message
      )
      context.api.comms.emit(msg)
      return msg.toObject()
    },
    createGroup: (parent, args, context) => {
      context.api.log.trace('GraphQL Received Request to add Group', args)
      context.api.createGroup(args.name)
      return args.name
    },
    createAgent: (parent, args, context) => {
      context.api.log.trace('GraphQL Received Request to add Agent', args)

      return context.api.createAgent(args.name, {
        description: 'Created by GraphQL',
        creator: false,
        isolate: false,
        driver: {
          type: args.driver
        }
      })
    }
  },
  Subscription: {
    messageCreated: {
      subscribe: (_, __, {pubSub}) => {
        return pubSub.asyncIterator(['MESSAGE_SENT'])
      }
    },
    groupCreated: {
      subscribe: (_, __, {pubSub}) => {
        return pubSub.asyncIterator(['GROUP_CREATED'])
      }
    },
    groupUpdated: {
      subscribe: (_, __, {pubSub}) => {
        return pubSub.asyncIterator(['GROUP_UPDATED'])
      }
    },
    agentCreated: {
      subscribe: (_, __, {pubSub}) => {
        return pubSub.asyncIterator(['AGENT_CREATED'])
      }
    }
  }
}
