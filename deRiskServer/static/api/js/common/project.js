/*!
 * Copyright &copy; 2012-2014 <a href="https://github.com/thinkgem/jeesite">JeeSite</a> All rights reserved.
 * 
 * 通用公共方法
 * @author ThinkGem
 * @version 2014-4-29
 */
$(document).ready(function() {
	try{
		// 链接去掉虚框
		$("a").bind("focus",function() {
			if(this.blur) {this.blur()};
		});
		//所有下拉框使用select2
		$("select").select2();
	}catch(e){
		// blank
	}
});

// 引入js和css文件
function include(id, path, file){
	if (document.getElementById(id)==null){
        var files = typeof file == "string" ? [file] : file;
        for (var i = 0; i < files.length; i++){
            var name = files[i].replace(/^\s|\s$/g, "");
            var att = name.split('.');
            var ext = att[att.length - 1].toLowerCase();
            var isCSS = ext == "css";
            var tag = isCSS ? "link" : "script";
            var attr = isCSS ? " type='text/css' rel='stylesheet' " : " type='text/javascript' ";
            var link = (isCSS ? "href" : "src") + "='" + path + name + "'";
            document.write("<" + tag + (i==0?" id="+id:"") + attr + link + "></" + tag + ">");
        }
	}
}

// 获取URL地址参数
function getQueryString(name, url) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
    if (!url || url == ""){
	    url = window.location.search;
    }else{	
    	url = url.substring(url.indexOf("?"));
    }
    r = url.substr(1).match(reg)
    if (r != null) return unescape(r[2]); return null;
}

//获取字典标签
function getDictLabel(data, value, defaultValue){
	for (var i=0; i<data.length; i++){
		var row = data[i];
		if (row.value == value){
			return row.label;
		}
	}
	return defaultValue;
}

// 打开一个窗体
function windowOpen(url, name, width, height){
	var top=parseInt((window.screen.height-height)/2,10),left=parseInt((window.screen.width-width)/2,10),
		options="location=no,menubar=no,toolbar=no,dependent=yes,minimizable=no,modal=yes,alwaysRaised=yes,"+
		"resizable=yes,scrollbars=yes,"+"width="+width+",height="+height+",top="+top+",left="+left;
	window.open(url ,name , options);
}

// 恢复提示框显示
function resetTip(){
	jQuery.jBox.tip.mess = null;
}

// 关闭提示框
function closeTip(){
	jQuery.jBox.closeTip();
}

//显示提示框
function showTip(mess, type, timeout, lazytime){
	resetTip();
	setTimeout(function(){
		jQuery.jBox.tip(mess, (type == undefined || type == '' ? 'info' : type), {opacity:0,
			timeout:  timeout == undefined ? 2000 : timeout});
	}, lazytime == undefined ? 500 : lazytime);
}

// 显示加载框
function loading(mess){
	if (mess == undefined || mess == ""){
		mess = "正在提交，请稍等...";
	}
	resetTip();
	jQuery.jBox.tip(mess,'loading',{opacity:0});
}

// 警告对话框
function alertx(mess, closed){
	jQuery.jBox.info(mess, '提示', {closed:function(){
		if (typeof closed == 'function') {
			closed();
		}
	}});
	jQuery('.jbox-body .jbox-icon').css('top','55px');
}

// 确认对话框
function confirmx(mess, href, closed){
	jQuery.jBox.confirm(mess,'系统提示',function(v,h,f){
		if(v=='ok'){
			if (typeof href == 'function') {
				href();
			}else{
				resetTip(); //loading();
				location = href;
			}
		}
	},{buttonsFocus:1, closed:function(){
		if (typeof closed == 'function') {
			closed();
		}
	}});
	jQuery('.jbox-body .jbox-icon').css('top','55px');
	return false;
}

function confirmOk(mess){
	var isOk = false;
	jQuery.jBox.confirm(mess,'系统提示',function(v,h,f){
		if(v=='ok'){
			isOk = true;
		}
	},{buttonsFocus:1, closed:function(){
		if (typeof closed == 'function') {
			closed();
		}
	}});
	jQuery('.jbox-body .jbox-icon').css('top','55px');
	return isOk;
}

