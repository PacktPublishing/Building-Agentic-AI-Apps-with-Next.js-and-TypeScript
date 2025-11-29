# 🧪 Test Scripts

## Available Tests

### 1. `test:context` - Single Conversation Test
Tests context engineering on a single conversation.

```bash
pnpm test:context
```

**What it does:**
- Runs one conversation with context engineering enabled
- Shows stats after each message
- Displays extracted metadata and summaries
- Calculates token savings

**Use when:**
- You want to verify context engineering is working
- You need to debug metadata extraction
- You want to see detailed step-by-step progress

---

### 2. `test:compare` - Comparative Test ⭐ RECOMMENDED
Runs two parallel conversations side-by-side for direct comparison.

```bash
pnpm test:compare
```

**What it does:**
- Runs TWO identical conversations in parallel:
  - 🔴 WITHOUT context engineering (baseline)
  - 🟢 WITH context engineering (optimized)
- Shows real-time token comparison
- Displays beautiful final results with:
  - Token savings
  - Cost savings (based on Claude pricing)
  - Extracted metadata
  - Generated summary
  - Projected savings at scale

**Use when:**
- You want to demonstrate the optimization impact
- You need to show ROI to stakeholders
- You want to compare performance metrics

---

## Expected Output

### `test:compare` Output Example

```
═══════════════════════════════════════════════════════════════════════════════
🔬 CONTEXT ENGINEERING OPTIMIZATION - COMPARATIVE TEST
═══════════════════════════════════════════════════════════════════════════════

Running two parallel conversations:
  🔴 WITHOUT optimization (baseline)
  🟢 WITH context engineering (optimized)

────────────────────────────────────────────────────────────────────────────────

⏳ Initializing agents...

📨 Message 1/8: "Hello, I want to go to Barcelona with my wife for a roman..."
   🔴 Without: 412 tokens
   🟢 With:    412 tokens
   💰 Saved:   0 tokens (0.0%)

📨 Message 2/8: "What's the budget for flights?..."
   🔴 Without: 559 tokens
   🟢 With:    559 tokens
   💰 Saved:   0 tokens (0.0%)

📨 Message 3/8: "Around 500 euros per person..."
   🔴 Without: 682 tokens
   🟢 With:    650 tokens
   💰 Saved:   32 tokens (4.7%)

[... more messages ...]

📨 Message 8/8: "Can you find flights from Paris?..."
   🔴 Without: 5617 tokens
   🟢 With:    1850 tokens
   💰 Saved:   3767 tokens (67.1%)


═══════════════════════════════════════════════════════════════════════════════
📊 FINAL RESULTS
═══════════════════════════════════════════════════════════════════════════════

┌─ 🔴 WITHOUT Context Engineering (Baseline)
│
│  Total Messages:     36
│  Estimated Tokens:   5,617
│  Summary Generated:  ❌ No
│  Metadata Extracted: ❌ No
└─

┌─ 🟢 WITH Context Engineering (Optimized)
│
│  Total Messages:     36
│  Estimated Tokens:   1,850
│  Summary Generated:  ✅ Yes
│  Metadata Extracted: ✅ Yes
└─

═══════════════════════════════════════════════════════════════════════════════
💰 OPTIMIZATION IMPACT
═══════════════════════════════════════════════════════════════════════════════

  Baseline (without):     5,617 tokens
  Optimized (with):       1,850 tokens
  ─────────────────────────────────────
  💵 Total Savings:       3,767 tokens
  📉 Reduction:           67.1%

═══════════════════════════════════════════════════════════════════════════════
💵 ESTIMATED COST IMPACT (based on Claude 3.5 Sonnet pricing)
═══════════════════════════════════════════════════════════════════════════════

  Without optimization:   $0.0169
  With optimization:      $0.0056
  ─────────────────────────────────────
  💰 Cost Savings:        $0.0113
  📊 For 1,000 convs:     $11.30
  📊 For 10,000 convs:    $113.00

═══════════════════════════════════════════════════════════════════════════════
📋 GENERATED SUMMARY
═══════════════════════════════════════════════════════════════════════════════

User planning romantic getaway to Barcelona for 2 people next week. Mid-range 
budget around 500€ per person for flights from Paris. Looking for 4-star hotels 
in city center and cultural activities with good restaurants.

═══════════════════════════════════════════════════════════════════════════════
🏷️  EXTRACTED METADATA
═══════════════════════════════════════════════════════════════════════════════

  User Preferences:
    • budget: mid-range
    • travelStyle: romantic
    • destinations: Barcelona

  Current Context:
    • destination: Barcelona
    • dates: next week
    • travelers: 2
    • purpose: romantic getaway

═══════════════════════════════════════════════════════════════════════════════
✅ CONCLUSION
═══════════════════════════════════════════════════════════════════════════════

Context Engineering delivers a 67.1% token reduction while maintaining
conversation quality through intelligent metadata extraction and summarization.

Key Benefits:
  ✅ Reduced API costs
  ✅ Lower latency
  ✅ Better context management
  ✅ Scalable for long conversations

═══════════════════════════════════════════════════════════════════════════════
```

---

## Quick Start

**Best way to see the optimization in action:**

```bash
pnpm test:compare
```

This will run both conversations in parallel and show you the exact difference!

---

## Troubleshooting

### No metadata extracted
- Check that `enableMetadataExtraction: true` in agent config
- Verify API key is valid
- Look for `[Agent] Extracting user metadata...` in logs

### No summary generated
- Check that `enableSummarization: true` in agent config
- Verify conversation has at least 6 messages
- Look for `[Agent] Creating conversation summary...` in logs

### Tests fail
- Ensure `.env` file has valid `ANTHROPIC_API_KEY`
- Check that Amadeus MCP server is running
- Verify all dependencies are installed: `pnpm install`

---

## Performance Tips

- Run `test:compare` to get accurate metrics
- Tests make real API calls, so they consume tokens
- Each test run costs approximately $0.02-0.05
- Results may vary based on conversation complexity

---

**Ready to see the magic? Run `pnpm test:compare` now!** ✨
