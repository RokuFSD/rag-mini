# Efficient Node: Streams

Type: NodeJS

## What Exactly are Streams?

Streams are collections of data - just like arrays or string. The difference is that streams might not be available all at once and they don’t have to fit in memory. This makes streams really powerful when working with large amounts of data, or data that’s coming from an external source one **chunk** at a time.

However, streams are not only about working with big data. They also give us the power of composability in our code. Just like we can compose powerful Linux commands by piping other smaller Linux commands, we can do exactly the same in Node with streams.

```bash
grep -R exports * | wc -l6
```

```jsx
const grep = ... // A stream for the grep output 
const wc = ... // A stream for the wc input

grep.pipe(wc)
```

Many of the built-in modules in Node implement the streaming interface:

| **Readable Streams** | **Writable Streams** |
| --- | --- |
| HTTP response, on the client | HTTP requests, on the client |
| HTTP requests, on the server | HTTP responses, on the server |
| fs read streams | fs write streams |
| zlib streams | zlib streams |
| crypto streams | crypto streams |
| TCP sockets | TCP sockets |
| child process stdout & stderr | child process stdin |
| process.stdin | process.stdout, process.stderr |

The list above has some examples for native Node objects that are also readable or writable streams. Some of these objects are both readable and writable streams, like TCP sockets, zlib and crypto streams.

Notice that the objects are also closely related. While an HTTP response is a readable stream on the client, it’s a writable stream on the server. This is because in the HTTP case, we basically read from on object http.IncomingMessage and write to the other http.ServerResponse

Also note how the stdio streams (stdin, stdout, stderr) have the inverse stream types when ti comes to child processes. This allows for a really easy way to pipe to, and from, these child process stdio streams using the main process stdio streams.

## A Streams Practical Example

Theory is great, but often not 100% convincing. Let’s see an example demonstrating the difference streams can make in code when it comes to memory consumption.

Let’s create a **big** file first:

```jsx
const fs =require("fs");
const file = fs.createWriteStream("./big.file");
for(let i = 0; i <= 1e6; i++){
	file.write("Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n"");
}

file.end();
```

The fs module can be used to read from and write to files using a stream interface. In the example above, we’re writing 1 million lines with a loop to that big.file through a writable stream.

Running the script above generates a file that’s about 400MB.

Here’s a simple Node web server designed to exclusively serve the big.file:

```jsx
const fs = require("fs");
const server = require("http").createServer();

server.on("request", (req, res) => {
	fs.readFile("./big.file", (err, data) => {
		if(err) throw err;
		res.end(data);
	}
}

server.listen(8000);
```

When the server gets a request, it’ll server the big file using the asynchronous method, fs.readFile. But hey, it’s not like we’re blocking the event loop or anything. Everything is great, right? Right?

Well, let’s see what happens when we run the server, connect to it, and monitor the memory while doing so.

When I ran the server, it started out with a normal amount of memory 8.7MB;

Then I connected to the server. Note what happened to the memory consumed: 434MB

We basically put the whole big.file content in memory before we wrote it out to the response object. This is very inefficient.

The HTTP response object is also a writable stream. This means if we have a readable stream that represents the content of big.file, we can just pipe those two on each other and achieve mostly of the same result without consuming 400MB of memory

Node’s fs module can give us a readable stream for any file using the createReadStream method. We can pipe that to the response object

```jsx
const fs = require("fs");
const server = require("http").createServer();

server.on("request", (req,res) => {
	const src = fs.createReadStream("./big.file");
	src.pipe(res);
});
```

When a client asks for that big file, we stream it one chunk at a time, which means we don’t buffer it in memory at all. The memory usage grew by about 25 MB and that’s it.

## Streams 101

There are four fundamental stream types in Node: **Readable, Writable, Duplex, and Transform** streams.

- A readable stream is an abstraction for a source from which data can be consumed. An example of that is the fs.createReadStream method.
- A writable stream is an abstraction for a destination to which data can be written. An example of that is the fs.createWriteStream method.
- A duplex stream is both Readable and Writable. An example of that is a TCP socket.
- A transform stream is basically a duplex stream that can be used to modify or transform the data as it is written and read. An example of that is the zlib.createGzip stream to compress the data using gzip. You can think of a transform stream as a function where the input is the writable stream part and the output is a readable stream part. You might also hear transform streams referred to as “through streams”

All streams are instances of EventEmitter. They emit events that can be used to read an write data. However, we can consume streams data in a simpler way using the pipe method.

---

### The pipe method

Here’s the magic line that you need to remember:

```jsx
readableSrc.pipe(writableDest);
```

