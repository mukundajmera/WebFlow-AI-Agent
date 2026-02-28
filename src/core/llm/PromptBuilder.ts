/**
 * PromptBuilder — Utility class for constructing structured LLM prompts.
 *
 * Provides static helpers for system prompts, few-shot examples,
 * chain-of-thought reasoning, and JSON-formatted instructions.
 */

// ---------------------------------------------------------------------------
// PromptBuilder
// ---------------------------------------------------------------------------

/**
 * Collection of static methods for building well-structured prompts
 * that guide the LLM toward consistent, high-quality output.
 */
export class PromptBuilder {
  /**
   * Build a system prompt that establishes the AI's role and optional context.
   *
   * @param role  - High-level description of the AI's role (e.g. "web designer").
   * @param context - Optional additional context to include in the prompt.
   */
  static buildSystemPrompt(role: string, context?: string): string {
    const base = `You are an expert ${role}. Follow instructions precisely and provide clear, actionable responses.`;
    if (!context) return base;
    return `${base}\n\nContext:\n${context}`;
  }

  /**
   * Build a few-shot prompt with input/output examples preceding a task.
   *
   * @param task     - The task description for the LLM to perform.
   * @param examples - Array of input/output pairs demonstrating desired behaviour.
   */
  static buildFewShotPrompt(
    task: string,
    examples: Array<{ input: string; output: string }>,
  ): string {
    const header = `Task: ${task}\n\nHere are some examples:\n`;
    const body = examples
      .map(
        (ex, i) =>
          `Example ${i + 1}:\nInput: ${ex.input}\nOutput: ${ex.output}`,
      )
      .join("\n\n");

    return `${header}${body}\n\nNow complete the following task using the same format:`;
  }

  /**
   * Build a chain-of-thought prompt that encourages step-by-step reasoning.
   *
   * @param question - The question or problem to reason about.
   */
  static buildChainOfThoughtPrompt(question: string): string {
    return (
      `${question}\n\n` +
      `Let's think through this step by step:\n` +
      `1. First, identify the key components of this problem.\n` +
      `2. Then, analyze each component carefully.\n` +
      `3. Finally, synthesize your analysis into a clear answer.\n\n` +
      `Please show your reasoning before giving the final answer.`
    );
  }

  /**
   * Build a prompt that instructs the LLM to return a JSON object
   * conforming to the provided schema.
   *
   * @param schema      - JSON-serializable object describing the expected shape.
   * @param instruction - What the LLM should produce.
   */
  static formatJSONPrompt(schema: object, instruction: string): string {
    const schemaStr = JSON.stringify(schema, null, 2);
    return (
      `${instruction}\n\n` +
      `Respond ONLY with valid JSON matching this schema:\n` +
      `\`\`\`json\n${schemaStr}\n\`\`\`\n\n` +
      `IMPORTANT: Return raw JSON only. No markdown formatting, no explanations, no code fences in your response.`
    );
  }
}
