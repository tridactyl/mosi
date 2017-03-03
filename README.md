# Mosi

Mosi is a minimal javascript library that simplifies Chrome extension messaging. No more setting up connections, sending messages and attaching listeners. Mosi makes communication organized and intuitive through a declarative, event-driven, pub/sub API.

Check out [Saka Key](https://github.com/lusakasa/saka-key) to see how Mosi is used in a real extension.

# Index

* [Brief API] (brief api)
* [Quick Example - A Counter Extension](example)
* [Install](install)
* [API](api)
* [Examples](examples)
* [Considerations and Limitations](limits)
* [Contributing](contributing)

# [brief api]: API Overview

## init - intializes a node for messaging

```javascript
init({
  // which messages it subscribes to
  subscriptions: [string],

  // actions to execute once the node is connected
  onConnect: [{action: string, arg: any}],

  // actions to execute when the node disconnects
  onDisconnect: [{action: string, arg: any}}],

  // action handlers to execute when a message is received
  actions: {
    action1: (arg, src) => { doSomething(arg, src); },
    action2: (arg, src) => { doSomething(arg, src); },
    ...
  }
});
```

## msg - sends a message to target node(s)

```javascript
msg(
  // the node(s) that should receive the message
  target,
  
  // specifies which action handler will be called by receivers
  action,
  
  // the argument to be passed to the action handlers
  arg
);
```

## get - sends a message to target node(s) and receives the reponse

```javascript
// get returns a promise of an array of results
const result = await get(
  // the node(s) that should receive the message
  target,
  
  // specifies which action handler will be called by receivers
  action,
  
  // the argument to be passed to the action handlers
  arg
);

// the value returned by the action handler
result[0].v
// the error reported on the target node
result[0].e
```

# [example]: Quick Example - A Counter Extension

This is [code](./test-extensions/counter) for an extension that displays a count on every tab. The count starts at 0 and can be incremented by pressing a button. All tabs share the same count so that when the count is incremented from one tab, the change is synchronized to all other tabs.

![counter image](docs/counter.png)

## background_page.js

```javascript
import { init, msg } from 'mosi/core';

let count = 0;

init({
  actions: {
    INCREMENT: (increment = 1) => {
      count += increment;
      msg('count', 'NEW_COUNT', count);
    },
    COUNT: (_, src) => {
      msg(src, 'NEW_COUNT', count);
    }
  }
});
```

The background page stores the count value. It declares two actions that other nodes can trigger: INCREMENT and COUNT.

If INCREMENT is triggered, the count is incremented and a message is sent to every node that subscribes to 'count' with the updated count value.

If COUNT is triggered, it sends a message to the source node that issued COUNT with the current value of count.

## content_script.js

```javascript
import { init, msg } from 'mosi/client';

// Inject Counter GUI into topright of page
const counter = document.createElement('div');
counter.setAttribute('style', 'z-index: 99999; position: fixed; top: 0; right: 0;');
counter.innerHTML = '<button id="increment">Increment</button><input id="count" disabled/>';
document.body.appendChild(counter);

init({
  subscriptions: ['count'],
  onConnect: [{ action: 'COUNT' }],
  actions: {
    NEW_COUNT: (count) => {
      document.getElementById('count').value = count;
    }
  }
});

document.getElementById('increment').addEventListener('click', () => {
  msg(1, 'INCREMENT');
});
```

The content script injects an increment button and counter into each page. It subscribes to 'count' to receive all actions issued via net('count'). It specifies that the background page should execute the COUNT action on connection. It declares a single action, NEW_COUNT, which updates the displayed count with the given count.  It then adds a listener to the increment button that sends an INCREMENT message to the background page (through the pre-defined target 1).

# [install]: Install

```
npm install --save mosi
```

This exposes the following modules:

* mosi/core - run on the background page. Buses messages between clients.
* mosi/client - run on clients nodes. Can be anything from content scripts, to popups, to devtools.
* mosi/light-client - run this if you need msg() and NOTHING else. Very small.

You can then import from the appropriate module.

```javascript
import { init, net } from 'mosi/core';
init({ actions: { NADA: () => {} } });
msg(1, 'HELLO');
```

Your extension will not work if you import from the wrong module.
Currently, Mosi requires an es6 environment and a module bundler with support for es6 import/export syntax like Webpack 2. See any of the examples in the test-extension directory, or check out [Saka Key](https://github.com/lusakasa/saka-key) to see how Mosi is used in a real extension.

# [api]: Detailed API

The following functions are provided by each package:

* mosi/core:          init, msg, get, meta
* mosi/client:        init, msg, get
* mosi/light-client:        msg


## init - intializes a node for messaging

`init` initializes a node for messaging, and in the case of a client node, connects it to the core. It must be called before any calls to msg() or get(). It accepts a configuration object with properties `subscriptions`, `onConnect`, `onDisconnect`, and `actions`. All properties are optional.

* `subscriptions` is an array of string specifying a node's subscriptions. This is how a node declares to the world it wants to receive all messages for a given subscription. When sending a message using `msg` or `get` from any node, you can specify a subscription as the target, and all nodes that have the target subscription will receive the message.

* `onConnect` is an array of actions descriptors that the core executes as soon as a client node is connected. Every action descriptor is an object that must have an `action` property corresponding to the type of action to execute. The optional `arg` property 

* `onDisconnect` is an array of action descriptors that the core executes as soon as it detects a client has disconnected.

* `actions` is an object whose keys are action types and values are action handlers. An action handler is a function that is called a message is received. All calls to `msg` and `get` must specify the name of the action to be executed. If a client receives a message for an action type it doesn't have a handler for, it throws an error. The first argument of an action handler is the `arg` specified by the call to `msg` or `get` by the sending node. The second argument is the `src` node identifier, which is an integer. You can send a response back to the message source from a handler by calling `msg` or `get` and specifying `src` as the target. The value returned by an action handler is the result returned to calls to `get`.

* `subscriptions` - a node's subscription

```javascript
init({
  // which messages it subscribes to
  subscriptions: [string],

  // actions to execute once the node is connected
  onConnect: [{action: string, arg: any}],

  // actions to execute when the node disconnects
  onDisconnect: [{action: string}],

  // action handlers to execute when a message is received
  actions: {
    action1: (arg, src) => { doSomething(arg, src); },
    action2: (arg, src) => { doSomething(arg, src); },
    ...
  }
});
```

## msg - sends a message to target node(s)

`msg` sends a message to target node(s). Specify the `target` node(s) that will receive the message and the name of the `action` handler that targets execute when they receive the message. Optionaly specify an `argument` to be passed to the action handler.

  * `target` describes the nodes that should receive a message. `target` may be an integer that identifies a single node, or a condition string that limits which nodes receive the message. 
  
    * Integer Targets:

      * 0 is reserved for identifying the current node and is used to execute actions locally.
      1 is reserved for messaging the core.
      * All other nodes are assigned a globally unique integer identifying them.
      * The `src` node id is available as the second argument of all action handlers to make replying to messages easy.

    * String Targets 

      * A string target specifies conditions that must be specified for a node to receive a message. The most common type of condition is a subscription - only nodes with a given subscription receive a message.

      * Other conditions take the form of selectors like only 'only nodes in the tab with id 4' or 'only nodes in frames with id 0.'  Conditions can be cominbined with '&' so that 'a&b' means a node will only receive a message if it meets both conditions 'a' and 'b'. Conditions can also be combined with '|' so that 'a|b' means a node will receive a message if it meets either condition 'a' or 'b'. & has higher precedence than |.
      
      * Examle target strings:

        * `'onlyCoolMessages'` - only nodes subscribing to 'onlyCoolMessages'
        * `'tab[1]'` - only nodes in tab with id 1
        * `'tab[3]&frame[2]'` - only the node in tab id 3 and frame id 2
        * `'tab[2]&topFrame'` - only the node in tab id 2 in the top frame
        * `'tab[5]&childFrames'` - all nodes in tab id 5 that aren't the top node
        * `'cats&topFrame&tab[3]'` - only nodes subscribing to cat that are in the top frame and in tab id 3
        * `'dog|food&topFrame'` - nodes that subscribe to dog or (subscribe to food and are in the top frame)
        * `'rats|lions|zebras'` - nodes that subscribe to rats or lions or zebras
  
  * `action` is a string corresponding to the name of the action handler to be executed by target nodes. Target nodes that don't have a handler for the specified action will throw errors.

  * `arg` is an optional argument to be passed to the action handler of target nodes. If you want to pass multiple arguments, simply package them as properties of a single object, e.g. `msg(1, 'COOORDINATES', { x, y });`.

```javascript
msg(
  // the node(s) that should receive the message
  target,
  
  // specifies which action handler will be called by receivers
  action,
  
  // the argument to be passed to the action handlers
  arg
);
```

## get - sends a message to target node(s) and receives the reponse

`get` sends a message to target node(s) and returns a promise for an array of responses from every messaged node. The arguments of `get` are identical to the arguments of `msg`, A response is an object which will have exactly one of two properties: `v` and `e`. `v` is short for value, which will be set to the value returned by the target node's action handler. `e` is short for error, and will be set if something went wrong retreiving the response.

```javascript
// get returns a promise of an array of results
const result = await get(
  // the node(s) that should receive the message
  target,
  
  // specifies which action handler will be called by receivers
  action,
  
  // the argument to be passed to the action handlers
  arg
);

// the value returned by the action handler
result[0].v
// the error reported on the target node
result[0].e
```

## meta - given a node id, returns basic information about it

`meta` is a function that takes a node id as its only argument. It returns basic information about that node. `meta`  is only available on the core node, not on client nodes. `meta` returns an object of the form:

  ```javascript
  {
    frameId: frameId,
    tabId: tabId,
    // https://developer.chrome.com/extensions/runtime#type-MessageSender
    sender: MessageSender,
    subs: [subscriptions]
  };
  ```

This following action handler function `loadClient` shows how a background page uses meta to query the tabId and fameId of a node so it can dynamically insert a script into that node.

```javascript
function loadClient (_, src) {
  const { frameId, tabId } = meta(src);
  chrome.tabs.executeScript(tabId, {
    file: 'content_script.js',
    frameId,
  });
};
```

# [limits]: Considerations and Limitations

1. Mosi introduces a little overhead. If raw performance is your number one goal, use the stock messaging apis.
2. Mosi requires the core be a persistent background page in its current implementation. A plan for an event page version is in the works.
3. Mosi uses a star architecture in which all messages are sent to the background page, which then forwards the message to all subscribed nodes.
4. Mosi uses es6 features directly with no precompilation because it is designed for Chrome Extensions, and Chrome supports es6. You still need an es6 module bundler like Webpack 2.
5. Mosi is awesome.

Note that Mosi has not been optimized for performance and there is significant leeway to improve it. 

# [contributing]: Contributing

All contributions welcome.

If you encounter a bug, create an issue. If you're amazing, fix it and submit a pull request.

If you have any suggestions, create an issue for discussion.

Mosi's API is minimal and simple, but may be a little inflexible given a node's actions and subscriptions are declared statically. If you can provide a use case for dynamic actions and subscriptions and an elegant API, please create an issue.