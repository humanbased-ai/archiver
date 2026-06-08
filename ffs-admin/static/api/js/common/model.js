
/**
 * 刷新按钮状态，0 不可用；1 可用
 * 数据格式 {btnAdd：{id:buttonId1,status: 1 },btnEdit：{id:buttonId2,status: 0}}
 * @param btns
 */
function freshButtonStatus(btns){
	if(btns == null){return ;}
	for(var i in btns){
		var btn = btns[i];
		var btnObj = jQuery('#'+btn.id);
		if(btn.st == 0){
			setButtonDisAble(btnObj);
		}else{
			setButtonEnable(btnObj);
		}
	}
}

/**
 * 设置按钮不可用
 * @param btnObj
 */
function setButtonDisAble(btnObj) {
	jQuery(btnObj).attr("disabled", true);
}

/**
 * 设置按钮可用
 * @param btnId
 */
function setButtonEnable(btnObj) {
	jQuery(btnObj).removeAttr("disabled");

}

/**
 * 设置按钮状态
 * @param status
 */
function setButtonStatus(status) {
	setAllButtonEnable();
	if (status == "add" || status == "edit") {
		setButtonDisAble("btnAdd");
		setButtonDisAble("btnEdit");
		setAllPageEnable()

	} else if (status == "edit") {
		setButtonDisAble("btnAdd");
		setButtonDisAble("btnEdit");
		setAllPageEnable()
	} else if (status == "save") {
		setButtonDisAble("btnSubmit");
		setButtonDisAble("btnCancel");
		setAllPageDisable();
	} else if (status == "init") {
		setButtonDisAble("btnSubmit");
		setButtonDisAble("btnCancel");
		setAllPageDisable();
	} else {
		setButtonDisAble("btnSubmit");
		setButtonDisAble("btnCancel");
		setAllPageDisable();
		if ("${not empty category.id?'1':'0'}" == '0') {
			setButtonDisAble("btnEdit");
		}
	}

}


//设置页面不可编辑
function setAllPageDisable(formArea) {
	jQuery("input", formArea).attr("disabled", true);
	jQuery("textarea", formArea).attr("readonly", "readonly");

	jQuery(".aBtn", formArea).css('display', 'none');
	jQuery(".btn ,.btn-mini , .btn-small , .btn-large , .btn-success ", formArea).css('display', 'none');
	jQuery(".select2-arrow", formArea).css('display', 'none');

	jQuery(".select2-offscreen", formArea).attr("disabled", true);
	jQuery("img", formArea).next('a').css('display','none');
	jQuery("li a[href='javascript:']", formArea).css('display','none');
	jQuery('.ckedit').css('display','none');
	
	//btn
	jQuery("div.breadcrumb", formArea).css('display','none');
}

//设置页面可编辑
function setAllPageEnable(formArea) {
	jQuery("input", formArea).removeAttr("disabled");
	jQuery("textarea", formArea).removeAttr("readonly");
	
	jQuery(".aBtn", formArea).css('display', '');
	jQuery(".btn ,.btn-mini , .btn-small , .btn-large , .btn-success ", formArea).css('display', '');
	jQuery(".select2-arrow", formArea).css('display', '');

	jQuery(".select2-offscreen", formArea).removeAttr("disabled");
	jQuery("img", formArea).next('a').css('display','');
	jQuery("li a[href='javascript:']", formArea).css('display','');
	
	jQuery('.ckedit').css('display','');
	
	//btn
	jQuery("div.breadcrumb", formArea).css('display','');
}

function setSelect2Enable(formArea,inputName,status){
	if(status == false){
		jQuery(".select2-offscreen[name='"+inputName+"']", formArea).removeAttr("disabled");
	}else{
		jQuery(".select2-offscreen[name='"+inputName+"']", formArea).attr("disabled", true);
	}
}

