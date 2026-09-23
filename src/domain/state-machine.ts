export const taskStates = [
  "created",
  "validated",
  "authorized",
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
  "unknown"
] as const;

export type TaskState = (typeof taskStates)[number];
export type TerminalTaskState = Extract<TaskState, "succeeded" | "failed" | "cancelled">;

const transitions: Readonly<Record<TaskState, readonly TaskState[]>> = {
  created: ["validated", "cancelled"],
  validated: ["authorized", "cancelled"],
  authorized: ["queued", "cancelled"],
  queued: ["running", "cancelled"],
  running: ["succeeded", "failed", "cancelled", "unknown"],
  succeeded: [],
  failed: [],
  cancelled: [],
  // Only a later independently verified cleanup reconciliation may close UNKNOWN.
  // The provider is never resubmitted on this transition.
  unknown: ["succeeded"]
};

export class InvalidTaskTransitionError extends Error {
  readonly code = "INVALID_TASK_TRANSITION";

  constructor(readonly from: TaskState, readonly to: TaskState) {
    super(`Invalid task transition: ${from} -> ${to}`);
    this.name = "InvalidTaskTransitionError";
  }
}

export function canTransition(from: TaskState, to: TaskState): boolean {
  return transitions[from].includes(to);
}

export class TaskStateMachine {
  constructor(private current: TaskState = "created") {}

  get state(): TaskState {
    return this.current;
  }

  transition(to: TaskState): TaskState {
    if (!canTransition(this.current, to)) {
      throw new InvalidTaskTransitionError(this.current, to);
    }
    this.current = to;
    return this.current;
  }
}
