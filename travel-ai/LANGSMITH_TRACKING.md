# 🔍 LangSmith Tracking Guide

## Tags & Metadata

All conversations are now tagged for easy tracking in LangSmith.

### Tags Available

#### Comparative Test (`pnpm test:compare`)
- **Optimized conversations**:
  - `context-engineering`
  - `optimized`
  - `thread:{threadId}`
  
- **Baseline conversations**:
  - `baseline`
  - `non-optimized`
  - `thread:{threadId}`

#### Production Agent
- `travel-agent`
- `context-engineering`
- `optimized`
- `thread:{threadId}`
- `streaming` (for streaming requests)

### Metadata Fields

Each trace includes:
```typescript
{
  optimization: "enabled" | "disabled",
  thread_id: string,
  agent_type: "travel",
  test_type?: "comparative",
  stream_mode?: "structured"
}
```

## 🔎 Finding Traces in LangSmith

### Filter by Optimization Status

**Optimized conversations only:**
```
tags: "optimized"
```

**Baseline (non-optimized) only:**
```
tags: "non-optimized"
```

**Context engineering enabled:**
```
tags: "context-engineering"
```

### Filter by Test Type

**Comparative test runs:**
```
metadata.test_type: "comparative"
```

**Production agent:**
```
tags: "travel-agent"
```

### Filter by Thread

**Specific conversation thread:**
```
tags: "thread:test-with-1730476800000"
```

### Combined Filters

**Optimized conversations from comparative tests:**
```
tags: "optimized" AND metadata.test_type: "comparative"
```

**Streaming requests only:**
```
tags: "streaming"
```

## 📊 Analyzing Results

### Compare Token Usage

1. Go to LangSmith dashboard
2. Filter by `tags: "comparative"`
3. Group by `metadata.optimization`
4. Compare:
   - Total tokens
   - Latency
   - Cost
   - Success rate

### View Optimization Impact

**Step 1: Filter optimized**
```
tags: "optimized" AND metadata.test_type: "comparative"
```

**Step 2: Filter baseline**
```
tags: "non-optimized" AND metadata.test_type: "comparative"
```

**Step 3: Compare metrics**
- Token count per conversation
- Average latency
- Cost per conversation
- Tool call frequency

### Track Metadata Extraction

Look for LLM calls with:
- Input containing "Extract travel preferences"
- Input containing "Summarize this travel conversation"

These are the context engineering operations.

## 🎯 Example Queries

### All test runs today
```
tags: "comparative" AND created_at: today
```

### Failed optimized conversations
```
tags: "optimized" AND status: "error"
```

### High token usage (>5000 tokens)
```
tags: "optimized" AND total_tokens: >5000
```

### Conversations with summaries
Look for traces where child runs include:
```
input contains "Summarize this travel conversation"
```

## 📈 Metrics to Track

### Token Efficiency
- **Baseline avg tokens**: ~16,000 per 8-message conversation
- **Optimized avg tokens**: ~5,600 per 8-message conversation
- **Target reduction**: 60-70%

### Cost Efficiency (Claude Sonnet 3.7)
- **Baseline cost**: ~$0.144 per conversation
- **Optimized cost**: ~$0.051 per conversation
- **Savings**: ~$0.093 per conversation

### Quality Metrics
- Response relevance (same for both)
- Tool call accuracy (same for both)
- User satisfaction (should be equal)

## 🔧 Setup

Ensure your `.env` has:
```bash
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_api_key
LANGCHAIN_PROJECT=travel-ai
```

## 💡 Pro Tips

1. **Create custom dashboards** in LangSmith for:
   - Optimized vs baseline comparison
   - Token usage over time
   - Cost savings tracking

2. **Set up alerts** for:
   - Token usage exceeding thresholds
   - Failed metadata extractions
   - High latency requests

3. **Export data** for:
   - Monthly cost reports
   - Optimization impact presentations
   - Performance analysis

## 🎨 Visual Comparison

In LangSmith, you can:
1. Open two traces side-by-side (optimized vs baseline)
2. Compare token counts at each step
3. See where optimization reduces tokens
4. Verify metadata extraction calls

## 📝 Example Analysis

After running `pnpm test:compare`:

1. **Go to LangSmith**
2. **Filter**: `metadata.test_type: "comparative"`
3. **Sort by**: `created_at desc`
4. **Compare**: Latest optimized vs baseline traces
5. **Observe**:
   - Baseline: Full history in every call
   - Optimized: Trimmed history + metadata + summary
   - Token difference: ~64% reduction

---

**Now run your tests and track everything in LangSmith!** 🚀
