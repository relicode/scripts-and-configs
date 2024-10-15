# Duper-CLI

## Installation & Build
```sh
npm i
```

## Usage

1. Generate dupes

  ```sh
  ddh --output test-dupes/dupes.json --format json --ignore test-dupes/dupes.json --directories test-dupes
  ```

2. Run `duper-cli`

  ```sh
  node . test-dupes/dupes.json
  ```

