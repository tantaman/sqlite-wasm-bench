const config = {
  onunhandled: function (ev) {
    console.error("Unhandled worker message:", ev.data);
  },
  onready: dbReady,
  onerror: function (ev) {
    console.error("worker1 error:", ev);
  },
};
const promiser = self.sqlite3Worker1Promiser(config);

async function dbReady() {
  const openResult = await promiser("open", {
    filename: "bench.db",
    vfs: "opfs",
  });
  config.dbId = openResult.dbId;
  console.log(openResult);

  let i = 1;
  const testOut = document.getElementById("test-out");
  for await (const result of benchmark()) {
    const row = document.createElement("tr");
    row.innerHTML = `<tr><td>${i}</td><td>${(result | 0) / 1000}s</td></tr>`;
    testOut.append(row);
    ++i;
    await new Promise((resolve) => setTimeout(resolve));
  }

  // promiser('exec', {
  //   sql: '', resultRows: [],
  // })
  // ev.resultRows
}

const TESTS = [
  test1,
  test2,
  test3,
  test4,
  test5,
  test6,
  test7,
  test8,
  test9,
  test10,
  test11,
  test12,
  test13,
  test14,
  test15,
  test16,
];

async function* benchmark() {
  try {
    // Delete all tables.
    const result = await promiser("exec", {
      sql: `SELECT name FROM sqlite_master WHERE type='table';`,
      resultRows: [],
    });
    for (const table of result.result.resultRows) {
      await promiser("exec", {
        sql: `DROP TABLE ${table};`,
      });
    }

    // Execute the preamble.
    // const preamble = document.getElementById('preamble')['value'];
    // await promiser("exec", { sql: preamble);

    console.log("run tests");
    for (const test of TESTS) {
      const start = performance.now();
      await test();
      yield performance.now() - start;
    }
  } finally {
    await promiser("close", {});
  }
}

async function test1() {
  await promiser("exec", {
    sql: `CREATE TABLE t1(a INTEGER, b INTEGER, c VARCHAR(100));`,
  });
  for (let i = 0; i < 1000; ++i) {
    const n = Math.floor(Math.random() * 100000);
    await promiser("exec", {
      sql: `INSERT INTO t1 VALUES(${i + 1}, ${n}, '${numberName(n)}');`,
    });
  }
}

// Test 2: 25000 INSERTs in a transaction
async function test2() {
  await promiser("exec", {
    sql: `BEGIN;
    CREATE TABLE t2(a INTEGER, b INTEGER, c VARCHAR(100));`,
  });
  for (let i = 0; i < 25000; ++i) {
    const n = Math.floor(Math.random() * 100000);
    await promiser("exec", {
      sql: `
      INSERT INTO t2 VALUES(${i + 1}, ${n}, '${numberName(n)}');
    `,
    });
  }
  await promiser("exec", {
    sql: `
    COMMIT;
  `,
  });
}

// Test 3: 25000 INSERTs into an indexed table
async function test3() {
  await promiser("exec", {
    sql: `
    BEGIN;
    CREATE TABLE t3(a INTEGER, b INTEGER, c VARCHAR(100));
    CREATE INDEX i3 ON t3(c);
  `,
  });
  for (let i = 0; i < 25000; ++i) {
    const n = Math.floor(Math.random() * 100000);
    await promiser("exec", {
      sql: `
      INSERT INTO t3 VALUES(${i + 1}, ${n}, '${numberName(n)}');
    `,
    });
  }
  await promiser("exec", {
    sql: `
    COMMIT;
  `,
  });
}

// Test 4: 100 SELECTs without an index
async function test4() {
  await promiser("exec", {
    sql: `
    BEGIN;
  `,
  });
  for (let i = 0; i < 100; ++i) {
    await promiser("exec", {
      sql: `
      SELECT count(*), avg(b) FROM t2 WHERE b>=${i * 100} AND b<${
        i * 100 + 1000
      };
    `,
    });
  }
  await promiser("exec", {
    sql: `
    COMMIT;
  `,
  });
}

// Test 5: 100 SELECTs on a string comparison
async function test5() {
  await promiser("exec", {
    sql: `
    BEGIN;
  `,
  });
  for (let i = 0; i < 100; ++i) {
    await promiser("exec", {
      sql: `
    SELECT count(*), avg(b) FROM t2 WHERE c LIKE '%${numberName(i + 1)}%';
    `,
    });
  }
  await promiser("exec", {
    sql: `
    COMMIT;
  `,
  });
}

// Test 6: Creating an index
async function test6() {
  await promiser("exec", {
    sql: `
    CREATE INDEX i2a ON t2(a);
    CREATE INDEX i2b ON t2(b);
  `,
  });
}

