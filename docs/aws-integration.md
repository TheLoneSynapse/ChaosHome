# AWS Integration (Bedrock)

ChaosHome's agent uses **Amazon Bedrock (Converse API)** as its online reasoning
engine, driving the ChaosHome MCP tools through a native tool-use loop. When AWS is
unreachable, it degrades gracefully to a local rules-based agent over the *same* MCP
tools - which is also the demo's "pull the network cable" moment.

## How it works

1. The agent connects to the ChaosHome MCP server (`Streamable HTTP`) and calls
   `listTools`.
2. Each MCP tool is translated into a Bedrock tool specification
   (`toolConfig.tools[].toolSpec`, with the MCP JSON Schema passed as
   `inputSchema.json`).
3. `ConverseCommand` runs a tool-use loop (max 5 turns):
   - `stopReason: "tool_use"` -> execute each `toolUse` block via
     `client.callTool(...)` over MCP -> append `toolResult` blocks -> converse again.
   - otherwise -> return the model's text as the reply.
4. Every tool call and its result summary is surfaced in the dashboard chat as a chip,
   so judges can see exactly which MCP tools the model used.

Source: `packages/agent/src/index.ts` (`bedrockChat`).

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `BEDROCK_MODEL_ID` | `amazon.nova-lite-v1:0` | Converse model id (any tool-use capable model works: Amazon Nova, Claude, etc.) |
| `AWS_REGION` | `us-east-1` | Bedrock region |
| `CHAOSHOME_OFFLINE` | - | `1` skips Bedrock entirely (forces offline mode) |

Credentials follow the standard AWS SDK chain (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`,
`AWS_PROFILE`, shared config, container credentials).

Minimum IAM permission:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": "bedrock:Converse", "Resource": "*" }
  ]
}
```

(Scoped further by model/region in production, e.g. `arn:aws:bedrock:us-east-1::foundation-model/amazon-nova-lite-v1:0`.)

## Graceful degradation (why it matters)

```ts
try {
  return await this.bedrockChat(message);
} catch (err) {
  const reply = await this.offlineChat(message);   // same MCP tools, rules-based
  return { ...reply, reply: `${reply.reply}\n\n(AWS Bedrock unavailable: ... fell back
           to offline reasoning; this agent works without the cloud.)` };
}
```

The offline router calls the identical MCP tools (`run_chaos_sim`, `explain_failure`,
`apply_fix`, `home_health`, ...), so functionality is preserved minus open-ended
natural-language reasoning. The chat badge shows which mode answered
(`AWS Bedrock` vs `offline`).

## Try it

```bash
# online
AWS_PROFILE=your-profile npm start
# forced offline
CHAOSHOME_OFFLINE=1 npm start
```

Then in the dashboard chat: *"run the chaos suite"*, *"why did Good Night break?"*,
*"fix everything"* - watch the tool chips appear (`run_chaos_sim`, `explain_failure`,
`apply_fix`) regardless of mode.
