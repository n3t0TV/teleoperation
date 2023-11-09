const path = require('path')
const { Storage } = require('@google-cloud/storage')
const fs = require('fs')
const crypto = require('crypto')

const storage = new Storage({ keyFilename: path.join(__dirname, 'auth', 'googlestorage.json') });
const filepath = './teleop/modules/testfile.txt';
const bucketname = 'teleoperation_images';

//Save files to bit bucket
/*
const tmpFolder = fs.mkdtempSync(path.join(__dirname, '..', 'tmp', 'img'))



async function uploadSnapshot(base64Img, uid_ruta, uid_payload,tag,time) {
  const buff = new Buffer.from(base64Img.replace(/^data:image\/png;base64,/, ""), 'base64')
  const tmpPath = path.join(tmpFolder, `${tag}-${time}.png`)
  fs.writeFileSync(tmpPath, buff, { flag: 'w' })
  let folderName = uid_ruta
  if (uid_payload) folderName += `_${uid_payload}`
  await storage.bucket(bucketname).upload(tmpPath, {
    destination: `${folderName}/${tag}-${time}.png`
  })
  fs.unlink(tmpPath, err => { if (err) console.error(err) })
}
*/



module.exports = { uploadSnapshot };
