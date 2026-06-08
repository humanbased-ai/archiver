function query(){
    var selectValue = jQuery("#selectId").val();
    //loadConfigInfo(selectValue);
    current_page_no = 1
    page(current_page_no,current_page_size,selectValue)
    jQuery("#selectValueId").html(selectValue);
}

function loadConfigInfo(selectValue){
    page(current_page_no,current_page_size,selectValue)
}

function page(pageNo,pageSize,selectValue){
    var user_name = jQuery('#query_user_name').val()
    var comment_uid = jQuery('#query_comment_uid').val()
    var selectValue = jQuery('#selectId').val()
    var url = urlFindList;

    var data = {page_no: pageNo, page_size : pageSize};
    if(selectValue!=null && jQuery.trim(selectValue) != ''){
        data.status = selectValue
    }
    if(user_name!=null && jQuery.trim(user_name) != ''){
        data.user_name = user_name
    }
    if(comment_uid!=null && jQuery.trim(comment_uid) != ''){
        if(comment_uid.includes('/')){
            var comment_uids = comment_uid.split('/')
            data.comment_uid = comment_uids[comment_uids.length-1]
        }else{
            data.comment_uid = comment_uid
        }

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
        if(data.create_time!=null){
            createTimeStr = DateFormat(new Date(data.create_time*1000),"yyyy-MM-dd HH:mm:ss");
        }

        html +='<tr id="tr_'+data.id+'">';
        html +='<td style="text-align:center;">';
        html +='<input type="checkbox" name="sort" attrname="sort" value="">';
        html +='<input type="hidden" attrname="id" value="'+data.id+'"/>';
        html +='</td>';
        html +='<td style="text-align:center;">'+(index+1)+'</td>';

        var idHtml = '<a href="'+data.url+'" target="_blank">'+data.comment_uid+'</a>'

        html +='<td>'+idHtml+'</td>';
        html +='<td>'+getInputHtml('user_name',data.user_name,'width:80px;','text')+'</td>';
        html +='<td>'+getInputHtml('createTimeStr',createTimeStr,'width:120px;','text')+'</td>';
        //html +='<td>'+data.has_food_image+'</td>';
        html +='<td>'+getInputHtml('has_food_image',data.has_food_image,'width:80px;','text')+'</td>';
        html +='<td>'+getInputHtml('status',post_status_map[data.status],'width:60px;','text')+'</td>';
        var content = data.content
        var show_content = content
        if(content != null && content.length > 50){
            content = content.substr(0,50)+'...';
        }
        var image_html = ''
        if(data.image!=null){
            image_html +='<img src="'+data.image+'" class="zoomable-image" style="">'
        }
        html +='<td>'+getInputHtml('status_name',image_html+content,'width:80px;','text')+'</td>';
        html +='<td>'+getInputHtml('data_location',data.remarks,'width:80px;','text')+'</td>';

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
    var curentTr = jQuery(obj).parents('tr')[0];

    var id = jQuery(jQuery('[attrname="id"]',curentTr)[0]).val();
    var message = '查看详情'+id
    var row_data = page_row_data_map[id]

    var title = '推文'
    var dialogId = 'dialog_detail_id'

    jQuery("#dialog_detail").empty();
    jQuery("#dialog_detail").append('<div id="'+dialogId+'" title="'+title+'" style="display: none">'+title+'</div>')
    var dialog = jQuery('#'+dialogId);
    //查询详情页数据
    var url = detailUri+'?id='+id;
    var data = {};
    var post_detail = {}
    /**
    $.ajax({
        type: "GET", async : false,url: url,dataType: "json",data: data,
        beforeSend: function(xhr) {
            xhr.setRequestHeader("token", token);
        },
        success: function(respone){
            console.log(respone);
            if(respone.data!=null){
                var data1 = respone.data;
                post_detail = data1
            }
        },
        error: function(data){ console.log(data);} ,
    });
     */

    dialog.load("postDetail.html", function() {
        console.log('post_detail = ',post_detail)
        loadDetailPage(dialog,row_data,post_detail)
    });


    dialog.dialog({
        width : 1000,height: 680,modal: false,
        close: function(){
            dialog.dialog('destroy');
            jQuery("#dialog_load").empty();
            jQuery("#dialog_detail").empty();
        },
        buttons: {
        }
    });
}

function loadDetailPage(dialog,row_data,post_detail) {
    var config = {}
    var task_type = ''
    if (row_data != null) {
        var analyze_result_data = row_data.analyze_result_data;
        var reply = '';
        if(analyze_result_data!=null){
            reply = analyze_result_data.tweet;
        }
        if(reply == null){
            reply = '';
        }

        jQuery("#user_id").html(row_data.user_name)
        jQuery("#link_id").html(row_data.url)
        jQuery("#content_id").html(row_data.content)
        jQuery("#post_image_id").attr('src',row_data.image)

        jQuery("#reply_id").html(reply)


    } else {
        return
    }
}