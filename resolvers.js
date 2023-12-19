const Query = {
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
    const driverNames = context.api.agents.availableDrivers()
    return driverNames.map(name => ({type: name}))
  },
  groups: (parent, args, context) => {
    context.api.log.trace('GraphQL Received Request for Groups', args)
    const response = []
    const groups = context.api.groups.map()
    for (const groupName in groups) {
      response.push({
        name: groupName,
        members: groups[groupName]
      })
    }
    return response
  },
  history: (parent, args, context) => {
    context.api.log.trace('GraphQL Received Request for History', args)
    let messages
    if (!args.source && !args.target) {
      messages = context.api.comms.history.all()
    } else {
      const sourceHistory = context.api.comms.history.bySource(args.source)
      const targetHistory = context.api.comms.history.byTarget(args.target)
      messages = [...sourceHistory, ...targetHistory]
    }
    return messages
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((msg) => msg.toObject())
  }
}

const Mutation = {
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
      driver: {
        type: args.driver
      }
    })
  }
}

const Subscription = {
  messageCreated: {
    subscribe: (_, __, {pubSub}) => {
      return pubSub.asyncIterator(['MESSAGE_SENT'])
    }
  },
  messageUpdated: {
    subscribe: (_, __, {pubSub}) => {
      return pubSub.asyncIterator(['MESSAGE_UPDATED'])
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
  },
  agentUpdated: {
    subscribe: (_, __, {pubSub}) => {
      return pubSub.asyncIterator(['AGENT_UPDATED'])
    }
  }
}

export default {
  Query,
  Mutation,
  Subscription
}
