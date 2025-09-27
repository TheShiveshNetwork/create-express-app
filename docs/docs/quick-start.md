---
sidebar_position: 2
---

# Quick Start

Scaffold a complete express application in **seconds**.

## Getting Started

There are two ways you can use the cli to set up an express application quickly

Get started **[directly](#direct-setup)**

Or **[install cli globally](#global-install)**.

### What you'll need

- [Node.js](https://nodejs.org/en/download/) version 18.0 or above:
  - When installing Node.js, you are recommended to check all checkboxes related to dependencies.

## Direct Setup

Generate a new **Express** application with just one command.

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="npm" label="npm" default>
  ```bash
  npx @mrknown404/create-express-app <app-name>
  ```
  </TabItem>
  <TabItem value="yarn" label="yarn" default>
  ```bash
  yarn dlx @mrknown404/create-express-app <app-name>
  ```
  </TabItem>
  <TabItem value="pnpm" label="pnpm" default>
  ```bash
  pnpm dlx @mrknown404/create-express-app <app-name>
  ```
  </TabItem>
  <TabItem value="bun" label="bun" default>
  ```bash
  bunx @mrknown404/create-express-app <app-name>
  ```
  </TabItem>
</Tabs>

This quickly scaffolds the project without installing the cli globally.

## Global Install

Alternatively, ou can install the cli globally and then run the **create-express-binary**.

Generate a new **Express** application with just one command.

#### Step 1: Install the package

```bash
npm i -g @mrknown404/create-express-app
```

#### Step 2: Run the cli

Once the package is installed, anytime you want to create a new **Express** application, you can simply run

<Tabs>
  <TabItem value="npm" label="npm" default>
  ```bash
  npx create-express-app <app-name>
  ```
  </TabItem>
  <TabItem value="yarn" label="yarn" default>
  ```bash
  yarn dlx create-express-app <app-name>
  ```
  </TabItem>
  <TabItem value="pnpm" label="pnpm" default>
  ```bash
  pnpm dlx create-express-app <app-name>
  ```
  </TabItem>
  <TabItem value="bun" label="bun" default>
  ```bash
  bunx create-express-app <app-name>
  ```
  </TabItem>
</Tabs>

If you use this cli often to build your project, you should go with this method.

## Run Application

Follow the cli instructions to start the server.
