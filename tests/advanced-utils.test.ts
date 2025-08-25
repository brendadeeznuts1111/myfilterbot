import { 
  test, 
  expect, 
  describe,
  mock,
  spyOn
} from "bun:test";

// Testing with mock implementations
describe("Advanced Mocking", () => {
  test("should create mock functions", () => {
    const mockCallback = mock();
    
    // Use the mock
    [1, 2, 3].forEach(mockCallback);
    
    expect(mockCallback).toHaveBeenCalledTimes(3);
    expect(mockCallback).toHaveBeenNthCalledWith(1, 1, 0, [1, 2, 3]);
    expect(mockCallback).toHaveBeenLastCalledWith(3, 2, [1, 2, 3]);
  });

  test("should mock with implementation", () => {
    const mockFn = mock((name: string) => `Hello, ${name}!`);
    
    expect(mockFn("World")).toBe("Hello, World!");
    expect(mockFn).toHaveBeenCalledWith("World");
  });

  test("should spy on global functions", () => {
    const consoleSpy = spyOn(console, "log");
    
    console.log("Testing console output");
    
    expect(consoleSpy).toHaveBeenCalledWith("Testing console output");
    
    // Restore original implementation
    consoleSpy.mockRestore();
  });
});

// Testing error scenarios
describe("Error Testing", () => {
  test("should test thrown errors", () => {
    const errorFunction = () => {
      throw new Error("Something went wrong");
    };
    
    expect(errorFunction).toThrow();
    expect(errorFunction).toThrow("Something went wrong");
    expect(errorFunction).toThrow(Error);
  });

  test("should test async errors", async () => {
    const asyncError = async () => {
      throw new Error("Async error");
    };
    
    await expect(asyncError()).rejects.toThrow("Async error");
  });
});

// Testing with snapshots (if supported)
describe("Snapshot Testing", () => {
  test("should match inline snapshots", () => {
    const data = {
      user: "john",
      age: 30,
      active: true
    };
    
    expect(data).toEqual({
      user: "john",
      age: 30, 
      active: true
    });
  });
});

// Testing timers and time-based functions
describe("Timer Testing", () => {
  test("should work with setTimeout", (done) => {
    let called = false;
    
    setTimeout(() => {
      called = true;
      expect(called).toBe(true);
      done();
    }, 10);
  });

  test("should handle promises with timeout", async () => {
    const delayed = new Promise((resolve) => {
      setTimeout(() => resolve("delayed result"), 20);
    });
    
    await expect(delayed).resolves.toBe("delayed result");
  }, 1000);
});

// Testing with modules and imports
describe("Module Testing", () => {
  test("should mock module imports", () => {
    // Mock a hypothetical API call
    const mockFetch = mock(async (url: string) => {
      return {
        ok: true,
        json: async () => ({ data: "mocked data" })
      };
    });
    
    // Test the mock
    return mockFetch("/api/data").then(async (response: any) => {
      const data = await response.json();
      expect(data).toEqual({ data: "mocked data" });
      expect(mockFetch).toHaveBeenCalledWith("/api/data");
    });
  });
});

// Testing with custom matchers and utilities
describe("Custom Test Utilities", () => {
  // Helper function for tests
  const isEven = (num: number) => num % 2 === 0;
  
  test("should use custom helper functions", () => {
    expect(isEven(2)).toBe(true);
    expect(isEven(3)).toBe(false);
  });

  test("should work with complex data structures", () => {
    const users = [
      { id: 1, name: "Alice", active: true },
      { id: 2, name: "Bob", active: false },
      { id: 3, name: "Charlie", active: true }
    ];
    
    const activeUsers = users.filter(user => user.active);
    
    expect(activeUsers).toHaveLength(2);
    expect(activeUsers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Alice" }),
        expect.objectContaining({ name: "Charlie" })
      ])
    );
  });
});