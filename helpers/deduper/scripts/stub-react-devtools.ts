import type { BunPlugin } from 'bun'

const stubReactDevtools: BunPlugin = {
  name: 'stub-react-devtools-core',
  setup(build) {
    build.onResolve({ filter: /^react-devtools-core$/ }, (args) => ({
      path: args.path,
      namespace: 'stub-react-devtools-core',
    }))
    build.onLoad({ filter: /.*/, namespace: 'stub-react-devtools-core' }, () => ({
      contents: 'export default { connectToDevTools: () => {} };',
      loader: 'js',
    }))
  },
}

export default stubReactDevtools
