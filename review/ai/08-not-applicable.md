# RAG, embeddings, vector search and context management

Owner: Ravi.

## [AI-033] Retrieval, embeddings and vector search are not used, and would not help

- Category: Architecture
- Severity: Informational
- Status: Implemented (Not Applicable)
- File: none
- Code Location: none
- Description: Foldback has no RAG, no embeddings and no vector store.
- Current Implementation:
  - **RAG:** Not Applicable. The rule reader reads one pasted text of at most 6,000 characters, which fits in the prompt whole. The assistant's facts are one plan's rows (at most 4 people and the last 20 events), read through typed tools that return exact values. Retrieval would replace exact reads with similarity search and add a way to be wrong.
  - **Embeddings and vector search:** Not Applicable. There is no corpus to search, and no user-facing search feature.
  - **Context management:** Handled simply and correctly. The rule reader sends one message pair. The assistant sends the system prompt, the tool list, at most 12 client turns of at most 2,000 characters, and the tool results of at most 6 steps. That is far below any model's context window, so no summarising or windowing is needed. The client keeps the conversation (it is lost on reload; see FE-013).
- Problem: None.
- Why It Matters: Adding retrieval or a vector database would add a dependency, cost and failure modes for no benefit. A judge asking "why no RAG?" has a clear answer: the data is small, structured and exact.
- Recommended Solution: Do not add any of these. Say so in one line in the README's AI section.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: None
- Verification Method: `backend/package.json` has no vector or embedding dependency; `agentSchema` caps the conversation.

## Claude API skill

The `claude-api` skill is Not Applicable: Foldback calls DeepSeek, Groq, Gemini and (optionally) OpenRouter, never Anthropic's API.
