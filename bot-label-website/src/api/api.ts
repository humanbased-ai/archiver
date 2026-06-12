import { getParamFromUrl } from '@/utils/util';
import { callMyFunction, db } from './cloudbase';
import { findIndex, groupBy } from 'lodash';

export interface FormSegment {
  start: number;
  end: number;
  des: string;
}

export interface FormData {
  docId: string;
  segments: FormSegment[];
}

const version = 'mvp-2.0';

export class Api {
  static collectionNames = {
    1: 'gif-label-1',
    2: 'gif-label-2',
    3: 'gif-label-3',
  };

  static async submit(formType: number | string, data: any) {
    const { success, message: errorMsg, address, docId } = getAddressAndDocId();

    if (!success) {
      return Promise.reject(errorMsg);
    }

    if (address === '0x22C21BFfde70CbDA7F50b807C79bE2c94be2E712') {
      return Promise.reject(
        new Error(
          'Please use your codatta wallet address at the end of the link'
        )
      );
    }

    try {
      const { isExist, isMax } = await this.getHistoryGroup(
        formType,
        docId,
        address,
        version
      );

      if (isExist) {
        return Promise.reject(new Error('No duplicate submissions'));
      }
      if (isMax) {
        return Promise.reject(new Error('Submission limit reached'));
      }

      // 如果不存在，则添加新文档
      await db
        .collection(
          this.collectionNames[formType as keyof typeof this.collectionNames]
        )
        .add({
          address,
          docId,
          data,
          version,
        });

      return { success: true, message: 'Submission successful' };
    } catch (error) {
      console.error('提交失败:', error);
      return Promise.reject(
        new Error('Submission failed: ' + (error as Error).message)
      );
    }
  }

  static async getHistory(formType: number | string) {
    const { success, message: errorMsg, address, docId } = getAddressAndDocId();

    if (!success) {
      return Promise.reject(new Error(errorMsg));
    }

    const res = await db
      .collection(
        this.collectionNames[formType as keyof typeof this.collectionNames]
      )
      .where({
        docId,
        address: db.command.neq('0x22C21BFfde70CbDA7F50b807C79bE2c94be2E712'),
      })
      .orderBy('createdTime', 'desc')
      .limit(20)
      .get();

    return res.data;
  }

  static async getHistoryGroup(
    formType: number | string,
    docId?: string,
    address?: string,
    version?: string
  ): Promise<{
    total: number;
    docs: Record<string, string[]>;
    isExist: boolean;
    isMax: boolean;
  }> {
    const where: any = {};
    if (docId) {
      where.docId = docId;
    }
    if (version) {
      where.version = version;
    }
    const res = await db
      .collection(
        this.collectionNames[formType as keyof typeof this.collectionNames]
      )
      .where(where)
      .get();
    const data = res.data
      ?.filter(
        (item) => !item.flag
        //   !item.flag &&
        //   item.address !== '0x22C21BFfde70CbDA7F50b807C79bE2c94be2E712'
      )
      .map((item) => {
        return {
          address: item.address,
          docId: item.docId,
        };
      });

    const docs = groupBy(data, 'docId');
    const docs2: Record<string, string[]> = {};
    const isExist = findIndex(data, (item) => item.address === address) !== -1;
    const isMax = docs[docId as string]?.length >= 10;

    for (const doc of Object.keys(docs)) {
      docs2[doc] = docs[doc].map((item) => item.address);
      console.log(docs2);
    }

    return {
      total: data.length,
      docs: docs2,
      isExist,
      isMax,
    };
  }

  // 获取类型1某个用户的打标数据，给类型2做打标任务
  static async getType1HistoryByAddressAndDocId(
    address: string,
    segment: number
  ) {
    const { success, message: errorMsg, docId } = getAddressAndDocId();

    if (!success) {
      return Promise.reject(new Error(errorMsg));
    }

    const res = await db
      .collection(this.collectionNames[1])
      .where({
        docId,
        address,
      })
      .orderBy('createdTime', 'desc')
      .limit(1)
      .get();

    return res.data[0]?.data?.[segment];
  }

  static async analyzeImage(
    formType: number | string,
    imageBase64: string,
    instruction: string,
    maxWords: number = 8
  ) {
    const docId = getParamFromUrl('id');

    const res = await callMyFunction('image-analysis', {
      body: { image: imageBase64, docId, formType, maxWords, instruction },
    });

    try {
      return res.data;
    } catch (error) {
      console.error('Error parsing response data:', error);
      return null;
    }
  }
  // 可以添加更多方法，如更新、删除等
}

function getAddressAndDocId() {
  const address = getParamFromUrl('address');
  const docId = getParamFromUrl('id');

  if (!address) {
    return {
      success: false,
      message: 'Address parameter is missing in the URL',
    };
  }
  if (!docId) {
    return {
      success: false,
      message: 'Doc Id parameter is missing in the URL',
    };
  }

  return {
    success: true,
    address,
    docId,
  };
}

