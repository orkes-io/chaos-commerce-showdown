export interface ProductReview {
  id: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  tagline: string;
  category: string;
  price: number;
  wasPrice: number;
  savingsBadge: string;
  badge: string;
  stockText: string;
  sku: string;
  weightBarleycorns: number;
  emoji: string;
  accentColor: string;
  description: string;
  specs: string[];
  reviews: ProductReview[];
  reviewCount: number;
  averageRating: number;
}

export interface ShippingOption {
  id: string;
  label: string;
  price: number;
  hiddenFeeNote: string;
  eta: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface ConductorTaskSummary {
  taskId: string;
  taskType: string;
  referenceTaskName: string;
  status: string;
  iteration: number;
  startTime?: number;
  endTime?: number;
  durationMs: number | null;
  outputData: Record<string, unknown>;
}

export interface WorkflowExecution {
  workflowId: string;
  workflowName: string;
  workflowVersion?: number;
  status: string;
  reasonForIncompletion?: string | null;
  startTime?: number;
  endTime?: number;
  durationMs?: number | null;
  correlationId?: string | null;
  input?: Record<string, unknown>;
  output: Record<string, unknown>;
  tasks: ConductorTaskSummary[];
  conductorUiUrl: string;
}

export interface HealthResponse {
  service: string;
  status: string;
  aiApisUsedAtRuntime: boolean;
  conductor: {
    reachable: boolean;
    conductorApiUrl: string;
    conductorUiUrl: string;
    registeredWorkflows?: {
      chaos_checkout: boolean;
      chaos_return: boolean;
    };
    error?: string;
  };
  timestamp: string;
}

export interface PromoPreview {
  valid: boolean;
  code: string;
  delta: number;
  message: string;
}