// Test 7: 5000 SELECTs with an index
async function test7() {
  await promiser("exec", {
    sql: `
    BEGIN;
  `,
  });
  for (let i = 0; i < 5000; ++i) {
    await promiser("exec", {
      sql: `
      SELECT count(*), avg(b) FROM t2 WHERE b>=${i * 100} AND b<${
        i * 100 + 100
      };
    `,
    });
  }
  await promiser("exec", {
    sql: `
    COMMIT;
  `,
  });
}

// Test 8: 1000 UPDATEs without an index
async function test8() {
  await promiser("exec", {
    sql: `
    BEGIN;
  `,
  });
  for (let i = 0; i < 1000; ++i) {
    await promiser("exec", {
      sql: `
      UPDATE t1 SET b=b*2 WHERE a>=${i * 10} AND a<${i * 10 + 10};
    `,
    });
  }
  await promiser("exec", {
    sql: `
    COMMIT;
  `,
  });
}

// Test 9: 25000 UPDATEs with an index
async function test9() {
  await promiser("exec", {
    sql: `
    BEGIN;
  `,
  });
  for (let i = 0; i < 25000; ++i) {
    const n = Math.floor(Math.random() * 100000);
    await promiser("exec", {
      sql: `
      UPDATE t2 SET b=${n} WHERE a=${i + 1};
    `,
    });
  }
  await promiser("exec", {
    sql: `
    COMMIT;
  `,
  });
}

// Test 10: 25000 text UPDATEs with an index
async function test10() {
  await promiser("exec", {
    sql: `
    BEGIN;
  `,
  });
  for (let i = 0; i < 25000; ++i) {
    const n = Math.floor(Math.random() * 100000);
    await promiser("exec", {
      sql: `
      UPDATE t2 SET c='${numberName(n)}' WHERE a=${i + 1};
    `,
    });
  }
  await promiser("exec", {
    sql: `
    COMMIT;
  `,
  });
}

// Test 11: INSERTs from a SELECT
async function test11() {
  await promiser("exec", {
    sql: `
    BEGIN;
    INSERT INTO t1 SELECT b,a,c FROM t2;
    INSERT INTO t2 SELECT b,a,c FROM t1;
    COMMIT;
  `,
  });
}

// Test 12: DELETE without an index
async function test12() {
  await promiser("exec", {
    sql: `
    DELETE FROM t2 WHERE c LIKE '%fifty%';
  `,
  });
}

// Test 13: DELETE with an index
async function test13() {
  await promiser("exec", {
    sql: `
    DELETE FROM t2 WHERE a>10 AND a<20000;
  `,
  });
}

// Test 14: A big INSERT after a big DELETE
async function test14() {
  await promiser("exec", {
    sql: `
    INSERT INTO t2 SELECT * FROM t1;
  `,
  });
}

// Test 15: A big DELETE followed by many small INSERTs
async function test15() {
  await promiser("exec", {
    sql: `
    BEGIN;
    DELETE FROM t1;
  `,
  });
  for (let i = 0; i < 12000; ++i) {
    const n = Math.floor(Math.random() * 100000);
    await promiser("exec", {
      sql: `
      INSERT INTO t1 VALUES(${i + 1}, ${n}, '${numberName(n)}');
    `,
    });
  }
  await promiser("exec", {
    sql: `
    COMMIT;
  `,
  });
}

// Test 16: DROP TABLE
async function test16() {
  await promiser("exec", {
    sql: `
    DROP TABLE t1;
    DROP TABLE t2;
    DROP TABLE t3;
  `,
  });
}

const digits = [
  "",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
];
const names100 = [
  ...digits,
  ...[
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
  ],
  ...digits.map((digit) => `twenty${digit && "-" + digit}`),
  ...digits.map((digit) => `thirty${digit && "-" + digit}`),
  ...digits.map((digit) => `forty${digit && "-" + digit}`),
  ...digits.map((digit) => `fifty${digit && "-" + digit}`),
  ...digits.map((digit) => `sixty${digit && "-" + digit}`),
  ...digits.map((digit) => `seventy${digit && "-" + digit}`),
  ...digits.map((digit) => `eighty${digit && "-" + digit}`),
  ...digits.map((digit) => `ninety${digit && "-" + digit}`),
];
function numberName(n) {
  if (n === 0) return "zero";

  const name = [];
  const d43 = Math.floor(n / 1000);
  if (d43) {
    name.push(names100[d43]);
    name.push("thousand");
    n -= d43 * 1000;
  }

  const d2 = Math.floor(n / 100);
  if (d2) {
    name.push(names100[d2]);
    name.push("hundred");
    n -= d2 * 100;
  }

  const d10 = n;
  if (d10) {
    name.push(names100[d10]);
  }

  return name.join(" ");
}
