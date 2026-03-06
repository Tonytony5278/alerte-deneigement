const { withXcodeProject, withEntitlementsPlist, withInfoPlist, IOSConfig } = require('expo/config-plugins');
const path = require('path');
const fs = require('fs');

const APP_GROUP_ID = 'group.ca.alertedeneigement.app';
const WIDGET_BUNDLE_ID = 'ca.alertedeneigement.app.widget';
const WIDGET_NAME = 'StreetStatusWidget';

function withWidgetExtension(config) {
  // 1. Add App Groups entitlement to the main app
  config = withEntitlementsPlist(config, (mod) => {
    mod.modResults['com.apple.security.application-groups'] = [APP_GROUP_ID];
    return mod;
  });

  // 2. Add the widget extension target to the Xcode project
  config = withXcodeProject(config, (mod) => {
    const xcodeProject = mod.modResults;
    const projectRoot = mod.modRequest.projectRoot;
    const widgetSourceDir = path.join(projectRoot, 'targets', 'widget');
    const iosDir = path.join(projectRoot, 'ios');

    // Copy widget files into the iOS build directory
    const widgetBuildDir = path.join(iosDir, WIDGET_NAME);
    if (!fs.existsSync(widgetBuildDir)) {
      fs.mkdirSync(widgetBuildDir, { recursive: true });
    }

    const filesToCopy = ['StreetStatusWidget.swift', 'Info.plist'];
    for (const file of filesToCopy) {
      const src = path.join(widgetSourceDir, file);
      const dst = path.join(widgetBuildDir, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dst);
      }
    }

    // Create widget entitlements
    const widgetEntitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.application-groups</key>
    <array>
        <string>${APP_GROUP_ID}</string>
    </array>
</dict>
</plist>`;
    fs.writeFileSync(path.join(widgetBuildDir, `${WIDGET_NAME}.entitlements`), widgetEntitlements);

    // Add widget extension target to Xcode project
    const targetUuid = xcodeProject.generateUuid();
    const groupName = WIDGET_NAME;

    // Add PBXGroup for widget files
    const widgetGroup = xcodeProject.addPbxGroup(
      filesToCopy.map(f => path.join(WIDGET_NAME, f)),
      groupName,
      WIDGET_NAME
    );

    // Add to main project group
    const mainGroup = xcodeProject.getFirstProject().firstProject.mainGroup;
    xcodeProject.addToPbxGroup(widgetGroup.uuid, mainGroup);

    // Add native target for widget extension
    const target = xcodeProject.addTarget(
      WIDGET_NAME,
      'app_extension',
      WIDGET_NAME,
      WIDGET_BUNDLE_ID
    );

    // Add Swift files to the widget target's compile sources
    const swiftFile = path.join(WIDGET_NAME, 'StreetStatusWidget.swift');
    xcodeProject.addSourceFile(swiftFile, { target: target.uuid }, widgetGroup.uuid);

    // Set build settings for the widget target
    const configs = xcodeProject.pbxXCBuildConfigurationSection();
    for (const key in configs) {
      const cfg = configs[key];
      if (cfg.buildSettings && cfg.name && cfg.baseConfigurationReference === undefined) {
        // Check if this belongs to our widget target
        if (key.includes(target.uuid) || (cfg.buildSettings.PRODUCT_BUNDLE_IDENTIFIER === WIDGET_BUNDLE_ID)) {
          cfg.buildSettings.SWIFT_VERSION = '5.0';
          cfg.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '16.0';
          cfg.buildSettings.CODE_SIGN_ENTITLEMENTS = `${WIDGET_NAME}/${WIDGET_NAME}.entitlements`;
          cfg.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = WIDGET_BUNDLE_ID;
          cfg.buildSettings.MARKETING_VERSION = '1.0.0';
          cfg.buildSettings.CURRENT_PROJECT_VERSION = '1';
          cfg.buildSettings.INFOPLIST_FILE = `${WIDGET_NAME}/Info.plist`;
          cfg.buildSettings.LD_RUNPATH_SEARCH_PATHS = '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"';
          cfg.buildSettings.TARGETED_DEVICE_FAMILY = '"1"';
          cfg.buildSettings.GENERATE_INFOPLIST_FILE = 'NO';
        }
      }
    }

    return mod;
  });

  return config;
}

module.exports = withWidgetExtension;
