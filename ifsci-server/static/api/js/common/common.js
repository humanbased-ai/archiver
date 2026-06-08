/*================Center object==================*/

/**
 * Get the absolute position of the HTML element from the browser (excluding the length of the scroll bar)
 * @param msgObj
 */
function setObjMiddleX(msgObj){
	if(msgObj){
		var msgWidth = msgObj.scrollWidth;  
	    var bgLeft=window.pageXOffset || document.documentElement.scrollLeft|| document.body.scrollLeft || 0;     
	    var bgWidth=document.documentElement.clientWidth || document.body.clientWidth || 0;   
	    var msgLeft=0; 
	    if(bgWidth>msgWidth){
	    	msgLeft=bgLeft+Math.round((bgWidth-msgWidth)/2);
	    }else{
	    	msgLeft=bgLeft+10;
	    }
	    msgObj.style.position = "absolute";  
	    msgObj.style.left  = msgLeft+"px";  
	}
}

/**
 * Set the object to be centered in the Y direction
 * @param msgObj
 */
function setObjMiddleY(msgObj){
	if(msgObj){
		var msgHeight= msgObj.scrollHeight;  
	    var bgTop=window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;  
	    var bgHeight=document.documentElement.clientHeight || document.body.clientHeight || 0;  
	    var msgTop=0;  
	    if(bgHeight>msgHeight){
	    	msgTop=bgTop+Math.round((bgHeight-msgHeight)/2);
	    }else{
	    	msgTop=bgTop+10;
	    }
	    msgObj.style.position = "absolute";  
	    msgObj.style.top      = msgTop+"px";  
	}
}

/**
 * Get the height and width of the browser (including the length of the scroll bar)
 * @returns {___anonymous1442_1467}
 */
function getPageSize(){
	var bgHeight=document.documentElement.clientHeight || document.body.clientHeight || 0;
	var bgWidth=document.documentElement.clientWidth || document.body.clientWidth || 0;  
	return {"x":bgWidth,"y":bgHeight};
}

function getImageSize(obj){
	var size = {};
	if(obj == null){
		return null;
	}
	var imgDom = jQuery(obj)[0];
	var imgObj = jQuery(obj);
	
	//size form attr 
	width = imgObj.attr('width');
	height = imgObj.attr('height');
	
	//size form dom 
	if(width == null || width =='' || width == 0){
		var width = imgDom.width;
	}
	if(height == null || height =='' || height == 0){
		var height = imgDom.height;
	}
	
	size.width = width;
	size.height = height;
	return size;
}


function  getPageScrollSize(){
	var bgTop=window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
	var bgLeft=window.pageXOffset || document.documentElement.scrollLeft|| document.body.scrollLeft || 0;
	return {"x":bgLeft,"y":bgTop};
}


function getAbsPoint(e){
	  var x = e.offsetLeft;
	  var y = e.offsetTop;
	  while(e = e.offsetParent){
		x += e.offsetLeft-e.scrollLeft;
	    y += e.offsetTop-e.scrollTop;
	  }
	  return {"x": x, "y": y};
};


function trim(str){   
	if(str == null || str =='' || str.length == 0){
		return str;
	}
    str = str.replace(/^(\s|\u00A0)+/,'');   
    for(var i=str.length-1; i>=0; i--){   
        if(/\S/.test(str.charAt(i))){   
            str = str.substring(0, i+1);   
            break;   
        }   
    }   
    return str;   
}

function trims(strs){
	if(strs == null || strs =='' || strs.length == 0){
		return strs;
	}
	var len = strs.length;
	for(var i = 0 ; i < len ; i++){
		var str = strs[i];
		str = trim(str);
		strs[i] = str;
	}
	return strs;
}



/**
 * @param n
 * @returns
 */
function makeRandom(n){
	var pows = Math.pow(10,n);
	var floats = Math.random();
	var number = Math.floor(floats*pows);
	return number;
}

/**
 * String To JSON
 * @param Str
 * @returns
 */
function StringToJson(Str){
	if(Str==null||Str ==''){
		return null;
	}
	var json = null;
	if(Str.substr(0,1)=='{'){
		json = eval('['+Str+']')[0];
	}else{
		json  = eval(Str);
	}
	return json;
}

/**
 * json to String
 */
