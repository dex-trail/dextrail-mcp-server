// @ts-ignore
import DKG from 'dkg.js';
// @ts-ignore
import { BLOCKCHAIN_IDS } from 'dkg.js/constants';

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import 'dotenv/config';

import z from "zod";

const OT_NODE_HOSTNAME = 'https://v6-pegasus-node-03.origin-trail.network';
const OT_NODE_PORT = '8900';

const DkgClient = new DKG({
  endpoint: OT_NODE_HOSTNAME,
  port: OT_NODE_PORT,
  blockchain: {
    name: BLOCKCHAIN_IDS.NEUROWEB_TESTNET,
    privateKey: process.env.PRIVATE_KEY,
  },
  maxNumberOfRetries: 300,
  frequency: 2,
  contentType: 'all',
  nodeApiVersion: '/v1',
});

const server = new McpServer({
  name: "dextrail-mcp-server",
  version: "0.0.1",
});

async function queryDKG<T>(
  query: string
): Promise<Array<T>> {
  const { data } = await DkgClient.graph.query(`
  PREFIX schema: <http://schema.org/>
  ${query}
  `, "SELECT");
  return data as Array<T>;
}

server.tool(
  "getById",
  "Query a resource by exact ID. This returns a flat object with fields 'id' + all the fields requested",
  {
    resourceId: z.string(),
    fields: z.array(z.string()),
  },
  async ({ resourceId, fields }) => {
    const resource = await queryDKG(
      `
        SELECT ?s ?id ${fields.map(f => `?{f}`).join(' ')} 
        WHERE {
          ${fields.map(f => `?s schema:${f} ?${f}`).join(' ; ')} .
          FILTER(?id = ${resourceId})
        }
      `
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(resource),
        },
      ],
    };
  }
);

server.tool(
  "getByName",
  "Query a resource by name. This returns a flat object with fields 'name' and 'description",
  {
    name: z.string(),
  },
  async ({ name }) => {
    const resource = await queryDKG(
      `
        SELECT ?s ?name ?description
        WHERE {
            ?s schema:name ?name ;
               schema:description ?description .
               FILTER(LCASE(?name) = "contenta")
        }
      `
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(resource),
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("DexTrail MCP Server running on Std I/O");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
