import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";
import { diagramTemplates, getTemplate } from "./templates/index.js";

const server = new McpServer({
  name: "diagrammer-mcp",
  version: "0.2.0",
});

registerAllTools(server);

// Register diagram templates as MCP resources
server.resource(
  "templates",
  new ResourceTemplate("template://diagram/{name}", { list: undefined }),
  async (uri, params) => {
    const name = params.name as string;
    const template = getTemplate(name);
    if (!template) {
      throw new Error(`Template not found: ${name}`);
    }
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(template, null, 2),
        },
      ],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
