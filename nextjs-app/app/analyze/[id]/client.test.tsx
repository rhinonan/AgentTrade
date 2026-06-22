import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnalysisLiveClient } from "./client";

// Mock next/navigation
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

describe("AnalysisLiveClient", () => {
  let mockEventSource: {
    close: ReturnType<typeof vi.fn>;
    onmessage: ((event: MessageEvent) => void) | null;
    onerror: ((event: Event) => void) | null;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockEventSource = {
      close: vi.fn(),
      onmessage: null,
      onerror: null,
    };

    // Mock EventSource
    vi.stubGlobal(
      "EventSource",
      vi.fn().mockImplementation((url: string) => {
        return mockEventSource;
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the live analysis indicator", () => {
    render(<AnalysisLiveClient sessionId="test-123" />);
    expect(screen.getByText(/实时分析进行中/)).toBeDefined();
  });

  it("creates an EventSource with the correct URL", () => {
    render(<AnalysisLiveClient sessionId="test-123" />);
    expect(EventSource).toHaveBeenCalledWith("/api/analyze/test-123/events");
  });

  it("closes EventSource on unmount", () => {
    const { unmount } = render(<AnalysisLiveClient sessionId="test-123" />);
    unmount();
    expect(mockEventSource.close).toHaveBeenCalled();
  });

  it("triggers router.refresh on EventSource message", () => {
    render(<AnalysisLiveClient sessionId="test-123" />);
    // Simulate a message event
    if (mockEventSource.onmessage) {
      mockEventSource.onmessage(new MessageEvent("message", { data: "{}" }));
    }
    expect(mockRefresh).toHaveBeenCalled();
  });
});
