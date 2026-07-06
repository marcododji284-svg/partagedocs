const AWS = require('aws-sdk');
const crypto = require('crypto');
const path = require('path');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const DOCUMENTS_BUCKET = process.env.AWS_DOCUMENTS_BUCKET || 'partagedocs-documents';
const CV_BUCKET = process.env.AWS_CV_BUCKET || 'partagedocs-cv';

function randomName(originalName) {
  const ext = path.extname(originalName);
  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
}

async function uploadDocumentFile(file) {
  const storagePath = randomName(file.originalname);
  const params = {
    Bucket: DOCUMENTS_BUCKET,
    Key: storagePath,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'public-read'
  };

  try {
    const result = await s3.upload(params).promise();
    return {
      storagePath: storagePath,
      publicUrl: result.Location
    };
  } catch (error) {
    throw new Error('Échec de l\'upload du fichier : ' + error.message);
  }
}

async function deleteDocumentFile(storagePath) {
  const params = {
    Bucket: DOCUMENTS_BUCKET,
    Key: storagePath
  };

  try {
    await s3.deleteObject(params).promise();
  } catch (error) {
    console.error('Erreur lors de la suppression du fichier :', error);
  }
}

async function uploadCvFile(file) {
  const storagePath = randomName(file.originalname);
  const params = {
    Bucket: CV_BUCKET,
    Key: storagePath,
    Body: file.buffer,
    ContentType: file.mimetype
  };

  try {
    await s3.upload(params).promise();
    return { storagePath };
  } catch (error) {
    throw new Error('Échec de l\'upload du CV : ' + error.message);
  }
}

async function getSignedCvUrl(storagePath, expiresInSeconds = 300) {
  const params = {
    Bucket: CV_BUCKET,
    Key: storagePath,
    Expires: expiresInSeconds
  };

  try {
    const signedUrl = s3.getSignedUrl('getObject', params);
    return signedUrl;
  } catch (error) {
    throw new Error('Impossible de générer le lien du CV : ' + error.message);
  }
}

module.exports = {
  uploadDocumentFile,
  deleteDocumentFile,
  uploadCvFile,
  getSignedCvUrl
};
