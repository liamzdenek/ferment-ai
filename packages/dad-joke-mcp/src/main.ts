import { ListResourcesCallback, McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios from 'axios';

// Define the interfaces for the dad joke API responses
interface DadJokeResponse {
  id: string;
  joke: string;
  status: number;
}

interface DadJokeSearchResponse {
  current_page: number;
  limit: number;
  next_page: number;
  previous_page: number;
  results: Array<{
    id: string;
    joke: string;
  }>;
  search_term: string;
  status: number;
  total_jokes: number;
  total_pages: number;
}

const server = new McpServer({
  name: "dad-joke-server",
  version: "1.0.0"
});

const transport: StdioServerTransport = new StdioServerTransport();

// Setup routes for the server
const setupServer = async () => {
  // Static resource
  server.resource(
    "dadjoke",
    "dadjoke://get",
    { description: "Gets a new random dad joke" },
    async (_uri) => {
      try {
        // Implement curl equivalent using axios
        const response = await axios.get<DadJokeResponse>('https://icanhazdadjoke.com/', {
          headers: {
            'User-Agent': 'Dad Joke MCP (https://github.com/ferment-ai/ferment)',
            'Accept': 'application/json'
          }
        });

        const jokeData: DadJokeResponse = {
          id: response.data.id,
          joke: response.data.joke,
          status: response.data.status
        };

        return {
          contents: [{
            uri: "dadjoke://get",
            text: JSON.stringify(jokeData),
            mimeType: "application/json"
          }]
        };
      } catch (error) {
        console.error('Error fetching dad joke:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        return {
          contents: [{
            uri: "dadjoke://error",
            text: JSON.stringify({
              error: 'Failed to fetch dad joke',
              message: errorMessage
            }),
            mimeType: "application/json"
          }]
        };
      }
    }
  );

  /*
  const listResources: ListResourcesCallback = () => ({
    resources: [
      {
        name: "dadjoke://search/{term}",
        uri: "dadjoke://search/sidewalk",
        description: "Search for sidewalk dad jokes"
        // desc
        // mimeType
      },
      {
        name: "dadjoke://search/{term}",
        uri: "dadjoke://search/hipster",
        description: "Search for hipster dad jokes"
        // desc
        // mimeType
      },
    ]
  })

  // Add a resource for searching dad jokes
  server.resource(
    "dadjoke-search",
    new ResourceTemplate("dadjoke://search/{term}", { list: listResources }),
    async (uri, params) => {
      try {
        // Get search term from template parameters
        const term = Array.isArray(params.term) ? params.term[0] : params.term;
        
        if (!term) {
          return {
            contents: [{
              uri: "dadjoke://error",
              text: JSON.stringify({
                error: 'Invalid search URI',
                message: 'Search term not provided'
              }),
              mimeType: "application/json"
            }]
          };
        }
        
        // Make request to the search endpoint
        const response = await axios.get<DadJokeSearchResponse>(`https://icanhazdadjoke.com/search`, {
          params: { term },
          headers: {
            'User-Agent': 'Dad Joke MCP (https://github.com/ferment-ai/ferment)',
            'Accept': 'application/json'
          }
        });

        // Return the search results
        return {
          contents: [{
            uri: `dadjoke://search/${encodeURIComponent(String(term))}`,
            text: JSON.stringify(response.data),
            mimeType: "application/json"
          }]
        };
      } catch (error) {
        console.error('Error searching for dad jokes:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        return {
          contents: [{
            uri: "dadjoke://error",
            text: JSON.stringify({
              error: 'Failed to search for dad jokes',
              message: errorMessage
            }),
            mimeType: "application/json"
          }]
        };
      }
    }
  );
  */



  // Add a tool for searching dad jokes
  server.tool(
    "search_jokes",
    "Search for dad jokes by term",
    {
      term: z.string().describe("Search term to find jokes")
    },
    async ({ term }) => {
      try {
        // Make request to the search endpoint
        const response = await axios.get<DadJokeSearchResponse>(`https://icanhazdadjoke.com/search`, {
          params: { term },
          headers: {
            'User-Agent': 'Dad Joke MCP (https://github.com/ferment-ai/ferment)',
            'Accept': 'application/json'
          }
        });

        // Format the results
        const searchResults = response.data;
        
        if (searchResults.total_jokes === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No jokes found for search term: "${term}"`
              }
            ]
          };
        }

        // Format the jokes into a readable list
        const jokesList = searchResults.results.map(joke => `- ${joke.joke}`).join('\n\n');
        
        return {
          content: [
            {
              type: "text",
              text: `Found ${searchResults.total_jokes} joke${searchResults.total_jokes !== 1 ? 's' : ''} for "${term}":\n\n${jokesList}`
            }
          ]
        };
      } catch (error) {
        console.error('Error searching for dad jokes:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        return {
          content: [
            {
              type: "text",
              text: `Error searching for dad jokes: ${errorMessage}`
            }
          ],
          isError: true
        };
      }
    }
  );

  await server.connect(transport);
};

// Start the server
setupServer().catch(error => {
  console.error('Failed to start dad joke MCP server:', error);
  process.exit(1);
});
