var base = require('./BaseDAO.js');
var mysql = require('mysql');

exports.getGroupBygid  = function(gidArr , callback){
	var sqlQuery = 'SELECT gid , member_number from gr WHERE gid = ';
	for (var i = 0 ; i < gidArr.length ; i++){
		sqlQuery = sqlQuery + gidArr[i].gid + ' or gid = '
	}
	sqlQuery = sqlQuery.substring(0 , sqlQuery.length-10);
	base.select(sqlQuery , callback);
}

exports.addGroupReturnID = function(uid , key, callback){
	var sqlQuery = 'INSERT INTO gr(`gr_code` , `member_num` , `master`) VALUES ("' + key + '",' + 0 + ',' + uid +')'; 
	//트리거 때문에 쿼리에 삽입값 1로하면 안됨 멤버넘 2됨 ㅇㅋ???
	base.lastInsertId(sqlQuery , callback);
}

exports.findGrByCode = function(code , callback){
	var sqlQuery = 'SELECT gid , member_num, notify_key FROM gr WHERE gr_code = ' + mysql.escape(code);
	base.select(sqlQuery , callback);
}

exports.findGrInform = function(gid , callback){
	var sqlQuery = ' SELECT gid , member_number FROM gr WHERE gid = ' + mysql.escape(gid);
	base.select(sqlQuery , callback);
}

exports.subtractGroupNum = function(gid , callback){
	var sqlQuery = 'UPDATE gr SET member_number = member_number - 1 WHERE gid = ' + mysql.escape(gid);
	base.update(sqlQuery , callback);
}

exports.deleteGroup = function(gid , callback){
	var sqlQuery = 'DELETE FROM gr WHERE gid = ' + mysql.escape(gid);
	base.deletion(sqlQuery , callback);
}

exports.addGroupNum = function(gid , callback){
	var sqlQuery = 'UPDATE gr SET member_number = member_number + 1 WHERE gid = ' + mysql.escape(gid);
	base.update(sqlQuery , callback);
}

exports.updateNotikey = function(gid , key , callback){
	var sqlQuery = 'UPDATE gr SET notify_key = ' + mysql.escape(key) + 'WHERE gid = ' + mysql.escape(gid);
	base.update(sqlQuery , callback);
}

exports.findNotikey = function(gid , callback){
	var sqlQuery = 'SELECT notify_key FROM gr WHERE gid = ' + mysql.escape(gid);
	base.select(sqlQuery , callback);
}

exports.findMasterInGr = function(gid , callback){
	var sqlQuery = 'SELECT master , gr_code FROM gr WHERE gid = ' + mysql.escape(gid);
	base.select(sqlQuery , callback);
}

exports.updateTime = function(gid , callback){
	var sqlQuery = 'UPDATE gr SET update_time = now() WHERE gid = ' + mysql.escape(gid);
	base.update(sqlQuery , callback);
}