In this simple line, we’re piping the output of a readable stream - the source of data, as the input of a wirtable stream - the destination. The source has to be a readable stream and the destination has to be a writable one. Of course, they can both be duplex/transform streams as well. In facet, if we’re piping into a duplex stream, we can chain pipe calls just like we do in Linux:

```jsx
readableSrc
  .pipe(transformStream1)
  .pipe(transformStream2)
  .pipe(finalWrtitableDest);
```

The pipe method returns the destination stream, which enabled us to do the chaining above. For streams `a`(readable), `b` and `c`(duplex), and `d`(writable), we can:

```jsx
a.pipe(b)
  .pipe(c)
  .pipe(d);

// Which is equivalent to:
a.pipe(b);
b.pipe(c);
c.pipe(d);

// Which, in Linux, is equivalent to:
// $ a | b | c | d
```

The pipe method is the easiest way to consume streams. It’s generally recommended to either use the pipe method or consume streams with events, but avoid mixing these two. Usually when you’re using the pipe method you don’t need to use events, but if you need to consume the streams in more custom ways, events would be the way to go.

### Stream Events

Besides reading from a readable stream source and writing to a writable destination, the pipe method automatically manages a few things along the way. For example, it handles errors, end-of-files, and the cases when one stream is slower or faster than the other.

However, streams can also be consumed with events directly

```jsx
// readable.pipe(writable)

readable.on("data", chunk => {
  writable.write(chunk);
});

readable.on("end", () => {
  writable.end();
});
```

Here’s a list of the important events and methods that can be used with readable and writable streams:

|  | **Readable Streams** | **Writable Streams** |
| --- | --- | --- |
| **Events** | data, end, error, close, readable | drain, finish, error, close, pipe, unpipe |
| **Methods** | pipe(), unpipe(), wrap(), destroy() | write(), destroy(), end() |
|  | read(), unshift(), resume(). pause(), isPaused(), setEncoding() | cork(), uncork(), setDefaultEncoding() |

The events and methods in the list above are somehow related because they are usually used together.

The most important events on a readable stream are:

- The data event, which is emitted whenever the stream passes a chunk of data to the consumer
- The end event, which is emitted when there is no more data to be consumed from the stream.

The most important events on a writable stream are:

- The drain event, which is a signal that the writable stream can receive more data.
- The finish event, which is emitted when all data has been flushed to the underlying system.

Events and functions can be combined for custom and optimized use of streams. To consume a readable stream, we can use the pipe/unpipe methods or the read/unshift/resume methods. To consume a writable stream, we can make it the destination of pipe/unpipe, or just write to it with the write method and call the end method when we’re done.

### Paused and Flowing Modes

Readable streams have two main modes that affect the way we can consume them:

- They can be either in the **paused** mode
- Or in the **flowing** mode

Those modes are sometimes referred to as **pull** and **push** modes.

All readable streams start in the paused mode by default, but they can be easily switched to flowing and back to paused when needed. Sometimes, the switching happens automatically.

When a readable stream is in the paused mode, we can use the read() method to read from the stream on demand. However, for a readable stream in the flowing mode, the data is continuosly flowing and we have to listen to events to consume it.

In the flowing mode, data can actually be lost if no consumers are available to handle it. This is why when we have a readable stream in flowing mode, we need a data event handler. In fact, just adding a data event handler switches a paused stream into flowing mode and removing the data event handler switches the stream back to paused mode. Some of this is done for backward compatibility with the older Node streams interface.

To manually switch between these two stream modes, you can use the resume() and pause() methods.

<aside>
💡 When consuming readable streams using the pipe method, we don’t have to worry about these mode as pipe mages them automatically.

</aside>

### Implementing Streams

When we talk about streams in Node, there are two main different tasks:

- The task of **implementing** the streams.
- The task of **consuming** them.

So far, we’ve been talking about only consuming streams. Let’s implement some!

Stream implementers are usually the ones who require the stream module.

### Implementing a Writable Stream

To implement a writable stream, we need to use the Writable constructor from the stream module.

```jsx
const { Writable } = require("stream");
```

We can implement a writable stream in many ways. For example, we can extend the Writable constructor if we want:

```jsx
class myWritableStream extends Writable {}
```

However, I prefer the simple constructor approach. We just create an object from the Writable constructor and pass it a number of options. The only required option is a write function, which exposes the chunk of data to be written

```jsx
const { Writable } = require("stream");

const outStream = new Writable({
	write(chunk, encoding, callback){
		console.log(chunk.toString());
		callback();
	}
})

process.stdin.pipe(outStream);
```

The write method takes three arguments.

- The chunk is usually a buffer unless we configure the stream differently.
- The encoding argument is needed in that case, but we can usually ignore it.
- The callback is a function that we need to call after we’re done processing the data chunk. It’s what signals whether the write was successful or not. To signal a failure, call the callback with an error object.

