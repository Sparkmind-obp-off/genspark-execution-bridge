import assert from "node:assert/strict";
import { getProofProject } from "../src/index.ts";

const expected = {
  project_id: "proof-project",
  name: "Genspark Execution Bridge Proof",
  status: "ok",
  proof: true
} as const;

assert.deepEqual(getProofProject("proof-project"), expected);
assert.equal(getProofProject("wrong-project"), null);

console.log("P0 core proof: PASS");
console.log(JSON.stringify(expected));
