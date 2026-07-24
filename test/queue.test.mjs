import assert from "node:assert/strict";
import { addSong, moveSongUp, prioritizeSong, removeSong, reorderSong } from "../src/queue.js";

const a = { id: "same-video", queueId: "a", title: "A" };
const b = { id: "same-video", queueId: "b", title: "B" };
const c = { id: "c-video", queueId: "c", title: "C" };

const added = addSong([a], { id: "new", title: "B" });
assert.equal(added[1].id, "new");
assert.equal(typeof added[1].queueId, "string");
assert.deepEqual(addSong([a], b, true), [b, a]);
assert.deepEqual(removeSong([a, b], "a"), [b]);
assert.deepEqual(moveSongUp([a, b, c], "c"), [a, c, b]);
assert.deepEqual(moveSongUp([a, b], "a"), [a, b]);
assert.deepEqual(prioritizeSong([a, b, c], "c"), [c, a, b]);
assert.deepEqual(reorderSong([a, b, c], "c", "a"), [c, a, b]);
assert.deepEqual(reorderSong([a, b, c], "a", "c"), [b, a, c]);
assert.deepEqual(reorderSong([a, b, c], "a", "c", true), [b, c, a]);

console.log("queue ok");
