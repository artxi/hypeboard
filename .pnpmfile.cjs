// pnpm hook to modify packages during installation
// This runs at the root level and affects all workspace packages
function readPackage(pkg, context) {
  // Remove husky prepare script from jwt-decode to prevent CI failures
  if (pkg.name === 'jwt-decode') {
    if (pkg.scripts && pkg.scripts.prepare) {
      delete pkg.scripts.prepare;
      context.log('Removed prepare script from jwt-decode');
    }
  }
  return pkg;
}

module.exports = {
  hooks: {
    readPackage
  }
};