function setArtcle(data){ //设置选择值
	for(var i in data){ //初始化输入
		var inputObj = jQuery('[name="'+i+'"]');
		var srcValue = inputObj.val();
		inputObj.val(data[i]);
	}
	var imageObj = jQuery('#imageurl');
	//updateImagePath('imageurl',data['image']);
}


function selectArtcle(type,target,url){ //选择文章，弹出对话框
	if(url == null || url ==''){
		url = '/soccercms/a/cms/article/artcleForm';
	}
	url = addUrlParam(url,'target',target);
	url = addUrlParam(url,'type',type);
	var dialogOpts = { width : 1000,height: 580,modal: false,buttons: { }    }; 
	openWindows(dialogOpts,url);
}

function setSelectElement(obj,value){
	//var value = jQuery(obj).val();
	var name = jQuery(obj).attr("name");
	if(name==null || name ==''){
		name = jQuery(obj).attr('id');
	}
	jQuery(obj).find("option").removeAttr("selected");
	jQuery(obj).find('option[value="'+value+'"]').attr("selected","selected");
	var text = jQuery(obj).find('option[value="'+value+'"]').html();
	jQuery('[id="s2id_'+name+'"]').find('.select2-chosen').html(text);
}


function selectReferData(obj,title,url){ //选择，弹出对话框
	if(url == null || url ==''){
		url = jQuery(obj).attr("urls") ;
	}
	if(url == null || url ==''){
		url = '/soccercms/a/cms/news/index';
	}
	var referMap = jQuery(obj).attr("referMap") ;
	var referType = jQuery(obj).attr("referType") ;
	var dialog = jQuery(obj).attr("dialog") ;
	url = addUrlParam(url,'refer.type',referType);
	url = addUrlParam(url,'refer.dialog',dialog);
	url = addUrlParam(url,'refer.map',referMap);
	var dialogOpts = { width : 1000,height: 580,modal: false,buttons: { }    }; 
	if(title == null){
		title = jQuery(obj).attr("value") ; //选择推荐
	}
	openWindows(dialogOpts,url,null,dialog,title);
}

function selectRelationData(obj,title,url){ //选择，弹出对话框
	if(url == null || url ==''){
		url = jQuery(obj).attr("urls") ;
	}
	if(url == null || url ==''){
		url = '/soccercms/a/cms/news/index';
	}
	var referMap = jQuery(obj).attr("referMap") ;
	var referType = jQuery(obj).attr("referType") ;
	var dialog = jQuery(obj).attr("dialog") ;
	url = addUrlParam(url,'refer.type',referType);
	url = addUrlParam(url,'refer.dialog',dialog);
	url = addUrlParam(url,'refer.map',referMap);
	var dialogOpts = { width : 1200,height: 600,modal: false,buttons: { }    }; 
	if(title == null){
		title = jQuery(obj).attr("value") ; //选择推荐
	}
	openWindows(dialogOpts,url,null,dialog,title);
}

/**
 * 设置目标页面值updateImagePath(id,path)
 * @param data
 */
