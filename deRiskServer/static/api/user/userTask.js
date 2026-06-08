



function detail(obj) {
    var curentTr = jQuery(obj).parents('tr')[0];

    var id = jQuery(jQuery('[attrname="id"]',curentTr)[0]).val();
    var message = '查看详情'+id
    row_data = page_row_data_map[id]

    var title = '任务详情'
    var dialogId = 'dialog_detail_id'

    jQuery("#dialog_detail").empty();
    jQuery("#dialog_detail").append('<div id="'+dialogId+'" title="'+title+'" style="display: none">'+title+'</div>')
    var dialog = jQuery('#'+dialogId);
    //查询详情页数据
    var url = detailUri+'?id='+id;
    var data = {};
    var task_detail = {}
    $.ajax({
        type: "GET", async : false,url: url,dataType: "json",data: data,
        beforeSend: function(xhr) {
            xhr.setRequestHeader("token", token);
        },
        success: function(respone){
            console.log(respone);
            if(respone.data!=null){
                var data1 = respone.data;
                task_detail = data1
            }
        },
        error: function(data){ console.log(data);} ,
    });

    dialog.load("/static/api/user/taskDetail.html", function() {
        console.log('task_detail = ',task_detail)
        loadDetailPage(dialog,row_data,task_detail)
    });


    dialog.dialog({
        width : 1000,height: 580,modal: false,
        close: function(){
            dialog.dialog('destroy');
            jQuery("#dialog_load").empty();
            jQuery("#dialog_detail").empty();
        },
        buttons: {
        }
    });
}

function loadDetailPage(dialog,row_data,task_detail){
    var config = {}
    var task_type = ''
    if(row_data!=null){
        task_type = row_data.task_type
        var configStr = row_data.config
        config = StringToJson(configStr)

    }else{
        return
    }
    var id = row_data.id
    var platforms = config.platforms
    var datas = config.datas
    console.info(row_data,config)
    if(platforms!=null && platforms.length>0){
        for(var i=0;i<platforms.length;i++){
            var platformData = platforms[i];
            var platform_div = jQuery("#platform_item_div")
            var new_platform_div = platform_div.clone()
            new_platform_div.attr('id','platform_item_div'+id)
            var parent_div = platform_div.parent()
            jQuery(parent_div).append(new_platform_div)
            platform_div.hide();

            new_platform_div.find('[name="platform"]').html(platformData.platform)
            new_platform_div.find('[name="platformLinks"]').html(platformData.platformLinks)
        }
    }

    jQuery("#entity_div").hide();
    jQuery("#address_div").hide();

    if(task_type == 'address'){
        if(datas!=null && datas.length==1) {
            var networkAddress = datas[0]
            dialog.find('[name="network"]').html(networkAddress.network+' | ')
            dialog.find('[name="address"]').html(networkAddress.address)
        }
        jQuery("#address_div").show();
    }else if(task_type == 'entity'){
        if(datas!=null && datas.length==1) {
            var entitys = datas[0]
            dialog.find('[name="network_entity_data"]').html(entitys.entity)
            jQuery("#entity_div").show();
        }
    }
    jQuery("#downloadDataId").attr('data_id',id);
    if(datas!=null && datas.length>1) {
        jQuery("#downFileId").show();
    }else{
        jQuery("#downFileId").hide();
    }

    jQuery("#total_count_id").html(task_detail.count)
    jQuery("#total_count_id2").html(task_detail.count)
    jQuery("#address_tags_id").hide();
    jQuery("#entity_tags_id").hide();

    if(task_detail!=null && task_detail.task_items!=null){
        if(task_type == 'address'){
            address_tags = task_detail.address_tags
            html = ''

            for(var i=0;i<address_tags.length;i++) {
                rowNumber = i+1
                var address_tag = address_tags[i];
                html +=create_detail_row(address_tag,rowNumber);
            }
            jQuery('#addressTbody').html(html)
            jQuery("#address_tags_id").show();
        }else{

            jQuery("#entity_tags_id").show();
        }

    }
}

