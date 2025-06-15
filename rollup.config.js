import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',
  output: {
    file: 'lib/es6/index.js',
    format: 'es',
    sourcemap: true
  },
  external: [
    'rxjs',
    'rxjs/operators', 
    'lit-html',
    'lit-html/directive.js',
    'lit-html/directives/async-replace.js',
    'lit-html/directives/async-append.js',
    'lit-html/directives/cache.js',
    'lit-html/directives/class-map.js',
    'lit-html/directives/guard.js',
    'lit-html/directives/if-defined.js',
    'lit-html/directives/repeat.js',
    'lit-html/directives/style-map.js',
    'lit-html/directives/unsafe-html.js',
    'lit-html/directives/until.js',
    '@cycle/isolate'
  ],
  plugins: [
    resolve({
      preferBuiltins: false
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: 'lib/es6',
      rootDir: 'src'
    })
  ]
};