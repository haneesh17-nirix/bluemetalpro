const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Sets REACT_NATIVE_NODE_MODULES_DIR in the ROOT android/build.gradle ext
 * block so third-party libraries (e.g. @react-native-picker/picker) can
 * locate react-native when it is hoisted to the monorepo root node_modules.
 *
 * picker's build.gradle reads: rootProject.ext.REACT_NATIVE_NODE_MODULES_DIR
 * rootProject.projectDir = apps/mobile/android/
 * Root node_modules is three levels up: ../../../node_modules/react-native
 */
module.exports = (config) =>
  withProjectBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    if (contents.includes('REACT_NATIVE_NODE_MODULES_DIR')) {
      return config;
    }
    // Insert ext block at the very top of the root build.gradle
    config.modResults.contents =
      [
        'ext {',
        '    REACT_NATIVE_NODE_MODULES_DIR = new File(rootProject.projectDir, "../../../node_modules/react-native")',
        '}',
        '',
      ].join('\n') + contents;
    return config;
  });
