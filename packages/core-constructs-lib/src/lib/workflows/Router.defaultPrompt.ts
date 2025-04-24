export const DEFAULT_ROUTER_TEMPLATE = `
You are a router that classifies input and directs it to the most appropriate specialized task.

Here are the available routes:
{{~it.routes :route}}
- {{=route.name}}: {{=route.description}}
{{~}}

Based on the previous conversation, select the most appropriate route.

If no route is a good match, you can use {{=it.defaultRoute}} as the default.

Return ONLY a JSON object with a "route" field containing the name of the selected route.
Example: { "route": "route_name" }
`.trim();