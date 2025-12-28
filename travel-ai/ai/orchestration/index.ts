/**
 * Orchestration Patterns Index
 *
 * This module provides two multi-agent orchestration patterns:
 *
 * 1. Supervisor Pattern (Hierarchical)
 *    - Central supervisor coordinates specialized agents
 *    - All responses go through the supervisor
 *    - More control, better for complex coordination
 *    - Higher token usage
 *
 * 2. Swarm Pattern (Decentralized)
 *    - Agents hand off control to each other dynamically
 *    - Active agent responds directly to user
 *    - More efficient, lower token usage
 *    - Requires all agents to know each other
 */

// Supervisor Pattern
export * from "./supervisor";

// Swarm Pattern
export * from "./swarm";
