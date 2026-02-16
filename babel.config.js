module.exports = function (api) {
  api.cache(true);

  const plugins = [];

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
