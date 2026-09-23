# Human-in-the-Loop (HITL) Guide

> Historical design sketch only. Current travel tools only search; there is no booking action. The old `invokeWithApproval` and `approveAndContinue` methods are disabled because they checked state after invocation and could not prevent a tool call. Do not use the examples below as a working approval workflow. Before adding any write tool, implement a pre-tool interrupt, durable checkpoint, authenticated owner-bound decision endpoint, replay protection and an idempotent business operation, then test each condition.

## What is Human-in-the-Loop?

Human-in-the-Loop (HITL) is a pattern where AI agent execution is **interrupted** to request human approval before performing certain actions, typically before executing tools or making external API calls.

## Why Use HITL?

1. **Safety**: Prevent unintended actions (e.g., deleting data, making purchases)
2. **Compliance**: Meet regulatory requirements for human oversight
3. **Trust**: Build user confidence by showing what the agent will do
4. **Control**: Allow users to reject or modify agent actions
5. **Transparency**: Make agent reasoning visible to users

## How It Works in LangGraph

### 1. Configuration

The agent is configured with `interruptBefore: ["tools"]`:

```typescript
this.graph = createReactAgent({
    llm: this.model,
    tools: this.tools,
    checkpointSaver: this.memory,
    interruptBefore: ["tools"]  // ⏸️ Pause before tool execution
});
```

### 2. Execution Flow

```
User Request
     ↓
Agent Analyzes
     ↓
Tool Needed? ──No──→ Direct Response
     ↓ Yes
⏸️ INTERRUPT
     ↓
Show Tool Calls to User
     ↓
User Reviews
     ↓
Approve? ──No──→ Cancel/Reject
     ↓ Yes
Resume Execution
     ↓
Execute Tools
     ↓
Final Response
```

## Implementation

### Step 1: Invoke with Approval Check

```typescript
const result = await agent.invokeWithApproval(
    "Book a flight from Paris to New York",
    "thread-123"
);
```

### Step 2: Check if Approval is Needed

```typescript
if (result.needsApproval) {
    // Agent wants to use tools - show to user
    console.log("Tool calls pending approval:");
    result.toolCalls?.forEach(call => {
        console.log(`- ${call.name}(${JSON.stringify(call.args)})`);
    });
    
    // Wait for user approval in your UI
    // ...
} else {
    // No tools needed, direct response
    console.log("Response:", result.response);
}
```

### Step 3: User Approves

In your UI, show the tool calls to the user:

```typescript
// Example UI (React)
{result.needsApproval && (
    <div className="approval-request">
        <h3>⏸️ Approval Required</h3>
        <p>The agent wants to perform the following actions:</p>
        <ul>
            {result.toolCalls?.map((call, idx) => (
                <li key={idx}>
                    <strong>{call.name}</strong>
                    <pre>{JSON.stringify(call.args, null, 2)}</pre>
                </li>
            ))}
        </ul>
        <button onClick={handleApprove}>✅ Approve</button>
        <button onClick={handleReject}>❌ Reject</button>
    </div>
)}
```

### Step 4: Continue Execution

```typescript
async function handleApprove() {
    const finalResponse = await agent.approveAndContinue(threadId);
    console.log("Final response:", finalResponse);
}
```

## Complete Example

```typescript
import agent from './ai/agents/agent';

async function chatWithApproval(userMessage: string, threadId: string) {
    console.log("User:", userMessage);
    
    // Step 1: Invoke with approval
    const result = await agent.invokeWithApproval(userMessage, threadId);
    
    if (result.needsApproval) {
        // Step 2: Show tool calls to user
        console.log("\n⏸️ APPROVAL REQUIRED");
        console.log("The agent wants to use these tools:");
        
        result.toolCalls?.forEach((call, idx) => {
            console.log(`\n${idx + 1}. ${call.name}`);
            console.log(`   Arguments:`, call.args);
        });
        
        // Step 3: Get user approval (simulated)
        const approved = await getUserApproval(); // Your UI logic
        
        if (approved) {
            // Step 4: Continue execution
            console.log("\n✅ Approved - Continuing...");
            const finalResponse = await agent.approveAndContinue(threadId);
            console.log("\nFinal Response:", finalResponse);
            return finalResponse;
        } else {
            console.log("\n❌ Rejected by user");
            return "Action cancelled by user";
        }
    } else {
        // No approval needed
        console.log("\nDirect Response:", result.response);
        return result.response;
    }
}

// Usage
await chatWithApproval(
    "Search for flights from Paris to New York on December 15th",
    "user-session-123"
);
```

