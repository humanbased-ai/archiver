function query(){
    var selectValue = jQuery("#selectId").val();
    //loadConfigInfo(selectValue);
    current_page_no = 1
    page(current_page_no,current_page_size,selectValue)
    jQuery("#selectValueId").html(selectValue);
}

function loadConfigInfo(selectValue){
    //page(current_page_no,current_page_size,selectValue)

    var baseData = getBaseData();
    var types = baseData.types;
	if(types!=null){
		
		addSelect(types, 'selectId', 'id', 'name')
		
	}
}

function getBaseData(){
	var result = []
	var url = baseUri;
    $.ajax({
	        type: "GET", async : false,url: url,dataType: "json",data: {},
	        beforeSend: function(xhr) {
	            xhr.setRequestHeader("token", token);
	        },
	        success: function(respone){
	            console.log(respone);
	            if(respone.data!=null){
	                var data1 = respone.data;
                    result = data1
	            }
	        },
	        error: function(data){ console.log(data);} ,
	    });
	return result
}

function page(pageNo,pageSize,selectValue){
    var name = jQuery('#query_name').val()
    var comment_uid = jQuery('#query_comment_uid').val()
    var selectValue = jQuery('#selectId').val()
    var url = urlFindList;

    var data = {pageNo: pageNo, pageSize : pageSize};
    if(selectValue!=null && jQuery.trim(selectValue) != ''){
        data.type = selectValue
    }
    if(name!=null && jQuery.trim(name) != ''){
        data.name = name
    }
   

    $.ajax({
        type: "POST",
        url: url,
        data : JSON.stringify(data),
        headers: {'Content-Type': 'application/json'},
        dataType: "json",
        beforeSend: function(xhr) {
            xhr.setRequestHeader("token", token);
        },
        success: function(respone){
            console.log(respone);
            if(respone.data!=null){
                var page = respone.data;
                showLessonInfo(page);
            }
        },
        error: function(data){ console.log(data);} ,
    });
    
}

function showLessonInfo(page){
    datas = page.list
    page_row_data_map = {}
    if(datas == null){
        console.info("datas is null");
        return ;
    }

    //����table
    var html = "";
    for(var i=0;i<datas.length;i++){
        var data = datas[i];
        html+=createRowHtml(data,'',i);
        page_row_data_map[data.id] = data
    }
    jQuery("#lessonTbody").html(html);

    current_page_no = page.pageNo
    current_page_size = page.pageSize
    html_page = getPageHtml(page.pageNo,page.pageSize,page.count)
    jQuery("#pagination_div").html(html_page);
}

function createRowHtml(data,opt,index){
    var html = "";
    if(data!=null){
        var createTimeStr = ''
        /**/
        if(data.createTime!=null){
            createTimeStr = DateFormat(new Date(data.createTime),"yyyy-MM-dd HH:mm:ss");
        }

        html +='<tr id="tr_'+data.id+'">';
        html +='<td style="text-align:center;">';
        html +='<input type="checkbox" name="sort" attrname="sort" value="">';
        html +='<input type="hidden" attrname="id" value="'+data.id+'"/>';
        html +='</td>';
        html +='<td style="text-align:center;">'+(index+1)+'</td>';

        var idHtml = '<a href="'+data.url+'" target="_blank">'+data.id+'</a>'

        //html +='<td>'+idHtml+'</td>';
        html +='<td>'+getInputHtml('name',data.name,'width:120px;','text')+'</td>';
        html +='<td>'+getInputHtml('type',data.type,'width:80px;','text')+'</td>';
        html +='<td>'+getInputHtml('data_type',data.data_type,'width:80px;','text')+'</td>';

        var content = data.value
        var show_value = content
        if(content != null && content.length > 50){
            show_value = content.substr(0,50)+'...';
        }
        var title_content= content.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        html +='<td><span title="'+title_content+'">'+getInputHtml('value',show_value,'width:200px;','text')+'</span></td>';


        html +='<td>'+getInputHtml('status',row_status_map[data.status],'width:60px;','text')+'</td>';


        html +='<td>'+getInputHtml('remarks',data.remarks,'width:120px;','text')+'</td>';

        html +='<td>';
        //html +='<input class="btnMini btn-primary btn"  value="ִ��" onclick="runConfig(this,1)"/> ';
        html +='<input class="btnMini btn-primary btn"  value="详情" onclick="detail(this)"/> ';
        html +='</td>';
        html +='</tr>';
    }
    return html;
}


function getInputHtml(name,value,styleName,type){
    var readonly = '';
    var className = "";
    if(name == 'id'){
        readonly = 'readonly=true';
        className = "idClassInput";
    }
    if(styleName == null){
        styleName = '';
    }
    var html = "";
    var valueStr =''+( value==null?"":value);
    if(valueStr!=null && valueStr.includes('{"')){
        valueStr = (valueStr+'').replace(new RegExp('"', "gm"), '\'');
    }
    if('input' == type || type == null){
        html +='<input name="'+name+'" '+readonly+' attrname="rowInput"'
            +' class="inputHtmlTextArea'+className+'" '
            +'style="'+styleName+'" '
            +'type="text" value="'+valueStr+'">';

    }else if('textarea' == type){
        var maxRownum = 5;
        var rownum = 2;
        /*
        if(valueStr!=null && valueStr.length>(2*30)){
            rownum = 1+(valueStr.length/30);
        }
        if(rownum>maxRownum){
            rownum = maxRownum;
        } */
        rownum = maxRownum;
        html +='<textarea name="'+name+'" '+readonly+'+ attrname="rowInput"'
            +' class="inputHtml '+className+'" '
            +'rows="'+rownum+'"'
            +'style="'+styleName+'">'
            +valueStr+'</textarea>';
    }else if('text' == type){
        html = valueStr;
    }

    return html;
}

