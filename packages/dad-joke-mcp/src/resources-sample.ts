

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