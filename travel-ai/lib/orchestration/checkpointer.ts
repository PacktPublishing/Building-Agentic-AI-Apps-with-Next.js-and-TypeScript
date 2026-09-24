import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { Pool } from 'pg';
import { verifiedPostgresConnection } from '../config/postgres-connection';

let checkpointerPromise: Promise<PostgresSaver> | undefined;

export function getOrchestrationCheckpointer(): Promise<PostgresSaver> {
  if (!checkpointerPromise) {
    checkpointerPromise = (async () => {
      const pool = new Pool(verifiedPostgresConnection(process.env.POSTGRES_URL_NON_POOLING, process.env.POSTGRES_CA_CERT));
      try {
        const saver = new PostgresSaver(pool);
        await saver.setup();
        return saver;
      } catch (error) {
        await pool.end();
        throw error;
      }
    })().catch((error) => {
      checkpointerPromise = undefined;
      throw error;
    });
  }
  return checkpointerPromise;
}
