# Welcome to your CDK TypeScript project

## Installation

Create a `.env` file:

```
DOMAIN=<xmage.mydomain.com>
HOSTED_ZONE=<id-from-router53>
```

Download a xcode version, extract, copy the `Procfile` to xmage-server and zip the xmage-server-folder to app.zip. Copy app.zip to the main directory.

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template
