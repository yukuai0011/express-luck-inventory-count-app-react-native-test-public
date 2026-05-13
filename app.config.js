/** @format */

const appJson = require("./app.json");

function normalizeBaseUrl(value) {
  const trimmed = (value || "").trim().replace(/\/+$/, "");

  if (!trimmed || trimmed === "/") {
    return "";
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

module.exports = ({ config }) => {
  const baseUrl = normalizeBaseUrl(process.env.EXPO_BASE_URL);

  return {
    ...config,
    ...appJson.expo,
    experiments: {
      ...(appJson.expo.experiments || {}),
      ...(baseUrl ? { baseUrl } : {}),
    },
  };
};
