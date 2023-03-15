import { MemoryAsyncVFS } from "../src/examples/MemoryAsyncVFS.js";
import { configureTests, TEST } from "./VFSTests.js";

const SKIP = [
  TEST.BATCH_ATOMIC,
  TEST.CONTENTION
];

class TestVFS extends MemoryAsyncVFS {
  constructor() {
    super();
    TestVFS.instances.push(this);
  }

  handleAsync(f) {
    return f();
  }

  static instances = [];

  static async clear() {
    // Close all IndexedDB open databases.
    for (const vfs of TestVFS.instances) {
      await vfs.close();
    }
    TestVFS.instances = [];
  }
}

describe('MemoryAsyncVFS', function() {
  configureTests(() => new TestVFS(), TestVFS.clear, SKIP);
});
