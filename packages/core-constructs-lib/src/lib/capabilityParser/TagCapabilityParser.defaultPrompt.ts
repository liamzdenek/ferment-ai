export const DEFAULT_PROMPT_STRING = `
# Tool Use Instructions

You have access to the following functions:
{{~it.tools :tool}}
Use the function '{{=tool.name}}' to '{{=tool.description}}' w/ parameters: {{=JSON.stringify(tool.parameters)}}
{{~}}
If you choose to call a function ONLY reply in the following format with no prefix or suffix:
<tool_name_here>{"example_name": "example_value"}</tool_name_here>
Reminder:
- If looking for real time information use relevant functions before falling back to web search
- Function calls MUST follow the specified format, start with <name> and end with </name>
- Required parameters MUST be specified
- Only call one function at a time
- Put the entire function call reply on one line
- Do not repeat the xml-like tag or the tool will run a second time
`.trim();