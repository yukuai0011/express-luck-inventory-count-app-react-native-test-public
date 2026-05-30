module.exports = function babelConfig(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'tamagui',
        {
          config: './tamagui.config.ts',
          components: ['tamagui'],
          disableExtraction: true,
        },
      ],
    ],
  };
};