const parseISO8601Duration = (duration) => {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  return hours * 3600 + minutes * 60 + seconds;
};

const formatSeconds = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
};

// Test cases
const tests = [
  { input: "PT1H15M33S", expectedSeconds: 4533, expectedFormat: "1:15:33" },
  { input: "PT2M11S", expectedSeconds: 131, expectedFormat: "02:11" },
  { input: "PT45S", expectedSeconds: 45, expectedFormat: "00:45" },
  { input: "PT1H", expectedSeconds: 3600, expectedFormat: "1:00:00" },
];

tests.forEach((test) => {
  const seconds = parseISO8601Duration(test.input);
  const formatted = formatSeconds(seconds);
  console.log(
    `Input: ${test.input}, Seconds: ${seconds} (Exp: ${test.expectedSeconds}), Formatted: ${formatted} (Exp: ${test.expectedFormat})`,
  );
  if (seconds !== test.expectedSeconds || formatted !== test.expectedFormat) {
    console.error("FAILED");
  } else {
    console.log("PASSED");
  }
});
