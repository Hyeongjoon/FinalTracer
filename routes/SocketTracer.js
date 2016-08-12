var express = require('express');
var router = express.Router();
var passport = require('../app.js').passport;
var async = require('async');
var author = require('../helper/authorize');
var userDAO = require('../model/UserDAO');
var belong_grDAO = require('../model/Belong_grDAO');
var alramDAO = require('../model/AlramDAO');
var decryptHelper = require('../helper/DecryptHelper');
var encryptHelper = require('../helper/EncryptHelper');
var EmailHelper = require('../helper/EmailMake');
var alramHelper = require('../helper/AlramHelper');
var AWS = require('aws-sdk');
var fs = require('fs');

AWS.config.region = 'ap-northeast-2';
var s3 = new AWS.S3();

var config = require('../helper/config.js');

var io = require('../app.js').tmp;

io.on('connection', function(socket) {
	socket.on('login', function(data) {
		async.series([function(callback){
      	  userDAO.findUserByEmail(data.email , callback);
  	  }], function(err , result){
			if(result[0]==''){
				var result = {result : "false"};
				socket.emit('login_result' , result);
				return;
			} else{
				if(decryptHelper.decryption(result[0][0].password)== data.password){
					if(result[0][0].email_verify==true){
					var results = {result : "true"};
					socket.emit('login_result' , results);
					socket.handshake.session.email = result[0][0].email; 
					socket.handshake.session.login = true;
					socket.handshake.session.save();
					return;
					} else{
						var result = {
										result : "verify",
										email : result[0][0].email
									 };
						socket.emit('login_result' , result);
						return;
					}
	        	} else{
	        		var result = {result : "false"};
	        		socket.emit('login_result' , result);
	        		return;
	        	}
			}
		})
	});
	
	socket.on('signUp',function(data){
		console.log(data);
		var result = {result : ""};
		if(data==undefined||data.password!==data.password_confirm||data.email==''||data.password==''||data.name==''||data.password_confirm==''){
			console.log("이상하게 안걸러지네?");
			result.result = "inner Server error";
			socket.emit('signUp_result' , result);
			return;
		} else{
			async.waterfall([function(callback){
				userDAO.findUserByEmail(data.email , callback);
			} , function(args1 , callback){
				if(args1.length!==0){
					callback('existed email' , false);
				} else{
					var tmpPassword = encryptHelper.encryption(data.password).toString();
					var insert = {
							'email' : data.email,
			        		'password' : tmpPassword,
			        		'name' : data.name};
					userDAO.register(insert , callback);
				}
			}] , function(err , results){
				if(err!==null){
					result.result = err;
				} else {
					result.result = true;
				}
				socket.emit('signUp_result' , result);
				if(result.result==true){
				EmailHelper.makeEmail(data.email);
				}
				return;
			});
		}
	});
	
	socket.on('reEmail' , function(data){
		EmailHelper.makeEmail(data.email);
	});
	
	socket.on('getAlram' , function(data){
		if(socket.handshake.session.uid==null){
			//세션 만료됐을때
		}else{
			async.waterfall([ function(callback){
				alramDAO.findAlramByUid(socket.handshake.session.uid , callback)	
			} , function(args , callback){
				if(args[0] == ''){
					callback('null alram' , false)
				} else{
					alramHelper.classifyAlram(args);
				}
			}] , function(err , results){
				
				
			});
		}
	});
	
	
	//이거 시발 날잡고 갈아엎자
	socket.on('getGroupImage', function(data){
		var group;
		var groupNum = {groupNum : 0};
		var groupInfo;
		var groupProfile;
		async.waterfall([ function(callback) {
			userDAO.findUserByEmail(socket.handshake.session.email , callback);
		}, function(args1, callback){ 
			if(args1[0]==''){
				callback('err' , false);
			} else{
				socket.handshake.session.uid = args1[0].uid;
				socket.handshake.session.save();
				// 세션에다가 uid 저장
			belong_grDAO.getGidByUid(args1[0].uid , callback);}
		}, function(args1, callback){
			if(args1[0]==''){
				callback('nullGroup' , false);
			} else{
				groupNum.groupNum = args1.length;
				
				groupInfo = args1;
				for(var i = 0 ; i < groupInfo.length ; i++){
					groupInfo[i].number = 1;
				}
				belong_grDAO.getUidInGroupNotMe(args1 , callback);
			}
		}, function (args1 , callback) {
			if (args1[0]== '') {
				callback('nullMemberNotMe' , false);
			} else {
			var temp = args1[0].gid;
			var tempArr = [];
			var count = 0;
			var deleteNum = [];
			var tempCount = 0;
			for(var i = 0 ; i <groupInfo.length ; i++){
				for(var j = tempCount ; j < args1.length ; j++){
					if(groupInfo[i].gid==args1[j].gid){
						++groupInfo[i].number;
					} else{
						tempCount = j;
						break;
					}
				}
			}
			
			for (var i = 0 ; i < args1.length ; i++){
				var tmp;
				tmp = args1[i].gid;
					if(temp != tmp){
						temp = tmp;
						tempArr.push(args1[i].uid);
						count = 1;
					} else if(count >= 4){
						++count;
						deleteNum.push(i);
						continue;
					} else {
						++count;
						tempArr.push(args1[i].uid);
					}
			} //그거임 그거 그룹내 중복 UID 없에서 요청보내는거 최소화
			tempArr.sort();
			var tmpCount = 0;
			for(var i = 0 ; i < deleteNum.length ; i++){
				 args1.splice(deleteNum[i] - tmpCount , 1);
				 ++tmpCount;
			} //그룹별 4개 이상인거 다지울꺼
			group = args1;
			var result = [];
			result.push(tempArr[0]);
			for (var i = 1 ; i < tempArr.length ; i++){
				if(tempArr[i-1]!=tempArr[i]){
					result.push(tempArr[i]);
				}
			}
			userDAO.getProfileByUid(result , callback);
			}
		}, function(args1 , callback){
			if(args1[0] == '') {
				callback('nullURL' , false);
			} else {
				var params = config.awsS3GetConfig;
				for(var i = 0 ; i <args1.length ; i++){
				params.Key = args1[i].profile;
				s3.getSignedUrl('getObject', params, function (err, url) {
					url = url.replace("https://" , "http://")
					args1[i].profile = url;
				}); //https -> http로 바꾸기
				}
				callback(null , args1);
			}
		} , function(args1 , callback){
			if(args1[0] == ''){
				callback('nullURL' , false);
			} else{
			    groupProfile = args1;
			    var groupUID = [];
			    for(var i = 0 ; i < groupInfo.length ; i++ ){
			    	if(groupInfo[i].name == null){
			    		for(var j = 0 ; j < group.length ; j++){
			    			if(groupInfo[i].gid == group[j].gid ){
			    				groupUID.push(group[j].uid);
			    			}
			    		}
			    	}
			    } //그룹명 null일때 uid로 유저네임 불러올라고
			    if(groupUID.length == 0){
			    	callback(null , false);
			    } else {
			    groupUID.sort();
			    var temp = [];
			    temp.push(groupUID[0]);
			    for (var i = 1 ; i < group.length ; i++){
			    	if(groupUID[i-1]!=groupUID[i]){
			    		temp.push(groupUID[i]);
			    		}
			    	}
			    	userDAO.getUserNameByUID(temp , callback);
			    }
			}//이 이후에 그룹거기에 이름 넣는 알고리즘 고안해낼것
		}] , function (err , results) {
			if(err){
				console.log(err);
				//에러처리 나중에 꼭하기
			} else {
				for(var i = 0 ; i < groupInfo.length ; i++){
					if(groupInfo[i].name==null){
						for(var j = 0 ; j <group.length ; j++){
							if(groupInfo[i].gid == group[j].gid){
							for(var k = 0 ; k<results.length ; k++){
								if(group[j].uid == results[k].uid){
									groupInfo[i].name = ''+ groupInfo[i].name + ',' + results[k].name;//붙일것 이름
									}
								}
							} 
						}
					}
				}
				for(var i = 0 ; i <groupInfo.length ; i++){
					groupInfo[i].name = groupInfo[i].name.slice(5);
					if(groupInfo[i].number>4){
						groupInfo[i].name = groupInfo[i].name +'...';
					}
				}
				console.log(results);
				console.log(groupProfile);
				console.log(group);
				console.log(groupInfo);
				socket.emit('GroupImageResult' , groupProfile , group , groupNum , groupInfo);
			}
		});
	});
});


/*
router.get('/', function(req, res, next) {
	res.render('login', {
		
	});
});
router.get('/login',
	   // passport.authenticate('local', { failureRedirect: '/login_fail', failureFlash: true }),
	    function(req, res) {
	console.log(req.body);
	console.log("여기2번");
	        res.redirect('/login_success');
	    });

router.post('/login_chk' , function(req, res, next){
			req.body.email = "wkdwns00@gmail.com";
			req.body.password = "7557523m";
			console.log(req.body);
			console.log("여기1번");
			res.redirect('/login');
});


router.get('/login_success', author.ensureAuthenticated, function(req, res, next){
	console.log(req.session);
	res.send(req.session.passport);
});


router.get('/login_fail' , function(req, res, next){
	res.send("로긴실패");
});*/



module.exports = router;