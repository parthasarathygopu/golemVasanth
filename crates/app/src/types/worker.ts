export interface Worker {
  accountId: string;
  args: string[];
  componentSize: number;
  componentVersion: number;
  createdAt: string;
  env: { [key: string]: string };
  ownedResources: [];
  pendingInvocationCount: number;
  retryCount: number;
  status: string;
  totalLinearMemorySize: number;
  workerId: {
    componentId: string;
    workerName: string;
  };
}

export interface WorkerStatus {
  Idle?: number;
  Running?: number;
  Suspended?: number;
  Failed?: number;
}

export interface Invocation {
  timestamp: string;
  function: string;
}

export interface Terminal {
  timestamp: string;
  message: string;
  bytes?: [];
}

export interface WsMessage {
  InvocationStart: Invocation;
  StdOut: Terminal;
}