function detail(obj) {
	 var id =  null;
	 var row_data = null;
	if(obj!=null){
		var curentTr = jQuery(obj).parents('tr')[0];

	    var id = jQuery(jQuery('[attrname="id"]',curentTr)[0]).val();
	    
	    var row_data = page_row_data_map[id]
	}
    
    var message = '菜单数据'
    var title = '推文'
    var dialogId = 'dialog_detail_id'

    jQuery("#dialog_detail").empty();
    jQuery("#dialog_detail").append('<div id="'+dialogId+'" title="'+title+'" style="display: none">'+title+'</div>')
    var dialog = jQuery('#'+dialogId);
    //查询详情页数据
    var url = detailUri+'?id='+id;
    var data = {};
    var row_data_detail = {}
    if(id !=null){
        /***/
	    $.ajax({
	        type: "GET", async : false,url: url,dataType: "json",data: data,
	        beforeSend: function(xhr) {
	            xhr.setRequestHeader("token", token);
	        },
	        success: function(respone){
	            console.log(respone);
	            if(respone.data!=null){
	                var data1 = respone.data;
	                row_data_detail = data1
	            }
	        },
	        error: function(data){ console.log(data);} ,
	    });
    }
    var baseData = getBaseData()
   
     

    dialog.load(formPath, function() {
        console.log('row_data_detail = ',row_data_detail)
        loadDetailPage(dialog,row_data,row_data_detail, baseData)
    });


    dialog.dialog({
        width : 800,height: 510,modal: false,
        close: function(){
            dialog.dialog('destroy');
            jQuery("#dialog_load").empty();
            jQuery("#dialog_detail").empty();
        },
        buttons: [
			{
                    text: "关闭",
                    click: function() {
                        
                        //$( this ).dialog( "close" );
                        dialog.dialog('destroy');
			            jQuery("#dialog_load").empty();
			            jQuery("#dialog_detail").empty();
                    }
                },
                {
                    text: "提交",
                    click: function() {
                        subbmitData(dialog)
                    }
                }
        ]
    });
}

function subbmitData(obj){
	var rowInputs = jQuery(obj).find('[attrname="rowInput"]')
	var id = jQuery(obj).find('[name="id"]').val()
	if(id == null){
        id = ''
    }

	var data = {
		"id": id
	}
	if(rowInputs.length>0){
		for(var i=0;i<rowInputs.length;i++){
			var rowInput = rowInputs[i]
			var attrname = jQuery(rowInput).attr('name');
			var value = jQuery(rowInput).val();
			data[attrname] = value;
		}
	}
	
	console.log('save data = ', data)
	ajaxSave(obj,data);
}


function ajaxSave(obj,data){
    var url = saveUrl + '?rk='+Math.random();
    jQuery("#messageId").html("");
    jQuery.ajax({
        url: url, async : false,type: "POST",
        data : JSON.stringify(data),
        headers: {'Content-Type': 'application/json'},
        dataType: "json",
        beforeSend: function(xhr) {
            xhr.setRequestHeader("token", token);
        },
        success: function(response) {
            info = response;
            if(info.code !=0){
                var message = info.message
                showTip(message);
                return
            }
            if(info!=null){
                var retData = info.data;
                var message = retData;
                jQuery("#messageId").html(message);
                showTip(message);
                $( obj ).dialog( "close" );
                query();
            }
        },
        error: function(e){
            console.log(e);
        }
    });
}

function loadDetailPage(dialog,row_data,row_data_detail,baseData) {
	//初始话下拉框
	if(baseData!=null){
        var types = baseData.types
		addSelect(types, 'type', 'id', 'name')
		
	}
	jQuery("select").select2();
	// 加载 表单
    if (row_data_detail != null) {
		jQuery(dialog).find('[name="id"]').val(row_data_detail.id)
		var rowInputs = rowInputs = jQuery(dialog).find('[attrname="rowInput"]')
		if(rowInputs.length>0){
			for(var i=0;i<rowInputs.length;i++){
				var rowInput = rowInputs[i]
				var attrname = jQuery(rowInput).attr('name');
				var value = row_data_detail[attrname]
				if(value != null){
					if(rowInput.localName == 'select'){
						jQuery(rowInput).val(value).trigger('change');
					}else{
						jQuery(rowInput).val(value);
					}
					
				}
			}
		}
    }

}

 function addSelect(datas, selectId, key_name, show_name){
	 if(datas == null){
		 console.info("datas is null");
		 return ;
	 }
     if(key_name == null){
         key_name ='id';
     }
     if(show_name == null){
         show_name = 'id'
     }
	 var html = '<option value="">--请选择--</option>';
	 for(var i=0;i<datas.length;i++){
		var data = datas[i];
		html +='';
		html +='<option value="'+data[key_name]+'">';
		html +=''+data[show_name]+ '';
		html +='</option>';
	 }
	jQuery("#"+selectId).html(html);
	jQuery("select").select2();
	
 }