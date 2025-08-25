import { 
  test, 
  expect, 
  describe, 
  beforeAll, 
  beforeEach, 
  afterAll, 
  afterEach,
  mock,
  spyOn
} from "bun:test";

// Test grouping with describe
describe("Test Utils Demo", () => {
  let setupValue: string;

  beforeAll(() => {
    console.log("🏗️  beforeAll: Setting up test suite");
    setupValue = "initialized";
  });

  afterAll(() => {
    console.log("🧹 afterAll: Cleaning up test suite");
  });

  beforeEach(() => {
    console.log("🔄 beforeEach: Preparing individual test");
  });

  afterEach(() => {
    console.log("✅ afterEach: Cleaning up individual test");
  });

  test("should have setup value from beforeAll", () => {
    expect(setupValue).toBe("initialized");
  });

  test("should work with mocking", () => {
    const mockFn = mock((x: number) => x * 2);
    
    const result = mockFn(5);
    
    expect(result).toBe(10);
    expect(mockFn).toHaveBeenCalledWith(5);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  describe("Nested describe blocks", () => {
    test("work perfectly", () => {
      expect(true).toBe(true);
    });
  });
});

// Spying on functions
describe("Function Spying", () => {
  const calculator = {
    add: (a: number, b: number) => a + b,
    multiply: (a: number, b: number) => a * b
  };

  test("should spy on object methods", () => {
    const addSpy = spyOn(calculator, "add");
    
    const result = calculator.add(2, 3);
    
    expect(result).toBe(5);
    expect(addSpy).toHaveBeenCalledWith(2, 3);
    expect(addSpy).toHaveBeenCalledTimes(1);
  });

  test("should mock return values", () => {
    const multiplySpy = spyOn(calculator, "multiply").mockReturnValue(100);
    
    const result = calculator.multiply(2, 3);
    
    expect(result).toBe(100); // Mocked value, not 6
    expect(multiplySpy).toHaveBeenCalledWith(2, 3);
  });
});

// Testing async functions
describe("Async Testing", () => {
  const asyncFunction = async (delay: number) => {
    await new Promise(resolve => setTimeout(resolve, delay));
    return "completed";
  };

  test("should handle async functions", async () => {
    const result = await asyncFunction(10);
    expect(result).toBe("completed");
  });

  test("should test promises", () => {
    return expect(asyncFunction(10)).resolves.toBe("completed");
  });

  test("should test promise rejections", () => {
    const rejectingFunction = () => Promise.reject(new Error("Failed"));
    return expect(rejectingFunction()).rejects.toThrow("Failed");
  });
});

// Testing with custom matchers
describe("Custom Expectations", () => {
  test("should use various matchers", () => {
    expect("hello world").toContain("world");
    expect([1, 2, 3]).toHaveLength(3);
    expect({ name: "test" }).toHaveProperty("name");
    expect(Math.PI).toBeCloseTo(3.14, 2);
    expect(() => { throw new Error("test"); }).toThrow("test");
  });

  test("should work with arrays and objects", () => {
    expect([1, 2, 3]).toEqual(expect.arrayContaining([2, 3]));
    expect({ a: 1, b: 2 }).toEqual(expect.objectContaining({ a: 1 }));
    expect("test").toEqual(expect.stringContaining("es"));
  });
});