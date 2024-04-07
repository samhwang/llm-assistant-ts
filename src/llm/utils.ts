import { Result } from 'oxide.ts';
import { logger } from '../utils/logger';
import { getClient } from './client';

const DISCORD_MESSAGE_MAX_CHARACTERS = 2000;
const QUESTION_CUT_OFF_LENGTH = 150;
const RESERVED_LENGTH = 50; // for other additional strings. E.g. number `(1/4)`, `Q: `, `A: `, etc.
export const SUPPORTED_MODELS = ['gpt-3.5-turbo', 'gpt-4', 'phi', 'tinydolphin'] as const;
export type SupportedModel = (typeof SUPPORTED_MODELS)[number];

export const SUPPORTED_MODELS_MAP = SUPPORTED_MODELS.map((model) => ({
  name: model,
  value: model,
}));

/**
 * Calls the LLM Model with the specified question and server URL to get the answer.
 */
export async function askQuestion(model: SupportedModel, question: string): Promise<string[]> {
  const client = getClient();
  const op = await Result.safe(
    client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: question }],
    })
  );
  if (op.isErr()) {
    logger.error('[askQuestion]: Error in asking the LLM:', op.unwrapErr());
    return splitResponse(`Error in asking the LLM: ${op.unwrapErr()}`);
  }

  const content = op.unwrap().choices[0].message.content || 'No response from the model. Please try again';
  let chunks = splitResponse(content);
  chunks = addNumber(chunks);
  chunks = addQuestionPrefix(question, chunks);

  return chunks;
}

/**
 * Splits the response from the LLM model into smaller chunks that can fit into
 * a single Discord message. Full sentences are preserved where possible.
 */
function splitResponse(originalAnswer: string): string[] {
  const limit = DISCORD_MESSAGE_MAX_CHARACTERS - RESERVED_LENGTH - QUESTION_CUT_OFF_LENGTH;
  const messages: string[] = [];

  let answer = originalAnswer.trim();
  while (answer.length > limit) {
    const cutoff = answer.substring(0, limit);
    let lastPeriod = cutoff.lastIndexOf('.');
    if (lastPeriod === -1) {
      lastPeriod = cutoff.lastIndexOf(' ');
    }
    const chunk = answer.substring(0, lastPeriod + 1);
    messages.push(chunk);
    answer = answer.substring(lastPeriod + 1);
  }
  messages.push(answer);
  return messages;
}

/**
 * Add the asked question to the beginning of each message
 */
function addQuestionPrefix(question: string, chunks: string[]) {
  const output = chunks.map((chunk) => `Q: ${question.substring(0, QUESTION_CUT_OFF_LENGTH)}\nA: ${chunk}`);
  return output;
}

/**
 * Add the number of the chunk to the beginning of each message
 * E.g. `(1/4)`, `(2/4)`, etc.
 * D nothing if there's only one chunk.
 */
function addNumber(chunks: string[]) {
  if (chunks.length === 1) {
    return chunks;
  }

  const output = chunks.map((chunk, index) => `(${index + 1}/${chunks.length}) ${chunk}`);
  return output;
}
