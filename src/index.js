import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import 'dotenv/config';
import axios from 'axios';

const ACCESS_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoieXNfYWRtaW4iLCJpZCI6IjYxNmU3MzYzM2QxMzZjMGUwODUzM2RjZiIsImRlbW8iOnRydWUsInJvdXRpbmdfZW5hYmxlZCI6dHJ1ZSwiZmlyc3RfbmFtZSI6InlzX2FkbWluIiwibGFzdF9uYW1lIjoieXNfYWRtaW4iLCJlbWFpbCI6InlzX2FkbWluQHRlc3QuY29tIiwicm9sZSI6InN1cGVyX2FkbWluIiwiaXNfdXNlcl9pbml0aWFsaXplZCI6dHJ1ZSwiY29tcGFueV9pZCI6IllTIiwiZmxpZ2h0X3BsYW5fcHJlZml4IjoiU0tZIiwiYWxsb3dlZF9haXJsaW5lcyI6WyIqIl0sIm9yaWdpbmFsSXNzdWVkQXQiOjE3NDgwODg0NjAsImlhdCI6MTc0ODA4ODQ2MCwiZXhwIjoxNzUwNTA3NjYwfQ.QhSQk0xiLWR14HUEBJ6I-39nzrQqJt2nU9WNJidPtxI';
const SKYPATH_API_BASE_URL = 'http://localhost:80';

// Centralized reports list
const AVAILABLE_REPORTS = [
  'daily-pilot-notifications-v2',
  'daily-flights',
  'daily-manual-pireps-v2',
  'daily-reporting-users',
  'daily-turbulence-reporting-v2',
];

// Create server
const server = new McpServer({
  name: 'analytics-mcp-server',
  version: '1.0.0',
  capabilities: {
    tools: {},
    resources: {},
  },
});

// Resource: available datasets
server.resource('resource://available_reports', () => AVAILABLE_REPORTS);

// Tool: prepare-report-request → returns just query parameters
server.tool(
  'prepare-report-request',
  {
    reportType: z
      .string()
      .describe('The type of report to fetch, e.g. "daily-flights"'),
    companies: z
      .array(z.string())
      .optional()
      .describe('Optional array of company codes to filter by'),
    tsFrom: z
      .number()
      .optional()
      .describe('UNIX timestamp to start from (defaults to 7 days ago)'),
    tsTo: z
      .number()
      .optional()
      .describe('UNIX timestamp to end at (defaults to now)'),
  },
  {
    title: 'Prepare report query parameters',
    description: 'Generates query parameters for a given report',
  },
  async ({ reportType, companies, tsFrom, tsTo }) => {
    console.log('Preparing report request for:', reportType);
    const now = Math.floor(Date.now() / 1000);
    const defaultFrom = now - 7 * 24 * 60 * 60;

    const queryParams = {
      reportType,
      groupBy: 'company',
      tsFrom: tsFrom ?? defaultFrom,
      tsTo: tsTo ?? now,
    };
    if (companies) queryParams.companies = companies;

    return {
      tool_call: {
        tool_name: 'execute-report-request',
        input: queryParams,
      },
    };
  }
);

// Tool: execute-report-request → builds URL & headers internally
server.tool(
  'execute-report-request',
  {
    queryParams: z
      .record(z.any())
      .describe('Query parameters to append to the report URL'),
  },
  {
    title: 'Execute Skypath report request',
    description: 'Fetches a report using given query parameters',
  },
  async ({ queryParams }) => {
    console.log('Executing report request of:', queryParams?.reportType);

    // Use axios params and paramsSerializer to handle repeated companies
    const url = `${SKYPATH_API_BASE_URL}/v5/reports`;
    const params = queryParams;
    const paramsSerializer = {
      indexes: null,
    };

    try {
      const response = await axios.get(url, {
        headers: {
          'x-access-token': ACCESS_TOKEN || '',
        },
        params,
        paramsSerializer,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Report result:\n${JSON.stringify(response.data, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      const message =
        error.response?.statusText || error.message || 'Unknown Axios error';
      const status = error.response?.status ?? 'N/A';

      return {
        content: [
          {
            type: 'text',
            text: `Request failed: ${status} ${message}`,
          },
        ],
      };
    }
  }
);

// Launch server
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log('MCP server ready.');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
