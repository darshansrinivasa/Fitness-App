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
export {
  WATER_GOALS_TABLE,
  DEFAULT_DAILY_WATER_GOAL_ML,
  todayDateString,
  createWaterGoal,
  updateWaterGoal,
  enqueueWaterGoal,
  type WaterGoalWriteInput,
  type EnqueueWaterGoalChange,
} from './waterGoals';
export type { WaterLog } from '../schemas/waterLog';
export type { WaterGoal } from '../schemas/waterGoal';