function JsonToString(o) {
    var arr=[];
    var fmt = function(s) { 
            if (typeof s == 'object' && s != null ) return JsonToString(s); 
            return /^(string|number)$/.test(typeof s) ? "\"" + s + "\"" : s; 
    };
    
    if(o instanceof Array){
        for (var i in o){
                arr.push(fmt(o[i]));
        }
        return '[' + arr.join(',') + ']';
            
    }
    else{
        for (var i in o){
                arr.push("\"" + i + "\":" + fmt(o[i]));
        }
        return '{' + arr.join(',') + '}'; 
    }
}; 

/**
 * 
 * URL
 * @param url
 * @param paramName
 * @param paramValue
 * @returns
 */
function addUrlParam(url,paramName,paramValue){
    if(url==null||url==''){
        return null;
    }
    if(paramName==null||paramName==''){
        return url;
    }
    
    if(url.indexOf('?')>=0){
    	var urls = url.split('?');
    	var uri = urls[0];
    	if( urls[1].indexOf(paramName)>=0){ //可能包含重复参数
    		url = uri+'?'+paramName+'='+paramValue;
    		var params = urls[1].split('&');
        	for(var i = 0 ; i<params.length; i++){
        		var map = params[i].split('=');
        		var key = trim(map[0]);
        		if(key == paramName){
        			continue;
        		}
        		url+='&'+params[i];
        	}
    	}else{
    		url+='&'+paramName+'='+paramValue;
    	}
        
    }else{
        url+='?'+paramName+'='+paramValue;
    }
    return url;
} 


function DateFormat(date , fmt){
	  var o = {
		"M+" : date.getMonth() + 1, //月份   
		"d+" : date.getDate(), //日   
		"h+" : date.getHours(), //小时   
		"H+" : date.getHours(), //小时  
		"m+" : date.getMinutes(), //分   
		"s+" : date.getSeconds(), //秒   
		"q+" : Math.floor((date.getMonth() + 3) / 3), //季度   
		"S" : date.getMilliseconds() //毫秒   
	};
	if (/(y+)/.test(fmt)){
		fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
	}
	for ( var k in o){
		if (new RegExp("(" + k + ")").test(fmt)){
			fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]): (("00" + o[k]).substr(("" + o[k]).length)));
		}
	}
	return fmt;   
}

Date.prototype.format = function(style) {
	  var o = {
	    "M+" : this.getMonth() + 1, //month
	    "d+" : this.getDate(),      //day
	    "h+" : this.getHours(),     //hour
	    "m+" : this.getMinutes(),   //minute
	    "s+" : this.getSeconds(),   //second
	    "w+" : "天一二三四五六".charAt(this.getDay()),   //week
	    "q+" : Math.floor((this.getMonth() + 3) / 3),  //quarter
	    "S"  : this.getMilliseconds() //millisecond
	  };
	  if(/(y+)/.test(style)) {
	    style = style.replace(RegExp.$1,(this.getFullYear() + "").substr(4 - RegExp.$1.length));
	  }
	  for(var k in o){
	    if(new RegExp("("+ k +")").test(style)){
	      style = style.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] :("00" + o[k]).substr(("" + o[k]).length));
	    }
	  }
	  return style;
};

function getStrFormIndex(str,s,index){
	if(str == null || s == null){
		return null;
	}
	if(index == null){
		index = 0;
	}
	var array = str.split(s);
	if(index < 0 || index > array.length-1){
		return null;
	}
	return array[index];
	
}
//event.srcElement ? event.srcElement : event.target;

function firstCharUpperCase(str){
	if(str == null){
		return str;
	}
	str = str.replace(/(^|\s+)\w/g,function(s){return s.toUpperCase();});
	return str;
}

function showFileSize(size){
	var showSize = "";
	var fileSize = Math.round(size / 1024)*1000;
	var suffix   = 'KB';
	if (fileSize > 1000) {
		fileSize = Math.round(fileSize / 1000);
		suffix   = 'MB';
	}
	var fileSizeParts = fileSize.toString().split('.');
	fileSize = fileSizeParts[0];
	if (fileSizeParts.length > 1) {
		fileSize += '.' + fileSizeParts[1].substr(0,2);
	}
	showSize = fileSize + suffix;
	return showSize;
}


