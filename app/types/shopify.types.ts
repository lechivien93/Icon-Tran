// Shopify Admin GraphQL API Types

export interface ShopifyGraphQLResponse<T = unknown> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
  extensions?: Record<string, unknown>;
}

export interface ShopifyUserError {
  field?: string[];
  message: string;
}

export interface ShopifyAdminClient {
  graphql: <T = unknown>(
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<{
    json: () => Promise<ShopifyGraphQLResponse<T>>;
  }>;
}