function setReferValue(data){ 
	if(data!=null){
		for(var key in data){
			jQuery('[name="'+key+'"]').val(data[key]);
			jQuery('span[name="'+key+'"]').html(data[key]);
			if(key!=null&&key.indexOf("image")>-1){//选择文章后的图片变更
				var imageId = 'nameImage0';//jQuery('[name="'+key+'"]').attr('id');
				var path = data[key];
				if(imageId != null && path != null && imageId != '' && path != '' ){
					updateImagePath(imageId,path);
				}
			}
		}
	}
}
function showImageDialog(obj,width,height,dialogId,title){
	var src = jQuery(obj).attr('src');
	if(width == null || width == ''){
		width = 1000;
	}
	if(height == null || height == ''){
		height = 550;
	}
	var dialogOpts = {
			width : width , height : height , modal: false
	};
	if(title == null){
		title = "图片预览";
	}
	if(dialogId == null){
		dialogId = 'imageDialogid'+Math.round(Math.random()*Math.pow(10,8));
	}
	top.previewImage(src,dialogOpts,dialogId,title);
}
function previewImage(url,dialogOpts,dialogId,title){
	if(url == null || url == ''){return ;}
	if(dialogId == null){
		dialogId = 'watermarkdialogid'+Math.round(Math.random()*Math.pow(10,8));
	}
	if(title == null){
		title = "图片加水印";
	}
	if(dialogOpts == null){
		dialogOpts = { width : 550,height : 400,modal: false };
	}
	dialogOpts.close = function(){
		 $(this).dialog('destroy');
		 jQuery('#'+dialogId).remove();
	}
	var html = '';
	var html = '<div id="'+dialogId+'" title="'+title+'" style="display: none;text-align:center;vertical-align: middle;">';
	html +='<img  src="'+url+'" style="min-width: 50px;min-height: 50px;vertical-align: middle;">';
	html +='</div>';
	jQuery('body').append(html);
	jQuery( "#"+dialogId ).dialog(dialogOpts);
}

function openWindows(dialogOpts,url,iframeId,dialogId,title){ //打开窗口
	iframeId = iframeId==null?'iframeForm':iframeId;
	dialogId = dialogId==null?'dialog':dialogId;
	url = addUrlParam(url,'dialogId',dialogId);
	var dialog = jQuery('#'+dialogId);
	if(title == null){
		title = "选择文章";
	}
	if(dialog[0]==null){
		var html = '<div id="'+dialogId+'" title="'+title+'" style="display: none;">';
		html +='<iframe id="'+iframeId+'" name="'+iframeId+'" style="width:100%;height:98%;border: 0px;" ></iframe>';
		html +='</div>';
		jQuery('body').append(html);
	}
	
	jQuery('#'+iframeId).attr('src','');
	jQuery('#'+iframeId).attr('src',url);
	
	dialogOpts.close = function(){
		
		 $(this).dialog('destroy');
		 jQuery('#'+dialogId).remove();
	}
	jQuery( "#"+dialogId ).dialog(dialogOpts);
	//debugger;
	//jQuery( "#"+dialogId ).find(".ui-dialog-title").css('');
}

function openWindowsByPost(dialogOpts,url,iframeId,dialogId,title,data,modelAttribute){ //打开窗口
	iframeId = iframeId==null?'iframeForm':iframeId;
	dialogId = dialogId==null?'dialog':dialogId;
	url = addUrlParam(url,'dialogId',dialogId);
	var dialog = jQuery('#'+dialogId);
	if(title == null){
		title = "窗口";
	}
	if(dialog[0]==null){
		var html = '<div id="'+dialogId+'" title="'+title+'" style="display: none;">';
		html +='<iframe id="'+iframeId+'" name="'+iframeId+'" style="width:100%;height:98%;border: 0px;" ></iframe>';
		html +='</div>';
		jQuery('body').append(html);
	}
	dialogOpts.close = function(){
		 $(this).dialog('destroy');
		 jQuery('#'+dialogId).remove();
	}
	jQuery( "#"+dialogId ).dialog(dialogOpts);
	
	if(data == null || data == '' || modelAttribute == null || modelAttribute ==''){
		jQuery('#'+iframeId).attr('src','');
		jQuery('#'+iframeId).attr('src',url);
	}else{
		var htmlForm = '';
		for(var key in data){
			htmlForm +='<input type="hidden" name="'+key+'" value=\''+data[key]+'\'>';
		}
		var iframeObj = jQuery( "#"+iframeId );
		submitByIframe(iframeObj,url,htmlForm,modelAttribute);
	}
}

