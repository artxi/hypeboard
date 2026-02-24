// Skip lifecycle scripts during install
module.exports = {
  hooks: {
    readPackage(pkg) {
      if (pkg.name === 'jwt-decode') {
        delete pkg.scripts.prepare;
      }
      return pkg;
    }
  }
};
