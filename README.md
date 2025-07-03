# MCP EDR Health Server

This project implements an MCP server in TypeScript with a tool called `is edr health`.

## Features

- Exposes a tool to check the health of an EDR instance by sending a GET request to `<base_url>.skypath.io/edr/health`.
- Built using the official Model Context Protocol SDK.

## Usage

### Build

```zsh
npm run build
```

### Run (stdio)

```zsh
node build/index.js
```

## Development

- Source code is in `src/index.ts`.
- Update the tool logic as needed for your EDR health requirements.

## References

- [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)
- [MCP Server Quickstart](https://modelcontextprotocol.io/quickstart/server)

---

© 2025