function create_detail_row(data,rowNumber){
    var html = ''
    html +='<td>'+rowNumber+'</td>';
    html +='<td>'+getInputHtml('platform',data.platform,'width:80px;','text')+'</td>';
    html +='<td>'+getInputHtml('network',data.network,'width:80px;','text')+'</td>';

    html +='<td>'+'<a href="'+data.url+'" target="_blank" style="color: #2fa4e7">'+data.address+'</a>'+'</td>';
    var statusName = ''
    if(data.status == 1){
        statusName = ''
    }else if(data.status == 2){
        statusName = 'success'
    }else if(data.status == 2){
        statusName = 'fail'
    }
    html +='<td>'+getInputHtml('status',statusName,'width:80px;','text')+'</td>';

    html +='<td>'+getInputHtml('tags',data.tags,'width:200px;','text')+'</td>';
    html +='<td>'+getInputHtml('remarks',data.remarks,'width:80px;','text')+'</td>';
    return html;
}

function downloadFile(obj){
    var id = jQuery(obj).attr('data_id')
    var row_data = page_row_data_map[id]
    var task_type = ''
    var config = {}
    if(row_data!=null){
        task_type = row_data.task_type
        var configStr = row_data.config
        config = StringToJson(configStr)

    }else{
        return
    }
    var platforms = config.platforms
    var datas = config.datas

    const book = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(datas);
    XLSX.utils.book_append_sheet(book, sheet);
    XLSX.writeFile(book, 'data.xlsx');

}
function openAddDialog(obj, task_type, task_num){
    title = (task_num>1?'批量':'单个')+'新增'+(task_type=='address'?'地址Address':'实体Entity')+''
    console.log(title,'')
    var dialogId = 'dialog'
    var dialogParentId = 'dialog_load'

    var dialogParent = jQuery("#"+dialogParentId)
    dialogParent.empty();
    dialogParent.append('<div id="'+dialogId+'" title="'+title+'" style="display: none">'+title+'</div>')
    var dialog = jQuery('#'+dialogId);
    dialog.load("/static/api/user/addTask.html", function() {
        dialog.dialog({
            width : 1000,height: 580,modal: false,
            close: function(){
                dialog.dialog('destroy');
                dialogParent.empty();
            },
            buttons: [
                {
                    text: "Subbmit",
                    click: function() {
                        subbmitData(this,task_type,task_num)
                        //$( this ).dialog( "close" );
                    }
                },
                {
                    text: "Cancel",
                    click: function() {
                        $( this ).dialog( "close" );
                    }
                }
            ]
        });
        loadAddPage(dialogParent,dialog,task_type,task_num)
    });
}

function subbmitData(obj, task_type,task_num){

    rowDatas = []
    var rows = jQuery('#platformId_div').find('.control-group')
    for(var i = 0; i <rows.length; i++){
        row = rows[i]
        platform = jQuery(row).find('[name="platforms"]').val()
        platformLinks = jQuery(row).find('[name="platformLinks"]').val()
        rowData = {'platform':platform,'platformLinks': platformLinks}
        rowDatas.push(rowData)
    }

    config = {}
    if(task_type == 'address'){

        if(task_num == 1){
            network = jQuery('#single_address_id').find('[name="network"]').val()
            address = jQuery('#single_address_id').find('[name="networkAddress"]').val()
            if(address == null || address == ''){
                alertx('请录入地址');
                return
            }
            config = {"platforms": rowDatas, "datas":[{"network": network, "address": address}]}
        }else{
            network_address_data_str = jQuery('#bulk_address_id').find('[name="network_address_data"]').val()
            network_address_datas = StringToJson(network_address_data_str);
            if(network_address_datas == null || network_address_datas.length == 0){
                alertx('请上传有效数据文件');
                return
            }
            config = {"platforms": rowDatas, "datas": network_address_datas}
        }
    }else{
        if(task_num == 1){
            entity = jQuery('#single_entity_id').find('[name="entity"]').val()
            if(entity == null || entity == ''){
                alertx('请选择entity');
                return
            }
            config = {"platforms": rowDatas, "datas":[{"entity": entity}]}
        }else{
            network_entity_data_str = jQuery('#bulk_entity_id').find('[name="network_entity_data"]').val()
            network_entity_datas = StringToJson(network_entity_data_str);
            if(network_entity_datas == null || network_entity_datas.length == 0){
                alertx('请上传有效数据文件');
                return
            }
            config = {"platforms": rowDatas, "datas": network_entity_datas}
        }
    }

    console.info('save address config = ',config)
    if(userId == null){
        userId = ''
    }
    if(username == null){
        username = ''
    }
    data = {'task_type':task_type,"creator": userId,"creator_name": username,'config': JSON.stringify(config)}

    ajaxSave(obj,data)

}

