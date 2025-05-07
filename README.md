# Victor - An Actor for Neuro-sama in CI

Victor is a GitHub Action that runs [Randy](https://github.com/VedalAI/neuro-game-sdk/blob/main/Randy)/[Jippity](https://github.com/EnterpriseScratchDev/neuro-api-jippity) in CI. This can be useful for testing in a clean environment.

## Inputs

| Input              | Description                                                                                                                                    | Required | Example values                |
|--------------------|------------------------------------------------------------------------------------------------------------------------------------------------|----------|-------------------------------|
| `simulator`        | The simulator to use.                                                                                                                          | Yes      | `randy`, `jippity`            |
| `deps-command`     | The command to run to install your game's dependencies.                                                                                        | No       | `npm install`                 |
| `run-command`      | The command to run to start your game/test code.                                                                                               | Yes      | `npm run start`               |
| `actions-count`    | The amount of messages to observe from Randy or Jippity for the action to pass as successful.                                                  | Yes      | `5`                           |
| `randy-packets`    | (Randy only) The location of the JSON file containing an array of packets sent to Randy via a HTTP request to simulate a voluntary action.     | No       | `./packets.json`              |
| `jippity-api-key`  | (Jippity only) Your OpenAI API key (used to make Jippity function).                                                                            | No       | ${{ secrets.OPENAI_API_KEY }} |
| `jippity-ai-model` | (Jippity only) The OpenAI model to use. Must support tools (formerly functions).                                                               | No       | `gpt-4o-mini`                 |

## Outputs

| Output                        | Description                                            | Example values     |
|-------------------------------|--------------------------------------------------------|--------------------|
| `observed_message_count`      | The amount of messages observed from Randy or Jippity. | `randy`, `jippity` |
