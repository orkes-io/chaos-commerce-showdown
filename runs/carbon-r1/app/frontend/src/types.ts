export interface ChaosReview {
  id: string;
  productId: string;
  author: string;
  badge: string;
  stars: 1 | 2 | 3 | 4 | 5;
  title: string;
  body: string;
  date: string;
  helpfulVotes: number;
  unhelpfulVotes: number;
  dodgeAttemptsBeforeSurrender?: number;
}

export interface ChaosProduct {
  id: string;
  sku: string;
  name: string;
  tagline: string;
  category: string;
  emoji: string;
  accentColor: string;
  price: number;
  compareAtPrice: number;
  priceExcuse: string;
  stockNotice: string;
  cursedWarehouseLocation: string;
  weightDescription: string;
  specs: string[];
  legalDisclaimer: string;
  reviewCount: number;
  averageStars: number;
  reviews: ChaosReview[];
}

export interface CartItem {
  product: ChaosProduct;
  quantity: number;
}

export interface TaskTraceSummary {
  taskId: string;
  taskType: string;
  referenceTaskName: string;
  taskDefName: string;
  status: string;
  iteration: number;
  startTime: number;
  endTime: number;
  durationMs: number;
  outputPreview: Record<string, unknown>;
}

export interface WorkflowExecutionTrace {
  workflowId: string;
  workflowName: string;
  status: string;
  correlationId?: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  conductorExecutionUrl: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  tasks: TaskTraceSummary[];
}

export interface HealthResponse {
  ok: boolean;
  store: string;
  runtimeAiApisUsed: boolean;
  conductor: {
    reachable: boolean;
    serverUrl: string;
    uiUrl: string;
    registeredWorkflows: string[];
    registeredTasks: string[];
    workerDaemonRunning: boolean;
    workerMode: string;
  };
}
