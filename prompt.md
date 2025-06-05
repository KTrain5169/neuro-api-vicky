# Neuro API Vicky specs

## General

"Vicky" is the name of a GitHub Action to test certain games integrations. Vicky
is a WebSocket server set up with the explicit purpose of testing, checking and
warning about integration issues with the Neuro Game API, which is a protocol on
how to communicate between certain types of WebSocket servers.

All packets written below will be in the form of TypeScript code snippets, but
they will be JSON packets. I want you to use these TypeScript code snippets as
sort of a type-check interface for incoming packets. If the respective packet
doesn't match what's shown here, log an error in the console and exit with a
failure (this will stop the GitHub Actions workflow from continuing to run). The
same applies for unknown commands in the packet, if unknown command packets are
received, log an error and exit.

Also, please make the action have a log file that can be provided as the step
output. Each log line should follow the scheme of `[TIMESTAMP] LEVEL: MESSAGE`,
where TIMESTAMP is the timestamp at that time, LEVEL refers to the logging level
(debug, info, warn, error, critical), and MESSAGE is the error message. The log
file name should follow the scheme of `vicky_DD-MM-YYYY_HH-MM-SS_RUN-ID.log`,
where DD-MM-YYYY and HH-MM-SS is the current date and time as of the step
starting, and RUN-ID being the Run ID which can be obtained via a GitHub Actions
variable. Set this to the `logfile` output. Make sure the program appends to
this log file appropriately every time I mention to log something to the console
here.

## Startup

When a WebSocket connection is started, the game must first send a packet like
this:

```ts
{
    "command": "startup",
    "game": string
}
```

This is supposed to clear any and all registered actions previously registered.
This should only be sent as the first packet on that connection, so if a
connection sends this packet a second time, log a warn. Equally, if the
connection sends another packet listed in this document before this packet, log
an error.

## Actions

After a connection is established and a startup packet is received, the server
should establish an "actions store" that stores the metadata of an action,
including its name, description, associated game, and JSON schema. This should
ideally be stored as a JSON dictionary or JSON object array, so that the file
location can be provided as a step output easily.

### Registering actions

To register an action, a game sends this packet:

```ts
{
    "command": "actions/register",
    "game": string,
    "data": {
        "actions": [
            {
                name: string,
                description: string,
                schema?: JSON | undefined | {}
            }
        ]
    }
}
```

Note that if an action with the same name is already registered, the action
should not be replaced, instead log a warn and continue.

The `schema` field is an arbitrary JSON schema, or it can be set to an empty
object (`{}`) or be undefined. In the cases of it being an undefined object or
undefined type, simply set it as an empty object in the actions store. You will
need to validate the schema field to ensure that:

1. It is an actual JSON schema with no unknown keys or fields allowed. Follow
   the latest schema specification regarding this.
2. That the schema object does not have a key that matches any string in an
   array constant (we will leave this empty for now, and I can go and fill it in
   later).

### Unregistering actions

To unregister an action, a game sends this packet:

```ts
{
    "command": "actions/unregister",
    "game": string,
    "data": {
        "aciton_names": string[]
    }
}
```

Attempting to unregister unknown actions is handled by simply ignoring their
unregistration and moving on to unregistering the next action.

### Executing actions

Since this is meant to be used in a CI environment, there needs to be a way to
tell the server what to execute. I'm thinking a JSON dictionary, along with what
data to be sent, can be provided by the user, with each packet being sent
sequentially as soon as their respective actions are registered. It should
follow the following structure:

```ts
{
    "action_1": {
        "key1": string,
        "key2": number,
        // these are just examples
    },
    "action_2": {} // if the schema object is empty.
}
```

Before sending an action, there should be a check to ensure that the packets
match the action's schema. If not, log a warn, and use the `@faker-js/faker` npm
module to send reasonable fake data back to rectify the mistakes.

When sending an action the server should send a packet like this:

