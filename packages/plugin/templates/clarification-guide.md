# FORGE Clarification Guide

This guide helps Claude ask the right questions to fully understand a specification before implementation.

## Clarification Categories

### 1. SCOPE Questions

**Purpose**: Define boundaries of work

| Question Type | Example |
|---------------|---------|
| Inclusion | "Should this include X feature?" |
| Exclusion | "Are we excluding Y for now?" |
| MVP vs Full | "Is this MVP or full implementation?" |
| Boundaries | "Does this extend to Z module?" |

**Template Questions:**
- "What's the minimum viable scope for this feature?"
- "Are there any related features we should NOT touch?"
- "Should this work with [existing feature] or be standalone?"

### 2. TECHNICAL Questions

**Purpose**: Understand implementation constraints

| Question Type | Example |
|---------------|---------|
| Technology | "Should we use library X or Y?" |
| Architecture | "REST API or GraphQL?" |
| Patterns | "Should we follow pattern X from [existing code]?" |
| Constraints | "Any performance requirements?" |

**Template Questions:**
- "I see you're using [pattern] in [file]. Should I follow the same approach?"
- "Any specific libraries you prefer for [task]?"
- "What's the expected load/scale for this feature?"
- "Should this be synchronous or async?"

### 3. INTEGRATION Questions

**Purpose**: Understand how this fits with existing code

| Question Type | Example |
|---------------|---------|
| Dependencies | "Which existing services should I use?" |
| Consumers | "What will consume this API?" |
| Data Flow | "Where does the data come from/go to?" |
| Breaking Changes | "Can I modify [existing interface]?" |

**Template Questions:**
- "I see [existing code]. Should I integrate with it or create something new?"
- "Who/what will be calling this functionality?"
- "Any backward compatibility concerns?"

### 4. SUCCESS CRITERIA Questions

**Purpose**: Define what "done" looks like

| Question Type | Example |
|---------------|---------|
| Functional | "What should happen when X?" |
| Edge Cases | "How should we handle Y error?" |
| Validation | "What tests should pass?" |
| Acceptance | "How will you verify this works?" |

**Template Questions:**
- "What's the expected behavior when [edge case]?"
- "Should there be specific error messages for [scenario]?"
- "Do you have existing tests I should make pass?"
- "What would a demo of this feature look like?"

### 5. PRIORITY Questions

**Purpose**: Understand what matters most

| Question Type | Example |
|---------------|---------|
| Must-haves | "What's absolutely required?" |
| Nice-to-haves | "What can we skip if needed?" |
| Order | "What should be built first?" |
| Trade-offs | "Speed vs completeness?" |

**Template Questions:**
- "If we run out of time, what should definitely be included?"
- "Are there any nice-to-have features we can defer?"
- "What's more important: [A] or [B]?"

---

## Question Flow

### Opening
```
I'll help you build [GOAL]. Before I start, let me understand the requirements better.
I have [N] questions across [categories]:
```

### Questions Format
```
**Scope:**
1. [Question]

**Technical:**
2. [Question]
3. [Question]

**Integration:**
4. [Question]

**Success:**
5. [Question]

Please answer each question. Type "skip" or "decide" for any you'd like me to choose.
```

### Handling Responses

| User Response | Action |
|---------------|--------|
| Clear answer | Document in spec |
| "skip" / "decide" | Make reasonable choice, document as assumption |
| Unclear | Ask follow-up |
| Contradictory | Point out and clarify |

### Closing
```
Thanks! Here's what I understood:

**Summary:**
- [Key point 1]
- [Key point 2]
- [Key point 3]

**Assumptions I made:**
- [Assumption 1]
- [Assumption 2]

Does this look right? If yes, I'll create the specification.
```

---

## Question Examples by Goal Type

### API Development
1. "REST or GraphQL?"
2. "What authentication method?"
3. "What HTTP status codes for errors?"
4. "OpenAPI documentation needed?"
5. "Rate limiting requirements?"

### UI Component
1. "Responsive design requirements?"
2. "Accessibility requirements (WCAG level)?"
3. "Design system/component library to use?"
4. "Animation/transition preferences?"
5. "Browser support requirements?"

### Database Change
1. "Migration strategy (up/down)?"
2. "Data backfill needed?"
3. "Index requirements?"
4. "Soft delete or hard delete?"
5. "Audit trail needed?"

### Integration
1. "API documentation available?"
2. "Authentication method for external API?"
3. "Error handling strategy?"
4. "Retry/timeout configuration?"
5. "Fallback behavior?"

---

## Red Flags (Needs Clarification)

Watch for these in user requests:

| Red Flag | Why | Question to Ask |
|----------|-----|-----------------|
| "Simple" | Often complex | "Can you describe the happy path?" |
| "Just like X" | Vague reference | "Which specific aspects of X?" |
| "Quickly" | Scope concern | "What's the MVP version?" |
| "Should work" | Unclear criteria | "How will we test it works?" |
| "Obvious" | Assumptions | "Let me confirm: [state assumption]" |
| "Etc." | Missing details | "What other cases should I handle?" |
| No error handling mentioned | Critical gap | "How should errors be handled?" |
| No tests mentioned | Quality concern | "What should the tests verify?" |

---

## Confidence Levels

After clarification, assess confidence:

| Level | Meaning | Action |
|-------|---------|--------|
| High (>80%) | Clear requirements | Proceed to spec |
| Medium (50-80%) | Some ambiguity | State assumptions, proceed |
| Low (<50%) | Major gaps | Ask more questions |

Document confidence in spec:
```markdown
## Confidence Assessment

- Overall: HIGH (85%)
- Scope: HIGH - well defined boundaries
- Technical: MEDIUM - some library choices assumed
- Integration: HIGH - clear integration points
- Success Criteria: MEDIUM - edge cases need runtime testing
```
