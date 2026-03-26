/**
 * JXA helper functions injected into every OmniGraffle script.
 * These run inside the osascript JXA context, not in Node.
 */
export const JXA_HELPERS = `
function hex2color(hex) {
  var r = parseInt(hex.slice(1,3), 16) / 255;
  var g = parseInt(hex.slice(3,5), 16) / 255;
  var b = parseInt(hex.slice(5,7), 16) / 255;
  return og.Color({ red: r, green: g, blue: b, alpha: 1 });
}

function roleToFillHex(role, preset) {
  var roleMap = preset.semantic_roles;
  var colorKey = roleMap[role] || "surface";
  return preset.colors[colorKey] || preset.colors.surface;
}

function roleToTextHex(role, preset) {
  var darkRoles = ["encoder", "decoder", "attention", "output"];
  return darkRoles.indexOf(role) >= 0
    ? preset.colors.text_on_primary
    : preset.colors.text_primary;
}
`;
