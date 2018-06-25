'use strict';

const express = require('express');
const mongoose = require('mongoose');

const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();


// Mongoose internally uses a promise-like object,
// but its better to make Mongoose use built in es6 promises
mongoose.Promise = global.Promise;

// config.js is where we control constants for entire
// app like PORT and DATABASE_URL
const { PORT, DATABASE_URL } = require('./config');
const { Posts } = require('./models');


const app = express();
app.use(express.json());

//ENDPOINTS

//GET requests
app.get('/posts', (req, res) => {
	Posts.find()
	.then((posts) => {
		res.json(posts.map(post => post.serialize()))
	})
});

app.post('/posts', (req, res) => {

	const requiredFields = ['title', 'content'];
  	for (let i=0; i<requiredFields.length; i++) {
    	const field = requiredFields[i];
    	if (!(field in req.body)) {
      		const message = `Missing \`${field}\` in request body`
      		console.error(message);
      		return res.status(400).send(message);
    }
  }

	Posts.create({
		title: req.body.title,
		content: req.body.content,
		author: {
			firstName: req.body.author.firstName,
			lastName: req.body.author.lastName
		},
		created: Date.now()
	})
	.then((post) => {
		res.json(post.serialize())
	})
});

app.put('/posts/:id', (req, res) => {
	Posts.findById(req.params.id)
	.then((post) => {
		post.update({
			title: req.body.title,
		content: req.body.content,
		author: {
			firstName: req.body.author.firstName,
			lastName: req.body.author.lastName
		},
		created: Date.now()
		})
		.then((post) => {
		res.json(post)
	})
	})
});

app.delete('/posts/:id', (req, res) => {
	Posts.findByIdAndRemove(req.params.id)
	.then(result => res.json(result))
});



// catch-all endpoint if client makes request to non-existent endpoint
app.use('*', function (req, res) {
  res.status(404).json({ message: 'Not Found' });
});

// closeServer needs access to a server object, but that only
// gets created when `runServer` runs, so we declare `server` here
// and then assign a value to it in run
let server;

function runServer(databaseUrl, port=PORT) {
  return new Promise((resolve, reject) => {
    mongoose.connect(databaseUrl, err => {
      if (err) {
        return reject(err);
      }

      server = app.listen(port, () => {
        console.log(`Your app is listening on port ${port}`);
        resolve();
      })
      .on('error', err => {
        mongoose.disconnect();
        reject(err);
      });
    });
  });
}

// this function closes the server, and returns a promise. we'll
// use it in our integration tests later.
function closeServer() {
  return mongoose.disconnect().then(() => {
    return new Promise((resolve, reject) => {
      console.log('Closing server');
      server.close(err => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  });
}

if (require.main === module) {
  runServer(DATABASE_URL).catch(err => console.error(err));
};

module.exports = { app, runServer, closeServer };