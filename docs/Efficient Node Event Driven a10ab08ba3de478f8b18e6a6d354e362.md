# Efficient Node: Event Driven

Type: NodeJS

## Node’s Event-Driven Architecture

Most of Node’s objects - like HTTP requests, responses, and streams - implement the EventEmitter module so they can provide a way to emit and listen to events.

The simplest form of the event-driven nature is the callback style of some of the popular Node.js functions - for example, fs.readFile. In this analogy, the event will be fired once (when Node is ready to call the callback)) and the callback acts as the event handler.

### Callbacks (and Promises)

Call me back when you’re ready Node!

The original way Node handled asynchronous events was with callbacks. This was a long time ago, before JavaScript had native promises support and the async/await feature.

Callbacks are basically just functions that you pass to other functions. This is possible in JavaScript because functions are first class objects.

It’s important to understand that callbacks do not indicate an asynchronous call in the code. A function can call the callback synchronously and asynchronously.

### Example only

Here’s a host function fileSize that accepts a callback function cb and can invoke that callback function both synchronously and asynchronously based on a condition

```jsx
function fileSize(fileName, cb){
	if (typeof fileName !== 'string'){
		return cb(new TypeError('argoument should be string'))' //Sync
	}
	fs.stat(fileName, (err, stats) => {
		if(err) return cb(err) // Async
		cb(null, stats.size); // Async
	}
}
```

Note that this is a bad practice that leads to unexpected errors. Design host functions to consume callback either always synchronously or always asynchronously.

### The modern JavaScript alternative to callbacks

In modern JS, we have promise objects. Promises can be an alternative to callbacks for asynchronous APIs. Instead of passing a callback as an argument and handling the error in the same place, a promise object allows us to handle success and error cases separately and it also allows us to chain multiple asynchronous calls instead of nesting them.

If the readFileAsArray function support promises, we can use it as follows:

```jsx
readFileAsArray("./numbers.txt")
	.then( lines => {
		const numbers = lines.map(Number);
		const oddNumbers = numbers.filter( n => n%2 === 1);
		console.log("Odd numbers count:", oddNumbers.length);
	})
	.catch(console.error);
```

## The EventEmitter Module

The EventEmitter is a module that facilitates communication between objects in Node. EventEmitter is at the core of Node asynchronous event-driven architecture. Many of Node’s built-in modules inherit from EventEmitter.

The concept is simple: emitter objects emit named events that cause previously registered listeners to be called. So, an emitter object basically has two main features:

 

- Emiting name events.
- Registering and unregistering listener functions.

To work with the EventEmitter, we just create a class that extends EventEmitter.

```jsx
class MyEmitter extends EventEmitter{
}
```

Emitter objects are what we instantiate from the EventEmitter-based classes:

```jsx
const myEmitter = new MyEmitter();
```

At any point in the lifecycle of those emitter objects, we can use the emit function to emit any named event we want.

```jsx
myEmitter.emit('something-happened');
```

Emitting an event is the signal that some condition has occurred. This condition is usually about a state change in the emitting object. We can add listener functions using the on method, and those listener functions will be executed every time the emitter object emits their associated name event.

## Events ≠ Asynchrony

Let’s take a look at an example:

```jsx
class WithLog extends EventEmitter{
	execute(taskFunc){
		console.log("Before executing");
		this.emit("begin");
		taskFunc();
		this.emit("end");
		console.log("After executing");
	}
}

const withLog = new WithLog();

withLog.on("begin", () => console.log("About to execute"));
whitLog.on("end", () => console.log("Done with execute"));

withLog.execute(() => console.log(" *** Executing Task *** "));
```

Class WithLog is an event emitter. It defines one instance function execute. This execute function receives one argument, a task function, and wraps its execution with log statements. It fires events before and after the execution.

Here’s the output of that:

```jsx
Before executing
About to execute
*** Executing task ***
Done with execute
After executing
```

What i want you to notice about the output above is that it all happens synchronously. There is nothing asynchronous about this code.

Just like plain-old callbacks, do not assume that events mean synchronoous or asynchronous code.

