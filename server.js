//BASE SETUP
var express = require('express');
var	app = express();
var	bodyParser = require('body-parser');
var morgan = require('morgan');
var mongoose = require('mongoose');
var port = process.env.PORT || 8080;
var jwt = require('jsonwebtoken');
var superSecret = 'mynameisfernandasilva'

var User = require('./app/models/user');

//connect to our database
mongoose.connect('mongodb://localhost/mean_api');


//use body parser so we can grab informaion from POST requests
app.use(bodyParser.urlencoded({enteded: true}));
app.use(bodyParser.json());

//configure our app to handle CORS requests
app.use(function(req, res, next){
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET', 'POST');
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, content-type, \ Authorization');
	next();
});

//log all requests to the console
app.use(morgan('dev'));

//ROUTES FOR OUR API
//===============================================

//basic route for the home page
app.get('/', function(req,res){
	res.send('Welcome to the home page!');
});

//get an instance of the express router
var apiRouter = express.Router();

// route for authenticating users, in which needs to come before the middleware
apiRouter.post('/authenticate', function(req, res){
	//find the user
	//select the name username and password explicitly
	User.findOne({
		username: req.body.username
	}).select('name username password').exec(function(err, user){
		if (err) throw err;
		//no user with that username was found
		if(!user){
			res.json({ sucsess: false, message: 'Authentication failed. User not found'});
		} else if (user){
			//check if password matches 
			var validPassword = user.comparePassword(req.body.password);
			if(!validPassword){
				res.json({ success: false, message: 'Authentication failed. Wrong password.'});
			} else {
				//if user is found and password is right
				//create a token
				var token = jwt.sign({
					name: user.name,
					username: user.username
				}, superScret, {
					expiresInMinutes: 1440 //expires in 24 hours
				});
				//return the information including token as JSON
				res.json({
					success: true,
					message: 'Enjoy your token',
					token: token
				});
			}
		}
	});
});

// MIDDLEWARE to use for all requests
apiRouter.use(function(req, res, next){
	//check hearder or url parameters or post parameters for token
	var token = req.body.token || req.param('token') || req.headers['x-access-token'];
	//decode token
	if (token){
		//verifies secret and check exp
		jwt.verify(token, superSecret, function(err, decoded){
			if (err){
				return res.status(403).send({success: false, message: 'Failed to authenticate token.'});
				//if everything is good, save the request for use in other routes
				req.decoded = decoded;
				next();
			}
		});
	} else {
		//if there is no tokne
		//return an HTTP response of 403 (access forbidden) and an erro message
		return res.status(403).send({success: false, message: 'No token provided.'})
	}
	//this is where we will authenticate users 
	console.log('Somebody just came to our app!');
	
})

//test route to make sure everything is working
//accessed at GET http://locahost:8080/apiRouter
apiRouter.get('/', function(req, res){
	res.json({ message: 'hooray! welcome to our api!'});
});

//more routes for our API will happen here
apiRouter.route('/users')
	//create a user (accessed at POST)
	.post(function(req, res){
		//create a new instance of the User model
		var user = new User();
		// set the users information (comes from the request)
		user.name = req.body.name;
		user.username = req.body.username;
		user.password = req.body.password;

		//save the user and check for errors
		user.save(function(err){
			if(err){
				//duplicate entry
				if(err.code == 11000)
					return res.json({ success: false, message: 'A user with that username already exists. '});
				else
					return res.send(err);
			}

				res.json({ message: 'User created!'});
		})
	})
	// get all users (Accessed at GET)
	.get(function(req, res){
		User.find(function(err, users){
			if(err)
				res.send(err);
			res.json(users);
		});

	});

apiRouter.route('/users/:user_id')
	//get the suer with that id
	//accessed at GET plus the id
	.get(function(req, res){
		User.findById(req.params.user_id, function(err, user){
			if(err)
				res.send(err);
			res.json(user);
		})
	})

	.put(function(req, res){
		User.findById(req.params.user_id, function(err, user){
			if(err)
				res.send(err);
			//update the users info only if its new
			if(req.body.name) user.name = req.body.name;
			if(req.body.username) user.username = req.body.username;
			if(req.body.password) user.password = req.body.password;

			//save the user
			user.save(function(err){
				if(err) 
					res.send(err);

				//return a message
				res.json({ message: 'User Updated!' });
			});
		});
	})

	.delete(function(req, res){
		User.remove({_id: req.params.user_id}, function(err, user){
			if (err) res.send(err);
			res.json({ message: 'Successfully deleted' });
		});
	});

// REGISTER OUR ROUTES ------------------------------------
// all of our routes will be prefixed with /api
app.use('/api', apiRouter);


// 	START THE SERVER 
//===================================================
app.listen(port);
console.log('Magic happens on port ' + port);
