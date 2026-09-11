import type { Platform } from "@/generated/prisma";
import { SyncError } from "@/platforms/security";
import type {
  AdapterPage,
  CommerceAdapter,
  ConnectionHealth,
  NormalizedOrder,
  NormalizedProduct,
  NormalizedRefund
} from "@/platforms/types";

export abstract class UnavailableRealAdapter implements CommerceAdapter {
  abstract readonly platform: Platform;

  protected unavailable(): never {
    // TODO: Implement only after validating the latest official docs and authorization requirements.
    throw new SyncError(
      "REAL_ADAPTER_NOT_CONFIGURED",
      `${this.platform} real adapter requires verified official API documentation and credentials`
    );
  }

  async validateConnection(): Promise<ConnectionHealth> {
    return this.unavailable();
  }

  async refreshAuthorization(): Promise<ConnectionHealth> {
    return this.unavailable();
  }

  async listProducts(): Promise<AdapterPage<NormalizedProduct>> {
    return this.unavailable();
  }

  async listOrders(): Promise<AdapterPage<NormalizedOrder>> {
    return this.unavailable();
  }

  async listRefunds(): Promise<AdapterPage<NormalizedRefund>> {
    return this.unavailable();
  }
}

