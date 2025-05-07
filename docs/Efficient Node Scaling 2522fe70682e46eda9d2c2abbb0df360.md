# Efficient Node: Scaling

Type: NodeJS

Scalability in Node is not an afterthought. It’s something that’s baked into the core of the runtime. Node is named Node to emphasize the idea that a Node application should compromise multiple small distributed **nodes** that communicate with each other.

Are you running multiple nodes for your Node applications? Are you running a Node process on every CPU core of your production machines and load balancing all the request among them? Did you know that Node has a built-in module to help with that?

Node’s **cluster** module not only provides an out of the box solution to utilizing the full CPU power of a machine, but it also helps with increasing the availability of your Node processes and provides an option to restart the whole application with a zero downtime.

## Strategies of Scalability

The workload is the most popular reason we scale our applications, but it’s not the only one. We also scale our applications to increase their availability and tolerance to failure.

There are mainly three different things we can do to scale an application

### 1 - Cloning

The easiest thing to do to scale a big application is to clone it multiple times and have each cloned instance handle part of the workload (with a load balance, for example). This does not cost a lot in terms of development time and it’s highly effective. This strategy is the minimum you should do and Node has the built-in module, named **cluster**, to make it easier for you to implement the cloning strategy

### 2 - Decomposing

We can also scale an application by decomposing it based on functionalities and services. This means having multiple applications with different code bases and sometimes with their own dedicated databases and User interfaces.

This strategy is commonly associated with the term **Microservice**, where micro indicates that hose services should be as small as possible, but in reality, the size of the service is not what’s important but rather the enforcement of loose coupling and high cohesion between services. The implementation of this strategy is often not easy and could result in long-term unexpected problems.

### 3 - Splitting

We can also split the application into multiple instances where each instance is responsible for only a part of the application’s data. This strategy is often named **horizontal partitioning**, or **sharding**, in databases. Data partitioning requires a lookup step before each operation to determine which instance of the application to us. For example, maybe we want to partition our users based on their country or language. We need to do a lookup of that information first.

Successfully scaling a big application should eventually implement all three strategies. Node makes it easy to do so

---

## The Cluster Module

The cluster module can be used to enable load balancing over an environment’s multiple CPU cores. It’s based on the child process module fork and it basically allows us to fork the main application process as many times as we have CPU cores. It will then take over and load balance all requests to the main process across all forked processes.

The cluster module is Node’s helper for us to implement the cloning ability strategy, but only on one machine. When you have a big machine with a lot of resources or when it’s easier and cheaper to add more resources to one machine rather than adding new machines, the cluster module is a great option for a really quick implementation of the cloning strategy.

Even small machines usually have multiple cores and even if you’re not worried about the load on your Node server, you should enable the cluster module anyway to increase your server availability and fault-tolerance. It’s a simple step, and when using a process manager like **PM2 it becomes simpler**

The structure of what the cluster module does is simple. We create a **master** process which forks a number of **worker** processes and manages them. Each worker process represents an instance of the application that we want to scale. All incoming requests are handled by the master process, which is the one that decides which worker process should handle an incoming request.

The master process’s job is easy because it actually just uses a **round-robin** algorithm to pick a worker process. This is enabled by default on all platforms except Windows

The round-robin algorithm distributes the load evenly across al available processes on a rotational basis. The first request is forwarded to the first worker process, the second to the next worker process in the list, and so on. When the end of the list is reached, the algorithm starts again from the beginning.

## Load-Balancing an HTTP Server

Let’s clone and load balance a simple HTTP server using the cluster module. Here’s the simple Node’s hello-world example server slightly modified to simulate some CPU work before responding:

```jsx
const http = require("http");
const pid = process.pid;
http
	.createServer((req, res) => {
		for (let i = 0; i < 1e7; i++){
			res.end()
		}
	})
	.listen(8080, () => console.log(`Started process ${pid}`);
```

Before we create a cluster to clone this server into multiple workers, let’s do a simple benchmark of how many requests this server can handle per second. We can use the **Apache Benchmarking** tool for that

```jsx
ab -c200 -t10 http://localhost:8080/
```

On my machine, the single node serve was able to handle about 51 requests per second. Of course, the results here will be different on different platforms and this is a very simplified test of performance that’s not a 100% accurate