// 提示输入对话框
function promptx(title, lable, href, closed){
	jQuery.jBox("<div class='form-search' style='padding:20px;text-align:center;'>" + lable + "：<input type='text' id='txt' name='txt'/></div>", {
			title: title, submit: function (v, h, f){
	    if (f.txt == '') {
	        jQuery.jBox.tip("请输入" + lable + "。", 'error');
	        return false;
	    }
		if (typeof href == 'function') {
			href();
		}else{
			resetTip(); //loading();
			location = href + encodeURIComponent(f.txt);
		}
	},closed:function(){
		if (typeof closed == 'function') {
			closed();
		}
	}});
	return false;
}

// 添加TAB页面
function addTabPage(title, url, closeable, $this, refresh){
	jQuery.fn.jerichoTab.addTab({
        tabFirer: $this,
        title: title,
        closeable: closeable == undefined,
        data: {
            dataType: 'iframe',
            dataLink: url
        }
    }).loadData(refresh != undefined);
}

// cookie操作
function cookie(name, value, options) {
    if (typeof value != 'undefined') { // name and value given, set cookie
        options = options || {};
        if (value === null) {
            value = '';
            options.expires = -1;
        }
        var expires = '';
        if (options.expires && (typeof options.expires == 'number' || options.expires.toUTCString)) {
            var date;
            if (typeof options.expires == 'number') {
                date = new Date();
                date.setTime(date.getTime() + (options.expires * 24 * 60 * 60 * 1000));
            } else {
                date = options.expires;
            }
            expires = '; expires=' + date.toUTCString(); // use expires attribute, max-age is not supported by IE
        }
        var path = options.path ? '; path=' + options.path : '';
        var domain = options.domain ? '; domain=' + options.domain : '';
        var secure = options.secure ? '; secure' : '';
        document.cookie = [name, '=', encodeURIComponent(value), expires, path, domain, secure].join('');
    } else { // only name given, get cookie
        var cookieValue = null;
        if (document.cookie && document.cookie != '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = jQuery.trim(cookies[i]);
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) == (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
}

// 数值前补零
function pad(num, n) {
    var len = num.toString().length;
    while(len < n) {
        num = "0" + num;
        len++;
    }
    return num;
}

// 转换为日期
function strToDate(date){
	return new Date(date.replace(/-/g,"/"));
}

// 日期加减
function addDate(date, dadd){  
	date = date.valueOf();
	date = date + dadd * 24 * 60 * 60 * 1000;
	return new Date(date);  
}

//截取字符串，区别汉字和英文
function abbr(name, maxLength){  
 if(!maxLength){  
     maxLength = 20;  
 }  
 if(name==null||name.length<1){  
     return "";  
 }  
 var w = 0;//字符串长度，一个汉字长度为2   
 var s = 0;//汉字个数   
 var p = false;//判断字符串当前循环的前一个字符是否为汉字   
 var b = false;//判断字符串当前循环的字符是否为汉字   
 var nameSub;  
 for (var i=0; i<name.length; i++) {  
    if(i>1 && b==false){  
         p = false;  
    }  
    if(i>1 && b==true){  
         p = true;  
    }  
    var c = name.charCodeAt(i);  
    //单字节加1   
    if ((c >= 0x0001 && c <= 0x007e) || (0xff60<=c && c<=0xff9f)) {  
         w++;  
         b = false;  
    }else {  
         w+=2;  
         s++;  
         b = true;  
    }  
    if(w>maxLength && i<=name.length-1){  
         if(b==true && p==true){  
             nameSub = name.substring(0,i-2)+"...";  
         }  
         if(b==false && p==false){  
             nameSub = name.substring(0,i-3)+"...";  
         }  
         if(b==true && p==false){  
             nameSub = name.substring(0,i-2)+"...";  
         }  
         if(p==true){  
             nameSub = name.substring(0,i-2)+"...";  
         }  
         break;  
    }  
 }  
 if(w<=maxLength){  
     return name;  
 }  
 return nameSub;  
}

//请求数据
function ajaxSave(urls,data,async,callback){
	var info = null;
	async = async==null?false:async;
	jQuery.ajax({  
		url: urls, async : async,type: "POST",dataType : 'text',
		data : data,
		success: function(response) {
			info = response;
			if(callback){
				callback(info);
			}
		},
		error: function(e){console.error(e);}
	});
	return info;
}


//行单击选择、取消事件
jQuery(document).ready(function() {
	jQuery(".table tr td").click(function(){
		var tr = this.localName=='tr'?this:jQuery(this).parents('tr')[0];
		checkboxObj = jQuery('[attrname="sort"]',tr)[0];
		if(checkboxObj!=null&&this.name != 'sort'){
			checkboxObj.checked = checkboxObj.checked?false:true;
			setRowSelectStatus(checkboxObj);
		}
	});
	jQuery(".table [attrname='sort']").click(function(){
		this.checked = this.checked?false:true;
		setRowSelectStatus(this);
	});
	jQuery(".table tr:odd").addClass("trEvenClass");
});

//设置行是否选中
function setRowSelectStatus(checkboxObj){
	var tr = checkboxObj.localName=='tr'?checkboxObj:jQuery(checkboxObj).parents('tr')[0];
	if(checkboxObj.checked){
		jQuery(tr).addClass('data_table_tr_select');
	}else{
		jQuery(tr).removeClass('data_table_tr_select');
	}
}

/**
* 通过元素名称和全选对象实现全选事件
* @param objName
* @param obj
*/
function toggleCheckBox(objName,obj){
	var checkboxAllObj = obj.children[0];
	var checkboxName = checkboxAllObj.getAttribute(objName);
	var tableObj =obj.parentNode.parentNode.parentNode;
	var checkboxs =getcheckBoxbyName(checkboxName,tableObj);
	if(checkboxs == null ||checkboxs.length==0){
		checkboxs = jQuery(tableObj).find('[attrname="sort"]');
	}
	if(checkboxs!=null&&checkboxs.length>0){
		if(checkboxAllObj.checked){
			for(var i=0;i<checkboxs.length;i++){
				var inputs = checkboxs[i];
				if(!inputs.checked){
					inputs.checked=true;
				}
				setRowSelectStatus(inputs);
			}
		}else{
			for(var i=0;i<checkboxs.length;i++){
				var inputs = checkboxs[i];
				if(inputs.checked){
					inputs.checked=false;
				}
				setRowSelectStatus(inputs);
			}
		}
	}
}

/**
 * 设置下拉输入框的值
 * @param obj
 * @param value
 */
function setQuerySelect(obj,value){
	var name = jQuery(obj).attr("name");
	if(name==null || name ==''){
		name = jQuery(obj).attr('id');
	}
	jQuery(obj).find("option").removeAttr("selected");
	jQuery(obj).find('option[value="'+value+'"]').attr("selected","selected");
	var text = jQuery(obj).find('option[value="'+value+'"]').html();
	jQuery('[id="s2id_'+name+'"]').find('.select2-chosen').html(text);
}

function getPageHtml(pageNo, pageSize,count, funcName, funcParam){

	length = 8;// 显示页面长度
	slider = 1;// 前后显示页面长度
	firstPage = false;//是否是第一页
	lastPage = false;//是否是最后一页

	first = 1
	prev = 1
	next = 0
	last = parseInt(count / (pageSize < 1 ? 20 : pageSize) + first - 1);
	if (count % pageSize != 0 || last == 0) {
		last++;
	}
	totalPage = last
	if(funcName == null || funcName == ''){
		funcName = "page"
	}
	if(funcParam == null){
		funcParam = ""
	}

	message = ""
	orderBy = ""

	if (last < first) {
		last = first;
	}

	if (pageNo <= 1) {
		pageNo = first;
		firstPage=true;
	}

	if (pageNo >= last) {
		pageNo = last;
		lastPage=true;
	}

	if (pageNo < last - 1) {
		next = pageNo + 1;
	} else {
		next = last;
	}

	if (pageNo > 1) {
		prev = pageNo - 1;
	} else {
		prev = first;
	}

	//2
	if (pageNo < first) {// 如果当前页小于首页
		pageNo = first;
	}

	if (pageNo > last) {// 如果当前页大于尾页
		pageNo = last;
	}


	html_page = ''
	html_page += '<ul>'
	if (pageNo == first) {// 如果是首页
		html_page += "<li class=\"disabled\"><a href=\"javascript:\">&#171; 上一页</a></li>\n";
	} else {
		html_page += "<li><a href=\"javascript:\" onclick=\""+funcName+"("+prev+","+pageSize+",'"+funcParam+"');\">&#171; 上一页</a></li>\n";
	}
	begin = pageNo - (length / 2);
	if (begin < first) {
		begin = first;
	}

	var end = begin + length - 1;

	if (end >= last) {
		end = last;
		begin = end - length + 1;
		if (begin < first) {
			begin = first;
		}
	}

	if (begin > first) {
		var i = 0;
		for (i = first; i < first + slider && i < begin; i++) {
			html_page += "<li><a href=\"javascript:\" onclick=\""+funcName+"("+i+","+pageSize+",'"+funcParam+"');\">"
				+ (i + 1 - first) + "</a></li>\n";
		}
		if (i < begin) {
			html_page += "<li class=\"disabled\"><a href=\"javascript:\">...</a></li>\n";
		}
	}

	for (var i = begin; i <= end; i++) {
		if (i == pageNo) {
			html_page += "<li class=\"active\"><a href=\"javascript:\">" + (i + 1 - first)
				+ "</a></li>\n";
		} else {
			html_page += "<li><a href=\"javascript:\" onclick=\""+funcName+"("+i+","+pageSize+",'"+funcParam+"');\">"
				+ (i + 1 - first) + "</a></li>\n";
		}
	}

	if (last - end > slider) {
		html_page += "<li class=\"disabled\"><a href=\"javascript:\">...</a></li>\n";
		end = last - slider;
	}

	for (var i = end + 1; i <= last; i++) {
		html_page += "<li><a href=\"javascript:\" onclick=\""+funcName+"("+i+","+pageSize+",'"+funcParam+"');\">"
			+ (i + 1 - first) + "</a></li>\n";
	}

	if (pageNo == last) {
		html_page += "<li class=\"disabled\"><a href=\"javascript:\">下一页 &#187;</a></li>\n";
	} else {
		html_page += "<li><a href=\"javascript:\" onclick=\""+funcName+"("+next+","+pageSize+",'"+funcParam+"');\">"
			+ "下一页 &#187;</a></li>\n";
	}


	html_page += "<li class=\"disabled controls\"><a href=\"javascript:\"> ";
	html_page += "<input type=\"hidden\" id=\"pageLastNoId\" value=\""+last+"\"/> ";
	html_page += "当前<input type=\"text\" id=\"pageNoId\" value=\""+pageNo+"\" onkeypress=\"var e=window.event||this;var c=e.keyCode||e.which;if(c==13)";
	html_page += funcName+"(this.value,"+pageSize+",'"+funcParam+"');\" onclick=\"this.select();\"/> / ";
	html_page += "<input type=\"text\" id=\"totalPageId\" disabled value=\""+totalPage+"\"/>  页，";
	html_page += "每页 <input type=\"text\" id=\"pageSizeId\" value=\""+pageSize+"\" onkeypress=\"var e=window.event||this;var c=e.keyCode||e.which;if(c==13)";
	html_page += funcName+"("+pageNo+",this.value,'"+funcParam+"');\" onclick=\"this.select();\"/> 条，";
	html_page += "共 " + count + " 条"+(message!=null?message:"")+"</a></li>\n";

	html_page += "</ul>\n";

	html_page += "<div style=\"clear:both;\"></div>";

	return html_page
}