# Vicky

This is a headless server implementation of the
[Neuro Game API](https://github.com/VedalAI/neuro-game-sdk/) designed for use in
CI environments such as GitHub Actions.

## Usage

Add the following snippet as a step during your testing phase:

```yaml
- name: Test Neuro API integration
  uses: KTrain5169/neuro-api-vicky@v1
  with:
    # Inputs go here
```

### Inputs

| Name          | Description                                                               | Default value                              |
| ------------- | ------------------------------------------------------------------------- | ------------------------------------------ |
| `port`        | The port to start Vicky on.                                               | `8000`                                     |
| `testFile`    | The file to run to start your game.                                       | None - required input.                     |
| `runner`      | The command to execute your file.                                         | None - examples: `python3` or `node`.      |
| `packet-list` | The JSON file containing the list of packets to send, receive and expect. | None - example: `.github/packet-list.json` |

### Outputs

You'll want to assign an ID to your step if you want to use the outputs here.

| Name      | Description                                         |
| --------- | --------------------------------------------------- |
| `success` | Whether or not all tests succeded and failed.       |
| `time`    | The time it took. Useful for l\*tency measurements. |
| `log`     | The log file path for this run.                     |