function ajaxSave(obj,data){
    var url = urlSave + '?rk='+Math.random();
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

function loadAddPage(dialogParent,dialog,task_type,task_num){
    selectData = selectDataMap;
    address_platforms = selectData['platforms']
    networks = selectData['networks']

    entity_platforms = selectData['entity_platforms']
    entitys = selectData['entitys']

    platforms = []
    if('address' == task_type){
        platforms = address_platforms;
        if(task_num == 1){
            jQuery('#single_address_id').show();
            loadSelectData('networkId',networks)
        }else{
            jQuery('#bulk_address_id').show();
            loadUploadArea();
        }

    }else{
        platforms = entity_platforms;
        if(task_num == 1){
            jQuery('#single_entity_id').show();
            loadSelectData('entityId',entitys)
        }else{
            jQuery('#bulk_entity_id').show();
            loadUploadArea();
        }
    }

    platforms_map = {}
    for(var i=0;i<platforms.length;i++) {
        var platform1 = platforms[i];
        platforms_map[platform1.id] = platform1
    }

    loadSelectData('platformId',platforms)
    jQuery('select[name="platforms"]').change(function() {
        var value = this.value
        var platform = platforms_map[value]
        jQuery(this).parent().find('[name="platformLinks"]').val(platform['url'])
    });


}
function delPlatforms(obj){
    selectObj = jQuery(obj).parent().parent()
    selectObj.remove()
}
function addPlatforms(obj){
    selectObj = jQuery(obj).parent().parent()
    selectObj.find('select').select2('destroy');

    newSelectObj = jQuery(selectObj[0]).clone()
    newSelectObj.find('#delPlatforms').show();
    newSelectObj.find('select').attr('id','platformId_'+Math.pow(10,16)*Math.random())
    //newSelectObj.find('select').select2();
    areaObj = jQuery(selectObj).parent()
    jQuery(areaObj).append(newSelectObj)

    jQuery('select[name="platforms"]').change(function() {
        var value = this.value
        var platform = platforms_map[value]
        jQuery(this).parent().find('[name="platformLinks"]').val(platform['url'])
    });

}
function loadSelectData(selectId,selectDatas){
    if(selectDatas == null){
        console.info("datas is null");
        return ;
    }
    var html = '<option value="">--请选择--</option>';
    for(var i=0;i<selectDatas.length;i++){
        var data = selectDatas[i];
        html +='';
        html +='<option value="'+data.id+'">';
        html +=''+data.name+ '';
        html +='</option>';
    }
    jQuery("#"+selectId).html(html);
    jQuery("select").select2();

}


function loadUploadArea(){
    var dropzone = document.getElementById('dropzone');
    loadDropzone(dropzone,'address')
    jQuery(dropzone).click(function(){
        jQuery("#file1").click();
    });
    jQuery("#file1").change(function(){
        files = this.files
        handleFiles(files,'address')
    })

    const dropzone2 = document.getElementById('dropzone2');

    loadDropzone(dropzone2,'entity')
    jQuery(dropzone2).click(function(){
        jQuery("#file2").click();
    });
    jQuery("#file2").change(function(){
        files = this.files
        handleFiles(files,'entity')
    })


}

function loadDropzone(dropzone,task_type){

    dropzone.addEventListener('dragenter', dragEnterHandler);
    dropzone.addEventListener('dragover', dragOverHandler);
    dropzone.addEventListener('dragleave', dragLeaveHandler);
    dropzone.addEventListener('drop', dropHandler);

    function dragEnterHandler(e) {
        e.preventDefault();
        // 在拖动元素进入指定区域时，取消默认行为，并添加视觉效果（例如改变背景色）
        dropzone.style.backgroundColor = '#f2f2f2';
    }

    function dragOverHandler(e) {
        e.preventDefault();
        // 在拖动元素在指定区域内移动时，同样取消默认行为
    }

    function dragLeaveHandler(e) {
        // 在拖动元素离开指定区域时，移除视觉效果
        dropzone.style.backgroundColor = '';
    }

    function dropHandler(e) {
        e.preventDefault();
        // 在拖动元素释放时，取消默认行为，获取拖动的文件列表
        const files = e.dataTransfer.files;

        // 进行文件上传等后续操作
        handleFiles(files,task_type);

        // 恢复默认视觉效果
        dropzone.style.backgroundColor = '';
    }
}


function handleFiles(files,task_type) {
    // 在这里可以进行文件上传等后续操作
    // 遍历文件列表，处理每个文件
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // 读取文件内容，上传到服务器等
        console.log('文件名：', file.name);
        console.log('文件大小：', file.size);
        console.log('文件类型：', file.type);
    }

    const file = files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});

        // 读取第一个工作表
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        var total = json.length;

        // 处理 JSON 数据
        console.log(task_type,'total',total,'datas = ',json);
        if(task_type == 'address'){
            datas = []
            if(total > 0){
                for (let i = 0; i < json.length; i++) {

                    var rowData = json[i]
                    if (rowData['Network']!=null){
                        rowData['network'] = rowData['Network']
                    }
                    if (rowData['Address']!=null){
                        rowData['address'] = rowData['Address']
                    }

                    if(rowData['network'] == null || rowData['address'] == null){
                        continue;
                    }
                    datas.push( {'network':rowData['network'] ,'address':rowData['address']} )
                }

            }
            var filedataHtml = '文件名：'+ file.name+", 总数量："+datas.length+"行"

            jQuery("#network_address_data").val(JSON.stringify(datas))
            jQuery('#file1data').html(filedataHtml)
        }else if(task_type == 'entity'){
            datas = []
            if(total > 0){
                for (let i = 0; i < json.length; i++) {

                    var rowData = json[i]
                    if (rowData['Entity']!=null){
                        rowData['entity'] = rowData['Entity']
                    }

                    if(rowData['entity'] == null){
                        continue;
                    }
                    datas.push( {'entity':rowData['entity']} )
                }

            }
            var filedataHtml = '文件名：'+ file.name+", 总数量："+datas.length+"行"
            jQuery("#network_entity_data").val(JSON.stringify(datas))
            jQuery('#file2data').html(filedataHtml)
        }

    };
    reader.readAsArrayBuffer(file);
}

