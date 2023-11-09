const Axios = require('axios')
const Fs = require('fs')
const Path = require('path')

async function downloadFile (fileUrl, nameFile) {
  const path = (Path.resolve(__dirname, 'sslcert', nameFile))
  console.log(path)
  const writer = Fs.createWriteStream(path)
  return Axios({
    method: 'get',
    url: fileUrl,
    responseType: 'stream'
  }).then(response => {
    return new Promise((resolve, reject) => {
      response.data.pipe(writer)
      let error = null
      writer.on('error', err => {
        error = err
        writer.close()
        reject(err)
      })
      writer.on('close', () => {
        if (!error) {
          resolve(true)
        }
      })
    })
  })
}

const privKeyFn = async () => {
  const result = await downloadFile(process.env.KEY_PATH, 'privkey.pem')
  return result
}

const certFn = async () => {
  const result = await downloadFile(process.env.CERT_PATH, 'cert.pem')
  return result
}

module.exports = {
  privKeyFn,
  certFn
}
