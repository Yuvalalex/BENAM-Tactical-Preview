/**
 * State Repository — Persistence layer for the full application state.
 *
 * Bridges the legacy `save()` / `load()` pattern with the new typed
 * StorageAdapter. During migration, this reads/writes the same localStorage
 * key that legacy app.js uses ('benam_state' → 'state' with prefix).
 */

import type { StorageAdapter } from '../storage/storage-adapter';
import type { AppState, Casualty, ForceMember, TimelineEvent, CommsData, SupplyInventory } from '../../core/types';
import { type Result, Ok, Err, AppError, ErrorCode, ErrorSeverity } from '../../core/errors';

const STATE_KEY = 'state';
const LEGACY_STATE_KEYS = ['benam_s', 'benam_s_training'] as const;
const LEGACY_STATE_KEY_BY_MODE = {
  training: LEGACY_STATE_KEYS[1],
  operational: LEGACY_STATE_KEYS[0],
} as const;

/**
 * Partial state shape for legacy compatibility.
 * Legacy code stores a flat object without strict typing.
 */
interface LegacyStateShape {
  force?: unknown[];
  casualties?: unknown[];
  timeline?: unknown[];
  comms?: Record<string, unknown>;
  supplies?: Record<string, number>;
  view?: string;
  role?: string | null;
  opMode?: string | null;
  missionType?: string | null;
  missionStart?: number | null;
  missionActive?: boolean;
  fireMode?: boolean;
  commsLog?: unknown[];
  lzStatus?: Record<string, unknown>;
  medicAssignment?: Record<string, string>;
  meshReceived?: unknown[];
  [key: string]: unknown;
}

export class StateRepository {
  constructor(private readonly storage: StorageAdapter) {}

  /**
   * Save the full application state.
   */
  save(state: AppState): Result<void> {
    const result = this.storage.set(STATE_KEY, state);
    if (!result.ok) return result;

    try {
      const legacyKey = state.opMode === 'training'
        ? LEGACY_STATE_KEY_BY_MODE.training
        : LEGACY_STATE_KEY_BY_MODE.operational;
      localStorage.setItem(legacyKey, JSON.stringify(state));
    } catch (err) {
      console.warn('[StateRepository] Legacy mirror write failed', err);
    }

    return Ok(undefined);
  }

  /**
   * Load the full application state.
   * Returns null if no saved state exists.
   */
  load(): Result<LegacyStateShape | null> {
    const result = this.storage.get<LegacyStateShape>(STATE_KEY);
    if (!result.ok) return result;
    let value = result.value;

    if (value === null) {
      value = this.loadLegacySnapshot();
      if (value === null) return Ok(null);
    }

    // Basic structural validation
    if (typeof value !== 'object') {
      return Err(
        new AppError(ErrorCode.STORAGE_CORRUPT, 'Saved state is not an object', {
          severity: ErrorSeverity.HIGH,
        }),
      );
    }

    return Ok(value);
  }

  /**
   * Check if a saved state exists.
   */
  exists(): boolean {
    return this.storage.has(STATE_KEY);
  }

  /**
   * Clear the saved state.
   */
  clear(): Result<void> {
    return this.storage.remove(STATE_KEY);
  }

  /**
   * Save only the casualties portion (for incremental saves).
   */
  saveCasualties(casualties: readonly Casualty[]): Result<void> {
    return this.storage.set('casualties', casualties);
  }

  /**
   * Save a backup of the current state (for crash recovery).
   */
  saveBackup(state: AppState): Result<void> {
    return this.storage.set('state_backup', {
      ...state,
      _backupAt: Date.now(),
    });
  }

  /**
   * Load backup state.
   */
  loadBackup(): Result<LegacyStateShape | null> {
    return this.storage.get<LegacyStateShape>('state_backup');
  }

  private loadLegacySnapshot(): LegacyStateShape | null {
    for (const key of LEGACY_STATE_KEYS) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        return JSON.parse(raw) as LegacyStateShape;
      } catch {
        continue;
      }
    }
    return null;
  }
}
