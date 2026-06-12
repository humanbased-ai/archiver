import Cookies from 'js-cookie'
import {domain} from '@/settings'

const TokenKey = 'Codatta-Medical-WSI-Token'

export function getToken() {
  copyToken();
  return Cookies.get(TokenKey)
}

export function setToken(token) {
  return Cookies.set(TokenKey, token,{"domain":domain})
  // return Cookies.set(TokenKey, token,{"domain":".annotation.coreintell.com"})
}

export function removeToken() {
  localStorage.removeItem(TokenKey);
  return Cookies.remove(TokenKey,{"domain":domain})
  // return Cookies.remove(TokenKey,{"domain":".annotation.coreintell.com"})
}

export function setStrageToken(token){
  const now = new Date();

  // 过期时间的时间戳
  const item = {
    value: token,
    expiry: now.getTime() + 7*3600*24*1000,
  };

  localStorage.setItem(TokenKey, JSON.stringify(item));
}

export function getStrageToken(){
  const itemStr = localStorage.getItem(TokenKey);
  // 如果没有值，直接返回null
  if (!itemStr) {
    return null;
  }
  const item = JSON.parse(itemStr);
  const now = new Date();
  // 如果过期，返回null
  if (now.getTime() > item.expiry) {
    localStorage.removeItem(TokenKey);
    return null;
  }
  return item.value;
}

export function copyToken(){
  const token = getStrageToken();
  if(token){
    setToken(token);
  }
}
