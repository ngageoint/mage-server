module.exports = PasswordFilter;

function PasswordFilter() {
  return function(text) {
    if (!text) return null;

    return text.replace(/./g, "*");
  };
}