```ts
{
    "command": "action",
    "data": {
        "id": string, // Check the action/result packet to ensure that this exact ID is included.
        "name": string, // This should be the action name.
        "data": any // This data needs to follow the action's schema. See above. It can also be set to undefined if no schema is provided for the action when registering.
    }
}
```

Make sure to add a debug log containing the ID, name of action used, and the
data used (as a stringified JSON).

Before sending another action, wait for an `action/result` packet as a response
before doing anything else. It looks like this:

```ts
{
    "command": "action/result",
    "game": string,
    "data": {
        "id": string, // This should be the same ID as its corresponding action execution.
        "success": boolean,
        "message"?: string // This can also be set to undefined.
    }
}
```

When you receive the result packet, log a debug log with the action ID, along
with whether or not it was successful, and its message. It is not expected to
receive more than 1 action result packet for each action ID, so log an error if
that happens.

Additionally, no other packet is expected to be received or sent in the
timeframe between sending an action and receiving its action result, with two
exceptions: the `actions/unregister` packet and `context` packet. If packets
other than those previously mentioned are received, log an error and DO NOT
PERFORM THEIR ACTIONS.

### Responding to action forces

You may receive the following packet at any point during the operation:

```ts
{
    "command": "actions/force",
    "game": string,
    "data": {
        "state"?: string, // While this is a string, that string can be in any arbitrary format, such as plaintext, Markdown, or even stringified JSON!
        "query": string, // This string, however, must be a plaintext string.
        "ephermeral_context": boolean,
        "actions": string[] // You only need to send 1 of these actions. Do not try to send all of them. Also, after receiving this packet, perform a check to make sure all action names specified here match a registered action name. If one or more action names listed here aren't registered, log an error, and pretend that those strings weren't in the array. If all strings in the array aren't registered, log an error instead, and ignore the actions/force.
    }
}
```

The server needs to send a packet in response to this action force that is the
same as the previously mentioned process for executing action packets. The
action to be executed must match one of the actions listed in the `data.actions`
array in the action force packet, and the additional data must be in accordance
with the schema. Additionally, if the corresponding action result has its
`success` parameter set to `false`, you must immediately retry the action force,
as if a new one with identical state, query, ephemeral_context and action_names
was sent.

If an action unregistration comes in while processing the action force, the
action should be unregistered as expected. If the action that was just
unregistered is part of the action_names array, it should be ignored, as if it
was never registered (but without the logging). If the final list of
action_names after ignoring non-registered actions is empty, log a warn and
ignore the action force.

If a second action force comes in while one is still being processed, log an
error and exit.

## Context

A "context window" store should also be opened alongside the actions store upon
startup. This should be similar to the previously mentioned actions store, in
that when context comes in, it is stored in the context window store alongside
its source (such as an `action/result` packet), the game that it came from, and
whether or not it is a "silent" context. The path to this should also be
available as a step output.

You may store context from the following sources:

- Startup packet (you may log the game mentioned in the startup packet, in the
  scheme of `Now playing (x)` where `(x)` is the game name.)
- The `state` of `actions/force` packets (only if the corresponding packet's
  `ephemeral_context` was set to `true`)
- The `message` parameter of `action/result` packets (also include the `success`
  parameter).

In addition, context may be manually sent from the game using the following
packet:

```ts
{
    "command": "context",
    "game": string,
    "data": {
        "message": string,
        "silent": boolean
    }
}
```

For all contexts, the `silent` item in the context window store must be stored
as `true`, except when the `silent` parameter of the `context` packet is set to
`false`.

## Proposed APIs

There are some proposed packets that should be recognised and logged as warns.
These will change over time so make it easy to modify please.

### Shutdown ready commands

Shutdown ready command packets are sent as the following:

```ts
{
    "command": "shutdown/ready",
    "game": string
}
```

If this packet is received, log a warn with the message "Shutdown ready command
packet received. This is a proposed API, and is not guaranteed to make its way
into the official specs."

Also log another warn saying "Shutdown ready command packet received. This is
part of the Game Automation API, which should not be implemented by most games."