## Best Practices

### 1. Clear Communication

Always show users:
- **What** the agent wants to do
- **Why** it needs to do it
- **What data** will be used

```typescript
// Good
"The agent wants to call search_flights with:
 - Origin: Paris (CDG)
 - Destination: New York (JFK)
 - Date: 2024-12-15"

// Bad
"Tool call pending"
```

### 2. Timeout Handling

Set timeouts for approval requests:

```typescript
const APPROVAL_TIMEOUT = 60000; // 60 seconds

const approvalPromise = waitForUserApproval();
const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error("Approval timeout")), APPROVAL_TIMEOUT)
);

try {
    await Promise.race([approvalPromise, timeoutPromise]);
    // Continue...
} catch (error) {
    console.log("Approval timeout - cancelling");
}
```

### 3. Audit Trail

Log all approvals/rejections:

```typescript
function logApproval(threadId: string, toolCalls: any[], approved: boolean) {
    const log = {
        timestamp: new Date().toISOString(),
        threadId,
        toolCalls,
        approved,
        userId: getCurrentUserId()
    };
    
    // Save to database
    await saveAuditLog(log);
}
```

### 4. Granular Control

Allow users to approve/reject individual tools:

```typescript
const approvals = await Promise.all(
    result.toolCalls.map(call => 
        askUserForToolApproval(call)
    )
);

const approvedCalls = result.toolCalls.filter((_, idx) => approvals[idx]);
```

## Testing HITL

Run the educational tests to see HITL in action:

```bash
pnpm test:agent
```

Look for the verbose output showing the complete workflow:

```
STEP 1: User request
STEP 2: Interruption for approval
STEP 3: Human review
STEP 4: Resume execution
STEP 5: Final response
```

## Common Patterns

### Pattern 1: Auto-approve Safe Tools

```typescript
const SAFE_TOOLS = ['get_weather', 'search_web'];

if (result.needsApproval) {
    const allSafe = result.toolCalls?.every(call => 
        SAFE_TOOLS.includes(call.name)
    );
    
    if (allSafe) {
        // Auto-approve
        return await agent.approveAndContinue(threadId);
    } else {
        // Request approval
        return await showApprovalUI(result);
    }
}
```

### Pattern 2: Role-based Approval

```typescript
const userRole = getCurrentUserRole();

if (result.needsApproval) {
    const requiresAdmin = result.toolCalls?.some(call => 
        ADMIN_ONLY_TOOLS.includes(call.name)
    );
    
    if (requiresAdmin && userRole !== 'admin') {
        return "This action requires admin approval";
    }
    
    // Continue with approval flow...
}
```

### Pattern 3: Batch Approval

```typescript
// Collect multiple requests before asking user
const pendingApprovals = [];

if (result.needsApproval) {
    pendingApprovals.push({
        threadId,
        toolCalls: result.toolCalls,
        timestamp: Date.now()
    });
    
    // Show all pending approvals in one UI
    if (pendingApprovals.length >= 3) {
        await showBatchApprovalUI(pendingApprovals);
    }
}
```

## Security Considerations

1. **Validate tool arguments**: Ensure arguments are within expected ranges
2. **Rate limiting**: Prevent abuse of approval system
3. **Session management**: Tie approvals to authenticated sessions
4. **Encryption**: Encrypt sensitive data in tool calls
5. **Audit logging**: Keep immutable logs of all approvals

## Troubleshooting

### Agent doesn't interrupt

**Problem**: Agent executes tools without asking for approval

**Solution**: Check that `interruptBefore: ["tools"]` is set in agent configuration

### Approval doesn't continue

**Problem**: `approveAndContinue()` doesn't execute tools

**Solution**: Ensure you're using the same `threadId` for both calls

### Lost state

**Problem**: Agent forgets context after approval

**Solution**: Verify `MemorySaver` is configured and threadId is consistent

## Resources

- [LangGraph HITL Documentation](https://langchain-ai.github.io/langgraph/agents/human-in-the-loop/)
- [Agent Test Suite](./agent.test.ts) - See complete examples
- [Agent Implementation](./agent.ts) - See code implementation
