require('./utils');
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const app = express();
const bcrypt = require('bcrypt');
const saltRounds = 12;

const database = include('databaseConnection');
const db_utils = include('database/db_utils');
const db_users = include('database/users.js');
const success = db_utils.printMySQLVersion();

const port = process.env.PORT || 3000;

const expireTime = 60*60*1000; //expires after 1 hour (hours * minutes * seconds * millis)


/* secret information section */
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const node_session_secret = process.env.NODE_SESSION_SECRET;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;



app.use(express.urlencoded({extended: false}));
app.set('view engine', 'ejs');


var mongoStore = MongoStore.create({
	mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@personaldata.iz5jg.mongodb.net/?retryWrites=true&w=majority&appName=personalData`,
    crypto: {
		secret: mongodb_session_secret
	}
})


app.use(session({ 
    secret: node_session_secret,
	store: mongoStore, //default is memory store 
	saveUninitialized: false, 
	resave: true,
    cookie: {
        maxAge: expireTime
    }
}
));


app.get('/', (req,res) => {
    console.log(req.session.username)
    res.render("index.ejs", {authenticated: req.session.authenticated, username: req.session.username});
});


app.get("/about", (req, res) => {
    var color = req.query.color;
    if (!color) {
        color = "black";
    }

    res.render("about.ejs");
});


app.get('/cat/:id', (req,res) => {
    var cat = req.params.id;
    res.render("cat", {cat: cat});
});


app.get('/contact', (req,res) => {
    var missingEmail = req.query.missing;
    res.render("contact", {missing: missingEmail});
});


app.post('/submitEmail', (req,res) => {
    var email = req.body.email;
    if (!email) {
        res.redirect('/contact?missing=1');
    }
    else {
        res.render("submitEmail", {email: email});
    }
});


app.get('/createTables', async (req,res) => {
    const create_tables = include('database/create_tables');
    var success = create_tables.createTables();
    if (success) {
        res.render("successMessage", {message: "Created tables."} );
    }
    else {
        res.render("errorMessage", {error: "Failed to create tables."} );
    }
});


app.get('/createUser', (req,res) => {
    res.render("createUser");
});


app.post('/submitUser', async (req,res) => {
    var username = req.body.username;
    var password = req.body.password;
    var hashedPassword = bcrypt.hashSync(password, saltRounds);
    var success = await db_users.createUser({ user: username, hashedPassword: hashedPassword });
    if (success) {
        var results = await db_users.getUsers();
        res.render("submitUser",{users:results});
    }
    else {
        res.render("errorMessage", {error: "Failed to create user."} );
    }
});



app.get('/login', (req,res) => {
    res.render("login");
});


app.post('/loggingin', async (req,res) => {
    var username = req.body.username;
    var password = req.body.password;


    var results = await db_users.getUser({ user: username, hashedPassword: password });
    if (results) {
        if (results.length == 1) { //there should only be 1 user in the db that matches
            if (bcrypt.compareSync(password, results[0].password)) {
                req.session.authenticated = true;
                console.log(req.session.authenticated)
                req.session.user_type = results[0].type;
                req.session.username = username;
                req.session.cookie.maxAge = expireTime;
                res.redirect('/');
                return;
            }
            else {
                console.log("invalid password");
            }
        }
        else {
            console.log('invalid number of users matched: '+results.length+" (expected 1).");
            res.redirect('/login');
            return;            
        }
    }

    console.log('user not found');
    //user and password combination not found
    res.redirect("/login");
});


function sessionValidation(req, res, next) {
    console.log(req.session.authenticated)
	if (!req.session.authenticated) {
		req.session.destroy();
		res.redirect('/login');
		return;
	}
	else {
		next();
        
	}
}


function isAdmin(req) {
    if (req.session.user_type == 'admin') {
        return true;
    }
    return false;
}

function adminAuthorization(req, res, next) {
	if (!isAdmin(req)) {
        res.status(403);
        res.render("errorMessage", {error: "Not Authorized"});
        return;
	}
	else {
		next();
	}
}


app.use('/members/admin', adminAuthorization);


app.get('/members', sessionValidation, (req,res) => {
    console.log(req.session.username)
    res.render("loggedin",  {authenticated: req.session.authenticated, username: req.session.username});
});


app.get('/members/info', (req,res) => {
    res.render("loggedin-info");
});


app.get('/members/admin', adminAuthorization, (req,res) => {
    res.render("admin");
});


app.get('/loggedin/memberinfo', (req,res) => {
    res.render("memberInfo", {username: req.session.username, user_type: req.session.user_type});
});


app.get('/api', (req,res) => {
	var user = req.session.user;
    var user_type = req.session.user_type;
	console.log("api hit ");
	var jsonResponse = {
		success: false,
		data: null,
		date: new Date()
	};
	
	if (!isValidSession(req)) {
		jsonResponse.success = false;
		res.status(401);  //401 == bad user
		res.json(jsonResponse);
		return;
	}
	if (typeof id === 'undefined') {
		jsonResponse.success = true;
		if (user_type === "admin") {
			jsonResponse.data = ["A","B","C","D"];
		}
		else {
			jsonResponse.data = ["A","B"];
		}
	}
	else {
		if (!isAdmin(req)) {
			jsonResponse.success = false;
			res.status(403);  //403 == good user, but, user should not have access
			res.json(jsonResponse);
			return;
		}
		jsonResponse.success = true;
		jsonResponse.data = [id + " - details"];
	}
	res.json(jsonResponse);
});

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
})

// 404 catch route
app.get("*", (req, res) => {
    res.status(404);
    res.render("404");
})


app.use(express.static(__dirname + "/public"));

app.listen(port, () => {
	console.log("Node application listening on port "+port);
}); 




