---
description: Reference of ActPress CLI commands including dev, build, preview, and init.
---

# Command Line Interface

## `actview-press dev`

Start ActPress dev server using designated directory as root. Defaults to current directory. The `dev` command can also be omitted when running in current directory.

### Usage

```sh
# start in current directory, omitting `dev`
actview-press

# start in sub directory
actview-press dev [root]
```

### Options

| Option          | Description                                                       |
| --------------- | ----------------------------------------------------------------- |
| `--open [path]` | Open browser on startup (`boolean \| string`)                     |
| `--port <port>` | Specify port (`number`)                                           |
| `--base <path>` | Public base path (default: `/`) (`string`)                        |
| `--cors`        | Enable CORS                                                       |
| `--strictPort`  | Exit if specified port is already in use (`boolean`)              |
| `--force`       | Force the optimizer to ignore the cache and re-bundle (`boolean`) |

## `actview-press build`

Build the ActPress site for production.

### Usage

```sh
actview-press build [root]
```

### Options

| Option                         | Description                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `--mpa` (experimental)         | Build in [MPA mode](../guide/mpa-mode) without client-side hydration (`boolean`)                                    |
| `--base <path>`                | Public base path (default: `/`) (`string`)                                                                          |
| `--target <target>`            | Transpile target (default: `"modules"`) (`string`)                                                                  |
| `--outDir <dir>`               | Output directory relative to **cwd** (default: `<root>/.vitepress/dist`) (`string`)                                 |
| `--assetsInlineLimit <number>` | Static asset base64 inline threshold in bytes (default: `4096`) (`number`)                                          |

## `actview-press preview`

Locally preview the production build.

### Usage

```sh
actview-press preview [root]
```

### Options

| Option          | Description                                |
| --------------- | ------------------------------------------ |
| `--base <path>` | Public base path (default: `/`) (`string`) |
| `--port <port>` | Specify port (`number`)                    |

## `actview-press init`

Start the [Setup Wizard](../guide/getting-started#setup-wizard) in current directory.

### Usage

```sh
actview-press init
```
