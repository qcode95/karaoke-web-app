export function addSong(queue, song, priority = false) {
  return priority ? [song, ...queue] : [...queue, song];
}

export function removeSong(queue, id) {
  return queue.filter((song) => song.id !== id);
}

export function moveSongUp(queue, id) {
  const index = queue.findIndex((song) => song.id === id);
  if (index <= 0) return queue;
  const next = [...queue];
  [next[index - 1], next[index]] = [next[index], next[index - 1]];
  return next;
}

export function prioritizeSong(queue, id) {
  const song = queue.find((item) => item.id === id);
  return song ? [song, ...removeSong(queue, id)] : queue;
}

