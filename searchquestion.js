/**
 * Created by admin on 2014-10-21.
 */
$(function () {
    var checkedAll = $("#checkedAll");
    var checkedCancel = $("#checkedCancel");
    var pageNav = $('#pageNav');
    var questionList = $('#question-list');
    var checkBox = $(".checkBox");
    var showCheckedQuestionsBox = $('#showCheckedQuestionsBox');
    var showQuesCheck = $('#showQuesCheck');
    var quesCheck = showQuesCheck.find('.modal-body');
    var outQuestions = $(".outQuestions");
    var subjectType = $('#subjectType');
    var bookType = $('#bookType');
    var gradeType = $('#gradeType');
    var TextbookTree = $('#TextbookTree');
    var book = "";
    var checkedDataArr = [];
    var questionData = null;
    var indentFuheVal = 3;
    var indentVal = 3;

    var re = /(ftp|http(s)?\:\/\/)?([\s\S]*)(\.(swf|gif|jpg|bmp|jpeg|png))/gi;
    var reMath = /(\\\[)([\s\S]*)(\\\])/g;
    String.prototype.trim = function () {
        return this.replace(/^\s+|\s+$/g, "");
    };
    var user_data = $("#login_user").val();
    var login_user = JSON.parse(user_data);
    var qtypes = [];
    var grades = [];
    var subjects = [];
    //    获取所有学科
    $.get('/base/getAllSubject', function (data) {
        var subjec = JSON.parse(data);
        var sub = $('#subjectType');
        subjects.length = 0;
        $.each(subjec,
            function (index, item) {
                subjects.push(item);
                if (login_user.subject[0].name == '全科' || login_user.subject[0].name == item.subjectName) {
                    // if(login_user.subject == '全科' || login_user.subject.indexOf(item.subjectName)!=-1|| (item.subjectName.indexOf('高') != -1&& item.subjectName.indexOf(login_user.subject) !=-1&& login_user.stage.indexOf('高') != -1) ) {
                    sub.append("<span class='qsSubject' name='" + item.id + "'>" +
                        item.subjectName + "<input type='hidden' value='" + item.subjectCode + "' name='qsSubject'></span>");
                }
            });
        //  sub.find('span:first').trigger('click');
    });
//    获取所有学年
    $.get('/base/getAllGrade', function (data) {
        var grade = JSON.parse(data);

        grades.length = 0;
        $.each(grade,
            function (index, item) {
                grades.push(item);
                if (login_user.stage[0].name == '全学段'
                    || (login_user.stage[0].name.indexOf('小学') != -1 && item.stageCode == 1)
                    || (login_user.stage[0].name.indexOf('初中') != -1 && item.stageCode == 2 )
                    || (login_user.stage[0].name.indexOf('高中') != -1 && item.stageCode == 3)) {
                    gradeType.append("<span class='qsGrade' name='" + item.id + "' stageCode='" + item.stageCode + "'>" +
                        item.gradeName + "<input type='hidden' value='" + item.gradeCode + "' name='qsGrade'></span>");
                }
            });
        // gradeType.find('span:first').trigger('click');
    });
    subjectType.on('click', '.qsSubject', function () {
        if (gradeType.children('.qsGrade').hasClass('active')) {
            var subject = $(this).children('input').val();
            var grade = gradeType.children('.active').children('input').val();
            showTeaching(grade, subject);
        }
    });
    gradeType.on('click', '.qsGrade', function () {
        if (subjectType.children('.qsSubject').hasClass('active')) {
            var grade = $(this).children('input').val();
            var subject = subjectType.children('.active').children('input').val();
            showTeaching(grade, subject);
        }
    });
    // 显示教材版本
    function showTeaching(grade, subject) {
        var params = {
            grade: grade,
            subject: subject
        };
        $.post('/base/getAllBookType', params, function (data) {
            data = JSON.parse(data);
            if (data.length > 0) {
                var html = "";
                data.forEach(function (item, index) {
                    html += '<span class="qsBookType" >' + item.name + '<input type="hidden" value="' + item.code + '" name="qsBookType"></span>'
                });
                bookType.append(html);
            }
        });
    }

//添加筛选条件  题型 学科 完成度 日期 唯一 年级可多选
    $('.searchCondition span').live('click', function () {
        var condition = $('.condition-checked-content');
        $(this).addClass("active").siblings().removeClass("active");
        var classes = $(this).attr('class').replace(/\sactive/, "");
        var name = $(this).attr('name');
        var value = $(this).find('input').val();
        var text = $(this).html();
        //题型 学科 完成度 日期 唯一
        if (classes == 'qsType' || classes == 'qsSubject' || classes == 'qsComplete' || classes == 'qsTime' || classes == 'qsSize' || classes == 'qsModel' || classes == 'qsStar' || classes == 'qsValidate' || classes == 'qsStage' || classes == 'qsGrade' || classes == 'qsBookType') {
            condition.find("span").each(function () {
                if ($(this).attr('class') == classes) {
                    $(this).remove();
                }
            });
            if (classes == 'qsSubject' || classes == 'qsGrade') {
                zNodes = '';
            }
            if (classes == 'qsType') {
                //   setReading(value)
            }
            if (classes == 'qsStage') {
                var stageCode = $(this).children("input").val();
                gradeType.children("[stageCode=" + stageCode + "]").css("display", "inline-block");
                gradeType.children("[stageCode!=" + stageCode + "]").css("display", "none");
            }
        }
        //修改学科后获取该学科下的题型
        if (classes == 'qsSubject') {
            $('.condition-checked-content').find('.qsType').remove();
            $.post('/base/getAllQuestionTypeBySubjectCode', {subjectCode: $(this).find('input[name=qsSubject]').val()}, function (data) {
                if (data) {
                    data = JSON.parse(data);
                    var div = $('.condition-type-content');
                    div.empty();
                    qtypes.length = 0;

                    for (var i in data) {
                        if (data[i].enlargeType) {
                            qtypes.push(data[i]);
                            div.append('<span class="qsType">' + data[i].enlargeType + '<input type="hidden" name="type" value="' + data[i].questiontypeCode + '"><input type="hidden" name="enlargeId" value="' + data[i].id + '"></span>')
                        }
                    }
                }
            })
        }
        //如果选取阅读和完形 隐藏 学科和完成度条件
        function setReading(value) {
            if (value == 9 || value == 10 || value == 1 || value == 7 || value == 11 || value == 12) {
//                $('.condition-subject').hide();
                $('.condition-complete').hide();
//                $('.condition-checked-content .qsSubject').remove();
                $('.condition-checked-content .qsComplete').remove();
            } else {
//                $('.condition-subject').show();
                $('.condition-complete').show();
            }
        }

        var searchItem = $("<span class='" + classes + "' name='" + name + "'><i class='tip'>×</i></span>");
        searchItem.prepend(text);
        condition.append(searchItem);
    });
//    取消单个条件事件
    $('.condition-checked-content span i').live('click', function () {
        $(this).parent().remove();
    });
//重新筛选事件
    $('.recheck').live('click', function () {
        $('.condition-checked-content').empty();
        $('.condition-subject').show();
        $('.condition-complete').show();
        $('.questionPreview').find('span').removeClass('active');
    });

    //填充题型

    //填充完成度
    var qsComplete = [];
    qsComplete.push(qsComplete[4] = '已完成');
    qsComplete.push(qsComplete[2] = '未解析');
    qsComplete.push(qsComplete[1] = '知识点产生式未完成');
    qsComplete.push(qsComplete[3] = '未添加音频');
//    分页查题
    var isInitPagine = false;


    function searchquestion(params, cp) {
        if (!params.stageCode) {
            alert("学段不能为空");
            return;
        }
        if (!params.subjectFlag) {
            alert("学科不能为空");
            return;
        }
        if (!params.type) {
            alert("试题类型不能为空");
            return;
        }
        checkedAll.prop('checked', false);
        checkedCancel.prop('checked', false);
        params.cp = cp || 1;

        if (!params.iscompleted) delete params.iscompleted;
        var validate = false;
        if (params.qsValidate) {
            validate = params.qsValidate;
            delete params.qsValidate;
        }
        /*if(ctbCodeArr.length > 0){
         params.ctbCode = ctbCodeArr.join(',');
         } else {
         if(params.ctbCode) delete params.ctbCode;
         }*/
        $.post("/questionPreview/search", params, function (data) {
            if (data) {
                data = JSON.parse(data);
                questionData = data.beanData;
                if (questionData && questionData.length > 0) {
                    questionList.empty();
                    var itemListHtml = "";
                    $.each(questionData, function (i, q) {
                        itemListHtml += '<div class="question-item" title="双击显示答案和解析">';
                        if (q.components) {
                            // 标题
                            itemListHtml += '<p><span style="font-weight: bold;"><label class="title"><input type="checkbox" class="checkboxQustItem"/>' + q.title + '</label></span></p>';
                            // 题干
                            itemListHtml += '<p>' + filterHtml("<span>" + (i + 1) + "、</span>" + q.stem) + '</p>';
                            // 复合题
                            itemListHtml += '<div class="smallQuestion">';
                            q.components.forEach(function (item, index) {
                                itemListHtml += questionHtml(item, index + 1, "复合题");
                            });
                            itemListHtml += '</div>';
                        } else {
                            itemListHtml += questionHtml(q, i + 1);
                        }
                        itemListHtml += '</div>';
                    });
                    checkBox.css("display", "block");
                    questionList.append(itemListHtml);
                    pageNav.show();
                    pageNav.twbsPagination({
                        totalPages: data.countPage,
                        visiblePages: 7,
                        onPageClick: function (event, page) {
                            var pp = searchCondition(params.type);
                            pp.knowledges = params.id;
                            searchquestion(pp, page, questionList, pageNav);
                        }
                    });
                    inputChecked();
                } else {
                    addEmptyResult(questionList);
                    checkBox.css("display", "none");
                    pageNav.hide();
                }
            } else {
                addEmptyResult(questionList);
                checkBox.css("display", "none");
                pageNav.hide();
            }
        })
    }

    function questionHtml(q, index, fuhe, details) {
        var html = "";
        // 标题
        var title = details ? "" : '<label class="title"><input type="checkbox" class="checkboxQustItem"/>';
        if (!fuhe) html += '<p style="text-align: center;"><span style="font-weight: bold;">' + title + q.title + '</label></span></p>';
        // 题干
        var stemClassName = details ? ' class="stem"' : "";
        var questinIndex = index ? index : "1";
        var indent = fuhe ? 1 : 0;
        html += '<p' + stemClassName + ' style="indent: ' + indent + ';">' + filterHtml("<span>" + questinIndex + "、</span>" + q.stem) + '</p>';
        // 选项
        var ques_optionHtml = "";
        indent++;
        if (q.ques_option.substr(0, 1) === "[") {
            var quesOptions = JSON.parse(q.ques_option);
            quesOptions.forEach(function (item) {
                var key = "";
                if (item.optionKey) key = item.optionKey + "、";
                ques_optionHtml += filterHtml(key + item.optionValue, true, indent);
            });
        }
        /* else {
         ques_optionHtml += filterHtml(q.optionValue, true, indent);
         }*/
        html += '<div class="questionOption">' + ques_optionHtml + '</div>';
        // 答案
        var answerHtml = "";
        if (q.answer.substr(0, 1) == "[") {
            var answer = JSON.parse(q.answer);
            answer.forEach(function (item) {
                answerHtml += item.answerValue;
            });
        } else {
            answerHtml = q.answer;
        }
        html += '<div class="questionAnswer"><p style="indent: ' + indent + ';"><span style="color: #00a0e9;">答案：</span>' + filterHtml(answerHtml) + '</p></div>';
        // 解析
        if (q.ques_analyze) {
            html += '<div class="questionAnalyze"><p style="indent: ' + indent + ';"><span style="color: #00a0e9;">解析：</span>';
            var quesAnalyze = JSON.parse(q.ques_analyze);
            quesAnalyze.forEach(function (item, i) {
                var key = "";
                if (item.analyzeKey) key = item.analyzeKey + "、";
                if (i == 0) {
                    html += filterHtml(key + item.analyzeValue) + '</p>';
                } else {
                    html += filterHtml(key + item.analyzeValue, i, indent);
                }
            });
            html += '</div>';
        }
        return html;
    }

    pageNav.go = function (p, pn, is) {
        // $("#pageNav").html(this.nav(p, pn));
        $(".cp").val(p);
        if (!is) {
            keywordsCondition(p);
        }

    };
    pageNav.hide();
    function showPage(countPage, is) {
        pageNav.pre = "上一页";
        pageNav.next = "下一页";
        pageNav.go(1, countPage, is);
        pageNav.show();
    }


    //没有搜索时结果显示的内容
    function addEmptyResult(questionList) {
        var questionItem = $("<div class='question-item' style='text-align: center'></div>");
        var questionItemText = $("<div class='question-item-text' style='margin:70px auto auto 50px'><p style='text-align: center'><label class='label' style='font-size: 20px;line-height: 22px'>没有匹配的搜索结果！请尝试其他搜索条件！</label></p></div>");
        questionItem.append(questionItemText);
        questionList.append(questionItem);
    }

    var zNodes = '';
    //获取查询条件
    function searchCondition(type) {
        var type = type;
        var enlargeId = $('.condition-checked-content input[name=enlargeId]').val();
        var subject = $('.condition-checked-content input[name=qsSubject]').val();
//         if(type==10||type==11){
//             subject = "英语";
//         }
        var grade = [];
        var gradeItem = $('.condition-checked-content input[name=qsGrade]');
        if (gradeItem) {
            gradeItem.each(function () {
                grade.push($(this).val());
            });
        }
        var isComplete = $('.condition-checked-content input[name=qsComplete]').val() || 0;
        var qsTime = $('.condition-checked-content input[name=qsTime]').val();
        var qsSize = $('.condition-checked-content input[name=qsSize]').val() || 5;
        var qsValidate = $('.condition-checked-content input[name=qsValidate]').val();
        var qsStar = $('.condition-checked-content input[name=qsStar]').val();
        var quStage = $('.condition-checked-content input[name=qsStage]').val();
        var startTime;
        var endTime;
        if (qsTime == 1) {    //当日
            startTime = new Date().setDate(new Date().getDate() - 1);
            endTime = new Date().getTime();
        } else if (qsTime == 2) {  //近三日
            startTime = new Date().setDate(new Date().getDate() - 3);
            endTime = new Date().getTime();
        } else if (qsTime == 3) {   //近一周
            startTime = new Date().setDate(new Date().getDate() - 7);
            endTime = new Date().getTime();
        } else if (qsTime == 4) {     //近一月
            startTime = new Date().setMonth(new Date().getMonth() - 1);
            endTime = new Date().getTime();
        } else if (qsTime == 5) {     //金三月
            startTime = new Date().setMonth(new Date().getMonth() - 3);
            endTime = new Date().getTime();
        } else if (qsTime == 6) {        //近半年
            startTime = new Date().setMonth(new Date().getMonth() - 6);
            endTime = new Date().getTime();
        }
        var gradeCode = grade.join(',');
        if (gradeCode.length == 0) {
            gradeCode = undefined;
        }
        //   console.log(qsStar)
        var params = {
            qsValidate: qsValidate,
            stageCode: quStage,
            type: type,
            pageSize: qsSize,
            enlargeId: enlargeId,
            //knowledges:'',
            //productions:'',
            difficultStar: qsStar,
            gradeCode: gradeCode,
            subjectFlag: subject,
            iscompleted: isComplete,
            startTime: startTime,
            endTime: endTime
        };
        return params;
    }

    function getData() {
        var bookTypeCode = $('.condition-checked-content input[name=qsBookType]').val();
        var subjectCode = $('.condition-checked-content input[name=qsSubject]').val();
        var gradeCode = $('.condition-checked-content input[name=qsGrade]').val();
        return {
            subjectCode: subjectCode,
            gradeCode: gradeCode,
            booktypeCode: bookTypeCode
        };
    }

    //获取查询的关键字
    function keywordsCondition(cp) {
        //获取检索条件的题型 如果不选默认是单选题
        var type = $('.condition-checked-content input[name=type]').val();
        //获取按关键字检索时的类型
        var keywords = $('.keywords input:checked');
        //获取关键字
        var inputvalue = $('.search-query').val().trim();
        //如果选择了关键字查询 并且输入了关键字
        if (keywords && inputvalue) {
            var key = keywords.val();
            if (key == 1 && inputvalue.length == 32) {       //按code查询
                var quStage = $('.condition-checked-content input[name=qsStage]').val();
                var subject = $('.condition-checked-content input[name=qsSubject]').val();
                var enlargeId = $('.condition-checked-content input[name=enlargeId]').val();
                var params = {
                    stageCode: quStage,
                    type: type,
                    enlargeId: enlargeId,
                    subjectFlag: subject,
                    id: inputvalue
                };

                checkedDataArr = [];
                searchquestion(params);
                pageNav.hide();
            } else if (key == 2) {                        //按知识点查询
                var params = searchCondition(type);
                params.knowledges = inputvalue;
                params.cp = cp || 1;
                checkedDataArr = [];
                searchquestion(params);
            } else if (key == 3) {                        //按产生式查询
                params = searchCondition(type);
                params.productions = inputvalue;
                params.cp = cp || 1;
                checkedDataArr = [];
                searchquestion(params);
            } else if (key == 4) {                        //按产生式查询
                params = searchCondition(type);
                params.title = inputvalue;
                params.cp = cp || 1;
                checkedDataArr = [];
                searchquestion(params);
            } else if (key == 5) {                        //按产生式查询
                params = searchCondition(type);
                params.stem = inputvalue;
                params.cp = cp || 1;
                checkedDataArr = [];
                searchquestion(params);
            } else {
                alert('请检查所选关键字类型和输入的关键字！如果是code长度应该是32位！')
            }
            //如果没选择关键字查询 按筛选条件查询
        } else {
            params = searchCondition(type);
            params.cp = cp || 1;
            checkedDataArr = [];
            searchquestion(params);
        }
    }

    //触发查询事件
    $('.searchBtn').click(function () {
        isInitPagine = false;
        keywordsCondition();
        var params = getData();
        if (params.booktypeCode && book !== params.booktypeCode) {
            showTextbookTree(params);
            book = params.booktypeCode;
        }
        return false;
    });
//删除错题事件
    $('.item-img-del').live('click', function () {
        var code = $(this).parent('.question-item').find('input[name=code]').val();
        var subject = $(this).parent('.question-item').find('input[name=subject]').val();
        var item = $(this).parent('.question-item');
        // if(window.confirm('是否确认删除！')){
        $.post('/question/delByCode', {code: code, subject: subject}, function (data) {
            var obj = JSON.parse(data);
            if (obj.status == '200') {
                //alert("删除成功！");
                item.remove();
            } else {
                alert("删除失败！");
            }
        })
        //}else{
        //    return false;
        //}
    });

    // 全选
    checkedAll.on("change", function () {
        checkedCancel.prop('checked', false);
        var checks = questionList.find(".checkboxQustItem");
        if ($(this).prop("checked")) {
            checks.each(function (index, item) {
                item = $(item);
                if (!item.prop('checked')) {
                    item.prop("checked", true);
                    item.trigger('change');
                }
            });

        } else {
            checks.each(function (index, item) {
                item = $(item);
                if (item.prop('checked')) {
                    item.prop("checked", false);
                    item.trigger('change');
                }
            });
        }
    });
    // 反选
    /* checkedCancel.on("change", function () {
     checkedAll.prop('checked', false);
     var checks = questionList.find(".checkboxQustItem");
     var data = null;
     var title = "";
     if ($(this).prop("checked")) {
     checks.each(function (index, item) {
     item = $(item);
     if (item.prop("checked")) {
     item.prop("checked", false);
     item.trigger('change');
     } else {
     item.prop("checked", true);
     item.trigger('change');
     }
     });
     }
     });*/
    // 显示试题答案和解析
    questionList.on("dblclick", ".question-item", function (e) {
        e.stopPropagation();
        var self = $(this);
        var questionAnswer = self.find(".questionAnswer");
        if (questionAnswer) {
            if (questionAnswer.css("display") == "block") {
                self.find(".questionAnswer").hide();
                self.find(".questionAnalyze").hide();
            } else {
                self.find(".questionAnswer").show();
                self.find(".questionAnalyze").show();
            }
        } else {
            questionAnswer = self.children(".questionAnswer");
            if (questionAnswer.css("display") == "block") {
                self.children(".questionAnswer").hide();
                self.children(".questionAnalyze").hide();
            } else {
                self.children(".questionAnswer").show();
                self.children(".questionAnalyze").show();
            }
        }
    });
    // 显示试题
    showCheckedQuestionsBox.on('click', function () {
        var html = '<ul>';
        if (checkedDataArr.length > 0) {
            checkedDataArr.forEach(function (item, index) {
                html += '<li title="双击显示答案和解析">';
                if (item.components) {
                    // 题干
                    html += '<p>' + filterHtml("<span class=\"questionIndex\">" + (index + 1) + "、</span>" + item.stem) + '</p>';
                    item.components.forEach(function (q, i) {
                        html += questionHtml(q, i + 1, true, true);
                    });
                } else {
                    html += questionHtml(item, index + 1, false, true);
                }
                html += '<div class="quesBtn"><button type="button" class="btn btn-primary deleteQuestion">删除</button></div>';
                html += '</li>';
            });
        } else {
            html = "请先去添加试题";
        }
        quesCheck.empty();
        quesCheck.append(html);
    });
    // 显示选项答案解析
    quesCheck.on('dblclick', 'li', function () {
        var self = $(this);
        if (self.children('p').eq(1).attr('class') == 'stem') {
            self.find('.questionOption').show();
            self.find('.questionAnalyze').show();
            self.find('.questionAnswer').show();
            self.children('p').eq(1).removeClass('stem');
        } else {
            self.find('.questionOption').hide();
            self.find('.questionAnalyze').hide();
            self.find('.questionAnswer').hide();
            self.children('p').eq(1).addClass('stem');
        }
    });
    // 添加试题
    questionList.on('change', '.checkboxQustItem', function (e) {
        var self = $(this);
        var title = self.parent().text();
        if (self.prop("checked")) {
            for (var i = 0; i < questionData.length; i++) {
                if (questionData[i].title == title) {
                    checkedDataArr.push(questionData[i]);
                    break;
                }
            }
        } else {
            for (var i = 0; i < checkedDataArr.length; i++) {
                if (checkedDataArr[i].title == title) {
                    checkedDataArr.splice(i, 1);
                    break;
                }
            }
        }
    });
    // 字符串支持导出word
    function filterHtml(html, questionIndex, indentVal) {
        html = html.replace(/http:\/\/.+?\.(png|jpg|jpeg|gif)/g, function (url) {
            return '<img src="' + url + '"/>';
        });
        if (questionIndex) {
            if (indentVal == 0) {
                html = "<p>" + html + "</p>";
            } else {
                html = "<p style=\"indent: " + indentVal + ";\">" + html + "</p>";
            }
        }
        return html;
    }

    // filterDate
    function filterDate(html) {
        // 样式过滤
        html = html.replace(/<div.*?>/g, "").replace(/<\/div>/g, "");
        html = html.replace(/<label.*?>/g, "");
        html = html.replace(/<\/label>/g, "");
        html = html.replace(/<input.+?>/g, "");
        return html;
    }

    // 生成随机数
    function randomNum() {
        var str = 'ABCDEFG1234567890';
        var outStr = '';
        var random;
        for (var i = 0; i < 6; i++) {
            random = Math.floor(Math.random() * str.length);
            outStr += str.substr(random, 1);
        }
        return outStr;
    }

    // 导出多个word
    outQuestions.on("click", function () {
        // 列表缩进随机数
        var itemRandomStr = '',
            questionRandomStr = '';
        if ($(this).text() === 'word导出中') return;
        var fileName = prompt("请输入导出word文件名");
        if (fileName) {
            var params = {
                evalStr: 'var pObj = null;',
                imgUrl: [],
                fileName: encodeURI(fileName),
                leng: 0
            };
            itemRandomStr = randomNum();
            checkedDataArr.forEach(function (item, index) {
                var html = "";
                if (!item.components) {
                    // 题干
                    html += '<p style="lists: ' + itemRandomStr + ' 一、 0;">' + filterHtml("<span>" + (index + 1) + "、</span>" + item.stem) + '</p>';
                    // 选项
                    var ques_optionHtml = "";
                    if (item.ques_option.substr(0, 1) === "[") {
                        var quesOptions = JSON.parse(item.ques_option);
                        questionRandomStr = randomNum();
                        quesOptions.forEach(function (it) {
                            var key = "";
                            if (it.optionKey) key = it.optionKey + "、";
                            ques_optionHtml += '<p style="lists: ' + questionRandomStr + ' a) 1;">' + filterHtml(key + it.optionValue) + '</p>';
                        });
                        html += ques_optionHtml;
                    }
                }
                /*if (item.components) {
                 // 题干
                 html += '<p>' + filterHtml("<span class=\"questionIndex\">" + (index + 1) + "、</span>" + item.stem) + '</p>';
                 item.components.forEach(function (q, i) {
                 html += questionHtml(q, i + 1, true, true);
                 });
                 } else {
                 html += questionHtml(item, index + 1, false, true);
                 }*/
                html = filterDate(html);
                var outWord = new StrToOutWord(html);
                params.evalStr += outWord.str;
                if (outWord.imgUrl) params.imgUrl = params.imgUrl.concat(outWord.imgUrl);
                params.leng = index + 1;
            });
            if (params.evalStr === 'var pObj = null;') {
                alert("请选择试题");
                return;
            }
            if (params.imgUrl.length > 0) params.imgUrl = params.imgUrl.join(',');
            $(this).css('background', 'gray').text('word导出中');
            outWord(params);
        }
    });
    // 删除试题
    quesCheck.on('click', '.deleteQuestion', function () {
        var li = $(this).parents('li');
        var title = li.children('p').eq(0).text();
        for (var i = 0; i < checkedDataArr.length; i++) {
            if (checkedDataArr[i].title === title) {
                checkedDataArr.splice(i, 1);
                break;
            }
        }
        li.remove();
    });
    // 关闭模态框
    showQuesCheck.on('click', '.configExamBtn', function () {
        showQuesCheck.modal('hide');
        inputChecked();
    });
    var ctbCodeArr = [];
    // 显示教材树
    function showTextbookTree(params) {
        $.post('/booKnowledge/getAllKnowledge', params, function (data) {
            var setting = {
                check: {
                    enable: true,
                    chkStyle: "checkbox",
                    autoCheckTrigger: true,
                    chkboxType: {"Y": "ps", "N": "ps"},
                    radioType: "level"
                },
                view: {
                    dblClickExpand: false,
                    fontCss: getFont
                },
                data: {
                    simpleData: {
                        enable: true,
                        idKey: "ctbCode",
                        pIdKey: "parentCode"
                    },
                    key: {
                        name: 'knowledgeName'
                    }
                }
            };

            function getFont(treeId, node) {
                // return node.font ? node.font : {};
                var css = (!!node.highlight) ? {color: "#A60000", "font-weight": "bold"} : {
                    color: "#333",
                    "font-weight": "normal"
                };

                if (node.chk == '1') {

                    if (!node.highlight) css = {color: 'red', "font-weight": "normal"}
                    if (node.highlight) css = {color: "orange", "font-weight": "bold"}
                }
                return css;

            }

            var zNodes = JSON.parse(data);
            if (zNodes.length > 0) {
                TextbookTree.empty();
                $.fn.zTree.init(TextbookTree, setting, zNodes);
            } else {
                TextbookTree.html("<li>没有获取到数据</li>")
            }
        });
    }

    TextbookTree.on('click', 'span', function () {
        var self = $(this);
        var id = self.attr('id');
        if (/TextbookTree_\d+_check/.test(id)) {
            id = id.match(/^TextbookTree_\d+/)[0];
            var num = parseInt(id.match(/\d+/)[0]);
            var input = $('#TextbookTree_' + num + '_check');
            // 获取ctbcode
            var treeObj = $.fn.zTree.getZTreeObj("TextbookTree");
            var node = treeObj.getNodeByTId(id);
            // 选中
            if (input.hasClass('checkbox_false_full_focus')) {
                getFindCtbCode(node);
            } else {
                getFindCtbCode(node, 'out');
            }
            TextbookTree.find('.chk').trigger('mouseover');
            TextbookTree.find('.chk').trigger('mouseout');
            console.log(ctbCodeArr);
        }
    });
    function getFindCtbCode(node, out) {
        if (node.children && node.chk === '0') {
            node.children.forEach(function (item) {
                if (item.chk === '0') {
                    getFindCtbCode(item, out);
                } else if (item.children) {
                    item.children.forEach(function (it) {
                        if (out) {
                            for (var i = 0; i < ctbCodeArr.length; i++) {
                                if (ctbCodeArr[i] === it.ctbCode) {
                                    ctbCodeArr.splice(i, 1);
                                    break;
                                }
                            }
                        } else {
                            ctbCodeArr.push(it.ctbCode);
                        }
                    });
                }
            });
        } else if (node.chk === '1' && node.children) {
            node.children.forEach(function (it) {
                if (out) {
                    for (var i = 0; i < ctbCodeArr.length; i++) {
                        if (ctbCodeArr[i] === it.ctbCode) {
                            ctbCodeArr.splice(i, 1);
                            break;
                        }
                    }
                } else {
                    ctbCodeArr.push(it.ctbCode);
                }
            });
        } else {
            if (out) {
                for (var i = 0; i < ctbCodeArr.length; i++) {
                    if (ctbCodeArr[i] === node.ctbCode) {
                        ctbCodeArr.splice(i, 1);
                        break;
                    }
                }
            } else {
                ctbCodeArr.push(node.ctbCode);
            }
        }
    }

    // 试题input框是否选中
    function inputChecked() {
        var inputs = questionList.find('.checkboxQustItem');
        var title = questionList.find('.title');
        inputs.prop('checked', false);
        checkedDataArr.forEach(function (item) {
            for (var i = 0; i < title.length; i++) {
                if (item.title == title.eq(i).text()) {
                    inputs.eq(i).prop('checked', true);
                    break;
                }
            }
        });
    }

    // 导出word
    function outWord(params) {
        $.ajax({
            url: "/outWord",
            type: 'post',
            data: params,
            timeout: 10000 * params.leng,
            success: function (data) {
                if (data.msg === "success") {
                    location.href = "../outWord/" + decodeURI(params.fileName) + ".doc";
                } else {
                    console.log(data);
                }
                outQuestions.css("background", "#3388ff").text('导出word');
                questionList.find(".checkboxQustItem").prop('checked', false);
                checkedAll.prop('checked', false);
                checkedDataArr = [];
            },
            error: function (error) {
                console.log(error);
                if (error.statusText === 'timeout') {
                    alert(error.statusText);
                }
                outQuestions.css("background", "#3388ff").text('导出word');
            }
        });
    }

    // 公式测试
    /*var idLatex = document.getElementById('omml');
     var omml = $('#omml');
     $("#latex").on("input", function () {
     var self = $(this);
     var text = self.val();
     omml.html(text);
     if (/\\\(.+\\\)/g.test(self.val()) || /\\\[.+\\\]/g.test(self.val())) {
     MathJax.Hub.Queue(["Typeset", MathJax.Hub, idLatex]);
     }
     });

     $("#goLatex").on('click', function () {
     var params = {
     evalStr: '',
     imgUrl: [],
     leng: 0
     };
     var html = omml.html();
     html = filterDate(filterHtml(html, true, 0));
     var outOmml = new strToOutWord(html);
     params.evalStr = outOmml.str;
     params.imgUrl = params.imgUrl.concat(outOmml.imgUrl);
     params.leng = 1;
     if(params.imgUrl.length > 0){
     params.imgUrl = params.imgUrl.join(',');
     } else {
     params.imgUrl = '';
     }
     outWord(params);
     });*/
});