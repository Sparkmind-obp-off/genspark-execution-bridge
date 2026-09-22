# 05 — Security Model

## Threats
- prompt injection
- malicious tool instructions
- credential leakage
- excessive permissions
- unauthorized deployment
- replayed mutations
- confused-deputy behavior
- untrusted generated code

## Trust boundary
User -> Control API -> Policy -> Executor -> MCP/API tool -> External service.

Model output is never authorization.

## Secrets
Never commit .env files, API keys, refresh tokens, access tokens, credential-bearing MCP URLs, or deployment credentials.

Use secret management/environment injection.

## Authorization
Evaluate authorization independently from the model:
can(actor, action, resource, environment).

Production actions require explicit policy approval.

## Prompt injection
Repository files, issues, websites, generated code comments, and tool outputs are untrusted unless explicitly trusted.

## Code execution
Treat generated code as untrusted. For production execution use isolation, restricted network/filesystem, time limits, logs, tests, dependency scanning, and deployment approval.

## Audit
Record timestamp, request_id, task_id, actor, executor, tool, resource, authorization decision, outcome, and error class. Redact secrets.

## Genspark boundary
Connector access follows granted permissions and provider permissions. Genspark documentation states that a connected service does not guarantee every resource/action and that MCP connections do not have a blanket read-only guarantee.

Source: https://www.genspark.ai/helpcenter/connectors-and-integrations
