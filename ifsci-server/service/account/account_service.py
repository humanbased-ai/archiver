import requests
import os
import json
import asyncio
from log import logger
from datetime import datetime
import uuid
from dao import account_dao
from pydantic import BaseModel
from solders.pubkey import Pubkey
from fastapi import FastAPI, HTTPException
from typing import Optional
import base58
import nacl.signing


# get account info
async def get_user_info(user_id):
    user = await account_dao.get_account_by_user_id(user_id)

    return user


async def get_user_by_code(code):
    user = await account_dao.get_account_by_code(code)
    return user


# gen code
async def gen_code(user_id):
    account_code = str(uuid.uuid4())[:20].replace('-', '')
    user = await get_user_info(user_id)
    if user is None:
        account = None
        user = {
            'user_id': user_id,
            'account_code': account_code,
            'account_type': "address",
            'status': 0,
            'create_time': datetime.now()
        }
        await account_dao.add_account(user)
    else:
        # user['status'] = 1
        db_account_code = user['account_code']
        if db_account_code is not None and db_account_code != '' and len(db_account_code) > 0:
            # Do not update verification code
            account_code = db_account_code
        else:
            # Update verification code
            user['account_code'] = account_code
            await account_dao.save_account(user)
    return {'code': account_code}


async def verify_user(user_id, message, signature):
    user = await get_user_info(user_id)
    logger.info('verify_user user = {}', user)

    public_key = user_id
    await verify_signature(public_key, signature, message)
    account_code = str(uuid.uuid4())[:40].replace('-', '')
    user = {
        'user_id': user_id,
        'account_code': account_code,
        'source_type': "address",
        'status': 1,
        'create_time': datetime.now()
    }
    await account_dao.save_account(user)
    result = {
        'token': account_code,
    }
    return result


async def verify_signature(public_key, signature, message):
    result = None
    try:
        # Convert public key string to Pubkey object
        public_key = Pubkey.from_string(public_key)

        # Decode the signature from base58
        signature_bytes = base58.b58decode(signature)

        # Convert message to bytes
        message_bytes = message.encode('utf-8')

        # Create verify key from public key
        verify_key = nacl.signing.VerifyKey(bytes(public_key))

        try:
            # Verify the signature
            msg = verify_key.verify(message_bytes, signature_bytes)
            logger.info('verify_signature result = {}', msg)
            result = SignatureVerificationResponse(
                is_valid=True,
                message="Signature verification successful"
            )
        except Exception as e:
            logger.error('verify_signature public_key, signature, message error = {}', public_key, signature, message, e)
            result = SignatureVerificationResponse(
                is_valid=False,
                message="Invalid signature"
            )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return result


class SignatureVerificationRequest(BaseModel):
    message: str
    signature: str
    public_key: str


class SignatureVerificationResponse(BaseModel):
    is_valid: bool
    message: Optional[str] = None


async def unbind_user(user_id):
    user = await get_user_info(user_id)
    if user is None:
        return {'status': 0, 'message': 'user not found'}

    user['status'] = 0
    await account_dao.update_account(user)
    return {'status': 1, 'message': 'unbinded successfully'}

