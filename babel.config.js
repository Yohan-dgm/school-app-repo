module.exports = function (api) {
  api.cache(true);

  const plugins = [];

  // Strip console.log/warn/info/debug from production builds (security: avoid
  // leaking auth/payment state via logs). console.error stays for crash visibility.
  if (process.env.NODE_ENV === "production") {
    plugins.push(["transform-remove-console", { exclude: ["error"] }]);
  }

  // Add react-native-reanimated plugin (must be last)
  plugins.push("react-native-reanimated/plugin");

  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins,
  };
};