function submitByIframe(iframeObj,url,htmlForm,modelAttribute){ //iframe提交表单
	if(modelAttribute == null ){
		modelAttribute = "recommen";
	}
	var html = '<form action="'+url+'" modelAttribute="'+modelAttribute+'" method="post" target="_self" id="postData_form" style="display: none;">'
	+  htmlForm+   '</form>';
	jQuery(iframeObj)[0].contentWindow.document.write(html); 
	jQuery(iframeObj)[0].contentWindow.document.getElementById('postData_form').submit();
}


function closeWindows(dialogId){ //关闭窗口
	dialogId = dialogId==null?'dialog':dialogId;
	jQuery('#'+dialogId).remove();
	$( "#"+dialogId ).dialog( "destroy" );
}

function getTargetIframe(iframeIdStr){ //获取iframe对象
	if(iframeIdStr == null || iframeIdStr == ''){
		return null;
	}
	var targetWindow = null;
	iframeIds = iframeIdStr.split(',');
	var topWindow = top;
	for(var i = iframeIds.length-1 ; i >=0 ; i-- ){
		var iframeId = iframeIds[i];
		if(top == topWindow){
			topWindow = jQuery("#"+iframeId,topWindow.document)[0];
		}else{
			topWindow = jQuery(topWindow).contents().find('#'+iframeId)[0];
		}
		if(topWindow == null){
			return null;
		}
	}
	targetWindow = topWindow;
	return targetWindow;
}

function getTopIframePath(windowObj){  //获取 所有上级iframes 对象
	var docObj = windowObj.document;
	var documentURI = docObj.documentURI;
	var parentObj = windowObj;
	var iframes = [];
	var iframeIds = [];
	while(parentObj!=top){ //top为顶层容器
		console.info(parentObj.document.documentURI);
		var iframe = getIframePath(parentObj);
		if(iframe == null){
			break;
		}else{
			iframes.push(iframe);
			var iframeId = jQuery(iframe).attr('id');
			if(iframeId == null || iframeId == ''){ //id为空则自动新增ID
				iframeId = 'iframe'+ makeRandom(4);
				jQuery(iframe).attr('id',iframeId);
			}
			iframeIds.push(iframeId)
		}
		parentObj = parentObj.parent;
		
	}
	return {iframeIds : iframeIds.join(','),iframes : iframes};
}

function getIframePath(windowObj){ //获取 上级iframes 对象
	var documentURI = windowObj.document.documentURI;
	var parentObj = windowObj.parent;
	var iframes = jQuery('iframe',parentObj.document);
	var parentIframe = null;
	for(var i = 0 ; i< iframes.length ; i++){
		var iframe = iframes[i]; //debugger;
		//console.info(iframe.contentWindow == windowObj);
		if(iframe.contentWindow == windowObj){
			parentIframe = iframe;
			break;
		}
	}
	return parentIframe;
}


/**
 * 打开剪裁窗口
 * @param obj
 * @param inputId
 */
function openCropWindow(obj,inputId,url,param){
	if(url == null || url == ''){
		url = "/soccercms/a/cms/imageinfo/imageView";
	}
	var imgObj = jQuery(obj).parent().find('ol li img')[0];
	var imgUrl = jQuery(imgObj).attr('url');
	if(imgUrl == null || imgUrl == '' ){
		alertx("请选择图片");
		return ;
	}  
	if(inputId == null){
		inputId = jQuery(obj).parent().find('input[type="hidden"][class*="input"]').attr('id');
	}
	imgUrl = encodeURIComponent(imgUrl);
	url = addUrlParam(url,'imgUrl',imgUrl);
	url = addUrlParam(url,'inputId',inputId); //debugger;
	if(param!=null || param!=''){
		for(var key in param){
			url = addUrlParam(url,key,param[key]);
		}
	}
	windowOpen(url,"图片裁剪",1200,800);
	
}

/**
 * 打开上传图片对话框
 * @param obj
 * @param fileid
 */
function uploadLocal(obj,fileid){
	jQuery('#'+fileid).click();
}


/**
 * 更新文件路径
 * @param id
 * @param path
 */
