[![npm version](https://badge.fury.io/js/%40aiswarm%2Fapi-graphql.svg)](https://badge.fury.io/js/%40aiswarm%2Fapi-graphql)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Downloads](https://img.shields.io/npm/dm/%40aiswarm%2Fapi-graphql.svg)](https://npmjs.com/package/%40aiswarm%2Fapi-graphql)
[![Issues](https://img.shields.io/github/issues-raw/aiswarm/api-graphql)](https://github.com/aiswarm/api-graphql/issues)
[![Known Vulnerabilities](https://snyk.io/test/github/aiswarm/api-graphql/badge.svg)](https://snyk.io/test/github/aiswarm/api-graphql)

# AI Swarm - API GraphQL

This plugin provides a GraphQL API for the AI Swarm, wrapping most core function of the API interface provided by the [Orchestrator](https://github.com/aiswarm/orchestrator). The plugin provides Queries, Mutations, and Subscriptions for all common operations. It's main use is to provide a way to interact with the AI Swarm from a web interface, but can be adapted to other use cases.

If you're looking for an easy way to get started with the AI Swarm, check out the [Conductor](https://github.com/aiswarm/conductor) project.

## Project setup for development

```
npm install
```

## Recommended Setup for development with other plugins

You will need to link the plugin to the other plugins you want to use. So that you can make changes and see them immediately without having to publish the plugin to npm.

For this I recommend you create a new folder for the AI Swarm and clone all the plugins you want to use into it. Then link them together.

Each plugin has `link` script defined in the `package.json` file if there are dependencies on other packages. 
You can run it with `npm run link` to link your code directly when you make changes.

This project does not have any dependencies on other plugins, so you don't need to link anything.