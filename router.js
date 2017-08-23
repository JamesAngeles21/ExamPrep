
var express = require('express');
var app = express();
var router = express.Router();
router.use(bodyParser.json());
router.route('/')
	.all(function(req, res, next) {
		res.writeHead(200, {'Content-Type': 'text/plain'});
		next();
	})
	.get(function(req,res,next) {
		res.end('Will send all the dishes to you!');

	})

module.exports = router;