Now that we have a reference benchmark, we can scale the application with the cloning strategy using the cluster module.

```jsx
const cluster = require("cluster");
const os = require("os");

if(cluster.isMaster){
	const cpus = os.cpus().length;
	console.log(`Forking for ${cpus} CPUs`);
	for(let i = 0; i < cpus; i++{
		cluster.fork();
	}
} else {
	require("./server");
}
```

In `cluster.js` we first required both the `cluster` module and the os module

The `cluster` module gives us the handle Boolean flag `isMaster` do termine if this `cluster.js` file is being loaded as a master process or not. The first time we execute this file, we will be executing the master process and that `isMaster` flag will be set to true. In this case, we can instruct the master process to fork our server as many times as we have CPU cores.

Now, we just read the number of CPUs we have using the os module, then with a for loop over that number, we call the `cluster.fork` method. The for loop will simply create as many workers as the number of CPUs in the system to take advantage of all the available processing power.

<aside>
💡 There is actually another flas set to true in this case if you need to use it, which is the `isWorker` flag.

</aside>

### Broadcasting Messages to All Workers

Communicating between the master process and the workers is simple because under the hood the cluster module is just using the `child.process.fork` API, which means we also have communication channels available between the master process and each worker.

Based on the the `server.js/cluster.js` example above, we can access the list of worker objects using `cluster.workers` , which is an object that holds a reference to all workers and can be used to read information about these workers. Since we have communication channels between the master process and all workers, to broadcast a message to all of them we just need a simple loop over all the workers

```jsx
Object.values(cluster.workers).forEach( worker => {
	worker.send(`Hello Worker ${worker.id}`);
})
```

We simple used `Object.values` to get an array of all workers from the `cluster.workers` object. Then, for each worker, we can use the send function to send over any value that we want.

In a worker file, to read a message received from this master process, we can register a handler for the `message` event on the global `process` object

```jsx
process.on("message", msg => {
	console.log(`Message from master: ${msg}`)
})
```

Let’s make this communication example a little bit more practical. Let’s say we want our server to reply with the number of users we have created in our database. We’ll create a mock function that returns the number of users we have in the database and just have it square its value every time it’s called

```jsx
const numberOfUsersInDB = function() {
  this.count = this.count || 5;
  this.count = this.count + this.count;
  return this.count;
}
```

Every time `numberOfUsersInDb` is called, we’ll assume that a database connection has been made. What we want to do here is to cache this call for a certain period of time, such as 10 seconds. However, we still don’t want the 8 forked workers to do their own DB requests and end up with 8 DB requests every 10 seconds. Instead, we can have their master process do just one request and tell all of the 8 workers about the new value

```jsx
const updateWorkers = () => {
  const usersCount = numberOfUsersInDB();
  Object.values(cluster.workers).forEach(worker => {
    worker.send({ usersCount });
  });
};

updateWorkers();
setInterval(updateWorkers, 10000);
```

Here we’re invoking `updateWorkers` for the first time and then invoking it every 10 seconds using a setInterval.

This way, every 10 seconds, all workers will receive the new user count value over the process communication channel and only one database connection will be made.

In the server code, we can use the `usersCount` value using the same `message` event handler. We can simply cache that value with a module global variable and use it anywhere we want.

```jsx
const http = require("http");
const pid = process.pid;

let usersCount;

http
  .createServer((req, res) => {
    for (let i = 0; i < 1e7; i++); // simulate CPU work
    res.write(`Handled by process ${pid}\n`);
    res.end(`Users: ${usersCount}`);
  })
  .listen(8080, () => {
    console.log(`Started process ${pid}`);
  });

process.on("message", msg => {
  usersCount = msg.usersCount;
});
```

The above code makes the worker web server respond with the cached `usersCount` value. If you test the cluster code now, during the first 10 seconds you’ll get “25” as the users count from all workers (and only one DB request would be made). After another 10 seconds, all workers would start reporting the new user count, 625 (and only one other DB request would be made)

## Increasing Server Availability

One of the problems in running a single instance of a Node application is that when that instance crashes, it has to be restarted. This causes some downtime between these two actions, even if the process was automated as it should be.

This also applies to the case when the server has to be restarted to deploy new code With one instance, there will be downtime that affects the availability of the system.