function updateFilePath(fileId,url){
	$("#"+fileId).val(url); 
	var li, urls = $("#"+fileId).val().split("|");
	$("#"+fileId+"Preview").children().remove();
	for (var i=0; i<urls.length; i++){
		if (urls[i]!=""){//
			li = "<li><a href=\""+urls[i]+"\" url=\""+urls[i]+"\" target=\"_blank\">"+decodeURIComponent(urls[i].substring(urls[i].lastIndexOf("/")+1))+"</a>";//
			li += "&nbsp;&nbsp;<a href=\"javascript:\" onclick=\""+fileId+"Del(this);\">×</a></li>";
			$("#"+fileId+"Preview").append(li);
		}
	}
	if ($("#"+fileId+"Preview").text() == ""){
		$("#"+fileId+"Preview").html("<li style='list-style:none;padding-top:5px;'>无</li>");
	}
	
}

/**
 * 更新图片路径
 * @param id
 * @param path
 */
function updateImagePath(id,path){
	var inputObj = jQuery('#'+id);
	inputObj.val(path);
	var divObj = inputObj.parents('div')[0];
	jQuery('#'+id+'Preview',divObj).children().remove();
	var li = '<li><img src="'+path+'" url="'+path+'" style="max-width:400px;max-height:300px;_height:100px;border:0;padding:3px;">'; //
	li += '&nbsp;&nbsp;<a href="javascript:" onclick="'+id+'Del(this);">×</a></li>';
	jQuery('#'+id+'Preview',divObj).append(li);
	var imgObj = jQuery('#'+id+'Preview',divObj).find('img');
	imgObj.attr('src',path);
	imgObj.attr('url',path);
	eval(id+'Preview()');
}

/**
 * 更新图片路径
 * @param id
 * @param path
 */
function updateWMImagePath(id,path){
	var inputObj = jQuery('#'+id);
	inputObj.val(path);
	//debugger;
	var divObj = inputObj.parents('div')[0];
	jQuery('#'+id+'Preview',divObj).children().remove();
	var li = '<li><img src="'+path+'" url="'+path+'" style="width:400px;height:300px;border:0;padding:3px;">';//
	li += '&nbsp;&nbsp;<a href="javascript:" onclick="'+id+'Del(this);">×</a></li>';
	jQuery('#'+id+'Preview',divObj).append(li);
	var imgObj = jQuery('#'+id+'Preview',divObj).find('img');
	imgObj.attr('src',path);
	imgObj.attr('url',path);
}



/**
 * 缩放图片路径
 * @param obj
 */
function zoomImage(obj){
	var imgObj = jQuery(obj).parent().find('ol li img')[0];
	var imgUrl = jQuery(imgObj).attr('url');
	if(imgUrl == null || imgUrl == '' ){
		alertx("请选择图片");
		return ;
	}
	jQuery('[name="extImage"]').each(function(i,v){
		var inputId =  jQuery(this).find('input[type="hidden"][class*="input"]').attr('id');
		updateImagePath(inputId,imgUrl);
	});
	
}

/**
 * 打水印
 * @param obj 水印按钮
 * @param inputId 源文件对象
 */
function watermarkImage(obj,inputId){
	var imgUrl = jQuery('#'+inputId).val();
	if(imgUrl == null || imgUrl == '' ){
		alertx("请选择图片");
		return ;
	}  
	
	var watermarkAction = jQuery(obj).attr('urls');
	var span = jQuery(obj).parent().find('[name="watermarkradio"]:checked').parents('span')[0]
	var wmUrl = jQuery(span).find('img').attr('src');
	if(wmUrl == null || wmUrl == ''){
		alertx("请先水印图片");
	}
    var data = {'imgUrl' : imgUrl, wmUrl : wmUrl, x: 3, y: 3 };
    jQuery.ajax({  
		url: watermarkAction, async : false,type: "POST",
		data : data,
		success: function(response) {
			info = response;
			if(info.status == '1'){
				path = info.imgUrl;
				updateWMImagePath(inputId,path);
			}else{
				alertx("打印水印失败");
			}
		},
		error: function(e){console.error(e);}
	});
}

