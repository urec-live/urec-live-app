const { withPodfile } = require("expo/config-plugins");

const marker = "# UREC Live: align pod deployment targets with the app";
const hook = `
    ${marker}
    minimum_target = Gem::Version.new(podfile_properties['ios.deploymentTarget'] || '15.1')
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        current_target = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current_target && Gem::Version.new(current_target) < minimum_target
          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = minimum_target.to_s
        end
      end
    end
`;

function patchPodfile(contents) {
  if (contents.includes(marker)) return contents;
  const anchor = /(^[ \t]*react_native_post_install\([\s\S]*?^[ \t]*\))/m;
  if (!anchor.test(contents)) throw new Error("Cannot locate react_native_post_install in the generated Podfile.");
  return contents.replace(anchor, (match) => match + "\n" + hook);
}

module.exports = (config) => withPodfile(config, (config) => {
  config.modResults.contents = patchPodfile(config.modResults.contents);
  return config;
});
module.exports.patchPodfile = patchPodfile;
