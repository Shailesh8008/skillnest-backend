const parseFormattedDuration = (durationStr) => {
  if (!durationStr) return 0;
  const parts = durationStr.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
};

const formatCourseDuration = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

// Simulation
const lessons = [
  { duration: "05:30" }, // 330s
  { duration: "10:15" }, // 615s
  { duration: "1:00:00" }, // 3600s
];

let totalDurationSeconds = 0;
lessons.forEach((l) => {
  const s = parseFormattedDuration(l.duration);
  console.log(`Lesson: ${l.duration} -> ${s}s`);
  totalDurationSeconds += s;
});

const formatted = formatCourseDuration(totalDurationSeconds);
console.log(`Total Seconds: ${totalDurationSeconds} (Exp: 4545)`);
console.log(`Formatted: ${formatted} (Exp: 1h 15m)`);
