const getIds = (urls) => {
  return urls.map((url) => {
    let videoId = "";
    if (url.includes("v=")) {
      videoId = url.split("v=")[1]?.split("&")[0];
    } else if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1]?.split("?")[0];
    } else if (url.includes("embed/")) {
      videoId = url.split("embed/")[1]?.split("?")[0];
    }
    return { url, videoId };
  });
};

const urls = [
  "https://www.youtube.com/watch?v=VIDEO_ID_1",
  "https://youtu.be/VIDEO_ID_2",
  "https://youtu.be/VIDEO_ID_3?t=123",
  "https://www.youtube.com/embed/VIDEO_ID_4",
];

console.log(getIds(urls));
