import { Fiber as BaseFiber, SystemController } from '@ferment-ai/runtime-interfaces';

/**
 * Hook types
 */
export type HookType = 'state' | 'effect' | 'unmount' | 'eventCallback' | 'memo' | 'ref';

/**
 * Base hook interface
 */
export interface Hook {
  /**
   * The type of hook
   */
  type: HookType;
}

/**
 * State hook
 */
export interface StateHook<T = any> extends Hook {
  type: 'state';
  state: T;
}

/**
 * Effect hook
 */
export interface EffectHook extends Hook {
  type: 'effect';
  deps: any[] | null;
  cleanup: (() => void) | null;
}

/**
 * Unmount hook
 */
export interface UnmountHook extends Hook {
  type: 'unmount';
  callback: () => void;
}

/**
 * Event callback hook
 */
export interface EventCallbackHook extends Hook {
  type: 'eventCallback';
  eventType: string;
  filter: any;
  subscriptionId: string | null;
  callback: ((event: any) => void) | null;
}

/**
 * Memo hook
 */
export interface MemoHook<T = any> extends Hook {
  type: 'memo';
  deps: any[] | null;
  value: T;
}

/**
 * Ref hook
 */
export interface RefHook<T = any> extends Hook {
  type: 'ref';
  current: T;
}