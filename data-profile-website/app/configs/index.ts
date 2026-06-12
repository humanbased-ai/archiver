export const GA_TRACKING_ID = import.meta.env.VITE_GA_TRACKING_ID;
export const DATA_API_PATH =
  import.meta.env.VITE_DATA_API_PATH ??
  "https://app.codatta.io/api/data/profile/query";

console.log("VITE_DATA_API_PATH", import.meta.env.VITE_DATA_API_PATH);