function cancelTask(obj,status){
    var ids = [];
    if (obj != null) { //单个
        var curentTr = jQuery(obj).parents('tr')[0];

        var id = jQuery(jQuery('[attrname="id"]',curentTr)[0]).val();
        var param = { id : id };
        var url = cancelUri+'?id='+id;
        // url = runUri;
        $.ajax({
            type: "POST",
            url: url,
            //dataType: "json",
            data: param,
            beforeSend: function(xhr) {
                xhr.setRequestHeader("token", token);
            },
            success: function(respone){
                console.log(respone);
                var retData = respone.data;

                var message = retData;
                if (retData == null){
                    message = respone.message
                }

                jQuery("#messageId").html(message);
                showTip(message);
                query();

            },
            error: function(data){ console.log(data);} ,
        });
    }
}
function runConfig(obj,status){
    var ids = [];
    if (obj != null) { //单个
        var curentTr = jQuery(obj).parents('tr')[0];

        var id = jQuery(jQuery('[attrname="id"]',curentTr)[0]).val();
        var param = { id : id };
        var url = runUri+'?id='+id;
        // url = runUri;
        $.ajax({
            type: "POST",
            url: url,
            //dataType: "json",
            data: param,
            beforeSend: function(xhr) {
                xhr.setRequestHeader("token", token);
            },
            success: function(respone){
                console.log(respone);
                var retData = respone.data;

                var message = retData;
                if (retData == null){
                    message = respone.message
                }

                jQuery("#messageId").html(message);
                showTip(message);
                query();

            },
            error: function(data){ console.log(data);} ,
        });
    }
}
function loadSelectInfo(){
    var url = baseUri;
    var data = {};
    $.ajax({
        type: "GET",url: url,dataType: "json",data: data,
        beforeSend: function(xhr) {
            xhr.setRequestHeader("token", token);
        },
        success: function(respone){
            console.log(respone);
            if(respone.data!=null){
                var data1 = respone.data;
                selectDataMap = data1
            }
        },
        error: function(data){ console.log(data);} ,
    });
}


