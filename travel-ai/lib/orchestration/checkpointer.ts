import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';

let checkpointerPromise: Promise<PostgresSaver> | undefined;

export function getOrchestrationCheckpointer(): Promise<PostgresSaver> {
  if (!checkpointerPromise) {
    checkpointerPromise = (async () => {
      const url = process.env.POSTGRES_URL_NON_POOLING;
      if (!url) throw new Error('POSTGRES_URL_NON_POOLING is required for durable orchestration');
      const saver = PostgresSaver.fromConnString(url);
      await saver.setup();
      return saver;
    })().catch((error) => {
      checkpointerPromise = undefined;
      throw error;
    });
  }
  return checkpointerPromise;
}
