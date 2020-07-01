// 云函数入口文件
const cloud = require('wx-server-sdk');
const CryptoJS = require("crypto-js");
const axios = require('axios');
const shortid = require('shortid');

class AppDevSdk {
	constructor({
		AppKey,
		AppSecret,
	}) {
		this.AppKey = AppKey;
		this.AppSecret = AppSecret;
	}

	async requestAppApi(Action, reqData = {}, options = {}) {
		
		console.log("reqData:"+JSON.stringify(reqData))

		const requestOpts = {
			method: 'POST',
			url: 'https://iot.cloud.tencent.com/api/exploreropen/appapi',
			...options,
		};

		if (!reqData.RequestId) {
			reqData.RequestId = shortid();
		}

		requestOpts.data = this.assignSignature({
			Action,
			...reqData,
		});

		const { status, statusText, data: response = {} } = await axios(requestOpts);

		if (status !== 200) {
			return Promise.reject({ code: status, msg: statusText });
		}

		const { code, msg, data = {} } = response;

		if (code) {
			return Promise.reject({ code, msg });
		}

		if (data.Error) {
			return Promise.reject({ code: data.Error.Code, msg: data.Error.Message });
		}

		return data;
	}

	assignSignature(data) {
		const Timestamp = Math.floor(Date.now() / 1000 ); //本次请求的 UNIX 秒级时间戳
		const Nonce = Math.floor((10000 * Math.random())) + 1; // 随机正整数

		data = Object.assign({}, data, {
			Timestamp,
			Nonce,
			AppKey: this.AppKey,
		});

		let keys = Object.keys(data).sort();
		let arr = [];
		for (const key of keys) {
			arr.push(key + '=' + data[key]);
		}
		const paramString = arr.join('&');

		const hash = CryptoJS.HmacSHA1(paramString, this.AppSecret);
		const signature = CryptoJS.enc.Base64.stringify(hash);
   
		return {
			...data,
			Signature: signature,
		};
	};
}

cloud.init();

const sdk = new AppDevSdk({
	// 物联网开发平台 - 应用开发中申请的AppKey及AppSecret
	AppKey: 'mvdSxKJeAZUDKQerD', // 向军 mrlTtwMOjLbkKpRan ； 徐宏 mvdSxKJeAZUDKQerD  陈聪 mSuiyhEeFuEPdvCRj
	AppSecret: 'dzrXdGvDDywKROWsVXmF',// 向军 QeqqoiWqqqqSNhCTQPMJ ； 徐宏 dzrXdGvDDywKROWsVXmF 陈聪 LJmnNiqmExAFAiblPLvw
});

// 云函数入口函数
exports.main = async ({ userInfo }, context) => {
	try {
		const { errCode, errMsg, data, cloudID } = userInfo;
		if (errCode) {
			return {
				code: errCode,
				msg: errMsg,
				cloudID,
			};
		}
		const { openId, unionId, nickName, avatarUrl } = data;
		const response = await sdk.requestAppApi('AppGetTokenByWeiXin', {
			WxOpenID: openId, // or unionId
			NickName: nickName,
			Avatar: avatarUrl,
		});
		return { code: 0, msg: 'ok', data: response };
	} catch (err) {
		if (err instanceof Error) {
			return {
				code: 'InternalError',
				msg: err.message,
			};
		} else {
			return err;
		}
	}
};