# Efficient Node: Child Processes

Type: NodeJS

## Node’s Child Processes

Single-Threaded, non-blocking performance in Node works great for a single process. But eventually, one process in one CPU is not going to be enough to handle the increasing workload of your application.

No matter how powerful your server may be, a single thread can only support a limited load.

The fact that Node runs in a single thread does not mean that we can’t take advantage of multiple processes and, of course, multiple machines as well.

Using multiple processes is the best way to scale a Node application. Node is designed for building distributed applications with many nodes. This is why it’s named Node

## The Child Processes Module

We can easily spin a child process using Node’s child_process module and those child processes can easily communicate with each other with a messaging system.

The child_process module enables us to access Operating System functionalities by tunning any system command inside a, well, child process.

We can control that child process input stream and listen to its output stream. We can also control the arguments to be passed to the underlying OS command, and we can do whatever we want with that command’s output. For example, we can pipe the output of one command as the input to another as all inputs and outputs of these commands can be presented to us using Node streams.

There are four different ways to create a child process in Node:

```
spawn()
fork()
exec()
execFile()
```

## Spawned Child Processes

The `spawn` function launches a command in a new process and we can use it to pass that command any arguments.

For example, here’s code to spawn a new process that will execute the pwd command.

```jsx
const { spawn } = require("child_process");

const child = spawn("pwd");
```

The result of executing the `spawn` function is a `ChildProcess` instance, which implements the `EventEmitter` API. This means we can register handlers for events on this child object directly. For example, we can do something when the child process exits by registering a handler for the `exit` event:

```jsx
child.on("exit", function(code, signal){
	console.log("child process exited with " + `code ${code} and signal ${signal}`
})
```

The handler above gives us the exit `code` for the child process and the `signal` if any, that was used to terminate the child process. This `signal` variable is null when the child process extis normally.

The other events that we can register handlers for with the `ChildProcess` instances are `disconnect` , `error` , `close` , and `message` .

- The disconnect event is emitted when the parent process manually calls the `child.disconnect`method.
- The error event is emitted if the process could not be spawned or killed.
- The close vent is emitted when the `stdio` streams of a child process get closed.
- The message event is the most importante one. It’s emitted when the child process uses the `process.send()` function to send message. This is how parent/child processes can communicate with each other

Every child process also gets the three standard `stdio` streams, which we can access using `child.stdin` `child.stdout` `child.stderr` .

When those streams get closed, the child process that was using them will emit the `close` event. This `close` event is different that the `exit` event because multiple child processes might share the same `stdio` streams

Since all streams are event emitters, we can listen to different events on those `stdio` streams that are attached to every child process. Unlike in a normal process though, in a child process the `stdout / stderr` streams are readable streams while the `stdin` stream is a writable one. This is basically the inverse. The events we can use for those streams are the standard ones.

```jsx
child.stdout.on("data", data => {
	console.log(`child stdout:\n${data}`);
})

child.stderr.on("data", data => {
	console.error(`child stderr:\n${data}`);
})
```

The two handlers above will log both cases to the main process

We can pass arguments to the command that’s executed by the `spawn` function using the second argument of the `spawn` function, which is an array of all the arguments to be passed to the command. For example, to execute the `find` command on the current directory with a `-type f` argument

```jsx
const child = spawn("find", [".", "-type". "f"]);
```

If an error occurs during the execution of the command the `child.stderr` data event handler will be triggered and the `exit` event handler will report an exit code of 1

A child process `stdin` is a writable stream. We can use it to send a command some input. Just like any writable stream, the easiest way to consume it is using the `pipe` function

```jsx
const { spawn } = require("child_process");

const child = spawn("wc");

process.stdin.pipe(child.stdin);

child.stdout.on("data", data => {
	console.log(`child stdout: \n${data}`);
})
```

In the example above, the child process invokes the `wc` command, which counts lines, words, and characters in Linux. We then pipe the main process `stdin` into the child process `stind` The result of this combination is that we get a standard input mode where we can type something, and when we hit `Ctrl+D` what we typed will be used as the input of the wc command.

We can also pipe the standard input/output of multiple processes

```jsx
const { spawn } = require("child_process");
const find = sawpn("find", [".", "-type", "f"])
const wc = spawn("wc", ["-l"]);

find.stdout.pipe(wc.stdin);

wc.stdout.on("data", data => {
  console.log(`Number of files ${data}`);
});
```

## Shell Syntax and the exec function

By default, the `spawn` function does not create a **shell** to execute the command we pass into it. This makes it slightly more efficient than the `exec` function, which does create a shell. The exec function has one major difference. It **buffers** the command’s generated output and passes the whole output value to a callback function

