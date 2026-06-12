const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Sets REACT_NATIVE_NODE_MODULES_DIR in the app's build.gradle ext block so
 * third-party libraries (e.g. @react-native-picker/picker) can locate
 * react-native when it is hoisted to the monorepo root node_modules rather
 * than living inside apps/mobile/node_modules.
 *
 * From apps/mobile/android/, root node_modules is three levels up: ../../../
 */
module.exports = (config) =>
  withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    if (contents.includes('REACT_NATIVE_NODE_MODULES_DIR')) {
      return config;
    }
    config.modResults.contents = contents.replace(
      /^(android\s*\{)/m,
      [
        'ext {',
        '    REACT_NATIVE_NODE_MODULES_DIR = new File(rootProject.projectDir, "../../../node_modules/react-native")',
        '}',
        '',
        '$1',
      ].join('\n')
    );
    return config;
  });
