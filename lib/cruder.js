var
	mysql = require("mysql"),
	_ = require("lodash");

var Cruder = function(db, tableName, fieldSet) {
	this.db = db;
	this.table = tableName;
	this.fieldSet = fieldSet;
}

var apiError = function(err, res) {
	var errors = {
		'ER_NO_REFERENCED_ROW_' : 'one of the referenced fields does not exist or is invalid'
	}

	console.log("API Error: " + err);
	console.log(err);
	if (errors[err.code])
		return res.json(400, { message: errors[err.code] });
	
	res.json(500, {message: 'Failed to issue query on database'});
}

var validateFields = function(req, fields, cb) {
	var missingFields = 
		_.reduce(fields, function(acc, f) {  
		if (f[0] == '*' && !req.body[f.slice(1)])
			return acc.concat(f.slice(1));
		return acc;
	}, []);

	if (_.size(missingFields))
		return cb(new Error("fields missing: " + missingFields.join(', ')))

	return cb(null, _.pick(req.body, _.map(fields, function(f) { return f[0] == '*' ? f.slice(1) : f; })));
}

Cruder.prototype.list = function(extraQuery) {
	var o = this;
	return function(req, res) {
		var q = o.db.query("select * from " + o.table + (extraQuery ? (" " + extraQuery) : ''), function(err, r) {
			if (err) return apiError(err, res);
			return res.json(200, r);
		});
		console.log(q.sql);
	}
}

Cruder.prototype.get = function() {
	var o = this;

	return function(req, res) {
		var id = req.params['id'];

		o.db.query("select * from " + o.table + " where id = ?", [id], function(err, r) {
			if (err) return apiError(err, res);
			if (_.size(r) == 0) return res.json(404, { message: 'not found' });

			return res.json(200, r[0]);
		});
	}
}

Cruder.prototype.create = function() {
	var o = this;

	return function (req, res) {
		validateFields(req, o.fieldSet, function(err, obj) {
			if (err) return res.json(400, { message: err.message });

			o.db.query("insert into " + o.table + " set ?", [obj], function(err, r) {
				if (err) return apiError(err, res);
				res.json(200, { id: r.insertId });
			});
		});
	}
}

Cruder.prototype.delete = function() {
	var o = this;

	return function(req, res) {
		var id = req.params['id'];

		o.db.query("delete from " + o.table + " where id = ?", [id], function(err, r) {
			if (err) return apiError(err, res);
			if (_.size(r) == 0) return res.json(404, { message: 'not found' });
			if (r.affectedRows > 0)
				return res.json(200, { message: 'deleted successfully' });
			return res.json(200, { message: 'not found' });
		});
	}
}

module.exports.validateFields = validateFields;
module.exports.apiError = apiError;
module.exports.Cruder = Cruder;
