import OSS from 'ali-oss';
import Dysmsapi20170525, *as $Dysmsapi20170525 from '@alicloud/dysmsapi20170525';
import OpenApi, *as $OpenApi from '@alicloud/openapi-client';
import *as $Util from '@alicloud/tea-util';

class AlibabaService {
  constructor() {
    this.ossClient = new OSS({
      region: process.env.ALIBABA_REGION_ID,
      accessKeyId: process.env.ALIBABA_ACCESS_KEY_ID,
      accessKeySecret: process.env.ALIBABA_ACCESS_KEY_SECRET,
      bucket: process.env.ALIBABA_OSS_BUCKET,
      endpoint: process.env.ALIBABA_OSS_ENDPOINT
    });

    const config = new $OpenApi.Config({
      accessKeyId: process.env.ALIBABA_ACCESS_KEY_ID,
      accessKeySecret: process.env.ALIBABA_ACCESS_KEY_SECRET,
      endpoint: 'dysmsapi.aliyuncs.com',
    });
    this.smsClient = new Dysmsapi20170525.default(config);
  }

  async uploadImage(name, filePath) {
    try {
      const result = await this.ossClient.put(name, filePath);
      return result.url;
    } catch (err) {
      console.error('OSS Upload Error:', err);
      throw err;
    }
  }

  async sendOrderSMS(phone, orderId, status) {
    try {
      const sendSmsRequest = new $Dysmsapi20170525.SendSmsRequest({
        phoneNumbers: phone,
        signName: process.env.ALIBABA_SMS_SIGN_NAME,
        templateCode: process.env.ALIBABA_SMS_TEMPLATE_CODE,
        templateParam: JSON.stringify({ orderId, status }),
      });
      const runtime = new $Util.RuntimeOptions({});
      const result = await this.smsClient.sendSmsWithOptions(sendSmsRequest, runtime);
      return result;
    } catch (err) {
      console.error('SMS Send Error:', err);
      throw err;
    }
  }
}

export default new AlibabaService();
