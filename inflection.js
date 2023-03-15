import SQLiteAsyncESMFactory from "./wa-sqlite/dist/wa-sqlite-async.mjs";
import * as SQLite from "./wa-sqlite/src/sqlite-api.js";
import { IDBBatchAtomicVFS } from "./wa-sqlite/src/examples/IDBBatchAtomicVFS.js";

const config = {
  onunhandled: function (ev) {
    console.error("Unhandled worker message:", ev.data);
  },
  onready: officialDBReady,
  onerror: function (ev) {
    console.error("worker1 error:", ev);
  },
};
const promiser = self.sqlite3Worker1Promiser(config);
const limit = 2000;

async function officialDBReady() {
  const openResult = await promiser("open", {
    filename: "inflection.db",
    vfs: "opfs",
  });
  config.dbId = openResult.dbId;

  const SQLiteAsyncModule = await SQLiteAsyncESMFactory();
  const sqlite3 = SQLite.Factory(SQLiteAsyncModule);
  sqlite3.vfs_register(
    new IDBBatchAtomicVFS("idb-batch-atomic-benchmark-relaxed", {
      durability: "relaxed",
    })
  );

  const db = await sqlite3.open_v2(
    "inflection",
    undefined,
    "idb-batch-atomic-benchmark-relaxed"
  );

  let sql = `DROP TABLE IF EXISTS test;`;
  await sqlite3.exec(db, sql);
  await promiser("exec", {
    sql,
  });

  const insertData = await runoffInserts(sqlite3, db, true);
  console.log(insertData);
  const selectData = await runoffSelects(sqlite3, db, true);
  console.log(selectData);
}

async function runoffInserts(sqlite3, db, inTx) {
  let id = 1;
  const dataPoints = [];

  // in a tx
  // outside a tx
  let sql = `CREATE TABLE IF NOT EXISTS test (a primary key, b)`;
  await sqlite3.exec(db, sql);
  await promiser("exec", {
    sql,
  });

  for (let i = 50; i < limit; i += 50) {
    if (inTx) {
      await sqlite3.exec(db, `BEGIN`);
      await promiser("exec", {
        sql: `BEGIN`,
      });
    }

    let point = {
      numRows: i,
      official: 0,
      wa: 0,
    };

    let start = performance.now();
    for (let j = 0; j < i; ++j) {
      await sqlite3.exec(db, `INSERT INTO test VALUES (${id}, ${i})`);
      ++id;
    }
    let end = performance.now();
    point.wa = ((end - start) | 0) / 1000;

    // Nit: we could also just fire without awaiting each...
    start = performance.now();
    const promises = [];
    for (let j = 0; j < i; ++j) {
      promises.push(
        promiser("exec", {
          sql: `INSERT INTO test VALUES (${id}, ${i})`,
        })
      );
      ++id;
    }
    await Promise.all(promises);
    end = performance.now();
    point.official = ((end - start) | 0) / 1000;

    dataPoints.push(point);

    if (inTx) {
      await sqlite3.exec(db, `COMMIT`);
      await promiser("exec", {
        sql: `COMMIT`,
      });
    }
  }

  return dataPoints;
}

async function runoffSelects(sqlite3, db, inTx) {
  let id = 1;
  const dataPoints = [];

  for (let i = 50; i < limit; i += 50) {
    if (inTx) {
      await sqlite3.exec(db, `BEGIN`);
      await promiser("exec", {
        sql: `BEGIN`,
      });
    }

    let point = {
      numRows: i,
      official: 0,
      wa: 0,
    };

    let start = performance.now();
    for (let j = 0; j < i; ++j) {
      await sqlite3.exec(db, `SELECT * FROM test WHERE a = ${id}`);
      ++id;
    }
    let end = performance.now();
    point.wa = ((end - start) | 0) / 1000;

    // Nit: we could also just fire without awaiting each...
    start = performance.now();
    const promises = [];
    for (let j = 0; j < i; ++j) {
      promises.push(
        promiser("exec", {
          sql: `SELECT * FROM test WHERE a = ${id}`,
          resultRows: [],
        })
      );
      ++id;
    }
    const results = await Promise.all(promises);
    end = performance.now();
    point.official = ((end - start) | 0) / 1000;
    // console.log(
    //   results.map((r) => r.result.resultRows.length).reduce((a, b) => a + b, 0)
    // );

    dataPoints.push(point);

    if (inTx) {
      await sqlite3.exec(db, `COMMIT`);
      await promiser("exec", {
        sql: `COMMIT`,
      });
    }
  }

  return dataPoints;
}
