const path = require('path');
const simpleGit = require('simple-git');
const BACKEND_PATH = path.join(__dirname, '..');
const backend = simpleGit(BACKEND_PATH);
const versions = { backend: null, frontend: null }
// Backend version is only fetched once

/**
 * 
 * @returns {Promise}
 */
async function getBackendVersion() {

  const backendData = await backend.branch();
  for (let b in backendData.branches) {
    const branch = backendData.branches[b];
    if (branch.current) {
      versions.backend = branch;
      break;
    }
  }
  console.log(versions.backend.commit);
  const tag = await new Promise(resolve => {
    backend.tag(['--contains', versions.backend.commit], (error, result) => {
      resolve(result.split('\n')[0]);
    });
  });
  versions.backend.tag = tag || '';
  return versions.backend;

};


async function getVersion() {
  return versions
}

module.exports = {
  backendVersion: getBackendVersion(),
  versions,
  getVersion
};