import { Injectable } from "@nestjs/common";

@Injectable()
export class AnalyzeGateway {
  sendToClient(_sessionId: string, _eventType: string, _payload: unknown): void {
    // Will be implemented in Task 5
  }
}
