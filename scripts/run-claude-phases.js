#!/usr/bin/env node
// scripts/run-claude-phases.js
// Orchestrate sequential Claude Code agent executions for each development phase.

import fs from 'node:fs';
import path from 'node:path';
import { Claude } from '@anthropic-ai/sdk'; // or appropriate Claude client

// Load custom instructions and prompts
const customInstructions = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../toolsets/claude_custom_instructions.jsonc'), 'utf8')
);
const phasePrompts = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../toolsets/claude_phase_prompts.jsonc'), 'utf8')
);

const claude = new Claude({ apiKey: process.env.CLAUDE_API_KEY });

async function runPhase(phaseKey) {
  const phase = phasePrompts.phases[phaseKey];
  console.log(`\n=== Running ${phaseKey}: ${phase.title} ===\n`);
  const messages = [
    { role: 'system', content: JSON.stringify(customInstructions) },
    { role: 'user', content: phase.prompt.join('\n') }
  ];
  const response = await claude.chat({ messages, model: 'claude-3.5-sonnet', temperature: 0 });
  console.log(`Response for ${phaseKey}:`, response.choices[0].message.content);
  // TODO: parse response, update claude.md, commit PoW
}

(async () => {
  for (const phaseKey of Object.keys(phasePrompts.phases)) {
    await runPhase(phaseKey);
    // Optionally, evaluate gate criteria before continuing
  }
  console.log('\nAll phases executed. Review outputs and update claude.md accordingly.');
})();