This is important, vecause if we pass  an asynchronous taskFunc to execute, the events emitted will no longer be accurate.

We can simulate the case with a setImmediate call:

```jsx
withLog.execute(() => {
  setImmediate(() => {
    console.log('*** Executing task ***')
  });
});
```

Now the output would be:

```
Before executing
About to execute
Done with execute
After executing
*** Executing task ***
```

To emit an event after an asynchronous function is done, we’ll need to combine callbacks (or promises) with  this event-based communication. The example below demonstrates that.

One benefit of using events instead  of regular callbacks is that we can react to the same signal multiple times by defining multiple listeners. To accomplish the same with callbacks, we have to write more logic inside the single available callback. Events are a great way for applications to allow multiple external plugins to build functionality on top of the application’s core. You can think of them as hook points to allow for customizing the story around a state change.

### Asynchronous Events

Let’s convert the synchronous sample example into something asynchronous  and a little bit more   useful.

```jsx
const fs = require("fs");
const EventEmitter = require("events");

class WithTime extends EventEmitter{
	execute(asyncFunc, ...args){
		this.emit("begin");
		console.time("execute");
		asyncFunc(...args, (err, data) => {
			if(err){
				return this.emit("error",err);
			}

			this.emit("data", data);
			console.timeEnd("execute");
			this.emit("end")
		}
	}
}

const withTime = new WithTime();
withTime.on("begin", () => console.log("About to execute"));
withTime.on("end", () => console.log("Done with execute"));

withTime.execute(fs.readFile, __filename);
```

The WithTime class executes an asyncFunc and reports the time that’s taken by that asyncFunc using console.time and console.timeEnd calls. It emits the right sequence of events before and after the execution. And also emits error/data events to work with the usual signals of asynchronous  calls.

We test a withTime emitter by passing it an fs.readFile call, which is an asynchronous function. Instead of handling file data with a callback, we can now listen to the data event.

Note how we needed to combine a callback with an event emitter to accomplish that. If the asyncFunc supported promises as well, we could use the async/await feature to do the same:

```jsx
class WithTime extends EventEmitter {
	async execute(asyncFunc, ...args){
		this.emit("begin");
		try{
			console.time("execute");
			const data = await asyncFunc(...args);
			this.emit("data", data);
			console.timeEnd("execute");
			this.emit("end");
		} catch (err){
			this.emit("error", err);
		}
	}
}
```

### Events Arguments and Errors

In the previous example, there were two events that were emitted with extra arguments.

The error event is emitted with an error object.

```jsx
this.emit("error", err);
```

The data event is emitted with a data object.

```jsx
this.emit("data", data);
```

We can use as many arguments as we need after the name event, and all these arguments  will be available inside the listener functions we register for these named events.

```jsx
withTime.on('data', (data) => {
  // do something with data
});
```

The error event is usually a special one. In our callback-based example, if we don’t handle the error event with a listener, the node process will actually exit.

The other way to handle exceptions from emitted errors (besides withTime.on(”error”..) is to register a listener for the global uncaughtException process event. However, catching errors globally with that event is a bad idea.

The standard advice about encaughtException is to avoid using it, but if you must do (say to report what happened or do cleanups), you should just let the process exit anyway.

```jsx
process.on('uncaughtException', (err) => {
  // something went unhandled.
  // Do any cleanup and exit anyway!

  console.error(err); // don't do just that!

  // FORCE exit the process too.
  process.exit(1);
});
```

However, imagine that multiple error events happen at the exact same time. This means the uncaughtException listener above will be triggered multiple times, which might be a problem for some cleanup code. An example of this is when multiple calls are made to a database shutdown action.

The EventEmitter module exposes a once method. This method signals to invoke the listener just once, not every time it happens. So, this is a practical use case to use with the uncaughtException because with the first uncaught exception we’ll start doing the cleanup and we know that we’re going to exit the process anyway.

### Order of Listeners

If we register multiple listeners for the same event, the invocation of those listeners will be in order. The first listener that we register is the first listener that gets invoked.

If you need to define a new listener, but have that listener invoked first, you can use the prependListener method