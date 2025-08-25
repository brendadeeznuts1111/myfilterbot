import { Database } from "bun:sqlite";

const db = new Database("logs.sqlite");

const query = `
  SELECT category, COUNT(*) as error_count
  FROM logs
  WHERE ts > datetime('now', '-24 hours')
  GROUP BY 1;
`;

const result = db.query(query).all();

console.log("Error Budget Report (Last 24 Hours):");
if (result.length === 0) {
  console.log("No errors recorded.");
} else {
  console.table(result);
}

db.close();