function query(){
    var selectValue = jQuery("#selectId").val();
    loadConfigInfo(selectValue);
    jQuery("#selectValueId").html(selectValue);
}
function add(obj){
    var html = "";
    var  datas = [{}];
    var opt = 'add';
    for(var i=0;i<datas.length;i++){
        var data = datas[i];
        html+=createRowHtml(data,opt,i);
    }
    jQuery("#lessonTbody").append(html);
}

function loadConfigInfo(selectValue){
    page(current_page_no,current_page_size,selectValue)
}

function page(pageNo,pageSize,selectValue){

    var url = urlFindList;
    var data = {status : selectValue,pageNo: pageNo, pageSize : pageSize};
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

    //加载table
    var html = "";
    for(var i=0;i<datas.length;i++){
        var data = datas[i];
        html+=createRowHtml(data,'',i);
        page_row_data_map[data.id] = data
    }
    jQuery("#lessonTbody").html(html);

    //加载page
    current_page_no = page.pageNo
    current_page_size = page.pageSize
    html_page = getPageHtml(page.pageNo,page.pageSize,page.count)
    jQuery("#pagination_div").html(html_page);
}

function createRowHtml(data,opt,index){
    var html = "";
    if(data!=null){
        var createTimeStr = "";
        if(data.gmtCreate!=null){
            createTimeStr =DateFormat(new Date(data.gmtCreate),"yyyy-MM-dd HH:mm:ss");
        }
        html +='<tr id="tr_'+data.id+'">';
        html +='<td style="text-align:center;">';
        html +='<input type="checkbox" name="sort" attrname="sort" value="">';
        html +='<input type="hidden" attrname="id" value="'+data.id+'"/>';
        html +='</td>';
        html +='<td style="text-align:center;">'+(index+1)+'</td>';

        //html +='<td>'+getInputHtml('id',data.id,'width:30px;')+'</td>';

        html +='<td>'+createTimeStr+'</td>';
        html +='<td>'+data.creator_name+'</td>';
        html +='<td>'+getInputHtml('task_type',data.task_type,'width:80px;','text')+'</td>';
        //html +='<td>'+getInputHtml('creator_name',data.creator_name,'width:100px;')+'</td>';

        html +='<td>'+getInputHtml('status_name',data.status_name,'width:80px;','text')+'</td>';


        html +='<td>'+getInputHtml('data_location',data.data_location,'width:80px;','text')+'</td>';
        var statics = ''
        if(data.count!=null && data.count!=''){
            statics = '有效地址数量'+data.count+'个'
        }else if(data.count+''=='0'){
            statics = '有效地址数量'+data.count+'个'
        }
        html +='<td>'+getInputHtml('count',statics,'width:80px;','text')+'</td>';

        //html +='<td>'+getInputHtml('data_location',data.data_location,'width:300px;')+'</td>';
        //html +='<td>'+getInputHtml('count',data.count,'width:100px;')+'</td>';


        html +='<td>';
        html +='<input class="btnMini btn-primary btn"  value="详情" onclick="detail(this)"/> ';

        if(opt!=null && (opt == 'add' || opt == 'copy')){
            html +='<input class="btnMini btn-primary btn"  value="删除" onclick="del(this)"/>';
        }
        // 状态：1 未开始，2 进行中，3 已完成，4 执行失败，5 已取消
        if(data.status == 1 || data.status == 0){
            html +='<input class="btnMini btn-primary btn"  value="启动" onclick="runConfig(this,0)"/> ';
        }else if(data.status == 4){
            html +='<input class="btnMini btn-primary btn"  value="执行" onclick="runConfig(this,0)"/> ';
            //html +='<input class="btnMini btn-primary btn"  value="取消" onclick="cancel(this,1)"/> ';
        }
        if(data.status == 1 || data.status == 0 || data.status == 2 || data.status == 4){
            html +='<input class="btnMini btn-primary btn"  value="取消" onclick="cancelTask(this,1)"/> ';
        }

        //html +='<input class="btnMini btn-primary btn"  value="执行" onclick="runConfig(this,1)"/> ';

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