//获取表单数据
function getFormJsonData(formObj){
	var form = jQuery(formObj)[0];
	var data = {}; 
	if(form!=null&&form.length>0){
		var filterType = ""
		for(var i = 0 ; i < form.length ; i++ ){
			var e = form[i];
			var key = e.name;
			var value = e.value;
			if(key==null || key == ''){
				continue;
			}
			data[key] = value;
		}
	}
	return data;
}

//获取表单数据
function getFormData(formObj){
	var form = jQuery(formObj)[0];
	var data = {}; 
	if(form!=null&&form.length>0){
		var filterType = ""
		for(var i = 0 ; i < form.length ; i++ ){
			var e = form[i];
			var key = e.name;
			var value = e.value;
			if(key==null || key == ''  ){
				continue;
			}
			var input = {};
			input.key = key;
			input.value = value;
			if(e.tagName=='INPUT'){
				input.label = value;
			}else if(e.tagName == 'SELECT'){
				input.label = jQuery(e).find("option:selected").text();
			}else if(e.tagName == "TEXTAREA"){
				input.label = value;
			}else{
				input.label = value;
			}
			input.tagName = e.tagName;
			data[key] = input;
		}
	}
	return data;
}

function getDataByElment(obj){
	var data = {};
	jQuery(obj).find('input').each(function(i,e){
		var name = e.name;
		var key = name.substr(name.indexOf(".")+1);
		data[key]=e.value;
	});
	return data;
}

function jsonToUrlParam(data,encode){
	var url = "";
	var array = [];debugger;
	if(encode==null || encode == false){
		for(var i in data){
			array.push(i+'='+data[i]);
		}
	}else{
		for(var i in data){
			array.push(i+'='+encodeURI(encodeURI(data[i])));
		}
	}
	
	url = array.join('&');
	return url;
}

//设置跳转不可用
function setLinkInputDisable(nameStr,status){
	if(nameStr == null || nameStr == ''){
		return ;
	}
	status = status == null?false:status;
	var names = nameStr.split(",");
	for(var i in names){
		jQuery('[name="'+names[i]+'"]').attr("disabled", status);
	}
}

/**
 * 通过map获取对象
 * @param map "v1=1,v2=2"
 * @param content 
 */
function getDataByReferMap(map,content){
	var data = {};
	if(map==null || map == '' || jQuery(content).length ==0){
		return data;
	}
	var items = map.split(",");
	jQuery(items).each(function(i,v){
		var names = v.split("=");
		var key = jQuery.trim(names[0]);
		var srcKey = jQuery.trim(names[1]);
		var value = jQuery(content).find('[attrname="'+srcKey+'"]').val();
		data[key] = value;
	});
	return data;
}

/**
 * 区域显示隐藏
 */
function showArea(obj,areaId){
	var display = jQuery('#'+areaId).css('display');
	if(display == 'none'){
		jQuery('#'+areaId).css('display','');
		jQuery(obj).html(jQuery(obj).attr('name2'));
	}else{
		jQuery('#'+areaId).css('display','none');
		jQuery(obj).html(jQuery(obj).attr('name1'));
	}
}

/**
 * 根据key、value字典项数组转化为JSON
 * @param arrays 字典JSON数组
 * @param key 字典key
 * @param value 字典value 需要存储的值
 * @returns
 */
function dictListToJson(arrays,key,value){ //根据key、value字典项数组转化为JSON
	if(key == null){
		key = 'value';
	}
	if(value == null){
		value = 'label';
	}
	var json = {};
	for(var i=0; i<arrays.length; i++ ){
		var e = arrays[i];
		json[e[key]]=e[value];
	}
	return json;
}
