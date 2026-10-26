import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { LIMITS, MODEL, checkPrompt } from './service.mjs';
export const INFERENCE_CONFIG = Object.freeze({ region: 'ap-southeast-2', maxAttempts: 1 });
export function bedrockProvider(client = new BedrockRuntimeClient(INFERENCE_CONFIG)) {
  return {
    async invoke(prompt) {
      checkPrompt(prompt);
      return client.send(new ConverseCommand({ modelId: MODEL, ...prompt, inferenceConfig: { maxTokens: LIMITS.output, temperature: 0 } }), { abortSignal: AbortSignal.timeout(80000) });
    }
  };
}
