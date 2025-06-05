import { run } from "../src/main";
import * as core from "@actions/core";
import * as fs from "fs";
import { Logger } from "../src/logger";

// Mock out server & runner:
import * as serverModule from "../src/server";
import * as runnerModule from "../src/runner";

// --------------
// Jest setup:
// --------------

jest.mock("@actions/core");
jest.mock("fs");
jest.mock("../src/server");
jest.mock("../src/runner");

// Helper: advance timers if needed
beforeAll(() => {
  jest.useFakeTimers();
});

afterAll(() => {
  jest.useRealTimers();
});

// Reset mocks before each test
beforeEach(() => {
  jest.resetAllMocks();
  // Ensure process.env does not interfere
  delete process.env.GITHUB_RUN_ID;
});

describe("main.run()", () => {
  const fakeWss = { some: "dummy" }; // returned by startServer()

  test("A) No packet-list provided: server starts, runTest succeeds, outputs set", async () => {
    // 1) Mock core.getInput so that:
    //    port = "3000"
    //    testFile = "test-file.js"
    //    runner = "node"
    //    packet-list = ""   (empty)
    (core.getInput as jest.Mock).mockImplementation((name: string) => {
      switch (name) {
        case "port":
          return "3000";
        case "testFile":
          return "test-file.js";
        case "runner":
          return "node";
        case "packet-list":
          return "";
        default:
          return "";
      }
    });

    // 2) Mock serverModule.startServer to return fakeWss
    (serverModule.startServer as jest.Mock).mockReturnValue(fakeWss);
    //    And stub stopServer to be a no-op
    (serverModule.stopServer as jest.Mock).mockImplementation(() => {});

    // 3) Mock runnerModule.runTest to resolve success = true, durationMs = 123
    (runnerModule.runTest as jest.Mock).mockResolvedValue({
      success: true,
      durationMs: 123,
    });

    // 4) We don’t need to stub fs here, because packet-list is "" so fs methods won’t be called.

    // 5) Now invoke run()
    await run();

    // 6) Expect startServer() was called with port=3000, a Logger, packetList = null
    expect(serverModule.startServer).toHaveBeenCalledTimes(1);
    const [portArg, loggerArg, packetListArg] = (serverModule
      .startServer as jest.Mock).mock.calls[0];
    expect(portArg).toBe(3000);
    // loggerArg should be an instance of Logger
    expect(loggerArg).toBeInstanceOf(Logger);
    // packetListArg should be null
    expect(packetListArg).toBeNull();

    // 7) Expect core.setOutput("log", <logger.path>) was called
    //    The first argument is 'log', second is some string (logger path)
    expect(core.setOutput).toHaveBeenCalledWith(
      "log",
      expect.any(String)
    );

    // 8) Expect runner.runTest was called with runner="node", testFile="test-file.js", loggerArg
    expect(runnerModule.runTest).toHaveBeenCalledWith(
      "node",
      "test-file.js",
      loggerArg
    );

    // 9) Expect stopServer() was invoked with (fakeWss, loggerArg)
    expect(serverModule.stopServer).toHaveBeenCalledWith(
      fakeWss,
      loggerArg
    );

    // 10) Expect core.setOutput("success", "true") and core.setOutput("time", "123")
    expect(core.setOutput).toHaveBeenCalledWith("success", "true");
    expect(core.setOutput).toHaveBeenCalledWith("time", "123");

    // 11) Because success = true, core.setFailed should not have been called
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  test("B) packet‑list provided but file does NOT exist → setFailed called, early return", async () => {
    // 1) Inputs:
    (core.getInput as jest.Mock).mockImplementation((name: string) => {
      switch (name) {
        case "port":
          return "4000";
        case "testFile":
          return "ignore.js";
        case "runner":
          return "node";
        case "packet-list":
          return "nonexistent.json";
        default:
          return "";
      }
    });

    // 2) Mock fs.existsSync to return false for "nonexistent.json"
    (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
      if (path === "nonexistent.json") return false;
      return true;
    });

    // 3) Even if startServer/runTest exist, they should NOT be called
    //    Clear any previous mock implementations
    (serverModule.startServer as jest.Mock).mockClear();
    (runnerModule.runTest as jest.Mock).mockClear();

    // 4) Invoke run()
    await run();

    // 5) Because the file did not exist, logger.error and core.setFailed should have been called with that message
    //    The exact string is: `Packet list file not found: nonexistent.json`
    expect(core.setFailed).toHaveBeenCalledWith(
      "Packet list file not found: nonexistent.json"
    );

    // 6) Ensure startServer/runTest/stopServer were never called
    expect(serverModule.startServer).not.toHaveBeenCalled();
    expect(runnerModule.runTest).not.toHaveBeenCalled();
    expect(serverModule.stopServer).not.toHaveBeenCalled();
  });

  test("C) packet‑list provided but invalid JSON → setFailed called with parse error", async () => {
    // 1) Inputs:
    (core.getInput as jest.Mock).mockImplementation((name: string) => {
      switch (name) {
        case "port":
          return "5000";
        case "testFile":
          return "ignore2.js";
        case "runner":
          return "node";
        case "packet-list":
          return "bad.json";
        default:
          return "";
      }
    });

    // 2) Mock fs.existsSync to return true for "bad.json"
    (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
      if (path === "bad.json") return true;
      return false;
    });

    // 3) Mock fs.readFileSync to return invalid JSON (e.g. "{ invalid... ")
    (fs.readFileSync as jest.Mock).mockImplementation((path: string, _enc: string) => {
      if (path === "bad.json") return "{ invalid JSON ";
      return "";
    });

    // 4) Clear startServer/runTest
    (serverModule.startServer as jest.Mock).mockClear();
    (runnerModule.runTest as jest.Mock).mockClear();

    // 5) Invoke run()
    await run();

    // 6) Because JSON.parse will throw, main.run should catch it, call logger.error, then core.setFailed with a message that contains "Error parsing packet list JSON"
    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringMatching(/^Error parsing packet list JSON:/)
    );

    // 7) Ensure startServer/runTest/stopServer were never called, since we returned early
    expect(serverModule.startServer).not.toHaveBeenCalled();
    expect(runnerModule.runTest).not.toHaveBeenCalled();
    expect(serverModule.stopServer).not.toHaveBeenCalled();
  });
});