```jsx
const { exec } = require("child_process");

exec("find . -type f | wc -l", (err, stdout, stderr) => {
  if (err) {
    console.error(`exec error: ${err}`);
    return;
  }

  console.log(`Number of files ${stdout}`);
});
```

The `exec`function buffers the output and passes it to the callback function as the `stdout` argument here, This `stdout` argument is the command’s output that we want to print out.

The `exec` function is a good choice  if you need to use the shell syntax and if the size of the data expected from the command is small

The `spawn` function is a much better choice when the size of the data expected from the command is large because that data will be streamed with the standard IO objects.

We can make a spawned child process inherit the standard IO objects of its parents if we want to, but more importantly, we can make the `spawn` function use the shell syntax as well. Here’s the same `find | wc` command implemented with the `spawn` function:

```jsx
const child = spawn("find . -type f | wc -l", {
  stdio: "inherit",
  shell: true
});
```

There are a few other good options we can use in the last argument to the `child_process` functions besides `shell` and `stdio`. For example, we can use the `cwd` option to change the working directory of the script. For example, here’s the same count-all-files example done with a `spawn` function using a shell and with a working directory set to my Downloads folder. The `cwd` option here will make the script count all files I have in `Download`

```jsx
const child = spawn("find . -type f | wc -l", {
  stdio: "inherit",
  shell: true,
  cwd: "/Users/{user}/Downloads"
});
```

Another option we can use is env to specify the environment variables that will be visible to the new child process

```jsx
const child = spawn("echo $ANSWER", {
  stdio: "inherit",
  shell: true,
  env: { ANSWER: 42 }
});
```

---

## The `execFile` Function

If you need to execute a file without using a shell, the `execFile` is what you need. It behaves exactly like the `exec` function, but does not use a shell, which makes it a bit more efficient

---

## The `*Sync` Functions

The functions `spawn`, `exec`, and `execFile` from the `child_process`module also have synchronous blocking versions that will wait until the child process exits.

---

## The `fork` Function

The `fork` function is a variation of the `spawn` function for spawning node processes. The biggest difference between `spawn` and `fork` is that a communication channel is established to the child process when using `fork` , so we can use the `send` function on the forked `process` along with the global process object itself to exchange messages between the parent and forked processes. We do this through the `EventEmitter` module interface

```jsx
const { fork} require("child_process");
const forked = fork("child.js");
forked.on("message", msg => {
	console.log("Message from child", msg)
})

forked.send({hello: "world"})
```

```jsx
process.on("message", msg => {
  console.log("Message from parent:", msg);
});

let counter = 0;

setInterval(() => {
  process.send({ counter: counter++ });
}, 1000);
```

Let’s say we have an http server that handles two endpoints. One of these endpoints is computationally expensive and will take a few seconds to complete. We can use a long for loop to simulate that:

```jsx
const http = require("http");

const longComputation = () => {
  let sum = 0;
  for (let i = 0; i < 1e9; i++) {
    sum += i;
  }
  return sum;
};

const server = http.createServer();

server.on("request", (req, res) => {
  if (req.url === "/compute") {
    const sum = longComputation();
    return res.end(Sum is ${sum});
  } else {
    res.end("Ok");
  }
});

server.listen(3000);
```

This program has a big problem; when the `/compute` endpoint is requested, the server will not be able to handle any other requests because the event loop is busy with the long for loop operation.

There are few ways we can solve this problem depending on the nature of the long operation but one solution that works for all operations is to just move the computation operation into another process using `fork`

We first move the whole `longComputation` function into its own file and make it invoke that function when instructed via a message from the main process:

```jsx
const longComputation = () => {
  let sum = 0;
  for (let i = 0; i < 1e9; i++) {
    sum += i;
  }
  return sum;
};

process.on("message", msg => {
  const sum = longComputation();
  process.send(sum);
});
```

Now, instead of doing the long operation in the main process event loop, we can `fork` file and use the messages interface to communicate messages between the server and the forked process.

```jsx
const http = require("http");
const { fork } = require("child_process");

const server = http.createServer();

server.on("request", (req, res) => {
  if (req.url === "/compute") {
    const compute = fork("compute.js");
    compute.send("start");
    compute.on("message", sum => {
      res.end(Sum is ${sum});
    });
  } else {
    res.end("Ok");
  }
});

server.listen(3000);
```

The code above is limited by the number of processes we can fork, but when we execute it and request the long computation endpoint over http, the main server is not blocked at all and can take further requests.