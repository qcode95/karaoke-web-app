import assert from "node:assert/strict";
import { addSong, moveSongUp, prioritizeSong, removeSong } from "../src/queue.js";

const a = { id: "a", title: "A" };
const b = { id: "b", title: "B" };
const c = { id: "c", title: "C" };

assert.deepEqual(addSong([a], b), [a, b]);
assert.deepEqual(addSong([a], b, true), [b, a]);
assert.deepEqual(removeSong([a, b], "a"), [b]);
assert.deepEqual(moveSongUp([a, b, c], "c"), [a, c, b]);
assert.deepEqual(moveSongUp([a, b], "a"), [a, b]);
assert.deepEqual(prioritizeSong([a, b, c], "c"), [c, a, b]);

console.log("queue ok");

