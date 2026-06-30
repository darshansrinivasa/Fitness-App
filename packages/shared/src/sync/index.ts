export { resolveConflict, shouldApplyRemote, nextLocalVersion } from './conflict';
export { SyncOrchestrator } from './orchestrator';
export {
  WATER_LOGS_TABLE,
  PILOT_SYNC_TABLES,
  createWaterLog,
  updateWaterLog,
  deleteWaterLog,
  enqueueWaterLog,
  type WaterLogWriteInput,
  type EnqueueWaterLogChange,
} from './waterLogs';
