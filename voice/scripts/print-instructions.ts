// Prints the opening line and instructions for pasting into a dashboard or reviewing.
import { demoAgentSpec } from "../src/agent-config.js";

const spec = demoAgentSpec();
console.log(`# ${spec.name}\n\n## Opening line\n${spec.firstMessage}\n\n## Instructions\n${spec.instructions}`);
