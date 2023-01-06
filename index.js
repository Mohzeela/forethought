// Require and call Express
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var responseTime = require('response-time');
const prom = require('prom-client');

// collect default metrics
const collectDefaultMetrics = prom.collectDefaultMetrics
collectDefaultMetrics({ prefix: 'forethought' });

// Metrics list
const todocounter = new prom.Counter({
	name: 'forethought_number_of_new_todos',
	help: 'The number of new tasks added to our application'
});

const todogauge = new prom.Gauge({
	name: 'forethought_current_todos',
	help: 'Amount of current incomplete tasks'
});

const tasksumm = new prom.Summary ({
	name: 'forethought_requests_summ',
	help: 'Latency in percentiles'
})

const taskhisto = new prom.Histogram ({
	name: 'forethought_requests_histo',
	help: 'Latency in histogram form'
})

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// use css
app.use(express.static("public"));

// placeholder tasks
var task = [];
var complete = [];

// add a task
app.post("/addtask", function(req, res) {
  var newTask = req.body.newtask;
  task.push(newTask);
  res.redirect("/");
  todocounter.inc();
  todogauge.inc();
});

// remove a task
app.post("/removetask", function(req, res) {
  var completeTask = req.body.check;
  if (typeof completeTask === "string") {
    complete.push(completeTask);
    task.splice(task.indexOf(completeTask), 1)
  }
  else if (typeof completeTask === "object") {
    for (var i = 0; i < completeTask.length; i++) {
      complete.push(completeTask[i]);
      task.splice(task.indexOf(completeTask[i]), 1);
      todogauge.dec();
    }
  }
  res.redirect("/");
});

// track response time
app.use(responseTime(function (req, res, time) {
	tasksumm.observe(time);
	taskhisto.observe(time);
}));

// get website files
app.get("/", function (req, res) {
  res.render("index", { task: task, complete: complete });
});

// add metrics endpoint
app.get('/metrics', async function (req, res) {
	res.set('Content-Type',prom.register.contentType);
	res.end(await prom.register.metrics());
});

// listen for connections
app.listen(8080, function() {
  console.log('Testing app listening on port 8080')
});
