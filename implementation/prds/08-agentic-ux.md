# PRD 08: Agentic UX

**Status:** Planned
**Depends on:** PRD 07 (Tauri app shell), PRD 04 (board rules), PRD 06 (evidence linking)

## Problem Description

The final phase adds an agent-driven interface for updating and populating boards. Users should be able to interact with their Trello boards via natural language commands, receive smart suggestions, and benefit from automated workflows — all while respecting board rules and access controls.

## Current State

- All CRUD operations are validated and wrapped in a typed API client
- Board rules engine can validate mutations
- RBAC controls access to boards and features
- Evidence linking provides context for task completion
- Desktop app provides the UI shell

## Requirements

### Functional
1. **Natural language commands:**
   - "Create a card called X in the To Do list"
   - "Move all cards assigned to me from In Progress to Done"
   - "What's overdue on Board X?"
   - "Add a time log of 2 hours to card Y"
   - "Link this commit to card Z" (with clipboard/git context)
2. **Smart suggestions:**
   - Suggest due dates based on historical estimation accuracy
   - Flag cards that have been in a list too long
   - Suggest label assignments based on card content
   - Warn about board rule violations before they happen
3. **Automated workflows:**
   - Daily standup summary: what was done yesterday, what's planned today
   - Weekly report: estimation accuracy, completion rate, time distribution
   - Auto-archive completed cards after N days
   - Auto-assign labels based on card naming patterns
4. **Agent interface:**
   - Chat-style input in the app sidebar
   - Command palette (Cmd+K) for quick actions
   - Agent responses rendered as rich cards (not just text)
   - Action confirmation before mutating data
5. **Context awareness:**
   - Agent knows the current board, active filters, selected card
   - Agent can reference recent activity and evidence
   - Agent respects board rules and RBAC when suggesting actions

### Non-Functional
1. Agent response time: < 3 seconds for simple queries, < 10 seconds for complex operations
2. All agent-initiated mutations require user confirmation
3. Agent must work offline for local queries (board state, evidence, metrics)
4. Agent conversation history is stored locally and searchable

## Impacted Files

| File / Module | Change Type | Notes |
|---|---|---|
| `src/agent/parser.ts` | create | Natural language command parsing |
| `src/agent/executor.ts` | create | Command execution with rule/RBAC checks |
| `src/agent/suggestions.ts` | create | Smart suggestion engine |
| `src/agent/workflows.ts` | create | Automated workflow definitions |
| `src/agent/context.ts` | create | Context aggregation (current board, card, filters) |
| `src/ui/components/AgentChat.tsx` | create | Chat interface component |
| `src/ui/components/CommandPalette.tsx` | create | Cmd+K command palette |
| `tests/unit_tests/agent-parser.test.ts` | create | NLP command parsing tests |
| `tests/unit_tests/agent-workflows.test.ts` | create | Workflow execution tests |

## Constraints

- Agent must never bypass board rules or RBAC
- All mutations require explicit user confirmation (no auto-execute)
- NLP parsing can use Claude API but must degrade gracefully if offline
- Workflow automation must be opt-in per board (not default)
- Agent must not access boards the user doesn't have permission to

## Success Criteria

1. Natural language commands correctly parse and execute for all listed examples
2. Smart suggestions are relevant and actionable (> 70% acceptance rate in user testing)
3. Daily standup and weekly report workflows generate accurate summaries
4. Command palette provides instant search across boards, cards, and actions
5. Agent respects board rules — suggested actions never violate configured rules
6. Agent respects RBAC — never shows or modifies data the user can't access

## Out of Scope

- Voice input
- Multi-agent orchestration (single agent per session)
- Training custom NLP models (use Claude API)
- Agent-to-agent communication across users
- Slack/Teams integration for agent outputs

## Open Questions

1. **LLM provider:** Claude API is the default. Should we support pluggable providers?
2. **Offline NLP:** How sophisticated should offline command parsing be? Regex-based or small local model?
3. **Workflow scheduling:** Should automated workflows run on a cron schedule or be triggered by events?
