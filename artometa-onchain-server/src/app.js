const dotenv = require("dotenv")
const express = require("express")
const app = express()
const { NodeAdapterReedSolomon } = require('@bnb-chain/reed-solomon/node.adapter')
const {Client,Long,VisibilityType,RedundancyType,bytesFromBase64 } = require('@bnb-chain/greenfield-js-sdk')
const axios = require('axios')
const { v4 } = require('uuid')

class Logger {
  log(message) {
    console.log(`[${(new Date()).toISOString()}] ${message}`)
  }
}
const logger = new Logger()

dotenv.config()
const { ACCOUNT_ADDRESS, ACCOUNT_PRIVATEKEY, GREENFIELD_PRC, GREENFIELD_CHAIN_ID, GREENFIELD_PREVIEW_BASE,  PORT = 8080 } = process.env
const client = Client.create(GREENFIELD_PRC, GREENFIELD_CHAIN_ID);
const BUCKET_NAME = 'artometa-img'

app.use(express.json())

app.on('error', (error, req, res, next) => {
  res.status(500).send(error)
})

app.post('/api/gf/upload', async (req, res) => {

  try{
    logger.log('start fetch image: ', req.body.url)
    const fileUrl = req.body.url
    const fileResponse = await axios.get(fileUrl, {
      responseType: 'arraybuffer'
    })
    const fileBuffer = Buffer.from(fileResponse.data)
    const fileType = fileResponse.headers['content-type']

    logger.log('start choose primary sp')
    const sps = await client.sp.getStorageProviders()
    const primarySP = sps[0].operatorAddress
    logger.log('choose primary sp:', primarySP)

    logger.log('start get checksum')
    const rs = new NodeAdapterReedSolomon();
    const expectCheckSums = await rs.encode(Uint8Array.from(fileBuffer));
    logger.log('expectCheckSums: ', expectCheckSums)

    const objectName = v4()
    logger.log('start create object tx', `bucketName: ${BUCKET_NAME}, objectName: ${objectName}`)
    const createObjectTx = await client.object.createObject({
      bucketName: BUCKET_NAME,
      objectName: objectName,
      creator: ACCOUNT_ADDRESS,
      visibility: VisibilityType.VISIBILITY_TYPE_PUBLIC_READ,
      contentType: fileType,
      redundancyType: RedundancyType.REDUNDANCY_EC_TYPE,
      payloadSize: Long.fromInt(fileBuffer.length),
      expectChecksums: expectCheckSums.map((x) => bytesFromBase64(x)),
    })

    logger.log('start simulate create object tx')
    const createObjectTxSimulateInfo = await createObjectTx.simulate({
      denom: 'BNB',
    })

    logger.log('start broadcast create object tx')
    const createObjectTxRes = await createObjectTx.broadcast({
      denom: 'BNB',
      gasLimit: Number(createObjectTxSimulateInfo?.gasLimit),
      gasPrice: createObjectTxSimulateInfo?.gasPrice || '5000000000',
      payer: ACCOUNT_ADDRESS,
      granter: '',
      privateKey: ACCOUNT_PRIVATEKEY,
    })

    if (createObjectTxRes.code === 0) {
      logger.log('create object success', createObjectTxRes) 
    } else {
      logger.log('create object failed', createObjectTxRes)
    }

    logger.log('start upload object', `bucketName: ${BUCKET_NAME}, objectName: ${objectName}`)
    const updateResult = await client.object.uploadObject(
      {
        bucketName: BUCKET_NAME,
        objectName: objectName,
        body: {
          name: objectName,
          type: '',
          size: fileBuffer.length,
          content: fileBuffer
        },
        txnHash: createObjectTxRes.transactionHash,
      },
      {
        type: 'ECDSA',
        privateKey: ACCOUNT_PRIVATEKEY,
      },
    )
    if (updateResult.code === 0) {
      logger.log('upload object finish')
      res.status(200).send({
        code: 0,
        message: 'success',
        data: {
          url: `${GREENFIELD_PREVIEW_BASE}/${BUCKET_NAME}/${objectName}`
        }
      })
    } else {
      logger.log('upload object failed')
      throw new Error(updateResult.message)
    }
  } catch (error) {
    console.log(error.message)
    logger.log(error)
    res.status(500).send({
      code: 500,
      message: 'server error'
    })
  }
})

app.listen(PORT, () => {
    logger.log(`Server started on port ${PORT}`)
})