In outStream, we simply console.log the chunk as a string and call the callback after that without an error to indicate success. This is a very simple and probably not so useful echo steam. It will echo back anything it receives.

To consume this stream, we can simply use it with process.stdin, which is a readable stream, so we can just pipe process.stdin into our outStream.

### Implemente a Readable Stream

To implement a readable stream, we require the Readable interface and construct an object from it:

```jsx
const {Readable} = require("stream");
const inStream = new Readable({});
```

There is a simple way to implement readable streams. We can just directly push the data that we want the consumers to consume.

```jsx
const {Readable} = require("stream");
const inStream = new Readable({});
inStream.push("ABCDEFGHIJKLM");
inStream.push("NOPQRSTUVWXYZ");

inStream.push(null); // No more data

inStream.pipe(process.stdout);
```

When we push a null object, that means we want to signal that the stream does not have any more data.

To consume this simple readable stream, we can simply pipe it into the writable stream process.stdout.

We’re basically pushing all the data in the stream **before** & piping it to process.stdout. The much better way is to push data **on demands** when a consumer asks for it. We can do that by implementing the read() method in a readable stream configuration.

```jsx
const inStream = new Readable({
	read(size){
		// there is a demand on the data...
		// Someone wants to read it.
	}
})
```

```jsx
const inStream = new Readable({
  read(size) {
    this.push(String.fromCharCode(this.currentCharCode++));
    if (this.currentCharCode > 90) {
      this.push(null);
    }
  }
});

inStream.currentCharCode = 65;

inStream.pipe(process.stdout);
```

While the consumer is reading a readable stream, the read method will continue to fire and we’ll push more letters.

We need to stop this cycle somewhere, and that’s why I used an if statement to push null

This code is equivalent to the simplest one we started with, but now we’re pushing data on demand when the consumer asks for it. You should always do that

### Implementing Duplex/Transform Stream

With Duplex streams, we can implement both readable and writable streams with the same object. It’s as if we inherit from both interfaces.

Here’s an example duplex stream that combines the two writable and readable examples implemented above:

```jsx
const {Duplex} = require("stream");

const inoutStream = new Duplex({
	write(chunk, encoding, callback){
		console.log(chunk.toString());
		callback();
	}
	read(size){
		this.push(String.fromCharCode(this.currentCharCode++));
		if (this.currentCharCode > 90){
			this.push(null)
		}
	}
})

inoutStream.currentCharCode = 65;

process.stdin.pipe(inoutStream).pipe(process.stdout);
```

By combining the methods, we can use this duplex stream to read the letters from A to Z and we can also use it for its echo feature. We pipe the readable stdin stream into this duplex stream to use the echo feature and we pipe the duplex stream itself into the writable stdout stream to see the letters A through Z.

It’s important to understand that the readable and writable sides of a duplex stream operate completely independently from one another. This is merely grouping of two features into an object.

A transform stream is the more intereseting duplex stream because its ouput is computed from its input.

A transform stream is the more interesting duplex stream because its output is computed from its input.

For a transform stream, we don’t have to implement the read or write methods, we only need to implement a transform method,  which combines both of them. It has the signature of the write method and we can use it to push data as well.

Here’s a simple transform stream which echoes back anything you type into it after transforming it to uppercase format:

```jsx
const { Transform } = require("stream");

const upperCaseTr = new Transform({
	transform(chunk, encoding, callback){
		this.push(chunk.toString().toUpperCase())
		callback();
	}
})

process.stdin.pipe(upperCaseTr).pipe(process.stdout);
```

## Streams Object Mode

By default, streams expect Buffer/String values. There is an objectMode flag that we can set to have the stream accept any JavaScript object.

```jsx
const { Transform } = require("stream");

const commaSplitter = new Transform({
  readableObjectMode: true,

  transform(chunk, encoding, callback) {
    this.push(
      chunk
        .toString()
        .trim()
        .split(",")
    );
    callback();
  }
});

const arrayToObject = new Transform({
  readableObjectMode: true,
  writableObjectMode: true,
  transform(chunk, encoding, callback) {
    const obj = {};
    for (let i = 0; i < chunk.length; i += 2) {
      obj[chunk[i]] = chunk[i + 1];
    }
    this.push(obj);
    callback();
  }
});

const objectToString = new Transform({
  writableObjectMode: true,
  transform(chunk, encoding, callback) {
    this.push(JSON.stringify(chunk) + "\n");
    callback();
  }
});
```

Then, to use them:

```jsx
process.stdin
  .pipe(commaSplitter)
  .pipe(arrayToObject)
  .pipe(objectToString)
  .pipe(process.stdout);
```

### Built-in transform streams

Node has a few very useful built-in transform streams such as the zlib and crypto streams.