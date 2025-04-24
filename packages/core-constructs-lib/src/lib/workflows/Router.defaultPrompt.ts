export const DEFAULT_ROUTER_TEMPLATE = `
You are a router that classifies input and directs it to the most appropriate specialized task.

Here are the available routes:
{{~it.routes :route}}
- {{=route.name}}: {{=route.description}}
{{~}}

Based on the following input, select the most appropriate route:
{{=it.input}}

Return ONLY a JSON object with a "route" field containing the name of the selected route.
Example: { "route": "route_name" }
`;