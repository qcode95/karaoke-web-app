export function addSong(queue, song, priority = false) {
  const queuedSong = { ...song, queueId: song.queueId || crypto.randomUUID() };
  return priority ? [queuedSong, ...queue] : [...queue, queuedSong];
}

export function removeSong(queue, queueId) {
  return queue.filter((song) => song.queueId !== queueId);
}

export function moveSongUp(queue, queueId) {
  const index = queue.findIndex((song) => song.queueId === queueId);
  if (index <= 0) return queue;
  const next = [...queue];
  [next[index - 1], next[index]] = [next[index], next[index - 1]];
  return next;
}

export function prioritizeSong(queue, queueId) {
  const song = queue.find((item) => item.queueId === queueId);
  return song ? [song, ...removeSong(queue, queueId)] : queue;
}

export function reorderSong(queue, fromQueueId, toQueueId, after = false) {
  const fromIndex = queue.findIndex((song) => song.queueId === fromQueueId);
  const toIndex = queue.findIndex((song) => song.queueId === toQueueId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return queue;
  const next = [...queue];
  const [song] = next.splice(fromIndex, 1);
  const targetIndex = next.findIndex((item) => item.queueId === toQueueId);
  next.splice(targetIndex + (after ? 1 : 0), 0, song);
  return next;
}