To simulate a random crash in the server process, we can simply do a `process.exit` call inside a timer that fires after a random amount of time

```jsx
setTimeout(() => {
	process.exit(1)
}, Math.random() \* 100000)
```

When a worker process exits like this, the master process will be notified using the exit event on the `cluster` model object. We can register a handler for that event and just fork a new worker process when any worker process exits

```jsx
cluster.on("exit", (worker, code, signal) => {
  if (code !== 0 && !worker.exitedAfterDisconnect) {
    console.log(`Worker ${worker.id} crashed.` + "Starting a new worker...");
    cluster.fork();
  }
});
```

It’s good to add the if condition above to make sure the worker process actually crashed and was not manually disconnected or killed by the paster process itself.

If we run the cluster with the handler above, after a random number of seconds, workers will start to crash and the master process will immediately fork new workers to increase the availability of the system.

## Zero-downtime Restarts

What about the case when we want to restart all worker processes when, for example, we need to deploy new code?

We have multiple instances running, so instead of restarting them together we can simply restart them one at a time to allow other workers to continue to server requests while one worker is being restarted.

Implementing this with the cluster module is easy. Since we don’t want to restart the master process once it’s up, we need a way to send this master process a command to instruct it to start restarting its workers. This is easy on Linux systems because we can simple listen to a process single like `SIGUSR2` which we can trigger by using the `kill` command on the process id and passing that signal;

```jsx
process.on('SIGUSR2', () => {...})

// To trigger that
$ kill -SIGUSR2 PID
```

This way, the master process will not be killed and we have a way to instruct it to start doing something. `SIGUSR2` is a proper signal to use here because this will be a user command.

<aside>
💡 If you’re wondering why not `SIGUSR1`, it’s because Node uses that for its debugger and you want to avoid any conflicts.

</aside>

Unfortunately, on Windows, these process signals are not supported and we would have to find another way to command the master process to do something. There are some alternatives. For example, we can use standard input or socket input. We can also monitor the existence of a [`process.pid`](http://process.pid) file and track any remove event on it.

In our example, when the master process receives the `SIGUSR2` signal, that means it’s time for it to restart its workers, but we want to do that one worker at a time. This simply means the master process should only restart the next worker when it’s done restarting the current one.

To begin this task, we need to get a reference to all current workers using the `cluster.workers` object and we can simply just store the workers in an array:

```jsx
const workers = Object.values(cluster.workers);
```

Then, we can create a `restarWorker` function that receives the index of the worker to be restarted. This way we can do the restarting in sequence by having the function call itself when it’s ready for the next workers

```jsx
const restartWorker = workerIndex => {
  const worker = workers[workerIndex];
  if (!worker) return;

  worker.on("exit", () => {
    if (!worker.exitedAfterDisconnect) return;
    console.log(`Exited process ${worker.process.pid}`);

    cluster.fork().on("listening", () => {
      restartWorker(workerIndex + 1);
    });
  });

  worker.disconnect();
};

restartWorker(0);
```

Inside the `restartWorker`function, we got a reference to the worker to be restarted. Since we will be calling this functions recursively to form a sequence, we need a stop condition. When we no longer have a worker to restart, we can just return. We then basically want to disconnect this workers, but before restarting the next worker we need to fork a new worker to replace this current one that we’re disconnecting.

We can use the exit event on the workers itself to fork a new worker when the current one exists, but we have to make sure that the exit action was actually triggered after a normal disconnect call. We can use the `exitedAfterDisconnect` flag. If this flas is not ture, the exit was caused by something else other than a disconnect call, and in that case, we should just return and do nothing.

When this new forked worker is ready, we can restart the next one. However, remember that the fork process is not synchronous, so we can’t just restart the next workers after the fork call. Instead, we can monitor the `listening` event on the newly forked worker, which tells us that this worker is connected and ready. When we get this event, we can safely restart the next worker in sequence

---

Process monitors like PM2, which I use in production, make all the tasks we wen through so far extremely easy and provide a lot more features to monitor the health of a Node application. For example, with PM2, to launch a cluster for any app, all you need to do is use the -i argument.

```jsx
pm2 start server.js -i max
```

and to do a zero downtime restart you just issue this magic command:

```jsx
pm2 reload all
```